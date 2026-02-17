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
import { useEffect, useMemo, useRef, useState } from 'react';
import { getAccessToken, getUserFromCookie, getEjentoAccessToken } from '@/cookie';
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
  
  const publicAgentSession = usePublicAgentSession();
  const isPublicAgent = isPublicAgentMode();
  
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

  async function updateMessageAPI(messageId: string | number, data: { content?: string, metadata?: any }) {
    try {
      const res = await fetch(`/api/message/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
  
      if (!res.ok) throw new Error('Failed to update message');
  
      return await res.json();
    } catch (error) {
      console.error(error);
      return null;
    }
  }
  

  useEffect(() => {
    if (textareaRef.current && showAdditionalComment) {
      // Set height to auto to accommodate content
      const height = textareaRef.current.scrollHeight + 10 + 'px';
      setTextareaHeight(height);
    }
  }, [showAdditionalComment, additionalComment]);

  useEffect(() => {
    const user_info = getUserFromCookie()
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
    if (currentMessage.is_upvote || !user) return;
  
    try {
      const messageId = parseInt(currentMessage?.id);
  
      // PUBLIC AGENT MODE → use Next.js API
      if (isPublicAgent) {
        
        const toastId = toast.loading('Upvoting Response...');
        const res = await fetch(`/api/message/${messageId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metadata: {
              ...currentMessage.metadata,
              is_upvote: true,
              is_downvote: false,
            },
          }),
        });
  
        if (!res.ok) throw new Error('Failed to upvote');
        toast.success('Upvoted Response!', { id: toastId });
  
        
      }
  
      // REAL BACKEND MODE → use apiService
      else {
        const responsePromise = apiService.handleUpvote(
          { vote_type: 'upvote' },
          messageId
        );
  
        toast.promise(responsePromise, {
          loading: 'Upvoting Response...',
          success: 'Upvoted Response!',
          error: 'Failed to upvote response',
        });
  
        await responsePromise;
      }
  
      // ✅ Update UI state (shared for both modes)
      setMessages((prevMessages: any[]) =>
        prevMessages.map((msg) =>
          msg?.id === messageId
            ? { ...msg, is_upvote: true, is_downvote: false }
            : msg
        )
      );
  
    } catch (error) {
      console.error('Upvote failed:', error);
      toast.error('Failed to upvote response');
    }
  };
  

  const openDialog = () => {
    localStorage.setItem('message_id', currentMessage.id)
    setShowDeleteDialog(true)

  }
  const handleDownvoteclick = async () => {
    if (currentMessage.is_downvote || !user) return;
  
    try {
      const messageId = parseInt(currentMessage?.id);

      if (isPublicAgent) {
        const toastId = toast.loading('Downvoting Response...');
  
        const res = await fetch(`/api/message/${messageId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metadata: {
              ...currentMessage.metadata,
              is_upvote: false,
              is_downvote: true,
            },
          }),
        });
  
        if (!res.ok) throw new Error('Failed to downvote');
  
        toast.success('Downvoted Response!', { id: toastId });
      }
      else {
        const responsePromise = apiService.handleDownvote(
          { vote_type: 'downvote' },
          messageId
        );
  
        toast.promise(responsePromise, {
          loading: 'Downvoting Response...',
          success: 'Downvoted Response!',
          error: 'Failed to downvote response',
        });
  
        await responsePromise;
      }
  
      // ===============================
      // Update UI (shared for both modes)
      // ===============================
      setMessages((prevMessages: any[]) =>
        prevMessages.map((msg) =>
          msg?.id === messageId
            ? { ...msg, is_downvote: true, is_upvote: false }
            : msg
        )
      );
  
      // Open feedback dialog after success
      openDialog();
  
    } catch (error) {
      console.error('Downvote failed:', error);
      toast.error('Failed to downvote response');
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
    const id = localStorage.getItem('message_id')
      ? parseInt(localStorage.getItem('message_id') as string)
      : -1;
  
    if (id === -1 || !user) return;
  
    try {
      
      if (isPublicAgent) {
        const toastId = toast.loading('Submitting Feedback...');
  
        const res = await fetch(`/api/message/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metadata: {
              ...currentMessage.metadata,
              comment: review,
              created_by: user?.email,
            },
          }),
        });
  
        if (!res.ok) throw new Error('Failed to submit feedback');
  
        toast.success('Feedback Submitted!',{ id : toastId});
      }
  
      else {
        const body = {
          chat_id: id,
          comment: review,
          created_by: user?.email,
        };
  
        const responsePromise = apiService.handleComment(body);
  
        toast.promise(responsePromise, {
          loading: 'Submitting Feedback...',
          success: 'Feedback Submitted!',
          error: 'Failed to submit feedback',
        });
  
        await responsePromise;
      }
  
      setShowDeleteDialog(false);
  
    } catch (error) {
      console.error('Comment submission failed:', error);
      toast.error('Failed to submit feedback');
    } finally {
      setActive('');
      setAdditionalComment('');
    }
  };
  
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
