/**
 * useCallKit Hook
 *
 * React hook for integrating with native CallKit (iOS) and Telecom (Android).
 * Handles system-level call UI and VoIP push notifications.
 *
 * @package io.estream.polymessenger
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  callKitService,
  IncomingCallEvent,
  CallAnsweredEvent,
  CallEndedEvent,
  VoIPTokenEvent,
} from '../services/callkit';

// ============================================================================
// Types
// ============================================================================

export interface UseCallKitReturn {
  // State
  isAvailable: boolean;
  hasActiveCall: boolean;
  activeCallUUID: string | null;
  voipToken: string | null;
  isAudioSessionActive: boolean;

  // Incoming calls
  reportIncomingCall: (
    uuid: string,
    callerName: string,
    callerId: string,
    hasVideo: boolean
  ) => Promise<boolean>;

  // Outgoing calls
  startCall: (
    recipientName: string,
    recipientId: string,
    hasVideo: boolean
  ) => Promise<string | null>; // Returns UUID
  reportCallConnected: (uuid: string) => void;

  // Call control
  endCall: (uuid?: string) => Promise<boolean>;
  setMuted: (muted: boolean) => void;
  setHeld: (held: boolean) => void;
  updateCall: (callerName: string, hasVideo: boolean) => void;
  endAllCalls: () => void;

  // Utility
  generateUUID: () => string;
}

export interface UseCallKitOptions {
  onIncomingCall?: (event: IncomingCallEvent) => void;
  onCallAnswered?: (event: CallAnsweredEvent) => void;
  onCallEnded?: (event: CallEndedEvent) => void;
  onVoIPToken?: (token: string) => void;
  onAudioSessionActivated?: () => void;
  onAudioSessionDeactivated?: () => void;
}

// ============================================================================
// Hook
// ============================================================================

export function useCallKit(options: UseCallKitOptions = {}): UseCallKitReturn {
  const [isAvailable] = useState(() => callKitService.isAvailable());
  const [hasActiveCall, setHasActiveCall] = useState(false);
  const [activeCallUUID, setActiveCallUUID] = useState<string | null>(null);
  const [voipToken, setVoipToken] = useState<string | null>(null);
  const [isAudioSessionActive, setIsAudioSessionActive] = useState(false);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Setup event listeners
  useEffect(() => {
    if (!isAvailable) return;

    const handleIncomingCall = (event: IncomingCallEvent) => {
      setHasActiveCall(true);
      setActiveCallUUID(event.uuid);
      optionsRef.current.onIncomingCall?.(event);
    };

    const handleCallAnswered = (event: CallAnsweredEvent) => {
      optionsRef.current.onCallAnswered?.(event);
    };

    const handleCallEnded = (event: CallEndedEvent) => {
      setHasActiveCall(false);
      setActiveCallUUID(null);
      optionsRef.current.onCallEnded?.(event);
    };

    const handleVoIPToken = (event: VoIPTokenEvent) => {
      setVoipToken(event.token);
      optionsRef.current.onVoIPToken?.(event.token);
    };

    const handleAudioActivated = () => {
      setIsAudioSessionActive(true);
      optionsRef.current.onAudioSessionActivated?.();
    };

    const handleAudioDeactivated = () => {
      setIsAudioSessionActive(false);
      optionsRef.current.onAudioSessionDeactivated?.();
    };

    callKitService.on('incomingCall', handleIncomingCall);
    callKitService.on('callAnswered', handleCallAnswered);
    callKitService.on('callEnded', handleCallEnded);
    callKitService.on('voipToken', handleVoIPToken);
    callKitService.on('audioSessionActivated', handleAudioActivated);
    callKitService.on('audioSessionDeactivated', handleAudioDeactivated);

    // Get initial VoIP token
    callKitService.getVoIPToken().then((token) => {
      if (token) {
        setVoipToken(token);
      }
    });

    // Check for active call on mount
    callKitService.hasActiveCall().then(setHasActiveCall);
    callKitService.getActiveCallUUID().then(setActiveCallUUID);

    return () => {
      callKitService.off('incomingCall', handleIncomingCall);
      callKitService.off('callAnswered', handleCallAnswered);
      callKitService.off('callEnded', handleCallEnded);
      callKitService.off('voipToken', handleVoIPToken);
      callKitService.off('audioSessionActivated', handleAudioActivated);
      callKitService.off('audioSessionDeactivated', handleAudioDeactivated);
    };
  }, [isAvailable]);

  // Report incoming call
  const reportIncomingCall = useCallback(
    async (
      uuid: string,
      callerName: string,
      callerId: string,
      hasVideo: boolean
    ): Promise<boolean> => {
      if (!isAvailable) return false;

      try {
        const result = await callKitService.reportIncomingCall(
          uuid,
          callerName,
          callerId,
          hasVideo
        );
        if (result) {
          setHasActiveCall(true);
          setActiveCallUUID(uuid);
        }
        return result;
      } catch (error) {
        console.error('[useCallKit] Failed to report incoming call:', error);
        return false;
      }
    },
    [isAvailable]
  );

  // Start outgoing call
  const startCall = useCallback(
    async (
      recipientName: string,
      recipientId: string,
      hasVideo: boolean
    ): Promise<string | null> => {
      if (!isAvailable) return null;

      const uuid = callKitService.generateUUID();

      try {
        const result = await callKitService.startCall(
          uuid,
          recipientName,
          recipientId,
          hasVideo
        );
        if (result) {
          setHasActiveCall(true);
          setActiveCallUUID(uuid);
          return uuid;
        }
        return null;
      } catch (error) {
        console.error('[useCallKit] Failed to start call:', error);
        return null;
      }
    },
    [isAvailable]
  );

  // Report call connected
  const reportCallConnected = useCallback(
    (uuid: string) => {
      if (isAvailable) {
        callKitService.reportCallConnected(uuid);
      }
    },
    [isAvailable]
  );

  // End call
  const endCall = useCallback(
    async (uuid?: string): Promise<boolean> => {
      const targetUUID = uuid || activeCallUUID;
      if (!isAvailable || !targetUUID) return false;

      try {
        const result = await callKitService.endCall(targetUUID);
        if (result) {
          setHasActiveCall(false);
          setActiveCallUUID(null);
        }
        return result;
      } catch (error) {
        console.error('[useCallKit] Failed to end call:', error);
        return false;
      }
    },
    [isAvailable, activeCallUUID]
  );

  // Set muted
  const setMuted = useCallback(
    (muted: boolean) => {
      if (isAvailable && activeCallUUID) {
        callKitService.setMuted(activeCallUUID, muted);
      }
    },
    [isAvailable, activeCallUUID]
  );

  // Set held
  const setHeld = useCallback(
    (held: boolean) => {
      if (isAvailable && activeCallUUID) {
        callKitService.setHeld(activeCallUUID, held);
      }
    },
    [isAvailable, activeCallUUID]
  );

  // Update call
  const updateCall = useCallback(
    (callerName: string, hasVideo: boolean) => {
      if (isAvailable && activeCallUUID) {
        callKitService.updateCall(activeCallUUID, callerName, hasVideo);
      }
    },
    [isAvailable, activeCallUUID]
  );

  // End all calls
  const endAllCalls = useCallback(() => {
    if (isAvailable) {
      callKitService.endAllCalls();
      setHasActiveCall(false);
      setActiveCallUUID(null);
    }
  }, [isAvailable]);

  // Generate UUID
  const generateUUID = useCallback(() => {
    return callKitService.generateUUID();
  }, []);

  return {
    isAvailable,
    hasActiveCall,
    activeCallUUID,
    voipToken,
    isAudioSessionActive,
    reportIncomingCall,
    startCall,
    reportCallConnected,
    endCall,
    setMuted,
    setHeld,
    updateCall,
    endAllCalls,
    generateUUID,
  };
}

export default useCallKit;


