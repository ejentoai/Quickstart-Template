"use client";

import { useEffect, useRef, useState } from "react";
import { decryptData,handleSetQueryParams } from "@/lib/utils";
import { useApiService } from "@/hooks/useApiService";
import { useSearchParams} from "next/navigation";
import { toast } from 'sonner';
import { isPublicAgentMode } from '@/lib/utils';
import { usePublicAgentSession } from "@/hooks/usePublicAgentSession";

export function formatChatData(chatArray: any[]) {
    if (!Array.isArray(chatArray) || chatArray.length === 0) {
      return [];
    }
   
    const result: any = [];
    let currentPair: { user?: string; bot?: string } = {};
 
    chatArray.forEach((item) => {
      if (!item || typeof item.role !== 'string' || typeof item.content !== 'string') {
        return;
      }
     
      if (item.role === "user") {
        currentPair.user = item.content;
      } else if (item.role === "assistant") {
        currentPair.bot = item.content;
        if (currentPair.user && currentPair.bot) {
          result.push(currentPair);
        }
        currentPair = {};
      }
    });
 
    return result;
}

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
 
export function useChat(arg0: { selectedCorpus: any | null }) {
    const apiService = useApiService();
    const { selectedCorpus } = arg0;
    const [messages, setMessages] = useState<any>([]);
    const isPublicAgent = isPublicAgentMode();
    const publicAgentSession = usePublicAgentSession();
    const [input, setInput] = useState<any>("");
    const [isLoading, setIsLoading] = useState(false);
    const [stop, setStop] = useState(false);
    const [reload, setReload] = useState(false);
    const [data, setData] = useState<any>(null);
    const searchParams = useSearchParams();
    const encryptedId = searchParams.get("id");
    const thread_name_from_url_encrypted = searchParams.get("title");
 
    let id = decryptData(encryptedId);
    
    const thread_name_from_url = decryptData(thread_name_from_url_encrypted);
    const [chatStarted, setChatStarted] = useState(false);
    const [streaming, setStreaming] = useState(false);
    const [streamContent, setStreamContent] = useState<string>("");
    const [streamEvents, setStreamEvents] = useState<any>([]);
    const streamContentRef = useRef("");
    const thoughtProcessRef = useRef("");
    const reflectionEventsRef = useRef<any>([]);
    const reflectionContentsRef = useRef<any>([]);
    const isReflectingRef = useRef(false);
    const abortConnectionRef = useRef<(() => void) | null>(null);
    const [isCache, setIsCache] = useState(false);
    const [streamError, setStreamError] = useState(false);
    const hasErrorOccurredRef = useRef(false);
   
    // Store if this thread has an external API ID
    const [hasExternalApiId, setHasExternalApiId] = useState<boolean>(false);
    const isFirstMessageRef = useRef<boolean>(true);
 
    useEffect(() => {
      return () => {
        if (abortConnectionRef.current) {
          abortConnectionRef.current();
          abortConnectionRef.current = null;
        }
      };
    }, []);
 
    useEffect(() => {
      setChatStarted(messages.length > 0);
    }, [messages]);
 
    // Check if thread already has externalApiId
    useEffect(() => {
      const checkExternalApiId = async () => {
        if (isPublicAgent && id && parseInt(id) > 0 && apiService) {
          try {
            const response = await fetch(`/api/thread/${id}`);
            if (response.ok) {
              const threadData = await response.json();
              setHasExternalApiId(!!threadData.externalApiId);
              isFirstMessageRef.current = !threadData.externalApiId;
            }
          } catch (error) {
            console.error('Error checking thread external API ID:', error);
          }
        }
      };
     
      checkExternalApiId();
    }, [id, isPublicAgent, apiService]);
 
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
 
    // Update thread with external API ID
    const updateThreadWithExternalApiId = async (threadId: string, externalApiId: number, title?: string) => {
      try {
        const response = await fetch(`/api/thread/${threadId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            externalApiId,
            title: title || thread_name_from_url
          })
        });
       
        if (response.ok) {
          setHasExternalApiId(true);
          isFirstMessageRef.current = false;
        } else {
          console.error('Failed to update thread with external API ID');
        }
      } catch (error) {
        console.error('Error updating thread with external API ID:', error);
      }
    };
 
    const handleSubmit = async (question?: string, regenerating?: boolean, messageIdToRegenerate?: string, Attachment?:boolean) => {
      localStorage.setItem('query', question || input);
      localStorage.setItem('thread_id', id);
    
      let corpusIds = selectedCorpus?.corpusId;
      let threadName;
    
      reflectionEventsRef.current = [];
      reflectionContentsRef.current = [];
      thoughtProcessRef.current = "";
      hasErrorOccurredRef.current = false;
      setIsCache(false);
    
      if (!question && input.length === 0) return;
      
      try {
        setIsLoading(true);
        let chatHistory;
        let userQuestion = question || input;
        let userMessageId = null; // Track user message ID for public mode
    
        if (regenerating && messageIdToRegenerate) {
          // Find the assistant message being regenerated
          const assistantMessageIndex = messages.findIndex((m: any) => 
            m.role === 'assistant' && m.id === messageIdToRegenerate
          );
          
          if (assistantMessageIndex !== -1) {
            // Get the user message that preceded this assistant message
            const userMessageIndex = assistantMessageIndex - 1;
            
            if (userMessageIndex >= 0 && messages[userMessageIndex].role === 'user') {
              // Use that user message's content for regeneration
              userQuestion = messages[userMessageIndex].content;
              
              // Get the messages to keep (before the user message)
              const messagesToKeep = messages.slice(0, userMessageIndex);
              const messagesToDelete = messages.slice(userMessageIndex, assistantMessageIndex + 1);
              
              // For public mode, delete the messages from database
              if (isPublicAgent && publicAgentSession) {
                try {
                  // Delete both user and assistant messages from database
                  for (const msg of messagesToDelete) {
                    if (msg.id && !msg.id.toString().startsWith('temp-')) {
                      // Call your existing delete endpoint
                      await fetch(`/api/message/${msg.id}`, {
                        method: 'DELETE',
                      });
                    }
                  }
                } catch (err) {
                  console.error('Error deleting messages from DB:', err);
                }
              }
              
              // Update messages state to remove the pair being regenerated
              setMessages(messagesToKeep);
              
              // Format chat history from messages to keep
              chatHistory = formatChatData(messagesToKeep);
            } else {
              // Fallback: just remove the assistant message
              const messagesToKeep = messages.filter((m: any) => 
                !(m.role === 'assistant' && m.id === messageIdToRegenerate)
              );
              
              const assistantMessage = messages.find((m: any) => 
                m.role === 'assistant' && m.id === messageIdToRegenerate
              );
              
              if (isPublicAgent && publicAgentSession && assistantMessage?.id && !assistantMessage.id.toString().startsWith('temp-')) {
                try {
                  await fetch(`/api/message/${assistantMessage.id}`, {
                    method: 'DELETE',
                  });
                } catch (err) {
                  console.error('Error deleting assistant message from DB:', err);
                }
              }
              
              setMessages(messagesToKeep);
              chatHistory = formatChatData(messagesToKeep);
            }
          } else {
            chatHistory = formatChatData(messages);
          }
          
          // Add the user message for regeneration
          const tempUserMessageId = `temp-${Date.now()}`;
          const userMessage = { 
            role: "user", 
            content: userQuestion,
            id: tempUserMessageId,
            timestamp: new Date().toISOString(),
            isRegeneration: true
          };
          
          setMessages((messages: any) => [...messages, userMessage]);
          
          // Save user message to database for regeneration in public mode
          if (isPublicAgent && publicAgentSession) {
            try {
              const threadIdNum = parseInt(id);
              const savedMessage = await publicAgentSession.saveMessage(
                threadIdNum,
                'user',
                userQuestion,
                { 
                  query: userQuestion,
                  timestamp: new Date().toISOString(),
                  isRegeneration: true
                }
              );
              
              // Update the user message with the real ID from database
              if (savedMessage?.messageId) {
                userMessageId = savedMessage.messageId;
                setMessages((prev: any) =>
                  prev.map((msg: any) =>
                    msg.id === tempUserMessageId
                      ? { ...msg, id: savedMessage.messageId }
                      : msg
                  )
                );
              }
              
              localStorage.setItem('active_thread_id', id);
            } catch (err) {
              console.error('Error saving user message to DB:', err);
            }
          }
        } else {
          // Normal flow - format chat history from current messages
          chatHistory = formatChatData(messages);
          
          // Add new user message
          const tempUserMessageId = `temp-${Date.now()}`;
          const userMessage = { 
            role: "user", 
            content: userQuestion,
            id: tempUserMessageId,
            timestamp: new Date().toISOString()
          };
          
          setMessages((messages: any) => [...messages, userMessage]);
          
          // Save user message to database when public agent mode is on
          if (isPublicAgent && publicAgentSession) {
            try {
              const threadIdNum = parseInt(id);
              const savedMessage = await publicAgentSession.saveMessage(
                threadIdNum,
                'user',
                userQuestion,
                { 
                  query: userQuestion,
                  timestamp: new Date().toISOString()
                }
              );
              
              // Update the user message with the real ID from database
              if (savedMessage?.messageId) {
                userMessageId = savedMessage.messageId;
                setMessages((prev: any) =>
                  prev.map((msg: any) =>
                    msg.id === tempUserMessageId
                      ? { ...msg, id: savedMessage.messageId }
                      : msg
                  )
                );
              }
              
              localStorage.setItem('active_thread_id', id);
            } catch (err) {
              console.error('Error saving user message to DB:', err);
            }
          }
        }
        
        setStreamError(false);
        setInput(""); // Clear input immediately
    
        if (process.env.NEXT_PUBLIC_STREAM_CHAT === 'true') {
          const controller = new AbortController();
          const signal = controller.signal;
          let chatThreadId = null;
    
          // Initialize correct thread_id
          if (!isPublicAgent) {
            if(id < 0){
              chatThreadId = null
            }
            else{
              chatThreadId = id ? parseInt(id as string) : null;
            }
            // NORMAL MODE: always use the existing URL/thread ID so messages go to the same thread
            
          } else {
            // PUBLIC AGENT MODE: keep the old behavior
            const external_thread_id = Number(localStorage.getItem('external_thread_id'));

            if (external_thread_id) {
              chatThreadId = external_thread_id;
            } else if (!isFirstMessageRef.current) {
              try {
                const response = await fetch(`/api/thread/${id}`);
                if (response.ok) {
                  const threadData = await response.json();
                  chatThreadId = threadData.externalApiId;
                }
              } catch (error) {
                console.error('Error fetching external API ID:', error);
                chatThreadId = null;
              }
            } else {
              chatThreadId = null;
            }
          }
    
          const requestBody: any = {
            chat_thread_id: chatThreadId,
            ...(chatHistory && chatHistory.length > 0 && { history: chatHistory }),
            query_source: "app-ejento",
            overrides: {
              log_intermediate_response: true,
              ...(corpusIds !== null && { corpus_ids: [corpusIds] }),
              retrieve_data_points: true,
            },
            caching_enabled: regenerating ? false : true,
            user_query: question || input,
            is_file_attached : true
          };
          
          setStreamContent("");
          streamContentRef.current = "";
    
          abortConnectionRef.current = await apiService.streamChatRequest(
            requestBody,
            {
              onopen: async (res: any) => {
                if (res.status >= 400 && res.status < 500 && res.status !== 429) {
                  console.error("Client-side error. Response:", res);
                } else if (res.status === 429) {
                  console.error("Rate limited. Please try again later.");
                }
                return Promise.resolve();
              },
              onmessage: async (event: any) => {
                if (hasErrorOccurredRef.current) return;
    
                let parsedStreamData = JSON.parse(event.data);
                setStreaming(true);
                
                let hasEnded = parsedStreamData?.step === 'end';
                let hasError = parsedStreamData?.step === 'error';
                let thoughtProcess = parsedStreamData?.step === 'tools_stream';
                const hasReflection = parsedStreamData?.step === "reflection_end" || parsedStreamData?.step === "reflection_skip";
    
                if (hasReflection) {
                  reflectionEventsRef.current = [...reflectionEventsRef.current, parsedStreamData?.message];
                }
    
                if (thoughtProcess) {
                  isReflectingRef.current = true;
                  thoughtProcessRef.current += parsedStreamData?.delta;
                  setStreamEvents([]);
                }
    
                if (hasEnded) {
                  const response = parsedStreamData?.output;
                  
                  if (!parsedStreamData?.success) {
                    const errorMessage = {
                      role: "assistant",
                      content: `error:: ${response.message}`,
                      id: `error-${Date.now()}`,
                      is_upvote: false,
                      is_downvote: false,
                      followUpQuestions: [],
                      references: [],
                      query: userQuestion,
                      guardrail_triggered: response?.guardrail_triggered || false,
                      blocked: response?.blocked || false,
                    };
                    
                    setMessages((messages: any) => [...messages, errorMessage]);
                    
                    // Save error message to DB in public mode
                    if (isPublicAgent && publicAgentSession) {
                      try {
                        await publicAgentSession.saveMessage(
                          parseInt(id),
                          'assistant',
                          errorMessage.content,
                          {
                            query: userQuestion,
                            guardrail_triggered: errorMessage.guardrail_triggered,
                            blocked: errorMessage.blocked,
                            is_upvote: false,
                            is_downvote: false,
                          }
                        );
                      } catch (err) {
                        console.error('Error saving error message to DB:', err);
                      }
                    }
                  } else {
                    threadName = response.chat_thread_name;
    
                    if (response.thread_id && isFirstMessageRef.current) {
                      if (isPublicAgent) {
                        await updateThreadWithExternalApiId(id, response.thread_id, response.chat_thread_name);
                      }
                    }
                    
                    const activeThreadId = localStorage.getItem('active_thread_id');
                    const responseThreadId = response.thread_id?.toString();
                    const currentThreadId = id?.toString();
                    const isLocalThread = parseInt(id) < 0;
                    
                    const belongsToCurrentThread = isResponseForCurrentThread(
                      activeThreadId,
                      responseThreadId,
                      currentThreadId,
                      isLocalThread
                    );
                    
                    if (belongsToCurrentThread && response.thread_id) {
                      const shouldUpdateUrl = isLocalThread ||
                                            thread_name_from_url === "New Thread" ||
                                            thread_name_from_url === "New Chat";
                      
                      if(isPublicAgent){
                        localStorage.setItem('active_thread_id', id);
                      } else {
                        localStorage.setItem('active_thread_id', response.thread_id.toString());
                      }
                      
                      if (shouldUpdateUrl) {
                        if(isPublicAgent){
                          handleSetQueryParams(id.toString(), response.chat_thread_name);
                        } else {
                          handleSetQueryParams(response.thread_id.toString(), response.chat_thread_name);
                        }
                      }
                    }
                    
                    if (isLocalThread) {
                      if ((window as any).setTransitioningState) {
                        (window as any).setTransitioningState(true);
                      }
                      
                      if ((window as any).updateLocalThreadWithServerId) {
                        (window as any).updateLocalThreadWithServerId(
                          parseInt(id),
                          response.thread_id,
                          response.chat_thread_name
                        );
                      }
                      
                      localStorage.removeItem('thread_id');
                      localStorage.removeItem('query');
                      
                      setTimeout(() => {
                        if ((window as any).setTransitioningState) {
                          (window as any).setTransitioningState(false);
                        }
                      }, 100);
                    }
                    
                    if (belongsToCurrentThread) {
                      const savedReflectionEvents = [...reflectionEventsRef.current];
                      const savedReflectionContents = [...reflectionContentsRef.current];
                      
                      // Create a temporary ID for the assistant message
                      const tempAssistantMessageId = `temp-assistant-${Date.now()}`;
                      
                      const assistantMessage = {
                        role: "assistant",
                        content: response?.answer,
                        query: userQuestion,
                        id: tempAssistantMessageId,
                        agent_response_id: response?.agent_response_id,
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
                      
                      setMessages((messages: any) => [...messages, assistantMessage]);
                      
                      // Save assistant message to database in public mode
                      if (isPublicAgent && publicAgentSession) {
                        try {
                          const savedMessage = await publicAgentSession.saveMessage(
                            parseInt(id),
                            'assistant',
                            response?.answer,
                            {
                              query: userQuestion,
                              agent_response_id: response?.agent_response_id,
                              followUpQuestions: response?.followup_questions,
                              references: response?.references,
                              reflectionEvents: savedReflectionEvents,
                              guardrail_triggered: response?.guardrail_triggered || false,
                              blocked: response?.blocked || false,
                              is_upvote: false,
                              is_downvote: false,
                            }
                          );
                          
                          // Update the message with the real ID from database
                          if (savedMessage?.messageId) {
                            setMessages((prev: any) =>
                              prev.map((msg: any) =>
                                msg.id === tempAssistantMessageId
                                  ? { ...msg, id: savedMessage.messageId }
                                  : msg
                              )
                            );
                          }
                        } catch (err) {
                          console.error('Error saving assistant message to DB:', err);
                        }
                        
                        // Update thread title if first message
                        if (response.chat_thread_name && threadName && isFirstMessageRef.current) {
                          publicAgentSession.updateThreadTitle(id, threadName, response.thread_id)
                            .catch(err => console.error('Error updating thread title in DB:', err));
                        }
                      }
                    }
                  }
                } else if (hasError) {
                  hasErrorOccurredRef.current = true;
                  const response = parsedStreamData?.output;
                  
                  const errorMessage = {
                    role: "assistant",
                    content: `error:: ${response?.error?.details || parsedStreamData?.message}`,
                    id: `error-${Date.now()}`,
                    is_upvote: false,
                    is_downvote: false,
                    followUpQuestions: [],
                    references: [],
                    query: userQuestion,
                    guardrail_triggered: response?.blocked || false,
                    blocked: response?.blocked || false,
                  };
                  
                  setMessages((messages: any) => [...messages, errorMessage]);
                  
                  // Save error message to DB in public mode
                  if (isPublicAgent && publicAgentSession) {
                    try {
                      await publicAgentSession.saveMessage(
                        parseInt(id),
                        'assistant',
                        errorMessage.content,
                        {
                          query: userQuestion,
                          guardrail_triggered: errorMessage.guardrail_triggered,
                          blocked: errorMessage.blocked,
                          is_upvote: false,
                          is_downvote: false,
                        }
                      );
                    } catch (err) {
                      console.error('Error saving error message to DB:', err);
                    }
                  }
    
                  setStreaming(false);
                  setIsLoading(false);
                  streamContentRef.current = "";
                  return;
                } else {
                  const parsedMsg = parsedStreamData?.step;
                  if (parsedMsg === 'assistant_stream') {
                    setStreamEvents([]);
                    setIsLoading(false);
                    if (isReflectingRef.current) {
                      reflectionEventsRef.current = [...reflectionEventsRef?.current, thoughtProcessRef?.current];
                      isReflectingRef.current = false;
                    }
                    streamContentRef.current += parsedStreamData?.delta;
                    setStreamContent(streamContentRef.current);
                  } else {
                    if (parsedMsg === 'error') {
                      console.error(parsedStreamData?.delta);
                      setStreamError(true);
                    }
                    setStreamEvents([parsedStreamData?.message]);
                    if (parsedStreamData?.message !== "") {
                      reflectionEventsRef.current = [...reflectionEventsRef?.current, parsedStreamData?.message];
                    }
                  }
                }
              },
              onclose() {
                const isIncomplete = streamContentRef.current.length < 50;
                if (isIncomplete) {
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
        } else {
          // Non-streaming version
          let chatThreadId = null;
    
          if (!isPublicAgent) {
            chatThreadId = id ? parseInt(id as string) : null;
          } else {
            // PUBLIC AGENT MODE: keep the old behavior
            const external_thread_id = Number(localStorage.getItem('external_thread_id'));
              if (external_thread_id) {
                chatThreadId = external_thread_id;
              } else if (!isFirstMessageRef.current) {
                try {
                  const response = await fetch(`/api/thread/${id}`);
                  if (response.ok) {
                    const threadData = await response.json();
                    chatThreadId = threadData.externalApiId;
                  }
                } catch (error) {
                  console.error('Error fetching external API ID:', error);
                  chatThreadId = null;
                }
              } else {
                chatThreadId = null;
              }
          }
    
          const requestBody: any = {
            chat_thread_id: chatThreadId,
            ...(chatHistory && chatHistory.length > 0 && { history: chatHistory }),
            user_query: userQuestion,
            query_source: "app-ejento",
            is_file_attached: true,
            caching_enabled: regenerating ? false : true,
            overrides: {
              log_intermediate_response: true,
              retrieve_data_points: true
            },
          };
    
          const response: any = await apiService.sendChat(requestBody);
          
          if (!response.success) {
            const errorMessage = {
              role: "assistant",
              content: `error:: ${response.message}`,
              id: `error-${Date.now()}`,
              is_upvote: false,
              is_downvote: false,
              followUpQuestions: [],
              references: [],
              query: userQuestion,
            };
            
            setMessages((messages: any) => [...messages, errorMessage]);
            
            // Save error message to DB in public mode
            if (isPublicAgent && publicAgentSession) {
              try {
                await publicAgentSession.saveMessage(
                  parseInt(id),
                  'assistant',
                  errorMessage.content,
                  {
                    query: userQuestion,
                    is_upvote: false,
                    is_downvote: false,
                  }
                );
              } catch (err) {
                console.error('Error saving error message to DB:', err);
              }
            }
          } else {
            const responseData = response.data;
            threadName = responseData.chat_thread_name;
            
            // Store external API ID only on first message
            if (responseData.thread_id && isFirstMessageRef.current) {
              if (isPublicAgent) {
                await updateThreadWithExternalApiId(id, responseData.thread_id, responseData.chat_thread_name);
              }
            }
            
            const activeThreadId = localStorage.getItem('active_thread_id');
            const responseThreadId = responseData.thread_id?.toString();
            const currentThreadId = id;
            
            const belongsToCurrentThread = isResponseForCurrentThread(
              activeThreadId,
              responseThreadId,
              currentThreadId
            );
            
            if (belongsToCurrentThread) {
              const tempAssistantMessageId = `temp-assistant-${Date.now()}`;
              
              const assistantMessage = {
                role: "assistant",
                content: responseData?.answer,
                query: userQuestion,
                id: tempAssistantMessageId,
                agent_response_id: responseData?.chatlog_id,
                is_upvote: false,
                is_downvote: false,
                followUpQuestions: responseData?.followup_questions,
                references: responseData?.references,
                currentChat: true,
              };
              
              setMessages((messages: any) => [...messages, assistantMessage]);
              
              // Save assistant message in public mode
              if (isPublicAgent && publicAgentSession) {
                try {
                  const savedMessage = await publicAgentSession.saveMessage(
                    parseInt(id),
                    'assistant',
                    responseData?.answer,
                    {
                      query: userQuestion,
                      agent_response_id: responseData?.chatlog_id,
                      followUpQuestions: responseData?.followup_questions,
                      references: responseData?.references,
                      is_upvote: false,
                      is_downvote: false,
                    }
                  );
                  
                  // Update the message with the real ID from database
                  if (savedMessage?.messageId) {
                    setMessages((prev: any) =>
                      prev.map((msg: any) =>
                        msg.id === tempAssistantMessageId
                          ? { ...msg, id: savedMessage.messageId }
                          : msg
                      )
                    );
                  }
                } catch (err) {
                  console.error('Error saving assistant message to DB:', err);
                }
                
                if (responseData.chat_thread_name && threadName && isFirstMessageRef.current) {
                  publicAgentSession.updateThreadTitle(id, threadName, responseData.thread_id)
                    .catch(err => console.error('Error updating thread title in DB:', err));
                }
              }
            }
          }
        }
      } catch (e) {
        console.error(e);
        setIsLoading(false);
        setStreaming(false);
        setStreamContent("");
        streamContentRef.current = "";
        isReflectingRef.current = false;
      } finally {
        if (!streaming) {
          setIsLoading(false);
        }
        setStop(false);
        setReload(false);
        localStorage.removeItem('query');
        localStorage.removeItem('thread_id');
        
        const threadElement = document.getElementById(id);
        if (threadElement) {
          const chatThreadName = threadElement.innerText;
          if (chatThreadName === "New Thread" || chatThreadName === "New Chat") {
            threadElement.innerText = threadName || chatThreadName;
          }
        }
      }
    };
 
    const append = (message: any, regenerating?: boolean, Attachment?: boolean) => {
      if (regenerating && messages.length > 0) {
        // Find the assistant message to regenerate
        const assistantMessageIndex = messages.findIndex((m: any) => 
          m.role === 'assistant' && 
          // For public agent, check both id and agent_response_id
          (m.id === message.id || m.agent_response_id === message.id)
        );
    
        if (assistantMessageIndex !== -1) {
          const userMessageIndex = assistantMessageIndex - 1;
          if (userMessageIndex >= 0 && messages[userMessageIndex].role === 'user') {
            const userQuery = messages[userMessageIndex].content;
            const updatedMessages = [...messages];
            
            // Remove only the assistant message (same as normal mode)
            updatedMessages.splice(assistantMessageIndex, 1);
            setMessages(updatedMessages);
            handleSubmit(userQuery, true, message.id,Attachment);
          }
        } else {
          handleSubmit(message?.query || message?.content,false,undefined,Attachment);
        }
      } else {
        handleSubmit(message?.query || message?.content,false,undefined,Attachment);
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
      updateThreadWithExternalApiId
    };
}