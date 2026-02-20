/**
 * PRIME Identity Types for Poly Messenger
 * 
 * Hardware-rooted cryptographic identity using ETFA fingerprinting.
 */

/**
 * Security tiers mapping to subscription levels
 */
export enum SecurityTier {
  Basic = 0,
  Standard = 1,
  Enhanced = 2,
  High = 3,
  Critical = 4,
  Sovereign = 5,
}

/**
 * Witness thresholds by tier
 */
export const WITNESS_THRESHOLDS: Record<SecurityTier, [number, number]> = {
  [SecurityTier.Basic]: [1, 3],
  [SecurityTier.Standard]: [2, 5],
  [SecurityTier.Enhanced]: [3, 7],
  [SecurityTier.High]: [5, 9],
  [SecurityTier.Critical]: [7, 11],
  [SecurityTier.Sovereign]: [7, 11],
};

/**
 * Amplification thresholds by tier (null for Basic)
 */
export const AMPLIFICATION_THRESHOLDS: Record<SecurityTier, [number, number] | null> = {
  [SecurityTier.Basic]: null,
  [SecurityTier.Standard]: [2, 5],
  [SecurityTier.Enhanced]: [3, 7],
  [SecurityTier.High]: [5, 9],
  [SecurityTier.Critical]: [7, 11],
  [SecurityTier.Sovereign]: [10, 15],
};

/**
 * ETFA measurement result from native module
 */
export interface EtfaMeasurements {
  /** Clock precision timing (nanoseconds) */
  clock: number;
  /** Memory allocation timing (nanoseconds) */
  memory: number;
  /** Crypto operation timing (nanoseconds) */
  crypto: number;
  /** Secure storage access timing (nanoseconds) */
  storage: number;
  /** Secure enclave timing (nanoseconds) */
  enclave: number;
  /** Random number generation timing (nanoseconds) */
  random: number;
}

/**
 * PRIME device identity
 */
export interface PrimeIdentity {
  /** ETFA-derived fingerprint (base64) */
  fingerprint: string;
  /** ML-DSA-87 public key (base64) */
  publicKey: string;
  /** ML-KEM-1024 public key (base64) */
  encryptionPublicKey: string;
  /** Current security tier */
  tier: SecurityTier;
  /** Registration timestamp (ms) */
  registeredAt: number;
}

/**
 * Device type for registration
 */
export enum DeviceType {
  IOS = 'ios',
  Android = 'android',
  Desktop = 'desktop',
  Web = 'web',
}

/**
 * Device information
 */
export interface DeviceInfo {
  /** Device type */
  deviceType: DeviceType;
  /** OS version */
  osVersion: string;
  /** App version */
  appVersion: string;
  /** Device model (optional) */
  model?: string;
}

/**
 * Result of PRIME key derivation
 */
export interface PrimeKeys {
  /** ML-DSA-87 signing public key (base64) */
  signingPublic: string;
  /** ML-KEM-1024 encryption public key (base64) */
  encryptionPublic: string;
}

/**
 * Verification result for fingerprint matching
 */
export interface FingerprintVerification {
  /** Whether fingerprint matches */
  matches: boolean;
  /** Confidence score (0-1) */
  confidence: number;
  /** Whether re-registration is recommended */
  reregisterRecommended: boolean;
}

/**
 * Security tier display names
 */
export const TIER_NAMES: Record<SecurityTier, string> = {
  [SecurityTier.Basic]: 'Basic',
  [SecurityTier.Standard]: 'Standard',
  [SecurityTier.Enhanced]: 'Enhanced',
  [SecurityTier.High]: 'High',
  [SecurityTier.Critical]: 'Critical',
  [SecurityTier.Sovereign]: 'Sovereign',
};

/**
 * Security tier descriptions
 */
export const TIER_DESCRIPTIONS: Record<SecurityTier, string> = {
  [SecurityTier.Basic]: 'Entry-level quantum security',
  [SecurityTier.Standard]: 'Recommended for personal use',
  [SecurityTier.Enhanced]: 'Professional-grade security',
  [SecurityTier.High]: 'Enterprise-level protection',
  [SecurityTier.Critical]: 'Maximum security for sensitive communications',
  [SecurityTier.Sovereign]: 'Nation-state grade security',
};
