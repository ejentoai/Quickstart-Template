"use client";

import { AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useWindowSize } from "usehooks-ts";
import { ChatHeader } from "@/components/chat/chat-header";
import { decryptData } from "@/lib/utils";
import { Block, type UIBlock } from "../block";
import { BlockStreamHandler } from "../block-stream-handler";
import { MultimodalInput } from "../multimodal-input";
import { Messages } from "./messages";
import { VisibilityType } from "../visibility-selector";
import { getAccessToken } from "@/cookie";
import { useApiService } from "@/hooks/useApiService";
import { useConfig } from "@/app/context/ConfigContext";
import { useSearchParams } from "next/navigation";
import { Skeleton } from "../ui/skeleton";
import { Item } from "@/model";
import { useChat } from "./hooks/useChat";
import { isPublicAgentMode } from "@/lib/storage/indexeddb";
import { usePublicAgentSession } from "@/hooks/usePublicAgentSession";

/**
 * CHAT COMPONENT - Main chat interface
 * 
 * This is the core chat component that handles the entire chat experience.
 * It manages chat messages, corpus selection, streaming responses, and UI state.
 * 
 * Key Features:
 * - Real-time chat messaging with streaming responses
 * - Corpus/knowledge base selection for targeted queries
 * - Message history loading and display
 * - Support for both readonly and interactive modes
 * - Responsive design with mobile support
 * - Integration with authentication and user management
 * 
 * Architecture:
 * - Uses custom useChat hook for chat state management
 * - Integrates with external APIs for corpus data and chat logs
 * - Handles URL parameters for chat ID and title encryption
 * - Manages local storage for thread and query persistence
 */

/**
 * Formats chat data from API response into user/bot pairs
 * Used for displaying conversation history
 * 
 * @param chatArray - Array of chat messages from API
 * @param singleQAIndex - Optional index to extract only one Q&A pair
 * @returns Formatted array of {user: string, bot: string} objects
 */
export function formatChatData(chatArray: any[], singleQAIndex?: number) {
  const result: any = [];
  let currentPair: { user?: string; bot?: string } = {};

  // If singleQAIndex is provided, only process that specific Q&A pair
  if (singleQAIndex !== undefined) {
    const userMessage = chatArray[singleQAIndex - 1]; // Previous message should be user
    const assistantMessage = chatArray[singleQAIndex]; // Current message should be assistant
    
    if (userMessage?.role === "user" && assistantMessage?.role === "assistant") {
      return [{
        user: userMessage.content || 'No user question found',
        bot: assistantMessage.content || 'No agent response found'
      }];
    }
    return []; // Return empty if pair not found
  }

  // Original logic for full conversation
  chatArray.forEach((item) => {
    if (item.role === "user") {
      currentPair.user = item.content;
    } else if (item.role === "assistant") {
      currentPair.bot = item.content;
      result.push(currentPair);
      currentPair = {}; // Reset for the next pair
    }
  });

  return result;
}

/**
 * Main Chat Component Props Interface
 */
interface ChatProps {
  /** Initial messages to display when chat loads */
  initialMessages: Array<any>;
  /** ID of the selected AI model */
  selectedModelId: string;
  /** Chat visibility setting (private/public) */
  selectedVisibilityType: VisibilityType;
  /** Whether chat is in read-only mode (no input allowed) */
  isReadonly: boolean;
}

/**
 * Main Chat Component
 * 
 * Renders the complete chat interface including:
 * - Chat header with model selection and corpus picker
 * - Message history with streaming support
 * - Input area for new messages
 * - Loading states and error handling
 * - Block/document editing overlay
 */
export default function Chat({
  initialMessages,
  selectedModelId,
  selectedVisibilityType,
  isReadonly,
}: ChatProps) {
  const { isLoading: configLoading } = useConfig();
  const apiService = useApiService();
  const [corpus, setCorpus] = useState<any>([]);
  
  // Show loading while config is loading
  if (configLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-lg">Loading configuration...</p>
        </div>
      </div>
    );
  }
  
  // Show message if no config after loading
  if (!apiService) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-lg mb-4">Please configure your API settings</p>
          <a href="/settings" className="text-blue-500 hover:underline">Go to Settings</a>
        </div>
      </div>
    );
  }
  // PUBLIC_AGENT mode: Get session context (must be defined before useChat)
  const isPublicAgent = isPublicAgentMode();
  let publicAgentSession: ReturnType<typeof usePublicAgentSession> | null = null;
  try {
    if (isPublicAgent) {
      publicAgentSession = usePublicAgentSession();
    }
  } catch (error) {
    // Context not available, continue without it
  }
  
  const [selectedCorpus, setSelectedCorpus] = useState<any>({ name: 'all products', version: null, corpusId: null });
  const {
    streamContentRef,
    streaming,
    streamContent,
    streamEvents,
    messages,
    setMessages,
    handleSubmit,
    input,
    setInput,
    append,
    isLoading,
    stop,
    reload,
    data: streamingData,
    chatStarted,
    isCache,
    setIsCache,
    reflectionEventsRef,
    reflectionContentsRef,
    thoughtProcessRef,
    isReflectingRef,
  } = useChat({ selectedCorpus });


  /**
   * Processes raw corpus data from API into structured format with versions
   * 
   * This function:
   * - Groups corpus items by base name
   * - Extracts version information from corpus names (format: "name$$version")
   * - Applies product name standardization/replacements
   * - Filters out excluded corpus types
   * - Returns organized data for the corpus selector dropdown
   * 
   * @param data - Raw corpus data from API
   * @returns Processed array of corpus items with versions and IDs
   */
  function extractCorpusDataWithVersions(data: any[]): Item[] {
    const corpusMap: { [key: string]: Item } = {};
    const excludedCorpus = ["feedback corpus"];

    // Define the replacement mapping for product name standardization
    const replacements: { [key: string]: string } = {
      "Transparent Data Encryption": "Transparent Data Encryption (TDE)",
      "Trusted Postgres Architect": "Trusted Postgres Architect (TPA)"
    };

    data?.forEach((item) => {
      const { corpus } = item;
      let [baseName, version] = corpus?.name?.split("$$");

      // Skip if the corpus name is in the excluded list
      if (excludedCorpus.includes(baseName?.trim()?.toLowerCase())) return;

      // Apply replacements if the base name matches any of the keys
      if (baseName && replacements[baseName?.trim()]) {
        baseName = replacements[baseName?.trim()];
      }

      // If the base name already exists in the map, add the version and corresponding corpusId
      if (corpusMap[baseName]) {
        if (version && !corpusMap[baseName]?.versions?.includes(version?.trim())) {
          corpusMap[baseName]?.versions?.push(version?.trim());
          corpusMap[baseName]?.corpusIds?.push(corpus?.id);  // Push the corresponding corpusId
        }
      } else {
        // If no version exists, push an empty string to ensure the versions array is not empty
        corpusMap[baseName] = {
          name: baseName?.trim(),
          versions: version ? [version?.trim()] : [""],
          corpusIds: version ? [corpus?.id] : [corpus?.id],
        };
      }
    });

    // Return the array of unique items with versions and corresponding corpus IDs
    return Object.values(corpusMap);
  }


  useEffect(() => {
    const fetchData = async () => {
      try {
        const response: any = await apiService.getCorpus();
        if (response.data?.items?.agent_corpus?.length > 0) {
          const result = extractCorpusDataWithVersions(response.data.items.agent_corpus);
          const sortedResult = [...result].sort((a, b) =>
            a.name.toLowerCase().localeCompare(b.name.toLowerCase())
          );
          setCorpus(sortedResult);
          // console.log(sortedResult);
        }
        else {
          setCorpus([])
        }
      } catch (error) {
        console.error("Error fetching corpus data:", error);
      }
    };

    fetchData();

    const selectedCorpus = localStorage.getItem("selectedCorpus");
    if (selectedCorpus) {
      const corpus = JSON.parse(selectedCorpus);
      setSelectedCorpus(corpus);
    }
  }, []);

  const { width: windowWidth = 1920, height: windowHeight = 1080 } =
    useWindowSize();

  const [block, setBlock] = useState<UIBlock>({
    documentId: "init",
    content: "",
    title: "",
    status: "idle",
    isVisible: false,
    boundingBox: {
      top: windowHeight / 4,
      left: windowWidth / 4,
      width: 250,
      height: 50,
    },
  });

  const [attachments, setAttachments] = useState<Array<any>>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [isLoadingChat, setIsLoadingChat] = useState(true);
  const searchParams = useSearchParams();
  const encryptedId = searchParams.get("id");
  const encryptedTitle = searchParams.get("title");
  const id = decryptData(encryptedId);
  const title = decryptData(encryptedTitle);
  const thread_id = typeof window !== 'undefined' ? localStorage.getItem('thread_id') : null;
  const query = typeof window !== 'undefined' ? localStorage.getItem('query') : null;
  // Track the last fetched ID to prevent unnecessary fetchChat calls
  const lastFetchedIdRef = useRef<string | null>(null);
  // Track if we're in a local-to-server transition to prevent unnecessary fetches
  const isTransitioningRef = useRef<boolean>(false);
  
  useEffect(() => {
    // Only fetch if we have an id and it's different from the last fetched id
    // and we're not in the middle of a local-to-server transition
    if (id && id !== lastFetchedIdRef.current && !isTransitioningRef.current) {
      lastFetchedIdRef.current = id;
      fetchChat();
    }
  }, [id]);

  // Expose function to mark transition state
  useEffect(() => {
    (window as any).setTransitioningState = (isTransitioning: boolean) => {
      isTransitioningRef.current = isTransitioning;
    };
    
    return () => {
      delete (window as any).setTransitioningState;
    };
  }, []);

  /**
   * Fetches chat history for the current thread
   * 
   * This function:
   * - Retrieves chat logs from the API using the thread ID
   * - Transforms API response into UI-friendly message format
   * - Handles error states and guardrail-triggered responses
   * - Manages pending user queries from localStorage
   * - Sets up message state for the chat interface
   * 
   * Message transformation includes:
   * - Converting Q&A pairs into separate user/assistant messages
   * - Adding metadata (feedback, references, guardrails)
   * - Handling error responses with retry functionality
   */
  const fetchChat = async () => {
    setIsLoadingChat(true);
    let userQuery: { role: string; content: string | null; }[] = []
    try {
      if (id) {
        // PUBLIC_AGENT mode: Load messages from IndexedDB
        if (isPublicAgent && publicAgentSession) {
          const threadId = id.toString();
          const storedMessages = await publicAgentSession.getThreadMessages(threadId);
          
          if (storedMessages.length > 0) {
            // Transform stored messages to chat format
            const transformedMessages = storedMessages.map((msg: any) => {
              const metadata = msg.metadata || {};
              return {
                role: msg.role,
                content: msg.content,
                ...metadata,
                // Ensure the id field is set from metadata.id (agent_response_id)
                // This is critical for matching messages when updating votes
                id: metadata.id || msg.messageId,
                // Ensure vote fields are always boolean, never undefined
                is_upvote: metadata.is_upvote === true,
                is_downvote: metadata.is_downvote === true,
              };
            });
            
            // Handle pending user query from localStorage
            if (thread_id === id.toString()) {
              userQuery = [{ role: "user", content: query }]
            }
            setMessages([...transformedMessages, ...userQuery]);
          } else {
            // No stored messages, start with empty or pending query
            if (thread_id === id.toString()) {
              userQuery = [{ role: "user", content: query }]
              setMessages(userQuery)
            } else {
              setMessages([]);
            }
          }
          return;
        }
        
        // Normal mode: Use existing server-based logic
        const isLocalThread = parseInt(id) < 0;
        
        if (isLocalThread) {
          // For local threads, don't fetch from API, just start with empty messages
          // Handle pending user query from localStorage if exists
          if (thread_id === id.toString()) {
            userQuery = [{ role: "user", content: query }]
            setMessages(userQuery)
          } else {
            setMessages([]);
          }
        } else {
          // For server threads, fetch chat history as usual
          const response = await apiService.getChatlogs(parseInt(id));
          if (response && response?.data?.agent_responses?.length > 0) {
            // Transform API response into message format
            const transformedMessages = response.data.agent_responses.flatMap((item: any) => [
              { role: "user", content: item.question },
              {
                role: "assistant",
                content: (item?.response?.success || item?.response?.guardrail_triggered) ? item?.response?.answer : 'error::' + item?.response?.message,
                query: item.question,
                id: item.id,
                is_upvote: item.feedback[0]?.is_upvote,
                is_downvote: item.feedback[0]?.is_downvote,
                references: item.response.references,
                guardrail_triggered: item?.response?.guardrail_triggered || false,
                blocked: item?.response?.blocked || false,
                // reflectionEvents: item?.response_steps?.map((step: any) => step?.friendly_message) || [],
              },
            ]);
            // Handle pending user query from localStorage
            if (thread_id === id.toString()) {
              userQuery = [{ role: "user", content: query }]
            }
            setMessages([...transformedMessages, ...userQuery]);
          } else {
            // Handle empty chat history
            if (thread_id === id.toString()) {
              userQuery = [{ role: "user", content: query }]
              setMessages(userQuery)
            } else {
              setMessages([]);
            }
          }
        }
      }
    } catch (e) {
      console.error(e);
      // For local threads or API errors, still allow user to start chatting
      if (thread_id === id?.toString()) {
        userQuery = [{ role: "user", content: query }]
        setMessages(userQuery)
      } else {
        setMessages([]);
      }
    } finally {
      setIsLoadingChat(false);
    }
  };

  return isLoadingChat ? (
    <div className="flex justify-center items-center w-full h-screen">
      <div className="px-10 py-4 space-y-4 sm:w-full md:w-[50vw]">
        <div className="flex justify-end">
          <Skeleton className=" w-2/3 ml-auto" style={{ height: "5rem" }} />
          <Skeleton className="w-8 h-8 rounded-full ml-2" />
        </div>

        <div className="flex items-start space-x-2">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="w-3/4" style={{ height: "10rem" }} />
        </div>

        <div className="flex justify-end">
          <Skeleton className=" w-2/3 ml-auto" style={{ height: "5rem" }} />
          <Skeleton className="w-8 h-8 rounded-full ml-2" />
        </div>

        <div className="flex items-start space-x-2">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="w-3/4" style={{ height: "10rem" }} />
        </div>
      </div>
    </div>
  ) : (
    <>
      {id && !isLoadingChat && (
        <>
          <div className="flex flex-col min-w-0 h-dvh bg-background" style={{ maxWidth: '100vw', overflow: 'hidden' }}>
            <ChatHeader
              chatId={id}
              selectedModelId={selectedModelId}
              selectedVisibilityType={selectedVisibilityType}
              isReadonly={isReadonly}
              chatStarted={chatStarted}
              selectedCorpus={selectedCorpus}
              setSelectedCorpus={setSelectedCorpus}
              corpus={corpus}
              messages={messages}
            />

            <Messages
              streamContentRef={streamContentRef}
              streaming={streaming}
              streamEvents={streamEvents}
              chatId={id}
              setInput={setInput}
              input={input}
              block={block}
              setBlock={setBlock}
              isLoading={isLoadingChat}
              votes={[]}
              messages={messages}
              setMessages={setMessages}
              isLoadingResponse={isLoading}
              reload={reload}
              isReadonly={isReadonly}
              corpus={corpus}
              setSelectedCorpus={setSelectedCorpus}
              selectedCorpus={selectedCorpus}
              append={append}
              setIsFinished={setIsFinished}
              isCache={isCache}
              setIsCache={setIsCache}
              reflectionEventsRef={reflectionEventsRef}
              reflectionContentsRef={reflectionContentsRef}
              thoughtProcessRef={thoughtProcessRef}
              isReflectingRef={isReflectingRef}
            />

            <form className="flex mx-auto my-auto px-4 bg-background pb-4 md:pb-6 gap-2 w-full md:max-w-3xl">            
              {!isReadonly && messages.length > 0 && (
                // <div className="relative">
                  <MultimodalInput
                    chatId={id}
                    input={input}
                    setInput={setInput}
                    handleSubmit={handleSubmit}
                    isLoading={isLoading || streaming}
                    messages={messages}
                    append={append}
                    setIsTextFieldSelected={() => { }}
                    setForceComplete={() => { }}
                    isFinished={isFinished}
                  />

                // </div>
              )}
            </form>
          </div>
          <AnimatePresence>
            {block?.isVisible && (
              <Block
                chatId={id}
                input={input}
                setInput={setInput}
                handleSubmit={handleSubmit}
                isLoading={isLoadingChat}
                stop={stop}
                attachments={attachments}
                setAttachments={setAttachments}
                append={append}
                block={block}
                setBlock={setBlock}
                messages={messages}
                setMessages={setMessages}
                reload={reload}
                votes={[]}
                isReadonly={isReadonly}
              />
            )}
          </AnimatePresence>

          <BlockStreamHandler
            streamingData={streamingData}
            setBlock={setBlock}
          />
        </>
      )}
    </>
  );
}
