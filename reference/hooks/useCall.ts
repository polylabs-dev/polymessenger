/**
 * useCall Hook
 *
 * React hook for managing call state in components.
 *
 * @package io.estream.polymessenger
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { CallManager, Call, CallType, CallState, CallOffer, CallMetrics } from '../services/CallManager';

interface UseCallReturn {
  currentCall: Call | null;
  incomingOffer: CallOffer | null;
  callState: CallState | null;
  callMetrics: CallMetrics | null;
  
  // Actions
  initiateCall: (contactId: string, contactName: string, callType: CallType) => Promise<void>;
  acceptCall: (callId: string) => Promise<void>;
  rejectCall: (callId: string) => Promise<void>;
  hangup: () => Promise<void>;
  toggleMute: () => Promise<void>;
  toggleVideo: () => Promise<void>;
  toggleSpeaker: () => Promise<void>;
  flipCamera: () => Promise<void>;
  
  // State
  isMuted: boolean;
  isVideoEnabled: boolean;
  isSpeakerOn: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useCall(): UseCallReturn {
  const [currentCall, setCurrentCall] = useState<Call | null>(null);
  const [incomingOffer, setIncomingOffer] = useState<CallOffer | null>(null);
  const [callMetrics, setCallMetrics] = useState<CallMetrics | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const unsubscribeRef = useRef<(() => void)[]>([]);

  useEffect(() => {
    // Subscribe to call state changes
    const stateUnsubscribe = CallManager.onCallStateChange((call) => {
      setCurrentCall(call);
      if (call.state === 'ended') {
        // Clean up after call ends
        setTimeout(() => {
          setCurrentCall(null);
          setCallMetrics(null);
          setIsMuted(false);
          setIsVideoEnabled(true);
          setIsSpeakerOn(false);
        }, 2000);
      }
    });

    // Subscribe to incoming offers
    const offerUnsubscribe = CallManager.onIncomingOffer((offer) => {
      setIncomingOffer(offer);
    });

    // Subscribe to metrics updates
    const metricsUnsubscribe = CallManager.onMetricsUpdate((metrics) => {
      setCallMetrics(metrics);
    });

    unsubscribeRef.current = [stateUnsubscribe, offerUnsubscribe, metricsUnsubscribe];

    return () => {
      unsubscribeRef.current.forEach((unsub) => unsub());
    };
  }, []);

  const initiateCall = useCallback(async (contactId: string, contactName: string, callType: CallType) => {
    setIsLoading(true);
    setError(null);
    try {
      await CallManager.initiateCall(contactId, contactName, callType);
      setIsVideoEnabled(callType === 'video');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate call');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const acceptCall = useCallback(async (callId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await CallManager.acceptCall(callId);
      setIncomingOffer(null);
      if (incomingOffer) {
        setIsVideoEnabled(incomingOffer.callType === 'video');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept call');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [incomingOffer]);

  const rejectCall = useCallback(async (callId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await CallManager.rejectCall(callId);
      setIncomingOffer(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject call');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const hangup = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await CallManager.hangup();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to hang up');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const toggleMute = useCallback(async () => {
    try {
      await CallManager.toggleMute(!isMuted);
      setIsMuted(!isMuted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle mute');
    }
  }, [isMuted]);

  const toggleVideo = useCallback(async () => {
    try {
      await CallManager.toggleVideo(!isVideoEnabled);
      setIsVideoEnabled(!isVideoEnabled);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle video');
    }
  }, [isVideoEnabled]);

  const toggleSpeaker = useCallback(async () => {
    try {
      await CallManager.toggleSpeaker(!isSpeakerOn);
      setIsSpeakerOn(!isSpeakerOn);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle speaker');
    }
  }, [isSpeakerOn]);

  const flipCamera = useCallback(async () => {
    try {
      await CallManager.flipCamera();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to flip camera');
    }
  }, []);

  return {
    currentCall,
    incomingOffer,
    callState: currentCall?.state || null,
    callMetrics,
    initiateCall,
    acceptCall,
    rejectCall,
    hangup,
    toggleMute,
    toggleVideo,
    toggleSpeaker,
    flipCamera,
    isMuted,
    isVideoEnabled,
    isSpeakerOn,
    isLoading,
    error,
  };
}

export default useCall;


