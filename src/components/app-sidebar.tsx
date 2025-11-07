'use client';

/**
 * APP SIDEBAR COMPONENT - Main navigation and chat history sidebar
 * 
 * This component provides the main navigation interface for the chat application.
 * It manages chat thread history, user navigation, and new chat creation.
 * 
 * Key Features:
 * - Chat thread history organized by date (today, yesterday, last week, etc.)
 * - New chat thread creation with automatic navigation
 * - User profile and account management integration
 * - Responsive design with mobile support
 * - Real-time updates of chat threads
 * - Integration with authentication and user management
 * 
 * Architecture:
 * - Uses SWR-like pattern for data fetching and state management
 * - Integrates with external chat API for thread management
 * - Handles URL parameter management for chat navigation
 * - Implements date-based grouping for better UX
 */

import { isToday, isYesterday, subMonths, subWeeks } from 'date-fns';
import { PlusIcon } from '@/components/icons';
import { SidebarHistory } from '@/components/sidebar-history';
import { SidebarUserNav } from '@/components/sidebar-user-nav';
import Image from 'next/image';
import ejentoLogo from '../../public/ejentologo.png'
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  useSidebar,
} from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import React, { use, useEffect, useState } from 'react';
import { getUserFromStorage } from '@/cookie';
import { useApiService } from '@/hooks/useApiService';
import { ChatThreadResponse } from '@/model';
import { toast } from 'sonner';
import { isPublicAgentMode } from '@/lib/storage/indexeddb';
import { usePublicAgentSession } from '@/hooks/usePublicAgentSession';
import { handleSetQueryParams } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';
import { useWindowSize } from 'usehooks-ts';
import { useConfig } from '@/app/context/ConfigContext';

/**
 * Interface for grouping chat threads by date ranges
 * Used to organize chat history into logical time-based sections
 */
interface GroupedChats {
  /** Chat threads from today */
  today: ChatThreadResponse[];
  /** Chat threads from yesterday */
  yesterday: ChatThreadResponse[];
  /** Chat threads from the last week (excluding today and yesterday) */
  lastWeek: ChatThreadResponse[];
  /** Chat threads from the last month (excluding last week) */
  lastMonth: ChatThreadResponse[];
  /** Chat threads older than a month */
  older: ChatThreadResponse[];
}

/**
 * App Sidebar Component
 * 
 * Main sidebar component that provides navigation and chat history management.
 * Handles the complete sidebar experience including thread creation, organization,
 * and user account management.
 * 
 * Features:
 * - Automatic chat thread fetching and organization
 * - Date-based grouping of chat history
 * - New chat creation with proper navigation
 * - Mobile-responsive design
 * - Integration with user authentication
 * - Real-time updates and error handling
 */
export function AppSidebar() {
  // API service
  const apiService = useApiService();
  const { config } = useConfig();
  
  // PUBLIC_AGENT mode: Get session context
  const isPublicAgent = isPublicAgentMode();
  let publicAgentSession: ReturnType<typeof usePublicAgentSession> | null = null;
  try {
    if (isPublicAgent) {
      publicAgentSession = usePublicAgentSession();
    }
  } catch (error) {
    // Context not available, continue without it
  }

  const agentImageUrl = process.env.NEXT_PUBLIC_AGENT_IMAGE?.trim();

  // Determine which image to use: env variable image or fallback to ejentoLogo
  const isExternalImage = !!agentImageUrl;
  
  // Sidebar state management
  const { setOpenMobile } = useSidebar();
  const [threads, setThreads] = useState<ChatThreadResponse[]>([]); // All chat threads
  const [isLoading, setIsLoading] = useState(true); // Loading state for initial fetch
  const searchParams = useSearchParams();
  const id = searchParams.get('id'); // Current chat ID from URL
  const { width: windowWidth, height: windowHeight } = useWindowSize();
  const isMobile = windowWidth ? windowWidth < 768 : false;
  
  // Grouped chat threads organized by date
  const [groupedChats, setGroupedChats] = useState<GroupedChats>({
    today: [],
    yesterday: [],
    lastWeek: [],
    lastMonth: [],
    older: [],
  });

  const user_info = getUserFromStorage(); // Current user information
  // Get email from config first (set in ENV_DRIVEN mode), then fall back to user storage
  // Always provide a fallback to ensure created_by is never undefined
  const userEmail = config?.userInfo?.email || user_info?.email || user_info?.data?.email || 'user';

  /**
   * Updates the title of a chat thread
   * 
   * @param chatId - ID of the chat thread to update
   * @param newTitle - New title for the chat thread
   */
  const updateChatTitle = async (chatId: number, newTitle: string) => {
    if (!apiService) return;
    
    try {
      if (isPublicAgent && publicAgentSession) {
        await publicAgentSession.updateThreadTitle(chatId.toString(), newTitle);
        toast.success('Chat title updated successfully');
      }
      else {
        await apiService.updateChatThreadTitle(chatId, newTitle);
        toast.success('Chat title updated successfully');
      }
    } catch (error) {
      console.error('Error updating chat title:', error);
    }
  };

  /**
   * Updates a local thread with the real server thread ID and title
   * Called when the first message response contains the actual thread ID
   * 
   * @param localThreadId - The temporary local thread ID (negative number)
   * @param serverThreadId - The real thread ID from server
   * @param serverTitle - The thread title from server
   */
  const updateLocalThreadWithServerId = (localThreadId: number, serverThreadId: number, serverTitle: string) => {
    setThreads(prevThreads => {
      const updatedThreads = prevThreads.map(thread => {
        if (thread.id === localThreadId) {
          return {
            ...thread,
            id: serverThreadId,
            title: serverTitle,
          };
        }
        return thread;
      });
      groupChatsByDate(updatedThreads);
      return updatedThreads;
    });
  };

  // Expose functions globally so they can be called from other components
  React.useEffect(() => {
    (window as any).updateLocalThreadWithServerId = updateLocalThreadWithServerId;
    (window as any).addNewThreadFromHeader = addNewThread;
    return () => {
      delete (window as any).updateLocalThreadWithServerId;
      delete (window as any).addNewThreadFromHeader;
    };
  }, [threads]); // Include threads in dependency array so the function has access to current threads

  // PUBLIC_AGENT mode: Sync sidebar thread list with IndexedDB threads when they update
  useEffect(() => {
    if (isPublicAgent && publicAgentSession) {
      const storedThreads = publicAgentSession.threads;
      
      if (storedThreads.length > 0) {
        // Transform stored threads to ChatThreadResponse format
        // Use a Map to deduplicate by threadId to prevent duplicate keys
        const threadMap = new Map<number, ChatThreadResponse>();
        
        storedThreads.forEach((thread) => {
          const threadId = parseInt(thread.threadId) || -1;
          // Only keep the most recent thread if there are duplicates (shouldn't happen, but safety check)
          if (!threadMap.has(threadId) || thread.updatedAt > (threadMap.get(threadId)?.modified_on ? new Date(threadMap.get(threadId)!.modified_on).getTime() : 0)) {
            threadMap.set(threadId, {
              id: threadId,
              title: thread.title,
              created_on: new Date(thread.createdAt).toISOString(),
              modified_on: new Date(thread.updatedAt).toISOString(),
              agent: config?.agentId ? parseInt(config.agentId) : 0,
              created_by: userEmail,
              modified_by: userEmail,
              corpus_id: null,
              user: 0,
              is_deleted: false,
              chat_id: null,
            });
          }
        });
        
        const transformedThreads = Array.from(threadMap.values());
        
        // Update threads and group by date
        // Using setThreads with a function to compare and avoid unnecessary updates
        setThreads(prevThreads => {
          // Only update if threads have actually changed (to avoid unnecessary re-renders)
          const currentThreadIds = prevThreads.map(t => t.id.toString()).sort().join(',');
          const newThreadIds = transformedThreads.map(t => t.id.toString()).sort().join(',');
          const currentTitles = prevThreads.map(t => `${t.id}:${t.title}`).sort().join(',');
          const newTitles = transformedThreads.map(t => `${t.id}:${t.title}`).sort().join(',');
          
          if (currentThreadIds !== newThreadIds || currentTitles !== newTitles) {
            groupChatsByDate(transformedThreads);
            return transformedThreads;
          }
          return prevThreads;
        });
      }
    }
  }, [isPublicAgent, publicAgentSession?.threads, publicAgentSession, config?.agentId, userEmail]);

  


  /**
   * Checks if a thread is empty (newly created with no messages)
   * 
   * @param thread - The thread to check
   * @returns true if the thread is empty/new
   */
  const isThreadEmpty = (thread: ChatThreadResponse): boolean => {
    // Check if it's a thread with default title (could be local or recently created server thread)
    // Also check if it was created very recently (within last 5 minutes) to catch server threads that just got created
    const isRecentlyCreated = new Date().getTime() - new Date(thread.created_on).getTime() < 5 * 60 * 1000; // 5 minutes
    return (thread.title === 'New Chat' || thread.title === 'New Thread') && isRecentlyCreated;
  };

  /**
   * Creates a new chat thread locally or routes to existing empty thread
   * 
   * This function:
   * - In PUBLIC_AGENT mode: Creates thread in IndexedDB
   * - In normal mode: Creates a local chat thread without API call
   * - Checks if there's already an empty local thread
   * - If exists, routes to that thread instead of creating new one
   * - Generates a temporary local ID for new threads
   * - The actual thread ID will be received when the first message is sent
   */
  const addNewThread = async () => {
    // PUBLIC_AGENT mode: Create thread in IndexedDB
    if (isPublicAgent && publicAgentSession) {
      try {
        // Check if the latest thread is already empty/new
        if (threads.length > 0) {
          const latestThread = threads[0]; // Threads are sorted by creation date, latest first
          
          if (isThreadEmpty(latestThread)) {
            // Route to existing empty thread instead of creating new one
            handleSetQueryParams(latestThread.id.toString(), latestThread.title);
            localStorage.setItem('active_thread_id', latestThread.id.toString());
            toast.success('Switched to existing new chat');
            return;
          }
        }
        
        const newThread = await publicAgentSession.createNewThread('New Chat');
        const transformedThread: ChatThreadResponse = {
          id: parseInt(newThread.threadId) || -1,
          title: newThread.title,
          created_on: new Date(newThread.createdAt).toISOString(),
          modified_on: new Date(newThread.updatedAt).toISOString(),
          agent: config?.agentId ? parseInt(config.agentId) : 0,
          created_by: userEmail,
          modified_by: userEmail,
          corpus_id: null,
          user: 0,
          is_deleted: false,
          chat_id: null,
        };
        
        setThreads((prev) => [transformedThread, ...prev]);
        groupChatsByDate([transformedThread, ...threads]);
        
        // Navigate to new thread
        handleSetQueryParams(transformedThread.id.toString(), transformedThread.title);
        localStorage.setItem('active_thread_id', transformedThread.id.toString());
        return;
      } catch (error) {
        console.error('Error creating thread in IndexedDB:', error);
        toast.error('Failed to create new chat');
        return;
      }
    }
    
    // Normal mode: Use existing logic
    try {
      // Check if the latest thread is already empty/new
      if (threads.length > 0) {
        const latestThread = threads[0]; // Threads are sorted by creation date, latest first
        
        if (isThreadEmpty(latestThread)) {
          // Route to existing empty thread instead of creating new one
          handleSetQueryParams(latestThread.id.toString(), latestThread.title);
          localStorage.setItem('active_thread_id', latestThread.id.toString());
          toast.success('Switched to existing new chat');
          return;
        }
      }

      // No empty thread found, create a new one
      // Generate a temporary local thread ID (negative to distinguish from server IDs)
      const tempThreadId = -Date.now();
      const newThread: ChatThreadResponse = {
        id: tempThreadId,
        title: 'New Chat',
        created_on: new Date().toISOString(),
        created_by: userEmail,
        agent: parseInt(config?.agentId || '0'),
        corpus_id: null,
        user: 0, // Will be updated when we get the real thread from server
        modified_by: userEmail,
        modified_on: new Date().toISOString(),
        is_deleted: false,
        chat_id: null,
      };

      // Add the new thread to the beginning of the threads array
      const updatedThreads = [newThread, ...threads];
      setThreads(updatedThreads);
      groupChatsByDate(updatedThreads);
      
      // Navigate to the new chat thread
      handleSetQueryParams(tempThreadId.toString(), 'New Chat');
      localStorage.setItem('active_thread_id', tempThreadId.toString());
      
      toast.success('New chat created');
    } catch (e) {
      console.error('Error creating new thread:', e);
      toast.error('Failed to create new chat');
    }
  }

  /**
   * Fetches all chat threads for the current user
   * 
   * This function:
   * - In PUBLIC_AGENT mode: Retrieves threads from IndexedDB
   * - In normal mode: Retrieves chat threads from the API
   * - Groups them by date for better organization
   * - Handles navigation to the most recent thread if no ID is present
   * - Creates a new local thread if no threads exist
   * - Manages loading states and error handling
   */
  const fetchThreads = async () => {
    // PUBLIC_AGENT mode: Load threads from IndexedDB
    if (isPublicAgent && publicAgentSession) {
      try {
        const storedThreads = publicAgentSession.threads;
        
        if (storedThreads.length > 0) {
          // Transform stored threads to ChatThreadResponse format
          const transformedThreads: ChatThreadResponse[] = storedThreads.map((thread) => ({
            id: parseInt(thread.threadId) || -1,
            title: thread.title,
            created_on: new Date(thread.createdAt).toISOString(),
            modified_on: new Date(thread.updatedAt).toISOString(),
            agent: config?.agentId ? parseInt(config.agentId) : 0,
            created_by: userEmail,
            modified_by: userEmail,
            corpus_id: null,
            user: 0,
            is_deleted: false,
            chat_id: null,
          }));
          
          setThreads(transformedThreads);
          groupChatsByDate(transformedThreads);
          
          // Navigate to most recent thread if no specific ID in URL
          if (!id) {
            const mostRecentThread = transformedThreads[0];
            handleSetQueryParams(mostRecentThread?.id.toString(), mostRecentThread?.title);
            localStorage.setItem('active_thread_id', mostRecentThread?.id.toString());
          }
        } else {
          // Create first local thread if none exist
          addNewThread();
        }
      } catch (error) {
        console.error('Error fetching threads from IndexedDB:', error);
        // If IndexedDB fails, still create a local thread for user to start chatting
        addNewThread();
      } finally {
        setIsLoading(false);
      }
      return;
    }
    
    // Normal mode: Use existing API-based logic
    if (!apiService) return;
    
    try {
      const response = await apiService.getChatThreads();
      const threads = response?.data?.chat_threads || [];
      
      if (threads?.length > 0) {
        setThreads(threads);
        groupChatsByDate(threads);
        
        // Navigate to most recent thread if no specific ID in URL
        if (!id) {
          const mostRecentThread = threads[0];
          handleSetQueryParams(mostRecentThread?.id.toString(), mostRecentThread?.title);
          localStorage.setItem('active_thread_id', mostRecentThread?.id.toString());
        }
      } else {
        // Create first local thread if none exist
        addNewThread();
      }
    } catch (error) {
      console.error('Error fetching threads:', error);
      // If API fails, still create a local thread for user to start chatting
      addNewThread();
    } finally {
      setIsLoading(false)
    }
  };

  /**
   * Groups chat threads by date ranges for better organization
   * 
   * Organizes chat threads into time-based categories:
   * - Today: threads created today
   * - Yesterday: threads from yesterday
   * - Last Week: threads from the past week (excluding today/yesterday)
   * - Last Month: threads from the past month (excluding last week)
   * - Older: threads older than a month
   * 
   * @param chats - Array of chat threads to group
   */
  const groupChatsByDate = (chats: ChatThreadResponse[]) => {
    const now = new Date();
    const oneWeekAgo = subWeeks(now, 1);
    const oneMonthAgo = subMonths(now, 1);

    const groups = chats.reduce<GroupedChats>(
      (acc, chat) => {
        // Handle both created_on (API format) and created_at (IndexedDB format)
        const chatDate = new Date(chat.created_on || (chat as any).created_at);

        if (isToday(chatDate)) {
          acc.today.push(chat);
        } else if (isYesterday(chatDate)) {
          acc.yesterday.push(chat);
        } else if (chatDate > oneWeekAgo) {
          acc.lastWeek.push(chat);
        } else if (chatDate > oneMonthAgo) {
          acc.lastMonth.push(chat);
        } else {
          acc.older.push(chat);
        }

        return acc;
      },
      {
        today: [],
        yesterday: [],
        lastWeek: [],
        lastMonth: [],
        older: [],
      },
    );

    setGroupedChats(groups);
  };

  // Don't render if no config is available (check AFTER all hooks)
  if (!apiService) {
    return null;
  }

  return (
    <Sidebar className="group-data-[side=left]:border-r-0">
      <SidebarHeader>
        <SidebarMenu>
          <div className="flex flex-row justify-between items-center">
            {isExternalImage ? (
              <img
                src={agentImageUrl}
                alt="Agent Image"
                height={100}
                width={100}
                className="ms-2 mt-2 m-auto text-center"
              />
            ) : (
              <Image
                src={ejentoLogo}
                alt="Ejento Logo"
                height={100}
                width={100}
                className="ms-2 mt-2 m-auto text-center"
                priority
              />
            )}
            {
              isMobile ? <Button
                variant="ghost"
                type="button"
                className="p-2 h-fit"
                onClick={() => {
                  setOpenMobile(false);
                  addNewThread()
                }}
              >
                <PlusIcon />
              </Button> :
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      type="button"
                      className="p-2 h-fit"
                      onClick={() => {
                        setOpenMobile(false);
                        addNewThread()
                      }}
                    >
                      <PlusIcon />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent align="end">New Chat</TooltipContent>
                </Tooltip>
            }
          </div>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarHistory isLoading={isLoading} threads={threads} groupedChats={groupedChats} fetchThreads={fetchThreads} setThreads={setThreads} groupChatsByDate={groupChatsByDate} updateChatTitle={updateChatTitle} />
      </SidebarContent>
      <SidebarFooter>
        { (isPublicAgent && publicAgentSession) ? null : (
         <SidebarUserNav  />
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
