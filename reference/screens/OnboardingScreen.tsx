/**
 * Onboarding Screen
 * 
 * Welcome flow with wallet connect and key generation.
 * 
 * @package io.estream.cipher
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { getMwaService } from '../services/mwa/MwaService';
import { QuicMessagingClient } from '../services/quic/QuicClient';

interface OnboardingScreenProps {
  onComplete: () => void;
}

type Step = 'welcome' | 'connect' | 'generate' | 'complete';

/**
 * Onboarding Screen
 */
export function OnboardingScreen({ onComplete }: OnboardingScreenProps): React.JSX.Element {
  const [step, setStep] = useState<Step>('welcome');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [keyHash, setKeyHash] = useState<string | null>(null);
  
  const handleConnectWallet = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const mwa = getMwaService();
      const auth = await mwa.authorize();
      setWalletAddress(auth.publicKey);
      setStep('generate');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  }, []);
  
  const handleGenerateKeys = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const client = new QuicMessagingClient('');
      await client.initialize();
      const keys = await client.generateDeviceKeys('cipher');
      
      // Extract key hash for display
      const hash = typeof keys.key_hash === 'string' 
        ? keys.key_hash 
        : 'Generated';
      setKeyHash(hash.substring(0, 16) + '...');
      
      setStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate keys');
    } finally {
      setLoading(false);
    }
  }, []);
  
  const handleComplete = useCallback(() => {
    onComplete();
  }, [onComplete]);
  
  // Welcome step
  if (step === 'welcome') {
    return (
      <View style={styles.container} testID="onboarding-screen">
        <View style={styles.content}>
          <Text style={styles.logo}>🔐</Text>
          <Text style={styles.title}>Welcome to Cipher</Text>
          <Text style={styles.subtitle}>Quantum-secure messaging</Text>
          
          <View style={styles.features}>
            <View style={styles.featureRow}>
              <Text style={styles.featureIcon}>⚛️</Text>
              <Text style={styles.featureText}>Post-quantum encryption</Text>
            </View>
            <View style={styles.featureRow}>
              <Text style={styles.featureIcon}>🔗</Text>
              <Text style={styles.featureText}>Solana wallet identity</Text>
            </View>
            <View style={styles.featureRow}>
              <Text style={styles.featureIcon}>🛡️</Text>
              <Text style={styles.featureText}>Seed Vault security</Text>
            </View>
            <View style={styles.featureRow}>
              <Text style={styles.featureIcon}>💨</Text>
              <Text style={styles.featureText}>Disappearing messages</Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => setStep('connect')}
            testID="onboarding-create-account"
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  // Connect wallet step
  if (step === 'connect') {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.stepIcon}>🔗</Text>
          <Text style={styles.stepTitle}>Connect Wallet</Text>
          <Text style={styles.stepDescription}>
            Connect your Solana wallet to establish your identity.
            Your public key becomes your Cipher address.
          </Text>
          
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          
          <TouchableOpacity 
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleConnectWallet}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>Connect Wallet</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.skipButton}
            onPress={() => setStep('generate')}
            testID="onboarding-import-account"
          >
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  // Generate keys step
  if (step === 'generate') {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.stepIcon}>⚛️</Text>
          <Text style={styles.stepTitle}>Generate Keys</Text>
          <Text style={styles.stepDescription}>
            Create your quantum-resistant encryption keys.
            These use Kyber1024 and Dilithium5 algorithms.
          </Text>
          
          {walletAddress && (
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Wallet Connected</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {walletAddress.substring(0, 8)}...{walletAddress.substring(walletAddress.length - 8)}
              </Text>
            </View>
          )}
          
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          
          <TouchableOpacity 
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleGenerateKeys}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>Generate PQ Keys</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  // Complete step
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.successIcon}>✓</Text>
        <Text style={styles.stepTitle}>You're Ready!</Text>
        <Text style={styles.stepDescription}>
          Your quantum-secure identity has been created.
          Start sending encrypted messages.
        </Text>
        
        <View style={styles.summaryBox}>
          {walletAddress && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Wallet</Text>
              <Text style={styles.summaryValue}>
                {walletAddress.substring(0, 8)}...
              </Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>PQ Key Hash</Text>
            <Text style={styles.summaryValue}>{keyHash || 'Generated'}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Encryption</Text>
            <Text style={styles.summaryValue}>Kyber1024 + Dilithium5</Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={handleComplete}
        >
          <Text style={styles.primaryButtonText}>Start Messaging</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 32,
    alignItems: 'center',
    maxWidth: 340,
  },
  logo: {
    fontSize: 72,
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 32,
  },
  features: {
    width: '100%',
    marginBottom: 32,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 16,
  },
  featureIcon: {
    fontSize: 24,
    width: 32,
    textAlign: 'center',
  },
  featureText: {
    fontSize: 16,
    color: '#888888',
  },
  stepIcon: {
    fontSize: 56,
    marginBottom: 24,
  },
  successIcon: {
    fontSize: 72,
    color: '#22c55e',
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  infoBox: {
    width: '100%',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    color: '#ffffff',
    fontFamily: 'monospace',
  },
  summaryBox: {
    width: '100%',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666666',
  },
  summaryValue: {
    fontSize: 14,
    color: '#a78bfa',
    fontFamily: 'monospace',
  },
  primaryButton: {
    backgroundColor: '#7c3aed',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  skipButton: {
    marginTop: 16,
    paddingVertical: 12,
  },
  skipButtonText: {
    fontSize: 14,
    color: '#666666',
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    width: '100%',
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
  },
});

export default OnboardingScreen;

