/**
 * Key Verification Screen
 * 
 * Signal-style "Safety Numbers" adaptation for PQ keys.
 * Uses Spark Liveness for visual verification (never static QR).
 * 
 * @package io.estream.polymessenger
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Clipboard,
  Share,
  Modal,
} from 'react-native';
import { SparkDisplay } from '../components/spark/SparkDisplay';
import { SparkScanner, SparkScanResult } from '../components/spark/SparkScanner';

interface KeyVerificationScreenProps {
  /** Our PQ public key hash (hex) */
  ourKeyHash: string;
  /** Their PQ public key hash (hex) */
  theirKeyHash: string;
  /** Their display name */
  peerDisplayName?: string;
  /** Callback when verified */
  onVerified?: () => void;
  /** Callback to go back */
  onBack?: () => void;
}

/**
 * Format key hash for display (Signal-style grouping)
 * 
 * Groups into 4-char segments with spaces
 */
function formatKeyHash(hash: string): string[] {
  const clean = hash.toLowerCase().replace(/[^a-f0-9]/g, '');
  const segments: string[] = [];
  
  for (let i = 0; i < clean.length && segments.length < 16; i += 4) {
    segments.push(clean.substring(i, i + 4));
  }
  
  return segments;
}


/**
 * Key Verification Screen
 * 
 * Uses animated Spark patterns for verification, NOT static QR codes.
 * Spark provides liveness detection that QR cannot.
 */
export function KeyVerificationScreen({
  ourKeyHash,
  theirKeyHash,
  peerDisplayName,
  onVerified,
  onBack,
}: KeyVerificationScreenProps): React.JSX.Element {
  const [isVerified, setIsVerified] = useState(false);
  const [showSpark, setShowSpark] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  
  const ourHashSegments = formatKeyHash(ourKeyHash);
  const theirHashSegments = formatKeyHash(theirKeyHash);
  
  const handleVerify = useCallback(() => {
    Alert.alert(
      'Mark as Verified?',
      `You confirm that you have verified the key hash with ${peerDisplayName || 'this contact'} in person or through a trusted channel.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Verify',
          onPress: () => {
            setIsVerified(true);
            onVerified?.();
          },
        },
      ]
    );
  }, [peerDisplayName, onVerified]);

  const handleSparkVerified = useCallback((result: SparkScanResult) => {
    setShowScanner(false);
    setIsVerified(true);
    onVerified?.();
    Alert.alert('Verified', 'Contact identity verified via Spark Liveness');
  }, [onVerified]);
  
  const handleCopyHash = useCallback((hash: string, label: string) => {
    Clipboard.setString(hash);
    Alert.alert('Copied', `${label} hash copied to clipboard`);
  }, []);
  
  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `Poly Key Verification\n\nYour key hash:\n${ourHashSegments.join(' ')}\n\nTheir key hash:\n${theirHashSegments.join(' ')}`,
        title: 'Key Verification',
      });
    } catch (e) {
      console.error('Share failed:', e);
    }
  }, [ourHashSegments, theirHashSegments]);
  
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Verify Security</Text>
        <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
          <Text style={styles.shareButtonText}>📤</Text>
        </TouchableOpacity>
      </View>
      
      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionsIcon}>🔐</Text>
        <Text style={styles.instructionsText}>
          Verify with {peerDisplayName || 'your contact'} in person using Spark.
          The animated pattern proves you're both live.
        </Text>
      </View>
      
      {/* Spark Display */}
      {showSpark && (
        <View style={styles.sparkContainer}>
          <SparkDisplay
            walletId={ourKeyHash}
            displayMode="compact"
            size={168}
            actionType="app.polymessenger/contact.verify"
          />
          <Text style={styles.sparkLabel}>Your verification Spark</Text>
          <Text style={styles.sparkHelp}>
            Have {peerDisplayName || 'your contact'} scan this animated pattern
          </Text>
        </View>
      )}
      
      {/* Toggle Spark/Hashes */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, showSpark && styles.toggleButtonActive]}
          onPress={() => setShowSpark(true)}
        >
          <Text style={[styles.toggleButtonText, showSpark && styles.toggleButtonTextActive]}>
            ✨ Spark
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, !showSpark && styles.toggleButtonActive]}
          onPress={() => setShowSpark(false)}
        >
          <Text style={[styles.toggleButtonText, !showSpark && styles.toggleButtonTextActive]}>
            Compare Hashes
          </Text>
        </TouchableOpacity>
      </View>

      {/* Scan Their Spark */}
      <TouchableOpacity 
        style={styles.scanButton}
        onPress={() => setShowScanner(true)}
      >
        <Text style={styles.scanButtonIcon}>📷</Text>
        <Text style={styles.scanButtonText}>Scan Their Spark</Text>
      </TouchableOpacity>
      
      {/* Your Key Hash */}
      <View style={styles.hashSection}>
        <Text style={styles.hashLabel}>Your key hash</Text>
        <TouchableOpacity
          style={styles.hashBox}
          onPress={() => handleCopyHash(ourKeyHash, 'Your')}
        >
          <View style={styles.hashGrid}>
            {ourHashSegments.map((segment, i) => (
              <Text key={i} style={styles.hashSegment}>
                {segment}
              </Text>
            ))}
          </View>
        </TouchableOpacity>
      </View>
      
      {/* Their Key Hash */}
      <View style={styles.hashSection}>
        <Text style={styles.hashLabel}>
          {peerDisplayName ? `${peerDisplayName}'s key hash` : "Their key hash"}
        </Text>
        <TouchableOpacity
          style={styles.hashBox}
          onPress={() => handleCopyHash(theirKeyHash, "Their")}
        >
          <View style={styles.hashGrid}>
            {theirHashSegments.map((segment, i) => (
              <Text key={i} style={styles.hashSegment}>
                {segment}
              </Text>
            ))}
          </View>
        </TouchableOpacity>
      </View>
      
      {/* PQ Security Badge */}
      <View style={styles.securityBadge}>
        <Text style={styles.securityBadgeIcon}>⚛️</Text>
        <View style={styles.securityBadgeContent}>
          <Text style={styles.securityBadgeTitle}>PQ-Protected + Spark Liveness</Text>
          <Text style={styles.securityBadgeText}>
            Dilithium5 signatures + animated verification prevents replay attacks
          </Text>
        </View>
      </View>
      
      {/* Verification Status */}
      {isVerified ? (
        <View style={styles.verifiedBanner}>
          <Text style={styles.verifiedIcon}>✓</Text>
          <Text style={styles.verifiedText}>Verified</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.verifyButton} onPress={handleVerify}>
          <Text style={styles.verifyButtonText}>Mark as Verified</Text>
        </TouchableOpacity>
      )}
      
      {/* Help Text */}
      <Text style={styles.helpText}>
        Spark verification uses liveness detection - screenshots won't work.
        Both parties must be present with the app open.
      </Text>

      {/* Scanner Modal */}
      <Modal visible={showScanner} animationType="slide">
        <SparkScanner
          mode="verify_contact"
          showCodeInput={true}
          onVerified={handleSparkVerified}
          onCancel={() => setShowScanner(false)}
          onError={(error) => {
            Alert.alert('Scan Failed', error);
          }}
        />
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  content: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#7c3aed',
    fontSize: 16,
    fontWeight: '500',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
  },
  shareButton: {
    padding: 8,
  },
  shareButtonText: {
    fontSize: 20,
  },
  instructions: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
  },
  instructionsIcon: {
    fontSize: 24,
  },
  instructionsText: {
    flex: 1,
    fontSize: 14,
    color: '#888888',
    lineHeight: 20,
  },
  sparkContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  sparkLabel: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
  },
  sparkHelp: {
    marginTop: 4,
    fontSize: 12,
    color: '#666666',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 4,
    marginBottom: 20,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  toggleButtonActive: {
    backgroundColor: '#2a2a2a',
  },
  toggleButtonText: {
    fontSize: 14,
    color: '#666666',
  },
  toggleButtonTextActive: {
    color: '#ffffff',
    fontWeight: '500',
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  scanButtonIcon: {
    fontSize: 20,
  },
  scanButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
  hashSection: {
    marginBottom: 16,
  },
  hashLabel: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 8,
  },
  hashBox: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  hashGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hashSegment: {
    fontSize: 16,
    fontFamily: 'monospace',
    color: '#a78bfa',
    letterSpacing: 1,
  },
  securityBadge: {
    flexDirection: 'row',
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.3)',
  },
  securityBadgeIcon: {
    fontSize: 24,
  },
  securityBadgeContent: {
    flex: 1,
  },
  securityBadgeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#a78bfa',
    marginBottom: 4,
  },
  securityBadgeText: {
    fontSize: 12,
    color: '#888888',
  },
  verifyButton: {
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginVertical: 16,
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  verifiedBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 12,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  verifiedIcon: {
    fontSize: 20,
    color: '#22c55e',
  },
  verifiedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#22c55e',
  },
  helpText: {
    fontSize: 12,
    color: '#555555',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
  },
});

export default KeyVerificationScreen;
