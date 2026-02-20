/**
 * Messaging Types for Poly Messenger
 * 
 * Core type definitions for PQ-encrypted messaging.
 */

/**
 * PQ Signature (Dilithium5)
 */
export interface PqSignature {
  bytes: Uint8Array;
  algorithm: 'dilithium5';
}

/**
 * PQ Public Keys
 */
export interface PqPublicKeys {
  signing: Uint8Array;    // Dilithium5 public key (~2.5KB)
  kem: Uint8Array;        // Kyber1024 public key (~1.5KB)
  keyHash: Uint8Array;    // 32-byte Blake3 hash
}

/**
 * Message status
 */
export enum MessageStatus {
  Pending = 'pending',
  Sent = 'sent',
  Delivered = 'delivered',
  Read = 'read',
  Failed = 'failed',
  Expired = 'expired',
}

/**
 * Attachment types
 */
export enum AttachmentType {
  Image = 'image',
  Video = 'video',
  Audio = 'audio',
  File = 'file',
  Voice = 'voice',
  Location = 'location',
  Contact = 'contact',
}

/**
 * Attachment metadata
 */
export interface Attachment {
  id: string;
  type: AttachmentType;
  
  // File info
  uri: string;
  filename: string;
  mimeType: string;
  size: number;
  
  // Media dimensions (for images/videos)
  width?: number;
  height?: number;
  
  // Duration (for audio/video)
  duration?: number;
  
  // Thumbnail for images/videos
  thumbnail?: string;
  
  // Upload status
  uploadProgress?: number;
  isUploaded: boolean;
  
  // eStream content hash
  contentHash?: string;
}

/**
 * Expiration settings
 */
export enum ExpirationDuration {
  Off = 0,
  ThirtySeconds = 30,
  OneMinute = 60,
  FiveMinutes = 300,
  OneHour = 3600,
  OneDay = 86400,
  OneWeek = 604800,
}

/**
 * Expiration mode
 */
export enum ExpirationMode {
  AfterSend = 'after_send',     // Timer starts when message is sent
  AfterRead = 'after_read',     // Timer starts when message is read
}

/**
 * Message expiration config
 */
export interface ExpirationConfig {
  duration: ExpirationDuration;
  mode: ExpirationMode;
}

/**
 * A single message
 */
export interface Message {
  id: string;
  conversationId: string;
  
  // Content
  text: string;
  attachments?: Attachment[];
  
  // Sender/recipient
  senderKeyHash: string;
  recipientKeyHash: string;
  
  // Cryptography
  signature: PqSignature;
  isSealed: boolean;
  
  // Metadata
  timestamp: number;
  status: MessageStatus;
  
  // Expiration
  expirationConfig?: ExpirationConfig;
  expiresAt?: number;
  expirationStartedAt?: number;
  isExpired: boolean;
  
  // Reply
  replyToId?: string;
  
  // Reactions
  reactions?: { [emoji: string]: string[] }; // emoji -> list of keyHashes
}

/**
 * Conversation state
 */
export enum ConversationState {
  Initial = 'initial',
  Active = 'active',
  Paused = 'paused',
  Ended = 'ended',
}

/**
 * A conversation with another device
 */
export interface Conversation {
  id: string;
  
  // Peer info
  peerKeyHash: string;
  peerDisplayName?: string;
  
  // State
  state: ConversationState;
  
  // Last message preview
  lastMessage?: string;
  lastMessageTime?: number;
  
  // Unread count
  unreadCount: number;
  
  // Cryptography
  hasActiveRatchet: boolean;
}

/**
 * Message tombstone (for expired/deleted messages)
 */
export interface MessageTombstone {
  messageId: string;
  deletedAt: number;
  reason: 'expired' | 'deleted' | 'revoked';
  deletionSignature: PqSignature;
  tombstoneHash: Uint8Array;
}

