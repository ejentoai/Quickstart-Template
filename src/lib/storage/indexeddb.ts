/**
 * IndexedDB Storage Layer for PUBLIC_AGENT Mode
 * 
 * Provides browser-only storage for chat sessions, threads, and messages.
 * All data is stored locally in IndexedDB and is isolated per browser session.
 */

import {
  SessionMetadata,
  StoredMessage,
  StoredThread,
} from './types';

const DB_NAME = 'ejento_public_agent_db';
const DB_VERSION = 1;

const STORES = {
  SESSIONS: 'sessions',
  THREADS: 'threads',
  MESSAGES: 'messages',
} as const;

/**
 * Opens the IndexedDB database, creating it if it doesn't exist
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not available in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error(`Failed to open database: ${request.error?.message}`));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create sessions store
      if (!db.objectStoreNames.contains(STORES.SESSIONS)) {
        const sessionsStore = db.createObjectStore(STORES.SESSIONS, {
          keyPath: 'sessionId',
        });
        sessionsStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // Create threads store
      if (!db.objectStoreNames.contains(STORES.THREADS)) {
        const threadsStore = db.createObjectStore(STORES.THREADS, {
          keyPath: 'threadId',
        });
        threadsStore.createIndex('createdAt', 'createdAt', { unique: false });
        threadsStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      // Create messages store
      if (!db.objectStoreNames.contains(STORES.MESSAGES)) {
        const messagesStore = db.createObjectStore(STORES.MESSAGES, {
          keyPath: 'messageId',
        });
        messagesStore.createIndex('threadId', 'threadId', { unique: false });
        messagesStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

/**
 * Generates a unique session ID for the current browser session
 */
function generateSessionId(): string {
  // Try to get existing session ID from sessionStorage
  if (typeof window !== 'undefined' && window.sessionStorage) {
    const existing = sessionStorage.getItem('ejento_session_id');
    if (existing) {
      return existing;
    }
    
    // Generate new session ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('ejento_session_id', sessionId);
    return sessionId;
  }
  
  // Fallback if sessionStorage is not available
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Session Metadata Operations
 */
export async function getSessionMetadata(): Promise<SessionMetadata | null> {
  try {
    const db = await openDatabase();
    const sessionId = generateSessionId();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.SESSIONS], 'readonly');
      const store = transaction.objectStore(STORES.SESSIONS);
      const request = store.get(sessionId);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(new Error(`Failed to get session metadata: ${request.error?.message}`));
      };
    });
  } catch (error) {
    console.error('Error getting session metadata:', error);
    return null;
  }
}

export async function createOrUpdateSessionMetadata(
  metadata: Partial<SessionMetadata>
): Promise<SessionMetadata> {
  try {
    const db = await openDatabase();
    const sessionId = generateSessionId();
    
    // Get existing metadata or create new
    const existing = await getSessionMetadata();
    const now = Date.now();
    
    const sessionData: SessionMetadata = {
      sessionId,
      createdAt: existing?.createdAt || now,
      lastSyncedAt: metadata.lastSyncedAt !== undefined ? metadata.lastSyncedAt : existing?.lastSyncedAt || null,
      threadCount: metadata.threadCount !== undefined ? metadata.threadCount : (existing?.threadCount || 0),
      lastTokenRefresh: metadata.lastTokenRefresh !== undefined ? metadata.lastTokenRefresh : existing?.lastTokenRefresh || null,
      ...metadata,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.SESSIONS], 'readwrite');
      const store = transaction.objectStore(STORES.SESSIONS);
      const request = store.put(sessionData);

      request.onsuccess = () => {
        resolve(sessionData);
      };

      request.onerror = () => {
        reject(new Error(`Failed to save session metadata: ${request.error?.message}`));
      };
    });
  } catch (error) {
    console.error('Error saving session metadata:', error);
    throw error;
  }
}

/**
 * Thread Operations
 */
export async function createThread(
  threadId: string,
  title: string,
  metadata?: StoredThread['metadata']
): Promise<StoredThread> {
  try {
    const db = await openDatabase();
    const now = Date.now();
    
    const thread: StoredThread = {
      threadId,
      title,
      createdAt: now,
      updatedAt: now,
      messageIds: [],
      metadata: metadata || {},
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.THREADS], 'readwrite');
      const store = transaction.objectStore(STORES.THREADS);
      const request = store.put(thread);

      request.onsuccess = () => {
        // Update thread count in session metadata
        getSessionMetadata().then((session) => {
          if (session) {
            createOrUpdateSessionMetadata({
              threadCount: session.threadCount + 1,
            });
          }
        });
        resolve(thread);
      };

      request.onerror = () => {
        reject(new Error(`Failed to create thread: ${request.error?.message}`));
      };
    });
  } catch (error) {
    console.error('Error creating thread:', error);
    throw error;
  }
}

export async function getThread(threadId: string): Promise<StoredThread | null> {
  try {
    const db = await openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.THREADS], 'readonly');
      const store = transaction.objectStore(STORES.THREADS);
      const request = store.get(threadId);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(new Error(`Failed to get thread: ${request.error?.message}`));
      };
    });
  } catch (error) {
    console.error('Error getting thread:', error);
    return null;
  }
}

export async function updateThread(
  threadId: string,
  updates: Partial<Pick<StoredThread, 'title' | 'messageIds' | 'metadata'>>
): Promise<StoredThread> {
  try {
    const existing = await getThread(threadId);
    if (!existing) {
      throw new Error(`Thread ${threadId} not found`);
    }

    const updated: StoredThread = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    };

    const db = await openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.THREADS], 'readwrite');
      const store = transaction.objectStore(STORES.THREADS);
      const request = store.put(updated);

      request.onsuccess = () => {
        resolve(updated);
      };

      request.onerror = () => {
        reject(new Error(`Failed to update thread: ${request.error?.message}`));
      };
    });
  } catch (error) {
    console.error('Error updating thread:', error);
    throw error;
  }
}

export async function deleteThread(threadId: string): Promise<void> {
  try {
    const db = await openDatabase();
    
    // First, delete all messages in this thread
    const messages = await getMessagesByThreadId(threadId);
    for (const message of messages) {
      await deleteMessage(message.messageId);
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.THREADS], 'readwrite');
      const store = transaction.objectStore(STORES.THREADS);
      const request = store.delete(threadId);

      request.onsuccess = () => {
        // Wait for transaction to complete before resolving
        // This ensures the deletion is committed to IndexedDB
      };

      request.onerror = () => {
        reject(new Error(`Failed to delete thread: ${request.error?.message}`));
      };

      transaction.oncomplete = () => {
        // Update thread count in session metadata after transaction completes
        getSessionMetadata().then((session) => {
          if (session && session.threadCount > 0) {
            createOrUpdateSessionMetadata({
              threadCount: session.threadCount - 1,
            });
          }
        });
        resolve();
      };

      transaction.onerror = () => {
        reject(new Error(`Transaction failed: ${transaction.error?.message}`));
      };
    });
  } catch (error) {
    console.error('Error deleting thread:', error);
    throw error;
  }
}

/**
 * Migrates a thread from one threadId to another
 * This is used when a local thread (negative ID) receives its server threadId
 * 
 * @param oldThreadId - The current threadId (usually negative)
 * @param newThreadId - The new threadId (from server, positive)
 * @param title - Optional title for the new thread
 * @returns The newly created thread with the server threadId
 */
export async function migrateThread(
  oldThreadId: string,
  newThreadId: string,
  title?: string
): Promise<StoredThread> {
  try {
    // Get the old thread
    const oldThread = await getThread(oldThreadId);
    if (!oldThread) {
      throw new Error(`Thread ${oldThreadId} not found`);
    }

    // Get all messages for the old thread
    const messages = await getMessagesByThreadId(oldThreadId);

    // Create new thread with server threadId
    const threadTitle = title || oldThread.title;
    const newThread = await createThread(newThreadId, threadTitle, {
      serverThreadId: parseInt(newThreadId) > 0 ? parseInt(newThreadId) : null,
      localThreadId: parseInt(oldThreadId) < 0 ? parseInt(oldThreadId) : null,
      ...oldThread.metadata,
    });

    // Update all messages to use the new threadId
    const db = await openDatabase();
    const updatedMessageIds: string[] = [];
    
    for (const message of messages) {
      // Update message's threadId directly in the database
      const updatedMessage: StoredMessage = {
        ...message,
        threadId: newThreadId,
      };
      
      const transaction = db.transaction([STORES.MESSAGES], 'readwrite');
      const store = transaction.objectStore(STORES.MESSAGES);
      await new Promise<void>((resolve, reject) => {
        const request = store.put(updatedMessage);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error(`Failed to update message: ${request.error?.message}`));
      });
      
      updatedMessageIds.push(message.messageId);
    }

    // Update thread with correct messageIds
    await updateThread(newThreadId, {
      messageIds: updatedMessageIds,
    });

    // Delete the old thread (without deleting messages, as we've already migrated them)
    const dbForDelete = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = dbForDelete.transaction([STORES.THREADS], 'readwrite');
      const store = transaction.objectStore(STORES.THREADS);
      const request = store.delete(oldThreadId);

      request.onsuccess = async () => {
        // Adjust thread count: we created a new thread (incremented count) and deleted the old one
        // So we need to decrement to keep the count correct (since we're replacing, not adding)
        const session = await getSessionMetadata();
        if (session && session.threadCount > 0) {
          await createOrUpdateSessionMetadata({
            threadCount: session.threadCount - 1,
          });
        }
        resolve(newThread);
      };

      request.onerror = () => {
        reject(new Error(`Failed to delete old thread: ${request.error?.message}`));
      };
    });
  } catch (error) {
    console.error('Error migrating thread:', error);
    throw error;
  }
}

export async function getAllThreads(): Promise<StoredThread[]> {
  try {
    const db = await openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.THREADS], 'readonly');
      const store = transaction.objectStore(STORES.THREADS);
      const index = store.index('updatedAt');
      const request = index.getAll();

      request.onsuccess = () => {
        const threads = request.result || [];
        // Sort by updatedAt descending (most recent first)
        threads.sort((a, b) => b.updatedAt - a.updatedAt);
        resolve(threads);
      };

      request.onerror = () => {
        reject(new Error(`Failed to get all threads: ${request.error?.message}`));
      };
    });
  } catch (error) {
    console.error('Error getting all threads:', error);
    return [];
  }
}

/**
 * Message Operations
 */
export async function createMessage(
  messageId: string,
  threadId: string,
  role: 'user' | 'assistant',
  content: string,
  metadata?: StoredMessage['metadata']
): Promise<StoredMessage> {
  try {
    const db = await openDatabase();
    const now = Date.now();
    
    const message: StoredMessage = {
      messageId,
      threadId,
      role,
      content,
      createdAt: now,
      metadata: metadata || {},
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.MESSAGES], 'readwrite');
      const store = transaction.objectStore(STORES.MESSAGES);
      const request = store.put(message);

      request.onsuccess = async () => {
        // Add message ID to thread's messageIds array
        const thread = await getThread(threadId);
        if (thread) {
          await updateThread(threadId, {
            messageIds: [...thread.messageIds, messageId],
          });
        }
        resolve(message);
      };

      request.onerror = () => {
        reject(new Error(`Failed to create message: ${request.error?.message}`));
      };
    });
  } catch (error) {
    console.error('Error creating message:', error);
    throw error;
  }
}

export async function getMessage(messageId: string): Promise<StoredMessage | null> {
  try {
    const db = await openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.MESSAGES], 'readonly');
      const store = transaction.objectStore(STORES.MESSAGES);
      const request = store.get(messageId);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(new Error(`Failed to get message: ${request.error?.message}`));
      };
    });
  } catch (error) {
    console.error('Error getting message:', error);
    return null;
  }
}

export async function getMessagesByThreadId(threadId: string): Promise<StoredMessage[]> {
  try {
    const db = await openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.MESSAGES], 'readonly');
      const store = transaction.objectStore(STORES.MESSAGES);
      const index = store.index('threadId');
      const request = index.getAll(threadId);

      request.onsuccess = () => {
        const messages = request.result || [];
        // Sort by createdAt ascending (oldest first)
        messages.sort((a, b) => a.createdAt - b.createdAt);
        resolve(messages);
      };

      request.onerror = () => {
        reject(new Error(`Failed to get messages: ${request.error?.message}`));
      };
    });
  } catch (error) {
    console.error('Error getting messages by thread ID:', error);
    return [];
  }
}

export async function updateMessage(
  messageId: string,
  updates: Partial<Pick<StoredMessage, 'content' | 'metadata'>>
): Promise<StoredMessage> {
  try {
    const existing = await getMessage(messageId);
    if (!existing) {
      throw new Error(`Message ${messageId} not found`);
    }

    const updated: StoredMessage = {
      ...existing,
      ...updates,
    };

    const db = await openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.MESSAGES], 'readwrite');
      const store = transaction.objectStore(STORES.MESSAGES);
      const request = store.put(updated);

      request.onsuccess = () => {
        resolve(updated);
      };

      request.onerror = () => {
        reject(new Error(`Failed to update message: ${request.error?.message}`));
      };
    });
  } catch (error) {
    console.error('Error updating message:', error);
    throw error;
  }
}

export async function deleteMessage(messageId: string): Promise<void> {
  try {
    const db = await openDatabase();
    
    // Get message to find thread ID
    const message = await getMessage(messageId);
    if (!message) {
      return; // Message doesn't exist, nothing to delete
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.MESSAGES], 'readwrite');
      const store = transaction.objectStore(STORES.MESSAGES);
      const request = store.delete(messageId);

      request.onerror = () => {
        reject(new Error(`Failed to delete message: ${request.error?.message}`));
      };

      transaction.oncomplete = async () => {
        // Wait for transaction to complete before updating thread
        // This ensures the message deletion is committed to IndexedDB
        try {
          // Remove message ID from thread's messageIds array
          const thread = await getThread(message.threadId);
          if (thread) {
            await updateThread(message.threadId, {
              messageIds: thread.messageIds.filter((id) => id !== messageId),
            });
          }
          resolve();
        } catch (error) {
          // If updating thread fails, still resolve since message is deleted
          console.error('Error updating thread after message deletion:', error);
          resolve();
        }
      };

      transaction.onerror = () => {
        reject(new Error(`Transaction failed: ${transaction.error?.message}`));
      };
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    throw error;
  }
}

/**
 * Utility: Check if PUBLIC_AGENT mode is enabled
 * 
 * Checks for NEXT_PUBLIC_AGENT environment variable (required for client-side access)
 * In Next.js, only variables prefixed with NEXT_PUBLIC_ are exposed to the browser
 */
export function isPublicAgentMode(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  // Check environment variable - must be NEXT_PUBLIC_AGENT for client-side access
  const publicAgent = process.env.NEXT_PUBLIC_AGENT;
  const result = publicAgent === 'true' || publicAgent === '1';
  
  // Debug logging (remove in production if desired)
//   if (process.env.NODE_ENV === 'development') {
//     console.log('[PUBLIC_AGENT Mode]', {
//       NEXT_PUBLIC_AGENT: publicAgent,
//       isEnabled: result,
//       note: 'Set NEXT_PUBLIC_AGENT=true in .env.local for client-side access'
//     });
//   }
  
  return result;
}

