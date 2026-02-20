/**
 * Device Management Screen
 * 
 * Manage linked devices with Spark-based authentication.
 * - View all linked devices
 * - Link new device via Spark scan
 * - Revoke device access with Spark confirmation
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
import { WalletConnectionService } from '../services/spark/WalletConnectionService';

// ============================================================================
// Types
// ============================================================================

interface Device {
  id: string;
  name: string;
  type: 'mobile' | 'desktop' | 'web';
  lastSeen: number;
  isCurrentDevice: boolean;
  linkedAt: number;
}

interface DeviceManagementScreenProps {
  onBack?: () => void;
}

// Mock devices for UI demonstration
const MOCK_DEVICES: Device[] = [
  {
    id: 'dev_1',
    name: 'iPhone 15 Pro',
    type: 'mobile',
    lastSeen: Date.now(),
    isCurrentDevice: true,
    linkedAt: Date.now() - 86400000 * 30,
  },
];

// ============================================================================
// Component
// ============================================================================

export function DeviceManagementScreen({ onBack }: DeviceManagementScreenProps): React.JSX.Element {
  const [devices, setDevices] = useState<Device[]>(MOCK_DEVICES);
  const [showLinkDevice, setShowLinkDevice] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [linkingSparkCode, setLinkingSparkCode] = useState<string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  // Format relative time
  const formatLastSeen = (timestamp: number): string => {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'Now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  // Format date
  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Get device icon
  const getDeviceIcon = (type: string): string => {
    switch (type) {
      case 'mobile': return '📱';
      case 'desktop': return '💻';
      case 'web': return '🌐';
      default: return '📟';
    }
  };

  // Generate link code for new device
  const handleStartLink = useCallback(async () => {
    setIsGeneratingLink(true);
    try {
      const service = new WalletConnectionService();
      const session = await service.createLoginSession({
        sessionId: `link_${Date.now()}`,
        deviceType: 'new_device',
        displayName: 'Link New Device',
      });
      
      setLinkingSparkCode(session.sparkCode);
      setShowLinkDevice(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to generate device link');
    } finally {
      setIsGeneratingLink(false);
    }
  }, []);

  // Handle successful device link
  const handleDeviceLinked = useCallback((result: SparkScanResult) => {
    setShowScanner(false);
    
    // Add new device to list
    const newDevice: Device = {
      id: `dev_${Date.now()}`,
      name: result.actionData?.deviceName || 'New Device',
      type: (result.actionData?.deviceType as 'mobile' | 'desktop' | 'web') || 'mobile',
      lastSeen: Date.now(),
      isCurrentDevice: false,
      linkedAt: Date.now(),
    };
    
    setDevices(prev => [...prev, newDevice]);
    Alert.alert('Success', 'Device linked successfully');
  }, []);

  // Revoke device access
  const handleRevokeDevice = useCallback((device: Device) => {
    if (device.isCurrentDevice) {
      Alert.alert('Cannot Remove', 'You cannot remove the current device.');
      return;
    }

    Alert.alert(
      'Revoke Device',
      `Remove "${device.name}" from your account? This device will no longer have access to your messages.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke Access',
          style: 'destructive',
          onPress: () => {
            // In production: verify with Spark before revoking
            setDevices(prev => prev.filter(d => d.id !== device.id));
            Alert.alert('Device Removed', 'The device has been removed from your account.');
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
        <Text style={styles.title}>Linked Devices</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>🔗</Text>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Device Linking</Text>
            <Text style={styles.infoText}>
              Link multiple devices to access your messages everywhere. 
              All devices use the same encryption keys.
            </Text>
          </View>
        </View>

        {/* Devices List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>YOUR DEVICES</Text>
          
          {devices.map(device => (
            <TouchableOpacity
              key={device.id}
              style={styles.deviceCard}
              onPress={() => handleRevokeDevice(device)}
              disabled={device.isCurrentDevice}
            >
              <View style={styles.deviceIcon}>
                <Text style={styles.deviceIconText}>{getDeviceIcon(device.type)}</Text>
              </View>
              
              <View style={styles.deviceInfo}>
                <View style={styles.deviceNameRow}>
                  <Text style={styles.deviceName}>{device.name}</Text>
                  {device.isCurrentDevice && (
                    <View style={styles.currentBadge}>
                      <Text style={styles.currentBadgeText}>This Device</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.deviceMeta}>
                  Last seen: {formatLastSeen(device.lastSeen)} • Linked: {formatDate(device.linkedAt)}
                </Text>
              </View>
              
              {!device.isCurrentDevice && (
                <Text style={styles.deviceChevron}>›</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Link New Device */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.linkButton}
            onPress={handleStartLink}
            disabled={isGeneratingLink}
          >
            <Text style={styles.linkButtonIcon}>+</Text>
            <Text style={styles.linkButtonText}>
              {isGeneratingLink ? 'Generating...' : 'Link New Device'}
            </Text>
          </TouchableOpacity>
          
          <Text style={styles.linkHelp}>
            Scan the Spark code from another device to link it to your account
          </Text>
        </View>

        {/* Security Info */}
        <View style={styles.securityCard}>
          <Text style={styles.securityIcon}>🔐</Text>
          <Text style={styles.securityTitle}>Spark-Protected</Text>
          <Text style={styles.securityText}>
            Device linking requires Spark verification. Only devices you 
            physically scan can join your account.
          </Text>
        </View>
      </ScrollView>

      {/* Link Device Modal - Shows Spark to scan */}
      <Modal visible={showLinkDevice} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowLinkDevice(false)}>
              <Text style={styles.modalClose}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Link New Device</Text>
            <View style={styles.headerSpacer} />
          </View>
          
          <View style={styles.modalContent}>
            <Text style={styles.modalInstructions}>
              On your new device, open Poly Messenger and scan this Spark
            </Text>
            
            {linkingSparkCode && (
              <View style={styles.sparkContainer}>
                <SparkDisplay
                  walletId="device_link"
                  displayMode="full"
                  size={280}
                  actionType="app.polymessenger/device.link"
                  autoRefresh={true}
                />
              </View>
            )}
            
            <View style={styles.stepsContainer}>
              <View style={styles.step}>
                <Text style={styles.stepNumber}>1</Text>
                <Text style={styles.stepText}>Open Poly on new device</Text>
              </View>
              <View style={styles.step}>
                <Text style={styles.stepNumber}>2</Text>
                <Text style={styles.stepText}>Tap "I have an account"</Text>
              </View>
              <View style={styles.step}>
                <Text style={styles.stepNumber}>3</Text>
                <Text style={styles.stepText}>Scan this Spark</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Scanner Modal */}
      <Modal visible={showScanner} animationType="slide">
        <SparkScanner
          mode="link_device"
          onVerified={handleDeviceLinked}
          onCancel={() => setShowScanner(false)}
          onError={(error) => {
            Alert.alert('Scan Failed', error);
          }}
        />
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
  sectionTitle: {
    color: '#666',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 12,
  },
  
  // Device Card
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  deviceIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  deviceIconText: {
    fontSize: 20,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deviceName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  currentBadge: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  currentBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  deviceMeta: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  deviceChevron: {
    color: '#666',
    fontSize: 20,
  },
  
  // Link Button
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7c3aed',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  linkButtonIcon: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '300',
  },
  linkButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkHelp: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
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
    alignItems: 'center',
  },
  modalInstructions: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  sparkContainer: {
    marginBottom: 32,
  },
  stepsContainer: {
    alignSelf: 'stretch',
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 16,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#7c3aed',
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 28,
  },
  stepText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default DeviceManagementScreen;
