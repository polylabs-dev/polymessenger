/**
 * In-Call Screen
 *
 * Active call display with controls for voice and video calls.
 *
 * @package io.estream.polymessenger
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { CallManager, Call, CallType } from '../services/CallManager';
import { CallQualityIndicator } from '../components/CallQualityIndicator';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  navigation?: {
    goBack: () => void;
  };
}

export function InCallScreen({ navigation }: Props): React.JSX.Element {
  const [call, setCall] = useState<Call | null>(CallManager.getActiveCall());
  const [showControls, setShowControls] = useState(true);

  useEffect(() => {
    const unsubState = CallManager.onCallStateChange(setCall);
    const unsubEnded = CallManager.onCallEnded((endedCall) => {
      setCall(endedCall);
      // Navigate back after a delay
      setTimeout(() => navigation?.goBack(), 2000);
    });

    return () => {
      unsubState();
      unsubEnded();
    };
  }, [navigation]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleMute = useCallback(() => {
    if (call) {
      CallManager.setMuted(!call.isMuted);
    }
  }, [call]);

  const handleToggleSpeaker = useCallback(() => {
    if (call) {
      CallManager.setSpeaker(!call.isSpeakerOn);
    }
  }, [call]);

  const handleToggleVideo = useCallback(() => {
    if (call) {
      CallManager.setVideoEnabled(!call.isVideoEnabled);
    }
  }, [call]);

  const handleSwitchCamera = useCallback(() => {
    CallManager.switchCamera();
  }, []);

  const handleHangup = useCallback(async () => {
    await CallManager.hangup();
  }, []);

  const handleToggleHold = useCallback(async () => {
    if (call) {
      await CallManager.setHold(call.state !== 'on_hold');
    }
  }, [call]);

  if (!call) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.endedText}>Call ended</Text>
      </SafeAreaView>
    );
  }

  const isVideo = call.type === 'video';
  const isEnded = call.state === 'ended';

  return (
    <SafeAreaView style={styles.container} testID="in-call-screen">
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Video Container */}
      {isVideo && (
        <View style={styles.videoContainer}>
          {/* Remote Video (full screen) */}
          {call.isRemoteVideoEnabled ? (
            <View style={styles.remoteVideo}>
              <Text style={styles.videoPlaceholder}>Remote Video</Text>
            </View>
          ) : (
            <View style={styles.remoteVideoOff}>
              <View style={styles.avatarLarge}>
                <Text style={styles.avatarText}>
                  {call.remotePeerName?.[0]?.toUpperCase() || '?'}
                </Text>
              </View>
              <Text style={styles.videoOffText}>Camera Off</Text>
            </View>
          )}

          {/* Local Video (picture-in-picture) */}
          {call.isVideoEnabled && (
            <TouchableOpacity style={styles.localVideo} onPress={handleSwitchCamera}>
              <Text style={styles.localVideoText}>You</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Voice Call Avatar */}
      {!isVideo && (
        <View style={styles.voiceContainer}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarText}>
              {call.remotePeerName?.[0]?.toUpperCase() || '?'}
            </Text>
          </View>
        </View>
      )}

      {/* Header Info */}
      <View style={styles.header}>
        <CallQualityIndicator callId={call.id} />
        <Text style={styles.peerName}>{call.remotePeerName || 'Unknown'}</Text>
        <Text style={styles.status}>
          {isEnded
            ? `Call ended • ${call.endReason}`
            : call.state === 'on_hold'
            ? 'On Hold'
            : call.state === 'connected'
            ? formatDuration(call.duration)
            : call.state === 'connecting'
            ? 'Connecting...'
            : call.state}
        </Text>
      </View>

      {/* Controls */}
      {!isEnded && (
        <View style={styles.controls}>
          {/* Top Row */}
          <View style={styles.controlRow}>
            <TouchableOpacity
              style={[styles.controlButton, call.isMuted && styles.controlButtonActive]}
              onPress={handleToggleMute}
              testID="call-mute-button"
            >
              <Text style={styles.controlIcon}>{call.isMuted ? '🔇' : '🔊'}</Text>
              <Text style={styles.controlLabel}>{call.isMuted ? 'Unmute' : 'Mute'}</Text>
            </TouchableOpacity>

            {isVideo && (
              <TouchableOpacity
                style={[styles.controlButton, !call.isVideoEnabled && styles.controlButtonActive]}
                onPress={handleToggleVideo}
                testID="call-video-toggle-button"
              >
                <Text style={styles.controlIcon}>{call.isVideoEnabled ? '📹' : '📷'}</Text>
                <Text style={styles.controlLabel}>
                  {call.isVideoEnabled ? 'Video Off' : 'Video On'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.controlButton, call.isSpeakerOn && styles.controlButtonActive]}
              onPress={handleToggleSpeaker}
              testID="call-speaker-button"
            >
              <Text style={styles.controlIcon}>{call.isSpeakerOn ? '🔈' : '📱'}</Text>
              <Text style={styles.controlLabel}>{call.isSpeakerOn ? 'Speaker' : 'Phone'}</Text>
            </TouchableOpacity>
          </View>

          {/* Bottom Row */}
          <View style={styles.controlRow}>
            <TouchableOpacity
              style={[styles.controlButton, call.state === 'on_hold' && styles.controlButtonActive]}
              onPress={handleToggleHold}
            >
              <Text style={styles.controlIcon}>⏸️</Text>
              <Text style={styles.controlLabel}>
                {call.state === 'on_hold' ? 'Resume' : 'Hold'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.hangupButton} onPress={handleHangup} testID="call-end-button">
              <Text style={styles.hangupIcon}>📞</Text>
            </TouchableOpacity>

            {isVideo && (
              <TouchableOpacity style={styles.controlButton} onPress={handleSwitchCamera}>
                <Text style={styles.controlIcon}>🔄</Text>
                <Text style={styles.controlLabel}>Flip</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* End Screen */}
      {isEnded && (
        <View style={styles.endedContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => navigation?.goBack()}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  videoContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  remoteVideo: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  remoteVideoOff: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlaceholder: {
    color: '#666',
    fontSize: 18,
  },
  localVideo: {
    position: 'absolute',
    bottom: 120,
    right: 16,
    width: 100,
    height: 140,
    backgroundColor: '#333',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  localVideoText: {
    color: '#fff',
    fontSize: 12,
  },
  voiceContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLarge: {
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
  videoOffText: {
    color: '#888',
    marginTop: 16,
  },
  header: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  peerName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    marginTop: 8,
  },
  status: {
    fontSize: 16,
    color: '#888',
    marginTop: 4,
  },
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 24,
  },
  controlButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonActive: {
    backgroundColor: 'rgba(124, 58, 237, 0.5)',
  },
  controlIcon: {
    fontSize: 24,
  },
  controlLabel: {
    fontSize: 10,
    color: '#fff',
    marginTop: 4,
  },
  hangupButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '135deg' }],
  },
  hangupIcon: {
    fontSize: 28,
  },
  endedText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
  },
  endedContainer: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  closeButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: '#333',
    borderRadius: 24,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default InCallScreen;

