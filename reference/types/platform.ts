/**
 * Platform Message Types for Cipher
 * 
 * Type definitions for messages from TakeTitle and TrueResolve.
 */

import { PqSignature } from './messaging';

/**
 * Platform message types
 */
export enum PlatformMessageType {
  // TakeTitle
  AssetCreated = 'asset_created',
  InvestmentConfirmed = 'investment_confirmed',
  SigningRequest = 'signing_request',
  PortfolioUpdate = 'portfolio_update',
  GovernanceProposal = 'governance_proposal',
  TransferReceived = 'transfer_received',
  
  // TrueResolve
  NewCase = 'new_case',
  NewEvidence = 'new_evidence',
  CaseUpdate = 'case_update',
  AiAnalysisComplete = 'ai_analysis_complete',
  DecisionRendered = 'decision_rendered',
  
  // Generic
  SecurityAlert = 'security_alert',
  SystemNotification = 'system_notification',
}

/**
 * Platform identifier
 */
export type Platform = 'taketitle' | 'trueresolve' | 'estream';

/**
 * Message action types
 */
export type MessageActionType = 
  | 'sign_mwa'      // Sign with Mobile Wallet Adapter
  | 'open_app'      // Deep link to platform app
  | 'view_details'  // Show more info
  | 'vote'          // Governance vote
  | 'approve'       // Approve action
  | 'reject'        // Reject action
  | 'custom';       // Custom action

/**
 * Action button for platform messages
 */
export interface MessageAction {
  id: string;
  label: string;
  action: MessageActionType;
  payload?: Record<string, unknown>;
  variant?: 'primary' | 'secondary' | 'danger';
}

/**
 * Platform message
 */
export interface PlatformMessage {
  id: string;
  type: PlatformMessageType;
  platform: Platform;
  
  // Message content
  title: string;
  body: string;
  payload: Record<string, unknown>;
  
  // Cryptography
  signature: PqSignature;
  platformPublicKey: string;
  
  // Actions (in-chat buttons)
  actions?: MessageAction[];
  
  // Metadata
  timestamp: number;
  read: boolean;
  archived: boolean;
  
  // Deep linking
  deepLink?: string;
}

/**
 * Platform contact (for TakeTitle, TrueResolve service accounts)
 */
export interface PlatformContact {
  id: string;
  platform: Platform;
  displayName: string;
  publicKeyHash: string;
  iconUrl?: string;
  verified: boolean;
}

