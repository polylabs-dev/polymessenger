/**
 * Outgoing Call Screen
 *
 * Display while waiting for call to be answered.
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
import { CallManager, Call } from '../services/CallManager';

interface Props {
  call: Call;
  onCancel: () => void;
  onConnected: () => void;
}

export function OutgoingCallScreen({ call, onCancel, onConnected }: Props): React.JSX.Element {
  const [dotAnim] = useState(new Animated.Value(0));
  const [ringAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Ringing animation
    const ringLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(ringAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(ringAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    ringLoop.start();

    return () => ringLoop.stop();
  }, [ringAnim]);

  useEffect(() => {
    // Watch for call state changes
    const unsubscribe = CallManager.onCallStateChange((updatedCall) => {
      if (updatedCall.id === call.id && updatedCall.state === 'connected') {
        onConnected();
      }
    });

    return () => unsubscribe();
  }, [call.id, onConnected]);

  const handleCancel = async () => {
    await CallManager.hangup();
    onCancel();
  };

  const getStatusText = (): string => {
    switch (call.state) {
      case 'initiating':
        return 'Calling...';
      case 'ringing':
        return 'Ringing...';
      case 'connecting':
        return 'Connecting...';
      default:
        return call.state;
    }
  };

  const ringScale = ringAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2],
  });

  const ringOpacity = ringAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 0],
  });

  return (
    <SafeAreaView style={styles.container} testID="outgoing-call-screen">
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      <View style={styles.content}>
        {/* Avatar with rings */}
        <View style={styles.avatarContainer}>
          <Animated.View
            style={[
              styles.ring,
              {
                transform: [{ scale: ringScale }],
                opacity: ringOpacity,
              },
            ]}
          />
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {call.remotePeerName?.[0]?.toUpperCase() || '?'}
            </Text>
          </View>
        </View>

        {/* Contact Info */}
        <Text style={styles.contactName}>{call.remotePeerName || 'Unknown'}</Text>
        <Text style={styles.status}>{getStatusText()}</Text>

        {/* Call Type Indicator */}
        <View style={styles.callTypeIndicator}>
          <Text style={styles.callTypeIcon}>
            {call.type === 'video' ? '📹' : '📞'}
          </Text>
          <Text style={styles.callTypeText}>
            {call.type === 'video' ? 'Video Call' : 'Voice Call'}
          </Text>
        </View>
      </View>

      {/* Cancel Button */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel} testID="call-end-button">
          <Text style={styles.cancelIcon}>📞</Text>
        </TouchableOpacity>
        <Text style={styles.cancelLabel}>Cancel</Text>
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
  ring: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: '#7c3aed',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#7c3aed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
  contactName: {
    fontSize: 28,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  status: {
    fontSize: 16,
    color: '#888',
    marginBottom: 24,
  },
  callTypeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  callTypeIcon: {
    fontSize: 16,
  },
  callTypeText: {
    fontSize: 13,
    color: '#a78bfa',
  },
  actions: {
    alignItems: 'center',
    paddingBottom: 60,
  },
  cancelButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '135deg' }],
  },
  cancelIcon: {
    fontSize: 28,
  },
  cancelLabel: {
    color: '#888',
    marginTop: 16,
    fontSize: 14,
  },
});

export default OutgoingCallScreen;

