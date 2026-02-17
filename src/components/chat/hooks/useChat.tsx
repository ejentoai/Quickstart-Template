"use client";

import { useEffect, useRef, useState } from "react";
import { decryptData, encryptData, handleSetQueryParams } from "@/lib/utils";
import { getAccessToken, getEjentoAccessToken, getUserFromCookie } from "@/cookie";
import { useApiService } from "@/hooks/useApiService";
import { useSearchParams, useRouter } from "next/navigation";
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
  currentThreadId: string | undefined
): boolean {
  if (activeThreadId === responseThreadId) return true;
  if (activeThreadId === currentThreadId) return true;
  return false;
}

export function useChat(arg0: { selectedCorpus: any | null }) {
    const apiService = useApiService();
    const router = useRouter();
    const { selectedCorpus } = arg0;
    const [messages, setMessages] = useState<any>([]);
    const { config } = useConfig();
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
 
    const id = decryptData(encryptedId);
    const thread_name_from_url = decryptData(thread_name_from_url_encrypted);
    const [chatStarted, setChatStarted] = useState(false);
    const [promptTemplate, setPromptTemplate] = useState<string>("");
    const [excludeCategory, setExcludeCategory] = useState<string>("");
    const user = getUserFromCookie();
    const userEmail = config?.userInfo?.email || user?.email || user?.data?.email || 'user';
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
              console.log('Thread external API ID status:', !!threadData.externalApiId);
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
          console.log('Successfully updated thread with external API ID:', externalApiId);
        } else {
          console.error('Failed to update thread with external API ID');
        }
      } catch (error) {
        console.error('Error updating thread with external API ID:', error);
      }
    };
 
    const handleSubmit = async (question?: string, regenerating?: boolean, messageIdToRegenerate?: string) => {
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
        if (regenerating && messageIdToRegenerate) {
          const filteredMessages = messages.filter((m: any) =>
            !(m.role === 'assistant' && m.id === messageIdToRegenerate)
          );
          chatHistory = formatChatData(filteredMessages);
        } else {
          chatHistory = formatChatData(messages);
        }
 
        if (!regenerating) {
          const userMessage = { role: "user", content: question || input };
          setMessages((messages: any) => [...messages, userMessage]);
         
          // Save user message to database
          if (isPublicAgent && publicAgentSession) {
            try {
              const threadIdNum = parseInt(id);
              await publicAgentSession.saveMessage(
                threadIdNum,
                'user',
                question || input,
                { query: question || input }
              );
              localStorage.setItem('active_thread_id', id);
            } catch (err) {
              console.error('Error saving user message to DB:', err);
            }
          }
        }
       
        setStreamError(false);
 
        if (process.env.NEXT_PUBLIC_STREAM_CHAT === 'true') {
          const controller = new AbortController();
          const signal = controller.signal;
 
          // CRITICAL FIX: For first message, send null to create external thread
          // For subsequent messages, use the externalApiId from the thread
          let chatThreadId: number | null = null;
         
          if (!isFirstMessageRef.current && hasExternalApiId) {
            // Not first message and we have externalApiId - need to fetch it
            try {
              const response = await fetch(`/api/thread/${id}`);
              if (response.ok) {
                const threadData = await response.json();
                chatThreadId = threadData.externalApiId;
                console.log('Using existing external API ID for request:', chatThreadId);
              }
            } catch (error) {
              console.error('Error fetching external API ID:', error);
              chatThreadId = null; // Fallback to creating new thread
            }
          } else {
            // First message - send null to create external thread
            console.log('First message - sending null to create external thread');
            chatThreadId = null;
          }
 
          console.log('Thread determination:', {
            isFirstMessage: isFirstMessageRef.current,
            hasExternalApiId,
            finalChatThreadId: chatThreadId,
            id
          });
 
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
          };
         
          setInput("");
          setStreamContent("");
          streamContentRef.current = "";
 
          abortConnectionRef.current = await apiService.streamChatRequest(
            requestBody,
            {
              onopen: async (res: any) => {
                if (res.ok && res.status === 200) {
                  console.log("Connection successful");
                } else if (res.status >= 400 && res.status < 500 && res.status !== 429) {
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
                    setMessages((messages: any) => [
                      ...messages,
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
                    ]);
                  } else {
                    threadName = response.chat_thread_name;
                   
                    // CRITICAL FIX: Only update external API ID if this is first message
                    if (response.thread_id && isFirstMessageRef.current) {
                      console.log('Received external API ID from response:', response.thread_id);
                      if (isPublicAgent) {
                        await updateThreadWithExternalApiId(id, response.thread_id, response.chat_thread_name);
                      }
                    }
                   
                    const activeThreadId = localStorage.getItem('active_thread_id');
                    const responseThreadId = response.thread_id?.toString();
                    const currentThreadId = id;
                   
                    const belongsToCurrentThread = isResponseForCurrentThread(
                      activeThreadId,
                      responseThreadId,
                      currentThreadId
                    );
                   
                    // Update URL if needed (only for first message)
                    if (belongsToCurrentThread && response.thread_id && isFirstMessageRef.current) {
                      // Update URL with the external thread ID? No - keep using local DB ID
                      // Just update localStorage
                      localStorage.setItem('active_thread_id', id);
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
                     
                      setMessages((messages: any) => [...messages, assistantMessage]);
                     
                      // Save assistant message to database
                      if (isPublicAgent && publicAgentSession) {
                        try {
                          await publicAgentSession.saveMessage(
                            parseInt(id),
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
                          );
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
                 
                  setMessages((messages: any) => [
                    ...messages,
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
                  ]);
 
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
          // Non-streaming version (similar fixes applied)
          let chatThreadId: number | null = null;
         
          if (!isFirstMessageRef.current && hasExternalApiId) {
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
 
          const requestBody: any = {
            chat_thread_id: chatThreadId,
            ...(chatHistory && chatHistory.length > 0 && { history: chatHistory }),
            user_query: question || input,
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
            ]);
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
             
              setMessages((messages: any) => [...messages, assistantMessage]);
             
              // Save assistant message
              if (isPublicAgent && publicAgentSession) {
                try {
                  await publicAgentSession.saveMessage(
                    parseInt(id),
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
                  );
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
        setInput('');
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
 
    const append = (message: any, regenerating?: boolean) => {
      if (regenerating && messages.length > 0) {
        const assistantMessageIndex = messages.findIndex((m: any) =>
          m.role === 'assistant' && m.id === message.id
        );
 
        if (assistantMessageIndex !== -1) {
          const userMessageIndex = assistantMessageIndex - 1;
          if (userMessageIndex >= 0 && messages[userMessageIndex].role === 'user') {
            const userQuery = messages[userMessageIndex].content;
            const updatedMessages = [...messages];
            updatedMessages.splice(assistantMessageIndex, 1);
            setMessages(updatedMessages);
            handleSubmit(userQuery, true, message.id);
          }
        } else {
          handleSubmit(message?.query || message?.content, false);
        }
      } else {
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