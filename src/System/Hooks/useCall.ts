import { useRef, useState, useCallback, useEffect } from 'react';
import { useWebSocket, useMessengerEvent } from '../Context/WebSocket';
import { playCallRingtone, stopCallRingtone, playDialTone, stopDialTone, playUnavailableSound } from '../../Services/callSounds';

const FALLBACK_ICE: RTCConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun.cloudflare.com:3478' },
    ],
};

const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
};

const CAMERA_CONSTRAINTS: MediaTrackConstraints = {
    width: { ideal: 960, max: 1280 },
    height: { ideal: 540, max: 720 },
    frameRate: { ideal: 18, max: 24 },
    facingMode: 'user',
};

const SCREEN_SHARE_CONSTRAINTS: MediaTrackConstraints = {
    width: { max: 1920 },
    height: { max: 1080 },
    frameRate: { ideal: 10, max: 15 },
};

const tagCameraTrack = (track: MediaStreamTrack | null) => {
    if (!track) return;
    try {
        (track as any).contentHint = 'motion';
    } catch {}
};

const tagScreenTrack = (track: MediaStreamTrack | null) => {
    if (!track) return;
    try {
        (track as any).contentHint = 'detail';
    } catch {}
};

type VideoDirection = 'sendrecv' | 'sendonly' | 'recvonly' | 'inactive';

const getVideoDirectionFromSdp = (sdp?: string): VideoDirection | null => {
    if (!sdp) return null;
    const lines = sdp.split(/\r?\n/);
    let inVideoSection = false;

    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (line.startsWith('m=')) {
            inVideoSection = line.startsWith('m=video ');
            continue;
        }
        if (!inVideoSection) continue;
        if (line === 'a=sendrecv') return 'sendrecv';
        if (line === 'a=sendonly') return 'sendonly';
        if (line === 'a=recvonly') return 'recvonly';
        if (line === 'a=inactive') return 'inactive';
    }

    return inVideoSection ? 'sendrecv' : null;
};

const remoteSendsVideoFromSdp = (sdp?: string): boolean | null => {
    const direction = getVideoDirectionFromSdp(sdp);
    if (!direction) return null;
    return direction === 'sendrecv' || direction === 'sendonly';
};

export type CallType = 'audio' | 'video';
export type CallState = 'idle' | 'calling' | 'incoming' | 'connected' | 'ended';
export type ConnectionQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';

export interface CallParty {
    id: number;
    name: string;
    avatar?: string;
}

async function getMediaWithFallback(wantVideo: boolean): Promise<{ stream: MediaStream; hasVideo: boolean }> {
    if (!wantVideo) {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: AUDIO_CONSTRAINTS
        });
        return { stream, hasVideo: false };
    }
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: AUDIO_CONSTRAINTS,
            video: CAMERA_CONSTRAINTS
        });
        tagCameraTrack(stream.getVideoTracks()[0] ?? null);
        return { stream, hasVideo: true };
    } catch {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: AUDIO_CONSTRAINTS
        });
        return { stream, hasVideo: false };
    }
}

function findVideoSender(pc: RTCPeerConnection): RTCRtpSender | undefined {
    const withTrack = pc.getSenders().find(s => s.track?.kind === 'video');
    if (withTrack) return withTrack;
    const videoTransceiver = pc.getTransceivers().find(t => t.receiver?.track?.kind === 'video');
    return videoTransceiver?.sender;
}

async function getConnectionQuality(pc: RTCPeerConnection): Promise<ConnectionQuality> {
    try {
        const stats = await pc.getStats();
        let packetLoss = 0;
        let roundTripTime = 0;
        let totalRtpReceived = 0;

        stats.forEach((report) => {
            if (report.type === 'inbound-rtp' && report.kind === 'audio') {
                const packetsLost = (report as any).packetsLost || 0;
                const packetsReceived = (report as any).packetsReceived || 1;
                if (packetsReceived > 0) {
                    packetLoss = Math.max(packetLoss, packetsLost / (packetsLost + packetsReceived));
                }
                totalRtpReceived++;
            }
            if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                roundTripTime = Math.max(roundTripTime, (report as any).currentRoundTripTime || 0);
            }
        });

        const rttMs = roundTripTime * 1000;
        if (packetLoss < 0.01 && rttMs < 50) return 'excellent';
        if (packetLoss < 0.03 && rttMs < 100) return 'good';
        if (packetLoss < 0.08 && rttMs < 200) return 'fair';
        return 'poor';
    } catch {
        return 'unknown';
    }
}

export const useCall = () => {
    const { wsClient } = useWebSocket();
    const [callState, setCallState] = useState<CallState>('idle');
    const [callType, setCallType] = useState<CallType>('audio');
    const [remoteParty, setRemoteParty] = useState<CallParty | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [duration, setDuration] = useState(0);
    const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>('unknown');

    const peerRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const screenStreamRef = useRef<MediaStream | null>(null);
    const cameraTrackRef = useRef<MediaStreamTrack | null>(null);
    const remoteStreamRef = useRef<MediaStream | null>(null);
    const localVideoRef = useRef<HTMLVideoElement | null>(null);
    const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
    const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
    const iceCandidateBufferRef = useRef<RTCIceCandidateInit[]>([]);
    const callEndedRef = useRef(false);
    const targetIdRef = useRef<number>(0);
    const callTypeRef = useRef<CallType>('audio');
    const callStartTimeRef = useRef<number>(0);
    const callWasConnectedRef = useRef(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const callTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hadVideoBeforeScreenShareRef = useRef(false);
    const pendingOfferRef = useRef<{ offer: RTCSessionDescriptionInit; call_type: string } | null>(null);
    const togglingVideoRef = useRef(false);
    const togglingScreenRef = useRef(false);
    const incomingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const noiseGateCtxRef = useRef<AudioContext | null>(null);
    const noiseGateGainRef = useRef<GainNode | null>(null);
    const noiseGateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const noiseGateTrackRef = useRef<MediaStreamTrack | null>(null);
    const [noiseSuppression, setNoiseSuppression] = useState(false);

    const cleanup = useCallback(() => {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null; }
        if (closeTimeoutRef.current) { clearTimeout(closeTimeoutRef.current); closeTimeoutRef.current = null; }
        if (incomingTimeoutRef.current) { clearTimeout(incomingTimeoutRef.current); incomingTimeoutRef.current = null; }
        if (reconnectTimeoutRef.current) { clearTimeout(reconnectTimeoutRef.current); reconnectTimeoutRef.current = null; }
        stopCallRingtone();
        stopDialTone();
        if (cameraTrackRef.current) {
            cameraTrackRef.current.stop();
            cameraTrackRef.current = null;
        }
        localStreamRef.current?.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
        screenStreamRef.current?.getTracks().forEach(t => t.stop());
        screenStreamRef.current = null;
        if (peerRef.current) {
            peerRef.current.onconnectionstatechange = null;
            peerRef.current.onicecandidate = null;
            peerRef.current.ontrack = null;
            peerRef.current.close();
            peerRef.current = null;
        }
        iceCandidateBufferRef.current = [];
        remoteStreamRef.current = null;
        pendingOfferRef.current = null;
        if (noiseGateIntervalRef.current) { clearInterval(noiseGateIntervalRef.current); noiseGateIntervalRef.current = null; }
        if (noiseGateTrackRef.current) { noiseGateTrackRef.current.stop(); noiseGateTrackRef.current = null; }
        if (noiseGateCtxRef.current) { noiseGateCtxRef.current.close().catch(() => {}); noiseGateCtxRef.current = null; }
        noiseGateGainRef.current = null;
        setDuration(0);
        setIsMuted(false);
        setIsVideoOff(false);
        setIsScreenSharing(false);
        setHasRemoteVideo(false);
        setIsMinimized(false);
        setNoiseSuppression(false);
    }, []);

    useEffect(() => {
        callTypeRef.current = callType;
    }, [callType]);

    const scheduleClose = useCallback((delay = 1500) => {
        if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = setTimeout(() => {
            closeTimeoutRef.current = null;
            setCallState('idle');
            setRemoteParty(null);
        }, delay);
    }, []);

    const setLocalVideoTrack = useCallback((track: MediaStreamTrack | null) => {
        const stream = localStreamRef.current;
        if (!stream) return;
        const currentVideoTracks = stream.getVideoTracks();
        for (const currentTrack of currentVideoTracks) {
            if (currentTrack === track) continue;
            stream.removeTrack(currentTrack);
        }
        if (track && !stream.getVideoTracks().includes(track)) {
            stream.addTrack(track);
        }
    }, []);

    const replaceOutgoingVideoTrack = useCallback(async (track: MediaStreamTrack | null) => {
        const pc = peerRef.current;
        if (!pc) return;

        const sender = findVideoSender(pc);
        let needRenegotiate = false;

        if (sender) {
            await sender.replaceTrack(track);
            const transceiver = pc.getTransceivers().find(t => t.sender === sender);
            if (transceiver) {
                const desiredDirection: RTCRtpTransceiverDirection = track ? 'sendrecv' : 'recvonly';
                if (transceiver.direction !== desiredDirection) {
                    transceiver.direction = desiredDirection;
                    needRenegotiate = true;
                }
            }
        } else if (track && localStreamRef.current) {
            pc.addTrack(track, localStreamRef.current);
            needRenegotiate = true;
        }

        if (needRenegotiate) {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            wsClient.send({
                type: 'messenger',
                action: 'call_renegotiate',
                target: { id: targetIdRef.current },
                offer: { type: pc.localDescription!.type, sdp: pc.localDescription!.sdp }
            });
        }
    }, [wsClient]);

    const endCallSafe = useCallback(() => {
        if (callEndedRef.current) return;
        callEndedRef.current = true;
        const duration = callWasConnectedRef.current
            ? Math.floor((Date.now() - callStartTimeRef.current) / 1000)
            : 0;
        const tid = targetIdRef.current;
        const wasConnected = callWasConnectedRef.current;
        callWasConnectedRef.current = false;
        wsClient.send({ type: 'messenger', action: 'call_end', target: { id: tid } });
        // Сообщение о звонке в чат
        wsClient.send({
            type: 'messenger',
            action: 'send_call_message',
            target: { id: tid, type: 0 },
            call_type: callTypeRef.current,
            duration,
            missed: !wasConnected,
        });
        stopCallRingtone();
        stopDialTone();
        cleanup();
        setCallState('ended');
        scheduleClose();
    }, [wsClient, cleanup, scheduleClose]);

    const setupPeerHandlers = useCallback((pc: RTCPeerConnection) => {
        pc.onicecandidate = (e) => {
            if (e.candidate) {
                wsClient.send({
                    type: 'messenger',
                    action: 'call_ice_candidate',
                    target: { id: targetIdRef.current },
                    candidate: {
                        candidate: e.candidate.candidate,
                        sdpMid: e.candidate.sdpMid,
                        sdpMLineIndex: e.candidate.sdpMLineIndex,
                        usernameFragment: e.candidate.usernameFragment
                    }
                });
            }
        };

        pc.ontrack = (e) => {
            let stream: MediaStream;
            if (remoteStreamRef.current) {
                if (!remoteStreamRef.current.getTracks().includes(e.track)) {
                    remoteStreamRef.current.addTrack(e.track);
                }
                stream = remoteStreamRef.current;
            } else if (e.streams[0]) {
                stream = e.streams[0];
            } else {
                stream = new MediaStream([e.track]);
            }
            remoteStreamRef.current = stream;

            const checkVideo = () => {
                const videoTracks = stream.getVideoTracks();
                const hasVideo = videoTracks.length > 0 && videoTracks.some(
                    t => t.readyState === 'live' && t.enabled && !t.muted
                );
                setHasRemoteVideo(hasVideo);
            };

            const attachTrackListeners = (track: MediaStreamTrack) => {
                if (track.kind !== 'video') return;
                track.onunmute = checkVideo;
                track.onmute = checkVideo;
                track.onended = checkVideo;
            };

            stream.getVideoTracks().forEach(attachTrackListeners);
            checkVideo();

            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = stream;
            }
            if (remoteAudioRef.current) {
                remoteAudioRef.current.srcObject = stream;
                remoteAudioRef.current.play().catch(() => {});
            }

            stream.onaddtrack = (ev) => { attachTrackListeners(ev.track); checkVideo(); };
            stream.onremovetrack = checkVideo;
            setTimeout(checkVideo, 500);
            setTimeout(checkVideo, 1500);
        };

        pc.onconnectionstatechange = () => {
            if (callEndedRef.current) return;
            const state = pc.connectionState;

            if (state === 'connected') {
                if (reconnectTimeoutRef.current) {
                    clearTimeout(reconnectTimeoutRef.current);
                    reconnectTimeoutRef.current = null;
                }
            } else if (state === 'disconnected') {
                if (!reconnectTimeoutRef.current) {
                    reconnectTimeoutRef.current = setTimeout(async () => {
                        reconnectTimeoutRef.current = null;
                        if (callEndedRef.current || !peerRef.current) return;
                        if (peerRef.current.connectionState !== 'connected') {
                            try {
                                const offer = await peerRef.current.createOffer({ iceRestart: true });
                                await peerRef.current.setLocalDescription(offer);
                                wsClient.send({
                                    type: 'messenger', action: 'call_renegotiate',
                                    target: { id: targetIdRef.current },
                                    offer: { type: peerRef.current.localDescription!.type, sdp: peerRef.current.localDescription!.sdp }
                                });
                            } catch {
                                endCallSafe();
                            }
                        }
                    }, 5000);
                }
            } else if (state === 'failed') {
                (async () => {
                    try {
                        const offer = await pc.createOffer({ iceRestart: true });
                        await pc.setLocalDescription(offer);
                        wsClient.send({
                            type: 'messenger', action: 'call_renegotiate',
                            target: { id: targetIdRef.current },
                            offer: { type: pc.localDescription!.type, sdp: pc.localDescription!.sdp }
                        });
                        reconnectTimeoutRef.current = setTimeout(() => {
                            reconnectTimeoutRef.current = null;
                            if (!callEndedRef.current && peerRef.current?.connectionState !== 'connected') {
                                endCallSafe();
                            }
                        }, 10000);
                    } catch {
                        endCallSafe();
                    }
                })();
            }
        };
    }, [wsClient, endCallSafe]);

    const startCall = useCallback(async (target: CallParty, type: CallType = 'audio') => {
        if (callState !== 'idle') return;
        targetIdRef.current = target.id;
        callEndedRef.current = false;
        callWasConnectedRef.current = false;
        setRemoteParty(target);
        setCallType(type);
        setCallState('calling');

        try {
            const { stream, hasVideo } = await getMediaWithFallback(type === 'video');
            const effectiveType = (type === 'video' && !hasVideo) ? 'audio' : type;
            if (effectiveType !== type) setCallType('audio');

            if (callEndedRef.current) { stream.getTracks().forEach(t => t.stop()); return; }

            localStreamRef.current = stream;
            cameraTrackRef.current = stream.getVideoTracks()[0] ?? null;
            setIsVideoOff(effectiveType === 'audio');
            if (localVideoRef.current && effectiveType === 'video') {
                localVideoRef.current.srcObject = stream;
            }

            const pc = new RTCPeerConnection(FALLBACK_ICE);
            peerRef.current = pc;
            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            if (effectiveType === 'video' && stream.getVideoTracks().length === 0) {
                pc.addTransceiver('video', { direction: 'recvonly' });
            }

            setupPeerHandlers(pc);

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            const res = await wsClient.send({
                type: 'messenger',
                action: 'call_initiate',
                target: { id: target.id },
                offer: { type: pc.localDescription!.type, sdp: pc.localDescription!.sdp },
                call_type: effectiveType
            });

            if (!res || res.unavailable) {
                if (callEndedRef.current) return;
                callEndedRef.current = true;
                cleanup();
                await playUnavailableSound();
                setCallState('ended');
                scheduleClose(0);
                return;
            }

            playDialTone();

            callTimeoutRef.current = setTimeout(async () => {
                if (callEndedRef.current) return;
                callEndedRef.current = true;
                wsClient.send({ type: 'messenger', action: 'call_end', target: { id: target.id } });
                wsClient.send({
                    type: 'messenger',
                    action: 'send_call_message',
                    target: { id: target.id, type: 0 },
                    call_type: effectiveType,
                    duration: 0,
                    missed: true,
                });
                callWasConnectedRef.current = false;
                cleanup();
                await playUnavailableSound();
                setCallState('ended');
                scheduleClose(0);
            }, 30000);

        } catch (err: any) {
            if (err?.name === 'NotAllowedError' || err?.name === 'NotFoundError') {
                alert('Разрешите доступ к микрофону в настройках браузера');
            }
            cleanup();
            setCallState('idle');
            setRemoteParty(null);
        }
    }, [callState, wsClient, cleanup, scheduleClose, setupPeerHandlers]);

    const acceptCall = useCallback(async (incomingOffer: RTCSessionDescriptionInit, incomingType: CallType) => {
        callEndedRef.current = false;
        stopCallRingtone();

        try {
            const { stream, hasVideo } = await getMediaWithFallback(incomingType === 'video');
            const effectiveType = (incomingType === 'video' && !hasVideo) ? 'audio' : incomingType;

            if (callEndedRef.current) { stream.getTracks().forEach(t => t.stop()); return; }

            localStreamRef.current = stream;
            cameraTrackRef.current = stream.getVideoTracks()[0] ?? null;
            setIsVideoOff(effectiveType === 'audio');
            if (localVideoRef.current && effectiveType === 'video') {
                localVideoRef.current.srcObject = stream;
            }

            const pc = new RTCPeerConnection(FALLBACK_ICE);
            peerRef.current = pc;

            setupPeerHandlers(pc);

            await pc.setRemoteDescription(incomingOffer as RTCSessionDescriptionInit);
            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            for (const candidate of iceCandidateBufferRef.current) {
                pc.addIceCandidate(candidate as RTCIceCandidateInit).catch(console.error);
            }
            iceCandidateBufferRef.current = [];

            if (callEndedRef.current) {
                pc.close(); peerRef.current = null;
                stream.getTracks().forEach(t => t.stop()); localStreamRef.current = null;
                return;
            }

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            wsClient.send({
                type: 'messenger',
                action: 'call_accept',
                target: { id: targetIdRef.current },
                answer: { type: pc.localDescription!.type, sdp: pc.localDescription!.sdp }
            });

            setCallType(effectiveType);
            setCallState('connected');
            callStartTimeRef.current = Date.now();
            callWasConnectedRef.current = true;
            timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);

        } catch (err: any) {
            console.error('[Call] acceptCall error:', err);
            if (err?.name === 'NotAllowedError' || err?.name === 'NotFoundError') {
                alert('Разрешите доступ к микрофону в настройках браузера');
            }
            if (!callEndedRef.current) { cleanup(); setCallState('idle'); setRemoteParty(null); }
        }
    }, [wsClient, cleanup, setupPeerHandlers]);

    const declineCall = useCallback(() => {
        if (incomingTimeoutRef.current) { clearTimeout(incomingTimeoutRef.current); incomingTimeoutRef.current = null; }
        wsClient.send({ type: 'messenger', action: 'call_decline', target: { id: targetIdRef.current } });
        callEndedRef.current = true;
        stopCallRingtone();
        cleanup();
        setCallState('ended');
        scheduleClose();
    }, [wsClient, cleanup, scheduleClose]);

    const toggleMute = useCallback(() => {
        const newMuted = !isMuted;
        localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !newMuted; });
        if (noiseGateTrackRef.current) {
            noiseGateTrackRef.current.enabled = !newMuted;
        }
        setIsMuted(newMuted);
    }, [isMuted]);

    const toggleVideo = useCallback(async () => {
        if (!peerRef.current || togglingVideoRef.current) return;
        togglingVideoRef.current = true;

        try {
            if (!isVideoOff) {
                if (isScreenSharing) {
                    hadVideoBeforeScreenShareRef.current = false;
                    screenStreamRef.current?.getTracks().forEach(t => t.stop());
                    screenStreamRef.current = null;
                    setIsScreenSharing(false);
                }

                await replaceOutgoingVideoTrack(null);
                setLocalVideoTrack(null);
                if (cameraTrackRef.current) {
                    cameraTrackRef.current.stop();
                    cameraTrackRef.current = null;
                }
                setIsVideoOff(true);
                setCallType('audio');
                return;
            }

            let cameraTrack = cameraTrackRef.current;
            if (!cameraTrack || cameraTrack.readyState !== 'live') {
                const camStream = await navigator.mediaDevices.getUserMedia({ video: CAMERA_CONSTRAINTS });
                cameraTrack = camStream.getVideoTracks()[0] ?? null;
                camStream.getAudioTracks().forEach(t => t.stop());
                cameraTrackRef.current = cameraTrack;
            }

            if (!cameraTrack) return;
            tagCameraTrack(cameraTrack);
            setLocalVideoTrack(cameraTrack);
            await replaceOutgoingVideoTrack(cameraTrack);
            setIsVideoOff(false);
            setCallType('video');
        } catch (err) {
            console.error('toggleVideo error:', err);
        } finally {
            togglingVideoRef.current = false;
        }
    }, [isVideoOff, isScreenSharing, setLocalVideoTrack, replaceOutgoingVideoTrack]);

    const toggleScreenShare = useCallback(async () => {
        if (!peerRef.current || togglingScreenRef.current) return;
        togglingScreenRef.current = true;

        try {
            if (isScreenSharing) {
                screenStreamRef.current?.getTracks().forEach(t => t.stop());
                screenStreamRef.current = null;
                setIsScreenSharing(false);

                if (hadVideoBeforeScreenShareRef.current) {
                    try {
                        let cameraTrack = cameraTrackRef.current;
                        if (!cameraTrack || cameraTrack.readyState !== 'live') {
                            const camStream = await navigator.mediaDevices.getUserMedia({ video: CAMERA_CONSTRAINTS });
                            cameraTrack = camStream.getVideoTracks()[0] ?? null;
                            camStream.getAudioTracks().forEach(t => t.stop());
                            cameraTrackRef.current = cameraTrack;
                        }
                        if (cameraTrack) {
                            tagCameraTrack(cameraTrack);
                            setLocalVideoTrack(cameraTrack);
                            await replaceOutgoingVideoTrack(cameraTrack);
                            setIsVideoOff(false);
                            setCallType('video');
                            return;
                        }
                    } catch {}
                }

                await replaceOutgoingVideoTrack(null);
                setLocalVideoTrack(null);
                setIsVideoOff(true);
                setCallType('audio');
                return;
            }

            hadVideoBeforeScreenShareRef.current = callType === 'video' && !isVideoOff;
            const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: SCREEN_SHARE_CONSTRAINTS, audio: false });
            screenStreamRef.current = screenStream;
            const screenTrack = screenStream.getVideoTracks()[0] ?? null;
            if (!screenTrack) return;
            tagScreenTrack(screenTrack);

            setLocalVideoTrack(screenTrack);
            await replaceOutgoingVideoTrack(screenTrack);

            screenTrack.onended = () => {
                screenStreamRef.current?.getTracks().forEach(t => t.stop());
                screenStreamRef.current = null;
                setIsScreenSharing(false);
                if (hadVideoBeforeScreenShareRef.current && peerRef.current) {
                    navigator.mediaDevices.getUserMedia({ video: CAMERA_CONSTRAINTS }).then(async camStream => {
                        const cam = camStream.getVideoTracks()[0] ?? null;
                        camStream.getAudioTracks().forEach(t => t.stop());
                        if (!cam) throw new Error('camera_track_missing');
                        cameraTrackRef.current = cam;
                        tagCameraTrack(cam);
                        setLocalVideoTrack(cam);
                        await replaceOutgoingVideoTrack(cam);
                        setIsVideoOff(false);
                        setCallType('video');
                    }).catch(async () => {
                        await replaceOutgoingVideoTrack(null).catch(() => {});
                        setLocalVideoTrack(null);
                        setIsVideoOff(true);
                        setCallType('audio');
                    });
                } else {
                    void replaceOutgoingVideoTrack(null).catch(() => {});
                    setLocalVideoTrack(null);
                    setIsVideoOff(true);
                    setCallType('audio');
                }
            };

            setIsScreenSharing(true);
            setIsVideoOff(false);
            setCallType('video');
        } catch (err) {
            console.error('Screen share error:', err);
        } finally {
            togglingScreenRef.current = false;
        }
    }, [isScreenSharing, callType, isVideoOff, setLocalVideoTrack, replaceOutgoingVideoTrack]);

    const applyNoiseGate = useCallback(async () => {
        const pc = peerRef.current;
        if (!pc || !localStreamRef.current) return;
        const rawTrack = localStreamRef.current.getAudioTracks()[0];
        if (!rawTrack) return;

        try {
            const ctx = new AudioContext();
            const source = ctx.createMediaStreamSource(new MediaStream([rawTrack]));
            const delayNode = ctx.createDelay(0.2);
            delayNode.delayTime.value = 0.05;
            const analysisHP = ctx.createBiquadFilter();
            analysisHP.type = 'highpass'; analysisHP.frequency.value = 100; analysisHP.Q.value = 0.7;
            const analysisLP = ctx.createBiquadFilter();
            analysisLP.type = 'lowpass'; analysisLP.frequency.value = 4000; analysisLP.Q.value = 0.7;
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 2048; analyser.smoothingTimeConstant = 0.3;
            const gainNode = ctx.createGain();
            gainNode.gain.value = 0;
            const dest = ctx.createMediaStreamDestination();

            source.connect(delayNode); delayNode.connect(gainNode); gainNode.connect(dest);
            source.connect(analysisHP); analysisHP.connect(analysisLP); analysisLP.connect(analyser);

            const dataArray = new Float32Array(analyser.fftSize);
            const OPEN_THRESHOLD = -38, CLOSE_THRESHOLD = -48, CONFIRM_MS = 22;
            const HOLD_TIME = 150, ATTACK = 0.002, RELEASE = 0.02;
            let state = 0, pendingSince = 0, holdUntil = 0;

            const check = () => {
                analyser.getFloatTimeDomainData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) sum += dataArray[i] * dataArray[i];
                const db = sum > 0 ? 20 * Math.log10(Math.sqrt(sum / dataArray.length)) : -100;
                const now = performance.now();
                if (state === 0) {
                    if (db > OPEN_THRESHOLD) { state = 1; pendingSince = now; }
                } else if (state === 1) {
                    if (db <= CLOSE_THRESHOLD) { state = 0; }
                    else if (now - pendingSince >= CONFIRM_MS) {
                        state = 2; holdUntil = now + HOLD_TIME;
                        gainNode.gain.setTargetAtTime(1, ctx.currentTime, ATTACK);
                    }
                } else {
                    if (db > CLOSE_THRESHOLD) holdUntil = now + HOLD_TIME;
                    if (now >= holdUntil) { state = 0; gainNode.gain.setTargetAtTime(0, ctx.currentTime, RELEASE); }
                }
            };
            noiseGateIntervalRef.current = setInterval(check, 20);

            const gatedTrack = dest.stream.getAudioTracks()[0];
            gatedTrack.enabled = !isMuted;
            const sender = pc.getSenders().find(s => s.track?.kind === 'audio');
            if (sender) await sender.replaceTrack(gatedTrack);

            noiseGateCtxRef.current = ctx;
            noiseGateGainRef.current = gainNode;
            noiseGateTrackRef.current = gatedTrack;
            setNoiseSuppression(true);
        } catch (err) {
            console.error('Noise gate failed:', err);
        }
    }, [isMuted]);

    const removeNoiseGate = useCallback(async () => {
        const pc = peerRef.current;
        if (pc && localStreamRef.current) {
            const rawTrack = localStreamRef.current.getAudioTracks()[0];
            if (rawTrack) {
                const sender = pc.getSenders().find(s => s.track?.kind === 'audio');
                if (sender) await sender.replaceTrack(rawTrack);
            }
        }
        if (noiseGateIntervalRef.current) { clearInterval(noiseGateIntervalRef.current); noiseGateIntervalRef.current = null; }
        if (noiseGateTrackRef.current) { noiseGateTrackRef.current.stop(); noiseGateTrackRef.current = null; }
        if (noiseGateCtxRef.current) { noiseGateCtxRef.current.close().catch(() => {}); noiseGateCtxRef.current = null; }
        noiseGateGainRef.current = null;
        setNoiseSuppression(false);
    }, []);

    const toggleNoiseSuppression = useCallback(async () => {
        if (noiseSuppression) await removeNoiseGate();
        else await applyNoiseGate();
    }, [noiseSuppression, applyNoiseGate, removeNoiseGate]);

    const syncRemoteVideoByDescription = useCallback((description?: RTCSessionDescriptionInit | null) => {
        const remoteSendsVideo = remoteSendsVideoFromSdp(description?.sdp);
        if (remoteSendsVideo === false) {
            setHasRemoteVideo(false);
        }
    }, []);


    useMessengerEvent('call_incoming', useCallback((data: any) => {
        if (data.is_group) return; // групповые обрабатывает useGroupCall
        if (callState !== 'idle') {
            wsClient.send({ type: 'messenger', action: 'call_decline', target: { id: data.from.id } });
            return;
        }
        targetIdRef.current = data.from.id;
        callEndedRef.current = false;
        setRemoteParty(data.from);
        setCallType(data.call_type === 'video' ? 'video' : 'audio');
        setCallState('incoming');
        playCallRingtone();
        pendingOfferRef.current = { offer: data.offer, call_type: data.call_type };
        incomingTimeoutRef.current = setTimeout(() => {
            if (callEndedRef.current) return;
            callEndedRef.current = true;
            wsClient.send({ type: 'messenger', action: 'call_decline', target: { id: data.from.id } });
            stopCallRingtone();
            cleanup();
            setCallState('ended');
            scheduleClose();
        }, 30000);
    }, [callState, wsClient, cleanup, scheduleClose]));

    useMessengerEvent('call_answered', useCallback(async (data: any) => {
        if (!peerRef.current) return;
        if (data.from?.id !== targetIdRef.current) return;
        if (peerRef.current.signalingState !== 'have-local-offer') {
            console.log('[Call] Ignoring call_answered — not the caller (state:', peerRef.current.signalingState + ')');
            return;
        }
        if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);
        stopCallRingtone();
        stopDialTone();
        try {
            await peerRef.current.setRemoteDescription(data.answer as RTCSessionDescriptionInit);
            syncRemoteVideoByDescription(data.answer as RTCSessionDescriptionInit);
        } catch (err) {
            console.error('[Call] Failed to set remote description from answer:', err);
            return;
        }
        for (const candidate of iceCandidateBufferRef.current) {
            peerRef.current?.addIceCandidate(candidate as RTCIceCandidateInit).catch(console.error);
        }
        iceCandidateBufferRef.current = [];
        setCallState('connected');
        callStartTimeRef.current = Date.now();
        callWasConnectedRef.current = true;
        timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    }, [syncRemoteVideoByDescription]));

    useMessengerEvent('call_ice_candidate', useCallback((data: any) => {
        if (data.from?.id !== targetIdRef.current) return;
        if (peerRef.current?.remoteDescription) {
            peerRef.current.addIceCandidate(data.candidate).catch(console.error);
        } else {
            iceCandidateBufferRef.current.push(data.candidate);
        }
    }, []));

    useMessengerEvent('call_ended', useCallback((data: any) => {
        if (callEndedRef.current) return;
        if (data.from?.id !== targetIdRef.current) return;
        callEndedRef.current = true;
        stopCallRingtone();
        stopDialTone();
        cleanup();
        setCallState('ended');
        scheduleClose();
    }, [cleanup, scheduleClose]));

    useMessengerEvent('call_declined', useCallback((data: any) => {
        if (callEndedRef.current) return;
        if (data.from?.id !== targetIdRef.current) return;
        callEndedRef.current = true;
        if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null; }
        stopCallRingtone();
        stopDialTone();
        // Звонок отклонён — отправляем missed call message
        if (!callWasConnectedRef.current) {
            wsClient.send({
                type: 'messenger',
                action: 'send_call_message',
                target: { id: targetIdRef.current, type: 0 },
                call_type: callTypeRef.current,
                duration: 0,
                missed: true,
            });
        }
        callWasConnectedRef.current = false;
        cleanup();
        setCallState('ended');
        scheduleClose();
    }, [wsClient, cleanup, scheduleClose]));

    useMessengerEvent('call_renegotiate', useCallback(async (data: any) => {
        if (!peerRef.current) return;
        if (data.from?.id !== targetIdRef.current) return;
        try {
            await peerRef.current.setRemoteDescription(data.offer as RTCSessionDescriptionInit);
            syncRemoteVideoByDescription(data.offer as RTCSessionDescriptionInit);
            const answer = await peerRef.current.createAnswer();
            await peerRef.current.setLocalDescription(answer);
            wsClient.send({
                type: 'messenger', action: 'call_renegotiate_answer',
                target: { id: targetIdRef.current }, answer: { type: peerRef.current.localDescription!.type, sdp: peerRef.current.localDescription!.sdp }
            });
        } catch (err) {
            console.error('Renegotiation error:', err);
        }
    }, [wsClient, syncRemoteVideoByDescription]));

    useMessengerEvent('call_renegotiate_answer', useCallback(async (data: any) => {
        if (!peerRef.current) return;
        if (data.from?.id !== targetIdRef.current) return;
        try {
            await peerRef.current.setRemoteDescription(data.answer as RTCSessionDescriptionInit);
            syncRemoteVideoByDescription(data.answer as RTCSessionDescriptionInit);
        } catch (err) {
            console.error('Renegotiation answer error:', err);
        }
    }, [syncRemoteVideoByDescription]));

    useEffect(() => {
        if (!localVideoRef.current) return;
        const desired = isScreenSharing && screenStreamRef.current
            ? screenStreamRef.current
            : localStreamRef.current;
        if (desired && localVideoRef.current.srcObject !== desired) {
            localVideoRef.current.srcObject = desired;
        }
        if (desired) {
            localVideoRef.current.play().catch(() => {});
        }
    });

    useEffect(() => {
        if (!remoteVideoRef.current || !remoteStreamRef.current) return;
        if (remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
            remoteVideoRef.current.srcObject = remoteStreamRef.current;
        }
        remoteVideoRef.current.play().catch(() => {});
    });

    useEffect(() => {
        if (!remoteAudioRef.current || !remoteStreamRef.current) return;
        if (remoteAudioRef.current.srcObject !== remoteStreamRef.current) {
            remoteAudioRef.current.srcObject = remoteStreamRef.current;
            remoteAudioRef.current.play().catch(() => {});
        }
    });

    const acceptIncoming = useCallback(() => {
        const pending = pendingOfferRef.current;
        if (!pending) return;
        if (incomingTimeoutRef.current) { clearTimeout(incomingTimeoutRef.current); incomingTimeoutRef.current = null; }
        pendingOfferRef.current = null;
        acceptCall(pending.offer, pending.call_type === 'video' ? 'video' : 'audio');
    }, [acceptCall]);

    useEffect(() => {
        if (callState !== 'connected' || !peerRef.current) return;
        const interval = setInterval(async () => {
            if (peerRef.current) {
                const quality = await getConnectionQuality(peerRef.current);
                setConnectionQuality(quality);
            }
        }, 1500);
        return () => clearInterval(interval);
    }, [callState]);

    useEffect(() => {
        const onBeforeUnload = (e: BeforeUnloadEvent) => {
            if (callState === 'connected' || callState === 'calling' || callState === 'incoming') {
                e.preventDefault();
                if (targetIdRef.current && !callEndedRef.current) {
                    wsClient.send({ type: 'messenger', action: 'call_end', target: { id: targetIdRef.current } });
                }
            }
        };
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [callState, wsClient]);

    useEffect(() => () => { stopCallRingtone(); stopDialTone(); cleanup(); }, []);

    return {
        callState, callType, remoteParty, isMuted, isVideoOff, isScreenSharing,
        hasRemoteVideo, isMinimized, duration, noiseSuppression, connectionQuality,
        localVideoRef, remoteVideoRef, remoteAudioRef,
        setIsMinimized,
        startCall, acceptIncoming, declineCall, endCallSafe,
        toggleMute, toggleVideo, toggleScreenShare, toggleNoiseSuppression,
    };
};
