/**
 * Threshold Signing Types for Poly Messenger
 * 
 * Lattice amplification for guardian recovery and multi-device signing.
 */

import { SecurityTier } from './prime';

/**
 * Threshold configuration
 */
export interface ThresholdConfig {
  /** Minimum signers required (k) */
  threshold: number;
  /** Total number of participants (n) */
  total: number;
  /** Whether to apply lattice amplification */
  amplify: boolean;
}

/**
 * Get threshold config for a security tier
 */
export function getThresholdConfig(tier: SecurityTier): ThresholdConfig | null {
  const thresholds: Record<SecurityTier, [number, number] | null> = {
    [SecurityTier.Basic]: null,
    [SecurityTier.Standard]: [2, 5],
    [SecurityTier.Enhanced]: [3, 7],
    [SecurityTier.High]: [5, 9],
    [SecurityTier.Critical]: [7, 11],
    [SecurityTier.Sovereign]: [10, 15],
  };

  const config = thresholds[tier];
  if (!config) return null;

  return {
    threshold: config[0],
    total: config[1],
    amplify: true,
  };
}

/**
 * Partial signature from one participant
 */
export interface PartialSignature {
  /** Participant index (1..=n) */
  index: number;
  /** Partial signature bytes (base64) */
  signatureShare: string;
  /** Optional proof of correct computation (base64) */
  proof?: string;
}

/**
 * Combined signature result
 */
export interface CombinedSignature {
  /** Full signature bytes (base64) */
  signature: string;
  /** Participant indices that contributed */
  participants: number[];
  /** Whether lattice amplification was applied */
  amplified: boolean;
  /** Security bits (if amplified) */
  securityBits?: number;
}

/**
 * Guardian for threshold recovery
 */
export interface Guardian {
  /** Guardian index (1..=n) */
  index: number;
  /** Guardian's display name */
  name: string;
  /** Guardian's public key (base64) */
  publicKey: string;
  /** Contact ID for reaching this guardian */
  contactId: string;
  /** Whether guardian is currently active */
  active: boolean;
  /** When guardian was added (ms) */
  addedAt: number;
}

/**
 * Guardian configuration
 */
export interface GuardianConfig {
  /** List of guardians */
  guardians: Guardian[];
  /** Threshold configuration */
  config: ThresholdConfig;
  /** Last updated timestamp (ms) */
  updatedAt: number;
}

/**
 * Recovery request to send to guardians
 */
export interface RecoveryRequest {
  /** Unique request ID */
  requestId: string;
  /** New device's public key (base64) */
  newDevicePublicKey: string;
  /** Request timestamp (ms) */
  timestamp: number;
  /** Signature from new device (base64) */
  deviceSignature: string;
  /** Optional message to guardians */
  message?: string;
}

/**
 * Guardian response to recovery request
 */
export interface GuardianResponse {
  /** Guardian index */
  guardianIndex: number;
  /** Whether guardian approved */
  approved: boolean;
  /** Partial signature if approved */
  partialSignature?: PartialSignature;
  /** Rejection reason if not approved */
  rejectionReason?: string;
  /** Response timestamp (ms) */
  timestamp: number;
}

/**
 * Recovery status
 */
export enum RecoveryStatus {
  Pending = 'pending',
  InProgress = 'in_progress',
  Completed = 'completed',
  Failed = 'failed',
  Expired = 'expired',
}

/**
 * Recovery session state
 */
export interface RecoverySession {
  /** Recovery request */
  request: RecoveryRequest;
  /** Current status */
  status: RecoveryStatus;
  /** Received responses */
  responses: GuardianResponse[];
  /** Threshold needed */
  threshold: number;
  /** Expires at (ms) */
  expiresAt: number;
  /** Error message if failed */
  error?: string;
}

/**
 * Calculate security bits for amplified signature
 * Approximately 0.265 bits per dimension for classical security
 */
export function calculateSecurityBits(k: number): number {
  const BASE_DIMENSION = 2048; // ML-DSA-87
  const combinedDimension = k * BASE_DIMENSION;
  return Math.floor(combinedDimension * 0.265);
}
