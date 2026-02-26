"use client";

import { useEffect, useRef } from "react";

// ── GLSL ─────────────────────────────────────────────────
const VERT = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main(){
    v_uv = a_pos * 0.5 + 0.5;
    v_uv.y = 1.0 - v_uv.y;
    gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

// Displacement map warp: uses a greyscale displacement texture
// to push pixels sideways, creating a liquid/distorted morph.
// The twist: tex0 pushes outward, tex1 pulls in — organic yet controlled.
const FRAG = `
precision highp float;
uniform sampler2D u_tex0;    // from
uniform sampler2D u_tex1;    // to
uniform sampler2D u_disp;    // displacement map (RG channels)
uniform float     u_prog;    // 0 → 1
uniform float     u_str;     // displacement strength (0.12)
varying vec2      v_uv;

void main(){
    vec2 disp     = texture2D(u_disp, v_uv).rg - 0.5;
    
    // tex0 pulls away from centre, tex1 floods in from centre
    vec2 uv0 = v_uv + disp * u_str * u_prog;
    vec2 uv1 = v_uv + disp * u_str * (u_prog - 1.0);

    vec4 c0 = texture2D(u_tex0, clamp(uv0, 0.001, 0.999));
    vec4 c1 = texture2D(u_tex1, clamp(uv1, 0.001, 0.999));

    // Smooth edge blend
    float blend = smoothstep(0.0, 1.0, u_prog);
    gl_FragColor = mix(c0, c1, blend);
}`;

// ── Helpers ───────────────────────────────────────────────
function compileShader(gl: WebGLRenderingContext, type: number, src: string) {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
}
function buildProgram(gl: WebGLRenderingContext) {
    const p = gl.createProgram()!;
    gl.attachShader(p, compileShader(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(p, compileShader(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(p);
    return p;
}
function imgToTex(gl: WebGLRenderingContext, url: string): Promise<WebGLTexture> {
    return new Promise(res => {
        const tex = gl.createTexture()!;
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            res(tex);
        };
        img.src = url;
    });
}

// ── Generate displacement map on a canvas ─────────────────
// Uses concentric sine waves + secondary radial ripple → looks
// like a water surface or lens warp. Completely procedural, no PNG needed.
function buildDispTex(gl: WebGLRenderingContext): WebGLTexture {
    const SIZE = 512;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = SIZE;
    const ctx = canvas.getContext("2d")!;
    const img = ctx.createImageData(SIZE, SIZE);

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
            const nx = x / SIZE;        // normalised 0-1
            const ny = y / SIZE;
            const cx = nx - 0.5;
            const cy = ny - 0.5;
            const dist = Math.sqrt(cx * cx + cy * cy);

            // R channel: horizontal wave (ripple)
            const r = Math.sin(dist * 28.0 - 1.4) * 0.5 + 0.5;
            // G channel: diagonal wave (cross-ripple)
            const g = Math.sin((nx + ny) * 18.0 + dist * 12.0) * 0.5 + 0.5;
            // B: constant 0.5 (unused)

            const idx = (y * SIZE + x) * 4;
            img.data[idx + 0] = Math.round(r * 255);
            img.data[idx + 1] = Math.round(g * 255);
            img.data[idx + 2] = 128;
            img.data[idx + 3] = 255;
        }
    }
    ctx.putImageData(img, 0, 0);

    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    return tex;
}

// ── Component props ───────────────────────────────────────
interface Props { images: string[]; cityIdx: number; duration: number; }

// ── Main component ────────────────────────────────────────
export default function WebGLDisplacementBg({ images, cityIdx, duration }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const state = useRef<{
        gl: WebGLRenderingContext;
        prog: WebGLProgram;
        textures: WebGLTexture[];
        disp: WebGLTexture;
        current: number;
        rafId: number | null;
    } | null>(null);

    // ── Init ──────────────────────────────────────────────
    useEffect(() => {
        const canvas = canvasRef.current!;
        const gl = canvas.getContext("webgl")!;
        if (!gl) return;

        const prog = buildProgram(gl);
        gl.useProgram(prog);

        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
        const aPos = gl.getAttribLocation(prog, "a_pos");
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

        const disp = buildDispTex(gl);

        Promise.all(images.map(url => imgToTex(gl, url))).then(textures => {
            state.current = { gl, prog, textures, disp, current: 0, rafId: null };
            draw(0, 0, 1); // initial frame — show image 0 fully
        });

        function draw(from: number, to: number, prog_: number) {
            if (!state.current) return;
            const { gl, prog, textures, disp } = state.current;
            const w = canvas.clientWidth;
            const h = canvas.clientHeight;
            if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.useProgram(prog);

            gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, textures[from]);
            gl.uniform1i(gl.getUniformLocation(prog, "u_tex0"), 0);
            gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, textures[to]);
            gl.uniform1i(gl.getUniformLocation(prog, "u_tex1"), 1);
            gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, disp);
            gl.uniform1i(gl.getUniformLocation(prog, "u_disp"), 2);

            gl.uniform1f(gl.getUniformLocation(prog, "u_prog"), prog_);
            gl.uniform1f(gl.getUniformLocation(prog, "u_str"), 0.14);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }

        // Store draw fn for transition trigger
        (state as any)._draw = draw;

        const ro = new ResizeObserver(() => {
            if (state.current) draw(state.current.current, state.current.current, 1);
        });
        ro.observe(canvas);
        return () => { ro.disconnect(); if (state.current?.rafId) cancelAnimationFrame(state.current.rafId); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Transition on city change ─────────────────────────
    useEffect(() => {
        if (!state.current) return;
        const s = state.current;
        if (s.rafId) cancelAnimationFrame(s.rafId);

        const from = s.current;
        const to = cityIdx;
        const draw = (state as any)._draw as (f: number, t: number, p: number) => void;

        // easeInOutCubic
        const ease = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

        let startTime: number | null = null;
        const animate = (now: number) => {
            if (!startTime) startTime = now;
            const raw = Math.min((now - startTime) / duration, 1);
            draw(from, to, ease(raw));
            if (raw < 1) {
                s.rafId = requestAnimationFrame(animate);
            } else {
                s.current = to;
                s.rafId = null;
            }
        };
        s.rafId = requestAnimationFrame(animate);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cityIdx]);

    return (
        <canvas
            ref={canvasRef}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
        />
    );
}
