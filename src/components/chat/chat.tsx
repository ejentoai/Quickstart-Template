"use client";

import { AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useWindowSize } from "usehooks-ts";
import { ChatHeader } from "@/components/chat/chat-header";
import { decryptData,encryptData } from "@/lib/utils";
import { Block, type UIBlock } from "../block";
import { BlockStreamHandler } from "../block-stream-handler";
import { MultimodalInput } from "../multimodal-input";
import { Messages } from "./messages";
import { VisibilityType } from "../visibility-selector";
import { useApiService } from "@/hooks/useApiService";
import { useConfig } from "@/app/context/ConfigContext";
import { useSearchParams } from "next/navigation";
import { Skeleton } from "../ui/skeleton";
import { Item } from "@/model";
import { useChat } from "./hooks/useChat";
import { isPublicAgentMode } from "@/lib/storage/indexeddb";
import { usePublicAgentSession } from "@/hooks/usePublicAgentSession";

/**
 * Formats chat data from API response into user/bot pairs
 */
export function formatChatData(chatArray: any[], singleQAIndex?: number) {
  const result: any = [];
  let currentPair: { user?: string; bot?: string } = {};

  if (singleQAIndex !== undefined) {
    const userMessage = chatArray[singleQAIndex - 1];
    const assistantMessage = chatArray[singleQAIndex];
    if (userMessage?.role === "user" && assistantMessage?.role === "assistant") {
      return [{
        user: userMessage.content || 'No user question found',
        bot: assistantMessage.content || 'No agent response found'
      }];
    }
    return [];
  }

  chatArray.forEach((item) => {
    if (item.role === "user") {
      currentPair.user = item.content;
    } else if (item.role === "assistant") {
      currentPair.bot = item.content;
      result.push(currentPair);
      currentPair = {};
    }
  });

  return result;
}

interface ChatProps {
  initialMessages: Array<any>;
  selectedModelId: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
}

export default function Chat({
  initialMessages,
  selectedModelId,
  selectedVisibilityType,
  isReadonly,
}: ChatProps) {
  const { isLoading: configLoading } = useConfig();
  const apiService = useApiService();
  const { width: windowWidth = 1920, height: windowHeight = 1080 } = useWindowSize();
  const [corpus, setCorpus] = useState<any>([]);

  // PUBLIC_AGENT mode
  const isPublicAgent = isPublicAgentMode();
  const publicAgentSession = usePublicAgentSession();

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

  function extractCorpusDataWithVersions(data: any[]): Item[] {
    const corpusMap: { [key: string]: Item } = {};
    const excludedCorpus = ["feedback corpus"];
    const replacements: { [key: string]: string } = {
      "Transparent Data Encryption": "Transparent Data Encryption (TDE)",
      "Trusted Postgres Architect": "Trusted Postgres Architect (TPA)"
    };

    data?.forEach((item) => {
      const { corpus } = item;
      let [baseName, version] = corpus?.name?.split("$$");

      if (excludedCorpus.includes(baseName?.trim()?.toLowerCase())) return;
      if (baseName && replacements[baseName?.trim()]) {
        baseName = replacements[baseName?.trim()];
      }

      if (corpusMap[baseName]) {
        if (version && !corpusMap[baseName]?.versions?.includes(version?.trim())) {
          corpusMap[baseName]?.versions?.push(version?.trim());
          corpusMap[baseName]?.corpusIds?.push(corpus?.id);
        }
      } else {
        corpusMap[baseName] = {
          name: baseName?.trim(),
          versions: version ? [version?.trim()] : [""],
          corpusIds: version ? [corpus?.id] : [corpus?.id],
        };
      }
    });

    return Object.values(corpusMap);
  }

  useEffect(() => {
    const fetchData = async () => {
      if(!apiService) return;
      try {
        const response: any = await apiService.getCorpus();
        if (response.data?.items?.agent_corpus?.length > 0) {
          const result = extractCorpusDataWithVersions(response.data.items.agent_corpus);
          setCorpus([...result].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase())));
        } else {
          setCorpus([]);
        }
      } catch (error) {
        console.error("Error fetching corpus data:", error);
      }
    };

    fetchData();

    const selectedCorpus = localStorage.getItem("selectedCorpus");
    if (selectedCorpus) {
      setSelectedCorpus(JSON.parse(selectedCorpus));
    }
  }, []);

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

  
  const fetchChat = async () => {
    setIsLoadingChat(true);
    try {
      if (!id) {
        setMessages([]);
        return;
      }

      // PUBLIC AGENT MODE
      if (isPublicAgent) {
        const res = await fetch(`/api/thread/${id}`);
        if (!res.ok) throw new Error("Failed to fetch public thread");
        const data = await res.json();
        setMessages(data?.messages || []);
        return;
      }

      // NORMAL MODE
      const response = await apiService.getChatlogs(parseInt(id));
      if (response?.data?.agent_responses?.length > 0) {
        const transformedMessages = response.data.agent_responses.flatMap((item: any) => [
          { role: "user", content: item.question },
          {
            role: "assistant",
            content: item?.response?.success || item?.response?.guardrail_triggered
              ? item?.response?.answer
              : "error::" + item?.response?.message,
            id: item.id,
            is_upvote: item.feedback?.[0]?.is_upvote === true,
            is_downvote: item.feedback?.[0]?.is_downvote === true,
            references: item.response?.references,
            guardrail_triggered: item?.response?.guardrail_triggered || false,
            blocked: item?.response?.blocked || false,
          },
        ]);
        setMessages(transformedMessages);
      } else {
        setMessages([]);
      }

    } catch (error) {
      console.error("Fetch chat failed:", error);
      setMessages([]);
    } finally {
      setIsLoadingChat(false);
    }
  };

  useEffect(() => {
    if (id) fetchChat();
  }, [id]);

  // ======================================
  // RENDERING (UNCHANGED)
  // ======================================
  if (configLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-lg">Loading configuration...</p>
        </div>
      </div>
    );
  }

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
