import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useModalsStore } from '../../../../Store/modalsStore';
import { useMessengerEvent } from '../../../../System/Context/WebSocket';
import {
    I_PLUS,
    I_SEND,
    I_SMILE,
    I_CLOSE,
    I_MICROPHONE,
    I_LOCK,
    I_ARROW_UP,
    I_VIDEO,
    I_EDIT,
    I_REPLY,
} from '../../../../System/UI/IconPack';
import {
    HandleFileIcon,
    HandleFileSize,
} from '../../../../System/Elements/Handlers';
import { useWebSocket } from '../../../../System/Context/WebSocket';
import { useTranslation } from 'react-i18next';
import { Bubble, SocialInput } from '../../../../UIKit';
import { useAuth } from '../../../../System/Hooks/useAuth';
import { useDispatch } from 'react-redux';
import {
    addMessage,
    updateChat,
    updateMessage,
} from '../../../../Store/slices/messenger';
import { DragDropArea } from '../../../../System/Elements/DragDropArea';
import { createExplosionEffect } from '../../../../System/Elements/ExplosionEffect';
import { motion, AnimatePresence } from 'framer-motion';
import { isMobile as _isMobileDetect } from 'react-device-detect';
import { db } from '../../../../System/Context/Database';

interface FileWithTemp {
    temp_mid: number;
    file: File;
}

const BottomBar = ({
    createTempMesID,
    selectedChat,
    messageInputRef,
    setActionPanelOpen,
    actionPanelOpen,
    openChatMenu,
    messageValue,
    setMessageValue,
    replyTo,
    editingMessage,
    cancelReplyOrEdit,
    onMessageSent,
}) => {
    const { t } = useTranslation();
    const { wsClient } = useWebSocket();
    const { openModal } = useModalsStore() as any;
    const { accountData } = useAuth();
    const dispatch = useDispatch();

    const [isMobile, setIsMobile] = useState(
        _isMobileDetect && window.innerWidth <= 768,
    );

    useEffect(() => {
        const handleResize = () =>
            setIsMobile(_isMobileDetect && window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const fileInputRef = useRef(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [files, setFiles] = useState<File[]>([]);
    const [uploadFiles, setUploadFiles] = useState<FileWithTemp[]>([]);
    const fileRefs = useRef<Map<number, HTMLDivElement>>(new Map());
    const fileURLs = useRef<Map<number, string>>(new Map());

    const [recordingMode, setRecordingMode] = useState<'voice' | 'video'>(
        'voice',
    );
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [isLocked, setIsLocked] = useState(false);
    const [slideUpOffset, setSlideUpOffset] = useState(0);
    const [isHolding, setIsHolding] = useState(false);
    const [audioLevel, setAudioLevel] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const holdStartY = useRef<number>(0);
    const micButtonRef = useRef<HTMLButtonElement>(null);
    const videoPreviewRef = useRef<HTMLVideoElement>(null);
    const videoStreamRef = useRef<MediaStream | null>(null);
    const videoChunksRef = useRef<Blob[]>([]);

    // Отправка файла
    const CHUNK_SIZE = 10 * 1024;
    const currentChunk = useRef(0);
    const activeFileReaderRef = useRef<FileReader | null>(null);

    // Выгрузка файла
    const sendFile = ({ temp_mid, file }) => {
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        currentChunk.current = 0;

        const controller = new AbortController();
        const signal = controller.signal;

        const sendNextChunk = () => {
            if (signal.aborted) {
                return;
            }

            if (
                !wsClient.isConnected ||
                !wsClient.socket ||
                wsClient.socket.readyState !== WebSocket.OPEN
            ) {
                console.log('Загрузка приостановлена — сокет не открыт');
                return;
            }

            const start = currentChunk.current * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, file.size);
            const chunk = file.slice(start, end);

            const reader = new FileReader();
            activeFileReaderRef.current = reader;
            reader.onload = (event) => {
                activeFileReaderRef.current = null;
                if (event.target && event.target.result) {
                    wsClient.send({
                        type: 'messenger',
                        action: 'upload_file',
                        temp_mid: temp_mid,
                        current_chunk: currentChunk.current,
                        total_chunks: totalChunks,
                        binary: new Uint8Array(event.target.result as ArrayBuffer),
                    });

                    currentChunk.current++;

                    const uploadProgress =
                        (currentChunk.current / totalChunks) * 100;

                    dispatch(
                        updateMessage({
                            temp_mid: temp_mid,
                            newData: {
                                upload_progress: uploadProgress,
                            },
                        }),
                    );

                    if (currentChunk.current < totalChunks) {
                        setTimeout(sendNextChunk, 25);
                    } else {
                        currentChunk.current = 0;
                    }
                }
            };

            reader.readAsArrayBuffer(chunk);
        };

        sendNextChunk();

        const cancelSend = () => {
            controller.abort();
        };

        return cancelSend;
    };

    const handleFileInputChange = (e) => {
        if (e.target.files) {
            setFiles(
                (prevFiles) =>
                    [...prevFiles, ...Array.from(e.target.files)] as File[],
            );
        }
    };

    const handleFilesDrop = (droppedFiles) => {
        setFiles(
            (prevFiles) => [...prevFiles, ...Array.from(droppedFiles)] as File[],
        );
    };

    const handleRemoveFile = (index: number) => {
        const fileRef = fileRefs.current.get(index);

        const fileURL = fileURLs.current.get(index);
        if (fileURL) {
            URL.revokeObjectURL(fileURL);
            fileURLs.current.delete(index);
        }

        if (fileRef) {
            createExplosionEffect(fileRef);

            setTimeout(() => {
                setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
            }, 100);
        } else {
            setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
        }
    };

    const generateWaveform = (audioBuffer: AudioBuffer): number[] => {
        const rawData = audioBuffer.getChannelData(0);
        const BARS = 30;
        const NOISE_GATE = 0.015;
        const blockSize = Math.floor(rawData.length / BARS);
        const peaks: number[] = [];

        for (let i = 0; i < BARS; i++) {
            let peak = 0;
            const start = i * blockSize;
            const step = Math.max(1, Math.floor(blockSize / 200));
            for (let j = 0; j < blockSize; j += step) {
                const abs = Math.abs(rawData[start + j] || 0);
                if (abs > peak) peak = abs;
            }
            peaks.push(peak < NOISE_GATE ? 0 : peak);
        }

        const max = Math.max(...peaks, 0.01);
        return peaks.map((v) => (v === 0 ? 0 : Math.max(0.1, v / max)));
    };

    const startRecording = async () => {
        try {
            if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current);
                recordingTimerRef.current = null;
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
            });

            const audioMime = getAudioMimeType();
            const audioRecorderOptions: MediaRecorderOptions = {};
            if (audioMime) audioRecorderOptions.mimeType = audioMime;

            const mediaRecorder = new MediaRecorder(stream, audioRecorderOptions);

            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            const audioContext = new AudioContext();
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);

            audioContextRef.current = audioContext;
            analyserRef.current = analyser;

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const updateAudioLevel = () => {
                if (!analyserRef.current) return;

                analyserRef.current.getByteFrequencyData(dataArray);
                const average =
                    dataArray.reduce((sum, value) => sum + value, 0) /
                    dataArray.length;
                setAudioLevel(average / 255);

                animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
            };
            updateAudioLevel();

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlobType = mediaRecorder.mimeType || 'audio/webm';
                const audioBlob = new Blob(audioChunksRef.current, {
                    type: audioBlobType,
                });

                stream.getTracks().forEach((track) => track.stop());

                if (audioContextRef.current) {
                    audioContextRef.current.close();
                    audioContextRef.current = null;
                }

                if (animationFrameRef.current) {
                    cancelAnimationFrame(animationFrameRef.current);
                    animationFrameRef.current = null;
                }

                wsClient.send({
                    type: 'messenger',
                    action: 'recording_voice',
                    status: 'stop',
                    target: {
                        id: selectedChat.id,
                        type: selectedChat.type,
                    },
                });

                await sendVoiceMessage(audioBlob);
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);

            wsClient.send({
                type: 'messenger',
                action: 'recording_voice',
                status: 'start',
                target: {
                    id: selectedChat.id,
                    type: selectedChat.type,
                },
            });

            recordingTimerRef.current = setInterval(() => {
                setRecordingTime((prev) => prev + 1);
            }, 1000);
        } catch (error) {
            console.error('Error starting recording:', error);
            if (audioContextRef.current) {
                audioContextRef.current.close().catch(() => { });
                audioContextRef.current = null;
            }
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
            mediaRecorderRef.current = null;
            setIsRecording(false);
            if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current);
                recordingTimerRef.current = null;
            }
            const msg =
                (error as any)?.name === 'NotAllowedError'
                    ? 'Доступ к микрофону запрещён. Разрешите доступ в настройках браузера'
                    : 'Не удалось получить доступ к микрофону';
            openModal({
                type: 'alert',
                props: { title: 'Ошибка', message: msg },
            });
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);

            if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current);
                recordingTimerRef.current = null;
            }
        }
    };

    const cancelRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            const stream = mediaRecorderRef.current.stream;
            mediaRecorderRef.current.ondataavailable = null;
            mediaRecorderRef.current.onstop = null;
            mediaRecorderRef.current.stop();
            stream.getTracks().forEach((track) => track.stop());

            wsClient.send({
                type: 'messenger',
                action: 'recording_voice',
                status: 'stop',
                target: {
                    id: selectedChat.id,
                    type: selectedChat.type,
                },
            });

            setIsRecording(false);
            setRecordingTime(0);
            setIsLocked(false);
            setSlideUpOffset(0);
            setIsHolding(false);
            setAudioLevel(0);
            audioChunksRef.current = [];

            if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current);
                recordingTimerRef.current = null;
            }

            if (audioContextRef.current) {
                audioContextRef.current.close();
                audioContextRef.current = null;
            }

            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
        }
    };

    const getVideoMimeType = () => {
        const types = [
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8,opus',
            'video/webm',
            'video/mp4;codecs=h264,aac',
            'video/mp4',
        ];
        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) return type;
        }
        return '';
    };

    const getAudioMimeType = () => {
        const types = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/mp4;codecs=aac',
            'audio/mp4',
            'audio/aac',
        ];
        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) return type;
        }
        return '';
    };

    const startVideoRecording = async () => {
        try {
            // Clear any leftover timer
            if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current);
                recordingTimerRef.current = null;
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
            });
            videoStreamRef.current = stream;

            const videoMime = getVideoMimeType();
            const recorderOptions: MediaRecorderOptions = {};
            if (videoMime) recorderOptions.mimeType = videoMime;

            const mediaRecorder = new MediaRecorder(stream, recorderOptions);

            mediaRecorderRef.current = mediaRecorder;
            videoChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    videoChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const blobType = mediaRecorder.mimeType || 'video/webm';
                const videoBlob = new Blob(videoChunksRef.current, {
                    type: blobType,
                });
                stream.getTracks().forEach((track) => track.stop());
                videoStreamRef.current = null;

                wsClient.send({
                    type: 'messenger',
                    action: 'recording_video_circle',
                    status: 'stop',
                    target: {
                        id: selectedChat.id,
                        type: selectedChat.type,
                    },
                });

                await sendVideoMessage(videoBlob);
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);

            // На мобилке сразу лочим видео запись — overlay появляется мгновенно
            if (isMobile) {
                setIsLocked(true);
                setIsHolding(false);
            }

            wsClient.send({
                type: 'messenger',
                action: 'recording_video_circle',
                status: 'start',
                target: {
                    id: selectedChat.id,
                    type: selectedChat.type,
                },
            });

            recordingTimerRef.current = setInterval(() => {
                setRecordingTime((prev) => prev + 1);
            }, 1000);
        } catch (error) {
            console.error('Error starting video recording:', error);
            if (videoStreamRef.current) {
                videoStreamRef.current.getTracks().forEach((track) => track.stop());
                videoStreamRef.current = null;
            }
            mediaRecorderRef.current = null;
            setIsRecording(false);
            if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current);
                recordingTimerRef.current = null;
            }
            const msg =
                (error as any)?.name === 'NotAllowedError'
                    ? 'Доступ к камере запрещён. Разрешите доступ в настройках браузера'
                    : 'Не удалось получить доступ к камере';
            openModal({
                type: 'alert',
                props: { title: 'Ошибка', message: msg },
            });
        }
    };

    const cancelVideoRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            const stream = mediaRecorderRef.current.stream;
            mediaRecorderRef.current.ondataavailable = null;
            mediaRecorderRef.current.onstop = null;
            mediaRecorderRef.current.stop();
            stream.getTracks().forEach((track) => track.stop());
            videoStreamRef.current = null;

            wsClient.send({
                type: 'messenger',
                action: 'recording_video_circle',
                status: 'stop',
                target: {
                    id: selectedChat.id,
                    type: selectedChat.type,
                },
            });

            setIsRecording(false);
            setRecordingTime(0);
            setIsLocked(false);
            setSlideUpOffset(0);
            setIsHolding(false);
            videoChunksRef.current = [];

            if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current);
                recordingTimerRef.current = null;
            }
        }
    };

    const stopVideoRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);

            if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current);
                recordingTimerRef.current = null;
            }
        }
    };

    const sendVideoMessage = async (videoBlob: Blob) => {
        const temp_mid = createTempMesID(10);
        const blobMime = videoBlob.type || 'video/webm';
        const ext = blobMime.includes('mp4') ? 'mp4' : 'webm';
        const fileName = `video_message_${Date.now()}.${ext}`;

        const videoEl = document.createElement('video');
        videoEl.preload = 'auto';
        videoEl.muted = true;
        const videoUrl = URL.createObjectURL(videoBlob);
        const { duration, thumbnail } = await new Promise<{
            duration: number;
            thumbnail: string | null;
        }>((resolve) => {
            let resolved = false;
            const done = (val: { duration: number; thumbnail: string | null }) => {
                if (resolved) return;
                resolved = true;
                clearTimeout(timeout);
                URL.revokeObjectURL(videoUrl);
                videoEl.onloadeddata = null;
                videoEl.onseeked = null;
                videoEl.onerror = null;
                videoEl.src = '';
                videoEl.load();
                resolve(val);
            };
            const timeout = setTimeout(
                () => done({ duration: 0, thumbnail: null }),
                5000,
            );

            videoEl.onloadeddata = () => {
                videoEl.currentTime = 0.1;
            };
            videoEl.onseeked = () => {
                try {
                    const canvas = document.createElement('canvas');
                    const size = 150;
                    canvas.width = size;
                    canvas.height = size;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        const vw = videoEl.videoWidth;
                        const vh = videoEl.videoHeight;
                        const minDim = Math.min(vw, vh);
                        const sx = (vw - minDim) / 2;
                        const sy = (vh - minDim) / 2;
                        ctx.drawImage(
                            videoEl,
                            sx,
                            sy,
                            minDim,
                            minDim,
                            0,
                            0,
                            size,
                            size,
                        );
                        let thumb = canvas.toDataURL('image/webp', 0.3);
                        if (thumb.startsWith('data:image/png')) {
                            thumb = canvas.toDataURL('image/jpeg', 0.3);
                        }
                        done({ duration: videoEl.duration, thumbnail: thumb });
                    } else {
                        done({ duration: videoEl.duration, thumbnail: null });
                    }
                } catch {
                    done({ duration: videoEl.duration, thumbnail: null });
                }
            };
            videoEl.onerror = () => done({ duration: 0, thumbnail: null });
            videoEl.src = videoUrl;
        });

        wsClient.send({
            type: 'messenger',
            action: 'send_message',
            temp_mid: temp_mid,
            target: {
                id: selectedChat.id,
                type: selectedChat.type,
            },
            message: '',
            files: [
                {
                    name: fileName,
                    type: blobMime,
                    size: videoBlob.size,
                    duration: duration,
                    is_video_circle: true,
                    thumbnail: thumbnail || undefined,
                },
            ],
        });

        const newFile = {
            temp_mid: temp_mid,
            file: new File([videoBlob], fileName, { type: blobMime }),
        };

        setUploadFiles((prevFiles) => [...prevFiles, newFile]);

        db.files.put({ mid: String(temp_mid), name: fileName, blob: videoBlob });

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;

            const newMessage: any = {
                uid: accountData.id,
                temp_mid: temp_mid,
                status: 'not_sent',
                is_read: false,
                is_decrypted: true,
                is_uploaded: true,
                decrypted: {
                    text: '',
                    type: 'video',
                    file: {
                        name: fileName,
                        size: videoBlob.size,
                        duration: duration,
                        base64: base64,
                    },
                },
                date: new Date().toISOString(),
            };

            dispatch(
                addMessage({
                    chat_id: selectedChat.id,
                    chat_type: selectedChat.type,
                    message: newMessage,
                }),
            );
            onMessageSent?.();

            dispatch(
                updateChat({
                    chat_id: selectedChat.id,
                    chat_type: selectedChat.type,
                    newData: {
                        last_message: 'Видео сообщение',
                        last_message_date: new Date().toISOString(),
                    },
                }),
            );
        };

        reader.readAsDataURL(videoBlob);
    };

    const recordingStartedByDrag = useRef(false);
    const recordingStarting = useRef(false);

    const handleRecordButtonClick = () => {
        if (recordingStartedByDrag.current) {
            recordingStartedByDrag.current = false;
            return;
        }
        setRecordingMode((prev) => (prev === 'voice' ? 'video' : 'voice'));
    };

    const handleMicMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
        if ('touches' in e) e.preventDefault();
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        holdStartY.current = clientY;
        recordingStartedByDrag.current = false;
        recordingStarting.current = false;
        setIsHolding(true);
    };

    const handleMicMouseMove = (e: MouseEvent | TouchEvent) => {
        if (!isHolding) return;

        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const diff = holdStartY.current - clientY;

        if (!isRecording && !recordingStarting.current) {
            // Start recording only after dragging up 15px (once)
            if (diff > 15) {
                recordingStartedByDrag.current = true;
                recordingStarting.current = true;
                if (recordingMode === 'video') {
                    startVideoRecording();
                } else {
                    startRecording();
                }
            }
            return;
        }

        if (!isRecording) return;

        // Already recording — handle lock
        if (diff > 0) {
            setSlideUpOffset(Math.min(diff, 100));

            if (diff > 80 && !isLocked) {
                setIsLocked(true);
                setSlideUpOffset(0);
            }
        }
    };

    const handleMicMouseUp = () => {
        const wasStarting = recordingStarting.current;
        recordingStarting.current = false;
        setIsHolding(false);
        setSlideUpOffset(0);

        if (!isRecording) {
            // If recording was starting (async) but not yet started, wait until it's ready then cancel
            if (wasStarting) {
                const maxAttempts = 20;
                let attempts = 0;
                const checkAndCancel = () => {
                    if (mediaRecorderRef.current) {
                        if (recordingMode === 'video') {
                            cancelVideoRecording();
                        } else {
                            cancelRecording();
                        }
                    } else if (attempts < maxAttempts) {
                        attempts++;
                        setTimeout(checkAndCancel, 50);
                    }
                };
                setTimeout(checkAndCancel, 50);
            }
            return;
        }

        if (isLocked) {
            return;
        }

        if (recordingTime < 1) {
            if (recordingMode === 'video') {
                cancelVideoRecording();
            } else {
                cancelRecording();
            }
        } else {
            if (recordingMode === 'video') {
                stopVideoRecording();
            } else {
                stopRecording();
            }
        }
    };

    useEffect(() => {
        if (isHolding) {
            document.addEventListener('mousemove', handleMicMouseMove);
            document.addEventListener('mouseup', handleMicMouseUp);
            document.addEventListener('touchmove', handleMicMouseMove);
            document.addEventListener('touchend', handleMicMouseUp);

            return () => {
                document.removeEventListener('mousemove', handleMicMouseMove);
                document.removeEventListener('mouseup', handleMicMouseUp);
                document.removeEventListener('touchmove', handleMicMouseMove);
                document.removeEventListener('touchend', handleMicMouseUp);
            };
        }
    }, [isHolding, isRecording, isLocked, recordingTime, recordingMode]);

    const sendVoiceMessage = async (voiceBlob: Blob) => {
        const temp_mid = createTempMesID(10);
        const audioContext = new AudioContext();
        let duration = 0;
        let waveform: number[] = [];
        try {
            const arrayBuffer = await voiceBlob.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            duration = audioBuffer.duration;
            waveform = generateWaveform(audioBuffer);
        } finally {
            audioContext.close().catch(() => { });
        }

        const voiceMime = voiceBlob.type || 'audio/webm';
        const voiceExt =
            voiceMime.includes('mp4') || voiceMime.includes('aac')
                ? 'm4a'
                : 'webm';
        const fileName = `voice_message_${Date.now()}.${voiceExt}`;

        wsClient.send({
            type: 'messenger',
            action: 'send_message',
            temp_mid: temp_mid,
            target: {
                id: selectedChat.id,
                type: selectedChat.type,
            },
            message: '',
            files: [
                {
                    name: fileName,
                    type: voiceMime,
                    size: voiceBlob.size,
                    waveform: waveform,
                    duration: duration,
                },
            ],
        });

        const newFile = {
            temp_mid: temp_mid,
            file: new File([voiceBlob], fileName, { type: voiceMime }),
        };

        setUploadFiles((prevFiles) => [...prevFiles, newFile]);

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;

            const newMessage: any = {
                uid: accountData.id,
                temp_mid: temp_mid,
                status: 'not_sent',
                is_read: false,
                is_decrypted: true,
                is_uploaded: true,
                decrypted: {
                    text: '',
                    type: 'voice',
                    file: {
                        name: fileName,
                        size: voiceBlob.size,
                        duration: duration,
                        waveform: waveform,
                        base64: base64,
                    },
                },
                date: new Date().toISOString(),
            };

            dispatch(
                addMessage({
                    chat_id: selectedChat.id,
                    chat_type: selectedChat.type,
                    message: newMessage,
                }),
            );
            onMessageSent?.();

            dispatch(
                updateChat({
                    chat_id: selectedChat.id,
                    chat_type: selectedChat.type,
                    newData: {
                        last_message: 'Голосовое сообщение',
                        last_message_date: new Date().toISOString(),
                    },
                }),
            );
        };

        reader.readAsDataURL(voiceBlob);
    };

    const sendMessage = async () => {
        const currentMessageValue = messageValue;
        const currentFiles = files;
        if (currentFiles.length > 0 || currentMessageValue.trim() !== '') {
            if (files.length > 0) {
                const temp_mid = createTempMesID(10);

                wsClient.send({
                    type: 'messenger',
                    action: 'send_message',
                    temp_mid: temp_mid,
                    target: {
                        id: selectedChat.id,
                        type: selectedChat.type,
                    },
                    message: messageValue,
                    files: [
                        {
                            name: files[0].name,
                            type: files[0].type,
                            size: files[0].size,
                        },
                    ],
                });

                const newFile = {
                    temp_mid: temp_mid,
                    file: files[0],
                };

                setUploadFiles((prevFiles) => [...prevFiles, newFile]);

                // Создаем сообщение и добавляем его в чат
                const fileType = files[0].type.startsWith('image/')
                    ? 'image'
                    : 'file';
                let newMessage: any = {
                    uid: accountData.id,
                    temp_mid: temp_mid,
                    status: 'not_sent',
                    is_read: false,
                    is_decrypted: true,
                    is_uploaded: true,
                    decrypted: {
                        text: messageValue,
                        type: fileType,
                    },
                    date: new Date().toISOString(),
                };

                if (fileType === 'image') {
                    const base64 = await fileToB64(files[0]);
                    newMessage.decrypted.preview = { base64: base64 };
                    newMessage.decrypted.file = { base64: base64 };
                } else {
                    newMessage.decrypted.file = {
                        name: files[0].name,
                        type: files[0].type,
                        size: files[0].size,
                    };
                }

                dispatch(
                    addMessage({
                        chat_id: selectedChat.id,
                        chat_type: selectedChat.type,
                        message: newMessage,
                    }),
                );

                // Для остальных файлов отправляем отдельные сообщения без текста
                for (let i = 1; i < files.length; i++) {
                    const file_temp_mid = createTempMesID(10);

                    wsClient.send({
                        type: 'messenger',
                        action: 'send_message',
                        temp_mid: file_temp_mid,
                        target: {
                            id: selectedChat.id,
                            type: selectedChat.type,
                        },
                        message: '',
                        files: [
                            {
                                name: files[i].name,
                                type: files[i].type,
                                size: files[i].size,
                            },
                        ],
                    });

                    const fileNewFile = {
                        temp_mid: file_temp_mid,
                        file: files[i],
                    };

                    setUploadFiles((prevFiles) => [...prevFiles, fileNewFile]);

                    // Создаем сообщение и добавляем его в чат
                    const fileType = files[i].type.startsWith('image/')
                        ? 'image'
                        : 'file';
                    let fileMessage: any = {
                        uid: accountData.id,
                        temp_mid: file_temp_mid,
                        status: 'not_sent',
                        is_read: false,
                        is_decrypted: true,
                        is_uploaded: true,
                        decrypted: {
                            text: '',
                            type: fileType,
                        },
                        date: new Date().toISOString(),
                    };

                    if (fileType === 'image') {
                        const base64 = await fileToB64(files[i]);
                        fileMessage.decrypted.preview = { base64: base64 };
                        fileMessage.decrypted.file = { base64: base64 };
                    } else {
                        fileMessage.decrypted.file = {
                            name: files[i].name,
                            type: files[i].type,
                            size: files[i].size,
                        };
                    }

                    dispatch(
                        addMessage({
                            chat_id: selectedChat.id,
                            chat_type: selectedChat.type,
                            message: fileMessage,
                        }),
                    );
                }
            } else if (editingMessage) {
                const res = await wsClient.send({
                    type: 'messenger',
                    action: 'edit_message',
                    mid: editingMessage.mid,
                    target: {
                        id: selectedChat.id,
                        type: selectedChat.type,
                    },
                    message: messageValue,
                });

                if (res?.status !== 'ok') {
                    openModal({
                        type: 'alert',
                        props: {
                            title: 'Ошибка',
                            message:
                                res?.text ||
                                res?.message ||
                                'Не удалось отредактировать сообщение',
                        },
                    });
                    return;
                }

                const chatId = res?.target?.id ?? selectedChat.id;
                const chatType = res?.target?.type ?? selectedChat.type;

                dispatch(
                    updateMessage({
                        mid: editingMessage.mid,
                        chat_id: chatId,
                        chat_type: chatType,
                        newData: {
                            decrypted: res?.decrypted || {
                                ...editingMessage.decrypted,
                                text: messageValue,
                                is_edited: true,
                            },
                            is_decrypted: true,
                        },
                    }),
                );

                if (typeof res?.last_message === 'string') {
                    dispatch(
                        updateChat({
                            chat_id: chatId,
                            chat_type: chatType,
                            newData: {
                                last_message: res.last_message,
                                last_message_date: res?.last_message_date ?? null,
                            },
                        }),
                    );
                }

                cancelReplyOrEdit?.();
                setMessageValue('');
                return;
            } else {
                const temp_mid = createTempMesID(10);

                const replyData = replyTo
                    ? {
                        reply_to: {
                            mid: replyTo.mid,
                            author: replyTo.author,
                            text: replyTo.text,
                            type: replyTo.type || 'text',
                        },
                    }
                    : {};

                wsClient.send({
                    type: 'messenger',
                    action: 'send_message',
                    temp_mid: temp_mid,
                    target: {
                        id: selectedChat.id,
                        type: selectedChat.type,
                    },
                    message: messageValue,
                    ...replyData,
                });

                let newMessage: any = {
                    uid: accountData.id,
                    temp_mid: temp_mid,
                    status: 'not_sent',
                    is_read: false,
                    is_decrypted: true,
                    is_uploaded: true,
                    decrypted: {
                        text: messageValue,
                        type: 'text',
                        ...replyData,
                    },
                    date: new Date().toISOString(),
                };

                dispatch(
                    addMessage({
                        chat_id: selectedChat.id,
                        chat_type: selectedChat.type,
                        message: newMessage,
                    }),
                );
                if (replyTo) cancelReplyOrEdit?.();
            }
            setMessageValue('');
            setFiles([]);
            onMessageSent?.();
            fileURLs.current.forEach((url) => URL.revokeObjectURL(url));
            fileURLs.current.clear();

            if (!editingMessage) {
                dispatch(
                    updateChat({
                        chat_id: selectedChat.id,
                        chat_type: selectedChat.type,
                        newData: {
                            last_message:
                                currentMessageValue ||
                                (currentFiles.length > 0 ? currentFiles[0].name : ''),
                            last_message_date: new Date().toISOString(),
                        },
                    }),
                );
            }
        }
    };

    const handleSendMessage = (data) => {
        console.log('Статус сообщения:', data);
        switch (data.status) {
            case 'awaiting_file':
                const currentFile = uploadFiles.find(
                    (file) => file.temp_mid === data.temp_mid,
                );

                if (currentFile) {
                    const stop = sendFile({
                        temp_mid: Number(data.temp_mid),
                        file: currentFile.file,
                    });

                    dispatch(
                        updateMessage({
                            temp_mid: Number(data.temp_mid),
                            chat_id: selectedChat.id,
                            chat_type: selectedChat.type,
                            newData: {
                                upload_progress: 0,
                                stop: stop,
                            },
                        }),
                    );
                }
                break;

            case 'sended':
                dispatch(
                    updateMessage({
                        temp_mid: Number(data.temp_mid),
                        chat_id: selectedChat.id,
                        chat_type: selectedChat.type,
                        newData: {
                            mid: data.mid,
                            status: 'sended',
                        },
                    }),
                );
                break;

            case 'error':
                openModal({
                    type: 'alert',
                    props: {
                        title: 'Ошибка',
                        message: data.text,
                    },
                });
                break;
        }
    };

    useMessengerEvent('send_message', handleSendMessage);

    const handleUploadFile = async (data) => {
        if (data.status === 'sended') {
            // Move db.files entry from temp_mid to real mid (for video circles saved during send)
            const tempKey = String(data.temp_mid);
            const tempFile = await db.files.where('mid').equals(tempKey).first();
            if (tempFile) {
                await db.files.delete(tempKey);
                await db.files.put({ ...tempFile, mid: String(data.mid) });
            }

            dispatch(
                updateMessage({
                    temp_mid: Number(data.temp_mid),
                    chat_id: selectedChat.id,
                    chat_type: selectedChat.type,
                    newData: {
                        mid: data.mid,
                        status: 'sended',
                    },
                }),
            );
        }
    };

    useMessengerEvent('upload_file', handleUploadFile);

    useEffect(() => {
        if (isRecording && recordingMode === 'video' && recordingTime >= 60) {
            stopVideoRecording();
        }
    }, [recordingTime, isRecording, recordingMode]);

    // Connect video stream to preview element once portal renders
    useEffect(() => {
        if (isRecording && recordingMode === 'video' && videoStreamRef.current) {
            let rafId: number;
            let attempts = 0;
            const tryAttach = () => {
                const el = videoPreviewRef.current;
                if (el && el.srcObject !== videoStreamRef.current) {
                    el.srcObject = videoStreamRef.current;
                    el.play().catch(() => { });
                } else if (!el && attempts < 20) {
                    attempts++;
                    rafId = requestAnimationFrame(tryAttach);
                }
            };
            rafId = requestAnimationFrame(tryAttach);
            return () => cancelAnimationFrame(rafId);
        }
    }, [isRecording, recordingMode, isLocked]);

    useEffect(() => {
        return () => {
            fileURLs.current.forEach((url) => {
                URL.revokeObjectURL(url);
            });
            if (
                mediaRecorderRef.current &&
                mediaRecorderRef.current.state !== 'inactive'
            ) {
                mediaRecorderRef.current.stop();
            }
            if (videoStreamRef.current) {
                videoStreamRef.current.getTracks().forEach((track) => track.stop());
                videoStreamRef.current = null;
            }
            if (audioContextRef.current) {
                audioContextRef.current.close().catch(() => { });
                audioContextRef.current = null;
            }
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
            if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current);
                recordingTimerRef.current = null;
            }
            if (activeFileReaderRef.current) {
                activeFileReaderRef.current.abort();
                activeFileReaderRef.current = null;
            }
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = null;
            }
        };
    }, []);

    const fileToB64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                resolve(reader.result);
            };
            reader.onerror = reject;

            if (file) {
                reader.readAsDataURL(file);
            }
        });
    };

    const getReplyPreviewIcon = () => {
        if (editingMessage) return <I_EDIT />;
        if (replyTo?.type === 'voice') return <I_MICROPHONE />;
        if (replyTo?.type === 'video') return <I_VIDEO />;
        return <I_REPLY />;
    };

    return (
        <div className="Chat-BottomBar">
            {files.length > 0 && (
                <div className="Chat-SelectedFiles">
                    {files.map((file, i) => {
                        const isImage = file.type.startsWith('image/');
                        let filePreview;

                        if (isImage) {
                            if (!fileURLs.current.has(i)) {
                                const newURL = URL.createObjectURL(file);
                                fileURLs.current.set(i, newURL);
                                filePreview = newURL;
                            } else {
                                filePreview = fileURLs.current.get(i);
                            }
                        }

                        return (
                            <div
                                key={i}
                                className={`File ${isImage ? 'ImageFile' : ''}`}
                                ref={(el) => {
                                    if (el) fileRefs.current.set(i, el);
                                    else fileRefs.current.delete(i);
                                }}
                            >
                                {isImage ? (
                                    <img
                                        src={filePreview}
                                        alt={file.name}
                                        className="ImagePreview"
                                    />
                                ) : (
                                    <HandleFileIcon fileName={file.name} />
                                )}
                                <div className="Metadata">
                                    <div className="Name">{file.name}</div>
                                    <div className="Size">
                                        <HandleFileSize bytes={file.size} />
                                    </div>
                                </div>
                                <button
                                    className="RemoveFile"
                                    onClick={() => handleRemoveFile(i)}
                                    aria-label="Удалить файл"
                                >
                                    <I_CLOSE />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
            <input
                type="file"
                id="M-FileInput"
                ref={fileInputRef}
                multiple
                style={{ display: 'none' }}
                onChange={handleFileInputChange}
            />

            <AnimatePresence>
                {(replyTo || editingMessage) && (
                    <motion.div
                        className="Chat-ReplyPreview"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                    >
                        <div className="Chat-ReplyPreview-Icon">
                            {getReplyPreviewIcon()}
                        </div>
                        <div className="Chat-ReplyPreview-Content">
                            <div className="Chat-ReplyPreview-Line" />
                            <div className="Chat-ReplyPreview-Info">
                                <div className="Chat-ReplyPreview-Title">
                                    {editingMessage
                                        ? t('editing_message')
                                        : replyTo?.author}
                                </div>
                                <div className="Chat-ReplyPreview-Text">
                                    {editingMessage
                                        ? editingMessage.decrypted?.text
                                        : replyTo?.text}
                                </div>
                            </div>
                        </div>
                        <button
                            className="Chat-ReplyPreview-Close"
                            onClick={cancelReplyOrEdit}
                        >
                            <I_CLOSE />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
            <DragDropArea
                className="Input"
                onFilesDrop={handleFilesDrop}
                data-text={t('drop_files_here')}
            >
                {!isRecording ? (
                    <>
                        <Bubble>
                            <button
                                onClick={() => setActionPanelOpen(!actionPanelOpen)}
                            >
                                <I_PLUS style={{}} />
                            </button>
                        </Bubble>

                        <Bubble style={{ flex: 1 }}>
                            <SocialInput
                                placeholder={t('chat_message_input')}
                                onChange={(e) => {
                                    setMessageValue(e.target.value);
                                    if (
                                        e.target.value.trim() !== '' &&
                                        !typingTimeoutRef.current
                                    ) {
                                        wsClient.send({
                                            type: 'messenger',
                                            action: 'typing',
                                            target: {
                                                id: selectedChat.id,
                                                type: selectedChat.type,
                                            },
                                        });
                                        typingTimeoutRef.current = setTimeout(() => {
                                            typingTimeoutRef.current = null;
                                        }, 2000);
                                    }
                                }}
                                value={messageValue}
                                ref={messageInputRef}
                                onEnter={sendMessage}
                            />
                        </Bubble>
                        <Bubble>
                            <button
                                onClick={() => {
                                    openChatMenu('emoji');
                                }}
                                className="EmojiButton"
                            >
                                <I_SMILE />
                            </button>
                        </Bubble>
                        <Bubble>
                            {messageValue.trim() !== '' || files.length > 0 ? (
                                <button onClick={sendMessage} className="Send">
                                    <I_SEND />
                                </button>
                            ) : (
                                <motion.button
                                    ref={micButtonRef}
                                    onClick={handleRecordButtonClick}
                                    onMouseDown={handleMicMouseDown}
                                    onTouchStart={handleMicMouseDown}
                                    className={`Send ${recordingMode === 'video' ? 'Microphone--video' : ''}`}
                                    animate={
                                        isRecording && !isLocked
                                            ? {
                                                scale: [1, 1.1, 1],
                                            }
                                            : {}
                                    }
                                    transition={{ duration: 1, repeat: Infinity }}
                                >
                                    {recordingMode === 'voice' ? (
                                        <I_MICROPHONE />
                                    ) : (
                                        <I_VIDEO />
                                    )}
                                </motion.button>
                            )}
                        </Bubble>
                    </>
                ) : (
                    <>
                        <motion.div
                            className="RecordingPanelLocked"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <div className="RecordingTimeBlock">
                                <motion.div
                                    className="RecordingDot"
                                    animate={{
                                        scale: [1, 1.3, 1],
                                        opacity: [1, 0.7, 1],
                                    }}
                                    transition={{ duration: 1, repeat: Infinity }}
                                />
                                <span className="Time">
                                    {Math.floor(recordingTime / 60)}:
                                    {(recordingTime % 60 < 10 ? '0' : '') +
                                        (recordingTime % 60)}
                                </span>
                            </div>

                            <button
                                onClick={
                                    recordingMode === 'video'
                                        ? cancelVideoRecording
                                        : cancelRecording
                                }
                                className="CancelButton"
                            >
                                Отмена
                            </button>

                            <motion.button
                                onClick={
                                    recordingMode === 'video'
                                        ? stopVideoRecording
                                        : stopRecording
                                }
                                className="SendVoiceButton"
                                animate={{
                                    scale:
                                        recordingMode === 'video'
                                            ? 1
                                            : 1 + audioLevel * 0.3,
                                }}
                                transition={{ duration: 0.05, ease: 'easeOut' }}
                                whileTap={{ scale: 0.9 }}
                            >
                                <I_SEND />
                            </motion.button>
                        </motion.div>

                        <AnimatePresence>
                            {!isLocked && slideUpOffset > 20 && (
                                <motion.div
                                    className="LockIndicator"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{
                                        opacity: Math.min(slideUpOffset / 80, 1),
                                        y: -slideUpOffset,
                                    }}
                                    exit={{ opacity: 0, y: 20 }}
                                >
                                    <motion.div
                                        className="LockIcon"
                                        animate={{
                                            scale: slideUpOffset > 70 ? [1, 1.2, 1] : 1,
                                        }}
                                        transition={{
                                            duration: 0.3,
                                            repeat: slideUpOffset > 70 ? Infinity : 0,
                                        }}
                                    >
                                        <I_LOCK />
                                    </motion.div>
                                    <I_ARROW_UP />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </>
                )}
            </DragDropArea>

            {isRecording &&
                recordingMode === 'video' &&
                isLocked &&
                createPortal(
                    <motion.div
                        className="VideoCircleOverlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                        onTouchEnd={(e) => e.stopPropagation()}
                    >
                        <div className="VideoCirclePreview">
                            <video ref={videoPreviewRef} muted playsInline />
                            <svg className="VideoCircleProgress" viewBox="0 0 100 100">
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="47"
                                    fill="none"
                                    stroke="rgba(255,255,255,0.15)"
                                    strokeWidth="3"
                                />
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="47"
                                    fill="none"
                                    stroke="#fff"
                                    strokeWidth="3"
                                    strokeDasharray={`${2 * Math.PI * 47}`}
                                    strokeDashoffset={`${2 * Math.PI * 47 * (1 - Math.min(recordingTime / 60, 1))}`}
                                    strokeLinecap="round"
                                    transform="rotate(-90 50 50)"
                                />
                            </svg>
                            <div className="VideoCircleTime">
                                {Math.floor(recordingTime / 60)}:
                                {(recordingTime % 60 < 10 ? '0' : '') +
                                    (recordingTime % 60)}
                            </div>
                        </div>
                        <div className="VideoCircleControls">
                            <div className="RecordingTimeBlock">
                                <motion.div
                                    className="RecordingDot"
                                    animate={{
                                        scale: [1, 1.3, 1],
                                        opacity: [1, 0.7, 1],
                                    }}
                                    transition={{ duration: 1, repeat: Infinity }}
                                />
                                <span className="Time">
                                    {Math.floor(recordingTime / 60)}:
                                    {(recordingTime % 60 < 10 ? '0' : '') +
                                        (recordingTime % 60)}
                                </span>
                            </div>
                            <button
                                onClick={cancelVideoRecording}
                                className="CancelButton"
                            >
                                Отмена
                            </button>
                            <motion.button
                                onClick={stopVideoRecording}
                                className="SendVoiceButton"
                                whileTap={{ scale: 0.9 }}
                            >
                                <I_SEND />
                            </motion.button>
                        </div>
                    </motion.div>,
                    document.body,
                )}
        </div>
    );
};

export default BottomBar;
