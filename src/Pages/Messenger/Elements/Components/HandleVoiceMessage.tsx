import { useState, useEffect, useRef, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { I_CLOSE, I_DOWNLOAD } from '../../../../System/UI/IconPack';
import { useDatabase } from '../../../../System/Context/Database';
import { useWebSocket } from '../../../../System/Context/WebSocket';
import { ProgressRing } from '../../../../UIKit';
import { createExplosionEffect } from '../../../../System/Elements/ExplosionEffect';
import Waveform from '../../../../UIKit/Components/Voice/Waveform';
import { PlayButton, HandleTime } from '../../../../System/Elements/MusicPlayer';
import { useDispatch, useSelector } from 'react-redux';
import { removeMessage } from '../../../../Store/slices/messenger';
import { stopOtherMedia, onMediaStop } from '../../../../System/Elements/MediaPlayback';

interface HandleVoiceMessageProps {
    message: any;
    decrypted: any;
}

const HandleVoiceMessage = ({ message, decrypted }: HandleVoiceMessageProps) => {
    const { wsClient } = useWebSocket();
    const db = useDatabase();
    const dispatch = useDispatch();
    const selectedChat = useSelector((state: any) => state.messenger.selectedChat);
    const mediaId = useId();

    const [isDownloaded, setIsDownloaded] = useState(
        !!(message?.is_uploaded && decrypted?.file?.base64)
    );
    const [fileSrc, setFileSrc] = useState<string | null>(
        message?.is_uploaded && decrypted?.file?.base64 ? decrypted.file.base64 : null
    );
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(decrypted?.file?.duration || 0);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [isListened, setIsListened] = useState(message?.is_listened || false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadError, setDownloadError] = useState(false);
    const [decodedWaveform, setDecodedWaveform] = useState<number[] | null>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const voiceRef = useRef<HTMLDivElement>(null);
    const fileSrcRef = useRef<string | null>(null);

    const loadFile = async () => {
        if (message.mid) {
            const file = await db.files.where('mid').equals(message.mid).first();
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
        }
    };

    useEffect(() => {
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
        if (!message?.is_uploaded) {
            loadFile();
        }
    }, [message?.mid]);

    useEffect(() => {
        if (!fileSrc) return;

        const buildWaveform = async () => {
            try {
                const response = await fetch(fileSrc);
                const arrayBuffer = await response.arrayBuffer();
                const audioCtx = new AudioContext();
                const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
                audioCtx.close();

                const raw = audioBuffer.getChannelData(0);
                const BARS = 30;
                const NOISE_GATE = 0.015;
                const blockSize = Math.floor(raw.length / BARS);
                const peaks: number[] = [];

                for (let i = 0; i < BARS; i++) {
                    let peak = 0;
                    const start = i * blockSize;
                    const step = Math.max(1, Math.floor(blockSize / 200));
                    for (let j = 0; j < blockSize; j += step) {
                        const abs = Math.abs(raw[start + j] || 0);
                        if (abs > peak) peak = abs;
                    }
                    peaks.push(peak < NOISE_GATE ? 0 : peak);
                }

                const max = Math.max(...peaks, 0.01);
                setDecodedWaveform(peaks.map(v => v === 0 ? 0 : Math.max(0.1, v / max)));
            } catch {
            }
        };

        buildWaveform();
    }, [fileSrc]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        audio.playbackRate = playbackRate;

        const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
        const handleLoadedMetadata = () => {
            if (Number.isFinite(audio.duration)) {
                setDuration(audio.duration);
            }
        };
        const handleEnded = () => {
            setIsPlaying(false);
            setCurrentTime(0);
            if (!isListened) setIsListened(true);
        };

        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('ended', handleEnded);
        };
    }, [fileSrc, playbackRate]);

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
            const audio = audioRef.current;
            if (audio && !audio.paused) {
                audio.pause();
                setIsPlaying(false);
            }
        });
    }, [mediaId]);

    const togglePlay = () => {
        const audio = audioRef.current;
        if (!audio || !fileSrc) return;

        if (isPlaying) {
            audio.pause();
            setIsPlaying(false);
        } else {
            stopOtherMedia(mediaId);
            audio.play().catch(() => { });
            setIsPlaying(true);
            if (!isListened && currentTime === 0) setIsListened(true);
        }
    };

    const handleWaveformClick = (progress: number) => {
        const audio = audioRef.current;
        if (!audio || !fileSrc) return;
        audio.currentTime = progress * duration;
    };

    const togglePlaybackRate = () => {
        const rates = [1, 1.5, 2];
        setPlaybackRate(rates[(rates.indexOf(playbackRate) + 1) % rates.length]);
    };

    const cancelDownload = () => {
        setIsDownloading(false);
        setIsDownloaded(false);
        setFileSrc(null);
    };

    const cancelAndRemove = () => {
        if (message.stop) message.stop();
        if (message.temp_mid) {
            wsClient.send({ type: 'messenger', action: 'stop_upload', temp_mid: message.temp_mid });
        }
        if (voiceRef.current) createExplosionEffect(voiceRef.current, 40);
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

    const renderLeftButton = () => {
        if (message.status === 'not_sent') {
            return (
                <motion.button
                    key="uploading"
                    className="VoiceCircleButton"
                    onClick={cancelAndRemove}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                >
                    <ProgressRing progress={message.upload_progress} size={38} stroke={3} />
                    <div className="VoiceCircleButton__cancel"><I_CLOSE /></div>
                </motion.button>
            );
        }

        if (!isDownloaded) {
            return (
                <motion.button
                    key="downloading"
                    className="VoiceCircleButton"
                    onClick={download}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                >
                    {isDownloading && decrypted.file?.download_progress > 0 ? (
                        <>
                            <ProgressRing progress={decrypted.file.download_progress} size={38} stroke={3} />
                            <div className="VoiceCircleButton__cancel" onClick={(e) => { e.stopPropagation(); cancelDownload(); }}>
                                <I_CLOSE />
                            </div>
                        </>
                    ) : downloadError ? (
                        <span style={{ fontSize: '0.65em', color: '#ff5b5b' }}>Ошибка</span>
                    ) : (
                        <I_DOWNLOAD />
                    )}
                </motion.button>
            );
        }

        return (
            <motion.div
                key="player"
                className="VoiceCircleButton VoiceCircleButton--play"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
            >
                <PlayButton isPlaying={isPlaying} togglePlay={togglePlay} />
            </motion.div>
        );
    };

    const progress = duration > 0 ? currentTime / duration : 0;
    const waveform = decodedWaveform ?? decrypted?.file?.waveform ?? Array(60).fill(0.08);

    return (
        <div className="Voice" ref={voiceRef}>
            {!isListened && message.uid !== message.author?.id && (
                <div className="UnlistenedIndicator" />
            )}

            <AnimatePresence mode="wait">
                {renderLeftButton()}
            </AnimatePresence>

            <div className="WaveformContainer">
                <Waveform
                    waveform={waveform}
                    progress={progress}
                    isPlaying={isPlaying}
                    onClick={isDownloaded ? handleWaveformClick : undefined}
                    height={28}
                />
                <div className="VoiceFooter">
                    <div className="Duration">
                        <HandleTime time={isPlaying ? currentTime : duration} />
                    </div>
                    {isDownloaded && (
                        <motion.button
                            className="PlaybackRate"
                            onClick={togglePlaybackRate}
                            whileTap={{ scale: 0.9 }}
                        >
                            {playbackRate}x
                        </motion.button>
                    )}
                </div>
            </div>

            {fileSrc && (
                <audio ref={audioRef} src={fileSrc} style={{ display: 'none' }} />
            )}
        </div>
    );
};

export default HandleVoiceMessage;
