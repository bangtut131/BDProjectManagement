import { useState, useRef, useEffect } from 'react';
import { X, Check, ZoomIn, ZoomOut, Move } from 'lucide-react';

export const ImageCropper = ({ imageSrc, onCrop, onCancel, aspectRatio = 16 / 5 }) => {
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const containerRef = useRef(null);
    const imageRef = useRef(null);

    // Initialize: Center the image
    useEffect(() => {
        if (imageRef.current && containerRef.current) {
            // Initial positioning logic if needed
        }
    }, [imageSrc]);

    const handleMouseDown = (e) => {
        e.preventDefault();
        setIsDragging(true);
        setDragStart({
            x: e.clientX - position.x,
            y: e.clientY - position.y
        });
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();

        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;

        // Optional: Add bounds checking here so image doesn't leave container completely
        // For now, free movement for flexibility

        setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleWheel = (e) => {
        e.preventDefault();
        const delta = e.deltaY * -0.001;
        const newScale = Math.min(Math.max(0.5, scale + delta), 3);
        setScale(newScale);
    };

    const handleCrop = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Define Output Size (High Quality)
        const outputWidth = 1200;
        const outputHeight = outputWidth / aspectRatio;

        canvas.width = outputWidth;
        canvas.height = outputHeight;

        // Calculate drawing parameters relative to the container view
        // The container displays a "viewport" of the image.
        // We need to map the "visible" area in the container to the canvas.

        // Strategy: Render exactly what is seen in the container div onto the canvas
        // But mapped to the output resolution.

        if (!containerRef.current || !imageRef.current) return;

        const container = containerRef.current;
        const img = imageRef.current;

        // Container Dimensions
        const cw = container.clientWidth;
        const ch = container.clientHeight;

        // Image Rendered Dimensions
        const iw = img.naturalWidth * scale; // This logic is tricky because 'scale' is applied via transform
        // Actually, CSS Transform scale is visual. width/height in pixels logic is better.

        // Let's rely on the visual ratio.
        // The container view is our "Crop Box".
        // The image is shifted by 'position.x' and 'position.y' from center? No, from top-left?
        // Let's assume position is translation from default layout.

        // Simpler approach: DRAW the image onto canvas using same transforms.

        // 1. Fill canvas with background (optional)
        ctx.fillStyle = '#1e293b'; // slate-900
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 2. Determine the ratio between Output Canvas and DOM Container
        const ratio = outputWidth / cw;

        // 3. Setup Context
        ctx.save();

        // Move to center of canvas? No, keep coordinate system aligned with DOM container top-left * ratio
        // Translate to match the user's drag
        // 'position.x' is in DOM pixels.

        const imgX = position.x * ratio;
        const imgY = position.y * ratio;
        const imgScale = scale * ratio;

        // We need to account that in DOM, image might be centered or not.
        // In our JSX below, we'll center the image with flex, then apply transform translate.
        // So the "origin" is the center of the container.

        // Let's change the rendering strategy below to be absolutely positioned top-left: 0,0
        // with the translation applied. 
        // Then:

        ctx.translate(outputWidth / 2, outputHeight / 2); // Center of canvas
        ctx.translate(position.x * ratio, position.y * ratio); // User Move
        ctx.scale(scale, scale); // User Zoom

        // Draw Image Centered
        // Natural Offset: -NaturalWidth/2, -NaturalHeight/2
        ctx.scale(ratio, ratio); // Adjust for the underlying resolution difference vs screen

        // Wait, 'ratio' is effectively applied to 'position' and 'scale' implicitly? 
        // No. If native width is 2000px, and we show it at 500px on screen.
        // If we draw it, we draw at native size.

        // Let's back up.
        // We want to draw the image such that the center of the image aligns with the center of the canvas + offset.

        ctx.drawImage(
            img,
            -img.naturalWidth / 2,
            -img.naturalHeight / 2
        );

        ctx.restore();

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        onCrop(dataUrl);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden max-w-4xl w-full flex flex-col shadow-2xl animate-in zoom-in-95">
                {/* Header */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                        <Move size={18} /> Sesuaikan Gambar
                    </h3>
                    <button onClick={onCancel} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition">
                        <X size={20} />
                    </button>
                </div>

                {/* Crop Area */}
                <div className="relative bg-slate-950 overflow-hidden select-none" style={{ height: '400px' }}>
                    {/* The Crop Viewport (The Box representing the final output) */}
                    <div
                        ref={containerRef}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-2 border-white/50 shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] z-10 pointer-events-none"
                        style={{
                            width: '100%',
                            maxWidth: '700px',
                            aspectRatio: `${aspectRatio}`,
                            borderRadius: '0.5rem'
                        }}
                    >
                        {/* Grid Lines for reference */}
                        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-30">
                            {[...Array(9)].map((_, i) => <div key={i} className="border border-white/30"></div>)}
                        </div>
                    </div>

                    {/* The Interactive Image */}
                    {/* We put drag handlers on a wrapper or the background */}
                    <div
                        className="absolute inset-0 cursor-move flex items-center justify-center"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onWheel={handleWheel}
                    >
                        <img
                            ref={imageRef}
                            src={imageSrc}
                            alt="Crop Preview"
                            className="max-w-none origin-center transition-transform duration-0 ease-linear pointer-events-none"
                            style={{
                                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                                maxHeight: '80vh', // Initial constraint just so it's not huge
                            }}
                        />
                    </div>

                    {/* Controls Overlay */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/60 px-4 py-2 rounded-full backdrop-blur-md z-20">
                        <button onClick={() => setScale(s => Math.max(0.2, s - 0.1))} className="text-white hover:text-indigo-400 p-1"><ZoomOut size={20} /></button>
                        <input
                            type="range"
                            min="0.2"
                            max="3"
                            step="0.05"
                            value={scale}
                            onChange={(e) => setScale(parseFloat(e.target.value))}
                            className="w-32 accent-indigo-500 h-1.5 bg-white/30 rounded-lg appearance-none cursor-pointer"
                        />
                        <button onClick={() => setScale(s => Math.min(3, s + 0.1))} className="text-white hover:text-indigo-400 p-1"><ZoomIn size={20} /></button>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                        Batal
                    </button>
                    <button
                        onClick={handleCrop}
                        className="px-6 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition flex items-center gap-2 shadow-lg shadow-indigo-500/30"
                    >
                        <Check size={18} /> Terapkan
                    </button>
                </div>
            </div>
        </div>
    );
};
