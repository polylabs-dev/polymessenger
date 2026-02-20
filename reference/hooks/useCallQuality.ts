/**
 * useCallQuality Hook
 *
 * React hook for monitoring and tracking call quality metrics.
 * Provides aggregated quality scores and historical data.
 *
 * @package io.estream.polymessenger
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { CallManager, CallMetrics } from '../services/CallManager';

interface QualitySnapshot {
  timestamp: number;
  latencyMs: number;
  packetLoss: number;
  jitterMs: number;
}

interface QualityStats {
  avgLatency: number;
  avgPacketLoss: number;
  avgJitter: number;
  minLatency: number;
  maxLatency: number;
  qualityScore: number; // 0-100
}

interface UseCallQualityReturn {
  currentMetrics: CallMetrics | null;
  qualityScore: number; // 0-100
  qualityLevel: 'excellent' | 'good' | 'fair' | 'poor';
  isConnected: boolean;
  history: QualitySnapshot[];
  stats: QualityStats | null;
  clearHistory: () => void;
}

const MAX_HISTORY_LENGTH = 60; // Keep 60 samples (1 minute at 1 sample/sec)

function calculateQualityScore(metrics: CallMetrics): number {
  // Weighted scoring based on latency, packet loss, and jitter
  const latencyScore = Math.max(0, 100 - metrics.latencyMs * 0.5);
  const packetLossScore = Math.max(0, 100 - metrics.packetLoss * 20);
  const jitterScore = Math.max(0, 100 - metrics.jitterMs);

  // Weights: latency 40%, packet loss 40%, jitter 20%
  const score = latencyScore * 0.4 + packetLossScore * 0.4 + jitterScore * 0.2;
  return Math.round(Math.max(0, Math.min(100, score)));
}

function getQualityLevel(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  return 'poor';
}

export function useCallQuality(): UseCallQualityReturn {
  const [currentMetrics, setCurrentMetrics] = useState<CallMetrics | null>(null);
  const [history, setHistory] = useState<QualitySnapshot[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Subscribe to metrics updates
    unsubscribeRef.current = CallManager.onMetricsUpdate((metrics) => {
      setCurrentMetrics(metrics);
      setIsConnected(true);

      // Add to history
      const snapshot: QualitySnapshot = {
        timestamp: Date.now(),
        latencyMs: metrics.latencyMs,
        packetLoss: metrics.packetLoss,
        jitterMs: metrics.jitterMs,
      };

      setHistory((prev) => {
        const updated = [...prev, snapshot];
        if (updated.length > MAX_HISTORY_LENGTH) {
          return updated.slice(-MAX_HISTORY_LENGTH);
        }
        return updated;
      });
    });

    // Subscribe to call state to detect disconnection
    const stateUnsubscribe = CallManager.onCallStateChange((call) => {
      if (call.state === 'ended') {
        setIsConnected(false);
      }
    });

    return () => {
      unsubscribeRef.current?.();
      stateUnsubscribe();
    };
  }, []);

  const qualityScore = currentMetrics ? calculateQualityScore(currentMetrics) : 0;
  const qualityLevel = getQualityLevel(qualityScore);

  const stats: QualityStats | null = history.length > 0
    ? {
        avgLatency: history.reduce((sum, s) => sum + s.latencyMs, 0) / history.length,
        avgPacketLoss: history.reduce((sum, s) => sum + s.packetLoss, 0) / history.length,
        avgJitter: history.reduce((sum, s) => sum + s.jitterMs, 0) / history.length,
        minLatency: Math.min(...history.map((s) => s.latencyMs)),
        maxLatency: Math.max(...history.map((s) => s.latencyMs)),
        qualityScore,
      }
    : null;

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return {
    currentMetrics,
    qualityScore,
    qualityLevel,
    isConnected,
    history,
    stats,
    clearHistory,
  };
}

export default useCallQuality;


