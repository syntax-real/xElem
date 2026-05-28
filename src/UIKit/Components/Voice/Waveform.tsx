import React from 'react';

interface WaveformProps {
    waveform: number[];
    progress?: number;
    isPlaying?: boolean;
    onClick?: (progress: number) => void;
    className?: string;
    height?: number;
}

const Waveform = ({ waveform, progress = 0, isPlaying = false, onClick, className = '', height = 30 }: WaveformProps) => {
    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!onClick) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        onClick(Math.max(0, Math.min(1, x / rect.width)));
    };

    return (
        <div
            className={`Waveform ${className}`}
            style={{
                width: '100%',
                height: `${height}px`,
                cursor: onClick ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'flex-end',
                gap: '2px',
            }}
            onClick={handleClick}
        >
            {waveform.map((val, i) => {
                const barProgress = i / waveform.length;
                const isActive = barProgress < progress;
                // v=0 means noise-gated silence — show as small flat bar
                const barHeight = val === 0 ? 15 : Math.max(15, val * 100);

                return (
                    <div
                        key={i}
                        style={{
                            flex: 1,
                            height: `${barHeight}%`,
                            background: 'var(--WAVEFORM_BAR_COLOR, var(--ACCENT_COLOR))',
                            opacity: isActive ? 1 : 0.3,
                            borderRadius: '100px',
                            transition: 'opacity 0.15s, height 0.1s',
                        }}
                    />
                );
            })}
        </div>
    );
};

export default Waveform;
