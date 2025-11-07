import { PreviewMessage, ThinkingMessage } from './message';
import { Overview } from '../overview';
import { UIBlock } from '../block';
import { Dispatch, memo, SetStateAction, useEffect, useState } from 'react';

import { Item } from "@/model";
import { StreamingMessage } from './streaming-messages';


interface MessagesProps {
  chatId: string;
  setInput: (value: string) => void;
  input: string;
  block: UIBlock;
  setBlock: Dispatch<SetStateAction<UIBlock>>;
  isLoading: boolean;
  votes: Array<any> | undefined;
  messages: Array<any>;
  setMessages: (
    messages: any[] | ((messages: any[]) => any[]),
  ) => void;
  reload: (
    chatRequestOptions?: any,
  ) => Promise<string | null | undefined>;
  isReadonly: boolean;
  isLoadingResponse: boolean
  corpus?: Item[];
  setSelectedCorpus?: (selectedCorpus: any) => void;
  selectedCorpus?: any;
  append: (
    message: any,
    chatRequestOptions?: any,
  ) => Promise<string | null | undefined>;
  setIsFinished: Dispatch<SetStateAction<boolean>>;
  streaming: boolean;
  streamEvents: any;
  streamContentRef: any;
  isCache: boolean;
  setIsCache: Dispatch<SetStateAction<boolean>>;
  reflectionEventsRef: any;
  reflectionContentsRef: any;
  thoughtProcessRef: any;
  isReflectingRef: any;
}

function PureMessages({
  setInput,
  input,
  chatId,
  block,
  setBlock,
  isLoading,
  votes,
  messages,
  setMessages,
  reload,
  isReadonly,
  isLoadingResponse,
  corpus,
  setSelectedCorpus,
  selectedCorpus,
  append,
  setIsFinished,
  streaming,
  streamEvents,
  streamContentRef,
  isCache,
  setIsCache,
  reflectionEventsRef,
  reflectionContentsRef,
  thoughtProcessRef,
  isReflectingRef,
}: Readonly<MessagesProps>) {
  useEffect(() => {
    const chatContainer = document.getElementById("chat-container");

    if (chatContainer) {

      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }, [isLoading, isLoadingResponse]);

  const [isTextFieldSelected, setIsTextFieldSelected] = useState(false);
  const [forceComplete, setForceComplete] = useState(false); // State to force complete the animation
  const [showThoughtProcess, setShowThoughtProcess] = useState(false);
  const toggleThoughtProcess = () => {
    // console.log("toggleThoughtProcess", reflectionEvents);
    setShowThoughtProcess(!showThoughtProcess)
  };
  return (
    <div
      id="chat-container"
      className="flex flex-col min-w-0 gap-6 flex-1 overflow-y-scroll pt-4"
    >
      {messages.length === 0 && !isLoading && <Overview isLoading={isLoadingResponse || streaming} messages={messages} input={input} setInput={setInput} append={append} selectedCorpus={selectedCorpus} corpus={corpus} setSelectedCorpus={setSelectedCorpus} setIsTextFieldSelected={setIsTextFieldSelected} isTextFieldSelected={isTextFieldSelected} forceComplete={forceComplete} setForceComplete={setForceComplete} />}

      {messages.map((message, index) => (
        <PreviewMessage
          streamContentRef={streamContentRef}
          showRetry={index === messages.length - 1}
          key={index}
          messages={messages}
          streaming={streaming}
          chatId={chatId}
          message={message}
          block={block}
          setBlock={setBlock}
          isLoading={isLoading && messages.length - 1 === index}
          index={index}
          vote={
            votes
              ? votes.find((vote) => vote.messageId === message.id)
              : undefined
          }
          setMessages={setMessages}
          reload={reload}
          isReadonly={isReadonly}
          append={append}
          selectedCorpus={selectedCorpus}
          setIsFinished={setIsFinished}
          isCache={isCache}
          setIsCache={setIsCache}
          showThoughtProcessTemp={showThoughtProcess}
          // toggleThoughtProcess={toggleThoughtProcess}
        />
      ))}
      {/* Show streaming message when streaming is active and the last message is from the user */}
      {streaming && messages.length > 0 && messages[messages.length - 1].role === "user" && (
        <StreamingMessage
          streamContentRef={streamContentRef}
          isStreaming={streaming}
          reflectionEvents={reflectionEventsRef}
          reflectionContents={reflectionContentsRef}
          thoughtProcess={thoughtProcessRef}
          isReflecting={isReflectingRef}
          showThoughtProcess={showThoughtProcess}
          toggleThoughtProcess={toggleThoughtProcess}
        />
      )}
      {isLoadingResponse &&
        messages.length > 0 &&
        messages[messages.length - 1].role === 'user' &&  <ThinkingMessage 
          streamEvents={streamEvents} 
          reflectionEvents={reflectionEventsRef}
          isReflecting={isReflectingRef}
          thoughtProcess={thoughtProcessRef}
          showThoughtProcess={showThoughtProcess}
          toggleThoughtProcess={toggleThoughtProcess}
        />}



      <div
        className="shrink-0 min-w-[24px] min-h-[24px]"
      />
    </div>
  );
}

// Remove memo to ensure re-renders during streaming
export const Messages = PureMessages;
