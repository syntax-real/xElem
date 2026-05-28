import { decode } from "blurhash";
import { useEffect, useRef } from "react";

const blurCache = new Map<string, ImageData>();

const BlurHash = ({ image, style }: any) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        if (!image?.blur_hash || !canvasRef.current) return;

        const key = `${image.file_id}`;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        let imageData = blurCache.get(key);

        if (!imageData) {
            const W = 32;
            const H = 32;

            const pixels = decode(image.blur_hash, W, H);

            const imageData = ctx.createImageData(W, H);
            imageData.data.set(pixels);

            ctx.putImageData(imageData, 0, 0);
        }
    }, [image?.blur_hash, image?.width, image?.height]);

    return (
        <canvas
            ref={canvasRef}
            width={32}
            height={32}
            style={{
                ...style,
                width: '100%',
                height: '100%',
                display: 'block'
            }}
        />
    )
}

export default BlurHash;