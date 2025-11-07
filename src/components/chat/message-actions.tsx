// import type { Message } from 'ai';
import { toast } from 'sonner';
import { useCopyToClipboard, useWindowSize } from 'usehooks-ts';
import { CopyIcon, IconArrowRound, ThumbDownIcon, ThumbUpIcon } from '../icons';
import { Button } from '../ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import { useApiService } from '@/hooks/useApiService';
import { use, useEffect, useMemo, useRef, useState } from 'react';
import { getAccessToken, getUserFromStorage, getEjentoAccessToken } from '@/cookie';
import { isPublicAgentMode, updateMessage } from '@/lib/storage/indexeddb';
import { usePublicAgentSession } from '@/hooks/usePublicAgentSession';
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
import { formatChatData } from '@/components/chat/chat';
import { Loader2, SquareArrowOutUpRight } from 'lucide-react';

// Export these utility functions for reuse
export const encodeParam = (string: string) => {
  return encodeURIComponent(btoa(String.fromCodePoint(...new TextEncoder().encode(string))))
}




export function MessageActions({
  chatId,
  message,
  vote,
  isLoading,
  setMessages,
  append,
  showRetry,
  messages,
  index
  // hasFinished
}: {
  chatId: string;
  message: any;
  vote: any | undefined;
  isLoading: boolean;
  setMessages: any;
  append: (message: any, chatRequestOptions?: any) => Promise<string | null | undefined>
  showRetry: boolean;
  messages: any[],
  index: number
  // hasFinished?: boolean
}) {
  const apiService = useApiService();
  // const { mutate } = useSWRConfig();
  
  // PUBLIC_AGENT mode: Get session context for IndexedDB updates
  const isPublicAgent = isPublicAgentMode();
  let publicAgentSession: ReturnType<typeof usePublicAgentSession> | null = null;
  try {
    if (isPublicAgent) {
      publicAgentSession = usePublicAgentSession();
    }
  } catch (error) {
    // Context not available, continue without it
  }
  
  const [user, setUser] = useState<{ id: string, email: string, full_name: string, is_super_user: boolean, user_type: string } | null>(null)
  const [additionalComment, setAdditionalComment] = useState('')
  const [showAdditionalComment, setShowAdditionalComment] = useState(true)
  const [active, setActive] = useState('')
  const [textareaHeight, setTextareaHeight] = useState('auto');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { width } = useWindowSize();
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Analyzing conversation...');

  // Get the current message from the messages array to ensure we always have the latest state
  // This fixes issues where the message prop might be stale
  // Use useMemo to ensure it updates when messages array or index changes
  const currentMessage = useMemo(() => {
    const msg = messages[index] || message;
    // Ensure vote properties are always boolean (not undefined)
    // This handles cases where messages might not have these properties set
    const normalizedMsg = {
      ...msg,
      is_upvote: msg.is_upvote === true,
      is_downvote: msg.is_downvote === true,
    };
    return normalizedMsg;
  }, [messages, index, message]);

  useEffect(() => {
    if (textareaRef.current && showAdditionalComment) {
      // Set height to auto to accommodate content
      const height = textareaRef.current.scrollHeight + 10 + 'px';
      setTextareaHeight(height);
    }
  }, [showAdditionalComment, additionalComment]);

  useEffect(() => {
    const user_info = getUserFromStorage()
    if (user_info) {
      setUser(user_info)
    }
  }, [])

  useEffect(() => {
    if (isCreatingTicket) {
      const messages = ['Analyzing conversation...', 'Summarizing content...'];
      let currentIndex = 0;
      
      // Set initial message
      setLoadingMessage(messages[0]);

      const interval = setInterval(() => {
        if (currentIndex < messages.length - 1) {
          currentIndex += 1;
          setLoadingMessage(messages[currentIndex]);
        } else {
          clearInterval(interval);
        }
      }, 3500);

      return () => clearInterval(interval);
    } else {
      // Reset to initial message when not creating ticket
      setLoadingMessage('Analyzing conversation...');
    }
  }, [isCreatingTicket]);

  if (isLoading) return null;
  if (currentMessage.role === 'user') return null;
  if (currentMessage.toolInvocations && currentMessage.toolInvocations.length > 0)
    return null;

  const handleRegenerateclick = () => {
    append(currentMessage, true)
  }

  const handleUpvoteclick = async () => {
    if (currentMessage.is_upvote || !apiService) return
    if (user) {
      try {
        const responsePromise = apiService.handleUpvote({ vote_type: 'upvote' }, parseInt(currentMessage?.id))
        toast.promise(responsePromise, {
          loading: 'Upvoting Response...',
          success: 'Upvoted Response!',
          error: 'Failed to upvote response',
        });
        const response = await responsePromise;
        if (response?.data?.id) {
          // Update state first to trigger immediate UI update
          setMessages((prevMessages: any[]) => {
            const updated = prevMessages.map(msg =>
              msg?.id === response?.data?.id
                ? { ...msg, is_upvote: true, is_downvote: false } // Update is_upvote to true
                : msg // Keep the other messages unchanged
            );
            return updated;
          });
          
          // PUBLIC_AGENT mode: Update message metadata in IndexedDB
          if (isPublicAgent && publicAgentSession && chatId && currentMessage?.id) {
            try {
              // Find the message in IndexedDB by searching through all messages
              // Messages are stored with random messageId, but the actual agent_response_id is in metadata.id
              const threadMessages = await publicAgentSession.getThreadMessages(chatId);
              
              // Normalize IDs for comparison (handle both number and string types)
              const currentMessageId = currentMessage.id?.toString();
              
              // Try multiple search strategies
              const storedMessage = threadMessages.find((m: any) => {
                // Primary: Match by metadata.id (agent_response_id)
                const metadataId = m.metadata?.id?.toString();
                if (metadataId && metadataId === currentMessageId) {
                  return true;
                }
                
                // Secondary: Match by role and content (for messages without metadata.id)
                if (m.role === 'assistant' && m.content && currentMessage.content) {
                  // Compare content, trimming whitespace
                  const storedContent = m.content.trim();
                  const currentContent = currentMessage.content.trim();
                  if (storedContent === currentContent) {
                    return true;
                  }
                }
                
                return false;
              });
              
              if (storedMessage) {
                const updatedMetadata = {
                  ...storedMessage.metadata,
                  is_upvote: true,
                  is_downvote: false,
                };
                await updateMessage(storedMessage.messageId, {
                  metadata: updatedMetadata
                });
              }
            } catch (error) {
              console.error('Error updating message in IndexedDB:', error);
            }
          }
        }

      } catch (e) {
        console.error(e)
      }
    }
  }

  const openDialog = () => {
    localStorage.setItem('message_id', currentMessage.id)
    setShowDeleteDialog(true)

  }
  const handleDownvoteclick = async () => {
    if (currentMessage.is_downvote || !apiService) return
    if (user) {
      try {
        const responsePromise = apiService.handleDownvote(
          { vote_type: 'downvote' },
          parseInt(currentMessage?.id)
        );
        toast.promise(responsePromise, {
          loading: 'Downvoting Response...',
          success: 'Downvoted Response!',
          error: 'Failed to downvote response',
        });

        const response = await responsePromise;
        if (response?.data?.id) {
          openDialog()
          // Update the state for downvoting the current message
          setMessages((prevMessages: any[]) => {
            const updated = prevMessages.map(msg =>
              msg?.id === response?.data?.id
                ? { ...msg, is_downvote: true, is_upvote: false } // Update is_downvote to true
                : msg // Keep the other messages unchanged
            );
            return updated;
          });
          
          // PUBLIC_AGENT mode: Update message metadata in IndexedDB
          if (isPublicAgent && publicAgentSession && chatId && currentMessage?.id) {
            try {
              // Find the message in IndexedDB by searching through all messages
              // Messages are stored with random messageId, but the actual agent_response_id is in metadata.id
              const threadMessages = await publicAgentSession.getThreadMessages(chatId);
              
              // Normalize IDs for comparison (handle both number and string types)
              const currentMessageId = currentMessage.id?.toString();
              
              // Try multiple search strategies
              const storedMessage = threadMessages.find((m: any) => {
                // Primary: Match by metadata.id (agent_response_id)
                const metadataId = m.metadata?.id?.toString();
                if (metadataId && metadataId === currentMessageId) {
                  return true;
                }
                
                // Secondary: Match by role and content (for messages without metadata.id)
                if (m.role === 'assistant' && m.content && currentMessage.content) {
                  // Compare content, trimming whitespace
                  const storedContent = m.content.trim();
                  const currentContent = currentMessage.content.trim();
                  if (storedContent === currentContent) {
                    return true;
                  }
                }
                
                return false;
              });
              
              if (storedMessage) {
                const updatedMetadata = {
                  ...storedMessage.metadata,
                  is_upvote: false,
                  is_downvote: true,
                };
                await updateMessage(storedMessage.messageId, {
                  metadata: updatedMetadata
                });
              }
            } catch (error) {
              console.error('Error updating message in IndexedDB:', error);
            }
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleCommentClick = (comment: string) => {
    setActive(comment)
  }

  const submitting = () => {
    const comment = additionalComment.trim() !== '' ? additionalComment : active;
    handleCommentSubmit(comment);
  };

  const handleCommentSubmit = async (review: string) => {
    const id = localStorage.getItem('message_id') ? parseInt(localStorage.getItem('message_id') as string) : -1
    if (id === -1 || !apiService) return
    try {
      const body = {
        chat_id: id,
        comment: review,
        created_by: user?.email
      }

      const responsePromise = apiService.handleComment(body)
      toast.promise(responsePromise, {
        loading: 'Submitting Feedback...',
        success: 'Feedback Submitted!',
        error: 'Failed to submit feedback',
      });
      setShowDeleteDialog(false)
      const response = await responsePromise;
      
      // PUBLIC_AGENT mode: Update message metadata in IndexedDB with comment
      if (isPublicAgent && publicAgentSession && chatId && currentMessage?.id) {
        try {
          const threadMessages = await publicAgentSession.getThreadMessages(chatId);
          const storedMessage = threadMessages.find((m: any) => 
            m.metadata?.id?.toString() === currentMessage.id.toString() || 
            (m.role === 'assistant' && m.content === currentMessage.content)
          );
          
          if (storedMessage) {
            await updateMessage(storedMessage.messageId, {
              metadata: {
                ...storedMessage.metadata,
                comment: review,
              }
            });
          }
        } catch (error) {
          console.error('Error updating message in IndexedDB:', error);
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setActive('')
      setAdditionalComment('')
    }
  }

  const handleCopy = async (index: number) => {
    const chatLogs = document.getElementsByClassName('answer-chat');
    const chatLogText = chatLogs[index];

    if (chatLogText) {
        // Use the Clipboard API to write the HTML content directly
        const clone = chatLogText.cloneNode(true) as HTMLElement;

        // Remove unnecessary styles or attributes
        clone.querySelectorAll("*").forEach((node) => {
            node.removeAttribute("style"); // Remove inline styles
            node.removeAttribute("class"); // Remove CSS classes
        });

        const tempDiv = document.createElement("div");
        tempDiv.appendChild(clone);
        const cleanHtml = tempDiv.innerHTML;

        // Copy formatted HTML to the clipboard
        await navigator.clipboard.write([
            new ClipboardItem({
                "text/html": new Blob([cleanHtml], { type: "text/html" }),
                "text/plain": new Blob([clone.innerText], { type: "text/plain" }),
            }),
        ]);

        console.log("Formatted HTML copied to clipboard!");
    }
  }


  // Don't render if no config is available (check AFTER all hooks)
  if (!apiService) {
    return null;
  }

  return (
    <>
      {<TooltipProvider delayDuration={0}>
        <div className="flex flex-row gap-2">
          {
            !currentMessage?.content?.startsWith('error::') &&
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="py-1 px-2 h-fit text-muted-foreground"
                    variant="outline"
                    onClick={async () => {
                      // await copyToClipboard(message.content as string);
                      handleCopy(index)
                      toast.success('Copied to clipboard!');
                    }}
                  >
                    <CopyIcon />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    key={`upvote-${currentMessage.id}-${currentMessage.is_upvote}`}
                    className="py-1 px-2 h-fit text-muted-foreground !pointer-events-auto"
                    variant="outline"
                    onClick={handleUpvoteclick}
                  >
                    <ThumbUpIcon color={currentMessage.is_upvote ? 'green' : 'currentColor'} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Upvote Response</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    key={`downvote-${currentMessage.id}-${currentMessage.is_downvote}`}
                    className="py-1 px-2 h-fit text-muted-foreground !pointer-events-auto"
                    variant="outline"
                    onClick={handleDownvoteclick}
                  >
                    <ThumbDownIcon color={currentMessage.is_downvote ? 'red' : 'currentColor'} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Downvote Response</TooltipContent>
              </Tooltip>
              {
                showRetry &&
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      className="py-1 px-2 h-fit text-muted-foreground !pointer-events-auto"
                      variant="outline"
                      onClick={() => handleRegenerateclick()}
                    >
                      <IconArrowRound></IconArrowRound>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Regenerate Response</TooltipContent>
                </Tooltip>
              }

              <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <div className="flex justify-between items-center">
                      <AlertDialogTitle>Feedback</AlertDialogTitle>
                      
                    </div>
                    <AlertDialogDescription>
                      What made you downvote this response?
                    </AlertDialogDescription>
                    <div className="my-4 flex flex-wrap gap-2" style={{ justifyContent: width && width > 768 ? 'start' : 'center' }}>
                      <div id='Irrelevant' onClick={() => handleCommentClick('Irrelevant')} style={{ width: 'fit-content', cursor: 'pointer' }} className={`p-2 px-3 rounded-lg m-1 text-sm border border-gray-300 hover:border-gray-400 ${active === 'Irrelevant' ? 'active' : ''}`}>Irrelevant</div>
                      <div id='Not Accurate' onClick={() => handleCommentClick('Not Accurate')} style={{ width: 'fit-content', cursor: 'pointer' }} className={`p-2 px-3 rounded-lg m-1 text-sm border border-gray-300 hover:border-gray-400 ${active === 'Not Accurate' ? 'active' : ''}`}>Not Accurate</div>
                      <div id='other' onClick={() => handleCommentClick('other')} style={{ width: 'fit-content', cursor: 'pointer' }} className={`p-2 px-3 rounded-lg m-1 text-sm border border-gray-300 hover:border-gray-400 ${active === 'other' ? 'active' : ''}`}>Other</div>
                    </div>
                    <>
                      <hr></hr>
                      <div
                        style={{
                          height: textareaHeight,
                          transition: 'height 0.3s ease-in-out',
                          overflow: 'hidden',
                        }}
                      >
                        <textarea
                          ref={textareaRef}
                          id="additionalComment"
                          className="me-10 mt-1 block w-full px-4 py-2 border border-gray-300 hover:border-gray-400 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Comment"
                          rows={6}
                          value={additionalComment}
                          onChange={(e) => setAdditionalComment(e.target.value)}
                        />
                      </div>
                    </>
                  </AlertDialogHeader>
                  <AlertDialogFooter className='flex flex-row items-center !justify-between w-full gap-4'>
                   
                    <div className="ml-auto flex items-center gap-2">
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => submitting()} className='button'>Submit</AlertDialogAction>
                    </div>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          }
        </div>
      </TooltipProvider>}
      
    </>
  );
}
