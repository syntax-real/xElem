import { memo } from 'react';
import { I_MUSIC } from '../../../System/UI/IconPack';
import { AnimatePresence, motion } from 'framer-motion';
import { useDownloadStore } from '../../../Store/downloadStore';
import Image from './Image';
import { useAuth } from '@/System/Hooks/useAuth';
import BlurHash from './BlurHash';

interface MusicCoverProps {
    cover?: any;
    variant?: boolean;
    icon?: React.ReactNode;
    width?: number;
    borderRadius?: number;
    shadows?: boolean;
    onClick?: () => void;
    style?: React.CSSProperties;
    songFileId?: number | null;
    layoutId?: string;
}

interface FilledProgressProps {
    progress: number;
    size?: number;
    style?: React.CSSProperties;
}

const FilledProgress: React.FC<FilledProgressProps> = ({
    style,
    progress,
    size = 80,
}) => {
    const radius = size / 2;
    const center = radius;

    const angle = (progress / 100) * 360;
    const radians = (angle - 90) * (Math.PI / 180);

    const x = center + radius * Math.cos(radians);
    const y = center + radius * Math.sin(radians);

    const largeArcFlag = angle > 180 ? 1 : 0;
    const pathData = `
    M ${center} ${center}
    L ${center} 0
    A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x} ${y}
    Z
  `;

    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                backgroundColor: 'rgb(0 0 0 / 30%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'absolute',
                zIndex: 2,
                ...style,
            }}
        >
            <svg width={size} height={size}>
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="rgb(0 0 0 / 60%)"
                />
                <path d={pathData} fill="#fff" />
            </svg>
        </div>
    );
};

const MusicCover: React.FC<MusicCoverProps> = memo(
    ({
        cover,
        icon,
        width,
        borderRadius = 8,
        shadows = false,
        onClick,
        style,
        songFileId,
        layoutId
    }) => {
        const { accountData } = useAuth();
        const download = useDownloadStore((state) =>
            songFileId ? state.downloads[`${songFileId}:original`] : null,
        );
        const progress = download
            ? Math.floor((download.downloaded / download.size) * 100)
            : 0;
        const sizeStyle = width
            ? { width: `${width}px`, height: `${width}px` }
            : {};
        const mergedStyle = {
            ...sizeStyle,
            ...style,
        };

        return (
            <motion.div onClick={onClick} className="UI-MusicCover" style={mergedStyle} layoutId={layoutId}>
                {download && progress !== 100 && (
                    <FilledProgress
                        size={width ? width * 0.5 : 0}
                        progress={progress}
                        style={{
                            borderRadius: `${borderRadius}px`,
                        }}
                    />
                )}

                {cover ? (
                    <>
                        {
                            <Image
                                className="Cover"
                                style={{
                                    borderRadius: `${borderRadius}px`,
                                }}
                                image={cover}
                                variant={(
                                    accountData?.settings?.images_preview_format ? accountData?.settings?.images_preview_format : 'webp'
                                )}
                                draggable={false}
                            />
                        }
                        <AnimatePresence>
                            {shadows && (
                                <motion.div
                                    className="CoverShadow"
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0 }}
                                    transition={{ duration: 0.2, ease: 'easeOut' }}
                                >
                                    <BlurHash image={cover} />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </>
                ) : (
                    <div
                        className="NoneCover"
                        style={{
                            borderRadius: `${borderRadius}px`,
                        }}
                    >
                        {icon || <I_MUSIC />}
                    </div>
                )}
            </motion.div>
        );
    },
);

export default MusicCover;
