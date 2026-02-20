/**
 * Lock Screen
 * 
 * Displayed when app is locked, requires biometric authentication.
 * 
 * @package io.estream.cipher
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useAppLock } from '../contexts/AppLockContext';

export function LockScreen(): React.JSX.Element {
  const { unlock, biometricInfo } = useAppLock();

  // Auto-prompt on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      unlock();
    }, 500);
    return () => clearTimeout(timer);
  }, [unlock]);

  const getBiometricIcon = () => {
    if (!biometricInfo) return '🔒';
    switch (biometricInfo.biometryType) {
      case 'FaceID': return '👤';
      case 'TouchID': return '👆';
      case 'Biometrics': return '👆';
      default: return '🔒';
    }
  };

  return (
    <SafeAreaView style={styles.container} testID="lock-screen">
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>🔐</Text>
          <Text style={styles.title}>Cipher</Text>
          <Text style={styles.subtitle}>Locked</Text>
        </View>

        {/* Quantum badge */}
        <View style={styles.badge}>
          <Text style={styles.badgeIcon}>⚛️</Text>
          <Text style={styles.badgeText}>Quantum-Secure</Text>
        </View>

        {/* Unlock button */}
        <TouchableOpacity
          style={styles.unlockButton}
          onPress={unlock}
          activeOpacity={0.8}
          testID="lock-screen-biometric"
        >
          <Text style={styles.unlockIcon}>{getBiometricIcon()}</Text>
          <Text style={styles.unlockText}>
            Unlock with {biometricInfo?.displayName || 'Biometric'}
          </Text>
        </TouchableOpacity>

        {/* Security note */}
        <Text style={styles.securityNote}>
          Your messages are encrypted and protected
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    fontSize: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginTop: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#7c3aed',
    marginBottom: 48,
  },
  badgeIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  badgeText: {
    color: '#a78bfa',
    fontSize: 13,
    fontWeight: '600',
  },
  unlockButton: {
    backgroundColor: '#7c3aed',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 32,
    marginBottom: 24,
  },
  unlockIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  unlockText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  securityNote: {
    color: '#555555',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 16,
  },
});

export default LockScreen;




