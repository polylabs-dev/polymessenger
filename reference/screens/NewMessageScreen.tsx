/**
 * New Message Screen
 * 
 * Start a new conversation - similar to Signal's new message flow.
 * Supports: New contact, Group creation, Invite friends
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
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
};

interface Contact {
  id: string;
  name: string;
  keyHash: string;
  isOnline?: boolean;
}

interface Props {
  contacts: Contact[];
  onSelectContact: (contact: Contact) => void;
  onCreateGroup: () => void;
  onAddContact: (name: string, keyHash: string) => void;
  onBack: () => void;
}

export function NewMessageScreen({ contacts, onSelectContact, onCreateGroup, onAddContact, onBack }: Props): React.JSX.Element {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddNew, setShowAddNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newKeyHash, setNewKeyHash] = useState('');

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleInvite = useCallback(async () => {
    try {
      await Share.share({
        message: `Join me on Poly Messenger! Download and add me: poly://invite/YOUR_KEY_HASH\n\n🔐 Quantum-secure messaging powered by eStream`,
        title: 'Invite to Poly Messenger',
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  }, []);

  const handleAddContact = useCallback(() => {
    if (newName.trim() && newKeyHash.trim()) {
      onAddContact(newName.trim(), newKeyHash.trim());
      setNewName('');
      setNewKeyHash('');
      setShowAddNew(false);
      Alert.alert('Contact Added', `${newName} has been added to your contacts.`);
    }
  }, [newName, newKeyHash, onAddContact]);

  const Avatar = ({ name, size = 44 }: { name: string; size?: number }) => {
    const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2);
    const hue = name.charCodeAt(0) * 137.5 % 360;
    return (
      <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: `hsl(${hue}, 50%, 35%)` }]}>
        <Text style={[styles.avatarText, { fontSize: size * 0.4 }]}>{initials}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backButton}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>New Message</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Search */}
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

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionItem} onPress={onCreateGroup}>
          <View style={[styles.actionIcon, { backgroundColor: colors.primary }]}>
            <Text style={styles.actionIconText}>👥</Text>
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>New Group</Text>
            <Text style={styles.actionSubtitle}>Create a group with multiple contacts</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem} onPress={handleInvite}>
          <View style={[styles.actionIcon, { backgroundColor: colors.secondary }]}>
            <Text style={styles.actionIconText}>📨</Text>
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Invite Friends</Text>
            <Text style={styles.actionSubtitle}>Share your Poly link</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem} onPress={() => setShowAddNew(true)}>
          <View style={[styles.actionIcon, { backgroundColor: colors.success }]}>
            <Text style={styles.actionIconText}>➕</Text>
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Add by Key</Text>
            <Text style={styles.actionSubtitle}>Enter a key hash or scan Spark</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Add New Contact Form */}
      {showAddNew && (
        <View style={styles.addNewForm}>
          <Text style={styles.formTitle}>Add New Contact</Text>
          <TextInput
            style={styles.input}
            value={newName}
            onChangeText={setNewName}
            placeholder="Name"
            placeholderTextColor={colors.textMuted}
          />
          <TextInput
            style={styles.input}
            value={newKeyHash}
            onChangeText={setNewKeyHash}
            placeholder="Key hash or invite link"
            placeholderTextColor={colors.textMuted}
          />
          <View style={styles.formButtons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddNew(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.addBtn, (!newName.trim() || !newKeyHash.trim()) && styles.btnDisabled]}
              onPress={handleAddContact}
              disabled={!newName.trim() || !newKeyHash.trim()}
            >
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Contact List */}
      <Text style={styles.sectionTitle}>Contacts</Text>
      <FlatList
        data={filteredContacts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.contactItem} onPress={() => onSelectContact(item)}>
            <Avatar name={item.name} />
            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>{item.name}</Text>
              <Text style={styles.contactKey}>{item.keyHash.substring(0, 16)}...</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyList}>
            <Text style={styles.emptyText}>
              {searchQuery ? 'No contacts match your search' : 'No contacts yet'}
            </Text>
          </View>
        }
        style={styles.contactList}
      />
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    margin: 16,
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
  actions: {
    borderBottomWidth: 8,
    borderBottomColor: colors.surface,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIconText: {
    fontSize: 18,
  },
  actionContent: {
    flex: 1,
    marginLeft: 14,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  actionSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  chevron: {
    fontSize: 24,
    color: colors.textMuted,
  },
  addNewForm: {
    backgroundColor: colors.surface,
    margin: 16,
    borderRadius: 12,
    padding: 16,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  input: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
  },
  cancelBtnText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  addBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  addBtnText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    paddingHorizontal: 16,
    paddingTop: 16,
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
  avatar: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: colors.text,
    fontWeight: '600',
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
  contactKey: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  emptyList: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 15,
  },
});

