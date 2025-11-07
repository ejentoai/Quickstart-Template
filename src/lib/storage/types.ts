/**
 * Type definitions for IndexedDB storage in PUBLIC_AGENT mode
 * These types define the structure of data stored locally in the browser
 */

export interface SessionMetadata {
  sessionId: string;
  createdAt: number; // Unix timestamp
  lastSyncedAt: number | null; // Unix timestamp, null if never synced
  threadCount: number;
  lastTokenRefresh: number | null; // Unix timestamp, null if never refreshed
}

export interface StoredMessage {
  messageId: string;
  threadId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number; // Unix timestamp
  metadata?: {
    query?: string;
    id?: string | number;
    // Vote fields use snake_case for consistency across storage and UI
    is_upvote?: boolean;
    is_downvote?: boolean;
    followUpQuestions?: string[];
    references?: any[];
    reflectionEvents?: any[];
    reflectionContents?: any[];
    guardrail_triggered?: boolean;
    blocked?: boolean;
    [key: string]: any; // Allow additional metadata
  };
}

export interface StoredThread {
  threadId: string;
  title: string;
  createdAt: number; // Unix timestamp
  updatedAt: number; // Unix timestamp
  messageIds: string[]; // Array of message IDs in order
  metadata?: {
    // Server thread ID (if created on server)
    serverThreadId?: number | null;
    // Local thread ID (negative number before server creation)
    localThreadId?: number | null;
    [key: string]: any;
  };
}

export interface DatabaseSchema {
  sessions: SessionMetadata;
  threads: StoredThread;
  messages: StoredMessage;
}

