/**
 * Spark Verify Screen
 * 
 * In-person contact verification via Spark scanning.
 * 
 * @package io.estream.polymessenger
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SparkDisplay } from '../components/spark/SparkDisplay';
import { SparkScanner, SparkScanResult } from '../components/spark/SparkScanner';
import { SparkVerificationService } from '../services/spark/SparkVerificationService';

// ============================================================================
// Types
// ============================================================================

interface SparkVerifyScreenProps {
  onBack?: () => void;
  onContactVerified?: (contactId: string, displayName: string) => void;
}

type VerifyMode = 'choose' | 'show' | 'scan';

// ============================================================================
// Component
// ============================================================================

export function SparkVerifyScreen({ 
  onBack,
  onContactVerified,
}: SparkVerifyScreenProps): React.JSX.Element {
  const [mode, setMode] = useState<VerifyMode>('choose');
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Generate verification session
  const handleShowMySpark = useCallback(async () => {
    setIsGenerating(true);
    try {
      const service = new SparkVerificationService();
      const session = await service.startVerificationSession();
      setVerificationCode(session.verificationCode);
      setMode('show');
    } catch (error) {
      Alert.alert('Error', 'Failed to generate verification Spark');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  // Handle successful scan
  const handleScanVerified = useCallback((result: SparkScanResult) => {
    const displayName = result.actionData?.displayName || 'Contact';
    const contactId = result.code;
    
    Alert.alert(
      'Contact Verified!',
      `${displayName} has been verified in person. Your conversations are now marked as verified.`,
      [
        {
          text: 'Done',
          onPress: () => {
            onContactVerified?.(contactId, displayName);
            onBack?.();
          },
        },
      ]
    );
  }, [onContactVerified, onBack]);

  // Render mode selection
  if (mode === 'choose') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Verify Contact</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.content}>
          <View style={styles.illustration}>
            <Text style={styles.illustrationEmoji}>🤝</Text>
          </View>

          <Text style={styles.headline}>In-Person Verification</Text>
          <Text style={styles.subheadline}>
            Meet in person to verify each other's identity. 
            This adds a "Verified" badge to your conversation.
          </Text>

          <View style={styles.options}>
            <TouchableOpacity
              style={styles.optionCard}
              onPress={handleShowMySpark}
              disabled={isGenerating}
            >
              <View style={styles.optionIcon}>
                <Text style={styles.optionIconText}>✨</Text>
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Show My Spark</Text>
                <Text style={styles.optionText}>
                  Display your Spark for them to scan
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionCard}
              onPress={() => setMode('scan')}
            >
              <View style={styles.optionIcon}>
                <Text style={styles.optionIconText}>📷</Text>
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Scan Their Spark</Text>
                <Text style={styles.optionText}>
                  Scan your contact's Spark to verify
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.securityNote}>
            <Text style={styles.securityNoteIcon}>🔐</Text>
            <Text style={styles.securityNoteText}>
              Verification uses liveness detection to prevent screenshots
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // Render Spark display mode
  if (mode === 'show') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setMode('choose')} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Show My Spark</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.showContent}>
          <Text style={styles.showInstructions}>
            Have your contact scan this Spark
          </Text>

          <View style={styles.sparkContainer}>
            <SparkDisplay
              walletId="verification"
              displayMode="full"
              size={280}
              actionType="app.polymessenger/contact.verify"
              autoRefresh={true}
            />
          </View>

          {verificationCode && (
            <View style={styles.codeContainer}>
              <Text style={styles.codeLabel}>Verification Code</Text>
              <Text style={styles.codeValue}>{verificationCode}</Text>
              <Text style={styles.codeHelp}>
                They'll need to enter this code
              </Text>
            </View>
          )}

          <View style={styles.steps}>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>1</Text>
              <Text style={styles.stepText}>They open Poly Messenger</Text>
            </View>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>2</Text>
              <Text style={styles.stepText}>Tap "Scan Their Spark"</Text>
            </View>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>3</Text>
              <Text style={styles.stepText}>Scan this animated Spark</Text>
            </View>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>4</Text>
              <Text style={styles.stepText}>Enter the verification code</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // Render scanner mode
  return (
    <SparkScanner
      mode="verify_contact"
      showCodeInput={true}
      onVerified={handleScanVerified}
      onCancel={() => setMode('choose')}
      onError={(error) => {
        Alert.alert('Verification Failed', error);
      }}
    />
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  backButton: {
    padding: 8,
  },
  backText: {
    color: '#7c3aed',
    fontSize: 16,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 60,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  
  // Illustration
  illustration: {
    alignItems: 'center',
    marginBottom: 24,
  },
  illustrationEmoji: {
    fontSize: 64,
  },
  headline: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  subheadline: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  
  // Options
  options: {
    gap: 12,
    marginBottom: 32,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 16,
    gap: 16,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconText: {
    fontSize: 24,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  optionText: {
    fontSize: 14,
    color: '#888',
  },
  
  // Security Note
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  securityNoteIcon: {
    fontSize: 16,
  },
  securityNoteText: {
    fontSize: 13,
    color: '#666',
  },
  
  // Show Mode
  showContent: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
  },
  showInstructions: {
    fontSize: 18,
    color: '#888',
    marginBottom: 24,
  },
  sparkContainer: {
    marginBottom: 24,
  },
  codeContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
  },
  codeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  codeValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 8,
    fontFamily: 'monospace',
  },
  codeHelp: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  steps: {
    alignSelf: 'stretch',
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#333',
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 24,
  },
  stepText: {
    fontSize: 14,
    color: '#888',
  },
});

export default SparkVerifyScreen;
