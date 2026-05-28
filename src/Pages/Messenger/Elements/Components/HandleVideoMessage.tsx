import { useState, useEffect, useRef, useId, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { I_CLOSE, I_DOWNLOAD, I_PLAY } from '../../../../System/UI/IconPack';
import { useDatabase } from '../../../../System/Context/Database';
import { useWebSocket } from '../../../../System/Context/WebSocket';
import { ProgressRing, ContextMenu } from '../../../../UIKit';
import { createExplosionEffect } from '../../../../System/Elements/ExplosionEffect';
import { HandleTime } from '../../../../System/Elements/MusicPlayer';
import { downloadBlob } from '../../../../System/Elements/Function';
import { useDispatch, useSelector } from 'react-redux';
import { removeMessage } from '../../../../Store/slices/messenger';
import { stopOtherMedia, onMediaStop } from '../../../../System/Elements/MediaPlayback';

interface HandleVideoMessageProps {
    message: any;
    decrypted: any;
    messageTime?: string;
}

const HandleVideoMessage = ({ message, decrypted, messageTime }: HandleVideoMessageProps) => {
    const { wsClient } = useWebSocket();
    const db = useDatabase();
    const dispatch = useDispatch();
    const selectedChat = useSelector((state: any) => state.messenger.selectedChat);
    const mediaId = useId();

    const [isDownloaded, setIsDownloaded] = useState(false);
    const [fileSrc, setFileSrc] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(decrypted?.file?.duration || 0);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadError, setDownloadError] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const circleRef = useRef<HTMLDivElement>(null);
    const fileSrcRef = useRef<string | null>(null);

    const loadFile = async () => {
        // Try by mid first, then by temp_mid (for just-sent messages)
        const key = message.mid ?? message.temp_mid;
        if (key == null) return false;

        // Try exact type first, then as string (db may store as number or string)
        let file = await db.files.where('mid').equals(key).first();
        if (!file) file = await db.files.where('mid').equals(String(key)).first();
        if (file) {
            if (fileSrcRef.current) URL.revokeObjectURL(fileSrcRef.current);
            const url = URL.createObjectURL(file.blob);
            fileSrcRef.current = url;
            setFileSrc(url);
            setIsDownloaded(true);
            setIsDownloading(false);
            return true;
        }
        return false;
    };

    useEffect(() => {
        // On mount, try to load from IndexedDB immediately
        loadFile();
        return () => {
            if (fileSrcRef.current) URL.revokeObjectURL(fileSrcRef.current);
        };
    }, []);

    useEffect(() => {
        if (decrypted?.file?.download_progress === 100) {
            loadFile();
        } else if (decrypted?.file?.download_progress === -1) {
            setIsDownloading(false);
            setDownloadError(true);
        }
    }, [decrypted.file?.download_progress]);

    useEffect(() => {
        if (message?.mid && !fileSrcRef.current) {
            loadFile();
        }
    }, [message?.mid]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleTimeUpdate = () => setCurrentTime(video.currentTime);
        const handleLoadedMetadata = () => {
            if (Number.isFinite(video.duration)) {
                setDuration(video.duration);
            }
        };
        const handleEnded = () => {
            setIsPlaying(false);
            setCurrentTime(0);
        };

        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('ended', handleEnded);

        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('ended', handleEnded);
        };
    }, [fileSrc]);

    const download = async () => {
        if (isDownloading) return;
        setDownloadError(false);
        const file = await loadFile();
        if (!file) {
            setIsDownloading(true);
            wsClient.send({
                type: 'messenger',
                action: 'download_files',
                mid: message.mid,
                file_ids: decrypted.file.file_map
            });
        }
    };

    useEffect(() => {
        return onMediaStop(mediaId, () => {
            const video = videoRef.current;
            if (video && !video.paused) {
                video.pause();
                setIsPlaying(false);
            }
        });
    }, [mediaId]);

    const togglePlay = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        const video = videoRef.current;
        if (!video || !fileSrc) return;

        if (isPlaying) {
            video.pause();
            setIsPlaying(false);
        } else {
            stopOtherMedia(mediaId);
            video.play().catch(() => { });
            setIsPlaying(true);
        }
    };

    const [isExporting, setIsExporting] = useState(false);

    const saveVideoCircle = useCallback(() => {
        if (!message.mid || isExporting) return;
        setIsExporting(true);

        const handler = (data: any) => {
            if (data.action === 'export_video_circle' && data.mid === message.mid) {
                wsClient.offMessage('messenger', handler);
                setIsExporting(false);

                if (data.binary) {
                    const blob = new Blob(
                        [data.binary instanceof Uint8Array ? data.binary : new Uint8Array(data.binary)],
                        { type: 'video/mp4' }
                    );
                    downloadBlob(blob, `element_circle_${Date.now()}.mp4`);
                }
            }
        };

        wsClient.onMessage('messenger', handler);
        wsClient.send({
            type: 'messenger',
            action: 'export_video_circle',
            mid: message.mid
        });

        setTimeout(() => {
            wsClient.offMessage('messenger', handler);
            setIsExporting(false);
        }, 30000);
    }, [message.mid, isExporting, wsClient]);

    const contextMenuItems = [
        {
            icon: <I_DOWNLOAD />,
            title: isExporting ? 'Экспорт...' : 'Скачать кружок',
            onClick: () => saveVideoCircle()
        }
    ];

    const cancelAndRemove = () => {
        if (message.stop) message.stop();
        if (message.temp_mid) {
            wsClient.send({ type: 'messenger', action: 'stop_upload', temp_mid: message.temp_mid });
        }
        if (circleRef.current) createExplosionEffect(circleRef.current, 40);
        setTimeout(() => {
            if (selectedChat) {
                dispatch(removeMessage({
                    temp_mid: message.temp_mid,
                    mid: message.mid,
                    chat_id: selectedChat.id,
                    chat_type: selectedChat.type
                }));
            }
        }, 150);
    };

    const progress = duration > 0 ? currentTime / duration : 0;
    const R = 70;
    const circumference = 2 * Math.PI * R;

    return (
        <ContextMenu items={isDownloaded ? contextMenuItems : []}>
            <div className="VideoCircle" ref={circleRef}>
                <div className="VideoCircle__circle" onClick={isDownloaded ? () => togglePlay() : undefined}>
                    {fileSrc ? (
                        <video
                            ref={videoRef}
                            src={fileSrc}
                            className="VideoCircle__video"
                            playsInline
                            preload="auto"
                        />
                    ) : decrypted?.file?.thumbnail ? (
                        <img src={decrypted.file.thumbnail} className="VideoCircle__video" alt="" />
                    ) : (
                        <div className="VideoCircle__placeholder" />
                    )}

                    <svg className="VideoCircle__ring" viewBox="0 0 148 148">
                        <circle cx="74" cy="74" r={R} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
                        {isPlaying && (
                            <circle cx="74" cy="74" r={R} fill="none" stroke="#fff" strokeWidth="3"
                                strokeDasharray={circumference}
                                strokeDashoffset={circumference * (1 - progress)}
                                strokeLinecap="round"
                                transform="rotate(-90 74 74)"
                                style={{ transition: 'stroke-dashoffset 0.2s linear' }}
                            />
                        )}
                    </svg>

                    <AnimatePresence mode="wait">
                        {message.status === 'not_sent' ? (
                            <motion.button
                                key="uploading"
                                className="VideoCircle__center"
                                onClick={(e) => { e.stopPropagation(); cancelAndRemove(); }}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ duration: 0.15 }}
                            >
                                <ProgressRing progress={message.upload_progress} size={48} stroke={3} />
                                <div className="VideoCircle__cancel"><I_CLOSE /></div>
                            </motion.button>
                        ) : !isDownloaded ? (
                            <motion.button
                                key="download"
                                className="VideoCircle__center"
                                onClick={(e) => { e.stopPropagation(); download(); }}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ duration: 0.15 }}
                            >
                                {isDownloading && decrypted.file?.download_progress > 0 ? (
                                    <>
                                        <ProgressRing progress={decrypted.file.download_progress} size={48} stroke={3} />
                                        <div className="VideoCircle__cancel"><I_CLOSE /></div>
                                    </>
                                ) : downloadError ? (
                                    <span style={{ fontSize: '0.7em', color: '#ff5b5b' }}>Ошибка</span>
                                ) : (
                                    <I_DOWNLOAD />
                                )}
                            </motion.button>
                        ) : !isPlaying ? (
                            <motion.button
                                key="play"
                                className="VideoCircle__center"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ duration: 0.15 }}
                                onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                            >
                                <I_PLAY className="" />
                            </motion.button>
                        ) : null}
                    </AnimatePresence>

                    <div className="VideoCircle__info">
                        <span className="VideoCircle__duration">
                            <HandleTime time={duration} />
                        </span>
                        <span className="VideoCircle__sent-time">{messageTime}</span>
                    </div>
                </div>
            </div>
        </ContextMenu>
    );
};

export default HandleVideoMessage;
