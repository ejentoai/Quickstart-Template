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
import { toast } from 'sonner';

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
    threadId: number,
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
    console.error('usePublicAgentSession must be used within PublicAgentSessionProvider');
    return null
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
        const res = await fetch('/api/session', {
          method: 'POST'
        });
        
        if (!res.ok) {
          console.error('Error in creating session');
        }
        
        // Load all threads with better error handling
        try {
          const allThreadsRes = await fetch('/api/thread');
          
          if (allThreadsRes.ok) {
            const text = await allThreadsRes.text();
            // Only parse if there's content
            const allThreads = text ? JSON.parse(text) : [];
            setThreads(Array.isArray(allThreads) ? allThreads : []);
          } else {
            console.error('Failed to fetch threads:', allThreadsRes.status);
            setThreads([]);
          }
        } catch (threadError) {
          console.error('Error fetching threads:', threadError);
          setThreads([]);
        }
    
        // Set active thread to most recent if available
        if (threads.length > 0 && !activeThreadId) {
          setActiveThreadIdState(threads[0].id);
        }
      } catch (error) {
        console.error('Error initializing public agent session:', error);
        setThreads([]); // Ensure threads is at least an empty array
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
    try{
      const res = await fetch('/api/thread',{
        method : 'POST',
        headers : { 'content-type' : 'application/json'},
        body : JSON.stringify( {title} )
      })

      if(!res.ok){
        throw new Error('Filed to create thread')
      }

      const thread = await res.json()

      setThreads((prev) => [thread, ...prev]);
      setActiveThreadIdState(thread.id);
      
      // Refresh metadata to update thread count
      await refreshMetadata();

      return thread
    
    }
    catch(error){
      console.error('Error creating thread')
      throw error
    }

  }, [isPublicAgent, refreshMetadata]);

  // Update thread title
  // This is called when:
  // 1. First response arrives: response API returns thread_id and chat_thread_name, we update IndexedDB with server ID
  // 2. User manually edits title: we call updateChatThreadTitle API to update on server
  const updateThreadTitle = useCallback(async (threadId: string, title: string, serverThreadId?: number) => {
    if (!isPublicAgent) return;
    try{
      const res = await fetch(
        `/api/thread/${threadId}`,{
          method : 'PATCH',
          headers : { 'content-type' : 'application/json'},
          body : JSON.stringify({title})
        }
      )
      if(!res.ok){
        throw new Error('Failed to update thread')
      }
      const updatedThread = await res.json()
      setThreads(prev => prev.map(t => t.id === threadId ? updatedThread : t));
    } catch (error) {
      console.error('Error updating thread title:', error);
      throw new Error('Failed to update thread')
    }
  }, [isPublicAgent]);

  // Delete thread
  const deleteThreadById = useCallback(async (threadId: string) => {
    if (!isPublicAgent) return;
  
    try {
      const res = await fetch(`/api/thread/${threadId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete thread');
  
      setThreads(prev => prev.filter(t => t.id !== threadId));
      if (activeThreadId === threadId) {
        setActiveThreadIdState(threads.length > 1 ? threads[0].id : null);
      }
    } catch (error) {
      console.error('Error deleting thread:', error);
      throw new Error('Failed to delete thread');
    }
  }, [isPublicAgent, activeThreadId, threads]);
  

  // Set active thread
  const setActiveThread = useCallback((threadId: string | null) => {
    setActiveThreadIdState(threadId);
  }, []);

  // Get thread messages
  const getThreadMessages = useCallback(
    async (threadId: number): Promise<any[]> => {
      if (!isPublicAgent) {
        return [];
      }
  
      try {
        const res = await fetch(`/api/thread/${threadId}/message`);
  
        if (!res.ok) {
          throw new Error('Failed to fetch thread messages');
        }
  
        const messages = await res.json();
  
        return messages;
      } catch (error) {
        console.error('Error getting thread messages:', error);
        return [];
      }
    },
    [isPublicAgent]
  );
  

  // Save message
  const saveMessage = useCallback(
    async (
      threadId: number | null,
      role: 'user' | 'assistant',
      content: string,
      metadata?: StoredMessage['metadata']
    ): Promise<any> => {
      if (!isPublicAgent) {
        throw new Error('Public agent mode is not enabled');
      }
  
      let currentThreadId = threadId;
  
      // 1️⃣ Create thread if it doesn't exist
      if (!currentThreadId) {
        const title =
          metadata?.query
            ? metadata.query.length > 50
              ? metadata.query.substring(0, 50) + '...'
              : metadata.query
            : 'New Chat';
  
        const threadRes = await fetch('/api/thread', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            ownerType: 'session', // or 'user'
            metaData: metadata ?? {},
          }),
        });
  
        if (!threadRes.ok) {
          throw new Error('Failed to create thread');
        }
  
        const thread = await threadRes.json();
        currentThreadId = thread.id;
  
        setThreads((prev) => [thread, ...prev]);
      }
  
      // 2️⃣ Create message (threadId passed in body)
      const messageRes = await fetch('/api/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: currentThreadId,
          role,
          content,
          metadata,
        }),
      });
  
      if (!messageRes.ok) {
        throw new Error('Failed to create message');
      }
  
      const message = await messageRes.json();
  
      return message;
    },
    [isPublicAgent]
  );
  

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

