"use client";

import { motion } from "motion/react";
import { Markdown } from "../markdown";
import Image from "next/image";
import bot from "../../../public/bot.png";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronRight, CheckCircle2, XCircle, Clock, Loader2, FileText } from "lucide-react";
import type { DeepAgentTodo, DeepAgentFile } from "./hooks/useChat";
import { DeepAgentFileModal } from "./deep-agent-file-modal";

interface StreamingMessageProps {
  streamContentRef: any;
  isStreaming: boolean;
  hasReflectionEvents?: boolean;
  reflectionEvents?: {
    current: string[];
  };
  reflectionContents?: any;
  thoughtProcess?: any;
  isReflecting?: any;
  showThoughtProcess?: boolean;
  toggleThoughtProcess?: () => void;
  deepAgentTodos?: DeepAgentTodo[];
  deepAgentFiles?: DeepAgentFile[];
}

export function StreamingMessage({
  streamContentRef,
  isStreaming,
  hasReflectionEvents = true,
  reflectionEvents = { current: ["Analyzing user request...", "Processing trip details...", "Generating response..."] },
  reflectionContents = ["Analyzing user request...", "Processing trip details...", "Generating response..."],
  thoughtProcess = "Thinking...",
  isReflecting = {current: false},
  showThoughtProcess = false,
  toggleThoughtProcess = () => {},
  deepAgentTodos = [],
  deepAgentFiles = [],
}: Readonly<StreamingMessageProps>) {
  const [expandedEvents, setExpandedEvents] = useState<{[key: number]: boolean}>({});
  const [showTodos, setShowTodos] = useState(true);
  const [showFiles, setShowFiles] = useState(true);
  const [selectedFile, setSelectedFile] = useState<DeepAgentFile | null>(null);
  const eventRefs = useRef<{[key: number]: HTMLDivElement | null}>({});
  const maxHeight = 100; // Maximum height in pixels before showing toggle

  const toggleEventExpansion = (index: number) => {
    setExpandedEvents(prev => ({...prev, [index]: !prev[index]}));
  };


  const getMaxHeight = (index: number): string => {
    const element = eventRefs.current[index];
    if (!element) return 'none';
    return !expandedEvents[index] && element.scrollHeight > (maxHeight - 10)
      ? `${maxHeight}px` 
      : `${element.scrollHeight}px`;
  };

  const shouldShowToggle = (index: number): boolean => {
    const element = eventRefs.current[index];
    // Show toggle even for slightly smaller content
    return element ? element.scrollHeight > (maxHeight - 10) : false;
  };

  if (!isStreaming || (streamContentRef?.current?.length < 1)) return null;
  
  return (
    <motion.div
      className="w-full mx-auto max-w-3xl px-4 group/message"
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      data-role="assistant"
    >
      <div className="flex gap-4 w-[90%]">
        <div className="size-8 flex items-center rounded-full p-1 justify-center shrink-0">
          <Image
            src={bot}
            alt="Assistant Avatar"
            height={50}
            width={50}
          />
        </div>

        <div className="flex flex-col gap-2 w-[90%] mt-1">
          {hasReflectionEvents && (
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
                          'line-clamp-2 max-h-[40px]': thoughtProcess?.current?.length < 200,
                          'line-clamp-3 max-h-[60px]': thoughtProcess?.current?.length >= 200 && thoughtProcess?.current?.length < 400,
                          'line-clamp-4 max-h-[80px]': thoughtProcess?.current?.length >= 400
                        }
                      )}
                    >
                      {!showThoughtProcess ? (isReflecting?.current 
                        ? thoughtProcess?.current
                        : (reflectionEvents?.current?.[reflectionEvents.current.length - 1] || "Analyzing...")
                      ) : ''}
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
                <div className="bg-gray-50 px-4 py-3 rounded-b-lg border-t border-gray-100">
                  <div className="overflow-y-auto transition-[max-height] duration-300 ease-in-out"
                       style={{ 
                         maxHeight: reflectionEvents?.current?.length > 3 ? '300px' : 'fit-content',
                         minHeight: 'fit-content'
                       }}>
                    {reflectionEvents?.current?.map((event, index) => (
                      <div key={index} className="mb-4 last:mb-0 text-sm text-gray-700 relative pl-6">
                        <div className="absolute left-0 top-[6px] size-[6px] bg-gray-400 rounded-full"></div>
                        {index < reflectionEvents?.current?.length - 1 && (
                          <div className="absolute left-[2.5px] top-[20px] w-0 border-l border-gray-200 h-full"></div>
                        )}
                        <div 
                          ref={(el: HTMLDivElement | null) => {
                            eventRefs.current[index] = el;
                          }}
                          className="leading-relaxed overflow-hidden transition-all duration-300"
                          style={{
                            maxHeight: getMaxHeight(index)
                          }}
                        >
                          <Markdown message={{ role: "assistant" }}>
                            {(isReflecting?.current && (index > reflectionEvents?.current?.length-1)) 
                              ? thoughtProcess?.current 
                              : event}
                          </Markdown>
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
                              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-50 to-transparent pointer-events-none" />
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {reflectionEvents?.current?.length > 3 && (
                    <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-50 to-transparent pointer-events-none" />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Deep Agent Tasks */}
          {deepAgentTodos.length > 0 && (
            <div className="w-full max-w-xl">
              <button
                type="button"
                className={`w-full text-left bg-gray-50 hover:bg-gray-100 transition-colors rounded-lg ${showTodos ? 'rounded-b-none' : ''}`}
                onClick={() => setShowTodos(!showTodos)}
              >
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Tasks ({deepAgentTodos.length})
                  </span>
                  {showTodos ? (
                    <ChevronDown className="h-4 w-4 text-gray-500 shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-500 shrink-0" />
                  )}
                </div>
              </button>
              {showTodos && (
                <div className="bg-gray-50 px-4 py-3 rounded-b-lg border-t border-gray-100 space-y-2">
                  {deepAgentTodos.map((todo, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      {todo.status === 'completed' && <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />}
                      {todo.status === 'failed' && <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />}
                      {todo.status === 'in_progress' && <Loader2 className="h-4 w-4 text-blue-500 mt-0.5 shrink-0 animate-spin" />}
                      {todo.status === 'pending' && <Clock className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />}
                      <span className={todo.status === 'completed' ? 'line-through text-gray-400' : ''}>{todo.content}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Deep Agent Files */}
          {deepAgentFiles.length > 0 && (
            <div className="w-full max-w-xl">
              <button
                type="button"
                className={`w-full text-left bg-gray-50 hover:bg-gray-100 transition-colors rounded-lg ${showFiles ? 'rounded-b-none' : ''}`}
                onClick={() => setShowFiles(!showFiles)}
              >
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Files ({deepAgentFiles.length})
                  </span>
                  {showFiles ? (
                    <ChevronDown className="h-4 w-4 text-gray-500 shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-500 shrink-0" />
                  )}
                </div>
              </button>
              {showFiles && (
                <div className="bg-gray-50 px-4 py-3 rounded-b-lg border-t border-gray-100 space-y-1.5">
                  {deepAgentFiles.map((file, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedFile(file)}
                      className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors text-left"
                    >
                      <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                      <span className="truncate">{file.name}</span>
                      {file.unread && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedFile && (
            <DeepAgentFileModal file={selectedFile} onClose={() => setSelectedFile(null)} />
          )}

          <div className="flex flex-row gap-2 items-start">
            <div
              className={cn("flex flex-col gap-4")}
              style={{ maxWidth: '100%', textWrap: 'wrap', wordBreak: 'break-word' }}
            >
              <div className="answer-chat">
                <Markdown message={{ role: "assistant" }}>{streamContentRef.current}</Markdown>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}