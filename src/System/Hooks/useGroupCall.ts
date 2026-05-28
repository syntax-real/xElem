import { useRef, useState, useCallback } from 'react';
import { useWebSocket, useMessengerEvent } from '../Context/WebSocket';
import { useAuth } from './useAuth';
import { playCallRingtone, stopCallRingtone, playDialTone, stopDialTone } from '../../Services/callSounds';

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

const GROUP_CAMERA_CONSTRAINTS: MediaTrackConstraints = {
    width: { ideal: 640, max: 960 },
    height: { ideal: 360, max: 540 },
    frameRate: { ideal: 12, max: 15 },
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
    } catch { }
};

const tagScreenTrack = (track: MediaStreamTrack | null) => {
    if (!track) return;
    try {
        (track as any).contentHint = 'detail';
    } catch { }
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
            video: GROUP_CAMERA_CONSTRAINTS
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

export type GroupCallState = 'idle' | 'calling' | 'incoming' | 'connected';

export interface GroupCallParticipant {
    id: number;
    name: string;
    avatar?: string;
}

interface PeerState {
    pc: RTCPeerConnection;
    iceCandidateBuffer: RTCIceCandidateInit[];
    status: 'calling' | 'answering' | 'connected';
}

type GroupPeerStatus = PeerState['status'];

export const useGroupCall = () => {
    const { wsClient } = useWebSocket();
    const { accountData } = useAuth();
    const selfId = Number(accountData?.id ?? 0);

    const [groupCallState, setGroupCallState] = useState<GroupCallState>('idle');
    const [callType, setCallType] = useState<'audio' | 'video'>('audio');
    const [groupName, setGroupName] = useState('');
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [participants, setParticipants] = useState<Map<number, GroupCallParticipant>>(new Map());
    const [participantStates, setParticipantStates] = useState<Map<number, GroupPeerStatus>>(new Map());
    const [participantVideoEnabled, setParticipantVideoEnabled] = useState<Map<number, boolean>>(new Map());
    const [streams, setStreams] = useState<Map<number, MediaStream>>(new Map());

    const callTypeRef = useRef<'audio' | 'video'>('audio');
    const wasConnectedRef = useRef(false);

    const peersRef = useRef<Map<number, PeerState>>(new Map());
    const localStreamRef = useRef<MediaStream | null>(null);
    const activeRef = useRef(false);
    const roomIdRef = useRef<number | null>(null);
    const groupNameRef = useRef('');
    const cameraTrackRef = useRef<MediaStreamTrack | null>(null);
    const screenTrackRef = useRef<MediaStreamTrack | null>(null);
    const restoreCameraAfterShareRef = useRef(false);

    const callingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const answeredCountRef = useRef(0);
    const callStartTimeRef = useRef(0);

    const setCurrentCallType = useCallback((type: 'audio' | 'video') => {
        callTypeRef.current = type;
        setCallType(type);
    }, []);

    const markConnected = useCallback(() => {
        if (callingTimeoutRef.current) {
            clearTimeout(callingTimeoutRef.current);
            callingTimeoutRef.current = null;
        }
        stopDialTone();
        if (!wasConnectedRef.current) {
            wasConnectedRef.current = true;
            callStartTimeRef.current = Date.now();
        }
        setGroupCallState('connected');
    }, []);

    const incomingRef = useRef<{
        fromId: number;
        fromName: string;
        fromAvatar?: string;
        groupId: number;
        groupName: string;
        callType: 'audio' | 'video';
        offer: RTCSessionDescriptionInit;
    } | null>(null);

    const removePeer = useCallback((uid: number) => {
        const peer = peersRef.current.get(uid);
        if (peer) {
            peer.pc.onicecandidate = null;
            peer.pc.ontrack = null;
            peer.pc.onconnectionstatechange = null;
            peer.pc.close();
        }
        peersRef.current.delete(uid);
        setStreams(prev => { const n = new Map(prev); n.delete(uid); return n; });
        setParticipants(prev => { const n = new Map(prev); n.delete(uid); return n; });
        setParticipantStates(prev => { const n = new Map(prev); n.delete(uid); return n; });
        setParticipantVideoEnabled(prev => { const n = new Map(prev); n.delete(uid); return n; });
    }, []);

    const cleanupAll = useCallback(() => {
        activeRef.current = false;
        stopCallRingtone();
        stopDialTone();
        if (callingTimeoutRef.current) { clearTimeout(callingTimeoutRef.current); callingTimeoutRef.current = null; }
        answeredCountRef.current = 0;
        callStartTimeRef.current = 0;
        wasConnectedRef.current = false;
        for (const [, peer] of peersRef.current) {
            peer.pc.onicecandidate = null;
            peer.pc.ontrack = null;
            peer.pc.onconnectionstatechange = null;
            peer.pc.close();
        }
        peersRef.current.clear();
        localStreamRef.current?.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
        if (cameraTrackRef.current) {
            cameraTrackRef.current.stop();
            cameraTrackRef.current = null;
        }
        if (screenTrackRef.current) {
            screenTrackRef.current.stop();
            screenTrackRef.current = null;
        }
        restoreCameraAfterShareRef.current = false;
        roomIdRef.current = null;
        setParticipants(new Map());
        setParticipantStates(new Map());
        setParticipantVideoEnabled(new Map());
        setStreams(new Map());
        setCurrentCallType('audio');
        setIsMuted(false);
        setIsVideoOff(false);
        setIsScreenSharing(false);
    }, [setCurrentCallType]);

    const createPC = useCallback((uid: number): RTCPeerConnection => {
        const pc = new RTCPeerConnection(FALLBACK_ICE);

        localStreamRef.current?.getTracks().forEach(track => {
            pc.addTrack(track, localStreamRef.current!);
        });
        if ((localStreamRef.current?.getVideoTracks().length ?? 0) === 0) {
            pc.addTransceiver('video', { direction: 'sendrecv' });
        }

        pc.onicecandidate = (e) => {
            if (!e.candidate) return;
            wsClient.send({
                type: 'messenger',
                action: 'call_ice_candidate',
                target: { id: uid },
                candidate: {
                    candidate: e.candidate.candidate,
                    sdpMid: e.candidate.sdpMid,
                    sdpMLineIndex: e.candidate.sdpMLineIndex,
                    usernameFragment: e.candidate.usernameFragment
                }
            });
        };

        pc.ontrack = (e) => {
            if (!activeRef.current) return;
            const stream = e.streams[0] ?? new MediaStream([e.track]);
            setStreams(prev => new Map(prev).set(uid, stream));
            setParticipantStates(prev => new Map(prev).set(uid, 'connected'));

            if (e.track.kind === 'video') {
                const updateVideoState = () => {
                    const enabled = e.track.readyState === 'live' && !e.track.muted;
                    setParticipantVideoEnabled(prev => new Map(prev).set(uid, enabled));
                };
                e.track.addEventListener('mute', updateVideoState);
                e.track.addEventListener('unmute', updateVideoState);
                e.track.addEventListener('ended', updateVideoState);
                updateVideoState();
            }
            markConnected();
        };

        pc.onconnectionstatechange = () => {
            if (!activeRef.current) return;
            if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
                removePeer(uid);
            } else if (pc.connectionState === 'connected') {
                peersRef.current.get(uid) && (peersRef.current.get(uid)!.status = 'connected');
                setParticipantStates(prev => new Map(prev).set(uid, 'connected'));
                markConnected();
            }
        };

        return pc;
    }, [wsClient, removePeer, markConnected]);

    const dialPeer = useCallback(async (
        member: GroupCallParticipant,
        groupId: number,
        gName: string,
        type: 'audio' | 'video'
    ) => {
        const uid = Number(member.id);
        if (!activeRef.current || !localStreamRef.current) return false;
        if (!Number.isInteger(uid) || uid <= 0) return false;
        if (uid === selfId) return false;

        if (peersRef.current.has(uid)) {
            setParticipants(prev => new Map(prev).set(uid, member));
            const existing = peersRef.current.get(uid);
            if (existing) {
                setParticipantStates(prev => new Map(prev).set(uid, existing.status));
            }
            return true;
        }

        try {
            const pc = createPC(uid);
            peersRef.current.set(uid, {
                pc,
                iceCandidateBuffer: [],
                status: 'calling'
            });
            setParticipants(prev => new Map(prev).set(uid, member));
            setParticipantStates(prev => new Map(prev).set(uid, 'calling'));
            setParticipantVideoEnabled(prev => new Map(prev).set(uid, type === 'video'));

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            const res = await wsClient.send({
                type: 'messenger',
                action: 'call_initiate',
                target: { id: uid },
                offer: { type: pc.localDescription!.type, sdp: pc.localDescription!.sdp },
                call_type: type,
                is_group: true,
                group_id: groupId,
                group_name: gName
            });

            if (res?.status === 'ok' && !res?.unavailable) {
                return true;
            }

            removePeer(uid);
            return false;
        } catch {
            removePeer(uid);
            return false;
        }
    }, [selfId, createPC, wsClient, removePeer]);

    const acceptPeerOffer = useCallback(async ({
        fromId,
        fromName,
        fromAvatar,
        offer,
    }: {
        fromId: number;
        fromName: string;
        fromAvatar?: string;
        offer: RTCSessionDescriptionInit;
    }) => {
        if (!activeRef.current || !localStreamRef.current) return false;
        if (peersRef.current.has(fromId)) return false;

        try {
            const pc = createPC(fromId);
            peersRef.current.set(fromId, { pc, iceCandidateBuffer: [], status: 'answering' });
            setParticipants(prev => new Map(prev).set(fromId, {
                id: fromId,
                name: fromName,
                avatar: fromAvatar
            }));
            setParticipantStates(prev => new Map(prev).set(fromId, 'answering'));
            setParticipantVideoEnabled(prev => new Map(prev).set(fromId, true));

            await pc.setRemoteDescription(offer);

            const peer = peersRef.current.get(fromId)!;
            for (const c of peer.iceCandidateBuffer) {
                await pc.addIceCandidate(c).catch(() => { });
            }
            peer.iceCandidateBuffer = [];

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            wsClient.send({
                type: 'messenger',
                action: 'call_accept',
                target: { id: fromId },
                answer: { type: pc.localDescription!.type, sdp: pc.localDescription!.sdp }
            });

            markConnected();
            return true;
        } catch {
            removePeer(fromId);
            return false;
        }
    }, [createPC, wsClient, removePeer, markConnected]);

    const connectToGroupMembers = useCallback(async (
        groupId: number,
        gName: string,
        type: 'audio' | 'video'
    ) => {
        const res = await wsClient.send({
            type: 'messenger',
            action: 'load_group_members',
            gid: groupId
        });

        const members: GroupCallParticipant[] = (res?.members ?? [])
            .filter((m: any) => Number(m?.id) > 0 && Number(m.id) !== selfId)
            .map((m: any) => ({
                id: Number(m.id),
                name: m.name ?? '...',
                avatar: m.avatar
            }));

        for (const member of members) {
            if (peersRef.current.has(member.id)) continue;
            await dialPeer(member, groupId, gName, type);
        }
    }, [selfId, wsClient, dialPeer]);

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
        for (const [uid, peer] of peersRef.current) {
            const pc = peer.pc;
            const sender = findVideoSender(pc);
            try {
                if (sender) {
                    await sender.replaceTrack(track);
                    const transceiver = pc.getTransceivers().find(t => t.sender === sender);
                    if (transceiver) {
                        const desiredDirection: RTCRtpTransceiverDirection = track ? 'sendrecv' : 'recvonly';
                        if (transceiver.direction !== desiredDirection) {
                            transceiver.direction = desiredDirection;
                            const offer = await pc.createOffer();
                            await pc.setLocalDescription(offer);
                            wsClient.send({
                                type: 'messenger',
                                action: 'call_renegotiate',
                                target: { id: uid },
                                offer: { type: pc.localDescription!.type, sdp: pc.localDescription!.sdp }
                            });
                        }
                    }
                    continue;
                }

                if (track && localStreamRef.current) {
                    pc.addTrack(track, localStreamRef.current);
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    wsClient.send({
                        type: 'messenger',
                        action: 'call_renegotiate',
                        target: { id: uid },
                        offer: { type: pc.localDescription!.type, sdp: pc.localDescription!.sdp }
                    });
                }
            } catch (err) {
                console.error('[GroupCall] replaceOutgoingVideoTrack error:', err);
            }
        }
    }, [wsClient]);

    const stopScreenShareInternal = useCallback(async () => {
        if (screenTrackRef.current) {
            screenTrackRef.current.onended = null;
            screenTrackRef.current.stop();
            screenTrackRef.current = null;
        }

        setIsScreenSharing(false);

        if (restoreCameraAfterShareRef.current) {
            try {
                let cameraTrack = cameraTrackRef.current;
                if (!cameraTrack || cameraTrack.readyState !== 'live') {
                    const camStream = await navigator.mediaDevices.getUserMedia({ video: GROUP_CAMERA_CONSTRAINTS });
                    cameraTrack = camStream.getVideoTracks()[0] ?? null;
                    camStream.getAudioTracks().forEach(t => t.stop());
                    cameraTrackRef.current = cameraTrack;
                }

                if (cameraTrack) {
                    tagCameraTrack(cameraTrack);
                    setLocalVideoTrack(cameraTrack);
                    await replaceOutgoingVideoTrack(cameraTrack);
                    setIsVideoOff(false);
                    setCurrentCallType('video');
                    restoreCameraAfterShareRef.current = false;
                    return;
                }
            } catch (err) {
                console.error('[GroupCall] restore camera after share error:', err);
            }
        }

        await replaceOutgoingVideoTrack(null);
        setLocalVideoTrack(null);
        setIsVideoOff(true);
        setCurrentCallType('audio');
        restoreCameraAfterShareRef.current = false;
    }, [replaceOutgoingVideoTrack, setCurrentCallType, setLocalVideoTrack]);

    // ─── ИНИЦИАТОР: начать групповой звонок ───────────────────────────────────
    const startGroupCall = useCallback(async (
        groupId: number,
        gName: string,
        type: 'audio' | 'video',
        members: GroupCallParticipant[]
    ) => {
        if (groupCallState !== 'idle') return;
        if (members.length === 0) return;

        setGroupName(gName);
        groupNameRef.current = gName;
        setCurrentCallType(type);
        roomIdRef.current = groupId;
        activeRef.current = true;
        answeredCountRef.current = 0;
        callStartTimeRef.current = 0;
        wasConnectedRef.current = false;

        try {
            const { stream, hasVideo } = await getMediaWithFallback(type === 'video');
            const effectiveType = (type === 'video' && !hasVideo) ? 'audio' : type;
            localStreamRef.current = stream;
            cameraTrackRef.current = stream.getVideoTracks()[0] ?? null;
            screenTrackRef.current = null;
            restoreCameraAfterShareRef.current = false;
            setIsVideoOff(effectiveType === 'audio');
            setIsScreenSharing(false);
            if (effectiveType !== type) setCurrentCallType('audio');

            setGroupCallState('calling');
            playDialTone();

            let onlineCount = 0;
            const safeMembers = members.filter(m => Number(m?.id) > 0 && Number(m.id) !== selfId);
            for (const member of safeMembers) {
                const ok = await dialPeer(member, groupId, gName, effectiveType);
                if (ok) {
                    onlineCount++;
                }
            }

            if (onlineCount === 0) {
                wsClient.send({
                    type: 'messenger',
                    action: 'send_call_message',
                    target: { id: groupId, type: 1 },
                    call_type: effectiveType,
                    duration: 0,
                    missed: true,
                });
                cleanupAll();
                setGroupCallState('idle');
                return;
            }

            callingTimeoutRef.current = setTimeout(() => {
                callingTimeoutRef.current = null;
                if (!activeRef.current || wasConnectedRef.current) return;
                wsClient.send({
                    type: 'messenger',
                    action: 'send_call_message',
                    target: { id: groupId, type: 1 },
                    call_type: effectiveType,
                    duration: 0,
                    missed: true,
                });
                for (const [uid] of peersRef.current) {
                    wsClient.send({ type: 'messenger', action: 'call_end', target: { id: uid } });
                }
                cleanupAll();
                setGroupCallState('idle');
            }, 30000);

        } catch (err: any) {
            cleanupAll();
            setGroupCallState('idle');
            if (err?.name === 'NotAllowedError' || err?.name === 'NotFoundError') {
                alert('Разрешите доступ к микрофону в настройках браузера');
            }
        }
    }, [groupCallState, selfId, cleanupAll, setCurrentCallType, dialPeer]);

    // ─── ПРИНИМАЮЩИЙ: принять входящий групповой звонок ───────────────────────
    const joinGroupCall = useCallback(async () => {
        const inc = incomingRef.current;
        if (!inc || groupCallState !== 'incoming') return;
        stopCallRingtone();
        activeRef.current = true;
        roomIdRef.current = inc.groupId;
        wasConnectedRef.current = false;
        callStartTimeRef.current = 0;

        try {
            const { stream, hasVideo } = await getMediaWithFallback(inc.callType === 'video');
            const effectiveType = (inc.callType === 'video' && !hasVideo) ? 'audio' : inc.callType;
            localStreamRef.current = stream;
            cameraTrackRef.current = stream.getVideoTracks()[0] ?? null;
            screenTrackRef.current = null;
            restoreCameraAfterShareRef.current = false;
            setIsVideoOff(effectiveType === 'audio');
            setIsScreenSharing(false);
            setCurrentCallType(effectiveType);
            const accepted = await acceptPeerOffer({
                fromId: inc.fromId,
                fromName: inc.fromName,
                fromAvatar: inc.fromAvatar,
                offer: inc.offer
            });
            if (!accepted) throw new Error('accept_failed');

            incomingRef.current = null;
            await connectToGroupMembers(inc.groupId, inc.groupName, effectiveType);
        } catch (err: any) {
            cleanupAll();
            setGroupCallState('idle');
        }
    }, [groupCallState, acceptPeerOffer, connectToGroupMembers, cleanupAll, setCurrentCallType]);

    // ─── ПРИНИМАЮЩИЙ: отклонить входящий ──────────────────────────────────────
    const declineGroupCall = useCallback(() => {
        const inc = incomingRef.current;
        if (!inc) return;
        stopCallRingtone();
        wsClient.send({
            type: 'messenger',
            action: 'call_decline',
            target: { id: inc.fromId }
        });
        incomingRef.current = null;
        setGroupCallState('idle');
    }, [wsClient]);

    // ─── ПОКИНУТЬ групповой звонок ─────────────────────────────────────────────
    const leaveGroupCall = useCallback(() => {
        const wasConnected = wasConnectedRef.current && callStartTimeRef.current > 0;
        const duration = wasConnected
            ? Math.floor((Date.now() - callStartTimeRef.current) / 1000)
            : 0;
        const gid = roomIdRef.current;

        for (const [uid] of peersRef.current) {
            wsClient.send({ type: 'messenger', action: 'call_end', target: { id: uid } });
        }

        if (gid) {
            wsClient.send({
                type: 'messenger',
                action: 'send_call_message',
                target: { id: gid, type: 1 },
                call_type: callTypeRef.current,
                duration,
                missed: !wasConnected,
            });
        }

        cleanupAll();
        setGroupCallState('idle');
    }, [wsClient, cleanupAll]);

    const toggleMute = useCallback(() => {
        const newMuted = !isMuted;
        localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !newMuted; });
        setIsMuted(newMuted);
    }, [isMuted]);

    const toggleVideo = useCallback(async () => {
        if (!activeRef.current || !localStreamRef.current) return;

        if (!isVideoOff) {
            if (isScreenSharing) {
                restoreCameraAfterShareRef.current = false;
                await stopScreenShareInternal();
            } else {
                await replaceOutgoingVideoTrack(null);
                setLocalVideoTrack(null);
                if (cameraTrackRef.current) {
                    cameraTrackRef.current.stop();
                    cameraTrackRef.current = null;
                }
                setIsVideoOff(true);
                setCurrentCallType('audio');
            }
            return;
        }

        try {
            let cameraTrack = cameraTrackRef.current;
            if (!cameraTrack || cameraTrack.readyState !== 'live') {
                const camStream = await navigator.mediaDevices.getUserMedia({ video: GROUP_CAMERA_CONSTRAINTS });
                cameraTrack = camStream.getVideoTracks()[0] ?? null;
                camStream.getAudioTracks().forEach(t => t.stop());
                cameraTrackRef.current = cameraTrack;
            }
            if (!cameraTrack) return;

            tagCameraTrack(cameraTrack);
            setLocalVideoTrack(cameraTrack);
            await replaceOutgoingVideoTrack(cameraTrack);
            setIsVideoOff(false);
            setCurrentCallType('video');
        } catch (err: any) {
            console.error('[GroupCall] toggleVideo error:', err);
            if (err?.name === 'NotAllowedError' || err?.name === 'NotFoundError') {
                alert('Разрешите доступ к камере в настройках браузера');
            }
        }
    }, [isVideoOff, isScreenSharing, stopScreenShareInternal, replaceOutgoingVideoTrack, setLocalVideoTrack, setCurrentCallType]);

    const toggleScreenShare = useCallback(async () => {
        if (!activeRef.current || !localStreamRef.current) return;

        if (isScreenSharing) {
            await stopScreenShareInternal();
            return;
        }

        try {
            const display = await navigator.mediaDevices.getDisplayMedia({ video: SCREEN_SHARE_CONSTRAINTS, audio: false });
            const screenTrack = display.getVideoTracks()[0] ?? null;
            display.getAudioTracks().forEach(t => t.stop());
            if (!screenTrack) return;

            restoreCameraAfterShareRef.current = !isVideoOff;
            screenTrackRef.current = screenTrack;
            tagScreenTrack(screenTrack);

            screenTrack.onended = () => {
                void stopScreenShareInternal();
            };

            setLocalVideoTrack(screenTrack);
            await replaceOutgoingVideoTrack(screenTrack);
            setIsScreenSharing(true);
            setIsVideoOff(false);
            setCurrentCallType('video');
        } catch (err: any) {
            console.error('[GroupCall] toggleScreenShare error:', err);
        }
    }, [isScreenSharing, isVideoOff, stopScreenShareInternal, replaceOutgoingVideoTrack, setLocalVideoTrack, setCurrentCallType]);

    useMessengerEvent('call_incoming', useCallback((data: any) => {
        if (!data.is_group) return; // пусть useCall.ts обрабатывает
        const fromId = Number(data?.from?.id);
        const groupId = Number(data?.group_id);

        if (!Number.isInteger(fromId) || fromId <= 0 || fromId === selfId) return;

        if (groupCallState === 'idle') {
            incomingRef.current = {
                fromId,
                fromName: data.from.name,
                fromAvatar: data.from.avatar,
                groupId,
                groupName: data.group_name ?? 'Группа',
                callType: data.call_type === 'video' ? 'video' : 'audio',
                offer: data.offer
            };

            setGroupName(data.group_name ?? 'Группа');
            groupNameRef.current = data.group_name ?? 'Группа';
            setCurrentCallType(data.call_type === 'video' ? 'video' : 'audio');
            setGroupCallState('incoming');
            playCallRingtone();
            return;
        }

        if (!activeRef.current || roomIdRef.current !== groupId || !localStreamRef.current) {
            wsClient.send({ type: 'messenger', action: 'call_decline', target: { id: fromId } });
            return;
        }

        const existing = peersRef.current.get(fromId);
        if (existing) {
            if (existing.status === 'calling') {
                // Анти-glare: у кого ID больше — принимает входящий, меньший оставляет исходящий
                if (selfId <= 0 || selfId > fromId) {
                    removePeer(fromId);
                } else {
                    wsClient.send({ type: 'messenger', action: 'call_decline', target: { id: fromId } });
                    return;
                }
            } else {
                wsClient.send({ type: 'messenger', action: 'call_decline', target: { id: fromId } });
                return;
            }
        }

        void acceptPeerOffer({
            fromId,
            fromName: data.from.name,
            fromAvatar: data.from.avatar,
            offer: data.offer
        });
    }, [groupCallState, selfId, wsClient, removePeer, acceptPeerOffer, setCurrentCallType]));

    useMessengerEvent('call_answered', useCallback(async (data: any) => {
        if (!activeRef.current) return;
        const peer = peersRef.current.get(data.from?.id);
        if (!peer || peer.status !== 'calling') return;

        try {
            await peer.pc.setRemoteDescription(data.answer as RTCSessionDescriptionInit);
            const remoteSendsVideo = remoteSendsVideoFromSdp((data.answer as RTCSessionDescriptionInit)?.sdp);
            if (remoteSendsVideo !== null) {
                setParticipantVideoEnabled(prev => new Map(prev).set(data.from?.id, remoteSendsVideo));
            }
            for (const c of peer.iceCandidateBuffer) peer.pc.addIceCandidate(c).catch(() => { });
            peer.iceCandidateBuffer = [];
            peer.status = 'connected';
            setParticipantStates(prev => new Map(prev).set(data.from?.id, 'connected'));

            answeredCountRef.current++;
            markConnected();
        } catch (err) {
            console.error('[GroupCall] call_answered error:', err);
        }
    }, [markConnected]));

    useMessengerEvent('call_declined', useCallback((data: any) => {
        if (!activeRef.current) return;
        removePeer(data.from?.id);
        if (peersRef.current.size === 0) {
            const gid = roomIdRef.current;
            if (callingTimeoutRef.current) { clearTimeout(callingTimeoutRef.current); callingTimeoutRef.current = null; }
            if (gid && !wasConnectedRef.current) {
                wsClient.send({
                    type: 'messenger',
                    action: 'send_call_message',
                    target: { id: gid, type: 1 },
                    call_type: callTypeRef.current,
                    duration: 0,
                    missed: true,
                });
            }
            cleanupAll();
            setGroupCallState('idle');
        }
    }, [removePeer, wsClient, cleanupAll]));

    useMessengerEvent('call_ended', useCallback((data: any) => {
        if (!activeRef.current) return;
        removePeer(data.from?.id);
        if (peersRef.current.size === 0) {
            cleanupAll();
            setGroupCallState('idle');
        }
    }, [removePeer, cleanupAll]));

    useMessengerEvent('call_ice_candidate', useCallback((data: any) => {
        if (!activeRef.current) return;
        const peer = peersRef.current.get(data.from?.id);
        if (!peer) return;
        if (peer.pc.remoteDescription) {
            peer.pc.addIceCandidate(data.candidate).catch(() => { });
        } else {
            peer.iceCandidateBuffer.push(data.candidate);
        }
    }, []));

    useMessengerEvent('call_renegotiate', useCallback(async (data: any) => {
        if (!activeRef.current) return;
        const peer = peersRef.current.get(data.from?.id);
        if (!peer) return;
        try {
            await peer.pc.setRemoteDescription(data.offer as RTCSessionDescriptionInit);
            const remoteSendsVideo = remoteSendsVideoFromSdp((data.offer as RTCSessionDescriptionInit)?.sdp);
            if (remoteSendsVideo !== null) {
                setParticipantVideoEnabled(prev => new Map(prev).set(data.from?.id, remoteSendsVideo));
            }
            const answer = await peer.pc.createAnswer();
            await peer.pc.setLocalDescription(answer);
            wsClient.send({
                type: 'messenger',
                action: 'call_renegotiate_answer',
                target: { id: data.from.id },
                answer: { type: peer.pc.localDescription!.type, sdp: peer.pc.localDescription!.sdp }
            });
        } catch (err) {
            console.error('[GroupCall] call_renegotiate error:', err);
        }
    }, [wsClient]));

    useMessengerEvent('call_renegotiate_answer', useCallback(async (data: any) => {
        if (!activeRef.current) return;
        const peer = peersRef.current.get(data.from?.id);
        if (!peer) return;
        try {
            await peer.pc.setRemoteDescription(data.answer as RTCSessionDescriptionInit);
            const remoteSendsVideo = remoteSendsVideoFromSdp((data.answer as RTCSessionDescriptionInit)?.sdp);
            if (remoteSendsVideo !== null) {
                setParticipantVideoEnabled(prev => new Map(prev).set(data.from?.id, remoteSendsVideo));
            }
        } catch (err) {
            console.error('[GroupCall] call_renegotiate_answer error:', err);
        }
    }, []));

    return {
        groupCallState,
        callType,
        groupName,
        participants,
        participantStates,
        participantVideoEnabled,
        streams,
        isMuted,
        isVideoOff,
        isScreenSharing,
        localStreamRef,
        startGroupCall,
        joinGroupCall,
        declineGroupCall,
        leaveGroupCall,
        toggleMute,
        toggleVideo,
        toggleScreenShare,
    };
};
