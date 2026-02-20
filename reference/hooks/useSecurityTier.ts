/**
 * useSecurityTier Hook
 *
 * React hook for managing security tier and understanding thresholds.
 *
 * @example
 * ```tsx
 * function SecuritySettings() {
 *   const {
 *     tier,
 *     tierName,
 *     witnessThreshold,
 *     setTier,
 *   } = useSecurityTier();
 *
 *   return (
 *     <View>
 *       <Text>Current Tier: {tierName}</Text>
 *       <Text>Witness: {witnessThreshold[0]}-of-{witnessThreshold[1]}</Text>
 *     </View>
 *   );
 * }
 * ```
 *
 * @package io.estream.polymessenger
 * @issue #203
 */

import { useCallback, useEffect, useState } from 'react';
import { primeSignerService } from '../services/prime';
import {
  SecurityTier,
  WITNESS_THRESHOLDS,
  AMPLIFICATION_THRESHOLDS,
} from '../types/prime';

// Tier names for display
const TIER_NAMES: Record<SecurityTier, string> = {
  [SecurityTier.Basic]: 'Basic',
  [SecurityTier.Standard]: 'Standard',
  [SecurityTier.Enhanced]: 'Enhanced',
  [SecurityTier.High]: 'High',
  [SecurityTier.Critical]: 'Critical',
  [SecurityTier.Sovereign]: 'Sovereign',
};

// Tier descriptions
const TIER_DESCRIPTIONS: Record<SecurityTier, string> = {
  [SecurityTier.Basic]: 'Development and testing, public social content',
  [SecurityTier.Standard]: 'Private messaging, internal tools',
  [SecurityTier.Enhanced]: 'Financial apps, supply chain',
  [SecurityTier.High]: 'Healthcare (HIPAA), payment processing',
  [SecurityTier.Critical]: 'Cross-border payments, regulated finance',
  [SecurityTier.Sovereign]: 'Government, defense, national security',
};

export interface UseSecurityTierResult {
  /** Current security tier */
  tier: SecurityTier;
  /** Tier name for display */
  tierName: string;
  /** Tier description */
  tierDescription: string;
  /** Witness threshold [k, n] */
  witnessThreshold: [number, number];
  /** Amplification threshold [k, n] or null */
  amplificationThreshold: [number, number] | null;
  /** All available tiers */
  availableTiers: Array<{
    tier: SecurityTier;
    name: string;
    description: string;
    witnessThreshold: [number, number];
    amplificationThreshold: [number, number] | null;
  }>;
  /** Update the security tier */
  setTier: (tier: SecurityTier) => Promise<void>;
  /** Check if tier requires upgrade for a feature */
  requiresTierUpgrade: (requiredTier: SecurityTier) => boolean;
  /** Get minimum tier for a witness threshold */
  getTierForThreshold: (k: number, n: number) => SecurityTier | null;
}

/**
 * Hook for managing security tiers
 */
export function useSecurityTier(): UseSecurityTierResult {
  const [tier, setTierState] = useState<SecurityTier>(
    primeSignerService.getTier()
  );

  // Update state when identity changes
  useEffect(() => {
    if (primeSignerService.isInitialized()) {
      setTierState(primeSignerService.getTier());
    }
  }, []);

  const witnessThreshold = WITNESS_THRESHOLDS[tier];
  const amplificationThreshold = AMPLIFICATION_THRESHOLDS[tier];

  const setTier = useCallback(async (newTier: SecurityTier): Promise<void> => {
    await primeSignerService.setTier(newTier);
    setTierState(newTier);
  }, []);

  const requiresTierUpgrade = useCallback(
    (requiredTier: SecurityTier): boolean => {
      return tier < requiredTier;
    },
    [tier]
  );

  const getTierForThreshold = useCallback(
    (k: number, n: number): SecurityTier | null => {
      for (const [tierKey, threshold] of Object.entries(WITNESS_THRESHOLDS)) {
        if (threshold[0] >= k && threshold[1] >= n) {
          return Number(tierKey) as SecurityTier;
        }
      }
      return null;
    },
    []
  );

  // Build available tiers list
  const availableTiers = Object.values(SecurityTier)
    .filter((t) => typeof t === 'number')
    .map((t) => ({
      tier: t as SecurityTier,
      name: TIER_NAMES[t as SecurityTier],
      description: TIER_DESCRIPTIONS[t as SecurityTier],
      witnessThreshold: WITNESS_THRESHOLDS[t as SecurityTier],
      amplificationThreshold: AMPLIFICATION_THRESHOLDS[t as SecurityTier],
    }));

  return {
    tier,
    tierName: TIER_NAMES[tier],
    tierDescription: TIER_DESCRIPTIONS[tier],
    witnessThreshold,
    amplificationThreshold,
    availableTiers,
    setTier,
    requiresTierUpgrade,
    getTierForThreshold,
  };
}

export default useSecurityTier;
