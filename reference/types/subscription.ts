/**
 * Subscription Types for Poly Messenger
 * 
 * Defines the freemium pricing model with tier-based features.
 */

/**
 * Subscription tier levels
 */
export enum SubscriptionTier {
  Free = 'free',
  Personal = 'personal',
  Professional = 'professional',
  Enterprise = 'enterprise',
}

/**
 * Subscription status
 */
export enum SubscriptionStatus {
  Active = 'active',
  PastDue = 'past_due',
  Canceled = 'canceled',
  Trialing = 'trialing',
}

/**
 * Tier-based feature limits
 */
export interface TierLimits {
  /** Messages allowed per month (null = unlimited) */
  messagesPerMonth: number | null;
  /** Whether scatter messaging is enabled */
  scatterEnabled: boolean;
  /** Maximum linked devices */
  maxDevices: number;
  /** Storage limit in MB */
  storageMb: number;
  /** Maximum message TTL in days */
  maxTtlDays: number;
  /** Whether guardian recovery is enabled */
  guardianRecovery: boolean;
  /** Lattice amplification threshold (k, n) or null if disabled */
  amplificationThreshold: [number, number] | null;
}

/**
 * Tier limits configuration
 */
export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  [SubscriptionTier.Free]: {
    messagesPerMonth: 100,
    scatterEnabled: false,
    maxDevices: 1,
    storageMb: 10,
    maxTtlDays: 1,
    guardianRecovery: false,
    amplificationThreshold: null,
  },
  [SubscriptionTier.Personal]: {
    messagesPerMonth: 10000,
    scatterEnabled: true,
    maxDevices: 3,
    storageMb: 100,
    maxTtlDays: 7,
    guardianRecovery: true,
    amplificationThreshold: [2, 5],
  },
  [SubscriptionTier.Professional]: {
    messagesPerMonth: null, // Unlimited
    scatterEnabled: true,
    maxDevices: 10,
    storageMb: 1024,
    maxTtlDays: 30,
    guardianRecovery: true,
    amplificationThreshold: [3, 7],
  },
  [SubscriptionTier.Enterprise]: {
    messagesPerMonth: null, // Unlimited
    scatterEnabled: true,
    maxDevices: Infinity,
    storageMb: 10240,
    maxTtlDays: 90,
    guardianRecovery: true,
    amplificationThreshold: [5, 9],
  },
};

/**
 * Current subscription information
 */
export interface Subscription {
  /** Current tier */
  tier: SubscriptionTier;
  /** Subscription status */
  status: SubscriptionStatus;
  /** Period start timestamp (ms) */
  currentPeriodStart: number;
  /** Period end timestamp (ms) */
  currentPeriodEnd: number;
  /** Whether subscription will cancel at period end */
  cancelAtPeriodEnd: boolean;
  /** Payment method info (if available) */
  paymentMethod?: {
    type: 'card' | 'bank';
    last4: string;
  };
}

/**
 * Usage statistics for current period
 */
export interface UsageStats {
  /** Messages sent this period */
  messagesSent: number;
  /** Messages remaining (null = unlimited) */
  messagesRemaining: number | null;
  /** Storage used in MB */
  storageUsedMb: number;
  /** Number of linked devices */
  devicesLinked: number;
  /** Period start timestamp (ms) */
  periodStart: number;
  /** Period end timestamp (ms) */
  periodEnd: number;
}

/**
 * Result of checking if an operation is allowed
 */
export interface CanSendResult {
  /** Whether the operation is allowed */
  allowed: boolean;
  /** Reason for denial (if not allowed) */
  reason?: string;
  /** Suggested upgrade tier */
  upgrade?: SubscriptionTier;
  /** Remaining quota (if applicable) */
  remaining?: number;
}

/**
 * Pricing information for display
 */
export const TIER_PRICING: Record<SubscriptionTier, { monthly: number; annual: number }> = {
  [SubscriptionTier.Free]: { monthly: 0, annual: 0 },
  [SubscriptionTier.Personal]: { monthly: 4.99, annual: 49.99 },
  [SubscriptionTier.Professional]: { monthly: 19.99, annual: 199.99 },
  [SubscriptionTier.Enterprise]: { monthly: 0, annual: 0 }, // Custom pricing
};

/**
 * Feature descriptions for UI
 */
export const TIER_FEATURES: Record<SubscriptionTier, string[]> = {
  [SubscriptionTier.Free]: [
    '100 messages per month',
    'Basic security (1,3) witnesses',
    'Single device',
    '24-hour message TTL',
  ],
  [SubscriptionTier.Personal]: [
    '10,000 messages per month',
    'Scatter messaging enabled',
    'Up to 3 devices',
    '7-day message TTL',
    'Guardian recovery',
    '(2,5) lattice amplification',
  ],
  [SubscriptionTier.Professional]: [
    'Unlimited messages',
    'Scatter messaging enabled',
    'Up to 10 devices',
    '30-day message TTL',
    'Guardian recovery',
    '(3,7) lattice amplification',
    'Priority support',
  ],
  [SubscriptionTier.Enterprise]: [
    'Unlimited messages',
    'Scatter messaging enabled',
    'Unlimited devices',
    '90-day message TTL',
    'Guardian recovery',
    '(5,9)+ lattice amplification',
    'Dedicated support',
    'SLA guarantee',
    'Audit logs',
  ],
};
