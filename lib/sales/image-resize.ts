// Browser only (canvas / createImageBitmap). Shrinks a photo before it goes to Storage so the
// listing pages do not serve 8000 px originals.

/**
 * Returns a JPEG Blob whose longer side is at most `maxSide`. A JPEG that already fits is returned
 * unchanged (no needless re-compression). The caller must reject non-image files first.
 */
export async function resizeImage(file: File, maxSide = 2400, quality = 0.82): Promise<Blob> {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    try {
        const longer = Math.max(bitmap.width, bitmap.height);
        if (file.type === 'image/jpeg' && longer <= maxSide) return file;

        const scale = longer > maxSide ? maxSide / longer : 1;
        const width = Math.max(1, Math.round(bitmap.width * scale));
        const height = Math.max(1, Math.round(bitmap.height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('canvas_unavailable');
        // JPEG has no alpha: paint white first so transparent PNG/WebP areas do not turn black.
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(bitmap, 0, 0, width, height);

        return await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(
                (blob) => (blob ? resolve(blob) : reject(new Error('encode_failed'))),
                'image/jpeg',
                quality,
            );
        });
    } finally {
        bitmap.close();
    }
}
