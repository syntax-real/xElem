import { useRef, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Avatar } from '../../../../UIKit';
import { I_VIDEO, I_MICROPHONE, I_LOCK, I_CALL, I_CALL_END, I_MIC_OFF, I_VIDEOCAM_OFF, I_SCREEN_SHARE, I_NOISEGATE, I_MINIMIZE, I_SIGNAL_QUALITY } from '../../../../System/UI/IconPack';
import type { CallState, CallType, CallParty } from '../../../../System/Hooks/useCall';
import type { GroupCallParticipant } from '../../../../System/Hooks/useGroupCall';

interface CallModalProps {
    callState: CallState;
    callType: CallType;
    remoteParty: CallParty | null;
    isMuted: boolean;
    isVideoOff: boolean;
    isScreenSharing: boolean;
    hasRemoteVideo: boolean;
    isMinimized: boolean;
    duration: number;
    noiseSuppression: boolean;
    connectionQuality: string;
    localVideoRef: React.RefObject<HTMLVideoElement | null>;
    remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
    remoteAudioRef: React.RefObject<HTMLAudioElement | null>;
    onAccept: () => void;
    onDecline: () => void;
    onEnd: () => void;
    onToggleMute: () => void;
    onToggleVideo: () => void;
    onToggleScreenShare: () => void;
    onToggleNoise: () => void;
    onMinimize: (val: boolean) => void;

    isGroup?: boolean;
    groupName?: string;
    groupCallState?: 'idle' | 'calling' | 'incoming' | 'connected';
    groupParticipants?: Map<number, GroupCallParticipant>;
    groupParticipantStates?: Map<number, 'calling' | 'answering' | 'connected'>;
    groupParticipantVideoEnabled?: Map<number, boolean>;
    groupStreams?: Map<number, MediaStream>;
    localStreamRef?: React.RefObject<MediaStream | null>;
    onGroupJoin?: () => void;
    onGroupDecline?: () => void;
    onGroupLeave?: () => void;
    onGroupToggleMute?: () => void;
    onGroupToggleVideo?: () => void;
    onGroupToggleScreenShare?: () => void;
    groupIsMuted?: boolean;
    groupIsVideoOff?: boolean;
    groupIsScreenSharing?: boolean;
}

const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
};

const ParticipantTile = ({
    participant,
    stream,
    status,
    videoEnabled,
    pendingLabel,
}: {
    participant: GroupCallParticipant;
    stream?: MediaStream;
    status?: 'calling' | 'answering' | 'connected';
    videoEnabled?: boolean;
    pendingLabel: string;
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [, setVideoVersion] = useState(0);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.srcObject = stream ?? null;
            if (stream) {
                videoRef.current.play().catch(() => {});
            }
        }
    }, [stream]);

    useEffect(() => {
        if (!stream) return;

        const bump = () => setVideoVersion(v => v + 1);
        const attachTrack = (track: MediaStreamTrack) => {
            if (track.kind !== 'video') return;
            track.addEventListener('mute', bump);
            track.addEventListener('unmute', bump);
            track.addEventListener('ended', bump);
        };
        const detachTrack = (track: MediaStreamTrack) => {
            if (track.kind !== 'video') return;
            track.removeEventListener('mute', bump);
            track.removeEventListener('unmute', bump);
            track.removeEventListener('ended', bump);
        };

        stream.getVideoTracks().forEach(attachTrack);
        const onAdd = (e: MediaStreamTrackEvent) => { attachTrack(e.track); bump(); };
        const onRemove = (e: MediaStreamTrackEvent) => { detachTrack(e.track); bump(); };
        stream.addEventListener('addtrack', onAdd);
        stream.addEventListener('removetrack', onRemove);

        return () => {
            stream.getVideoTracks().forEach(detachTrack);
            stream.removeEventListener('addtrack', onAdd);
            stream.removeEventListener('removetrack', onRemove);
        };
    }, [stream]);

    const isConnected = status === 'connected' || !!stream;
    const hasVideo = !!(videoEnabled !== false && stream && isConnected && stream.getVideoTracks().some(
        t => t.enabled && t.readyState === 'live' && !t.muted
    ));

    return (
        <div className={`GroupCall-Tile ${!isConnected ? 'GroupCall-Tile--pending' : ''}`}>
            <video
                ref={videoRef}
                autoPlay
                playsInline
                className="GroupCall-Tile-Video"
                style={{ display: hasVideo ? 'block' : 'none' }}
            />
            {!hasVideo && (
                <div className="GroupCall-Tile-Fallback">
                    <div className="GroupCall-Tile-Avatar">
                        <Avatar avatar={participant.avatar} name={participant.name} size={64} />
                    </div>
                    <div className="GroupCall-Tile-NoVideo">
                        <I_VIDEOCAM_OFF />
                    </div>
                </div>
            )}
            {!isConnected && <div className="GroupCall-Tile-Pending">{pendingLabel}</div>}
            <div className="GroupCall-Tile-Name">{participant.name}</div>
            {stream && (
                <audio
                    ref={el => {
                        if (el && stream) { el.srcObject = stream; el.play().catch(() => {}); }
                    }}
                    autoPlay
                    playsInline
                />
            )}
        </div>
    );
};

const LocalTile = ({
    localStreamRef,
    isVideoOff,
}: {
    localStreamRef: React.RefObject<MediaStream | null>;
    isVideoOff: boolean;
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [, setVideoVersion] = useState(0);
    const stream = localStreamRef.current;

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.srcObject = stream ?? null;
            if (stream) {
                videoRef.current.play().catch(() => {});
            }
        }
    }, [stream]);

    useEffect(() => {
        if (!stream) return;
        const bump = () => setVideoVersion(v => v + 1);
        const tracks = stream.getVideoTracks();
        tracks.forEach(track => {
            track.addEventListener('mute', bump);
            track.addEventListener('unmute', bump);
            track.addEventListener('ended', bump);
        });
        const onAdd = () => bump();
        const onRemove = () => bump();
        stream.addEventListener('addtrack', onAdd);
        stream.addEventListener('removetrack', onRemove);
        return () => {
            tracks.forEach(track => {
                track.removeEventListener('mute', bump);
                track.removeEventListener('unmute', bump);
                track.removeEventListener('ended', bump);
            });
            stream.removeEventListener('addtrack', onAdd);
            stream.removeEventListener('removetrack', onRemove);
        };
    }, [stream]);

    const hasLocalVideo = !!(!isVideoOff && stream && stream.getVideoTracks().some(
        t => t.enabled && t.readyState === 'live' && !t.muted
    ));

    return (
        <div className="GroupCall-Tile GroupCall-Tile--local">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="GroupCall-Tile-Video"
                style={{ display: hasLocalVideo ? 'block' : 'none' }}
            />
            {!hasLocalVideo && (
                <div className="GroupCall-Tile-Fallback">
                    <div className="GroupCall-Tile-Avatar">
                        <Avatar avatar={undefined} name="Вы" size={64} />
                    </div>
                    <div className="GroupCall-Tile-NoVideo">
                        <I_VIDEOCAM_OFF />
                    </div>
                </div>
            )}
            <div className="GroupCall-Tile-Name">Вы</div>
        </div>
    );
};

const CallModal = ({
    callState, callType, remoteParty, isMuted, isVideoOff, isScreenSharing,
    hasRemoteVideo, isMinimized, duration, noiseSuppression, connectionQuality,
    localVideoRef, remoteVideoRef, remoteAudioRef,
    onAccept, onDecline, onEnd, onToggleMute, onToggleVideo,
    onToggleScreenShare, onToggleNoise, onMinimize,

    isGroup, groupName, groupCallState, groupParticipants, groupParticipantStates, groupParticipantVideoEnabled, groupStreams, localStreamRef,
    onGroupJoin, onGroupDecline, onGroupLeave, onGroupToggleMute, onGroupToggleVideo, onGroupToggleScreenShare,
    groupIsMuted, groupIsVideoOff, groupIsScreenSharing,
}: CallModalProps) => {
    const { t } = useTranslation();

    // === ГРУППОВОЙ ЗВОНОК ===
    if (isGroup) {
        if (!groupCallState || groupCallState === 'idle') return null;

        const participantList = groupParticipants ? Array.from(groupParticipants.values()) : [];
        const getParticipantStatus = (uid: number): 'calling' | 'answering' | 'connected' => {
            const byState = groupParticipantStates?.get(uid);
            if (byState) return byState;
            if (groupStreams?.has(uid)) return 'connected';
            return 'calling';
        };
        const connectedCount = participantList.reduce((acc, p) => (
            getParticipantStatus(p.id) === 'connected' ? acc + 1 : acc
        ), 1);
        const pendingCount = participantList.filter(p => getParticipantStatus(p.id) !== 'connected').length;


        if (groupCallState === 'calling') {
            return (
                <AnimatePresence>
                    <motion.div
                        className="Call-Overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="Call-Modal"
                            initial={{ scale: 0.92, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.92, opacity: 0, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        >
                            <div className="Call-Body">
                                <div className="Call-Avatar-Container">
                                    <div className="Call-Wave Call-Wave--1" />
                                    <div className="Call-Wave Call-Wave--2" />
                                    <div className="Call-Avatar-Inner">
                                        <Avatar avatar={undefined} name={groupName ?? ''} />
                                    </div>
                                </div>
                                <div className="Call-Name">{groupName}</div>
                                <div className="Call-Status">{t('calling')}</div>
                            </div>
                            <div className="Call-Controls">
                                <button className="Call-Btn Call-Btn--lg Call-Btn--end" onClick={onGroupLeave}>
                                    <I_CALL_END />
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                </AnimatePresence>
            );
        }

        if (groupCallState === 'incoming') {
            return (
                <AnimatePresence>
                    <motion.div
                        className="Call-Overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="Call-Modal"
                            initial={{ scale: 0.92, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.92, opacity: 0, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        >
                            <div className="Call-Body">
                                <div className="Call-Avatar-Container">
                                    <div className="Call-Wave Call-Wave--incoming-1" />
                                    <div className="Call-Wave Call-Wave--incoming-2" />
                                    <div className="Call-Avatar-Inner">
                                        <Avatar avatar={undefined} name={groupName ?? ''} />
                                    </div>
                                </div>
                                <div className="Call-Name">{groupName}</div>
                                <div className="Call-Status">
                                    {callType === 'video' ? t('incoming_video_call') : t('incoming_audio_call')}
                                </div>
                            </div>
                            <div className="Call-Controls">
                                <button className="Call-Btn Call-Btn--lg Call-Btn--end" onClick={onGroupDecline}>
                                    <I_CALL_END />
                                </button>
                                <div style={{ width: 32 }} />
                                <button className="Call-Btn Call-Btn--lg Call-Btn--accept" onClick={onGroupJoin}>
                                    {callType === 'video' ? <I_VIDEO /> : <I_CALL />}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                </AnimatePresence>
            );
        }

        return (
            <AnimatePresence>
                <motion.div
                    className="Call-Overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <motion.div
                        className="Call-Modal Call-Modal--group"
                        initial={{ scale: 0.92, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.92, opacity: 0, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    >
                        <div className="Call-Body Call-Body--group-header">
                            <div className="Call-Name">{groupName}</div>
                            <div className="Call-Status">
                                {connectedCount} {t('participants_short')}
                                {pendingCount > 0 ? ` • +${pendingCount} ${t('connecting_short')}` : ''}
                            </div>
                        </div>

                        <div className="GroupCall-Grid">
                            {localStreamRef && (
                                <LocalTile localStreamRef={localStreamRef} isVideoOff={groupIsVideoOff ?? true} />
                            )}
                            {participantList.map(p => (
                                <ParticipantTile
                                    key={p.id}
                                    participant={p}
                                    stream={groupStreams?.get(p.id)}
                                    status={getParticipantStatus(p.id)}
                                    videoEnabled={groupParticipantVideoEnabled?.get(p.id)}
                                    pendingLabel={t('calling')}
                                />
                            ))}
                        </div>

                        <div className="Call-Controls">
                            <button
                                className={`Call-Btn Call-Btn--md ${groupIsMuted ? 'Call-Btn--muted' : 'Call-Btn--control'}`}
                                onClick={onGroupToggleMute}
                                title={groupIsMuted ? t('unmute') : t('mute')}
                            >
                                {groupIsMuted ? <I_MIC_OFF /> : <I_MICROPHONE />}
                            </button>
                            <button
                                className={`Call-Btn Call-Btn--md ${groupIsVideoOff ? 'Call-Btn--muted' : 'Call-Btn--control'}`}
                                onClick={onGroupToggleVideo}
                            >
                                {groupIsVideoOff ? <I_VIDEOCAM_OFF /> : <I_VIDEO />}
                            </button>
                            <button
                                className={`Call-Btn Call-Btn--md ${groupIsScreenSharing ? 'Call-Btn--active' : 'Call-Btn--control'}`}
                                onClick={onGroupToggleScreenShare}
                                title={groupIsScreenSharing ? t('stop_screen_share') : t('screen_share')}
                            >
                                <I_SCREEN_SHARE />
                            </button>
                            <button className="Call-Btn Call-Btn--lg Call-Btn--end" onClick={onGroupLeave}>
                                <I_CALL_END />
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            </AnimatePresence>
        );
    }

    if (callState === 'idle') return null;

    const showVideoArea = callState === 'connected' && (hasRemoteVideo || (callType === 'video' && !isVideoOff));

    if (isMinimized && callState === 'connected') {
        return (
            <motion.div
                className="Call-Minimized"
                initial={{ opacity: 0, y: 50, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 50, scale: 0.8 }}
                onClick={() => onMinimize(false)}
            >
                <audio ref={remoteAudioRef} autoPlay playsInline />
                <video ref={remoteVideoRef} autoPlay playsInline muted style={{ display: 'none' }} />
                <video ref={localVideoRef} autoPlay playsInline muted style={{ display: 'none' }} />
                <div className="Call-Minimized_Avatar">
                    <div className="Call-Minimized_Wave" />
                    <Avatar avatar={remoteParty?.avatar} name={remoteParty?.name ?? ''} />
                </div>
                <div className="Call-Minimized_Info">
                    <div className="Call-Minimized_Name">{remoteParty?.name}</div>
                    <div className="Call-Minimized_Duration">{formatDuration(duration)}</div>
                </div>
                <div className="Call-Minimized_Actions" onClick={e => e.stopPropagation()}>
                    <button
                        className={`Call-Btn Call-Btn--sm ${isMuted ? 'Call-Btn--muted' : 'Call-Btn--control'}`}
                        onClick={onToggleMute}
                    >
                        {isMuted ? <I_MIC_OFF /> : <I_MICROPHONE />}
                    </button>
                    <button className="Call-Btn Call-Btn--sm Call-Btn--end" onClick={onEnd}>
                        <I_CALL_END />
                    </button>
                </div>
            </motion.div>
        );
    }

    return (
        <AnimatePresence>
            <motion.div
                className="Call-Overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <audio ref={remoteAudioRef} autoPlay playsInline />

                <motion.div
                    className={`Call-Modal ${showVideoArea ? 'Call-Modal--video' : ''}`}
                    initial={{ scale: 0.92, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.92, opacity: 0, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                >
                        {showVideoArea ? (
                            <div className="Call-Video-Area">
                                {hasRemoteVideo ? (
                                    <video ref={remoteVideoRef} autoPlay playsInline muted className="Call-Video-Remote" />
                                ) : (
                                    <div className="Call-Video-NoRemote">
                                        <I_VIDEOCAM_OFF />
                                        <span>{remoteParty?.name}</span>
                                        <video ref={remoteVideoRef} autoPlay playsInline muted style={{ display: 'none' }} />
                                    </div>
                                )}
                                <div className="Call-Video-PIP">
                                    <video ref={localVideoRef} autoPlay playsInline muted className="Call-Video-Local" />
                                </div>
                                <div className="Call-Video-Timer">{formatDuration(duration)}</div>
                                <div className="Call-Video-TopRight">
                                    <button className="Call-Btn Call-Btn--sm Call-Btn--control" onClick={() => onMinimize(true)}>
                                        <I_MINIMIZE />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="Call-Body">
                                {callState === 'connected' && (
                                    <div style={{ position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#666' }}>
                                        <div style={{ width: '12px', height: '12px' }}><I_LOCK /></div>
                                        <span>Звонок защищен</span>
                                    </div>
                                )}

                                {callState === 'connected' && (
                                    <button className="Call-MinimizeBtn" onClick={() => onMinimize(true)}>
                                        <I_MINIMIZE />
                                    </button>
                                )}

                                <div className="Call-Avatar-Container">
                                    {(callState === 'calling' || callState === 'connected') && (
                                        <>
                                            <div className="Call-Wave Call-Wave--1" />
                                            <div className="Call-Wave Call-Wave--2" />
                                        </>
                                    )}
                                    {callState === 'incoming' && (
                                        <>
                                            <div className="Call-Wave Call-Wave--incoming-1" />
                                            <div className="Call-Wave Call-Wave--incoming-2" />
                                        </>
                                    )}
                                    <div className="Call-Avatar-Inner">
                                        <Avatar
                                            avatar={remoteParty?.avatar}
                                            name={remoteParty?.name ?? ''}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                    <div className="Call-Name">{remoteParty?.name}</div>
                                    {callState === 'connected' && (
                                        <div style={{ width: '16px', height: '16px' }}>
                                            <I_SIGNAL_QUALITY quality={connectionQuality} />
                                        </div>
                                    )}
                                </div>
                                <div className="Call-Status">
                                    {callState === 'calling' && t('calling')}
                                    {callState === 'incoming' && (callType === 'video' ? t('incoming_video_call') : t('incoming_audio_call'))}
                                    {callState === 'connected' && formatDuration(duration)}
                                    {callState === 'ended' && t('call_ended')}
                                </div>

                                {callType === 'video' && callState === 'calling' && (
                                    <div className="Call-LocalPreview">
                                        <video ref={localVideoRef} autoPlay playsInline muted className="Call-LocalPreview-Video" />
                                    </div>
                                )}

                                <video ref={remoteVideoRef} autoPlay playsInline muted style={{ display: 'none' }} />
                            </div>
                        )}

                        {callState !== 'ended' && <div className="Call-Controls">
                            {callState === 'incoming' && (
                                <>
                                    <button className="Call-Btn Call-Btn--lg Call-Btn--end" onClick={onDecline}>
                                        <I_CALL_END />
                                    </button>
                                    <div style={{ width: 32 }} />
                                    <button className="Call-Btn Call-Btn--lg Call-Btn--accept" onClick={onAccept}>
                                        {callType === 'video' ? <I_VIDEO /> : <I_CALL />}
                                    </button>
                                </>
                            )}

                            {callState === 'calling' && (
                                <button className="Call-Btn Call-Btn--lg Call-Btn--end" onClick={onEnd}>
                                    <I_CALL_END />
                                </button>
                            )}

                            {callState === 'connected' && (
                                <>
                                    <button
                                        className={`Call-Btn Call-Btn--md ${isMuted ? 'Call-Btn--muted' : 'Call-Btn--control'}`}
                                        onClick={onToggleMute}
                                        title={isMuted ? t('unmute') : t('mute')}
                                    >
                                        {isMuted ? <I_MIC_OFF /> : <I_MICROPHONE />}
                                    </button>

                                    <button
                                        className={`Call-Btn Call-Btn--md ${isVideoOff ? 'Call-Btn--muted' : 'Call-Btn--control'}`}
                                        onClick={onToggleVideo}
                                    >
                                        {isVideoOff ? <I_VIDEOCAM_OFF /> : <I_VIDEO />}
                                    </button>

                                    <button
                                        className={`Call-Btn Call-Btn--md ${isScreenSharing ? 'Call-Btn--active' : 'Call-Btn--control'}`}
                                        onClick={onToggleScreenShare}
                                        title={isScreenSharing ? t('stop_screen_share') : t('screen_share')}
                                    >
                                        <I_SCREEN_SHARE />
                                    </button>

                                    <button
                                        className={`Call-Btn Call-Btn--md ${noiseSuppression ? 'Call-Btn--active' : 'Call-Btn--control'}`}
                                        onClick={onToggleNoise}
                                        title={t('noise_suppression')}
                                    >
                                        <I_NOISEGATE active={noiseSuppression} />
                                    </button>

                                    <button className="Call-Btn Call-Btn--lg Call-Btn--end" onClick={onEnd}>
                                        <I_CALL_END />
                                    </button>
                                </>
                            )}

                        </div>}
                    </motion.div>
                </motion.div>
        </AnimatePresence>
    );
};

export default CallModal;
