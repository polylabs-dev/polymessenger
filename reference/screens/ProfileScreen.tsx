/**
 * Profile Screen
 * 
 * View and manage your profile and contact details.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Share,
  Alert,
} from 'react-native';

const colors = {
  background: '#0f0f0f',
  surface: '#1a1a1a',
  surfaceLight: '#252525',
  primary: '#3b82f6',
  secondary: '#7c3aed',
  text: '#ffffff',
  textSecondary: '#9ca3af',
  textMuted: '#6b7280',
  border: '#2a2a2a',
  success: '#22c55e',
  error: '#ef4444',
};

interface ProfileData {
  name: string;
  keyHash: string;
  deviceId: string;
  joinedDate: string;
}

interface Props {
  profile: ProfileData;
  onUpdateName: (name: string) => void;
  onBack: () => void;
}

export function ProfileScreen({ profile, onUpdateName, onBack }: Props): React.JSX.Element {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(profile.name);

  const handleSave = () => {
    if (name.trim()) {
      onUpdateName(name.trim());
      setIsEditing(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Add me on Poly Messenger!\n\nName: ${profile.name}\nKey: ${profile.keyHash}\n\nLink: poly://add/${profile.keyHash}\n\n🔐 Quantum-secure messaging`,
        title: 'Share My Profile',
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const handleCopyKey = () => {
    // In a real app, you'd use Clipboard API
    Alert.alert('Copied!', 'Your key hash has been copied to clipboard.');
  };

  const Avatar = ({ size = 100 }: { size?: number }) => {
    const initials = profile.name.split(' ').map(n => n[0]).join('').substring(0, 2);
    const hue = profile.name.charCodeAt(0) * 137.5 % 360;
    return (
      <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: `hsl(${hue}, 50%, 35%)` }]}>
        <Text style={[styles.avatarText, { fontSize: size * 0.35 }]}>{initials}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Profile</Text>
        <TouchableOpacity onPress={handleShare}>
          <Text style={styles.shareButton}>Share</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <Avatar />
          
          {isEditing ? (
            <View style={styles.editContainer}>
              <TextInput
                style={styles.nameInput}
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={colors.textMuted}
                autoFocus
              />
              <View style={styles.editButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => {
                  setName(profile.name);
                  setIsEditing(false);
                }}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.nameContainer} onPress={() => setIsEditing(true)}>
              <Text style={styles.profileName}>{profile.name}</Text>
              <Text style={styles.editHint}>Tap to edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Spark Display */}
        <View style={styles.sparkCard}>
          <View style={styles.sparkPlaceholder}>
            <Text style={styles.sparkIcon}>✨</Text>
            <Text style={styles.sparkText}>My Spark</Text>
          </View>
          <Text style={styles.sparkDescription}>
            Others can scan this to add you
          </Text>
        </View>

        {/* Key Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          
          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Text>🔐</Text>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Key Hash</Text>
              <Text style={styles.infoValue} numberOfLines={1}>{profile.keyHash}</Text>
            </View>
            <TouchableOpacity style={styles.copyButton} onPress={handleCopyKey}>
              <Text style={styles.copyButtonText}>Copy</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Text>📱</Text>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Device ID</Text>
              <Text style={styles.infoValue}>{profile.deviceId}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Text>📅</Text>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Joined</Text>
              <Text style={styles.infoValue}>{profile.joinedDate}</Text>
            </View>
          </View>
        </View>

        {/* Cryptography Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cryptography</Text>
          
          <View style={styles.cryptoCard}>
            <View style={styles.cryptoItem}>
              <Text style={styles.cryptoLabel}>Key Exchange</Text>
              <Text style={styles.cryptoValue}>ML-KEM-1024</Text>
              <Text style={styles.cryptoStatus}>● Quantum-Safe</Text>
            </View>
            <View style={styles.cryptoDivider} />
            <View style={styles.cryptoItem}>
              <Text style={styles.cryptoLabel}>Signatures</Text>
              <Text style={styles.cryptoValue}>ML-DSA-87</Text>
              <Text style={styles.cryptoStatus}>● Quantum-Safe</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <Text style={styles.actionButtonIcon}>📤</Text>
            <Text style={styles.actionButtonText}>Share Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionButton, styles.dangerButton]}>
            <Text style={styles.actionButtonIcon}>🗑️</Text>
            <Text style={styles.dangerButtonText}>Delete Account</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Poly Messenger by eStream</Text>
          <Text style={styles.versionText}>v1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  shareButton: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: 32,
    borderBottomWidth: 8,
    borderBottomColor: colors.surface,
  },
  avatar: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: colors.text,
    fontWeight: '600',
  },
  nameContainer: {
    alignItems: 'center',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  editHint: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
  editContainer: {
    width: '80%',
    alignItems: 'center',
  },
  nameInput: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    color: colors.text,
    textAlign: 'center',
    width: '100%',
    marginBottom: 12,
  },
  editButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.surfaceLight,
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  saveButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  sparkCard: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 8,
    borderBottomColor: colors.surface,
  },
  sparkPlaceholder: {
    width: 160,
    height: 160,
    backgroundColor: colors.surface,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  sparkIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  sparkText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  sparkDescription: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  section: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 8,
    borderBottomColor: colors.surface,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    color: colors.text,
    fontFamily: 'monospace',
  },
  copyButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.surfaceLight,
    borderRadius: 6,
  },
  copyButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  cryptoCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
  },
  cryptoItem: {
    flex: 1,
    alignItems: 'center',
  },
  cryptoLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
  },
  cryptoValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 4,
  },
  cryptoStatus: {
    fontSize: 11,
    color: colors.success,
    fontWeight: '500',
  },
  cryptoDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: 10,
    marginBottom: 10,
  },
  actionButtonIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  actionButtonText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  dangerButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  dangerButtonText: {
    fontSize: 16,
    color: colors.error,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  footerText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  versionText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
});

