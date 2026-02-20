/**
 * useMessaging Hook
 *
 * React hook for the eStream messaging client.
 *
 * @package io.estream.polymessenger
 * @issue #101
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  EstreamMessagingClient,
  getEstreamMessagingClient,
  SendMessageOptions,
  ConnectionState,
} from '../services/messaging/EstreamMessagingClient';
import { Message, Conversation } from '../types';

interface UseMessagingReturn {
  // State
  conversations: Conversation[];
  currentMessages: Message[];
  connectionState: ConnectionState;
  isLoading: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  sendMessage: (conversationId: string, text: string, options?: SendMessageOptions) => Promise<Message>;
  loadConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  createConversation: (participantId: string, name?: string) => Promise<Conversation>;
  deleteConversation: (conversationId: string) => Promise<void>;
  markAsRead: (messageId: string, conversationId: string) => Promise<void>;
  retryMessage: (messageId: string) => Promise<void>;
}

export function useMessaging(): UseMessagingReturn {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentMessages, setCurrentMessages] = useState<Message[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    isConnecting: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientRef = useRef<EstreamMessagingClient | null>(null);
  const unsubscribesRef = useRef<(() => void)[]>([]);

  useEffect(() => {
    clientRef.current = getEstreamMessagingClient();

    // Subscribe to connection state
    const connUnsub = clientRef.current.onConnectionChange((state) => {
      setConnectionState(state);
    });

    // Subscribe to new messages
    const msgUnsub = clientRef.current.onMessage((message) => {
      setCurrentMessages((prev) => {
        // Check if message already exists
        if (prev.some((m) => m.id === message.id)) {
          return prev.map((m) => (m.id === message.id ? message : m));
        }
        return [...prev, message];
      });
    });

    unsubscribesRef.current = [connUnsub, msgUnsub];

    return () => {
      unsubscribesRef.current.forEach((unsub) => unsub());
    };
  }, []);

  const initialize = useCallback(async () => {
    if (!clientRef.current) return;
    setIsLoading(true);
    setError(null);
    try {
      await clientRef.current.initialize();
      await loadConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadConversations = useCallback(async () => {
    if (!clientRef.current) return;
    try {
      const convos = await clientRef.current.listConversations();
      setConversations(convos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
    }
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    if (!clientRef.current) return;
    try {
      const msgs = await clientRef.current.getMessages(conversationId);
      setCurrentMessages(msgs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    }
  }, []);

  const sendMessage = useCallback(
    async (conversationId: string, text: string, options?: SendMessageOptions) => {
      if (!clientRef.current) {
        throw new Error('Client not initialized');
      }
      setError(null);
      try {
        const msg = await clientRef.current.sendMessage(conversationId, text, options);
        setCurrentMessages((prev) => [...prev, msg]);
        return msg;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send message');
        throw err;
      }
    },
    []
  );

  const createConversation = useCallback(
    async (participantId: string, name?: string) => {
      if (!clientRef.current) {
        throw new Error('Client not initialized');
      }
      const convo = await clientRef.current.createConversation(participantId, name);
      setConversations((prev) => [...prev, convo]);
      return convo;
    },
    []
  );

  const deleteConversation = useCallback(async (conversationId: string) => {
    if (!clientRef.current) return;
    await clientRef.current.deleteConversation(conversationId);
    setConversations((prev) => prev.filter((c) => c.id !== conversationId));
  }, []);

  const markAsRead = useCallback(async (messageId: string, conversationId: string) => {
    if (!clientRef.current) return;
    await clientRef.current.markMessageAsRead(messageId, conversationId);
  }, []);

  const retryMessage = useCallback(async (messageId: string) => {
    if (!clientRef.current) return;
    await clientRef.current.retryMessage(messageId);
  }, []);

  return {
    conversations,
    currentMessages,
    connectionState,
    isLoading,
    error,
    initialize,
    sendMessage,
    loadConversations,
    loadMessages,
    createConversation,
    deleteConversation,
    markAsRead,
    retryMessage,
  };
}

export default useMessaging;


