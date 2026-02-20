/**
 * useGroupCall Hook
 *
 * React hook for managing group call state in components.
 *
 * @package io.estream.polymessenger
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  GroupCallManager,
  GroupCall,
  GroupParticipant,
} from '../services/GroupCallManager';
import { CallMetrics, CallType } from '../services/CallManager';

interface UseGroupCallReturn {
  call: GroupCall | null;
  participants: GroupParticipant[];
  activeSpeakerId: string | null;
  metrics: CallMetrics | null;

  // Actions
  createCall: (title: string, callType: CallType, participantIds: string[]) => Promise<void>;
  joinCall: (callId: string) => Promise<void>;
  leaveCall: () => Promise<void>;
  toggleMute: () => Promise<void>;
  toggleVideo: () => Promise<void>;
  toggleSpeaker: () => Promise<void>;
  flipCamera: () => Promise<void>;
  muteParticipant: (participantId: string) => Promise<void>;
  removeParticipant: (participantId: string) => Promise<void>;

  // State
  isMuted: boolean;
  isVideoEnabled: boolean;
  isSpeakerOn: boolean;
  isHost: boolean;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useGroupCall(): UseGroupCallReturn {
  const [call, setCall] = useState<GroupCall | null>(null);
  const [participants, setParticipants] = useState<GroupParticipant[]>([]);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<CallMetrics | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unsubscribesRef = useRef<(() => void)[]>([]);
  const callIdRef = useRef<string | null>(null);

  const subscribeToCall = useCallback((callId: string) => {
    // Clean up previous subscriptions
    unsubscribesRef.current.forEach((unsub) => unsub());
    unsubscribesRef.current = [];
    callIdRef.current = callId;

    // Subscribe to call updates
    const callUnsub = GroupCallManager.onCallUpdate(callId, (updatedCall) => {
      setCall(updatedCall);
      setParticipants(updatedCall.participants);
    });

    // Subscribe to active speaker
    const speakerUnsub = GroupCallManager.onActiveSpeakerChange(callId, (speakerId) => {
      setActiveSpeakerId(speakerId);
    });

    // Subscribe to metrics
    const metricsUnsub = GroupCallManager.onMetricsUpdate(callId, (newMetrics) => {
      setMetrics(newMetrics);
    });

    unsubscribesRef.current = [callUnsub, speakerUnsub, metricsUnsub];
  }, []);

  useEffect(() => {
    return () => {
      unsubscribesRef.current.forEach((unsub) => unsub());
    };
  }, []);

  const createCall = useCallback(
    async (title: string, callType: CallType, participantIds: string[]) => {
      setIsLoading(true);
      setError(null);
      try {
        const newCall = await GroupCallManager.createCall(title, callType, participantIds);
        setCall(newCall);
        setParticipants(newCall.participants);
        setIsVideoEnabled(callType === 'video');
        subscribeToCall(newCall.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create call');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [subscribeToCall]
  );

  const joinCall = useCallback(
    async (callId: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const joinedCall = await GroupCallManager.joinCall(callId);
        setCall(joinedCall);
        setParticipants(joinedCall.participants);
        setIsVideoEnabled(joinedCall.callType === 'video');
        subscribeToCall(joinedCall.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to join call');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [subscribeToCall]
  );

  const leaveCall = useCallback(async () => {
    if (!callIdRef.current) return;
    setIsLoading(true);
    try {
      await GroupCallManager.leaveCall(callIdRef.current);
      setCall(null);
      setParticipants([]);
      setMetrics(null);
      setActiveSpeakerId(null);
      unsubscribesRef.current.forEach((unsub) => unsub());
      unsubscribesRef.current = [];
      callIdRef.current = null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to leave call');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const toggleMute = useCallback(async () => {
    if (!callIdRef.current) return;
    const newMuted = !isMuted;
    await GroupCallManager.toggleMute(callIdRef.current, newMuted);
    setIsMuted(newMuted);
  }, [isMuted]);

  const toggleVideo = useCallback(async () => {
    if (!callIdRef.current) return;
    const newEnabled = !isVideoEnabled;
    await GroupCallManager.toggleVideo(callIdRef.current, newEnabled);
    setIsVideoEnabled(newEnabled);
  }, [isVideoEnabled]);

  const toggleSpeaker = useCallback(async () => {
    const newSpeaker = !isSpeakerOn;
    await GroupCallManager.toggleSpeaker(newSpeaker);
    setIsSpeakerOn(newSpeaker);
  }, [isSpeakerOn]);

  const flipCamera = useCallback(async () => {
    if (!callIdRef.current) return;
    await GroupCallManager.flipCamera(callIdRef.current);
  }, []);

  const muteParticipant = useCallback(async (participantId: string) => {
    if (!callIdRef.current) return;
    await GroupCallManager.muteParticipant(callIdRef.current, participantId);
  }, []);

  const removeParticipant = useCallback(async (participantId: string) => {
    if (!callIdRef.current) return;
    await GroupCallManager.removeParticipant(callIdRef.current, participantId);
  }, []);

  return {
    call,
    participants,
    activeSpeakerId,
    metrics,
    createCall,
    joinCall,
    leaveCall,
    toggleMute,
    toggleVideo,
    toggleSpeaker,
    flipCamera,
    muteParticipant,
    removeParticipant,
    isMuted,
    isVideoEnabled,
    isSpeakerOn,
    isHost: call?.isHost ?? false,
    isConnected: !!call?.connectedTime,
    isLoading,
    error,
  };
}

export default useGroupCall;


