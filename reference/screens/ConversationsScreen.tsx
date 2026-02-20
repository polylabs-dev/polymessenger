/**
 * Conversations Screen
 * 
 * List of all P2P conversations following Signal's UX patterns.
 * 
 * Signal Reference:
 * - Avatar, name, time on first row
 * - Message preview, unread badge on second row
 * - Swipe actions for archive/delete
 */

import React, { useState, useCallback } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  RefreshControl,
} from 'react-native';
import { Conversation, ConversationState } from '../types';

interface ConversationsScreenProps {
  onSelectConversation?: (id: string) => void;
}

// Mock conversations for development
const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv_1',
    peerKeyHash: '7c3aed9f4b2c8d1a',
    peerDisplayName: 'Alice Chen',
    state: ConversationState.Active,
    lastMessage: 'Hey, did you see the latest proposal?',
    lastMessageTime: Date.now() - 2 * 60 * 1000, // 2 min ago
    unreadCount: 0,
    hasActiveRatchet: true,
  },
  {
    id: 'conv_2',
    peerKeyHash: '9f2b1c4d8e7a6f3c',
    peerDisplayName: 'Bob Smith',
    state: ConversationState.Active,
    lastMessage: 'Sent the documents via TakeTitle',
    lastMessageTime: Date.now() - 15 * 60 * 1000, // 15 min ago
    unreadCount: 2,
    hasActiveRatchet: true,
  },
  {
    id: 'conv_3',
    peerKeyHash: 'a2d54b9e0c1f7a8b',
    peerDisplayName: 'Carol Davis',
    state: ConversationState.Active,
    lastMessage: 'Thanks for the update!',
    lastMessageTime: Date.now() - 60 * 60 * 1000, // 1 hour ago
    unreadCount: 0,
    hasActiveRatchet: true,
  },
];

export function ConversationsScreen({ onSelectConversation }: ConversationsScreenProps): React.JSX.Element {
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // TODO: Fetch conversations from MessagingService
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return '';
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return new Date(timestamp).toLocaleDateString();
  };

  const getInitials = (name?: string, hash?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    }
    return hash?.substring(0, 2).toUpperCase() || '??';
  };

  const filteredConversations = conversations.filter(c => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      c.peerDisplayName?.toLowerCase().includes(query) ||
      c.peerKeyHash.toLowerCase().includes(query) ||
      c.lastMessage?.toLowerCase().includes(query)
    );
  });

  const renderConversationItem = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={() => onSelectConversation?.(item.id)}
      activeOpacity={0.7}
      testID="conversation-item"
    >
      {/* Avatar */}
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {getInitials(item.peerDisplayName, item.peerKeyHash)}
        </Text>
        {item.hasActiveRatchet && (
          <View style={styles.securityIndicator}>
            <Text style={styles.securityIndicatorText}>⚛️</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.conversationContent}>
        <View style={styles.topRow}>
          <Text style={styles.conversationName} numberOfLines={1}>
            {item.peerDisplayName || item.peerKeyHash.substring(0, 8)}
          </Text>
          <Text style={styles.conversationTime}>
            {formatTime(item.lastMessageTime)}
          </Text>
        </View>
        <View style={styles.bottomRow}>
          <Text 
            style={[
              styles.conversationPreview,
              item.unreadCount > 0 && styles.conversationPreviewUnread
            ]} 
            numberOfLines={1}
          >
            {item.lastMessage || 'No messages yet'}
          </Text>
          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>
                {item.unreadCount > 99 ? '99+' : item.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container} testID="conversations-screen">
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <View style={styles.headerRight}>
          <View style={styles.quantumBadge}>
            <Text style={styles.quantumBadgeText}>⚛️ PQ</Text>
          </View>
          <TouchableOpacity style={styles.composeButton} testID="new-conversation-button">
            <Text style={styles.composeButtonText}>✏️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search..."
          placeholderTextColor="#666666"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity 
            style={styles.clearSearch}
            onPress={() => setSearchQuery('')}
          >
            <Text style={styles.clearSearchText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      {filteredConversations.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>💬</Text>
          <Text style={styles.emptyTitle}>
            {searchQuery ? 'No Results' : 'No Conversations'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery 
              ? 'Try a different search term'
              : 'Start a quantum-secure conversation'}
          </Text>
          {!searchQuery && (
            <TouchableOpacity style={styles.newButton}>
              <Text style={styles.newButtonText}>+ New Message</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          testID="conversations-list"
          data={filteredConversations}
          keyExtractor={(item) => item.id}
          renderItem={renderConversationItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#7c3aed"
              colors={['#7c3aed']}
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantumBadge: {
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#7c3aed',
  },
  quantumBadgeText: {
    color: '#a78bfa',
    fontSize: 12,
    fontWeight: '600',
  },
  composeButton: {
    padding: 8,
  },
  composeButtonText: {
    fontSize: 20,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    position: 'relative',
  },
  searchInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: '#ffffff',
  },
  clearSearch: {
    position: 'absolute',
    right: 28,
    top: 10,
    padding: 4,
  },
  clearSearchText: {
    color: '#666666',
    fontSize: 16,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingVertical: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  securityIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
    padding: 2,
  },
  securityIndicatorText: {
    fontSize: 10,
  },
  conversationContent: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
    marginRight: 8,
  },
  conversationTime: {
    fontSize: 13,
    color: '#666666',
  },
  conversationPreview: {
    fontSize: 14,
    color: '#888888',
    flex: 1,
    marginRight: 8,
  },
  conversationPreviewUnread: {
    color: '#ffffff',
    fontWeight: '500',
  },
  unreadBadge: {
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    minWidth: 24,
    alignItems: 'center',
  },
  unreadText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  separator: {
    height: 1,
    backgroundColor: '#1a1a1a',
    marginLeft: 80,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 24,
    textAlign: 'center',
  },
  newButton: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  newButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ConversationsScreen;
