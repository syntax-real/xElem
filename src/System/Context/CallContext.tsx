import { createContext, useContext } from 'react';
import { useCall } from '../Hooks/useCall';
import { useGroupCall } from '../Hooks/useGroupCall';
import type { CallType, CallParty } from '../Hooks/useCall';
import CallModal from '../../Pages/Messenger/Elements/Components/CallModal';

interface CallContextValue {
    startCall: (target: CallParty, type?: CallType) => Promise<void>;
    callState: string;
    startGroupCall: (groupId: number, groupName: string, type: CallType, members: import('../Hooks/useGroupCall').GroupCallParticipant[]) => Promise<void>;
    groupCallState: string;
}

const CallContext = createContext<CallContextValue | null>(null);

export const CallProvider = ({ children }: { children: React.ReactNode }) => {
    const {
        callState, callType, remoteParty, isMuted, isVideoOff, isScreenSharing,
        hasRemoteVideo, isMinimized, duration, noiseSuppression, connectionQuality,
        localVideoRef, remoteVideoRef, remoteAudioRef,
        setIsMinimized,
        startCall, acceptIncoming, declineCall, endCallSafe,
        toggleMute, toggleVideo, toggleScreenShare, toggleNoiseSuppression,
    } = useCall();

    const {
        groupCallState, callType: groupCallType, groupName,
        participants, participantStates, participantVideoEnabled, streams, isMuted: gcMuted, isVideoOff: gcVideoOff, isScreenSharing: gcScreenSharing,
        localStreamRef,
        startGroupCall, joinGroupCall, declineGroupCall, leaveGroupCall,
        toggleMute: gcToggleMute, toggleVideo: gcToggleVideo, toggleScreenShare: gcToggleScreenShare,
    } = useGroupCall();

    return (
        <CallContext.Provider value={{ startCall, callState, startGroupCall, groupCallState }}>
            {children}
            {groupCallState === 'idle' && (
                <CallModal
                    callState={callState}
                    callType={callType}
                    remoteParty={remoteParty}
                    isMuted={isMuted}
                    isVideoOff={isVideoOff}
                    isScreenSharing={isScreenSharing}
                    hasRemoteVideo={hasRemoteVideo}
                    isMinimized={isMinimized}
                    duration={duration}
                    noiseSuppression={noiseSuppression}
                    connectionQuality={connectionQuality}
                    localVideoRef={localVideoRef}
                    remoteVideoRef={remoteVideoRef}
                    remoteAudioRef={remoteAudioRef}
                    onAccept={acceptIncoming}
                    onDecline={declineCall}
                    onEnd={endCallSafe}
                    onToggleMute={toggleMute}
                    onToggleVideo={toggleVideo}
                    onToggleScreenShare={toggleScreenShare}
                    onToggleNoise={toggleNoiseSuppression}
                    onMinimize={setIsMinimized}
                />
            )}
            {groupCallState !== 'idle' && (
                <CallModal
                    isGroup
                    groupCallState={groupCallState}
                    callType={groupCallType}
                    groupName={groupName}
                    groupParticipants={participants}
                    groupParticipantStates={participantStates}
                    groupParticipantVideoEnabled={participantVideoEnabled}
                    groupStreams={streams}
                    localStreamRef={localStreamRef}
                    groupIsMuted={gcMuted}
                    groupIsVideoOff={gcVideoOff}
                    groupIsScreenSharing={gcScreenSharing}
                    onGroupJoin={joinGroupCall}
                    onGroupDecline={declineGroupCall}
                    onGroupLeave={leaveGroupCall}
                    onGroupToggleMute={gcToggleMute}
                    onGroupToggleVideo={gcToggleVideo}
                    onGroupToggleScreenShare={gcToggleScreenShare}
                    callState={callState}
                    remoteParty={null}
                    isMuted={gcMuted}
                    isVideoOff={gcVideoOff}
                    isScreenSharing={gcScreenSharing}
                    hasRemoteVideo={false}
                    isMinimized={false}
                    duration={0}
                    noiseSuppression={false}
                    connectionQuality="unknown"
                    localVideoRef={localVideoRef}
                    remoteVideoRef={remoteVideoRef}
                    remoteAudioRef={remoteAudioRef}
                    onAccept={() => {}}
                    onDecline={() => {}}
                    onEnd={() => {}}
                    onToggleMute={gcToggleMute}
                    onToggleVideo={gcToggleVideo}
                    onToggleScreenShare={gcToggleScreenShare}
                    onToggleNoise={() => {}}
                    onMinimize={() => {}}
                />
            )}
        </CallContext.Provider>
    );
};

export const useCallContext = () => {
    const ctx = useContext(CallContext);
    if (!ctx) throw new Error('useCallContext must be used within CallProvider');
    return ctx;
};
