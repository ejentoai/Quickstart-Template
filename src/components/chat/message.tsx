"use client";

/**
 * MESSAGE COMPONENT - Individual chat message display and interaction
 * 
 * This component handles the rendering and interaction of individual chat messages.
 * It supports both user and assistant messages with rich features including:
 * 
 * Key Features:
 * - Rich text rendering with markdown support
 * - Citation handling and reference linking
 * - Thought process display for AI reasoning
 * - Message editing capabilities
 * - Typewriter effect for streaming responses
 * - Error handling and retry functionality
 * - Expandable content sections
 * - Feedback and action buttons
 * 
 * Architecture:
 * - Uses memo for performance optimization
 * - Implements custom typewriter hook for streaming
 * - Handles complex text parsing and sanitization
 * - Integrates with external citation and reference systems
 */

import cx from "classnames";
import { motion } from "motion/react";
import { memo, useState, useEffect, useRef, useMemo, type Dispatch, type SetStateAction } from "react";
import type { UIBlock } from "../block";
import { Markdown } from "../markdown";
import { MessageActions } from "./message-actions";
import equal from "fast-deep-equal";
import { cn } from "@/lib/utils";
import { MessageEditor } from "./message-editor";
import bot from "../../../public/bot.png";
import Image from "next/image";
import DOMPurify from 'dompurify';
import { ChevronUp, ChevronDown, ChevronRight } from "lucide-react";
import { getEjentoAccessToken } from "@/cookie";

/**
 * Message Interface - Structure for chat messages
 */
interface Message {
  /** Unique identifier for the message */
  id: string;
  /** Role of the message sender */
  role: "user" | "assistant";
  /** Main content of the message */
  content: string;
  /** Citations and references for assistant responses */
  references?: { number: string; url: string; order: string }[];
  /** Whether this is the current/active chat message */
  currentChat?: boolean;
  /** AI reasoning steps for thought process display */
  reflectionEvents?: string[];
}

/**
 * Custom hook for typewriter effect
 * 
 * Creates a typewriter animation effect for text display,
 * useful for streaming AI responses to create a more natural feel.
 * 
 * @param text - The text to animate
 * @param speed - Speed of typing in milliseconds per word
 * @returns Object with displayText and isFinished status
 */
const useTypewriter = (text: string, speed = 30) => {
  const [displayText, setDisplayText] = useState('');
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    const words = text?.split(' '); // Split the text into words
    let index = 0;

    const typeWord = () => {
      if (index < words?.length) {
        setDisplayText((prevText) =>
          prevText ? `${prevText} ${words[index]}` : words[index]
        );
        index++;
        if (index < words?.length) {
          setTimeout(typeWord, speed); // Schedule next word only if more words exist
        } else {
          setIsFinished(true); // Mark as finished when all words are typed
        }
      }
    };

    setIsFinished(false); // Reset the finished state when text or speed changes
    typeWord(); // Start typing words

    return () => {
      setDisplayText(''); // Reset the display text when unmounting
      setIsFinished(false); // Reset the finished state
    };
  }, [text, speed]);

  return { displayText, isFinished };
};

/**
 * Preview Message Component Props Interface
 */
interface PreviewMessageProps {
  chatId: string;
  message: any;
  block: UIBlock;
  setBlock: Dispatch<SetStateAction<UIBlock>>;
  vote: any | undefined;
  isLoading: boolean;
  setMessages: (messages: any[] | ((messages: any[]) => any[])) => void;
  reload: (chatRequestOptions?: any) => Promise<string | null | undefined>;
  isReadonly: boolean;
  index: number;
  messages: Array<any>;
  selectedCorpus?: any;
  showRetry: boolean;
  append: (message: any, chatRequestOptions?: any) => Promise<string | null | undefined>;
  setIsFinished: Dispatch<SetStateAction<boolean>>;
  streaming: boolean;
  streamContentRef: any;
  isCache: boolean;
  setIsCache: Dispatch<SetStateAction<boolean>>;
  showThoughtProcessTemp: boolean;
}

/**
 * Pure Preview Message Component
 * 
 * This is the main implementation for rendering individual chat messages.
 * It handles complex text processing, citation parsing, thought process display,
 * and various interactive features.
 * 
 * Key responsibilities:
 * - Text sanitization and citation processing
 * - Thought process expansion/collapse
 * - Error handling and retry functionality
 * - Typewriter effect for streaming responses
 * - Integration with message actions and editing
 */

const PurePreviewMessage = ({
  chatId,
  message,
  block,
  setBlock,
  vote,
  isLoading,
  setMessages,
  reload,
  isReadonly,
  index,
  messages,
  selectedCorpus,
  append,
  showRetry,
  setIsFinished,
  streaming,
  streamContentRef,
  isCache,
  setIsCache,
  showThoughtProcessTemp,
}: PreviewMessageProps) => {
  // Component state management
  const [mode, setMode] = useState<"view" | "edit">("view"); // Toggle between view and edit modes
  const [showThoughtProcess, setShowThoughtProcess] = useState(showRetry ? showThoughtProcessTemp : false); // Control thought process visibility
  const [expandedEvents, setExpandedEvents] = useState<{[key: number]: boolean}>({}); // Track which thought events are expanded
  const eventRefs = useRef<{[key: number]: HTMLDivElement | null}>({}); // References for measuring content height
  const maxHeight = 100; // Threshold for showing expand/collapse buttons

  // Memoized assistant message object for markdown rendering
  const assistantMessage = useMemo(() => ({ role: "assistant" }), []);

  // Parse reflection events for thought process display
  const parsedEvents = useMemo(() => {
    return message.reflectionEvents?.map((event: string) => parseText(event, ``)) || [];
  }, [message.reflectionEvents]);

  /**
   * Cleans and processes citations in message text
   * 
   * Converts citation markers like [1] into clickable links that point to
   * the appropriate reference URLs. Handles both external URLs and internal
   * citation systems.
   * 
   * @param text - The text containing citation markers
   * @param message - Message object containing reference data
   * @returns Processed text with citation links
   */
  function cleanCitations(text: string, message: { references: { number: string, url: string, order: string }[] }) {
    return text?.replace(/\[(\d+)\](?!:)/g, (match, number) => {
      // Find the URL for the reference using the captured number
      const reference = message?.references?.find((x: any) => parseInt(x.number) === parseInt(number));
      const url = reference ? reference.url : '';  // Use an empty string if no reference is found
      const access_token = getEjentoAccessToken();
      if (!url) return ''
      if (url?.includes("https://") || url?.includes("www.")) {
        return `[${reference?.order}](${url})`;  // Replace with formatted reference
      } else {
        // if(process.env.NEXT_PUBLIC_SHOW_CITATION == 'true') {
        //   return `[${reference?.order}](${process.env.NEXT_PUBLIC_CITATION_URL}${encodeURI(url)}?access_token=${access_token})`;  // Replace with formatted reference  // Replace with formatted reference
        // } 
        // else {
          return ``;  // Replace with formatted reference  // Replace with formatted reference
        // }
      }
    });
  }

  /**
   * Parses and sanitizes message text content
   * 
   * This function handles complex text processing including:
   * - HTML sanitization for security
   * - Table extraction and formatting
   * - Citation processing and link conversion
   * - Markdown link handling within tables
   * 
   * @param text - Raw text content to process
   * @param path - Base path for citation URLs
   * @returns Processed and sanitized text ready for display
   */
  function parseText(text: string, path: any) {
    const sanitizedAnswerHtml = DOMPurify.sanitize(text);

    let replacedString = sanitizedAnswerHtml

    const regexTable = /@([\s\S]*?<table[\s\S]*?<\/table>[\s\S]*?)@/g;

    replacedString = replacedString?.replace(regexTable, (match, p1) => {
      // Trim any additional @ characters from the beginning and end of p1
      const tableRegex = /(<table[\s\S]*?<\/table>)/;
      const tableMatch = p1.match(tableRegex);

      if (tableMatch && tableMatch[1]) {
        // Convert markdown links to HTML anchors inside table cells
        let tableContent = tableMatch[1]?.replace(/<td[^>]*>([\s\S]*?)<\/td>/g, (match: any, cellContent: any) => {
          // Clean citations and convert markdown links to HTML anchors
          const cleanedContent = match
          const withLinks = cleanedContent?.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match: any, text: any, url: any) => {
            return `<a href="${url}" target="_blank" className="text-blue-800 hover:underline bg-[#D1DBFA] text-[10px] p-1 m-0.5 rounded-sm">${text}</a>`;
          });
          return `${withLinks}`;
        });

        return `<div id="identifyTable">${tableContent}</div>`;
      }
      
      return match;
    });

    let processedString = cleanCitations(replacedString, message);
    return processedString;
  }

  const updatedMsg = parseText(
    message.content as string,
    `${''}`
  );

  const handleRegenerateclick = () => {
    append(message, true)
  }

  const {displayText, isFinished} = useTypewriter(updatedMsg, 20);

  useEffect(() => {
    setIsFinished(isFinished);
  }, [isFinished])

  const toggleThoughtProcess = () => {
    setShowThoughtProcess(!showThoughtProcess);
  };

  const toggleEventExpansion = (index: number) => {
    setExpandedEvents(prev => ({...prev, [index]: !prev[index]}));
  };

  // Re-check heights when thought process is shown
  useEffect(() => {
    if (showThoughtProcess) {
      // Small delay to ensure content is rendered
      setTimeout(() => {
        message.reflectionEvents?.forEach((_ : any, index: number) => {
          const element = eventRefs.current[index];
          if (element && element.scrollHeight > maxHeight) {
            setExpandedEvents(prev => ({...prev, [index]: false}));
          }
        });
      }, 0);
    }
  }, [showThoughtProcess]);

  const getMaxHeight = (index: number): string => {
    const element = eventRefs.current[index];
    if (!element) return 'none';
    return !expandedEvents[index] && element.scrollHeight > 100
      ? '100px' 
      : `${element.scrollHeight}px`;
  };

  const shouldShowToggle = (index: number): boolean => {
    const element = eventRefs.current[index];
    return element ? element.scrollHeight > 100 : false;
  };

  return (
    <motion.div
      className="w-full mx-auto max-w-3xl px-4 group/message"
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      data-role={message.role}
    >
      <div
        style={{ maxWidth: '100%' }}
        className={cn(
          "flex gap-4 w-full group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl",
          {
            "w-full": mode === "edit",
            "group-data-[role=user]/message:w-fit": mode !== "edit",
          }
        )}
      >
        {message.role === "assistant" && (
          <div className="size-8 flex items-center rounded-full p-1 justify-center shrink-0 ">
            <Image
              src={bot}
              alt="Supply Chain Illustration"
              height={50}
              width={50}
            />
          </div>
        )}

        <div className="flex flex-col gap-2 w-full mt-1">
          {message.role === "assistant" && message.reflectionEvents?.length > 1 && (
            <div className="w-full max-w-xl">
              <div className="flex">
                <button 
                  className={`inline-flex items-center gap-2 px-4 py-2 cursor-pointer ${showThoughtProcess ? 'rounded-t-md' : 'rounded-md'}`}
                  onClick={toggleThoughtProcess}
                >
                  <div className="flex items-center gap-1.5">
                    <span 
                      className={cn(
                        "text-sm text-[#666] font-medium transition-all duration-300",
                        !showThoughtProcess && "overflow-hidden",
                        !showThoughtProcess && {
                          'line-clamp-2 max-h-[40px]': message.reflectionEvents?.[message.reflectionEvents.length - 1]?.length < 200,
                          'line-clamp-3 max-h-[60px]': message.reflectionEvents?.[message.reflectionEvents.length - 1]?.length >= 200 && message.reflectionEvents?.[message.reflectionEvents.length - 1]?.length < 400,
                          'line-clamp-4 max-h-[80px]': message.reflectionEvents?.[message.reflectionEvents.length - 1]?.length >= 400
                        }
                      )}
                    >
                      Thought
                    </span>
                    {showThoughtProcess ? (
                      <ChevronDown className="h-4 w-4 text-[#666] ml-1" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-[#666] ml-1" />
                    )}
                  </div>
                </button>
              </div>
              
              {showThoughtProcess && (
                <div className="px-5 py-4 rounded-b-md w-full bg-transparent">
                  <div className="relative pb-0">
                    {/* Timeline events */}
                    {message.reflectionEvents?.map((event: string, index: number) => (
                      <div key={index} className="mb-6 text-xs text-[#4b5563] font-normal relative pl-6">
                        <div className="absolute left-0 top-[6px] size-[6px] bg-gray-400 rounded-full"></div>
                        {/* Show connecting line for all items including the last one */}
                        <div className="absolute left-[2.5px] top-[20px] w-0 border-l border-gray-200 h-full"></div>
                        <div 
                          ref={(el: HTMLDivElement | null) => {
                            eventRefs.current[index] = el;
                          }}
                          className="leading-relaxed overflow-hidden transition-all duration-300"
                          style={{
                            maxHeight: getMaxHeight(index)
                          }}
                        >
                          <Markdown message={assistantMessage}>{parsedEvents[index]}</Markdown>
                        </div>
                        
                        {shouldShowToggle(index) && (
                          <div className="mt-2">
                            <button
                              onClick={() => toggleEventExpansion(index)}
                              className="text-xs text-black hover:text-primary font-medium"
                            >
                              {expandedEvents[index] ? 'Show less' : 'Show more'}
                            </button>
                            {!expandedEvents[index] && (
                              <div className="absolute bottom-6 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none z-10" />
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    <div className="mb-1 text-xs relative pl-6">
                      <div className="absolute left-[-5px] top-[6px] w-4 h-4 rounded-full bg-[#10b981] flex items-center justify-center text-white text-[10px]">✓</div>
                      <div className="leading-relaxed flex items-center">
                        <span className="text-[#10b981] font-medium text-center">Done</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {message.content && mode === "view" && (
            <div className="flex flex-row gap-2 items-start">
              {
                <div
                  className={cn("flex flex-col gap-4", {
                    "bg-primary text-background px-3 py-2 rounded-xl":
                      message.role === "user",
                  })}
                  style={{ maxWidth: message.role === "user" ? '100%' : '', textWrap: 'wrap', wordBreak: 'break-word', backgroundColor: message.role === 'user' ? '#FF6B35' : '' }}
                >
                  {
                    message.content.includes('error::') ?
                      <div style={{ backgroundColor: '#fadede' }} className="px-3 py-2 rounded-xl">
                        <p style={{ color: 'red' }} className="pe-1">{!message.content.includes('undefined') ? message.content.split('::')[1] : `An unexpected error occurred. Please try again. `}</p>
                        <button
                          style={{
                            textDecoration: 'underline',
                          }}
                          onClick={handleRegenerateclick}>Retry</button>
                      </div>
                      :
                      <div className="answer-chat">
                        {(message.role !== 'user' && showRetry && message.currentChat) ? 
                        (<Markdown message={message}>{isCache ? displayText as string : updatedMsg as string}</Markdown>)
                        :
                        <Markdown message={message}>{updatedMsg as string}</Markdown>
                        }
                      </div>
                  }
                </div>
              }
            </div>
          )}

          {message.content && mode === "edit" && (
            <div className="flex flex-row gap-2 items-start">
              <div className="size-8" />
              <MessageEditor
                key={message.id}
                message={message}
                setMode={setMode}
                setMessages={setMessages}
                reload={reload}
              />
            </div>
          )}

        {!isReadonly && <MessageActions
              messages={messages}
              key={`action-${message.id}`}
              chatId={chatId}
              message={message}
              vote={vote}
              isLoading={isLoading}
              setMessages={setMessages}
              append={append}
              showRetry={showRetry}
              index={index}
              // hasFinished={isFinished}
            />
          }
        </div>
      </div>
    </motion.div>
  );
};

export const PreviewMessage = memo(
  PurePreviewMessage,
  (prevProps, nextProps) => {
    if (prevProps.isLoading !== nextProps.isLoading) return false;
    if (prevProps.isLoading && nextProps.isLoading) return false;
    if (prevProps.message.content && nextProps.message.content) return false;
    if (!equal(prevProps.vote, nextProps.vote)) return false;
    // Check if vote state changed (is_upvote or is_downvote)
    if (prevProps.message.is_upvote !== nextProps.message.is_upvote) return false;
    if (prevProps.message.is_downvote !== nextProps.message.is_downvote) return false;
    return true;
  }
);

export const ThinkingMessage = ({streamEvents, reflectionEvents, isReflecting, thoughtProcess, showThoughtProcess, toggleThoughtProcess}: {streamEvents: any, reflectionEvents: any, isReflecting: any, thoughtProcess: any, showThoughtProcess: any, toggleThoughtProcess: any}) => {
  const role = "assistant";
  const [expandedEvents, setExpandedEvents] = useState<{[key: number]: boolean}>({});
  const eventRefs = useRef<{[key: number]: HTMLDivElement | null}>({});
  const maxHeight = 100; // Lower threshold to make show more/less more sensitive
  const ISSTREAMINGON = process.env.NEXT_PUBLIC_STREAM_CHAT == 'true';

  const toggleEventExpansion = (index: number) => {
    setExpandedEvents(prev => ({...prev, [index]: !prev[index]}));
  };

  // Calculate all events to display - combine reflection events and current thought process
  const allEvents = useMemo(() => {
    const events = [...(reflectionEvents?.current || [])];
    if (isReflecting?.current && thoughtProcess?.current) {
      events.push(thoughtProcess.current);
    }
    return events;
  }, [reflectionEvents?.current, isReflecting?.current, thoughtProcess?.current]);

  // Re-check heights when thought process is shown
  useEffect(() => {
    if (showThoughtProcess) {
      // Small delay to ensure content is rendered
      setTimeout(() => {
        allEvents?.forEach((_, index) => {
          const element = eventRefs.current[index];
          if (element && element.scrollHeight > maxHeight) {
            setExpandedEvents(prev => ({...prev, [index]: false}));
          }
        });
      }, 0);
    }
  }, [showThoughtProcess, allEvents]);

  const getMaxHeight = (index: number): string => {
    const element = eventRefs.current[index];
    if (!element) return 'none';
    return !expandedEvents[index] && element.scrollHeight > maxHeight
      ? '100px' 
      : `${element.scrollHeight}px`;
  };

  const shouldShowToggle = (index: number): boolean => {
    const element = eventRefs.current[index];
    return element ? element.scrollHeight > maxHeight : false;
  };

  const getLatestEvent = () => {
    if (isReflecting?.current && thoughtProcess?.current) {
      return thoughtProcess.current;
    }
    return reflectionEvents?.current?.[reflectionEvents.current.length - 1] || streamEvents;
  };

  if (!ISSTREAMINGON) {
    return (
      <motion.div
      className="w-full mx-auto max-w-3xl px-4 group/message"
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1, transition: { delay: 1 } }}
      data-role={role}
    >
      <div className="flex gap-4 w-[90%]">
        <div className="size-8 flex items-center rounded-full p-1 justify-center shrink-0">
          <Image
            src={bot}
            alt="Supply Chain Illustration"
            height={50}
            width={50}
          />
        </div>

        <div className="flex flex-col gap-2 w-[90%] mt-1">
        <span 
          className={cn(
            "text-sm text-gray-700 transition-all duration-300",
            )}
        >
          Thinking...
        </span>
        </div>
      </div>
    </motion.div>
    );
  }

  return (
    <motion.div
      className="w-full mx-auto max-w-3xl px-4 group/message"
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1, transition: { delay: 1 } }}
      data-role={role}
    >
      <div className="flex gap-4 w-[90%]">
        <div className="size-8 flex items-center rounded-full p-1 justify-center shrink-0">
          <Image
            src={bot}
            alt="Supply Chain Illustration"
            height={50}
            width={50}
          />
        </div>

        <div className="flex flex-col gap-2 w-[90%] mt-1">
          <div className="w-full max-w-xl">
            <button 
              className={`w-full text-left bg-gray-50 hover:bg-gray-100 transition-colors rounded-lg ${showThoughtProcess ? 'rounded-b-none' : ''}`}
              onClick={toggleThoughtProcess}
            >
              <div className="px-4 py-3 flex items-center justify-between">
                <div className="flex flex-col gap-1 w-full">
                  <span 
                    className={cn(
                      "text-sm text-gray-700 transition-all duration-300",
                      !showThoughtProcess && "overflow-hidden",
                      !showThoughtProcess && {
                        'line-clamp-2 max-h-[40px]': getLatestEvent()?.length < 200,
                        'line-clamp-3 max-h-[60px]': getLatestEvent()?.length >= 200 && getLatestEvent()?.length < 400,
                        'line-clamp-4 max-h-[80px]': getLatestEvent()?.length >= 400
                      }
                    )}
                  >
                    {!showThoughtProcess ? getLatestEvent() : ''}
                  </span>
                </div>
                {showThoughtProcess ? (
                  <ChevronDown className="h-4 w-4 text-gray-500 shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-500 shrink-0" />
                )}
              </div>
            </button>
            
            {showThoughtProcess && (
              <div className="bg-gray-50 px-4 py-2 rounded-b-lg border-t border-gray-100">
                <div>
                  {allEvents?.map((event, index) => (
                    <div key={index} className="mb-6 text-xs text-[#4b5563] font-normal relative pl-6">
                      <motion.div 
                        className={`absolute left-0 top-[6px] size-[6px] rounded-full ${
                          index === allEvents?.length - 1 
                            ? 'bg-primary' 
                            : 'bg-gray-400'
                        }`}
                        animate={index === allEvents?.length - 1 ? {
                          scale: [1, 1.2, 1],
                          opacity: [0.7, 1, 0.7]
                        } : {
                          scale: 1,
                          opacity: 1
                        }}
                        transition={index === allEvents?.length - 1  ? {
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "easeInOut"
                        } : {
                          duration: 0
                        }}
                      />
                      {index < allEvents?.length - 1 && (
                        <div className="absolute left-[2.5px] top-[20px] w-0 border-l border-gray-200 h-full"></div>
                      )}
                      <motion.div 
                        ref={(el: HTMLDivElement | null) => {
                          eventRefs.current[index] = el;
                        }}
                        className={cn("leading-relaxed overflow-hidden transition-all duration-300", {
                          "max-h-[100px]": !expandedEvents[index] && shouldShowToggle(index)
                        })}
                        style={{
                          maxHeight: getMaxHeight(index)
                        }}
                        animate={index === allEvents?.length - 1 ? {
                          opacity: [0.8, 1, 0.8]
                        } : {
                          opacity: 1
                        }}
                        transition={index === allEvents?.length - 1 ? {
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut"
                        } : {
                          duration: 0
                        }}
                      >
                        {event}
                      </motion.div>
                      
                      {shouldShowToggle(index) && (
                        <div className="mt-2">
                          <button
                            onClick={() => toggleEventExpansion(index)}
                            className="text-xs text-black hover:text-primary font-medium"
                          >
                            {expandedEvents[index] ? 'Show less' : 'Show more'}
                          </button>
                          {!expandedEvents[index] && (
                            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-50 to-transparent pointer-events-none" />
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
