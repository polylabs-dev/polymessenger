/**
 * Group Call Screen
 *
 * Main interface for multi-participant voice and video calls.
 * Features adaptive grid layout for participant video feeds.
 *
 * @package io.estream.polymessenger
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { ParticipantGrid } from '../components/ParticipantGrid';
import { GroupCallControls } from '../components/GroupCallControls';
import { CallTimer } from '../components/CallTimer';
import { CallHealthBar } from '../components/CallHealthBar';
import { CallQualityOverlay } from '../components/CallQualityOverlay';
import { GroupCallManager, GroupCall, GroupParticipant } from '../services/GroupCallManager';
import { CallMetrics } from '../services/CallManager';

interface Props {
  callId: string;
  onLeave: () => void;
}

export function GroupCallScreen({ callId, onLeave }: Props): React.JSX.Element {
  const [call, setCall] = useState<GroupCall | null>(null);
  const [participants, setParticipants] = useState<GroupParticipant[]>([]);
  const [metrics, setMetrics] = useState<CallMetrics | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);

  useEffect(() => {
    // Subscribe to call updates
    const unsubscribeCall = GroupCallManager.onCallUpdate(callId, (updatedCall) => {
      setCall(updatedCall);
      setParticipants(updatedCall.participants);
    });

    // Subscribe to active speaker changes
    const unsubscribeSpeaker = GroupCallManager.onActiveSpeakerChange(callId, (speakerId) => {
      setActiveSpeakerId(speakerId);
    });

    // Subscribe to metrics
    const unsubscribeMetrics = GroupCallManager.onMetricsUpdate(callId, (newMetrics) => {
      setMetrics(newMetrics);
    });

    // Get initial call state
    GroupCallManager.getCall(callId).then(setCall);
    GroupCallManager.getParticipants(callId).then(setParticipants);

    return () => {
      unsubscribeCall();
      unsubscribeSpeaker();
      unsubscribeMetrics();
    };
  }, [callId]);

  const handleToggleMute = useCallback(async () => {
    await GroupCallManager.toggleMute(callId, !isMuted);
    setIsMuted(!isMuted);
  }, [callId, isMuted]);

  const handleToggleVideo = useCallback(async () => {
    await GroupCallManager.toggleVideo(callId, !isVideoEnabled);
    setIsVideoEnabled(!isVideoEnabled);
  }, [callId, isVideoEnabled]);

  const handleToggleSpeaker = useCallback(async () => {
    await GroupCallManager.toggleSpeaker(!isSpeakerOn);
    setIsSpeakerOn(!isSpeakerOn);
  }, [isSpeakerOn]);

  const handleFlipCamera = useCallback(async () => {
    await GroupCallManager.flipCamera(callId);
  }, [callId]);

  const handleLeave = useCallback(async () => {
    await GroupCallManager.leaveCall(callId);
    onLeave();
  }, [callId, onLeave]);

  const handleToggleParticipantMute = useCallback(async (participantId: string) => {
    // Only hosts can mute others
    if (call?.isHost) {
      await GroupCallManager.muteParticipant(callId, participantId);
    }
  }, [call, callId]);

  const handleRemoveParticipant = useCallback(async (participantId: string) => {
    // Only hosts can remove participants
    if (call?.isHost) {
      await GroupCallManager.removeParticipant(callId, participantId);
    }
  }, [call, callId]);

  if (!call) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Connecting to call...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.callTitle}>{call.title || 'Group Call'}</Text>
          <Text style={styles.participantCount}>
            {participants.length} participant{participants.length !== 1 ? 's' : ''}
          </Text>
        </View>
        {call.connectedTime && (
          <CallTimer startTime={call.connectedTime} style={styles.timer} />
        )}
      </View>

      {/* Participant Grid */}
      <View style={styles.gridContainer}>
        <ParticipantGrid
          participants={participants}
          activeSpeakerId={activeSpeakerId}
          isHost={call.isHost}
          onParticipantPress={(p) => setActiveSpeakerId(p.id)}
          onMuteParticipant={handleToggleParticipantMute}
          onRemoveParticipant={handleRemoveParticipant}
        />
      </View>

      {/* Health Bar */}
      <View style={styles.healthBarContainer}>
        <CallHealthBar
          metrics={metrics}
          onPress={() => setShowStats(true)}
          style={styles.healthBar}
        />
      </View>

      {/* Controls */}
      <GroupCallControls
        isMuted={isMuted}
        isVideoEnabled={isVideoEnabled}
        isSpeakerOn={isSpeakerOn}
        isVideoCall={call.callType === 'video'}
        isHost={call.isHost}
        participantCount={participants.length}
        onToggleMute={handleToggleMute}
        onToggleVideo={handleToggleVideo}
        onToggleSpeaker={handleToggleSpeaker}
        onFlipCamera={handleFlipCamera}
        onLeave={handleLeave}
        onInvite={() => console.log('Invite')}
      />

      {/* Stats Overlay */}
      <CallQualityOverlay
        metrics={metrics}
        isVisible={showStats}
        onClose={() => setShowStats(false)}
      />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    flex: 1,
  },
  callTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  participantCount: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  timer: {
    marginLeft: 16,
  },
  gridContainer: {
    flex: 1,
    padding: 8,
  },
  healthBarContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  healthBar: {
    alignSelf: 'center',
  },
});

export default GroupCallScreen;


