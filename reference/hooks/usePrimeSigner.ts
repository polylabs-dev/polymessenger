/**
 * usePrimeSigner Hook
 *
 * React hook for hardware-backed signing operations using the upstream
 * PrimeSignerModule.
 *
 * @example
 * ```tsx
 * function SigningComponent() {
 *   const { sign, publicKey, isReady, error } = usePrimeSigner();
 *
 *   const handleSign = async () => {
 *     const data = new TextEncoder().encode('Hello, World!');
 *     const result = await sign(data);
 *     console.log('Signature:', result.signatureHex);
 *   };
 *
 *   if (!isReady) return <ActivityIndicator />;
 *   return <Button onPress={handleSign}>Sign</Button>;
 * }
 * ```
 *
 * @package io.estream.polymessenger
 * @issue #203
 */

import { useCallback, useEffect, useState } from 'react';
import {
  PrimeSignerService,
  primeSignerService,
  AuthMode,
  type SignOptions,
  type SignatureResult,
  type KeyInfo,
  type SecurityCapabilities,
} from '../services/prime';

export interface UsePrimeSignerOptions {
  /** Require biometric for all signing operations */
  requireBiometric?: boolean;
  /** Authentication mode */
  authMode?: AuthMode;
  /** Auto-initialize on mount */
  autoInitialize?: boolean;
}

export interface UsePrimeSignerResult {
  /** Sign data with the private key */
  sign: (data: Uint8Array, options?: SignOptions) => Promise<SignatureResult>;
  /** Verify a signature */
  verify: (data: Uint8Array, signature: Uint8Array) => Promise<boolean>;
  /** Get the public key */
  getPublicKey: () => Promise<Uint8Array>;
  /** Get the public key as hex string */
  getPublicKeyHex: () => Promise<string>;
  /** Current public key (cached) */
  publicKey: string | null;
  /** Key info from SDK */
  keyInfo: KeyInfo | null;
  /** Device security capabilities */
  capabilities: SecurityCapabilities | null;
  /** Whether the signer is ready */
  isReady: boolean;
  /** Whether currently initializing */
  isInitializing: boolean;
  /** Error if initialization failed */
  error: Error | null;
  /** Manually initialize the signer */
  initialize: () => Promise<void>;
  /** Delete the identity */
  deleteIdentity: () => Promise<void>;
}

/**
 * Hook for hardware-backed signing operations
 */
export function usePrimeSigner(
  options: UsePrimeSignerOptions = {}
): UsePrimeSignerResult {
  const {
    requireBiometric = false,
    authMode = AuthMode.BiometricWithFallback,
    autoInitialize = true,
  } = options;

  const [isReady, setIsReady] = useState(primeSignerService.isInitialized());
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [keyInfo, setKeyInfo] = useState<KeyInfo | null>(
    primeSignerService.getKeyInfo()
  );
  const [capabilities, setCapabilities] = useState<SecurityCapabilities | null>(
    primeSignerService.getSecurityCapabilities()
  );

  const initialize = useCallback(async () => {
    if (isInitializing || isReady) return;

    setIsInitializing(true);
    setError(null);

    try {
      await primeSignerService.initialize({
        requireBiometric,
        authMode,
      });

      const pubKeyHex = await primeSignerService.getPublicKeyHex();
      setPublicKey(pubKeyHex);
      setKeyInfo(primeSignerService.getKeyInfo());
      setCapabilities(primeSignerService.getSecurityCapabilities());
      setIsReady(true);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsInitializing(false);
    }
  }, [requireBiometric, authMode, isInitializing, isReady]);

  useEffect(() => {
    if (autoInitialize && !isReady && !isInitializing) {
      initialize();
    }
  }, [autoInitialize, isReady, isInitializing, initialize]);

  const sign = useCallback(
    async (data: Uint8Array, signOptions?: SignOptions): Promise<SignatureResult> => {
      if (!isReady) {
        throw new Error('PrimeSigner not initialized');
      }
      return primeSignerService.sign(data, signOptions);
    },
    [isReady]
  );

  const verify = useCallback(
    async (data: Uint8Array, signature: Uint8Array): Promise<boolean> => {
      return primeSignerService.verify(data, signature);
    },
    []
  );

  const getPublicKey = useCallback(async (): Promise<Uint8Array> => {
    if (!isReady) {
      throw new Error('PrimeSigner not initialized');
    }
    return primeSignerService.getPublicKey();
  }, [isReady]);

  const getPublicKeyHex = useCallback(async (): Promise<string> => {
    if (!isReady) {
      throw new Error('PrimeSigner not initialized');
    }
    return primeSignerService.getPublicKeyHex();
  }, [isReady]);

  const deleteIdentity = useCallback(async (): Promise<void> => {
    await primeSignerService.deleteIdentity();
    setIsReady(false);
    setPublicKey(null);
    setKeyInfo(null);
  }, []);

  return {
    sign,
    verify,
    getPublicKey,
    getPublicKeyHex,
    publicKey,
    keyInfo,
    capabilities,
    isReady,
    isInitializing,
    error,
    initialize,
    deleteIdentity,
  };
}

export default usePrimeSigner;
