/**
 * useSubscription Hook
 *
 * React hook for managing subscription state and usage limits.
 *
 * @example
 * ```tsx
 * function UsageIndicator() {
 *   const {
 *     tier,
 *     usage,
 *     limits,
 *     isAtLimit,
 *     upgradeUrl,
 *   } = useSubscription();
 *
 *   if (isAtLimit) {
 *     return <UpgradePrompt url={upgradeUrl} />;
 *   }
 *
 *   return (
 *     <Text>
 *       {usage.messagesThisMonth} / {limits.messagesPerMonth} messages
 *     </Text>
 *   );
 * }
 * ```
 *
 * @package io.estream.polymessenger
 * @issue #205
 */

import { useCallback, useEffect, useState } from 'react';
import { Linking } from 'react-native';
import {
  BillingService,
  billingService,
} from '../services/billing';
import {
  SubscriptionTier,
  SubscriptionStatus,
  TierLimits,
  TIER_LIMITS,
} from '../types/subscription';
import { emitTelemetry, TelemetryEventTypes } from '../services/telemetry';

// Tier display names
const TIER_NAMES: Record<SubscriptionTier, string> = {
  [SubscriptionTier.FREE]: 'Free',
  [SubscriptionTier.PERSONAL]: 'Personal',
  [SubscriptionTier.PROFESSIONAL]: 'Professional',
  [SubscriptionTier.ENTERPRISE]: 'Enterprise',
};

// Tier prices (display only)
const TIER_PRICES: Record<SubscriptionTier, string> = {
  [SubscriptionTier.FREE]: 'Free',
  [SubscriptionTier.PERSONAL]: '$4.99/mo',
  [SubscriptionTier.PROFESSIONAL]: '$14.99/mo',
  [SubscriptionTier.ENTERPRISE]: 'Contact Sales',
};

export interface UsageStats {
  /** Messages sent this month */
  messagesThisMonth: number;
  /** Scatter messages this month */
  scatterMessagesThisMonth: number;
  /** Guardian recoveries this month */
  guardianRecoveriesThisMonth: number;
  /** Storage used in bytes */
  storageUsedBytes: number;
  /** Current period start */
  periodStart: Date;
  /** Current period end */
  periodEnd: Date;
}

export interface UseSubscriptionOptions {
  /** Auto-refresh usage on mount */
  autoRefresh?: boolean;
  /** Refresh interval in ms */
  refreshIntervalMs?: number;
}

export interface UseSubscriptionResult {
  /** Current subscription tier */
  tier: SubscriptionTier;
  /** Tier display name */
  tierName: string;
  /** Tier price string */
  tierPrice: string;
  /** Subscription status */
  status: SubscriptionStatus | null;
  /** Current usage stats */
  usage: UsageStats | null;
  /** Tier limits */
  limits: TierLimits;
  /** Whether at message limit */
  isAtLimit: boolean;
  /** Whether approaching limit (80%+) */
  isNearLimit: boolean;
  /** Percentage of limit used */
  usagePercentage: number;
  /** Available upgrade tiers */
  availableUpgrades: Array<{
    tier: SubscriptionTier;
    name: string;
    price: string;
    limits: TierLimits;
  }>;
  /** URL to upgrade subscription */
  upgradeUrl: string;
  /** Whether loading */
  isLoading: boolean;
  /** Error if any */
  error: Error | null;
  /** Refresh usage stats */
  refreshUsage: () => Promise<void>;
  /** Open upgrade page */
  openUpgrade: (targetTier?: SubscriptionTier) => Promise<void>;
  /** Check if a feature requires upgrade */
  requiresUpgrade: (feature: 'scatter' | 'guardian' | 'storage') => boolean;
}

/**
 * Hook for managing subscription and usage
 */
export function useSubscription(
  options: UseSubscriptionOptions = {}
): UseSubscriptionResult {
  const { autoRefresh = true, refreshIntervalMs = 60000 } = options;

  const [tier, setTier] = useState<SubscriptionTier>(SubscriptionTier.FREE);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const limits = TIER_LIMITS[tier];

  // Calculate usage metrics
  const usagePercentage = usage
    ? Math.min(100, (usage.messagesThisMonth / limits.messagesPerMonth) * 100)
    : 0;
  const isAtLimit = usage
    ? usage.messagesThisMonth >= limits.messagesPerMonth
    : false;
  const isNearLimit = usagePercentage >= 80 && !isAtLimit;

  // Refresh usage data
  const refreshUsage = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const subscriptionStatus = await billingService.getSubscriptionStatus();
      const currentUsage = await billingService.getCurrentUsage();

      setTier(subscriptionStatus.tier);
      setStatus(subscriptionStatus);
      setUsage({
        messagesThisMonth: currentUsage.messages,
        scatterMessagesThisMonth: currentUsage.scatterMessages,
        guardianRecoveriesThisMonth: currentUsage.guardianRecoveries,
        storageUsedBytes: currentUsage.storageBytes,
        periodStart: new Date(currentUsage.periodStart),
        periodEnd: new Date(currentUsage.periodEnd),
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-refresh on mount
  useEffect(() => {
    if (autoRefresh) {
      refreshUsage();
    }
  }, [autoRefresh, refreshUsage]);

  // Periodic refresh
  useEffect(() => {
    if (!autoRefresh || refreshIntervalMs <= 0) return;

    const intervalId = setInterval(refreshUsage, refreshIntervalMs);
    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshIntervalMs, refreshUsage]);

  // Emit telemetry when approaching limits
  useEffect(() => {
    if (isNearLimit) {
      emitTelemetry(TelemetryEventTypes.USAGE_LIMIT_WARNING, {
        tier,
        usagePercentage,
        messagesUsed: usage?.messagesThisMonth,
        limit: limits.messagesPerMonth,
      });
    }

    if (isAtLimit) {
      emitTelemetry(TelemetryEventTypes.USAGE_LIMIT_REACHED, {
        tier,
        messagesUsed: usage?.messagesThisMonth,
        limit: limits.messagesPerMonth,
      });
    }
  }, [isNearLimit, isAtLimit, tier, usagePercentage, usage, limits]);

  // Build available upgrades
  const availableUpgrades = Object.values(SubscriptionTier)
    .filter((t) => typeof t === 'number' && t > tier)
    .map((t) => ({
      tier: t as SubscriptionTier,
      name: TIER_NAMES[t as SubscriptionTier],
      price: TIER_PRICES[t as SubscriptionTier],
      limits: TIER_LIMITS[t as SubscriptionTier],
    }));

  // Upgrade URL
  const upgradeUrl = 'https://polymessenger.app/upgrade';

  // Open upgrade page
  const openUpgrade = useCallback(
    async (targetTier?: SubscriptionTier): Promise<void> => {
      const url = targetTier
        ? `${upgradeUrl}?tier=${SubscriptionTier[targetTier].toLowerCase()}`
        : upgradeUrl;

      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    },
    []
  );

  // Check if feature requires upgrade
  const requiresUpgrade = useCallback(
    (feature: 'scatter' | 'guardian' | 'storage'): boolean => {
      switch (feature) {
        case 'scatter':
          return !limits.scatterEnabled;
        case 'guardian':
          return limits.guardianRecoveriesPerMonth === 0;
        case 'storage':
          return usage
            ? usage.storageUsedBytes >= limits.storageBytes
            : false;
        default:
          return false;
      }
    },
    [limits, usage]
  );

  return {
    tier,
    tierName: TIER_NAMES[tier],
    tierPrice: TIER_PRICES[tier],
    status,
    usage,
    limits,
    isAtLimit,
    isNearLimit,
    usagePercentage,
    availableUpgrades,
    upgradeUrl,
    isLoading,
    error,
    refreshUsage,
    openUpgrade,
    requiresUpgrade,
  };
}

export default useSubscription;
