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
import { getUserFromCookie } from '@/cookie';
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
  today: ChatThreadResponse[];
  yesterday: ChatThreadResponse[];
  lastWeek: ChatThreadResponse[];
  lastMonth: ChatThreadResponse[];
  older: ChatThreadResponse[];
}

/**
 * App Sidebar Component
 *
 * Main sidebar component that provides navigation and chat history management.
 */
export function AppSidebar() {
  const apiService = useApiService();
  const { config } = useConfig();
  const publicAgentSession = usePublicAgentSession();
  const isPublicAgent = isPublicAgentMode();
  const isAuthFlowEnabled = process.env.NEXT_PUBLIC_AUTH_FLOW === 'true'
  const hasInitializedRef = React.useRef(false);
  const initializationInProgressRef = React.useRef(false);
  const agentImageUrl = process.env.NEXT_PUBLIC_AGENT_IMAGE?.trim();
  const isExternalImage = !!agentImageUrl;

  const { setOpenMobile } = useSidebar();
  const [threads, setThreads] = useState<ChatThreadResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  
  const { width: windowWidth } = useWindowSize();
  const isMobile = windowWidth ? windowWidth < 768 : false;

  const [groupedChats, setGroupedChats] = useState<GroupedChats>({
    today: [],
    yesterday: [],
    lastWeek: [],
    lastMonth: [],
    older: [],
  });

  const user_info = getUserFromCookie();
  const userEmail =
    config?.userInfo?.email ||
    user_info?.email ||
    user_info?.data?.email ||
    'user';

  const updateChatTitle = async (chatId: number, newTitle: string) => {
    if (!apiService) return;

    try {
      if (isPublicAgent) {
        await fetch(`/api/thread/${chatId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: newTitle }),
        });
      } else {
        await apiService.updateChatThreadTitle(chatId, newTitle);
        toast.success('Chat title updated successfully');
      }
    } catch (error) {
      console.error('Error updating chat title:', error);
    }
  };

  React.useEffect(() => {
    (window as any).addNewThreadFromHeader = addNewThread;

    return () => {
      delete (window as any).updateLocalThreadWithServerId;
      delete (window as any).addNewThreadFromHeader;
    };
  }, [threads]);

  const isThreadEmpty = (thread: ChatThreadResponse): boolean => {
    const isRecentlyCreated =
      new Date().getTime() - new Date(thread.created_on).getTime() <
      5 * 60 * 1000;

    return (
      (thread.title === 'New Chat' || thread.title === 'New Thread') &&
      isRecentlyCreated
    );
  };

  const addNewThread = async () => {
    if (isPublicAgent) {
      try {
        const res = await fetch("/api/thread", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "New Chat" }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error('API Error Response:', errorText);
          toast.error('Failed to create new thread');
          return;
        }

        const newThread = await res.json();

        if (!newThread || !newThread.id) {
          console.error('Invalid thread data received:', newThread);
          toast.error('Invalid response from server');
          return;
        }

        setThreads(prev => {
          const updated = [newThread, ...prev];
          groupChatsByDate(updated);
          return updated;
        });

        const threadId = String(newThread.id);

        localStorage.removeItem('corpus_connection')

        handleSetQueryParams(
          threadId,
          newThread.title || 'New Chat'
        );

        localStorage.setItem(
          'active_thread_id',
          threadId
        );
        
        toast.success('New chat created');

      } catch (error) {
        console.error("Error creating public thread:", error);
        toast.error('Failed to create new chat');
      }

      return;
    }

    try {
      if (threads.length > 0) {
        const latestThread = threads[0];
        if (isThreadEmpty(latestThread)) {
          handleSetQueryParams(
            latestThread.id.toString(),
            latestThread.title
          );

          localStorage.setItem(
            'active_thread_id',
            latestThread.id.toString()
          );

          toast.success('Switched to existing new chat');
          return;
        }
      }

      const tempThreadId = -Date.now();

      const newThread: ChatThreadResponse = {
        id: tempThreadId,
        title: 'New Chat',
        created_on: new Date().toISOString(),
        created_by: userEmail,
        agent: parseInt(config?.agentId || '0'),
        corpus_id: null,
        user: 0,
        modified_by: userEmail,
        modified_on: new Date().toISOString(),
        is_deleted: false,
        chat_id: null,
      };

      const updatedThreads = [newThread, ...threads];
      setThreads(updatedThreads);
      groupChatsByDate(updatedThreads);

      handleSetQueryParams(
        tempThreadId.toString(),
        'New Chat'
      );

      localStorage.setItem(
        'active_thread_id',
        tempThreadId.toString()
      );

      toast.success('New chat created');

    } catch (e) {
      console.error('Error creating new thread:', e);
      toast.error('Failed to create new chat');
    }
  };

  const fetchThreads = async () => {
    if (initializationInProgressRef.current) {
      return;
    }

    try {
      initializationInProgressRef.current = true;

      if (isPublicAgent) {
        try {
          const res = await fetch("/api/thread");
          const fetchedThreads = await res.json();

          setThreads(fetchedThreads);
          groupChatsByDate(fetchedThreads);

          const threadCreated = sessionStorage.getItem('public_thread_created');

          if (!id && fetchedThreads.length === 0 && !threadCreated) {
            sessionStorage.setItem('public_thread_created', 'true');
            await addNewThread();
          }

          if (!id && fetchedThreads.length > 0) {
            const mostRecent = fetchedThreads[0];
            handleSetQueryParams(
              mostRecent.id.toString(),
              mostRecent.title
            );
          }

        } catch (error) {
          console.error("Error fetching public threads:", error);
        } finally {
          setIsLoading(false);
        }

        return;
      }

      if (!apiService) return;

      try {
        const response = await apiService.getChatThreads();
        const threads = response?.data?.chat_threads || [];

        if (threads?.length > 0) {
          setThreads(threads);
          groupChatsByDate(threads);

          if (!id) {
            const mostRecentThread = threads[0];
            handleSetQueryParams(
              mostRecentThread?.id.toString(),
              mostRecentThread?.title
            );

            localStorage.setItem(
              'active_thread_id',
              mostRecentThread?.id.toString()
            );
          }

        } else {
          const threadCreated = sessionStorage.getItem('normal_thread_created');

          if (!threadCreated) {
            sessionStorage.setItem('normal_thread_created', 'true');
            await addNewThread();
          }
        }

      } catch (error) {
        console.error('Error fetching threads:', error);

        const threadCreated = sessionStorage.getItem('normal_thread_created');

        if (!threadCreated) {
          sessionStorage.setItem('normal_thread_created', 'true');
          await addNewThread();
        }

      } finally {
        setIsLoading(false);
      }

    } finally {
      initializationInProgressRef.current = false;
    }
  };

  useEffect(() => {
    const handleBeforeUnload = () => {
      sessionStorage.removeItem('public_thread_created');
      sessionStorage.removeItem('normal_thread_created');
      sessionStorage.removeItem('threads_initialized');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    if (hasInitializedRef.current) {
      return;
    }

    const sessionInitialized = sessionStorage.getItem('threads_initialized');

    if (sessionInitialized) {
      hasInitializedRef.current = true;
      return;
    }

    hasInitializedRef.current = true;
    sessionStorage.setItem('threads_initialized', 'true');
    fetchThreads();

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const groupChatsByDate = (chats: ChatThreadResponse[]) => {
    const now = new Date();
    const oneWeekAgo = subWeeks(now, 1);
    const oneMonthAgo = subMonths(now, 1);

    const groups = chats.reduce<GroupedChats>(
      (acc, chat) => {
        const chatDate = new Date(
          chat.created_on || (chat as any).created_at
        );

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
      }
    );

    setGroupedChats(groups);
  };

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

            {isMobile ? (
              <Button
                variant="ghost"
                type="button"
                className="p-2 h-fit"
                onClick={() => {
                  setOpenMobile(false);
                  addNewThread();
                }}
              >
                <PlusIcon />
              </Button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    type="button"
                    className="p-2 h-fit"
                    onClick={() => {
                      setOpenMobile(false);
                      addNewThread();
                    }}
                  >
                    <PlusIcon />
                  </Button>
                </TooltipTrigger>
                <TooltipContent align="end">
                  New Chat
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarHistory
          isLoading={isLoading}
          threads={threads}
          groupedChats={groupedChats}
          fetchThreads={fetchThreads}
          setThreads={setThreads}
          groupChatsByDate={groupChatsByDate}
          updateChatTitle={updateChatTitle}
        />
      </SidebarContent>

      <SidebarFooter>
        {(isPublicAgent && publicAgentSession && !isAuthFlowEnabled)
          ? null
          : <SidebarUserNav />}
      </SidebarFooter>
    </Sidebar>
  );
}
