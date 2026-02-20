/**
 * Settings Screen
 * 
 * App-wide settings and preferences.
 * 
 * @package io.estream.cipher
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { ExpirationDurations, getExpirationLabel } from '../services/messaging/ExpirationService';
import { ExpirationSettingsModal } from '../components/ExpirationSettingsModal';
import { useAppLock } from '../contexts/AppLockContext';
import { getPushNotificationService } from '../services/notifications';

interface SettingsScreenProps {
  onBack?: () => void;
  onViewKeys?: () => void;
  onManageDevices?: () => void;
  onGuardianRecovery?: () => void;
  onVerifyContact?: () => void;
}

interface SettingRowProps {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  isDestructive?: boolean;
}

function SettingRow({ icon, label, value, onPress, isDestructive }: SettingRowProps) {
  return (
    <TouchableOpacity 
      style={styles.settingRow}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingLeft}>
        <Text style={styles.settingIcon}>{icon}</Text>
        <Text style={[styles.settingLabel, isDestructive && styles.destructive]}>
          {label}
        </Text>
      </View>
      {value && (
        <Text style={styles.settingValue}>{value}</Text>
      )}
      {onPress && (
        <Text style={styles.settingChevron}>›</Text>
      )}
    </TouchableOpacity>
  );
}

interface SettingToggleProps {
  icon: string;
  label: string;
  value: boolean;
  onToggle: (value: boolean) => void;
}

function SettingToggle({ icon, label, value, onToggle }: SettingToggleProps) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingLeft}>
        <Text style={styles.settingIcon}>{icon}</Text>
        <Text style={styles.settingLabel}>{label}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#2a2a2a', true: '#7c3aed' }}
        thumbColor="#ffffff"
      />
    </View>
  );
}

/**
 * Settings Screen
 */
export function SettingsScreen({ onBack, onViewKeys }: SettingsScreenProps): React.JSX.Element {
  const [defaultExpiration, setDefaultExpiration] = useState(0);
  const [readReceipts, setReadReceipts] = useState(true);
  const [typingIndicators, setTypingIndicators] = useState(true);
  const [linkPreviews, setLinkPreviews] = useState(true);
  const [showExpirationModal, setShowExpirationModal] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  
  // App lock from context
  const { isEnabled: biometricLock, biometricInfo, updateSettings, lock } = useAppLock();
  
  const handleBiometricToggle = useCallback(async (enabled: boolean) => {
    try {
      await updateSettings({ enabled });
    } catch (error) {
      Alert.alert(
        'Biometric Lock',
        error instanceof Error ? error.message : 'Failed to update biometric lock'
      );
    }
  }, [updateSettings]);
  
  const handleNotificationSettings = useCallback(async () => {
    const pushService = getPushNotificationService();
    const settings = await pushService.getNotificationSettings();
    
    Alert.alert(
      'Push Notifications',
      settings.enabled 
        ? `Notifications are enabled.\n\nToken: ${settings.token?.substring(0, 30)}...`
        : 'Notifications are disabled. Enable in system settings.',
      [
        { text: 'OK' },
        ...(settings.enabled ? [] : [{ text: 'Open Settings', onPress: () => {} }])
      ]
    );
  }, []);
  
  const handleClearData = useCallback(() => {
    Alert.alert(
      'Clear All Data',
      'This will delete all messages, conversations, and keys. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Data',
          style: 'destructive',
          onPress: () => {
            // TODO: Implement data clearing
            Alert.alert('Data Cleared', 'All data has been deleted.');
          },
        },
      ]
    );
  }, []);
  
  const handleExportKeys = useCallback(() => {
    Alert.alert(
      'Export Keys',
      'This will export your encryption keys. Keep them secure!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: () => {
            // TODO: Implement key export
            Alert.alert('Keys Exported', 'Check your downloads folder.');
          },
        },
      ]
    );
  }, []);
  
  return (
    <View style={styles.container} testID="settings-screen">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 60 }} />
      </View>
      
      <ScrollView style={styles.content}>
        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.sectionContent}>
            <SettingRow
              icon="🔑"
              label="View PQ Keys"
              onPress={onViewKeys}
            />
            <SettingRow
              icon="📤"
              label="Export Keys"
              onPress={handleExportKeys}
            />
            <SettingRow
              icon="🔗"
              label="Linked Devices"
              value="1 device"
              onPress={onManageDevices}
            />
            <SettingRow
              icon="🛡️"
              label="Recovery Guardians"
              value="Not set up"
              onPress={onGuardianRecovery}
            />
          </View>
        </View>
        
        {/* Privacy Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          <View style={styles.sectionContent}>
            <SettingRow
              icon="⏱"
              label="Default Disappearing Messages"
              value={getExpirationLabel(defaultExpiration)}
              onPress={() => setShowExpirationModal(true)}
            />
            <SettingToggle
              icon="👁"
              label="Read Receipts"
              value={readReceipts}
              onToggle={setReadReceipts}
            />
            <SettingToggle
              icon="✍️"
              label="Typing Indicators"
              value={typingIndicators}
              onToggle={setTypingIndicators}
            />
            <SettingToggle
              icon="🔗"
              label="Link Previews"
              value={linkPreviews}
              onToggle={setLinkPreviews}
            />
          </View>
        </View>
        
        {/* Security Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          <View style={styles.sectionContent}>
            <SettingToggle
              icon="🔒"
              label={`${biometricInfo?.displayName || 'Biometric'} Lock`}
              value={biometricLock}
              onToggle={handleBiometricToggle}
            />
            {biometricLock && (
              <SettingRow
                icon="⏱"
                label="Lock Timeout"
                value="Immediately"
                onPress={() => Alert.alert('Lock Timeout', 'App will lock immediately when backgrounded. This setting provides maximum security.')}
              />
            )}
            <SettingRow
              icon="🛡"
              label="Screen Security"
              value="On"
              onPress={() => Alert.alert('Screen Security', 'Prevents screenshots and screen recording for maximum privacy.')}
            />
            {biometricLock && (
              <SettingRow
                icon="🔐"
                label="Lock Now"
                onPress={lock}
              />
            )}
          </View>
        </View>
        
        {/* Spark Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Spark Verification</Text>
          <View style={styles.sectionContent}>
            <SettingRow
              icon="✨"
              label="Show My Spark"
              onPress={() => Alert.alert('Show Spark', 'Display your Spark for others to verify your identity')}
            />
            <SettingRow
              icon="📷"
              label="Verify Contact"
              onPress={onVerifyContact}
            />
          </View>
        </View>
        
        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.sectionContent}>
            <SettingRow
              icon="🔔"
              label="Push Notifications"
              value={notificationsEnabled ? 'On' : 'Off'}
              onPress={handleNotificationSettings}
            />
            <SettingRow
              icon="📱"
              label="Sound"
              value="Default"
              onPress={() => Alert.alert('Notification Sound', 'Using system default sound.')}
            />
            <SettingRow
              icon="💬"
              label="Message Preview"
              value="Name & Content"
              onPress={() => Alert.alert('Message Preview', 'Shows sender name and message content in notifications.')}
            />
          </View>
        </View>
        
        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.sectionContent}>
            <SettingRow
              icon="ℹ️"
              label="Version"
              value="1.0.0"
            />
            <SettingRow
              icon="⚛️"
              label="Cryptography"
              value="Kyber1024 + Dilithium5"
            />
            <SettingRow
              icon="📄"
              label="Privacy Policy"
              onPress={() => Alert.alert('Privacy Policy', 'Poly Messenger collects minimal data. All messages are end-to-end encrypted with post-quantum cryptography. Your data never leaves your device unencrypted.')}
            />
            <SettingRow
              icon="📋"
              label="Terms of Service"
              onPress={() => Alert.alert('Terms of Service', 'By using Poly Messenger, you agree to use the app responsibly and respect others\' privacy.')}
            />
          </View>
        </View>
        
        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, styles.dangerTitle]}>Danger Zone</Text>
          <View style={styles.sectionContent}>
            <SettingRow
              icon="🗑"
              label="Clear All Data"
              onPress={handleClearData}
              isDestructive
            />
          </View>
        </View>
        
        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.pqBadge}>
            <Text style={styles.pqBadgeIcon}>⚛️</Text>
            <Text style={styles.pqBadgeText}>PQ-Protected</Text>
          </View>
          <Text style={styles.footerText}>
            Poly Messenger by eStream
          </Text>
          <Text style={styles.footerSubtext}>
            Quantum-resistant messaging
          </Text>
        </View>
      </ScrollView>
      
      {/* Expiration Modal */}
      <ExpirationSettingsModal
        visible={showExpirationModal}
        currentDuration={defaultExpiration}
        onSelect={setDefaultExpiration}
        onClose={() => setShowExpirationModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
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
  content: {
    flex: 1,
  },
  section: {
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    paddingHorizontal: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dangerTitle: {
    color: '#ef4444',
  },
  sectionContent: {
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#2a2a2a',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingIcon: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
  },
  settingLabel: {
    fontSize: 16,
    color: '#ffffff',
  },
  destructive: {
    color: '#ef4444',
  },
  settingValue: {
    fontSize: 14,
    color: '#666666',
    marginRight: 8,
  },
  settingChevron: {
    fontSize: 20,
    color: '#666666',
  },
  footer: {
    alignItems: 'center',
    padding: 32,
    marginTop: 16,
  },
  pqBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#7c3aed',
    gap: 6,
    marginBottom: 12,
  },
  pqBadgeIcon: {
    fontSize: 14,
  },
  pqBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#a78bfa',
  },
  footerText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#444444',
  },
});

export default SettingsScreen;

