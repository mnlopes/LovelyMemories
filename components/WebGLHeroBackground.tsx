"use client";

import { useEffect, useRef } from "react";

// ── GLSL Shaders ─────────────────────────────────────────
const VERT = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
    v_uv        = a_pos * 0.5 + 0.5;
    v_uv.y      = 1.0 - v_uv.y;          // flip Y for img coords
    gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

// Noise-based dissolve: pixels vanish/appear based on fbm noise + threshold
const FRAG = `
precision mediump float;

uniform sampler2D u_tex0;
uniform sampler2D u_tex1;
uniform float     u_progress;   // 0.0 → 1.0
uniform float     u_seed;       // changes each transition for variety
varying vec2      v_uv;

float rand(vec2 co) {
    return fract(sin(dot(co, vec2(12.9898 + u_seed * 0.1, 78.233))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = rand(i);
    float b = rand(i + vec2(1.0, 0.0));
    float c = rand(i + vec2(0.0, 1.0));
    float d = rand(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
    float v = 0.0;
    v += noise(p * 3.0)  * 0.500;
    v += noise(p * 6.0)  * 0.250;
    v += noise(p * 12.0) * 0.125;
    v += noise(p * 24.0) * 0.0625;
    return v / 0.9375;
}

void main() {
    float n         = fbm(v_uv);
    float edge      = 0.10;
    float threshold = mix(-edge, 1.0 + edge, u_progress);
    float mask      = smoothstep(threshold - edge, threshold + edge, n);

    // Chromatic shift on the dissolve edge — premium touch
    float shift = (1.0 - mask) * mask * 0.006;
    vec4 c0 = vec4(
        texture2D(u_tex0, v_uv + vec2( shift, 0.0)).r,
        texture2D(u_tex0, v_uv).g,
        texture2D(u_tex0, v_uv - vec2( shift, 0.0)).b,
        1.0
    );
    vec4 c1 = vec4(
        texture2D(u_tex1, v_uv + vec2(-shift, 0.0)).r,
        texture2D(u_tex1, v_uv).g,
        texture2D(u_tex1, v_uv + vec2( shift, 0.0)).b,
        1.0
    );

    gl_FragColor = mix(c0, c1, mask);
}`;

// ── Helpers ───────────────────────────────────────────────
function createShader(gl: WebGLRenderingContext, type: number, src: string) {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
}
function createProgram(gl: WebGLRenderingContext) {
    const prog = gl.createProgram()!;
    gl.attachShader(prog, createShader(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, createShader(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    return prog;
}
function loadTexture(gl: WebGLRenderingContext, url: string): Promise<WebGLTexture> {
    return new Promise((resolve) => {
        const tex = gl.createTexture()!;
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            resolve(tex);
        };
        img.src = url;
    });
}

// ── Component ─────────────────────────────────────────────
interface Props {
    images: string[];   // ordered list of image URLs
    cityIdx: number;     // current city index — drives transitions
    duration: number;     // transition duration ms
}

export default function WebGLHeroBackground({ images, cityIdx, duration }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Store mutable GL state in a ref so it persists across renders
    const glState = useRef<{
        gl: WebGLRenderingContext;
        prog: WebGLProgram;
        textures: WebGLTexture[];
        current: number;
        progress: number;
        seed: number;
        animId: number | null;
        startT: number | null;
    } | null>(null);

    // Init WebGL once
    useEffect(() => {
        const canvas = canvasRef.current!;
        const gl = canvas.getContext("webgl", { antialias: false, alpha: false })!;
        if (!gl) return;

        const prog = createProgram(gl);
        gl.useProgram(prog);

        // Full-screen quad
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER,
            new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
            gl.STATIC_DRAW);
        const loc = gl.getAttribLocation(prog, "a_pos");
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

        // Load all textures, then store state
        Promise.all(images.map((url) => loadTexture(gl, url))).then((textures) => {
            glState.current = {
                gl, prog, textures,
                current: 0,
                progress: 1,   // start fully showing image 0
                seed: 0,
                animId: null,
                startT: null,
            };
            render(0, 0, 1); // draw first frame
        });

        function render(from: number, to: number, p: number) {
            if (!glState.current) return;
            const { gl, prog, textures } = glState.current;

            // Resize canvas to match display
            const w = canvas.clientWidth;
            const h = canvas.clientHeight;
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w;
                canvas.height = h;
            }
            gl.viewport(0, 0, canvas.width, canvas.height);

            // Bind textures
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, textures[from]);
            gl.uniform1i(gl.getUniformLocation(prog, "u_tex0"), 0);

            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, textures[to]);
            gl.uniform1i(gl.getUniformLocation(prog, "u_tex1"), 1);

            gl.uniform1f(gl.getUniformLocation(prog, "u_progress"), p);
            gl.uniform1f(gl.getUniformLocation(prog, "u_seed"), glState.current.seed);

            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }

        // Expose render to the transition effect
        (glState as any).render = render;

        const resizeObs = new ResizeObserver(() => {
            if (glState.current) {
                const s = glState.current;
                render(s.current, s.current, 1);
            }
        });
        resizeObs.observe(canvas);

        return () => {
            resizeObs.disconnect();
            if (glState.current?.animId) cancelAnimationFrame(glState.current.animId);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Trigger transition on cityIdx change
    useEffect(() => {
        if (!glState.current) return;
        const s = glState.current;
        if (s.animId) cancelAnimationFrame(s.animId);

        const from = s.current;
        const to = cityIdx;
        s.seed = Math.random() * 100; // new noise pattern each time
        s.startT = null;

        const render = (glState as any).render as typeof glState.current extends null ? never : (f: number, t: number, p: number) => void;
        if (!render) return;

        const easeInOut = (t: number) =>
            t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

        const animate = (now: number) => {
            if (!s.startT) s.startT = now;
            const elapsed = now - s.startT;
            const raw = Math.min(elapsed / duration, 1);
            const p = easeInOut(raw);

            render(from, to, p);

            if (raw < 1) {
                s.animId = requestAnimationFrame(animate);
            } else {
                s.current = to;
                s.progress = 1;
                s.animId = null;
            }
        };
        s.animId = requestAnimationFrame(animate);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cityIdx]);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                display: "block",
            }}
        />
    );
}
