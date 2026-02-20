/**
 * Platform Messages Screen
 * 
 * Messages from TakeTitle and TrueResolve platforms.
 * Features filter tabs and action buttons on message cards.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { 
  Platform as PlatformType, 
  PlatformMessage, 
  PlatformMessageType 
} from '../types';

const EDGE_URL = 'https://edge.estream.dev';

type FilterType = 'all' | PlatformType | 'estream';

// Mock platform messages for development
const MOCK_MESSAGES: PlatformMessage[] = [
  {
    id: 'msg_tt_1',
    type: PlatformMessageType.InvestmentConfirmed,
    platform: 'taketitle',
    title: 'Investment Confirmed',
    body: 'Your $5,000 investment in Sunset Gallery Collection has been confirmed.',
    payload: {
      asset_id: 'asset_abc123',
      amount_usd: 5000,
      units: 50,
    },
    signature: {
      bytes: new Uint8Array(0),
      algorithm: 'dilithium5',
    },
    platformPublicKey: 'pk_taketitle',
    actions: [
      { id: 'view', label: 'View Investment', action: 'open_app', variant: 'secondary' },
      { id: 'sign', label: 'Sign Claim', action: 'sign_mwa', variant: 'primary' },
    ],
    timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
    read: false,
    archived: false,
    deepLink: 'taketitle://investment/inv_xyz',
  },
  {
    id: 'msg_tr_1',
    type: PlatformMessageType.NewEvidence,
    platform: 'trueresolve',
    title: 'New Evidence Submitted',
    body: 'A new document has been added to Case #TR-2024-001 by Expert Surveyor LLC.',
    payload: {
      case_id: 'TR-2024-001',
      document_name: 'Survey Report 2024.pdf',
    },
    signature: {
      bytes: new Uint8Array(0),
      algorithm: 'dilithium5',
    },
    platformPublicKey: 'pk_trueresolve',
    actions: [
      { id: 'view', label: 'View Evidence', action: 'open_app', variant: 'primary' },
    ],
    timestamp: Date.now() - 24 * 60 * 60 * 1000, // 1 day ago
    read: true,
    archived: false,
    deepLink: 'trueresolve://case/TR-2024-001/evidence',
  },
  {
    id: 'msg_tt_2',
    type: PlatformMessageType.GovernanceProposal,
    platform: 'taketitle',
    title: 'New Governance Proposal',
    body: 'Vote on proposal #42: Increase reserve allocation for Sunset Gallery.',
    payload: {
      proposal_id: '42',
      deadline: Date.now() + 3 * 24 * 60 * 60 * 1000,
    },
    signature: {
      bytes: new Uint8Array(0),
      algorithm: 'dilithium5',
    },
    platformPublicKey: 'pk_taketitle',
    actions: [
      { id: 'yes', label: 'Vote Yes', action: 'vote', variant: 'primary' },
      { id: 'no', label: 'Vote No', action: 'vote', variant: 'danger' },
    ],
    timestamp: Date.now() - 3 * 60 * 60 * 1000, // 3 hours ago
    read: false,
    archived: false,
  },
];

// Convert eStream circuit to PlatformMessage
interface Circuit {
  id: string;
  type: string;
  description: string;
  status: string;
  createdAt: string;
  requiredSignatures: number;
  signatures: unknown[];
}

function circuitToMessage(circuit: Circuit): PlatformMessage {
  return {
    id: `estream_${circuit.id}`,
    type: PlatformMessageType.GovernanceProposal,
    platform: 'estream' as PlatformType,
    title: `Circuit Approval: ${circuit.type.split('.').pop()}`,
    body: circuit.description,
    payload: {
      circuit_id: circuit.id,
      circuit_type: circuit.type,
      required_signatures: circuit.requiredSignatures,
      current_signatures: circuit.signatures?.length || 0,
    },
    signature: {
      bytes: new Uint8Array(0),
      algorithm: 'dilithium5',
    },
    platformPublicKey: 'pk_estream',
    actions: [
      { id: 'approve', label: 'Approve', action: 'approve_circuit', variant: 'primary' },
      { id: 'reject', label: 'Reject', action: 'reject_circuit', variant: 'danger' },
    ],
    timestamp: new Date(circuit.createdAt).getTime(),
    read: false,
    archived: false,
  };
}

export function PlatformMessagesScreen(): React.JSX.Element {
  const [filter, setFilter] = useState<FilterType>('all');
  const [messages, setMessages] = useState<PlatformMessage[]>(MOCK_MESSAGES);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch pending circuits from eStream
  const fetchCircuits = useCallback(async () => {
    try {
      const response = await fetch(`${EDGE_URL}/api/circuits?status=pending`);
      if (!response.ok) return;
      
      const data = await response.json();
      const circuits = (data.circuits || []) as Circuit[];
      
      // Convert to PlatformMessages and merge with existing
      const circuitMessages = circuits.map(circuitToMessage);
      
      setMessages(prev => {
        // Remove old estream messages
        const nonEstream = prev.filter(m => !m.id.startsWith('estream_'));
        return [...circuitMessages, ...nonEstream];
      });
    } catch (e) {
      console.warn('[Platform] Failed to fetch circuits:', e);
    }
  }, []);

  // Fetch on mount and periodically
  useEffect(() => {
    fetchCircuits();
    const interval = setInterval(fetchCircuits, 5000);
    return () => clearInterval(interval);
  }, [fetchCircuits]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchCircuits();
    setRefreshing(false);
  }, [fetchCircuits]);

  const filteredMessages = messages.filter(m =>
    filter === 'all' || m.platform === filter
  );

  const unreadCount = messages.filter(m => !m.read).length;
  const estreamCount = messages.filter(m => m.id.startsWith('estream_') && !m.read).length;
  const takeTitleCount = messages.filter(m => m.platform === 'taketitle' && !m.read).length;
  const trueResolveCount = messages.filter(m => m.platform === 'trueresolve' && !m.read).length;

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const getPlatformIcon = (platform: PlatformType | 'estream') => {
    switch (platform) {
      case 'estream': return '⚡';
      case 'taketitle': return '🏠';
      case 'trueresolve': return '⚖️';
      default: return '📧';
    }
  };

  const getPlatformColor = (platform: PlatformType | 'estream') => {
    switch (platform) {
      case 'estream': return '#10b981';
      case 'taketitle': return '#6366f1';
      case 'trueresolve': return '#14b8a6';
      default: return '#7c3aed';
    }
  };

  const handleAction = async (message: PlatformMessage, action: PlatformMessage['actions'][0]) => {
    console.log('[Platform] Action:', action.action, 'on message:', message.id);
    
    switch (action.action) {
      case 'approve_circuit':
        try {
          const circuitId = message.payload?.circuit_id;
          if (!circuitId) {
            Alert.alert('Error', 'Circuit ID not found');
            return;
          }
          
          // TODO: Get real signature from Seeker vault
          const response = await fetch(`${EDGE_URL}/api/circuits/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              circuitId,
              signature: 'seeker-dev-signature',
              signer: 'seeker-dev-pubkey',
            }),
          });
          
          if (response.ok) {
            Alert.alert('Approved', `Circuit ${circuitId} has been approved.`);
            // Remove from list
            setMessages(prev => prev.filter(m => m.id !== message.id));
            // Refresh to get updated status
            fetchCircuits();
          } else {
            const error = await response.json();
            Alert.alert('Error', error.error || 'Approval failed');
          }
        } catch (e) {
          Alert.alert('Error', 'Failed to approve circuit');
        }
        break;
        
      case 'reject_circuit':
        Alert.alert(
          'Reject Circuit',
          'Are you sure you want to reject this circuit?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Reject', 
              style: 'destructive',
              onPress: () => {
                // Mark as archived/rejected
                setMessages(prev => prev.filter(m => m.id !== message.id));
              }
            },
          ]
        );
        break;
        
      case 'open_app':
        if (message.deepLink) {
          try {
            await Linking.openURL(message.deepLink);
          } catch (e) {
            console.warn('Could not open:', message.deepLink);
          }
        }
        break;
      case 'sign_mwa':
        console.log('TODO: Open MWA signing flow');
        break;
      case 'vote':
        console.log('TODO: Submit vote');
        break;
    }
    
    // Mark as read
    setMessages(prev => prev.map(m => 
      m.id === message.id ? { ...m, read: true } : m
    ));
  };

  const renderFilterTab = (value: FilterType, label: string, count?: number) => (
    <TouchableOpacity
      style={[styles.tab, filter === value && styles.tabActive]}
      onPress={() => setFilter(value)}
    >
      <Text style={[styles.tabText, filter === value && styles.tabTextActive]}>
        {label}
      </Text>
      {count !== undefined && count > 0 && (
        <View style={[
          styles.tabBadge,
          filter === value && styles.tabBadgeActive
        ]}>
          <Text style={styles.tabBadgeText}>{count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderMessageItem = ({ item }: { item: PlatformMessage }) => (
    <View style={[styles.messageItem, !item.read && styles.messageItemUnread]}>
      {/* Platform Badge */}
      <View style={[
        styles.platformBadge,
        { backgroundColor: getPlatformColor(item.platform) + '20' }
      ]}>
        <Text style={styles.platformIcon}>{getPlatformIcon(item.platform)}</Text>
      </View>

      {/* Content */}
      <View style={styles.messageContent}>
        <View style={styles.messageHeader}>
          <Text style={[
            styles.messageTitle,
            !item.read && styles.messageTitleUnread
          ]}>
            {item.title}
          </Text>
          {!item.read && <View style={styles.unreadDot} />}
        </View>
        
        <Text style={styles.messageBody} numberOfLines={2}>
          {item.body}
        </Text>
        
        <Text style={styles.messageTime}>{formatTime(item.timestamp)}</Text>

        {/* Actions */}
        {item.actions && item.actions.length > 0 && (
          <View style={styles.actionsRow}>
            {item.actions.map(action => (
              <TouchableOpacity
                key={action.id}
                style={[
                  styles.actionButton,
                  action.variant === 'primary' && styles.actionButtonPrimary,
                  action.variant === 'danger' && styles.actionButtonDanger,
                ]}
                onPress={() => handleAction(item, action)}
              >
                <Text style={[
                  styles.actionButtonText,
                  action.variant === 'primary' && styles.actionButtonTextPrimary,
                  action.variant === 'danger' && styles.actionButtonTextDanger,
                ]}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Platform</Text>
        <View style={styles.quantumBadge}>
          <Text style={styles.quantumBadgeText}>⚛️ PQ</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabs}>
        {renderFilterTab('all', 'All', unreadCount)}
        {renderFilterTab('estream' as FilterType, 'eStream', estreamCount)}
        {renderFilterTab('taketitle', 'TakeTitle', takeTitleCount)}
        {renderFilterTab('trueresolve', 'TrueResolve', trueResolveCount)}
      </View>

      {/* List */}
      {filteredMessages.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📬</Text>
          <Text style={styles.emptyTitle}>No Platform Messages</Text>
          <Text style={styles.emptySubtitle}>
            Notifications from TakeTitle and TrueResolve will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredMessages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessageItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#7c3aed"
              colors={['#7c3aed']}
            />
          }
          contentContainerStyle={styles.listContent}
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
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#7c3aed',
  },
  tabText: {
    color: '#888888',
    fontSize: 14,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  tabBadge: {
    backgroundColor: '#333333',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  tabBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  messageItem: {
    flexDirection: 'row',
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 16,
  },
  messageItemUnread: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  platformBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  platformIcon: {
    fontSize: 20,
  },
  messageContent: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  messageTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
    flex: 1,
  },
  messageTitleUnread: {
    fontWeight: '600',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7c3aed',
    marginLeft: 8,
  },
  messageBody: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 8,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 12,
    color: '#555555',
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
  },
  actionButtonPrimary: {
    backgroundColor: '#7c3aed',
  },
  actionButtonDanger: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#f87171',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  actionButtonTextPrimary: {
    color: '#ffffff',
  },
  actionButtonTextDanger: {
    color: '#f87171',
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
    textAlign: 'center',
  },
});

export default PlatformMessagesScreen;
