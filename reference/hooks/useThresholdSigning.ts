/**
 * useThresholdSigning Hook
 *
 * React hook for threshold signing operations using Lattice Amplification.
 *
 * @example
 * ```tsx
 * function ThresholdSigningComponent() {
 *   const {
 *     createSession,
 *     submitShare,
 *     session,
 *     isComplete,
 *   } = useThresholdSigning({ threshold: 3, total: 5 });
 *
 *   const handleSign = async () => {
 *     const data = new TextEncoder().encode('Critical operation');
 *     const sessionId = await createSession(data);
 *     // Guardians will submit their shares...
 *   };
 *
 *   return (
 *     <View>
 *       <Text>Shares: {session?.shares.length ?? 0} / {session?.threshold}</Text>
 *       {isComplete && <Text>Signature ready!</Text>}
 *     </View>
 *   );
 * }
 * ```
 *
 * @package io.estream.polymessenger
 * @issue #204
 */

import { useCallback, useEffect, useState } from 'react';
import {
  ThresholdSigningService,
  thresholdSigningService,
} from '../services/threshold';
import {
  ThresholdConfig,
  PartialSignature,
  Guardian,
} from '../types/threshold';
import { emitTelemetry, TelemetryEventTypes } from '../services/telemetry';

export interface ThresholdSession {
  /** Session ID */
  id: string;
  /** Data being signed */
  dataHash: string;
  /** Required threshold (k) */
  threshold: number;
  /** Total guardians (n) */
  total: number;
  /** Collected partial signatures */
  shares: PartialSignature[];
  /** Session status */
  status: 'pending' | 'collecting' | 'complete' | 'failed' | 'timeout';
  /** Combined signature (if complete) */
  combinedSignature?: Uint8Array;
  /** Created timestamp */
  createdAt: number;
  /** Completed timestamp */
  completedAt?: number;
  /** Error message if failed */
  error?: string;
}

export interface UseThresholdSigningOptions {
  /** Required threshold (k) */
  threshold: number;
  /** Total guardians (n) */
  total: number;
  /** Session timeout in ms */
  timeoutMs?: number;
  /** Auto-combine when threshold reached */
  autoCombine?: boolean;
}

export interface UseThresholdSigningResult {
  /** Create a new signing session */
  createSession: (data: Uint8Array) => Promise<string>;
  /** Submit a partial signature share */
  submitShare: (sessionId: string, share: PartialSignature) => Promise<void>;
  /** Get current session */
  session: ThresholdSession | null;
  /** Get combined signature (if complete) */
  combinedSignature: Uint8Array | null;
  /** Whether session is complete */
  isComplete: boolean;
  /** Whether currently collecting shares */
  isCollecting: boolean;
  /** Cancel current session */
  cancel: () => void;
  /** Reset state */
  reset: () => void;
}

/**
 * Hook for threshold signing operations
 */
export function useThresholdSigning(
  options: UseThresholdSigningOptions
): UseThresholdSigningResult {
  const {
    threshold,
    total,
    timeoutMs = 60000,
    autoCombine = true,
  } = options;

  const [session, setSession] = useState<ThresholdSession | null>(null);
  const [combinedSignature, setCombinedSignature] = useState<Uint8Array | null>(null);

  const isComplete = session?.status === 'complete';
  const isCollecting = session?.status === 'collecting';

  // Handle session timeout
  useEffect(() => {
    if (!session || session.status !== 'collecting') return;

    const timeoutId = setTimeout(() => {
      setSession((prev) =>
        prev
          ? {
              ...prev,
              status: 'timeout',
              error: 'Session timed out',
            }
          : null
      );
    }, timeoutMs);

    return () => clearTimeout(timeoutId);
  }, [session?.id, session?.status, timeoutMs]);

  const createSession = useCallback(
    async (data: Uint8Array): Promise<string> => {
      // Generate session ID
      const sessionId = `thresh_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 8)}`;

      // Create hash of data
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = new Uint8Array(hashBuffer);
      const dataHash = Array.from(hashArray)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      const newSession: ThresholdSession = {
        id: sessionId,
        dataHash,
        threshold,
        total,
        shares: [],
        status: 'collecting',
        createdAt: Date.now(),
      };

      setSession(newSession);

      // Start session in service
      await thresholdSigningService.startSession({
        sessionId,
        data,
        threshold,
        total,
      });

      // Emit telemetry
      emitTelemetry(TelemetryEventTypes.GUARDIAN_REQUEST, {
        sessionId,
        threshold,
        total,
      });

      return sessionId;
    },
    [threshold, total]
  );

  const submitShare = useCallback(
    async (sessionId: string, share: PartialSignature): Promise<void> => {
      if (!session || session.id !== sessionId) {
        throw new Error('Invalid session');
      }

      if (session.status !== 'collecting') {
        throw new Error(`Cannot submit to session in ${session.status} state`);
      }

      // Check for duplicate
      if (session.shares.some((s) => s.guardianIndex === share.guardianIndex)) {
        throw new Error(`Share from guardian ${share.guardianIndex} already received`);
      }

      // Add share
      const newShares = [...session.shares, share];

      setSession((prev) =>
        prev
          ? {
              ...prev,
              shares: newShares,
            }
          : null
      );

      // Emit telemetry
      emitTelemetry(TelemetryEventTypes.GUARDIAN_RESPONSE, {
        sessionId,
        guardianIndex: share.guardianIndex,
        sharesCollected: newShares.length,
        threshold,
      });

      // Check if threshold reached
      if (newShares.length >= threshold && autoCombine) {
        try {
          const combined = await thresholdSigningService.combineSignatures(
            sessionId,
            newShares
          );

          setCombinedSignature(combined);
          setSession((prev) =>
            prev
              ? {
                  ...prev,
                  status: 'complete',
                  combinedSignature: combined,
                  completedAt: Date.now(),
                }
              : null
          );
        } catch (error) {
          setSession((prev) =>
            prev
              ? {
                  ...prev,
                  status: 'failed',
                  error: error instanceof Error ? error.message : 'Combine failed',
                }
              : null
          );
        }
      }
    },
    [session, threshold, autoCombine]
  );

  const cancel = useCallback(() => {
    if (session) {
      thresholdSigningService.cancelSession(session.id);
      setSession((prev) =>
        prev
          ? {
              ...prev,
              status: 'failed',
              error: 'Cancelled by user',
            }
          : null
      );
    }
  }, [session]);

  const reset = useCallback(() => {
    setSession(null);
    setCombinedSignature(null);
  }, []);

  return {
    createSession,
    submitShare,
    session,
    combinedSignature,
    isComplete,
    isCollecting,
    cancel,
    reset,
  };
}

export default useThresholdSigning;
