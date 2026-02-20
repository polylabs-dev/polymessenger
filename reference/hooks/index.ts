/**
 * Hook exports for Poly Messenger
 *
 * @package io.estream.polymessenger
 */

// Core messaging hooks
export { useGroupCall } from './useGroupCall';
export { useMessaging } from './useMessaging';
export { useExpiration, useMessageExpiration, EXPIRATION_PRESETS } from './useExpiration';
export { useScreenProtection, useProtectedView } from './useScreenProtection';

// WebRTC / Calling hooks
export { useWebRTC } from './useWebRTC';
export { useCallKit } from './useCallKit';
export type { UseCallKitReturn, UseCallKitOptions } from './useCallKit';

// PRIME Identity hooks (#203)
export { usePrimeSigner } from './usePrimeSigner';
export type { UsePrimeSignerOptions, UsePrimeSignerResult } from './usePrimeSigner';
export { useSecurityTier } from './useSecurityTier';
export type { UseSecurityTierResult } from './useSecurityTier';

// Lattice Amplification hooks (#204)
export { useThresholdSigning } from './useThresholdSigning';
export type {
  UseThresholdSigningOptions,
  UseThresholdSigningResult,
  ThresholdSession,
} from './useThresholdSigning';
export { useGuardianRecovery } from './useGuardianRecovery';
export type {
  UseGuardianRecoveryOptions,
  UseGuardianRecoveryResult,
  GuardianStatus,
  RecoveryStatus,
} from './useGuardianRecovery';

// Subscription / Billing hooks (#205)
export { useSubscription } from './useSubscription';
export type {
  UseSubscriptionOptions,
  UseSubscriptionResult,
  UsageStats,
} from './useSubscription';
