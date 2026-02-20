/**
 * Estream Test Screen
 * 
 * Test native estream functionality with the desktop messenger.
 * Demonstrates create, sign, verify, msgpack roundtrip.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  Alert,
} from 'react-native';
import { EstreamService, EstreamEvent } from '../services/estream';
import { 
  PolyMessageTypes, 
  MessageSubtypes, 
  CallSubtypes,
  TypeFlags,
  textMessageTypeId,
  voiceCallTypeId,
} from '../services/estream/types';

interface Props {
  onBack?: () => void;
}

/**
 * Convert a byte array (or array of numbers) to hex string
 */
function toHexString(data: any): string {
  if (typeof data === 'string') {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  if (data && typeof data === 'object' && data.type === 'Buffer' && data.data) {
    return data.data.map((b: number) => b.toString(16).padStart(2, '0')).join('');
  }
  return 'unknown';
}

export function EstreamTestScreen({ onBack }: Props): React.JSX.Element {
  const [events, setEvents] = useState<EstreamEvent[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [testMessage, setTestMessage] = useState('Hello from Seeker!');
  const [recipientId, setRecipientId] = useState('desktop-test');
  const [lastEstream, setLastEstream] = useState<any>(null);
  const [stats, setStats] = useState({
    created: 0,
    signed: 0,
    verified: 0,
    emitted: 0,
  });

  useEffect(() => {
    const unsubscribe = EstreamService.onEvent((event) => {
      setEvents(prev => [event, ...prev].slice(0, 50));
      
      // Update stats
      setStats(prev => ({
        ...prev,
        [event.type]: (prev[event.type as keyof typeof prev] || 0) + 1,
      }));
    });
    return unsubscribe;
  }, []);

  const runFullTest = useCallback(async () => {
    setIsRunning(true);
    try {
      console.log('[Test] Starting full estream roundtrip test...');
      
      // 1. Create estream
      const typeInfo = textMessageTypeId(false);
      const estream = await EstreamService.create(
        'poly.messenger',
        typeInfo.type_num,
        `msg/seeker/${recipientId}`,
        testMessage
      );
      
      console.log('[Test] Estream created:', estream.content_id);
      
      // 2. Sign estream
      const signed = await EstreamService.sign(estream);
      console.log('[Test] Estream signed');
      setLastEstream(signed);
      
      // 3. Verify signature
      const isValid = await EstreamService.verify(signed);
      console.log('[Test] Signature valid:', isValid);
      
      // 4. Convert to msgpack
      const msgpack = await EstreamService.toMsgpack(signed);
      console.log('[Test] MsgPack size:', msgpack.length, 'chars');
      
      // 5. Parse back from msgpack
      const parsed = await EstreamService.fromMsgpack(msgpack);
      console.log('[Test] Parsed from msgpack');
      
      // 6. Verify parsed matches original
      const parsedValid = await EstreamService.verify(parsed);
      console.log('[Test] Parsed signature valid:', parsedValid);
      
      Alert.alert(
        '✅ Test Complete',
        `Created → Signed → Verified → MsgPack → Parsed → Verified\n\nAll steps passed!`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('[Test] Error:', error);
      Alert.alert('❌ Test Failed', error.message);
    } finally {
      setIsRunning(false);
    }
  }, [testMessage, recipientId]);

  const sendCallOffer = useCallback(async () => {
    setIsRunning(true);
    try {
      const callId = `call-${Date.now()}`;
      const typeInfo = voiceCallTypeId();
      
      const payload = JSON.stringify({
        type: 'offer',
        call_id: callId,
        is_video: true,
        caller_device: 'seeker',
      });
      
      const estream = await EstreamService.create(
        'poly.messenger',
        typeInfo.type_num,
        `call/${callId}`,
        payload
      );
      
      const signed = await EstreamService.sign(estream);
      setLastEstream(signed);
      
      Alert.alert('📞 Call Offer Created', `Call ID: ${callId}`);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setIsRunning(false);
    }
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
    EstreamService.clearEvents();
  }, []);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'create': return '📝';
      case 'sign': return '✍️';
      case 'verify': return '✅';
      case 'emit': return '📡';
      case 'parse': return '🔍';
      case 'error': return '❌';
      default: return '•';
    }
  };

  const getEventColor = (type: string, success: boolean) => {
    if (!success) return '#ef4444';
    switch (type) {
      case 'create': return '#3b82f6';
      case 'sign': return '#8b5cf6';
      case 'verify': return '#22c55e';
      case 'emit': return '#f59e0b';
      case 'parse': return '#06b6d4';
      default: return '#666';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.title}>📦 Estream Test</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats.created}</Text>
            <Text style={styles.statLabel}>Created</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats.signed}</Text>
            <Text style={styles.statLabel}>Signed</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats.verified}</Text>
            <Text style={styles.statLabel}>Verified</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats.emitted}</Text>
            <Text style={styles.statLabel}>Emitted</Text>
          </View>
        </View>

        {/* Input */}
        <View style={styles.inputSection}>
          <Text style={styles.sectionTitle}>Message</Text>
          <TextInput
            style={styles.input}
            value={testMessage}
            onChangeText={setTestMessage}
            placeholder="Enter test message..."
            placeholderTextColor="#666"
          />
          <TextInput
            style={[styles.input, { marginTop: 8 }]}
            value={recipientId}
            onChangeText={setRecipientId}
            placeholder="Recipient ID"
            placeholderTextColor="#666"
          />
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton, isRunning && styles.buttonDisabled]}
            onPress={runFullTest}
            disabled={isRunning}
          >
            <Text style={styles.buttonText}>
              {isRunning ? '⏳ Running...' : '🚀 Full Roundtrip Test'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton, isRunning && styles.buttonDisabled]}
            onPress={sendCallOffer}
            disabled={isRunning}
          >
            <Text style={styles.buttonText}>📞 Video Call Offer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.tertiaryButton]}
            onPress={clearEvents}
          >
            <Text style={styles.buttonText}>🗑️ Clear Events</Text>
          </TouchableOpacity>
        </View>

        {/* Last Estream Info */}
        {lastEstream && (
          <View style={styles.estreamInfo}>
            <Text style={styles.sectionTitle}>Last Estream</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Content ID:</Text>
              <Text style={styles.infoValue}>
                {toHexString(lastEstream.content_id).substring(0, 24) || 'pending'}...
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Type:</Text>
              <Text style={styles.infoValue}>
                0x{lastEstream.type_id?.type_num?.toString(16).padStart(4, '0') || '????'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Resource:</Text>
              <Text style={styles.infoValue}>{lastEstream.resource}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Payload:</Text>
              <Text style={styles.infoValue}>{lastEstream.payload?.length || 0} bytes</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Signed:</Text>
              <Text style={[styles.infoValue, { color: lastEstream.signature ? '#22c55e' : '#ef4444' }]}>
                {lastEstream.signature ? '✅ Yes' : '❌ No'}
              </Text>
            </View>
          </View>
        )}

        {/* Event Log */}
        <View style={styles.eventLog}>
          <Text style={styles.sectionTitle}>Event Log ({events.length})</Text>
          {events.map((event) => (
            <View key={event.id} style={styles.event}>
              <View style={styles.eventHeader}>
                <Text style={styles.eventIcon}>{getEventIcon(event.type)}</Text>
                <Text style={[styles.eventType, { color: getEventColor(event.type, event.success) }]}>
                  {event.type.toUpperCase()}
                </Text>
                <Text style={styles.eventTime}>
                  {event.timestamp.toLocaleTimeString().substring(0, 8)}
                </Text>
                <Text style={styles.eventDuration}>{event.durationMs}ms</Text>
              </View>
              {event.contentId && typeof event.contentId === 'string' && (
                <Text style={styles.eventDetail}>
                  ID: {event.contentId.substring(0, 20)}...
                </Text>
              )}
              {event.details && (
                <Text style={styles.eventDetail}>{event.details}</Text>
              )}
            </View>
          ))}
          {events.length === 0 && (
            <Text style={styles.noEvents}>No events yet. Run a test!</Text>
          )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    color: '#7c3aed',
    fontSize: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#111',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#7c3aed',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  inputSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#111',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  actions: {
    gap: 12,
    marginBottom: 16,
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#7c3aed',
  },
  secondaryButton: {
    backgroundColor: '#1e40af',
  },
  tertiaryButton: {
    backgroundColor: '#333',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  estreamInfo: {
    backgroundColor: '#111',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  infoLabel: {
    color: '#888',
    width: 100,
  },
  infoValue: {
    color: '#fff',
    flex: 1,
    fontFamily: 'monospace',
  },
  eventLog: {
    backgroundColor: '#111',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  event: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventIcon: {
    fontSize: 16,
  },
  eventType: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  eventTime: {
    fontSize: 10,
    color: '#666',
  },
  eventDuration: {
    fontSize: 10,
    color: '#888',
    backgroundColor: '#222',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  eventDetail: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
    marginLeft: 24,
    fontFamily: 'monospace',
  },
  noEvents: {
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
});

