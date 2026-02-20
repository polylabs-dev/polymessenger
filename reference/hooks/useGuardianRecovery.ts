/**
 * useGuardianRecovery Hook
 *
 * React hook for guardian-based account recovery using Lattice Amplification.
 *
 * @example
 * ```tsx
 * function RecoveryScreen() {
 *   const {
 *     startRecovery,
 *     recoveryStatus,
 *     signaturesCollected,
 *     threshold,
 *     isComplete,
 *   } = useGuardianRecovery();
 *
 *   return (
 *     <View>
 *       <Text>Recovery: {signaturesCollected}/{threshold} guardians</Text>
 *       <ProgressBar progress={signaturesCollected / threshold} />
 *       {isComplete && <Text>Recovery complete!</Text>}
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
import { Guardian, RecoveryRequest } from '../types/threshold';
import { emitTelemetry, TelemetryEventTypes } from '../services/telemetry';

export type RecoveryStatus =
  | 'idle'
  | 'requesting'
  | 'waiting'
  | 'collecting'
  | 'combining'
  | 'complete'
  | 'failed'
  | 'timeout';

export interface GuardianStatus {
  /** Guardian info */
  guardian: Guardian;
  /** Whether guardian has responded */
  responded: boolean;
  /** Response timestamp */
  respondedAt?: number;
  /** Error if guardian failed */
  error?: string;
}

export interface UseGuardianRecoveryOptions {
  /** List of guardians for recovery */
  guardians: Guardian[];
  /** Recovery threshold (k) */
  threshold: number;
  /** Timeout for guardian responses in ms */
  timeoutMs?: number;
  /** Callback when recovery completes */
  onComplete?: (recoveryKey: Uint8Array) => void;
  /** Callback when recovery fails */
  onFailed?: (error: string) => void;
}

export interface UseGuardianRecoveryResult {
  /** Start the recovery process */
  startRecovery: (recoveryData: Uint8Array) => Promise<string>;
  /** Current recovery status */
  recoveryStatus: RecoveryStatus;
  /** Number of signatures collected */
  signaturesCollected: number;
  /** Required threshold */
  threshold: number;
  /** Total guardians */
  total: number;
  /** Guardian statuses */
  guardianStatuses: GuardianStatus[];
  /** Whether recovery is complete */
  isComplete: boolean;
  /** Whether waiting for guardians */
  isWaiting: boolean;
  /** Error message if failed */
  error: string | null;
  /** Recovery key (if complete) */
  recoveryKey: Uint8Array | null;
  /** Cancel recovery */
  cancel: () => void;
  /** Reset state */
  reset: () => void;
}

/**
 * Hook for guardian-based account recovery
 */
export function useGuardianRecovery(
  options: UseGuardianRecoveryOptions
): UseGuardianRecoveryResult {
  const {
    guardians,
    threshold,
    timeoutMs = 120000, // 2 minutes default
    onComplete,
    onFailed,
  } = options;

  const total = guardians.length;

  const [recoveryStatus, setRecoveryStatus] = useState<RecoveryStatus>('idle');
  const [guardianStatuses, setGuardianStatuses] = useState<GuardianStatus[]>(
    guardians.map((g) => ({ guardian: g, responded: false }))
  );
  const [signaturesCollected, setSignaturesCollected] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [recoveryKey, setRecoveryKey] = useState<Uint8Array | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const isComplete = recoveryStatus === 'complete';
  const isWaiting =
    recoveryStatus === 'waiting' || recoveryStatus === 'collecting';

  // Handle timeout
  useEffect(() => {
    if (!isWaiting) return;

    const timeoutId = setTimeout(() => {
      setRecoveryStatus('timeout');
      setError('Recovery timed out waiting for guardians');
      onFailed?.('Recovery timed out');
    }, timeoutMs);

    return () => clearTimeout(timeoutId);
  }, [isWaiting, timeoutMs, onFailed]);

  // Listen for guardian responses
  useEffect(() => {
    if (!sessionId || !isWaiting) return;

    const unsubscribe = thresholdSigningService.onGuardianResponse(
      sessionId,
      (guardianIndex, signature) => {
        // Update guardian status
        setGuardianStatuses((prev) =>
          prev.map((gs, idx) =>
            idx === guardianIndex
              ? { ...gs, responded: true, respondedAt: Date.now() }
              : gs
          )
        );

        setSignaturesCollected((prev) => {
          const newCount = prev + 1;

          // Emit telemetry
          emitTelemetry(TelemetryEventTypes.GUARDIAN_RESPONSE, {
            sessionId,
            guardianIndex,
            signaturesCollected: newCount,
            threshold,
          });

          // Check if threshold reached
          if (newCount >= threshold) {
            setRecoveryStatus('combining');
          }

          return newCount;
        });
      }
    );

    return unsubscribe;
  }, [sessionId, isWaiting, threshold]);

  // Combine signatures when threshold reached
  useEffect(() => {
    if (recoveryStatus !== 'combining' || !sessionId) return;

    const combine = async () => {
      try {
        const key = await thresholdSigningService.completeRecovery(sessionId);
        setRecoveryKey(key);
        setRecoveryStatus('complete');
        onComplete?.(key);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Combine failed';
        setError(errorMsg);
        setRecoveryStatus('failed');
        onFailed?.(errorMsg);
      }
    };

    combine();
  }, [recoveryStatus, sessionId, onComplete, onFailed]);

  const startRecovery = useCallback(
    async (recoveryData: Uint8Array): Promise<string> => {
      setRecoveryStatus('requesting');
      setError(null);
      setSignaturesCollected(0);
      setRecoveryKey(null);

      // Reset guardian statuses
      setGuardianStatuses(guardians.map((g) => ({ guardian: g, responded: false })));

      try {
        // Create recovery request
        const request: RecoveryRequest = {
          guardians,
          threshold,
          recoveryData,
          timestamp: Date.now(),
        };

        // Start recovery session
        const id = await thresholdSigningService.startRecovery(request);
        setSessionId(id);

        // Emit telemetry
        emitTelemetry(TelemetryEventTypes.GUARDIAN_REQUEST, {
          sessionId: id,
          threshold,
          total: guardians.length,
          type: 'recovery',
        });

        setRecoveryStatus('waiting');
        return id;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to start recovery';
        setError(errorMsg);
        setRecoveryStatus('failed');
        onFailed?.(errorMsg);
        throw err;
      }
    },
    [guardians, threshold, onFailed]
  );

  const cancel = useCallback(() => {
    if (sessionId) {
      thresholdSigningService.cancelSession(sessionId);
    }
    setRecoveryStatus('failed');
    setError('Cancelled by user');
    onFailed?.('Cancelled by user');
  }, [sessionId, onFailed]);

  const reset = useCallback(() => {
    setRecoveryStatus('idle');
    setGuardianStatuses(guardians.map((g) => ({ guardian: g, responded: false })));
    setSignaturesCollected(0);
    setError(null);
    setRecoveryKey(null);
    setSessionId(null);
  }, [guardians]);

  return {
    startRecovery,
    recoveryStatus,
    signaturesCollected,
    threshold,
    total,
    guardianStatuses,
    isComplete,
    isWaiting,
    error,
    recoveryKey,
    cancel,
    reset,
  };
}

export default useGuardianRecovery;
