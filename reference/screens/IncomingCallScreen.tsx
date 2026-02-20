/**
 * Incoming Call Screen
 *
 * Display for incoming calls with accept/reject buttons.
 *
 * @package io.estream.polymessenger
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Animated,
} from 'react-native';
import { CallManager, CallOffer } from '../services/CallManager';

interface Props {
  offer: CallOffer;
  onAccept: () => void;
  onReject: () => void;
}

export function IncomingCallScreen({ offer, onAccept, onReject }: Props): React.JSX.Element {
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    // Pulsing animation for avatar
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const handleAccept = async () => {
    try {
      await CallManager.acceptCall(offer.callId);
      onAccept();
    } catch (error) {
      console.error('Failed to accept call:', error);
    }
  };

  const handleReject = async () => {
    try {
      await CallManager.rejectCall(offer.callId);
      onReject();
    } catch (error) {
      console.error('Failed to reject call:', error);
    }
  };

  const isVideo = offer.callType === 'video';

  return (
    <SafeAreaView style={styles.container} testID="incoming-call-screen">
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      <View style={styles.content}>
        {/* Avatar */}
        <Animated.View
          style={[styles.avatarContainer, { transform: [{ scale: pulseAnim }] }]}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {offer.callerName?.[0]?.toUpperCase() || '?'}
            </Text>
          </View>
          <View style={styles.avatarRing} />
        </Animated.View>

        {/* Caller Info */}
        <Text style={styles.callerName}>{offer.callerName || 'Unknown Caller'}</Text>
        <Text style={styles.callType}>
          Incoming {isVideo ? 'Video' : 'Voice'} Call
        </Text>

        {/* Security Badge */}
        <View style={styles.securityBadge}>
          <Text style={styles.securityIcon}>🔐</Text>
          <Text style={styles.securityText}>End-to-end encrypted</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.rejectButton} onPress={handleReject} testID="call-reject-button">
          <Text style={styles.rejectIcon}>✕</Text>
          <Text style={styles.actionLabel}>Decline</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.acceptButton} onPress={handleAccept} testID="call-accept-button">
          <Text style={styles.acceptIcon}>{isVideo ? '📹' : '📞'}</Text>
          <Text style={styles.actionLabel}>Accept</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#7c3aed',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  avatarText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
  avatarRing: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: 'rgba(124, 58, 237, 0.3)',
  },
  callerName: {
    fontSize: 28,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  callType: {
    fontSize: 16,
    color: '#888',
    marginBottom: 24,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  securityIcon: {
    fontSize: 14,
  },
  securityText: {
    fontSize: 13,
    color: '#22c55e',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 48,
    paddingBottom: 60,
  },
  rejectButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectIcon: {
    fontSize: 32,
    color: '#fff',
  },
  acceptIcon: {
    fontSize: 32,
  },
  actionLabel: {
    position: 'absolute',
    bottom: -24,
    fontSize: 12,
    color: '#888',
  },
});

export default IncomingCallScreen;

