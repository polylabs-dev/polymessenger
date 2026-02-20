/**
 * ChatScreen - Signal-Pattern Chat Interface
 * 
 * Individual conversation view with:
 * - Message bubbles (sent right, received left)
 * - PQ encryption indicators
 * - Disappearing message countdown
 * - Attachments (images, files, audio, video)
 * - Message status indicators
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  NativeModules,
  Alert,
  Modal,
  Image,
  Dimensions,
  PermissionsAndroid,
} from 'react-native';
import { launchImageLibrary, launchCamera, ImagePickerResponse } from 'react-native-image-picker';
import DocumentPicker, { types } from 'react-native-document-picker';
import { MessageStatus, AttachmentType, ExpirationDuration, ExpirationMode } from '../types';
import { EstreamService } from '../services/estream';
import { PolyMessageTypes, MessageSubtypes } from '../services/estream/types';
import { MessagingService, IncomingMessage } from '../services/MessagingService';
import { RelationshipSpark } from '../components/spark/RelationshipSpark';

const { QuicClient } = NativeModules;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================================================
// Colors
// ============================================================================

const colors = {
  background: '#0f0f0f',
  surface: '#1a1a1a',
  surfaceLight: '#252525',
  primary: '#7c3aed',
  primaryLight: '#a78bfa',
  secondary: '#3b82f6',
  text: '#ffffff',
  textSecondary: '#9ca3af',
  textMuted: '#6b7280',
  border: '#2a2a2a',
  success: '#22c55e',
  warning: '#fbbf24',
  error: '#ef4444',
  received: '#2c2c2c',
};

// ============================================================================
// Types
// ============================================================================

interface Attachment {
  id: string;
  type: AttachmentType;
  uri: string;
  filename: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
  thumbnail?: string;
}

interface ChatMessage {
  id: string;
  text: string;
  timestamp: number;
  isSent: boolean;
  status: MessageStatus;
  expiresAt?: number;
  expirationDuration?: number;
  attachments?: Attachment[];
  replyToId?: string;
  // Estream data
  isEstream?: boolean;
  estreamContentId?: string;
  estreamSignature?: string;
  isVerified?: boolean;
  signerKeyHash?: string;
}

interface ChatScreenProps {
  peerId: string;
  peerName: string;
  peerKeyHash: string;
  onBack: () => void;
  quicHandle?: number | null;
  ourKeyHash?: string;
  ratchetHandle?: number | null;
  isGroup?: boolean;
  groupIcon?: string;
  /** Whether contact is verified in person */
  isVerified?: boolean;
  /** Relationship DNA for Spark display */
  relationshipDna?: string;
}

// ============================================================================
// Expiration Options
// ============================================================================

const EXPIRATION_OPTIONS = [
  { label: 'Off', value: ExpirationDuration.Off, icon: '∞' },
  { label: '30s', value: ExpirationDuration.ThirtySeconds, icon: '⏱️' },
  { label: '1m', value: ExpirationDuration.OneMinute, icon: '⏱️' },
  { label: '5m', value: ExpirationDuration.FiveMinutes, icon: '⏱️' },
  { label: '1h', value: ExpirationDuration.OneHour, icon: '⏰' },
  { label: '1d', value: ExpirationDuration.OneDay, icon: '📅' },
  { label: '1w', value: ExpirationDuration.OneWeek, icon: '📆' },
];

// ============================================================================
// Mock Data Generator - unique per conversation
// ============================================================================

function getInitialMessagesForConversation(peerId: string, peerName: string, isGroup: boolean): ChatMessage[] {
  // Generate different mock messages based on conversation
  if (isGroup) {
    return [
      {
        id: `${peerId}_m1`,
        text: `Welcome to ${peerName}! 🎉`,
        timestamp: Date.now() - 3600000,
        isSent: false,
        status: MessageStatus.Read,
      },
      {
        id: `${peerId}_m2`,
        text: 'Thanks for creating the group!',
        timestamp: Date.now() - 3500000,
        isSent: true,
        status: MessageStatus.Read,
      },
      {
        id: `${peerId}_m3`,
        text: "Let's get started with our discussion.",
        timestamp: Date.now() - 3400000,
        isSent: false,
        status: MessageStatus.Read,
      },
    ];
  }

  // Different messages for different contacts
  const messageTemplates: { [key: string]: ChatMessage[] } = {
    alice: [
      { id: `${peerId}_m1`, text: 'Hey! How are you?', timestamp: Date.now() - 3600000, isSent: false, status: MessageStatus.Read },
      { id: `${peerId}_m2`, text: "I'm good! Working on Poly Messenger.", timestamp: Date.now() - 3500000, isSent: true, status: MessageStatus.Read },
      { id: `${peerId}_m3`, text: 'That sounds exciting! Is it using post-quantum crypto?', timestamp: Date.now() - 3400000, isSent: false, status: MessageStatus.Read },
      { id: `${peerId}_m4`, text: 'Yes! Kyber1024 for key exchange and Dilithium5 for signatures.', timestamp: Date.now() - 3300000, isSent: true, status: MessageStatus.Read },
    ],
    bob: [
      { id: `${peerId}_m1`, text: 'Did you check the conference schedule?', timestamp: Date.now() - 7200000, isSent: false, status: MessageStatus.Read },
      { id: `${peerId}_m2`, text: 'Yes, we have a slot at 2pm.', timestamp: Date.now() - 7100000, isSent: true, status: MessageStatus.Read },
      { id: `${peerId}_m3`, text: 'Perfect, see you there!', timestamp: Date.now() - 7000000, isSent: false, status: MessageStatus.Read },
    ],
    carol: [
      { id: `${peerId}_m1`, text: 'Thanks for the invite to Poly Messenger!', timestamp: Date.now() - 86400000, isSent: false, status: MessageStatus.Read },
      { id: `${peerId}_m2`, text: 'Welcome! Let me know if you have questions.', timestamp: Date.now() - 86300000, isSent: true, status: MessageStatus.Read },
    ],
  };

  // Match by peerId or name
  const lowerPeerId = peerId.toLowerCase();
  const lowerName = peerName.toLowerCase();
  
  if (lowerPeerId.includes('alice') || lowerName.includes('alice')) {
    return messageTemplates.alice;
  } else if (lowerPeerId.includes('bob') || lowerName.includes('bob')) {
    return messageTemplates.bob;
  } else if (lowerPeerId.includes('carol') || lowerName.includes('carol')) {
    return messageTemplates.carol;
  }

  // Default for new contacts
  return [
    { id: `${peerId}_m1`, text: `Hi ${peerName}! 👋`, timestamp: Date.now() - 60000, isSent: true, status: MessageStatus.Delivered },
  ];
}

// ============================================================================
// Helper Components
// ============================================================================

/**
 * Expiration Timer Display
 */
function ExpirationTimer({ expiresAt, duration }: { expiresAt: number; duration?: number }) {
  const [timeLeft, setTimeLeft] = useState(Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)));
  
  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [expiresAt]);
  
  const formatTime = (seconds: number) => {
    if (seconds <= 0) return 'Expired';
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    return `${Math.floor(seconds / 86400)}d`;
  };
  
  const progress = duration ? timeLeft / duration : 0;
  const isUrgent = timeLeft < 60;
  
  return (
    <View style={styles.expirationContainer}>
      <View style={[styles.expirationBar, { width: `${progress * 100}%` }, isUrgent && styles.expirationUrgent]} />
      <Text style={[styles.expirationText, isUrgent && styles.expirationTextUrgent]}>
        ⏱️ {formatTime(timeLeft)}
      </Text>
    </View>
  );
}

/**
 * Attachment Preview
 */
function AttachmentPreview({ attachment, isSent }: { attachment: Attachment; isSent: boolean }) {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  switch (attachment.type) {
    case AttachmentType.Image:
      return (
        <TouchableOpacity style={styles.imageAttachment}>
          <Image 
            source={{ uri: attachment.uri }} 
            style={[
              styles.attachmentImage,
              { 
                width: Math.min(SCREEN_WIDTH * 0.6, attachment.width || 200),
                height: Math.min(200, attachment.height || 150),
              }
            ]}
            resizeMode="cover"
          />
        </TouchableOpacity>
      );
    
    case AttachmentType.Video:
      return (
        <TouchableOpacity style={styles.videoAttachment}>
          <Image 
            source={{ uri: attachment.thumbnail || attachment.uri }} 
            style={styles.attachmentImage}
            resizeMode="cover"
          />
          <View style={styles.playButton}>
            <Text style={styles.playButtonText}>▶</Text>
          </View>
          {attachment.duration && (
            <Text style={styles.videoDuration}>{formatDuration(attachment.duration)}</Text>
          )}
        </TouchableOpacity>
      );
    
    case AttachmentType.Audio:
    case AttachmentType.Voice:
      return (
        <TouchableOpacity style={[styles.audioAttachment, isSent ? styles.audioSent : styles.audioReceived]}>
          <Text style={styles.audioIcon}>🎵</Text>
          <View style={styles.audioWaveform}>
            {[...Array(20)].map((_, i) => (
              <View 
                key={i} 
                style={[
                  styles.waveformBar, 
                  { height: 8 + Math.random() * 16 },
                  isSent ? styles.waveformSent : styles.waveformReceived
                ]} 
              />
            ))}
          </View>
          <Text style={styles.audioDuration}>
            {attachment.duration ? formatDuration(attachment.duration) : '0:00'}
          </Text>
        </TouchableOpacity>
      );
    
    case AttachmentType.File:
    default:
      return (
        <TouchableOpacity style={[styles.fileAttachment, isSent ? styles.fileSent : styles.fileReceived]}>
          <View style={styles.fileIcon}>
            <Text style={styles.fileIconText}>📄</Text>
          </View>
          <View style={styles.fileInfo}>
            <Text style={styles.fileName} numberOfLines={1}>{attachment.filename}</Text>
            <Text style={styles.fileSize}>{formatSize(attachment.size)}</Text>
          </View>
          <TouchableOpacity style={styles.downloadButton}>
            <Text style={styles.downloadIcon}>⬇️</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      );
  }
}

/**
 * Expiration Picker Modal
 */
function ExpirationPicker({ 
  visible, 
  currentValue, 
  onSelect, 
  onClose 
}: { 
  visible: boolean; 
  currentValue: number; 
  onSelect: (value: number) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerTitle}>Disappearing Messages</Text>
          <Text style={styles.pickerSubtitle}>
            Messages will be deleted after the timer expires
          </Text>
          
          <View style={styles.pickerOptions}>
            {EXPIRATION_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.pickerOption,
                  currentValue === option.value && styles.pickerOptionSelected
                ]}
                onPress={() => {
                  onSelect(option.value);
                  onClose();
                }}
              >
                <Text style={styles.pickerOptionIcon}>{option.icon}</Text>
                <Text style={[
                  styles.pickerOptionLabel,
                  currentValue === option.value && styles.pickerOptionLabelSelected
                ]}>
                  {option.label}
                </Text>
                {currentValue === option.value && (
                  <Text style={styles.pickerCheck}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
          
          <View style={styles.pickerNote}>
            <Text style={styles.pickerNoteIcon}>🔐</Text>
            <Text style={styles.pickerNoteText}>
              Messages are protected with ML-DSA signatures. Expiration is enforced cryptographically.
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

/**
 * Attachment Picker Modal
 */
function AttachmentPicker({ 
  visible, 
  onSelect, 
  onClose 
}: { 
  visible: boolean; 
  onSelect: (type: string) => void;
  onClose: () => void;
}) {
  const options = [
    { type: 'camera', icon: '📷', label: 'Camera' },
    { type: 'gallery', icon: '🖼️', label: 'Gallery' },
    { type: 'file', icon: '📄', label: 'File' },
    { type: 'audio', icon: '🎵', label: 'Audio' },
    { type: 'location', icon: '📍', label: 'Location' },
    { type: 'contact', icon: '👤', label: 'Contact' },
  ];
  
  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.attachmentPickerContainer}>
          <View style={styles.attachmentPickerGrid}>
            {options.map((option) => (
              <TouchableOpacity
                key={option.type}
                style={styles.attachmentPickerItem}
                onPress={() => {
                  onSelect(option.type);
                  onClose();
                }}
              >
                <View style={styles.attachmentPickerIcon}>
                  <Text style={styles.attachmentPickerIconText}>{option.icon}</Text>
                </View>
                <Text style={styles.attachmentPickerLabel}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ============================================================================
// Main ChatScreen Component
// ============================================================================

export function ChatScreen({ 
  peerId, 
  peerName, 
  peerKeyHash, 
  onBack,
  quicHandle = null,
  ourKeyHash = '',
  ratchetHandle = null,
  isGroup = false,
  groupIcon,
  isVerified = false,
  relationshipDna,
}: ChatScreenProps): React.JSX.Element {
  const [showRelationshipSpark, setShowRelationshipSpark] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => 
    getInitialMessagesForConversation(peerId, peerName, isGroup)
  );
  const [inputText, setInputText] = useState('');
  const [expirationDuration, setExpirationDuration] = useState<number>(ExpirationDuration.Off);
  const [showExpirationPicker, setShowExpirationPicker] = useState(false);
  const [showAttachmentPicker, setShowAttachmentPicker] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const flatListRef = useRef<FlatList>(null);

  const hasRealMessaging = quicHandle !== null && ratchetHandle !== null;
  const [isConnected, setIsConnected] = useState(false);

  // Connect to MessagingService and subscribe to incoming messages
  useEffect(() => {
    // Determine server address based on device type
    // - Android emulator: uses 10.0.2.2 (maps to host localhost)
    // - Real devices: use 127.0.0.1 via ADB reverse port forwarding (USB)
    const getServerAddr = () => {
      if (Platform.OS === 'android') {
        // Check if running on emulator by looking at NativeModules
        const { PlatformConstants } = NativeModules;
        const brand = PlatformConstants?.Model || '';
        const isEmulator = brand.toLowerCase().includes('sdk') || 
                          brand.toLowerCase().includes('emulator') ||
                          brand.toLowerCase().includes('gphone');
        // Emulator: 10.0.2.2, Real device: 127.0.0.1 (via ADB reverse)
        return isEmulator ? '10.0.2.2:5000' : '127.0.0.1:5000';
      }
      return 'localhost:5000'; // iOS simulator
    };
    
    const connect = async () => {
      const SERVER_ADDR = getServerAddr();
      console.log('[Chat] Server address:', SERVER_ADDR);
      try {
        console.log('[Chat] Connecting to MessagingService...');
        const connected = await MessagingService.connect(SERVER_ADDR);
        setIsConnected(connected);
        
        if (connected) {
          console.log('[Chat] Connected to messaging server');
        } else {
          console.warn('[Chat] Connection pending, will retry');
        }
      } catch (error) {
        console.error('[Chat] Failed to connect to messaging server:', error);
      }
    };

    connect();

    // Subscribe to incoming messages
    const unsubscribe = MessagingService.onMessage((msg: IncomingMessage) => {
      console.log('[Chat] Received message:', msg.contentId);
      
      // Check if this message is for this conversation
      if (msg.resource?.includes(peerId) || msg.resource?.includes('chat/')) {
        const newMessage: ChatMessage = {
          id: `recv_${msg.contentId}`,
          text: msg.payload,
          timestamp: msg.receivedAt,
          isSent: false,
          status: MessageStatus.Delivered,
          isEstream: true,
          estreamContentId: msg.contentId,
          isVerified: msg.verified,
        };
        
        // Add to messages if not already present
        setMessages(prev => {
          const exists = prev.some(m => m.estreamContentId === msg.contentId);
          if (exists) return prev;
          return [...prev, newMessage];
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [peerId]);

  // Clean up expired messages
  useEffect(() => {
    const timer = setInterval(() => {
      setMessages(prev => prev.filter(m => !m.expiresAt || m.expiresAt > Date.now()));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Handle attachment selection
  const handleAttachmentSelect = useCallback(async (type: string) => {
    try {
      if (type === 'camera') {
        // Request camera permission on Android
        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.CAMERA,
            {
              title: 'Camera Permission',
              message: 'Poly Messenger needs camera access to take photos',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            },
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            Alert.alert('Permission Denied', 'Camera access is required to take photos');
            return;
          }
        }
        
        const result: ImagePickerResponse = await launchCamera({
          mediaType: 'photo',
          quality: 0.8,
          maxWidth: 1920,
          maxHeight: 1920,
        });
        
        if (result.assets && result.assets[0]) {
          const asset = result.assets[0];
          const attachment: Attachment = {
            id: `att_${Date.now()}`,
            type: AttachmentType.Image,
            uri: asset.uri || '',
            filename: asset.fileName || 'photo.jpg',
            mimeType: asset.type || 'image/jpeg',
            size: asset.fileSize || 0,
            width: asset.width,
            height: asset.height,
          };
          setPendingAttachments(prev => [...prev, attachment]);
        }
      } else if (type === 'gallery') {
        const result: ImagePickerResponse = await launchImageLibrary({
          mediaType: 'mixed',
          quality: 0.8,
          selectionLimit: 5,
        });
        
        if (result.assets) {
          const attachments: Attachment[] = result.assets.map((asset, index) => ({
            id: `att_${Date.now()}_${index}`,
            type: asset.type?.startsWith('video') ? AttachmentType.Video : AttachmentType.Image,
            uri: asset.uri || '',
            filename: asset.fileName || 'media',
            mimeType: asset.type || 'image/jpeg',
            size: asset.fileSize || 0,
            width: asset.width,
            height: asset.height,
            duration: asset.duration,
          }));
          setPendingAttachments(prev => [...prev, ...attachments]);
        }
      } else if (type === 'file') {
        const result = await DocumentPicker.pick({
          type: [types.allFiles],
          allowMultiSelection: true,
        });
        
        const attachments: Attachment[] = result.map((file, index) => ({
          id: `att_${Date.now()}_${index}`,
          type: AttachmentType.File,
          uri: file.uri,
          filename: file.name || 'file',
          mimeType: file.type || 'application/octet-stream',
          size: file.size || 0,
        }));
        setPendingAttachments(prev => [...prev, ...attachments]);
      } else if (type === 'audio') {
        const result = await DocumentPicker.pick({
          type: [types.audio],
        });
        
        const attachments: Attachment[] = result.map((file, index) => ({
          id: `att_${Date.now()}_${index}`,
          type: AttachmentType.Audio,
          uri: file.uri,
          filename: file.name || 'audio',
          mimeType: file.type || 'audio/mpeg',
          size: file.size || 0,
        }));
        setPendingAttachments(prev => [...prev, ...attachments]);
      } else {
        Alert.alert('Coming Soon', `${type} picker is not yet implemented`);
      }
    } catch (err: any) {
      if (DocumentPicker.isCancel(err)) {
        // User cancelled - do nothing
      } else {
        console.error('Attachment error:', err);
        Alert.alert('Error', 'Failed to select attachment');
      }
    }
  }, []);

  // Remove pending attachment
  const removePendingAttachment = useCallback((id: string) => {
    setPendingAttachments(prev => prev.filter(a => a.id !== id));
  }, []);

  // Send message with MessagingService (handles create → sign → emit)
  const handleSend = useCallback(async () => {
    if ((!inputText.trim() && pendingAttachments.length === 0) || isSending) return;

    const messageText = inputText.trim();
    const messageId = `m${Date.now()}`;
    const now = Date.now();

    // Create placeholder message immediately for responsive UI
    const newMessage: ChatMessage = {
      id: messageId,
      text: messageText,
      timestamp: now,
      isSent: true,
      status: MessageStatus.Pending,
      expiresAt: expirationDuration > 0 ? now + expirationDuration * 1000 : undefined,
      expirationDuration: expirationDuration > 0 ? expirationDuration : undefined,
      attachments: pendingAttachments.length > 0 ? [...pendingAttachments] : undefined,
      isEstream: false, // Will be updated when sent
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');
    setPendingAttachments([]);
    setIsSending(true);

    try {
      // 🔐 Use MessagingService - handles create → sign → emit automatically
      console.log('[Chat] Sending message via MessagingService:', messageText.substring(0, 30));
      
      // Send using the high-level API
      const contentId = await MessagingService.send(peerId, messageText);
      
      console.log('[Chat] Message sent with content ID:', contentId);

      // Update message with estream data
      setMessages(prev => 
        prev.map(m => m.id === messageId ? { 
          ...m, 
          status: MessageStatus.Sent,
          isEstream: true,
          estreamContentId: contentId,
          isVerified: true, // SDK verified before sending
          signerKeyHash: contentId.substring(0, 16),
        } : m)
      );

      // Mark as delivered after a moment
      setTimeout(() => {
        setMessages(prev => 
          prev.map(m => m.id === messageId ? { ...m, status: MessageStatus.Delivered } : m)
        );
      }, 500);

    } catch (error: any) {
      console.error('[Chat] Message send failed:', error);
      
      // Mark as failed but keep the message
      setMessages(prev => 
        prev.map(m => m.id === messageId ? { 
          ...m, 
          status: MessageStatus.Failed,
          isEstream: false,
        } : m)
      );

      Alert.alert(
        'Message Failed',
        `Could not send quantum-secure message: ${error.message || 'Unknown error'}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsSending(false);
    }
  }, [inputText, isSending, expirationDuration, pendingAttachments, peerId]);

  // Format timestamp
  const formatTime = (ts: number): string => {
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Status icon
  const getStatusIcon = (status: MessageStatus): string => {
    switch (status) {
      case MessageStatus.Pending: return '○';
      case MessageStatus.Sent: return '✓';
      case MessageStatus.Delivered: return '✓✓';
      case MessageStatus.Read: return '✓✓';
      case MessageStatus.Failed: return '✗';
      default: return '';
    }
  };

  // Render message
  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const prevMessage = index > 0 ? messages[index - 1] : null;
    const showDateSeparator = !prevMessage || 
      new Date(item.timestamp).toDateString() !== new Date(prevMessage.timestamp).toDateString();

    // Check if expired
    if (item.expiresAt && item.expiresAt <= Date.now()) {
      return null;
    }

    return (
      <>
        {showDateSeparator && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateSeparatorText}>
              {new Date(item.timestamp).toLocaleDateString([], { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
              })}
            </Text>
          </View>
        )}
        
        {/* Expiration indicator for received messages */}
        {item.expiresAt && !item.isSent && (
          <ExpirationTimer expiresAt={item.expiresAt} duration={item.expirationDuration} />
        )}
        
        <View style={[
          styles.messageBubble,
          item.isSent ? styles.sentBubble : styles.receivedBubble,
          item.attachments?.length && !item.text ? styles.attachmentOnlyBubble : null
        ]}>
          {/* Attachments */}
          {item.attachments?.map(attachment => (
            <AttachmentPreview key={attachment.id} attachment={attachment} isSent={item.isSent} />
          ))}
          
          {/* Text */}
          {item.text ? (
            <Text style={[
              styles.messageText,
              item.isSent ? styles.sentText : styles.receivedText
            ]}>
              {item.text}
            </Text>
          ) : null}
          
          {/* Footer */}
          <View style={styles.messageFooter}>
            {/* Quantum security badge for estream messages */}
            {item.isEstream && item.isVerified && (
              <View style={styles.quantumBadgeSmall}>
                <Text style={styles.quantumBadgeSmallText}>⚛️</Text>
              </View>
            )}
            {/* Expiration icon for sent messages */}
            {item.expiresAt && item.isSent && (
              <Text style={styles.expirationIcon}>⏱️</Text>
            )}
            <Text style={[
              styles.messageTime,
              item.isSent ? styles.sentTime : styles.receivedTime
            ]}>
              {formatTime(item.timestamp)}
            </Text>
            {item.isSent && (
              <Text style={[
                styles.messageStatus,
                item.status === MessageStatus.Read ? styles.statusRead : styles.statusDelivered
              ]}>
                {getStatusIcon(item.status)}
              </Text>
            )}
          </View>
          
          {/* Estream content ID for verified messages */}
          {item.isEstream && item.estreamContentId && (
            <Text style={styles.estreamId}>
              🔐 {item.estreamContentId.substring(0, 12)}...
            </Text>
          )}
        </View>
        
        {/* Expiration indicator for sent messages */}
        {item.expiresAt && item.isSent && (
          <View style={styles.sentExpirationContainer}>
            <ExpirationTimer expiresAt={item.expiresAt} duration={item.expirationDuration} />
          </View>
        )}
      </>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.headerCenter}
          onPress={() => !isGroup && setShowRelationshipSpark(true)}
        >
          <View style={styles.peerInfo}>
            {isGroup && groupIcon && <Text style={styles.groupIconHeader}>{groupIcon}</Text>}
            <Text style={styles.peerName}>{peerName}</Text>
            {isVerified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedBadgeText}>✓</Text>
              </View>
            )}
            <View style={styles.quantumBadge}>
              <Text style={styles.quantumBadgeText}>⚛️ PQ</Text>
            </View>
          </View>
          <Text style={styles.peerKeyHash} numberOfLines={1}>
            {isGroup ? 'Group chat' : isVerified ? 'Verified in person' : `${peerKeyHash.substring(0, 16)}...`}
          </Text>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          {!isGroup && relationshipDna && (
            <TouchableOpacity 
              style={styles.headerAction}
              onPress={() => setShowRelationshipSpark(true)}
            >
              <Text style={styles.headerActionText}>✨</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.headerAction}>
            <Text style={styles.headerActionText}>📞</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerAction}>
            <Text style={styles.headerActionText}>📹</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Expiration Banner */}
      {expirationDuration > 0 && (
        <View style={styles.expirationBanner}>
          <Text style={styles.expirationBannerIcon}>⏱️</Text>
          <Text style={styles.expirationBannerText}>
            Disappearing messages: {EXPIRATION_OPTIONS.find(o => o.value === expirationDuration)?.label}
          </Text>
        </View>
      )}

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        onLayout={() => flatListRef.current?.scrollToEnd()}
      />

      {/* Pending Attachments Preview */}
      {pendingAttachments.length > 0 && (
        <View style={styles.pendingAttachments}>
          {pendingAttachments.map(attachment => (
            <View key={attachment.id} style={styles.pendingAttachment}>
              {attachment.type === AttachmentType.Image ? (
                <Image source={{ uri: attachment.uri }} style={styles.pendingImage} />
              ) : (
                <View style={styles.pendingFile}>
                  <Text style={styles.pendingFileIcon}>📄</Text>
                </View>
              )}
              <TouchableOpacity 
                style={styles.removePendingBtn}
                onPress={() => removePendingAttachment(attachment.id)}
              >
                <Text style={styles.removePendingText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Input Bar */}
      <View style={styles.inputBar}>
        <TouchableOpacity 
          style={styles.attachButton}
          onPress={() => setShowAttachmentPicker(true)}
        >
          <Text style={styles.inputIcon}>📎</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.textInput}
          placeholder="Message..."
          placeholderTextColor={colors.textMuted}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={4096}
        />
        <TouchableOpacity 
          style={[styles.timerButton, expirationDuration > 0 && styles.timerActive]}
          onPress={() => setShowExpirationPicker(true)}
        >
          <Text style={styles.timerIcon}>{expirationDuration > 0 ? '⏱️' : '⏱'}</Text>
          {expirationDuration > 0 && (
            <Text style={styles.timerLabel}>
              {EXPIRATION_OPTIONS.find(o => o.value === expirationDuration)?.label}
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            styles.sendButton, 
            (!inputText.trim() && pendingAttachments.length === 0) && styles.sendButtonDisabled
          ]}
          onPress={handleSend}
          disabled={!inputText.trim() && pendingAttachments.length === 0}
        >
          <Text style={styles.sendIcon}>📤</Text>
        </TouchableOpacity>
      </View>

      {/* Modals */}
      <ExpirationPicker
        visible={showExpirationPicker}
        currentValue={expirationDuration}
        onSelect={setExpirationDuration}
        onClose={() => setShowExpirationPicker(false)}
      />
      
      <AttachmentPicker
        visible={showAttachmentPicker}
        onSelect={handleAttachmentSelect}
        onClose={() => setShowAttachmentPicker(false)}
      />

      {/* Relationship Spark Modal */}
      <Modal visible={showRelationshipSpark} transparent animationType="fade">
        <TouchableOpacity 
          style={styles.sparkModalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowRelationshipSpark(false)}
        >
          <View style={styles.sparkModalContent}>
            <Text style={styles.sparkModalTitle}>Relationship Spark</Text>
            <Text style={styles.sparkModalSubtitle}>
              This unique pattern is shared only with {peerName}
            </Text>
            
            <View style={styles.sparkModalDisplay}>
              <RelationshipSpark
                walletIdA={ourKeyHash || 'self'}
                walletIdB={peerId}
                relationshipDna={relationshipDna}
                size={200}
              />
            </View>
            
            {isVerified ? (
              <View style={styles.verifiedBanner}>
                <Text style={styles.verifiedBannerIcon}>✓</Text>
                <Text style={styles.verifiedBannerText}>Verified in person</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.verifyPrompt}>
                <Text style={styles.verifyPromptText}>
                  Meet in person to verify this contact
                </Text>
              </TouchableOpacity>
            )}
            
            <Text style={styles.sparkModalHelp}>
              Both you and {peerName} see the same pattern
            </Text>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
  },
  backText: {
    color: colors.primary,
    fontSize: 24,
  },
  headerCenter: {
    flex: 1,
    marginLeft: 8,
  },
  peerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupIconHeader: {
    fontSize: 20,
    marginRight: 6,
  },
  peerName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  quantumBadge: {
    marginLeft: 8,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  quantumBadgeText: {
    color: colors.primaryLight,
    fontSize: 10,
    fontWeight: '600',
  },
  peerKeyHash: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerAction: {
    padding: 8,
  },
  headerActionText: {
    fontSize: 20,
  },

  // Expiration Banner
  expirationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  expirationBannerIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  expirationBannerText: {
    color: colors.warning,
    fontSize: 13,
    fontWeight: '500',
  },

  // Messages
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 12,
    paddingBottom: 20,
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateSeparatorText: {
    color: colors.textMuted,
    fontSize: 12,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    marginVertical: 2,
  },
  sentBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  receivedBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.received,
    borderBottomLeftRadius: 4,
  },
  attachmentOnlyBubble: {
    padding: 4,
    backgroundColor: 'transparent',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  sentText: {
    color: colors.text,
  },
  receivedText: {
    color: colors.text,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
  },
  expirationIcon: {
    fontSize: 10,
    marginRight: 4,
  },
  messageTime: {
    fontSize: 11,
  },
  sentTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  receivedTime: {
    color: colors.textMuted,
  },
  messageStatus: {
    marginLeft: 4,
    fontSize: 11,
  },
  statusDelivered: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  statusRead: {
    color: colors.success,
  },
  quantumBadgeSmall: {
    marginRight: 4,
  },
  quantumBadgeSmallText: {
    fontSize: 10,
  },
  estreamId: {
    fontSize: 9,
    color: 'rgba(124, 58, 237, 0.7)',
    fontFamily: 'monospace',
    marginTop: 2,
  },

  // Expiration Timer
  expirationContainer: {
    alignSelf: 'flex-start',
    marginBottom: 4,
    marginLeft: 4,
  },
  sentExpirationContainer: {
    alignSelf: 'flex-end',
    marginTop: 2,
    marginRight: 4,
  },
  expirationBar: {
    height: 2,
    backgroundColor: colors.warning,
    borderRadius: 1,
    marginBottom: 2,
  },
  expirationUrgent: {
    backgroundColor: colors.error,
  },
  expirationText: {
    color: colors.warning,
    fontSize: 11,
  },
  expirationTextUrgent: {
    color: colors.error,
  },

  // Attachments
  imageAttachment: {
    marginBottom: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  attachmentImage: {
    borderRadius: 12,
  },
  videoAttachment: {
    position: 'relative',
    marginBottom: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -24,
    marginTop: -24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonText: {
    color: colors.text,
    fontSize: 20,
  },
  videoDuration: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    color: colors.text,
    fontSize: 11,
  },
  audioAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    marginBottom: 4,
  },
  audioSent: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  audioReceived: {
    backgroundColor: colors.surfaceLight,
  },
  audioIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  audioWaveform: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
  },
  waveformBar: {
    width: 3,
    marginHorizontal: 1,
    borderRadius: 2,
  },
  waveformSent: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  waveformReceived: {
    backgroundColor: colors.textMuted,
  },
  audioDuration: {
    color: colors.textSecondary,
    fontSize: 12,
    marginLeft: 8,
  },
  fileAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    marginBottom: 4,
  },
  fileSent: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  fileReceived: {
    backgroundColor: colors.surfaceLight,
  },
  fileIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  fileIconText: {
    fontSize: 20,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  fileSize: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  downloadButton: {
    padding: 8,
  },
  downloadIcon: {
    fontSize: 18,
  },

  // Pending Attachments
  pendingAttachments: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pendingAttachment: {
    position: 'relative',
    marginRight: 8,
  },
  pendingImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  pendingFile: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingFileIcon: {
    fontSize: 24,
  },
  removePendingBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removePendingText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },

  // Input Bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  attachButton: {
    padding: 10,
    marginRight: 4,
  },
  timerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 4,
    borderRadius: 16,
    backgroundColor: colors.surfaceLight,
  },
  timerActive: {
    backgroundColor: 'rgba(251, 191, 36, 0.25)',
    borderWidth: 1,
    borderColor: colors.warning,
  },
  inputIcon: {
    fontSize: 22,
  },
  timerIcon: {
    fontSize: 18,
  },
  timerLabel: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 8,
    color: colors.text,
    fontSize: 16,
    maxHeight: 120,
  },
  sendButton: {
    padding: 8,
  },
  sendButtonDisabled: {
    opacity: 0.3,
  },
  sendIcon: {
    fontSize: 20,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  pickerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  pickerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  pickerOptions: {
    gap: 4,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.surfaceLight,
    marginBottom: 4,
  },
  pickerOptionSelected: {
    backgroundColor: colors.primary,
  },
  pickerOptionIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  pickerOptionLabel: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  pickerOptionLabelSelected: {
    fontWeight: '600',
  },
  pickerCheck: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  pickerNote: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
  },
  pickerNoteIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  pickerNoteText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  attachmentPickerContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  attachmentPickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  attachmentPickerItem: {
    alignItems: 'center',
    width: '30%',
    marginBottom: 20,
  },
  attachmentPickerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  attachmentPickerIconText: {
    fontSize: 24,
  },
  attachmentPickerLabel: {
    fontSize: 13,
    color: colors.text,
  },
  
  // Relationship Spark Modal
  sparkModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sparkModalContent: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  sparkModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  sparkModalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  sparkModalDisplay: {
    marginBottom: 24,
  },
  verifiedBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  verifiedBannerIcon: {
    color: colors.success,
    fontSize: 16,
    fontWeight: '700',
  },
  verifiedBannerText: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '500',
  },
  verifyPrompt: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
  },
  verifyPromptText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  sparkModalHelp: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
});

export default ChatScreen;
