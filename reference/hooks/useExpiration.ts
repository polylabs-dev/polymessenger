/**
 * useExpiration Hook
 * 
 * React hooks for message expiration functionality.
 * Provides access to ExpirationService with automatic cleanup.
 * 
 * @issue #102
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ExpirationService, 
  ExpirationConfig, 
  MessageTombstone,
  formatTimeRemaining,
} from '../services/messaging/ExpirationService';

/**
 * Hook for accessing expiration configuration
 */
export function useExpirationConfig() {
  const [config, setConfig] = useState<ExpirationConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const service = ExpirationService.getInstance();
    
    // Load initial config
    service.getExpirationConfig()
      .then((cfg) => {
        setConfig(cfg);
        setLoading(false);
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
      });

    // Subscribe to changes
    const unsubscribe = service.onConfigChange((newConfig) => {
      setConfig(newConfig);
    });

    return () => unsubscribe();
  }, []);

  const updateConfig = useCallback(async (updates: Partial<ExpirationConfig>) => {
    const service = ExpirationService.getInstance();
    await service.updateExpirationConfig(updates);
  }, []);

  const syncConfig = useCallback(async () => {
    setLoading(true);
    const service = ExpirationService.getInstance();
    try {
      const cfg = await service.syncConfig();
      setConfig(cfg);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    config,
    loading,
    error,
    updateConfig,
    syncConfig,
  };
}

/**
 * Hook for countdown timer on expiring messages
 */
export function useExpirationCountdown(expiresAt: number | null | undefined) {
  const [remaining, setRemaining] = useState<number>(0);
  const [expired, setExpired] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!expiresAt || expiresAt === 0) {
      setRemaining(0);
      setExpired(false);
      return;
    }

    const update = () => {
      const now = Date.now();
      const diff = expiresAt - now;
      
      if (diff <= 0) {
        setRemaining(0);
        setExpired(true);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else {
        setRemaining(diff);
        setExpired(false);
      }
    };

    // Initial update
    update();

    // Update interval based on time remaining
    const getInterval = (remainingMs: number) => {
      if (remainingMs < 60 * 1000) return 1000; // Every second for <1 min
      if (remainingMs < 60 * 60 * 1000) return 10 * 1000; // Every 10s for <1 hour
      return 60 * 1000; // Every minute for >1 hour
    };

    const scheduleNext = () => {
      const now = Date.now();
      const diff = expiresAt - now;
      if (diff <= 0) return;

      intervalRef.current = setInterval(() => {
        update();
      }, getInterval(diff));
    };

    scheduleNext();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [expiresAt]);

  return {
    remaining,
    expired,
    formatted: formatTimeRemaining(remaining),
  };
}

/**
 * Hook for tracking a specific message's expiration
 */
export function useMessageExpiration(messageId: string | null | undefined) {
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [isViewOnce, setIsViewOnce] = useState(false);
  const [wasRead, setWasRead] = useState(false);

  useEffect(() => {
    if (!messageId) {
      setExpiresAt(null);
      setIsViewOnce(false);
      setWasRead(false);
      return;
    }

    const service = ExpirationService.getInstance();
    const msg = service.getExpiringMessage(messageId);
    
    if (msg) {
      setExpiresAt(msg.expiresAt);
      setIsViewOnce(msg.viewOnce);
      setWasRead(msg.wasRead);
    } else {
      setExpiresAt(null);
      setIsViewOnce(false);
      setWasRead(false);
    }
  }, [messageId]);

  const countdown = useExpirationCountdown(expiresAt);

  const markAsRead = useCallback(async () => {
    if (!messageId) return;
    const service = ExpirationService.getInstance();
    await service.markRead(messageId);
    setWasRead(true);
    
    // Update expiresAt if it changed
    const msg = service.getExpiringMessage(messageId);
    if (msg) {
      setExpiresAt(msg.expiresAt);
    }
  }, [messageId]);

  return {
    ...countdown,
    isViewOnce,
    wasRead,
    markAsRead,
    isExpiring: expiresAt !== null && expiresAt > 0,
  };
}

/**
 * Hook for listening to message expirations
 */
export function useExpirationEvents(
  onExpire: (tombstone: MessageTombstone) => void
) {
  useEffect(() => {
    const service = ExpirationService.getInstance();
    service.setOnExpire(onExpire);

    return () => {
      // Don't clear the callback if other components might need it
      // This is a limitation of the current singleton pattern
    };
  }, [onExpire]);
}

/**
 * Hook for expiration timer display color
 */
export function useExpirationColor(remainingMs: number): string {
  if (remainingMs <= 0) return '#dc2626'; // red-600 (expired)
  if (remainingMs < 60 * 1000) return '#dc2626'; // red-600 (<1 min)
  if (remainingMs < 5 * 60 * 1000) return '#ea580c'; // orange-600 (<5 min)
  if (remainingMs < 60 * 60 * 1000) return '#ca8a04'; // yellow-600 (<1 hour)
  return '#6b7280'; // gray-500 (>1 hour)
}

export default {
  useExpirationConfig,
  useExpirationCountdown,
  useMessageExpiration,
  useExpirationEvents,
  useExpirationColor,
};
