'use client';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';

import {
  MoreHorizontalIcon,
  TrashIcon,
  PenIcon,
} from '@/components/icons';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { useApiService } from '@/hooks/useApiService';
import { ChatThreadResponse } from '@/model';
import { decryptData, handleSetQueryParams } from '@/lib/utils';
import { getAccessToken, getUserFromStorage } from '@/cookie';
import { isPublicAgentMode } from '@/lib/storage/indexeddb';
import { usePublicAgentSession } from '@/hooks/usePublicAgentSession';

interface props {
  fetchThreads: () => void;
  threads: ChatThreadResponse[];
  groupedChats: GroupedChats;
  setThreads: any;
  groupChatsByDate: (chats: ChatThreadResponse[]) => void;
  isLoading: boolean;
  updateChatTitle?: (id: number, title: string) => Promise<void>;
}
interface GroupedChats {
  today: ChatThreadResponse[];
  yesterday: ChatThreadResponse[];
  lastWeek: ChatThreadResponse[];
  lastMonth: ChatThreadResponse[];
  older: ChatThreadResponse[];
}

const ChatItem = ({
  chat,
  isActive,
  onDelete,
  setOpenMobile,
  threads,
  onEditTitle
}: {
  chat: ChatThreadResponse;
  isActive: boolean;
  onDelete: (id: number) => void;
  setOpenMobile: (open: boolean) => void;
  threads: ChatThreadResponse[];
  onEditTitle: (id: number, title: string) => Promise<void>;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(chat.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleEditClick = () => {
    setDropdownOpen(false); // Explicitly close the dropdown
    // Wait for the dropdown to close before enabling edit mode
    setTimeout(() => {
      setIsEditing(true);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 150);
    }, 100);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedTitle(e.target.value);
  };

  const handleTitleSave = async () => {
    if (editedTitle.trim() !== '' && editedTitle !== chat.title) {
      try {
        await onEditTitle(chat.id, editedTitle);
        // Title update is handled optimistically by the parent component
      } catch (error) {
        toast.error('Failed to update chat title');
        setEditedTitle(chat.title); // Revert on error
      }
    } else if (editedTitle.trim() === '') {
      setEditedTitle(chat.title); // Revert if empty
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setEditedTitle(chat.title);
      setIsEditing(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isEditing && inputRef.current && !inputRef.current.contains(e.target as Node)) {
        handleTitleSave();
      }
    };

    if (isEditing) {
      // Add a small delay before adding the click listener to prevent immediate triggering
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
      
      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditing, editedTitle]);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} style={{ cursor: 'pointer' }}>
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editedTitle}
            onChange={handleTitleChange}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent border-b border-sidebar-accent-foreground/30 focus:outline-none px-2"
            style={{
              maxWidth: '100%',
            }}
          />
        ) : (
          <span
            id={chat.id.toString()}
            style={{
              maxWidth: '100%',
              textOverflow: 'ellipsis',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              display: 'inline-block', // Ensure inline-block for proper ellipsis
            }}
            onClick={() => {
              handleSetQueryParams(chat.id.toString(), document.getElementById(chat.id.toString())!.innerText);
              localStorage.setItem('active_thread_id', chat.id.toString())
              setOpenMobile(false);
            }}
          >
            {chat.title}
          </span>
        )}
      </SidebarMenuButton>

      <DropdownMenu 
        modal={true} 
        open={dropdownOpen} 
        onOpenChange={setDropdownOpen}
      >
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction
            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground mr-0.5"
            showOnHover={!isActive}
          >
            <MoreHorizontalIcon />
            <span className="sr-only">More</span>
          </SidebarMenuAction>
        </DropdownMenuTrigger>

        <DropdownMenuContent side="bottom" align="end">
          <DropdownMenuItem
            className="cursor-pointer focus:bg-accent/50"
            onSelect={(e) => {
              e.preventDefault();
              handleEditClick();
            }}
          >
            <PenIcon />
            <span>Edit</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer text-destructive focus:bg-destructive/15 focus:text-destructive dark:text-red-500"
            onSelect={() => onDelete(chat.id)}
            disabled={threads.length === 1}
          >
            <TrashIcon />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
};

ChatItem.displayName = "PureChatItem";


export function SidebarHistory({ fetchThreads, threads, groupedChats, setThreads, groupChatsByDate, isLoading, updateChatTitle }: props) {

  const apiService = useApiService();
  const { setOpenMobile } = useSidebar();
  const searchParams = useSearchParams()
  const encryptedId = searchParams.get('id')
  const id = decryptData(encryptedId)
  const title_encrypted = searchParams.get('title')
  const title= decryptData(title_encrypted)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  
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


  useEffect(() => {
      const user_info = getUserFromStorage()
      if (user_info) {
        fetchThreads();
      }
  }, []);

  useEffect(() => {
    if (title && id) {
      const updatedThreads = threads.map(thread => {
        if (thread.id === parseInt(id)) {
          localStorage.setItem('active_thread_id', thread.id.toString())
          return {
            ...thread,
            title: title,
          };
        }
        return thread;
      });

      setThreads(updatedThreads)
      groupChatsByDate(updatedThreads)

    }
  }, [title])

  useEffect(() => {
    if (title && id) {
      const oldThread = threads.filter((thread) => thread.id == id)
      if (oldThread.length === 0) {
        fetchThreads()
      }
    }
  }, [id])

  const handleDelete = async () => {
    if (!deleteId) return;
    
    // PUBLIC_AGENT mode: Delete from IndexedDB
    if (isPublicAgent && publicAgentSession) {
      try {
        const threadIdString = deleteId.toString();
        const deletePromise = publicAgentSession.deleteThreadById(threadIdString);
        
        toast.promise(deletePromise, {
          loading: 'Deleting chat...',
          success: 'Chat deleted successfully',
          error: 'Failed to delete chat',
        });

        await deletePromise;
        
        // Remove the deleted thread from local state
        const updatedThreads = threads.filter(thread => thread.id !== deleteId);
        setThreads(updatedThreads);
        groupChatsByDate(updatedThreads);
        
        // If the deleted thread was the active one, handle navigation
        if (id && deleteId === parseInt(id)) {
          if (updatedThreads.length > 0) {
            // Navigate to the first remaining thread
            localStorage.setItem('active_thread_id', updatedThreads[0].id.toString());
            handleSetQueryParams(updatedThreads[0].id.toString(), updatedThreads[0].title);
          } else {
            // No threads remain after deletion; clear active thread context
            localStorage.removeItem('active_thread_id');
            handleSetQueryParams('', '');
          }
        }
      } catch (error) {
        // Error toast is already handled by toast.promise
        console.error('Failed to delete chat from IndexedDB:', error);
      } finally {
        setShowDeleteDialog(false);
      }
      return;
    }
    
    // Normal mode: Delete via API
    if (!apiService) return;
    
    try {
      const responsePromise = apiService.deleteChatThread(deleteId);
      toast.promise(responsePromise, {
        loading: 'Deleting chat...',
        success: 'Chat deleted successfully',
        error: 'Failed to delete chat',
      });

      const response = await responsePromise;
      
      // Remove the deleted thread from local state
      const updatedThreads = threads.filter(thread => thread.id !== deleteId);
      setThreads(updatedThreads);
      groupChatsByDate(updatedThreads);
      
      // If the deleted thread was the active one, handle navigation
      if (id && deleteId === parseInt(id)) {
        if (updatedThreads.length > 0) {
          // Navigate to the first remaining thread
          localStorage.setItem('active_thread_id', updatedThreads[0].id.toString());
          handleSetQueryParams(updatedThreads[0].id.toString(), updatedThreads[0].title);
        } else {
          // No threads remain after deletion; clear active thread context
          localStorage.removeItem('active_thread_id');
          handleSetQueryParams('', '');
        }
      }
    } catch (error) {
      // Error toast is already handled by toast.promise for the API call
      console.error('Failed to delete chat:', error);
    } finally {
      setShowDeleteDialog(false);
    }
  };

  const handleDeleteClick = (chatId: number) => {
    setDeleteId(chatId);
    setShowDeleteDialog(true);
  };

  const handleUpdateTitle = async (chatId: number, newTitle: string) => {
    try {
      // Update title optimistically in the UI
      const updatedThreads = threads.map(thread => {
        if (thread.id === chatId) {
          return {
            ...thread,
            title: newTitle,
          };
        }
        return thread;
      });
      
      setThreads(updatedThreads);
      groupChatsByDate(updatedThreads);
      
      // If this is the active thread, update URL params
      if (chatId.toString() === id) {
        handleSetQueryParams(chatId.toString(), newTitle);
      }
      
      // Call the parent function to persist the change
      if (updateChatTitle) {
        updateChatTitle(chatId, newTitle);
      }
    } catch (error) {
      toast.error('Failed to update chat title');
      // Revert changes if the API call fails
      fetchThreads();
    }
  };

  // Don't render if no config is available (check AFTER all hooks)
  if (!apiService) {
    return null;
  }

  return (
    <>
      {
        isLoading &&
        <SidebarGroup>
          <div className="px-2 py-1 text-xs text-sidebar-foreground/50">
            Today
          </div>
          <SidebarGroupContent>
            <div className="flex flex-col">
              {[44, 32, 28, 64, 52].map((item) => (
                <div
                  key={item}
                  className="rounded-md h-8 flex gap-2 px-2 items-center"
                >
                  <div
                    className="h-4 rounded-md flex-1 max-w-[--skeleton-width] bg-sidebar-accent-foreground/10"
                    style={
                      {
                        '--skeleton-width': `${item}%`,
                      } as React.CSSProperties
                    }
                  />
                </div>
              ))}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

      }
      {(threads.length === 0 && !isLoading) ? (
        <SidebarGroup>
          <SidebarGroupContent>
            <div className="text-zinc-500 w-full flex flex-row justify-center items-center text-sm gap-2">
              <div>Your conversations will appear here once you start chatting!</div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      ) : (

        Object.entries(groupedChats).map(
          ([key, chats]) =>
            chats.length > 0 && (
              <SidebarGroup key={key}>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <div key={key}>
                      <div
                        className={`px-2 py-1 text-xs text-sidebar-foreground/50 ${key === 'today' ? 'mt-1' : 'mt-0'
                          } capitalize`}
                      >
                        {key.replace(/([A-Z])/g, ' $1')}
                      </div>
                      {chats.map((chat: any) => (
                        <ChatItem
                          threads={threads}
                          key={chat.id}
                          chat={chat}
                          isActive={chat.id.toString() == id}
                          onDelete={handleDeleteClick}
                          setOpenMobile={setOpenMobile}
                          onEditTitle={handleUpdateTitle}
                        />
                      ))}
                    </div>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ),
        )
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your chat and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className='button'>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
