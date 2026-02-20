/**
 * Guardian Recovery Screen
 * 
 * Manage recovery guardians and recovery requests.
 * Uses Spark verification for all sensitive operations.
 * 
 * @package io.estream.polymessenger
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { SparkDisplay } from '../components/spark/SparkDisplay';
import { SparkScanner, SparkScanResult } from '../components/spark/SparkScanner';

// ============================================================================
// Types
// ============================================================================

interface Guardian {
  id: string;
  name: string;
  walletId: string;
  addedAt: number;
  lastVerified?: number;
}

interface GuardianRecoveryScreenProps {
  onBack?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function GuardianRecoveryScreen({ onBack }: GuardianRecoveryScreenProps): React.JSX.Element {
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [showAddGuardian, setShowAddGuardian] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showGuardianSpark, setShowGuardianSpark] = useState(false);

  // Format date
  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Handle adding a guardian via Spark scan
  const handleGuardianScanned = useCallback((result: SparkScanResult) => {
    setShowScanner(false);
    
    const newGuardian: Guardian = {
      id: `guardian_${Date.now()}`,
      name: result.actionData?.displayName || 'Guardian',
      walletId: result.code,
      addedAt: Date.now(),
    };
    
    setGuardians(prev => [...prev, newGuardian]);
    Alert.alert(
      'Guardian Added',
      `${newGuardian.name} has been added as a recovery guardian.`
    );
  }, []);

  // Remove a guardian
  const handleRemoveGuardian = useCallback((guardian: Guardian) => {
    Alert.alert(
      'Remove Guardian',
      `Remove ${guardian.name} as a recovery guardian?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setGuardians(prev => prev.filter(g => g.id !== guardian.id));
          },
        },
      ]
    );
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Recovery</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content}>
        {/* Explanation Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>🛡️</Text>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Social Recovery</Text>
            <Text style={styles.infoText}>
              Add trusted friends or family as recovery guardians. If you lose 
              access to your account, they can help you recover it.
            </Text>
          </View>
        </View>

        {/* How It Works */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>HOW IT WORKS</Text>
          <View style={styles.howItWorks}>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Add Guardians</Text>
                <Text style={styles.stepText}>
                  Choose 3-5 trusted contacts to be your guardians
                </Text>
              </View>
            </View>
            
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Request Recovery</Text>
                <Text style={styles.stepText}>
                  If you lose access, initiate a recovery request
                </Text>
              </View>
            </View>
            
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Guardian Approval</Text>
                <Text style={styles.stepText}>
                  Guardians verify it's really you via Spark scan
                </Text>
              </View>
            </View>
            
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>4</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Account Restored</Text>
                <Text style={styles.stepText}>
                  With enough approvals, your account is restored
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Guardians List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>YOUR GUARDIANS</Text>
            <Text style={styles.guardianCount}>{guardians.length}/5</Text>
          </View>
          
          {guardians.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyText}>No guardians added yet</Text>
              <Text style={styles.emptySubtext}>
                Add trusted contacts to protect your account
              </Text>
            </View>
          ) : (
            guardians.map(guardian => (
              <TouchableOpacity
                key={guardian.id}
                style={styles.guardianCard}
                onPress={() => handleRemoveGuardian(guardian)}
              >
                <View style={styles.guardianAvatar}>
                  <Text style={styles.guardianAvatarText}>
                    {guardian.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.guardianInfo}>
                  <Text style={styles.guardianName}>{guardian.name}</Text>
                  <Text style={styles.guardianMeta}>
                    Added: {formatDate(guardian.addedAt)}
                  </Text>
                </View>
                <Text style={styles.guardianChevron}>›</Text>
              </TouchableOpacity>
            ))
          )}
          
          {guardians.length < 5 && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddGuardian(true)}
            >
              <Text style={styles.addButtonIcon}>+</Text>
              <Text style={styles.addButtonText}>Add Guardian</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Threshold Info */}
        {guardians.length > 0 && (
          <View style={styles.thresholdCard}>
            <Text style={styles.thresholdTitle}>Recovery Threshold</Text>
            <Text style={styles.thresholdValue}>
              {Math.ceil(guardians.length * 0.6)} of {guardians.length} guardians
            </Text>
            <Text style={styles.thresholdText}>
              required to approve recovery
            </Text>
          </View>
        )}

        {/* Security Note */}
        <View style={styles.securityCard}>
          <Text style={styles.securityIcon}>🔐</Text>
          <Text style={styles.securityTitle}>Quantum-Secure</Text>
          <Text style={styles.securityText}>
            Guardian shares are encrypted with post-quantum cryptography. 
            Even if a guardian's device is compromised, your account remains safe.
          </Text>
        </View>
      </ScrollView>

      {/* Add Guardian Modal */}
      <Modal visible={showAddGuardian} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddGuardian(false)}>
              <Text style={styles.modalClose}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Guardian</Text>
            <View style={styles.headerSpacer} />
          </View>
          
          <View style={styles.modalContent}>
            <Text style={styles.modalInstructions}>
              Choose how to add a guardian
            </Text>
            
            <TouchableOpacity
              style={styles.optionCard}
              onPress={() => {
                setShowAddGuardian(false);
                setShowScanner(true);
              }}
            >
              <Text style={styles.optionIcon}>📷</Text>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Scan Their Spark</Text>
                <Text style={styles.optionText}>
                  Meet in person and scan their Spark code
                </Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.optionCard}
              onPress={() => {
                setShowAddGuardian(false);
                setShowGuardianSpark(true);
              }}
            >
              <Text style={styles.optionIcon}>✨</Text>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Show My Spark</Text>
                <Text style={styles.optionText}>
                  Have them scan your guardian invite Spark
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Scanner Modal */}
      <Modal visible={showScanner} animationType="slide">
        <SparkScanner
          mode="verify_contact"
          showCodeInput
          onVerified={handleGuardianScanned}
          onCancel={() => setShowScanner(false)}
          onError={(error) => {
            Alert.alert('Scan Failed', error);
          }}
        />
      </Modal>

      {/* Show Spark Modal */}
      <Modal visible={showGuardianSpark} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowGuardianSpark(false)}>
              <Text style={styles.modalClose}>Done</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Guardian Invite</Text>
            <View style={styles.headerSpacer} />
          </View>
          
          <View style={styles.modalContent}>
            <Text style={styles.modalInstructions}>
              Have your guardian scan this Spark to accept the invite
            </Text>
            
            <View style={styles.sparkContainer}>
              <SparkDisplay
                walletId="guardian_invite"
                displayMode="full"
                size={280}
                actionType="app.polymessenger/guardian.add"
                autoRefresh={true}
              />
            </View>
            
            <Text style={styles.sparkHelp}>
              Your guardian needs to have Poly Messenger installed
            </Text>
          </View>
        </View>
      </Modal>
    </View>
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
  },
  
  // Info Card
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    margin: 16,
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  infoIcon: {
    fontSize: 32,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoText: {
    color: '#888',
    fontSize: 14,
    lineHeight: 20,
  },
  
  // Section
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#666',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  guardianCount: {
    color: '#7c3aed',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // How It Works
  howItWorks: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
  },
  step: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  stepText: {
    color: '#888',
    fontSize: 13,
  },
  
  // Empty State
  emptyState: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
  },
  
  // Guardian Card
  guardianCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  guardianAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  guardianAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  guardianInfo: {
    flex: 1,
  },
  guardianName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  guardianMeta: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  guardianChevron: {
    color: '#666',
    fontSize: 20,
  },
  
  // Add Button
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    borderStyle: 'dashed',
    gap: 8,
    marginTop: 8,
  },
  addButtonIcon: {
    color: '#7c3aed',
    fontSize: 20,
  },
  addButtonText: {
    color: '#7c3aed',
    fontSize: 16,
    fontWeight: '500',
  },
  
  // Threshold Card
  thresholdCard: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  thresholdTitle: {
    color: '#888',
    fontSize: 12,
    marginBottom: 8,
  },
  thresholdValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 4,
  },
  thresholdText: {
    color: '#666',
    fontSize: 14,
  },
  
  // Security Card
  securityCard: {
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.3)',
  },
  securityIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  securityTitle: {
    color: '#a78bfa',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  securityText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  modalClose: {
    color: '#888',
    fontSize: 16,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 24,
  },
  modalInstructions: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  
  // Option Cards
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    gap: 16,
  },
  optionIcon: {
    fontSize: 32,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionText: {
    color: '#888',
    fontSize: 14,
  },
  
  // Spark Display
  sparkContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  sparkHelp: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default GuardianRecoveryScreen;
