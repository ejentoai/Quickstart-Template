"use client";

import { useEffect, useRef, useState } from "react";
import { decryptData, handleSetQueryParams } from "@/lib/utils";
import { getAccessToken, getEjentoAccessToken, getUserFromStorage } from "@/cookie";
import { useApiService } from "@/hooks/useApiService";
import { useSearchParams } from "next/navigation";
import { useConfig } from "@/app/context/ConfigContext";
import { toast } from 'sonner';
import { isPublicAgentMode } from "@/lib/storage/indexeddb";
import { usePublicAgentSession } from "@/hooks/usePublicAgentSession";

export function formatChatData(chatArray: any[]) {
    if (!Array.isArray(chatArray) || chatArray.length === 0) {
      return [];
    }
    
    const result: any = [];
    let currentPair: { user?: string; bot?: string } = {};
  
    chatArray.forEach((item) => {
      // Ensure item has role and content properties
      if (!item || typeof item.role !== 'string' || typeof item.content !== 'string') {
        return; // Skip invalid items
      }
      
      if (item.role === "user") {
        currentPair.user = item.content;
      } else if (item.role === "assistant") {
        currentPair.bot = item.content;
        // Only push if we have both user and bot messages
        if (currentPair.user && currentPair.bot) {
          result.push(currentPair);
        }
        currentPair = {}; // Reset for the next pair
      }
    });
  
    return result;
  }

/**
 * Helper function to check if a response belongs to the current active thread
 * Handles the transition from local thread IDs to server thread IDs
 * 
 * @param activeThreadId - Current active thread ID from localStorage
 * @param responseThreadId - Thread ID from server response
 * @param currentThreadId - Current thread ID from URL
 * @param isLocalThread - Whether the current thread is a local thread
 * @returns true if the response belongs to the current thread
 */
function isResponseForCurrentThread(
  activeThreadId: string | null, 
  responseThreadId: string | undefined, 
  currentThreadId: string | undefined,
  isLocalThread: boolean = false
): boolean {
  // Direct match with response thread ID
  if (activeThreadId === responseThreadId) return true;
  
  // Match with current thread ID (for local threads before server response)
  if (activeThreadId === currentThreadId) return true;
  
  // Special case: local thread receiving its first server response
  if (isLocalThread && responseThreadId && parseInt(activeThreadId || '0') < 0) return true;
  
  return false;
}

export function useChat(arg0: { selectedCorpus: any | null }): {
    streaming: boolean;
    streamContent: string;
    streamEvents: any;
    streamContentRef: any;
    messages: any;
    setMessages: any;
    handleSubmit: any;
    input: any;
    setInput: any;
    append: any;
    isLoading: any;
    stop: any;
    reload: any;
    data: any;
    chatStarted: boolean;
    isCache: boolean;
    setIsCache: any;
    reflectionEventsRef: any;
    reflectionContentsRef: any;
    thoughtProcessRef: any;
    isReflectingRef: any;
  } {
    const apiService = useApiService();
    const { selectedCorpus } = arg0;
    const [messages, setMessages] = useState<any>([]);
    const { config } = useConfig();
    
    // PUBLIC_AGENT mode: Get session context (only if mode is enabled)
    const isPublicAgent = isPublicAgentMode();
    let publicAgentSession: ReturnType<typeof usePublicAgentSession> | null = null;
    try {
      if (isPublicAgent) {
        publicAgentSession = usePublicAgentSession();
      }
    } catch (error) {
      // Context not available, continue without it
      console.warn('PublicAgentSessionContext not available, continuing without IndexedDB persistence');
    }
    
    // Handle null apiService
    if (!apiService) {
      return {
        streaming: false,
        streamContent: "",
        streamEvents: [],
        streamContentRef: { current: "" },
        messages: [],
        setMessages: () => {},
        handleSubmit: () => {},
        input: "",
        setInput: () => {},
        append: () => Promise.resolve(null),
        isLoading: false,
        stop: false,
        reload: false,
        data: null,
        chatStarted: false,
        isCache: false,
        setIsCache: () => {},
        reflectionEventsRef: { current: [] },
        reflectionContentsRef: { current: [] },
        thoughtProcessRef: { current: "" },
        isReflectingRef: { current: false }
      };
    }
    const [input, setInput] = useState<any>("");
    const [isLoading, setIsLoading] = useState(false);
    const [stop, setStop] = useState(false);
    const [reload, setReload] = useState(false);
    const [data, setData] = useState<any>(null);
    const searchParams = useSearchParams();
    const encryptedId = searchParams.get("id");
    const thread_name_from_url_encrypted = searchParams.get("title");
  
    const id = decryptData(encryptedId);
    const thread_name_from_url = decryptData(thread_name_from_url_encrypted)
    const [chatStarted, setChatStarted] = useState(false);
    const [promptTemplate, setPromptTemplate] = useState<string>("");
    const [excludeCategory, setExcludeCategory] = useState<string>("");
    const user = getUserFromStorage()
    // Get email from config first (set in ENV_DRIVEN mode), then fall back to user storage
    // Always provide a fallback to ensure created_by is never undefined
    const userEmail = config?.userInfo?.email || user?.email || user?.data?.email || 'user';
    const [streaming, setStreaming] = useState(false);
    const [streamContent, setStreamContent] = useState<string>("");
    const [streamEvents, setStreamEvents] = useState<any>([]);
    const streamContentRef = useRef("");
    const thoughtProcessRef = useRef("");
  
    const reflectionEventsRef = useRef<any>([]);
    const reflectionContentsRef = useRef<any>([]);
    const isReflectingRef = useRef(false);
    // Add this with the other useRef declarations
    const abortConnectionRef = useRef<(() => void) | null>(null);
    const [isCache, setIsCache] = useState(false);
    const [streamError, setStreamError] = useState(false);
    const hasErrorOccurredRef = useRef(false);
  
    // Add this useEffect near the other useEffects
    useEffect(() => {
      // Cleanup function to abort any active connections when component unmounts
      return () => {
        if (abortConnectionRef.current) {
          abortConnectionRef.current();
          abortConnectionRef.current = null;
        }
      };
    }, []);
    useEffect(() => {
      if (messages.length > 0) {
        setChatStarted(true);
      } else {
        setChatStarted(false);
      }
    }, [messages]);
  
    const handleSubmit = async (question?: string, regenerating?: boolean, messageIdToRegenerate?: string) => {
      localStorage.setItem('query', question || input)
      localStorage.setItem('thread_id', id)
  
      let corpusIds = selectedCorpus?.corpusId;
      let threadName;
  
      reflectionEventsRef.current = [];
      reflectionContentsRef.current = [];
      thoughtProcessRef.current = "";
      hasErrorOccurredRef.current = false; // Reset error flag for new request
  
      setIsCache(false);
  
      if (!question) {
        if (input.length === 0) return;
      }
      try {
        // Reset loading state when starting a new request
        setIsLoading(true);
  
  
        // Create filtered chat history that excludes the message being regenerated
        // In PUBLIC_AGENT mode, ensure we're using messages from the current state
        let chatHistory;
        if (regenerating && messageIdToRegenerate) {
          // Filter out the message being regenerated from history
          const filteredMessages = messages.filter((m: any) =>
            !(m.role === 'assistant' && m.id === messageIdToRegenerate)
          );
          chatHistory = formatChatData(filteredMessages);
        } else {
          // Format chat history from current messages (excludes the new user message we're about to add)
          chatHistory = formatChatData(messages);
        }

        // Only add a new user message if not regenerating
        if (!regenerating) {
          const userMessage = { role: "user", content: question || input };
          setMessages((messages: any) => [
            ...messages,
            userMessage,
          ]);
          
          // PUBLIC_AGENT mode: Save user message to IndexedDB immediately
          if (isPublicAgent && publicAgentSession && id) {
            const threadId = id.toString();
            publicAgentSession.saveMessage(
              threadId,
              'user',
              question || input,
              { query: question || input }
            ).catch(err => console.error('Error saving user message to IndexedDB:', err));
          }
        }
        setStreamError(false)
  
        // Prepare request options
        if (process.env.NEXT_PUBLIC_STREAM_CHAT === 'true') {//advancedReasoning
          const controller = new AbortController();
          const signal = controller.signal;
          

          // Determine chat_thread_id for the request
          let chatThreadId: number | null = null;
          
          // PUBLIC_AGENT mode: Check IndexedDB for server thread ID
          if (isPublicAgent && publicAgentSession && id) {
            try {
              const threadId = id.toString();
              // Get thread from IndexedDB to check for serverThreadId
              const { getThread } = await import('@/lib/storage/indexeddb');
              const storedThread = await getThread(threadId);
              
              if (storedThread?.metadata?.serverThreadId) {
                // Use server thread ID if available
                chatThreadId = storedThread.metadata.serverThreadId;
              } else if (parseInt(id) > 0) {
                // Use positive ID if it's already a server ID
                chatThreadId = parseInt(id);
              } else {
                // Local thread (negative ID) - send null for first message
                chatThreadId = null;
              }
            } catch (error) {
              console.error('Error getting thread from IndexedDB:', error);
              // Fallback to original logic
              const isLocalThread = parseInt(id) < 0;
              chatThreadId = isLocalThread ? null : parseInt(id);
            }
          } else {
            // Normal mode: Check if this is a local thread (negative ID) and send null for first message
            const isLocalThread = parseInt(id) < 0;
            chatThreadId = isLocalThread ? null : parseInt(id);
          }

          const requestBody: any = {
            // agent_id: parseInt(config?.agentId || '0'),
            // approach: "rrr",
            // category: config?.agentId,
            // created_by: userEmail,
            chat_thread_id: chatThreadId,
            ...(chatHistory && chatHistory.length > 0 && { history: chatHistory }),
            query_source: "app-ejento",
            overrides: {
              // promptTemplate:
              //   promptTemplate.length === 0 ? undefined : promptTemplate,
              // excludeCategory:
              //   excludeCategory.length === 0 ? undefined : excludeCategory,
              // top: 3,
              // semantic_ranker: true,
              // semantic_captions: false,
              // suggest_followup_questions: process.env.NEXT_PUBLIC_FOLLOWUP_QUESTION === 'true',
              // sources: process.env.NEXT_PUBLIC_SOURCES === 'true',
              // cache_skip: regenerating ? true : false,
              // mode_override: "",
              log_intermediate_response: true,
              ...(corpusIds !== null && { corpus_ids: [corpusIds] }),
              retrieve_data_points: true,
            },
            // model: process.env.NEXT_PUBLIC_MODEL_NAME,
            // stream: true,
            caching_enabled: regenerating ? false : true,
            user_query: question || input,
          };
          setInput("")
          // Reset streaming content
          setStreamContent("");
          streamContentRef.current = "";
          // Use the streamChatRequest function to handle the API call
          abortConnectionRef.current = await apiService.streamChatRequest(
            requestBody,
            {
              onopen: async (res: any) => {
                if (res.ok && (res.status === 200)) {
                  // console.log("Connection successful:");
                } else if (res.status >= 400 && res.status < 500 && res.status !== 429) {
                  console.error("Client-side error. Response:", res);
                } else if (res.status === 429) {
                  console.error("Rate limited. Please try again later.");
                }
                return Promise.resolve();
              },
              onmessage(event: any) {

                // If an error has already occurred, ignore all subsequent events
                if (hasErrorOccurredRef.current) {
                  return;
                }


                let parsedStreamData = JSON.parse(event.data);
                
                // Set streaming to true as soon as we receive any data
                setStreaming(true);
                
                let hasEnded = parsedStreamData?.step == 'end';
                // let hasCache = parsedStreamData?.event == 'cache_hit';
                let hasError = parsedStreamData?.step == 'error';
                // let isGuardrail = parsedStreamData?.event == 'guardrail';
                let thoughtProcess = parsedStreamData?.step == 'tools_stream';
                const hasReflection = parsedStreamData?.step == "reflection_end" || parsedStreamData?.step == "reflection_skip";
                
  
  
                if (hasReflection) {
                  reflectionEventsRef.current = [...reflectionEventsRef.current, parsedStreamData?.message];
                  // reflectionContentsRef.current = [...reflectionContentsRef.current, streamContentRef.current];
                }
  
                // const isReflecting = parsedStreamData?.event == "reflection_start";
  
                // if (isReflecting) {
                  // }/
                  
                if(thoughtProcess){
                  isReflectingRef.current = true;
                  thoughtProcessRef.current +=  parsedStreamData?.delta
                  setStreamEvents([]);
                  // setStreamEvents([]);
                } 
  
                if (hasEnded) {
                  const response = parsedStreamData?.output;
                  if (!parsedStreamData?.success) {
                    // if(isGuardrail){
                    //   setMessages((messages: any) => [
                    //     ...messages,
                    //     ...[
                    //       {
                    //         role: "assistant",
                    //         content: response?.answer,
                    //         query: question || input,
                    //         id: response?.agent_response_id,
                    //         isUpvote: false,
                    //         isDownvote: false,
                    //         followUpQuestions: response?.followup_questions,
                    //         references: response?.references,
                    //         currentChat: true,
                    //         guardrail_triggered: response?.guardrail_triggered || false,
                    //         blocked: response?.blocked || false,
                    //       },
                    //     ],
                    //   ]);
                    // } else {
                      setMessages((messages: any) => [
                        ...messages,
                        ...[
                        {
                          role: "assistant",
                          content: `error:: ${response.message}`,
                          id: id,
                          is_upvote: false,
                          is_downvote: false,
                          followUpQuestions: [],
                          references: [],
                          query: question || input,
                          guardrail_triggered: response?.guardrail_triggered || false,
                          blocked: response?.blocked || false,
                        },
                      ],
                    ]);
                  }
                  // }
                  else {
                    threadName = response.chat_thread_name
                    
                    // Get current active thread ID and response thread ID for comparison
                    const activeThreadId = localStorage.getItem('active_thread_id');
                    const responseThreadId = response.thread_id?.toString();
                    const currentThreadId = id?.toString();
                    const isLocalThread = parseInt(id) < 0;
                    
                    // Check if this response belongs to the current thread
                    const belongsToCurrentThread = isResponseForCurrentThread(
                      activeThreadId, 
                      responseThreadId, 
                      currentThreadId, 
                      isLocalThread
                    );
                    
                    // Update thread information if this response belongs to current thread
                    if (belongsToCurrentThread && response.thread_id) {
                      // Always update localStorage with the latest thread ID
                      localStorage.setItem('active_thread_id', response.thread_id.toString());
                      
                      // Determine if we need to update the URL
                      const shouldUpdateUrl = isLocalThread || 
                                            thread_name_from_url === "New Thread" || 
                                            thread_name_from_url === "New Chat";
                      
                      // Update URL once if needed
                      if (shouldUpdateUrl) {
                        handleSetQueryParams(response.thread_id.toString(), response.chat_thread_name);
                      }
                      
                      // Handle local thread specific updates
                      if (isLocalThread) {
                        // Mark that we're transitioning to prevent fetchChat from running
                        if ((window as any).setTransitioningState) {
                          (window as any).setTransitioningState(true);
                        }
                        
                        // Update the sidebar thread list with the real server ID
                        if ((window as any).updateLocalThreadWithServerId) {
                          (window as any).updateLocalThreadWithServerId(
                            parseInt(id), 
                            response.thread_id, 
                            response.chat_thread_name
                          );
                        }
                        
                        // Clear any temporary thread data
                        localStorage.removeItem('thread_id');
                        localStorage.removeItem('query');
                        
                        // Clear transition state after a brief delay to allow URL update to complete
                        setTimeout(() => {
                          if ((window as any).setTransitioningState) {
                            (window as any).setTransitioningState(false);
                          }
                        }, 100);
                      }
                    }
                    
                    if (belongsToCurrentThread) {
                      const savedReflectionEvents = [...reflectionEventsRef.current];
                      const savedReflectionContents = [...reflectionContentsRef.current];
                      
                      const assistantMessage = {
                        role: "assistant",
                        content: response?.answer,
                        query: question || input,
                        id: response?.agent_response_id,
                        is_upvote: false,
                        is_downvote: false,
                        followUpQuestions: response?.followup_questions,
                        references: response?.references,
                        reflectionEvents: savedReflectionEvents,
                        reflectionContents: savedReflectionContents,
                        currentChat: true,
                        guardrail_triggered: response?.guardrail_triggered || false,
                        blocked: response?.blocked || false,
                      };
                      
                      setMessages((messages: any) => [
                        ...messages,
                        ...[assistantMessage],
                      ]);
                      
                      // PUBLIC_AGENT mode: Save messages to IndexedDB and update thread title
                      if (isPublicAgent && publicAgentSession && id) {
                        const threadId = id.toString();
                        // Save user message (already in messages array)
                        const userMessage = messages[messages.length - 1];
                        if (userMessage && userMessage.role === 'user') {
                          publicAgentSession.saveMessage(
                            threadId,
                            'user',
                            userMessage.content,
                            { query: userMessage.content }
                          ).catch(err => console.error('Error saving user message to IndexedDB:', err));
                        }
                        // Save assistant message
                        publicAgentSession.saveMessage(
                          threadId,
                          'assistant',
                          response?.answer,
                          {
                            query: question || input,
                            id: response?.agent_response_id,
                            followUpQuestions: response?.followup_questions,
                            references: response?.references,
                            reflectionEvents: savedReflectionEvents,
                            guardrail_triggered: response?.guardrail_triggered || false,
                            blocked: response?.blocked || false,
                            is_upvote: false,
                            is_downvote: false,
                          }
                        ).catch(err => console.error('Error saving assistant message to IndexedDB:', err));
                        
                        // Update thread title only if this is the first message in the thread
                        // Check if this is the first exchange (user message + assistant response)
                        // by checking if there were no assistant messages before this one
                        const isFirstMessage = messages.filter((m: any) => m.role === 'assistant').length === 0;
                        if (response.chat_thread_name && threadName && isFirstMessage) {
                          // Use current thread ID to find the thread, then update with server ID in metadata if provided
                          publicAgentSession.updateThreadTitle(threadId, threadName, response.thread_id)
                            .catch(err => console.error('Error updating thread title in IndexedDB:', err));
                        }
                      }
                    }
                  }
                } 
                // else if (hasCache) {
                //   setIsCache(true);
                //   const response = parsedStreamData?.content;
                //   threadName = response.chat_thread_name
                  
                //   // Get current active thread ID and response thread ID for comparison
                //   const activeThreadId = localStorage.getItem('active_thread_id');
                //   const responseThreadId = response.thread_id?.toString();
                //   const currentThreadId = id?.toString();
                //   const isLocalThread = parseInt(id) < 0;
                  
                //   // Check if this response belongs to the current thread
                //   const belongsToCurrentThread = isResponseForCurrentThread(
                //     activeThreadId, 
                //     responseThreadId, 
                //     currentThreadId, 
                //     isLocalThread
                //   );
                  
                //   // Update thread information if this response belongs to current thread
                //   if (belongsToCurrentThread && response.thread_id) {
                //     // Always update localStorage with the latest thread ID
                //     localStorage.setItem('active_thread_id', response.thread_id.toString());
                    
                //     // Determine if we need to update the URL
                //     const shouldUpdateUrl = isLocalThread || 
                //                           thread_name_from_url === "New Thread" || 
                //                           thread_name_from_url === "New Chat";
                    
                //     // Update URL once if needed
                //     if (shouldUpdateUrl) {
                //       handleSetQueryParams(response.thread_id.toString(), response.chat_thread_name);
                //     }
                    
                //     // Handle local thread specific updates
                //     if (isLocalThread) {
                //       // Mark that we're transitioning to prevent fetchChat from running
                //       if ((window as any).setTransitioningState) {
                //         (window as any).setTransitioningState(true);
                //       }
                      
                //       // Update the sidebar thread list with the real server ID
                //       if ((window as any).updateLocalThreadWithServerId) {
                //         (window as any).updateLocalThreadWithServerId(
                //           parseInt(id), 
                //           response.thread_id, 
                //           response.chat_thread_name
                //         );
                //       }
                      
                //       // Clear any temporary thread data
                //       localStorage.removeItem('thread_id');
                //       localStorage.removeItem('query');
                      
                //       // Clear transition state after a brief delay to allow URL update to complete
                //       setTimeout(() => {
                //         if ((window as any).setTransitioningState) {
                //           (window as any).setTransitioningState(false);
                //         }
                //       }, 100);
                //     }
                //   }
                  
                //   if (belongsToCurrentThread) {
                //     setMessages((messages: any) => [
                //       ...messages,
                //       ...[
                //         {
                //           role: "assistant",
                //           content: response?.answer,
                //           query: question || input,
                //           id: response?.agent_response_id,
                //           isUpvote: false,
                //           isDownvote: false,
                //           followUpQuestions: response?.followup_questions,
                //           references: response?.references,
                //           currentChat: true,
                //           guardrail_triggered: response?.guardrail_triggered || false,
                //           blocked: response?.blocked || false,
                //         },
                //       ],
                //     ]);
                //   }
                // }
                 else if (hasError) {
                   // Set the error flag to prevent processing subsequent events
                   hasErrorOccurredRef.current = true;
                  
                  const response = parsedStreamData?.output;
                  setMessages((messages: any) => [
                    ...messages,
                    ...[
                      {
                        role: "assistant",
                        content: `error:: ${response?.error?.details || parsedStreamData?.message}`,
                        id: id,
                        is_upvote: false,
                        is_downvote: false,
                        followUpQuestions: [],
                        references: [],
                        query: question || input,
                        guardrail_triggered: response?.blocked || false,
                        blocked: response?.blocked || false,
                      },
                    ],
                  ]);

                  // Clean up streaming state
                  setStreaming(false);
                  setIsLoading(false);
                  streamContentRef.current = "";
                  
                  return; // Stop processing this event
                }
                else {
                  const parsedMsg = parsedStreamData?.step;
                  if (parsedMsg === 'assistant_stream') {
                    setStreamEvents([]);
                    setIsLoading(false);
                    if(isReflectingRef.current){
                      reflectionEventsRef.current = [...reflectionEventsRef?.current, thoughtProcessRef?.current];
                      isReflectingRef.current = false;
                    }
                    
                    // if (isReflectingRef.current) {
                    //   streamContentRef.current = "";
                    // }
                    streamContentRef.current += parsedStreamData?.delta;
                    // Trigger re-render by updating state
                    setStreamContent(streamContentRef.current);
                  } else {
                    if (parsedMsg == 'error') {
                      console.error(parsedStreamData?.delta)
                      setStreamError(true)
                    }
                    setStreamEvents([parsedStreamData?.message]);
                    if(parsedStreamData?.message !== "")
                    {
                      reflectionEventsRef.current = [...reflectionEventsRef?.current, parsedStreamData?.message];
                    }
                  }
                }
              },
              onclose() {
                // Check if the response seems incomplete (less than 50 characters)
                const isIncomplete = streamContentRef.current.length < 50;
                
                if (isIncomplete) {
                  // Show user notification about incomplete response
                  toast.warning("Response appears incomplete. This may be due to a server issue.");
                }
                
                setStreaming(false);
                setStreamContent("");
                setIsLoading(false);
                streamContentRef.current = "";
                isReflectingRef.current = false;
                controller.abort();
                console.info("Connection closed by the server.");
              },
              onerror(err: any) {
                console.error("Stream error occurred:", err);
                setStreaming(false);
                setStreamContent("");
                streamContentRef.current = "";
                setIsLoading(false);
                setIsCache(false);
                controller.abort();
                throw err;
              },
              signal
            },
          );
        }
        else {
          // Determine chat_thread_id for the request
          let chatThreadId: number | null = null;
          
          // PUBLIC_AGENT mode: Check IndexedDB for server thread ID
          if (isPublicAgent && publicAgentSession && id) {
            try {
              const threadId = id.toString();
              // Get thread from IndexedDB to check for serverThreadId
              const { getThread } = await import('@/lib/storage/indexeddb');
              const storedThread = await getThread(threadId);
              
              if (storedThread?.metadata?.serverThreadId) {
                // Use server thread ID if available
                chatThreadId = storedThread.metadata.serverThreadId;
              } else if (parseInt(id) > 0) {
                // Use positive ID if it's already a server ID
                chatThreadId = parseInt(id);
              } else {
                // Local thread (negative ID) - send null for first message
                chatThreadId = null;
              }
            } catch (error) {
              console.error('Error getting thread from IndexedDB:', error);
              // Fallback to original logic
              const isLocalThread = parseInt(id) < 0;
              chatThreadId = isLocalThread ? null : parseInt(id);
            }
          } else {
            // Normal mode: Check if this is a local thread (negative ID) and send null for first message
            const isLocalThread = parseInt(id) < 0;
            chatThreadId = isLocalThread ? null : parseInt(id);
          }
          

          const requestBody: any = {
            chat_thread_id: chatThreadId !== null ? parseInt(chatThreadId.toString()) : null,
            ...(chatHistory && chatHistory.length > 0 && { history: chatHistory }),
            user_query: question || input,
            // created_by: user?.email,
            query_source: "app-ejento",
            is_file_attached: false,
            caching_enabled: regenerating ? false : true,
            overrides: {
              log_intermediate_response: true,
              retrieve_data_points: true
            }
          };

          const response: any = await apiService.sendChat(requestBody);
          if (!response.success) {
            setMessages((messages: any) => [
              ...messages,
              ...[
                {
                  role: "assistant",
                  content: `error:: ${response.message}`,
                  id: id,
                  is_upvote: false,
                  is_downvote: false,
                  followUpQuestions: [],
                  references: [],
                  query: question || input,
                },
              ],
            ]);
          } else {
            const responseData = response.data;
            threadName = responseData.chat_thread_name
            
            // Get current active thread ID for comparison
            const activeThreadId = localStorage.getItem('active_thread_id');
            const responseThreadId = responseData.thread_id?.toString();
            const currentThreadId = id?.toString();
            
            // Determine if this is a local thread (negative ID or no server thread ID in IndexedDB)
            let isLocalThread = false;
            if (isPublicAgent && publicAgentSession && id) {
              try {
                const threadId = id.toString();
                const { getThread } = await import('@/lib/storage/indexeddb');
                const storedThread = await getThread(threadId);
                // It's a local thread if ID is negative AND no server thread ID exists yet
                isLocalThread = parseInt(id) < 0 && !storedThread?.metadata?.serverThreadId;
              } catch (error) {
                // Fallback: check if ID is negative
                isLocalThread = parseInt(id) < 0;
              }
            } else {
              isLocalThread = parseInt(id) < 0;
            }
            
            // Check if this response belongs to the current thread
            const belongsToCurrentThread = isResponseForCurrentThread(
              activeThreadId, 
              responseThreadId, 
              currentThreadId, 
              isLocalThread
            );
            
            // Update thread information if this response belongs to current thread
            if (belongsToCurrentThread && responseData.thread_id) {
              // Always update localStorage with the latest thread ID
              localStorage.setItem('active_thread_id', responseData.thread_id.toString());
              
              // Determine if we need to update the URL
              const shouldUpdateUrl = isLocalThread || 
                                    thread_name_from_url === "New Thread" || 
                                    thread_name_from_url === "New Chat";
              
              // Update URL once if needed
              if (shouldUpdateUrl) {
                handleSetQueryParams(responseData.thread_id.toString(), responseData.chat_thread_name);
              }
              
              // Handle local thread specific updates
              if (isLocalThread) {
                // Mark that we're transitioning to prevent fetchChat from running
                if ((window as any).setTransitioningState) {
                  (window as any).setTransitioningState(true);
                }
                
                // Update the sidebar thread list with the real server ID
                if ((window as any).updateLocalThreadWithServerId) {
                  (window as any).updateLocalThreadWithServerId(
                    parseInt(id), 
                    responseData.thread_id, 
                    responseData.chat_thread_name
                  );
                }
                
                // Clear any temporary thread data
                localStorage.removeItem('thread_id');
                localStorage.removeItem('query');
                
                // Clear transition state after a brief delay to allow URL update to complete
                setTimeout(() => {
                  if ((window as any).setTransitioningState) {
                    (window as any).setTransitioningState(false);
                  }
                }, 100);
              }
            }
            
            if (belongsToCurrentThread) {
              const assistantMessage = {
                role: "assistant",
                content: responseData?.answer,
                query: question || input,
                id: responseData?.chatlog_id,
                is_upvote: false,
                is_downvote: false,
                followUpQuestions: responseData?.followup_questions,
                references: responseData?.references,
                currentChat: true,
              };
              
              setMessages((messages: any) => [
                ...messages,
                ...[assistantMessage],
              ]);
              
              // PUBLIC_AGENT mode: Save messages to IndexedDB and update thread title
              if (isPublicAgent && publicAgentSession && id) {
                const threadId = id.toString();
                // Save user message (already in messages array)
                const userMessage = messages[messages.length - 1];
                if (userMessage && userMessage.role === 'user') {
                  publicAgentSession.saveMessage(
                    threadId,
                    'user',
                    userMessage.content,
                    { query: userMessage.content }
                  ).catch(err => console.error('Error saving user message to IndexedDB:', err));
                }
                // Save assistant message
                publicAgentSession.saveMessage(
                  threadId,
                  'assistant',
                  responseData?.answer,
                  {
                    query: question || input,
                    id: responseData?.chatlog_id,
                    followUpQuestions: responseData?.followup_questions,
                    references: responseData?.references,
                    is_upvote: false,
                    is_downvote: false,
                  }
                ).catch(err => console.error('Error saving assistant message to IndexedDB:', err));
                
                // Update thread title only if this is the first message in the thread
                // Check if this is the first exchange (user message + assistant response)
                // by checking if there were no assistant messages before this one
                const isFirstMessage = messages.filter((m: any) => m.role === 'assistant').length === 0;
                if (responseData.chat_thread_name && threadName && isFirstMessage) {
                  // Use current thread ID to find the thread, then update with server ID in metadata if provided
                  publicAgentSession.updateThreadTitle(threadId, threadName, responseData.thread_id)
                    .catch(err => console.error('Error updating thread title in IndexedDB:', err));
                }
              }
            }
          }
        }
      }
      catch (e) {
        console.error(e);
        // Ensure loading state is reset on error
        setIsLoading(false);
        setStreaming(false);
        setStreamContent("");
        streamContentRef.current = "";
        isReflectingRef.current = false;
      } finally {
        // Only reset loading state if we're not streaming
        if (!streaming) {
          setIsLoading(false);
        }
        setInput('');
        setStop(false);
        setReload(false);
        localStorage.removeItem('query')
        localStorage.removeItem('thread_id')
        // Safely update thread name in DOM if element exists
        const threadElement = document.getElementById(id);
        if (threadElement) {
          const chatThreadName = threadElement.innerText;
          if (chatThreadName === "New Thread" || chatThreadName === "New Chat") {
            threadElement.innerText = threadName || chatThreadName;
          }
        }
      }
    }
  
  
    const append = (message: any, regenerating?: boolean) => {
      if (regenerating && messages.length > 0) {
        // Find the index of the assistant message that matches the one being regenerated
        const assistantMessageIndex = messages.findIndex((m: any) =>
          m.role === 'assistant' && m.id === message.id
        );
  
        if (assistantMessageIndex !== -1) {
          // Get the user message that preceded this assistant message
          const userMessageIndex = assistantMessageIndex - 1;
          if (userMessageIndex >= 0 && messages[userMessageIndex].role === 'user') {
            // Get the user query from the original message
            const userQuery = messages[userMessageIndex].content;
  
            // Remove only the assistant message to keep the original user message
            const updatedMessages = [...messages];
            updatedMessages.splice(assistantMessageIndex, 1);
            setMessages(updatedMessages);
  
            // Pass regenerating=true so handleSubmit knows not to add a new user message
            // Also pass the message ID to filter it from history
            handleSubmit(userQuery, true, message.id);
          }
        } else {
          // Fallback to normal handling if we can't find the message to regenerate
          handleSubmit(message?.query || message?.content, false);
        }
      } else {
        // Normal flow for non-regenerating messages
        handleSubmit(message?.query || message?.content, false);
      }
    };
  
    return {
      streaming,
      streamContent,
      streamEvents,
      streamContentRef,
      messages,
      setMessages,
      handleSubmit,
      input,
      setInput,
      append,
      isLoading,
      stop,
      reload,
      data,
      chatStarted,
      isCache,
      setIsCache,
      reflectionEventsRef,
      reflectionContentsRef,
      thoughtProcessRef,
      isReflectingRef,
    };
  }