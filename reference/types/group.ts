/**
 * Group Messaging Types for Cipher
 * 
 * Type definitions for PQ-encrypted group conversations using Sender Keys.
 * Based on Signal's Sender Keys protocol adapted for post-quantum cryptography.
 */

import { PqSignature, PqPublicKeys, MessageStatus, ConversationState } from './messaging';

/**
 * Group member role
 */
export enum GroupRole {
  Member = 'member',
  Admin = 'admin',
  Owner = 'owner',
}

/**
 * Sender Key state for a group member
 */
export interface SenderKeyState {
  /** Current chain key (32 bytes) */
  chainKey: Uint8Array;
  /** Message iteration counter */
  iteration: number;
  /** Public signing key for verification */
  publicSigningKey: Uint8Array;
  /** Created timestamp */
  createdAt: number;
  /** Last used timestamp */
  lastUsedAt?: number;
}

/**
 * Sender Key Distribution Message (SKDM)
 * Sent to group members via pairwise Double Ratchet sessions
 */
export interface SenderKeyDistributionMessage {
  /** Group ID this SKDM is for */
  groupId: string;
  /** Sender's key hash */
  senderKeyHash: string;
  /** Initial chain key (encrypted in transit) */
  chainKey: Uint8Array;
  /** Starting iteration */
  iteration: number;
  /** Sender's public signing key */
  publicSigningKey: Uint8Array;
  /** Signature over the SKDM content */
  signature: PqSignature;
  /** Creation timestamp */
  timestamp: number;
}

/**
 * A member of a group
 */
export interface GroupMember {
  /** Member's device key hash */
  keyHash: string;
  /** Display name */
  displayName?: string;
  /** Avatar URL */
  avatarUrl?: string;
  /** Member's role */
  role: GroupRole;
  /** When the member joined */
  joinedAt: number;
  /** Member's sender key state (for decrypting their messages) */
  senderKey?: SenderKeyState;
  /** Whether we've received their SKDM */
  hasSenderKey: boolean;
  /** Whether they've acknowledged our SKDM */
  hasOurSenderKey: boolean;
}

/**
 * Group conversation extending the base Conversation type
 */
export interface GroupConversation {
  /** Unique group ID */
  id: string;
  /** Group name */
  name: string;
  /** Group description */
  description?: string;
  /** Group avatar URL */
  avatarUrl?: string;
  /** Whether this is a group (always true) */
  isGroup: true;
  /** Current members */
  members: GroupMember[];
  /** Member key hashes for quick lookup */
  memberKeyHashes: Set<string>;
  /** Group state */
  state: ConversationState;
  /** Our sender key for this group */
  ourSenderKey?: SenderKeyState;
  /** Last message preview */
  lastMessage?: string;
  /** Last message time */
  lastMessageTime?: number;
  /** Last message sender key hash */
  lastMessageSender?: string;
  /** Unread message count */
  unreadCount: number;
  /** When the group was created */
  createdAt: number;
  /** Who created the group */
  createdBy: string;
  /** Group settings */
  settings: GroupSettings;
}

/**
 * Group settings
 */
export interface GroupSettings {
  /** Only admins can send messages */
  adminOnlyMessages: boolean;
  /** Only admins can add members */
  adminOnlyInvite: boolean;
  /** Only admins can change group info */
  adminOnlyEdit: boolean;
  /** Default message expiration (seconds) */
  defaultExpirationSeconds?: number;
  /** Maximum members allowed */
  maxMembers: number;
}

/**
 * Default group settings
 */
export const DEFAULT_GROUP_SETTINGS: GroupSettings = {
  adminOnlyMessages: false,
  adminOnlyInvite: false,
  adminOnlyEdit: true,
  defaultExpirationSeconds: undefined,
  maxMembers: 100,
};

/**
 * A message sent to a group
 */
export interface GroupMessage {
  /** Unique message ID */
  id: string;
  /** Group this message belongs to */
  groupId: string;
  /** Message content */
  text: string;
  /** Sender's key hash */
  senderKeyHash: string;
  /** Sender key iteration used */
  senderKeyIteration: number;
  /** Signature over the message */
  signature: PqSignature;
  /** Message timestamp */
  timestamp: number;
  /** Message status */
  status: MessageStatus;
  /** Expiration time */
  expiresAt?: number;
  /** Whether message is expired */
  isExpired: boolean;
  /** Delivery receipts */
  deliveredTo: string[];
  /** Read receipts */
  readBy: string[];
}

/**
 * Group event types
 */
export enum GroupEventType {
  Created = 'created',
  MemberAdded = 'member_added',
  MemberRemoved = 'member_removed',
  MemberLeft = 'member_left',
  RoleChanged = 'role_changed',
  NameChanged = 'name_changed',
  AvatarChanged = 'avatar_changed',
  SettingsChanged = 'settings_changed',
  SenderKeyRotated = 'sender_key_rotated',
}

/**
 * Group event (stored in message history)
 */
export interface GroupEvent {
  /** Event ID */
  id: string;
  /** Group ID */
  groupId: string;
  /** Event type */
  type: GroupEventType;
  /** Who triggered the event */
  actorKeyHash: string;
  /** Event-specific data */
  data: Record<string, unknown>;
  /** Signature */
  signature: PqSignature;
  /** Timestamp */
  timestamp: number;
}

/**
 * Create group request
 */
export interface CreateGroupRequest {
  /** Group name */
  name: string;
  /** Initial members (key hashes) */
  memberKeyHashes: string[];
  /** Optional description */
  description?: string;
  /** Optional avatar URL */
  avatarUrl?: string;
  /** Optional settings override */
  settings?: Partial<GroupSettings>;
}

/**
 * Add member request
 */
export interface AddMemberRequest {
  /** Group ID */
  groupId: string;
  /** Member to add */
  keyHash: string;
  /** Optional display name */
  displayName?: string;
  /** Role to assign (default: Member) */
  role?: GroupRole;
}

/**
 * Remove member request
 */
export interface RemoveMemberRequest {
  /** Group ID */
  groupId: string;
  /** Member to remove */
  keyHash: string;
  /** Reason for removal */
  reason?: string;
}

/**
 * Change role request
 */
export interface ChangeRoleRequest {
  /** Group ID */
  groupId: string;
  /** Member to change */
  keyHash: string;
  /** New role */
  newRole: GroupRole;
}

/**
 * Update group request
 */
export interface UpdateGroupRequest {
  /** Group ID */
  groupId: string;
  /** New name (optional) */
  name?: string;
  /** New description (optional) */
  description?: string;
  /** New avatar URL (optional) */
  avatarUrl?: string;
  /** New settings (optional) */
  settings?: Partial<GroupSettings>;
}

