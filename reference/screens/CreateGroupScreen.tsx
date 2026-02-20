/**
 * Create Group Screen
 * 
 * Signal-like group creation flow with member selection and group settings.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ScrollView,
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

interface Contact {
  id: string;
  name: string;
  keyHash: string;
  isOnline?: boolean;
}

interface Props {
  contacts: Contact[];
  onCreateGroup: (name: string, members: string[], icon?: string) => void;
  onBack: () => void;
}

const GROUP_ICONS = ['👥', '🏠', '💼', '🎮', '📚', '🎵', '⚽', '🌍', '❤️', '🔥'];

export function CreateGroupScreen({ contacts, onCreateGroup, onBack }: Props): React.JSX.Element {
  const [step, setStep] = useState<'members' | 'details'>('members');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('👥');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleMember = useCallback((contactId: string) => {
    setSelectedMembers(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  }, []);

  const handleNext = useCallback(() => {
    if (selectedMembers.length === 0) {
      Alert.alert('Select Members', 'Please select at least one member for the group.');
      return;
    }
    setStep('details');
  }, [selectedMembers]);

  const handleCreate = useCallback(() => {
    if (!groupName.trim()) {
      Alert.alert('Group Name Required', 'Please enter a name for the group.');
      return;
    }
    onCreateGroup(groupName.trim(), selectedMembers, selectedIcon);
  }, [groupName, selectedMembers, selectedIcon, onCreateGroup]);

  const Avatar = ({ name, size = 44, selected = false }: { name: string; size?: number; selected?: boolean }) => {
    const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2);
    const hue = name.charCodeAt(0) * 137.5 % 360;
    return (
      <View style={[
        styles.avatar, 
        { width: size, height: size, borderRadius: size / 2, backgroundColor: `hsl(${hue}, 50%, 35%)` },
        selected && styles.avatarSelected
      ]}>
        <Text style={[styles.avatarText, { fontSize: size * 0.4 }]}>{initials}</Text>
        {selected && (
          <View style={styles.checkmark}>
            <Text style={styles.checkmarkText}>✓</Text>
          </View>
        )}
      </View>
    );
  };

  // Step 1: Select Members
  if (step === 'members') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack}>
            <Text style={styles.backButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>New Group</Text>
          <TouchableOpacity onPress={handleNext}>
            <Text style={[styles.nextButton, selectedMembers.length === 0 && styles.buttonDisabled]}>
              Next
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search contacts..."
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {/* Selected Members Pills */}
        {selectedMembers.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectedContainer}>
            {selectedMembers.map(id => {
              const contact = contacts.find(c => c.id === id);
              if (!contact) return null;
              return (
                <TouchableOpacity 
                  key={id} 
                  style={styles.selectedPill}
                  onPress={() => toggleMember(id)}
                >
                  <Avatar name={contact.name} size={32} />
                  <Text style={styles.selectedName}>{contact.name.split(' ')[0]}</Text>
                  <Text style={styles.removeMember}>✕</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        <Text style={styles.sectionTitle}>
          {selectedMembers.length === 0 ? 'Add Members' : `${selectedMembers.length} selected`}
        </Text>

        <FlatList
          data={filteredContacts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isSelected = selectedMembers.includes(item.id);
            return (
              <TouchableOpacity 
                style={[styles.contactItem, isSelected && styles.contactItemSelected]} 
                onPress={() => toggleMember(item.id)}
              >
                <Avatar name={item.name} selected={isSelected} />
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{item.name}</Text>
                </View>
                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                  {isSelected && <Text style={styles.checkboxText}>✓</Text>}
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyList}>
              <Text style={styles.emptyText}>No contacts to add</Text>
            </View>
          }
          style={styles.contactList}
        />
      </View>
    );
  }

  // Step 2: Group Details
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setStep('members')}>
          <Text style={styles.backButton}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Group Info</Text>
        <TouchableOpacity onPress={handleCreate}>
          <Text style={[styles.createButton, !groupName.trim() && styles.buttonDisabled]}>
            Create
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.detailsContainer}>
        {/* Group Icon */}
        <View style={styles.iconSelector}>
          <View style={styles.mainIcon}>
            <Text style={styles.mainIconText}>{selectedIcon}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconOptions}>
            {GROUP_ICONS.map((icon) => (
              <TouchableOpacity 
                key={icon} 
                style={[styles.iconOption, icon === selectedIcon && styles.iconOptionSelected]}
                onPress={() => setSelectedIcon(icon)}
              >
                <Text style={styles.iconOptionText}>{icon}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Group Name */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Group Name</Text>
          <TextInput
            style={styles.nameInput}
            value={groupName}
            onChangeText={setGroupName}
            placeholder="Enter group name..."
            placeholderTextColor={colors.textMuted}
            autoFocus
          />
        </View>

        {/* Members Preview */}
        <View style={styles.membersPreview}>
          <Text style={styles.inputLabel}>Members ({selectedMembers.length})</Text>
          <View style={styles.memberAvatars}>
            {selectedMembers.slice(0, 6).map((id, index) => {
              const contact = contacts.find(c => c.id === id);
              if (!contact) return null;
              return (
                <View key={id} style={[styles.memberAvatar, { marginLeft: index > 0 ? -12 : 0 }]}>
                  <Avatar name={contact.name} size={36} />
                </View>
              );
            })}
            {selectedMembers.length > 6 && (
              <View style={[styles.memberAvatar, styles.moreMembers, { marginLeft: -12 }]}>
                <Text style={styles.moreMembersText}>+{selectedMembers.length - 6}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Security Note */}
        <View style={styles.securityNote}>
          <Text style={styles.securityIcon}>🔐</Text>
          <Text style={styles.securityText}>
            Messages in this group are protected with post-quantum encryption. 
            Only members can read the messages.
          </Text>
        </View>
      </View>
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
  nextButton: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  createButton: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    margin: 16,
    marginBottom: 8,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  selectedContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  selectedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingRight: 10,
    marginRight: 8,
  },
  selectedName: {
    color: colors.text,
    fontSize: 14,
    marginLeft: 8,
    marginRight: 4,
  },
  removeMember: {
    color: colors.textMuted,
    fontSize: 14,
    padding: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contactList: {
    flex: 1,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  contactItemSelected: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  avatar: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  avatarText: {
    color: colors.text,
    fontWeight: '600',
  },
  checkmark: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '700',
  },
  contactInfo: {
    marginLeft: 14,
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  emptyList: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 15,
  },
  detailsContainer: {
    padding: 20,
  },
  iconSelector: {
    alignItems: 'center',
    marginBottom: 24,
  },
  mainIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  mainIconText: {
    fontSize: 40,
  },
  iconOptions: {
    flexDirection: 'row',
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  iconOptionSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  iconOptionText: {
    fontSize: 22,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nameInput: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  membersPreview: {
    marginBottom: 24,
  },
  memberAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  memberAvatar: {
    borderWidth: 2,
    borderColor: colors.background,
    borderRadius: 20,
  },
  moreMembers: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreMembersText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  securityNote: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: 'flex-start',
  },
  securityIcon: {
    fontSize: 18,
    marginRight: 12,
    marginTop: 2,
  },
  securityText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
});

