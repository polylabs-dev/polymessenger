/**
 * Expiration Settings Screen
 * 
 * Settings screen for configuring message expiration at app level.
 * 
 * @package io.estream.polymessenger
 * @issue #104
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  SafeAreaView,
} from 'react-native';
import { useExpirationConfig } from '../../hooks/useExpiration';
import { ExpirationDurations, getExpirationLabel } from '../../services/messaging/ExpirationService';

/**
 * Expiration duration options
 */
const EXPIRATION_OPTIONS = [
  { value: 0, label: 'Off' },
  { value: ExpirationDurations.ONE_HOUR, label: '1 hour' },
  { value: ExpirationDurations.ONE_DAY, label: '1 day' },
  { value: 7 * 24 * 60 * 60, label: '7 days' },
  { value: 30 * 24 * 60 * 60, label: '30 days' },
];

interface ExpirationSettingsScreenProps {
  navigation?: {
    goBack: () => void;
  };
}

export function ExpirationSettingsScreen({ 
  navigation 
}: ExpirationSettingsScreenProps): React.JSX.Element {
  const { config, loading, updateConfig } = useExpirationConfig();
  
  const [selectedDuration, setSelectedDuration] = useState<number>(
    config?.defaultTtlSeconds ?? 0
  );
  const [allowPerMessage, setAllowPerMessage] = useState(
    config?.allowPerMessageExpiration ?? true
  );
  const [viewOnceByDefault, setViewOnceByDefault] = useState(
    config?.viewOnceByDefault ?? false
  );

  // Update when config loads
  React.useEffect(() => {
    if (config) {
      setSelectedDuration(config.defaultTtlSeconds);
      setAllowPerMessage(config.allowPerMessageExpiration);
      setViewOnceByDefault(config.viewOnceByDefault);
    }
  }, [config]);

  const handleDurationSelect = useCallback(async (duration: number) => {
    setSelectedDuration(duration);
    await updateConfig({ defaultTtlSeconds: duration });
  }, [updateConfig]);

  const handleAllowPerMessageToggle = useCallback(async (value: boolean) => {
    setAllowPerMessage(value);
    await updateConfig({ allowPerMessageExpiration: value });
  }, [updateConfig]);

  const handleViewOnceToggle = useCallback(async (value: boolean) => {
    setViewOnceByDefault(value);
    await updateConfig({ viewOnceByDefault: value });
  }, [updateConfig]);

  const handleBack = useCallback(() => {
    navigation?.goBack();
  }, [navigation]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Message Expiration</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content}>
        {/* Default Expiration Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DEFAULT EXPIRATION</Text>
          <View style={styles.optionsList}>
            {EXPIRATION_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.optionRow}
                onPress={() => handleDurationSelect(option.value)}
              >
                <View style={styles.radioContainer}>
                  <View style={[
                    styles.radio,
                    selectedDuration === option.value && styles.radioSelected,
                  ]}>
                    {selectedDuration === option.value && (
                      <View style={styles.radioInner} />
                    )}
                  </View>
                  <Text style={styles.optionLabel}>{option.label}</Text>
                </View>
                {selectedDuration === option.value && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
          
          <Text style={styles.sectionDescription}>
            {selectedDuration === 0
              ? 'Messages will not expire by default.'
              : `Messages will automatically delete ${getExpirationLabel(selectedDuration)} after being sent.`}
          </Text>
        </View>

        {/* Options Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>OPTIONS</Text>
          <View style={styles.optionsList}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleContent}>
                <Text style={styles.toggleLabel}>Allow per-message expiration</Text>
                <Text style={styles.toggleDescription}>
                  Override expiration for individual messages
                </Text>
              </View>
              <Switch
                value={allowPerMessage}
                onValueChange={handleAllowPerMessageToggle}
                trackColor={{ false: '#3a3a3a', true: '#7c3aed' }}
                thumbColor={allowPerMessage ? '#a78bfa' : '#666'}
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleContent}>
                <Text style={styles.toggleLabel}>View once by default</Text>
                <Text style={styles.toggleDescription}>
                  Messages delete immediately after being viewed
                </Text>
              </View>
              <Switch
                value={viewOnceByDefault}
                onValueChange={handleViewOnceToggle}
                trackColor={{ false: '#3a3a3a', true: '#7c3aed' }}
                thumbColor={viewOnceByDefault ? '#a78bfa' : '#666'}
              />
            </View>
          </View>
        </View>

        {/* Security Info */}
        <View style={styles.securitySection}>
          <View style={styles.securityRow}>
            <Text style={styles.securityIcon}>🔐</Text>
            <Text style={styles.securityText}>
              Message deletion is cryptographically verified using post-quantum signatures. 
              Deleted messages cannot be recovered.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    fontSize: 24,
    color: '#fff',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
    lineHeight: 20,
  },
  optionsList: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  radioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: '#7c3aed',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#7c3aed',
  },
  optionLabel: {
    fontSize: 16,
    color: '#fff',
  },
  checkmark: {
    fontSize: 16,
    color: '#7c3aed',
    fontWeight: 'bold',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  toggleContent: {
    flex: 1,
    marginRight: 16,
  },
  toggleLabel: {
    fontSize: 16,
    color: '#fff',
  },
  toggleDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  securitySection: {
    padding: 16,
    marginTop: 24,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  securityIcon: {
    fontSize: 20,
  },
  securityText: {
    flex: 1,
    fontSize: 13,
    color: '#a78bfa',
    lineHeight: 20,
  },
});

export default ExpirationSettingsScreen;
