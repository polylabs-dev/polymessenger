/**
 * useWebRTC Hook
 *
 * React hook for managing WebRTC streams and connections.
 *
 * @package io.estream.polymessenger
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
  MediaStream,
} from 'react-native-webrtc';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

interface UseWebRTCReturn {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  localStreamUrl: string | null;
  remoteStreamUrl: string | null;
  
  // Connection management
  initializeConnection: (isVideoCall: boolean) => Promise<string>; // Returns SDP offer
  handleAnswer: (sdp: string) => Promise<void>;
  handleOffer: (sdp: string, isVideoCall: boolean) => Promise<string>; // Returns SDP answer
  addIceCandidate: (candidate: RTCIceCandidate) => Promise<void>;
  
  // Media controls
  setMuted: (muted: boolean) => void;
  setVideoEnabled: (enabled: boolean) => void;
  flipCamera: () => Promise<void>;
  
  // Cleanup
  cleanup: () => void;
  
  // State
  connectionState: RTCPeerConnectionState | null;
  isConnected: boolean;
}

type RTCPeerConnectionState = 'new' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'closed';

export function useWebRTC(
  onIceCandidate?: (candidate: RTCIceCandidate) => void,
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void
): UseWebRTCReturn {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState | null>(null);
  const [usingFrontCamera, setUsingFrontCamera] = useState(true);
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  const cleanup = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    if (remoteStream) {
      setRemoteStream(null);
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setConnectionState(null);
  }, [localStream, remoteStream]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate && onIceCandidate) {
        onIceCandidate(event.candidate);
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState as RTCPeerConnectionState;
      setConnectionState(state);
      onConnectionStateChange?.(state);
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [onIceCandidate, onConnectionStateChange]);

  const getLocalStream = useCallback(async (isVideoCall: boolean): Promise<MediaStream> => {
    const constraints = {
      audio: true,
      video: isVideoCall ? {
        facingMode: usingFrontCamera ? 'user' : 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 },
      } : false,
    };

    const stream = await mediaDevices.getUserMedia(constraints);
    setLocalStream(stream);
    return stream;
  }, [usingFrontCamera]);

  const initializeConnection = useCallback(async (isVideoCall: boolean): Promise<string> => {
    const pc = createPeerConnection();
    const stream = await getLocalStream(isVideoCall);

    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: isVideoCall,
    });

    await pc.setLocalDescription(offer);
    return offer.sdp!;
  }, [createPeerConnection, getLocalStream]);

  const handleOffer = useCallback(async (sdp: string, isVideoCall: boolean): Promise<string> => {
    const pc = createPeerConnection();
    const stream = await getLocalStream(isVideoCall);

    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    const offer = new RTCSessionDescription({ type: 'offer', sdp });
    await pc.setRemoteDescription(offer);

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    return answer.sdp!;
  }, [createPeerConnection, getLocalStream]);

  const handleAnswer = useCallback(async (sdp: string) => {
    if (!peerConnectionRef.current) {
      throw new Error('No peer connection');
    }
    const answer = new RTCSessionDescription({ type: 'answer', sdp });
    await peerConnectionRef.current.setRemoteDescription(answer);
  }, []);

  const addIceCandidate = useCallback(async (candidate: RTCIceCandidate) => {
    if (!peerConnectionRef.current) {
      throw new Error('No peer connection');
    }
    await peerConnectionRef.current.addIceCandidate(candidate);
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });
    }
  }, [localStream]);

  const setVideoEnabled = useCallback((enabled: boolean) => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }, [localStream]);

  const flipCamera = useCallback(async () => {
    if (!localStream) return;

    const videoTrack = localStream.getVideoTracks()[0];
    if (!videoTrack) return;

    // Stop current video track
    videoTrack.stop();

    // Get new stream with opposite camera
    const newFacing = !usingFrontCamera;
    setUsingFrontCamera(newFacing);

    const constraints = {
      video: {
        facingMode: newFacing ? 'user' : 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    };

    const newStream = await mediaDevices.getUserMedia(constraints);
    const newVideoTrack = newStream.getVideoTracks()[0];

    // Replace track in local stream
    localStream.removeTrack(videoTrack);
    localStream.addTrack(newVideoTrack);

    // Replace track in peer connection
    if (peerConnectionRef.current) {
      const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
      if (sender) {
        await sender.replaceTrack(newVideoTrack);
      }
    }
  }, [localStream, usingFrontCamera]);

  return {
    localStream,
    remoteStream,
    localStreamUrl: localStream?.toURL() || null,
    remoteStreamUrl: remoteStream?.toURL() || null,
    initializeConnection,
    handleAnswer,
    handleOffer,
    addIceCandidate,
    setMuted,
    setVideoEnabled,
    flipCamera,
    cleanup,
    connectionState,
    isConnected: connectionState === 'connected',
  };
}

export default useWebRTC;


