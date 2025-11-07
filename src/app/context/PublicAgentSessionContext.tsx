'use client';

/**
 * Public Agent Session Context
 * 
 * Manages browser-only chat sessions for PUBLIC_AGENT mode.
 * Provides session state, thread management, and IndexedDB integration.
 */

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import {
  getSessionMetadata,
  createOrUpdateSessionMetadata,
  getAllThreads,
  getThread,
  createThread,
  updateThread,
  deleteThread,
  getMessagesByThreadId,
  createMessage,
  isPublicAgentMode,
  migrateThread,
} from '@/lib/storage/indexeddb';
import type {
  SessionMetadata,
  StoredThread,
  StoredMessage,
} from '@/lib/storage/types';
import { useApiService } from '@/hooks/useApiService';
import { useConfig } from '@/app/context/ConfigContext';

interface PublicAgentSessionContextType {
  // Session state
  sessionId: string | null;
  metadata: SessionMetadata | null;
  threads: StoredThread[];
  activeThreadId: string | null;
  
  // Loading states
  isLoading: boolean;
  isInitialized: boolean;
  
  // Thread operations
  createNewThread: (title?: string) => Promise<StoredThread>;
  updateThreadTitle: (threadId: string, title: string, serverThreadId?: number) => Promise<void>;
  deleteThreadById: (threadId: string) => Promise<void>;
  setActiveThread: (threadId: string | null) => void;
  
  // Message operations
  getThreadMessages: (threadId: string) => Promise<StoredMessage[]>;
  saveMessage: (
    threadId: string,
    role: 'user' | 'assistant',
    content: string,
    metadata?: StoredMessage['metadata']
  ) => Promise<StoredMessage>;
  
  // Metadata operations
  refreshMetadata: () => Promise<void>;
  
  // Mode check
  isPublicAgentMode: boolean;
}

const PublicAgentSessionContext = createContext<PublicAgentSessionContextType | undefined>(undefined);

export function usePublicAgentSession() {
  const context = useContext(PublicAgentSessionContext);
  if (!context) {
    throw new Error('usePublicAgentSession must be used within PublicAgentSessionProvider');
  }
  return context;
}

interface PublicAgentSessionProviderProps {
  children: ReactNode;
}

export function PublicAgentSessionProvider({ children }: PublicAgentSessionProviderProps) {
  const [isPublicAgent] = useState(() => isPublicAgentMode());
  const apiService = useApiService();
  const { config } = useConfig();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<SessionMetadata | null>(null);
  const [threads, setThreads] = useState<StoredThread[]>([]);
  const [activeThreadId, setActiveThreadIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Get email from config for API calls
  const userEmail = config?.userInfo?.email || 'user';

  // Initialize session on mount
  useEffect(() => {
    if (!isPublicAgent) {
      setIsLoading(false);
      setIsInitialized(true);
      return;
    }

    const initializeSession = async () => {
      try {
        // Load or create session metadata
        let sessionMeta = await getSessionMetadata();
        
        if (!sessionMeta) {
          // Create new session
          sessionMeta = await createOrUpdateSessionMetadata({
            createdAt: Date.now(),
            lastSyncedAt: null,
            threadCount: 0,
            lastTokenRefresh: null,
          });
        }

        setSessionId(sessionMeta.sessionId);
        setMetadata(sessionMeta);

        // Load all threads
        const allThreads = await getAllThreads();
        setThreads(allThreads);

        // Set active thread to most recent if available
        if (allThreads.length > 0 && !activeThreadId) {
          setActiveThreadIdState(allThreads[0].threadId);
        }
      } catch (error) {
        console.error('Error initializing public agent session:', error);
      } finally {
        setIsLoading(false);
        setIsInitialized(true);
      }
    };

    initializeSession();
  }, [isPublicAgent, activeThreadId]);

  // Refresh metadata
  const refreshMetadata = useCallback(async () => {
    if (!isPublicAgent) return;
    
    try {
      const sessionMeta = await getSessionMetadata();
      if (sessionMeta) {
        setMetadata(sessionMeta);
      }
    } catch (error) {
      console.error('Error refreshing metadata:', error);
    }
  }, [isPublicAgent]);

  // Create new thread
  const createNewThread = useCallback(async (title: string = 'New Chat'): Promise<StoredThread> => {
    if (!isPublicAgent) {
      throw new Error('Public agent mode is not enabled');
    }

    // Use negative numeric ID for local threads (matches URL format)
    // The thread will be created on the server when the first response is sent
    // The response API will return thread_id and chat_thread_name, which we'll use to update this thread
    const threadId = (-Date.now()).toString();
    
    // Store thread in IndexedDB with local ID only (server ID will be added when first response arrives)
    const thread = await createThread(threadId, title, {
      localThreadId: parseInt(threadId),
      serverThreadId: null, // Will be set when first response returns thread_id
    });
    
    setThreads((prev) => [thread, ...prev]);
    setActiveThreadIdState(threadId);
    
    // Refresh metadata to update thread count
    await refreshMetadata();
    
    return thread;
  }, [isPublicAgent, refreshMetadata]);

  // Update thread title
  // This is called when:
  // 1. First response arrives: response API returns thread_id and chat_thread_name, we update IndexedDB with server ID
  // 2. User manually edits title: we call updateChatThreadTitle API to update on server
  const updateThreadTitle = useCallback(async (threadId: string, title: string, serverThreadId?: number) => {
    if (!isPublicAgent) return;

    // Try to find thread by the provided threadId
    let thread = await getThread(threadId);
    
    // If not found, try to find by searching all threads (handles legacy format or metadata matching)
    if (!thread) {
      const allThreads = await getAllThreads();
      thread = allThreads.find(t => {
        // Check if threadId matches stored threadId, or matches metadata IDs
        return t.threadId === threadId ||
          t.threadId.includes(threadId) ||
          (t.metadata?.serverThreadId?.toString() === threadId) ||
          (t.metadata?.localThreadId?.toString() === threadId) ||
          (serverThreadId && t.metadata?.serverThreadId === serverThreadId) ||
          (serverThreadId && parseInt(t.threadId) === serverThreadId);
      }) || null;
    }
    
    // If thread still not found, create it (this handles the case where server returns a new thread ID)
    if (!thread) {
      const numericId = /^-?\d+$/.test(threadId) ? parseInt(threadId) : null;
      thread = await createThread(threadId, title, {
        serverThreadId: serverThreadId || (numericId && numericId > 0 ? numericId : null),
        localThreadId: numericId && numericId < 0 ? numericId : null,
      });
      // Update threads state
      setThreads((prev) => [thread!, ...prev]);
      return; // Thread created with the title, no need to update
    }

    // Use the actual thread's threadId from IndexedDB
    const actualThreadId = thread.threadId;
    const isNegativeThreadId = parseInt(actualThreadId) < 0;
    
    // If we have a server threadId and the current thread has a negative ID, migrate the thread
    if (serverThreadId && serverThreadId > 0 && isNegativeThreadId) {
      // Migrate thread from negative ID to positive server ID
      const serverThreadIdString = serverThreadId.toString();
      
      // Perform the migration (this will create new thread in IndexedDB and delete old one)
      const migratedThread = await migrateThread(actualThreadId, serverThreadIdString, title);
      
      // Atomically update state: remove old thread and add new one in a single update
      // This prevents duplicate keys during the migration
      setThreads((prev) => {
        // Remove the old thread (negative ID) and check if new thread already exists
        const filtered = prev.filter((t) => t.threadId !== actualThreadId);
        const exists = filtered.some((t) => t.threadId === serverThreadIdString);
        
        if (exists) {
          // If it exists, replace it instead of adding (shouldn't happen, but safety check)
          return filtered.map((t) => 
            t.threadId === serverThreadIdString ? migratedThread : t
          );
        }
        // Add the migrated thread at the beginning (most recent)
        return [migratedThread, ...filtered];
      });
      
      // If this was the active thread, update the active thread ID
      if (activeThreadId === actualThreadId) {
        setActiveThreadIdState(serverThreadIdString);
      }
      
      return; // Migration complete
    }
    
    // Determine the server thread ID to use for API call
    const apiThreadId = serverThreadId || thread.metadata?.serverThreadId || 
      (parseInt(actualThreadId) > 0 ? parseInt(actualThreadId) : null);
    
    // PUBLIC_AGENT mode: Call API to update thread title on server (showcases the API)
    // Note: This is called when user manually edits title. For first response, the thread was already
    // created by the response API, so this call updates it if the title changed.
    if (apiService && apiThreadId && apiThreadId > 0) {
      try {
        await apiService.updateChatThreadTitle(apiThreadId, title, userEmail);
      } catch (error) {
        console.error('Error updating thread title via API:', error);
        // Continue with local update even if API call fails
      }
    }
    
    // Update thread title and also update metadata if serverThreadId is provided
    const updates: Partial<Pick<StoredThread, 'title' | 'messageIds' | 'metadata'>> = {
      title,
    };
    
    // If we're updating with a server thread ID, store it in metadata
    if (serverThreadId) {
      updates.metadata = {
        ...thread.metadata,
        serverThreadId: serverThreadId,
      };
    } else if (apiThreadId && apiThreadId > 0) {
      updates.metadata = {
        ...thread.metadata,
        serverThreadId: apiThreadId,
      };
    }
    
    await updateThread(actualThreadId, updates);
    
    setThreads((prev) =>
      prev.map((t) =>
        t.threadId === actualThreadId ? { ...t, title, updatedAt: Date.now(), metadata: updates.metadata || t.metadata } : t
      )
    );
  }, [isPublicAgent, apiService, userEmail, activeThreadId]);

  // Delete thread
  const deleteThreadById = useCallback(async (threadId: string) => {
    if (!isPublicAgent) return;

    // Get thread to find server thread ID before deleting
    const thread = await getThread(threadId);
    const serverThreadId = thread?.metadata?.serverThreadId || 
      (parseInt(threadId) > 0 ? parseInt(threadId) : null);
    
    // PUBLIC_AGENT mode: Call API to delete thread on server (showcases the API)
    if (apiService && serverThreadId && serverThreadId > 0) {
      try {
        await apiService.deleteChatThread(serverThreadId);
      } catch (error) {
        console.error('Error deleting thread via API:', error);
        // Continue with local delete even if API call fails
      }
    }

    await deleteThread(threadId);
    
    setThreads((prev) => prev.filter((thread) => thread.threadId !== threadId));
    
    // Clear active thread if it was deleted
    if (activeThreadId === threadId) {
      const remainingThreads = threads.filter((t) => t.threadId !== threadId);
      setActiveThreadIdState(remainingThreads.length > 0 ? remainingThreads[0].threadId : null);
    }
    
    // Refresh metadata
    await refreshMetadata();
  }, [isPublicAgent, activeThreadId, threads, refreshMetadata, apiService]);

  // Set active thread
  const setActiveThread = useCallback((threadId: string | null) => {
    setActiveThreadIdState(threadId);
  }, []);

  // Get thread messages
  const getThreadMessages = useCallback(async (threadId: string): Promise<StoredMessage[]> => {
    if (!isPublicAgent) {
      return [];
    }

    try {
      // Try to get messages by the provided threadId
      let messages = await getMessagesByThreadId(threadId);
      
      // If no messages found, try to find thread by searching (handles legacy format or metadata matching)
      if (messages.length === 0) {
        const allThreads = await getAllThreads();
        // Find thread where threadId matches
        const matchingThread = allThreads.find(t => {
          return t.threadId === threadId ||
            t.threadId.includes(threadId) ||
            (t.metadata?.serverThreadId?.toString() === threadId) ||
            (t.metadata?.localThreadId?.toString() === threadId);
        });
        
        if (matchingThread) {
          // Get messages using the actual IndexedDB threadId
          messages = await getMessagesByThreadId(matchingThread.threadId);
        }
      }
      
      return messages;
    } catch (error) {
      console.error('Error getting thread messages:', error);
      return [];
    }
  }, [isPublicAgent]);

  // Save message
  const saveMessage = useCallback(async (
    threadId: string,
    role: 'user' | 'assistant',
    content: string,
    metadata?: StoredMessage['metadata']
  ): Promise<StoredMessage> => {
    if (!isPublicAgent) {
      throw new Error('Public agent mode is not enabled');
    }

    // Ensure thread exists in IndexedDB before saving message
    let thread = await getThread(threadId);
    
    // If not found, try to find by searching all threads (handles legacy "thread_..." format)
    // or by matching metadata IDs (for server thread ID updates)
    if (!thread) {
      const allThreads = await getAllThreads();
      thread = allThreads.find(t => {
        // Check if threadId matches stored threadId, or matches metadata IDs
        return t.threadId === threadId ||
          t.threadId.includes(threadId) ||
          (t.metadata?.serverThreadId?.toString() === threadId) ||
          (t.metadata?.localThreadId?.toString() === threadId);
      }) || null;
    }
    
    if (!thread) {
      // Thread doesn't exist, create it with the provided threadId
      // Extract title from metadata if available, otherwise use default
      const title = metadata?.query 
        ? (metadata.query.length > 50 ? metadata.query.substring(0, 50) + '...' : metadata.query)
        : 'New Chat';
      
      // Create thread with the provided threadId
      // Store numeric ID in metadata for reference
      const numericId = /^-?\d+$/.test(threadId) ? parseInt(threadId) : null;
      thread = await createThread(threadId, title, {
        serverThreadId: numericId && numericId > 0 ? numericId : null,
        localThreadId: numericId && numericId < 0 ? numericId : null,
      });
      // Update threads state
      setThreads((prev) => [thread!, ...prev]);
    }

    // Use the actual thread's threadId from IndexedDB
    const actualThreadId = thread.threadId;
    
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const message = await createMessage(messageId, actualThreadId, role, content, metadata);
    
    // Update thread's updatedAt timestamp
    await updateThread(actualThreadId, {});
    
    return message;
  }, [isPublicAgent]);

  const value: PublicAgentSessionContextType = {
    sessionId,
    metadata,
    threads,
    activeThreadId,
    isLoading,
    isInitialized,
    createNewThread,
    updateThreadTitle,
    deleteThreadById,
    setActiveThread,
    getThreadMessages,
    saveMessage,
    refreshMetadata,
    isPublicAgentMode: isPublicAgent,
  };

  return (
    <PublicAgentSessionContext.Provider value={value}>
      {children}
    </PublicAgentSessionContext.Provider>
  );
}

