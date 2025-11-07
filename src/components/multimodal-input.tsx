'use client';

import type {
  ChatRequestOptions,
  CreateMessage,
} from 'ai';
import cx from 'classnames';
import type React from 'react';
import {
  useRef,
  useEffect,
  useState,
  useCallback,
  memo,
} from 'react';
import { toast } from 'sonner';
import { useLocalStorage, useWindowSize } from 'usehooks-ts';
import { AnimatedMicIcon, ArrowUpIcon, MicIcon } from './icons';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
// import { SuggestedActions } from './suggested-actions';
import 'regenerator-runtime/runtime';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

function PureMultimodalInput({
  chatId,
  input,
  setInput,
  isLoading,
  messages,
  append,
  handleSubmit,
  className,
  setIsTextFieldSelected,
  isTextFieldSelected,
  setForceComplete,
  isFinished
}: {
  chatId: string;
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  messages: Array<any>;
  append: (
    message: any | CreateMessage,
    chatRequestOptions?: ChatRequestOptions,
  ) => Promise<string | null | undefined>;
  handleSubmit: (
    event?: {
      preventDefault?: () => void;
    },
    chatRequestOptions?: ChatRequestOptions,
  ) => void;
  className?: string;
  setIsTextFieldSelected: (value: boolean) => void;
  isTextFieldSelected?: boolean;
  isFinished?: boolean;
  setForceComplete: (value: boolean) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { width } = useWindowSize();
  const [isListening, setIsListening] = useState(false);
  const { transcript, resetTranscript, listening, browserSupportsSpeechRecognition, } = useSpeechRecognition();

  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight();
    }
  }, []);

  useEffect(() => {
    if (transcript !== '') {
      setInput(transcript);
    }
  }, [transcript])

  const inactivityTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (transcript !== '') {
      setInput(transcript);

      // Reset the inactivity timer whenever there is new input
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);

      // Start a new timer for 8 seconds of inactivity
      inactivityTimer.current = setTimeout(() => {
        stopListening();
      }, 8000);
    }
  }, [transcript]);

  const startListening = () => {
    SpeechRecognition.startListening({ continuous: true, language: 'en-US' });
    setIsListening(true)
  };

  const stopListening = () => {
    SpeechRecognition.stopListening();
    // resetTranscript();
    setIsListening(false)

      // Clear any existing timer
      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current);
        inactivityTimer.current = null;
      }
  };

  const handleListeningChange = (event: any) => {
    if (!listening) {
      startListening();
    } else {
      stopListening();
    }
  };

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 2}px`;
    }
  };

  const [localStorageInput, setLocalStorageInput] = useLocalStorage(
    'input',
    '',
  );

  useEffect(() => {
    if (textareaRef.current) {
      const domValue = textareaRef.current.value;
      // Prefer DOM value over localStorage to handle hydration
      const finalValue = domValue || localStorageInput || '';
      setInput(finalValue);
      adjustHeight();
    }
    // Only run once after hydration
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLocalStorageInput(input);
  }, [input, setLocalStorageInput]);

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setForceComplete(false);
    setInput(event.target.value);
    adjustHeight();
  };

  const submitForm = useCallback(() => {
    if (input?.length < 50 && messages?.length < 1) {
      setForceComplete(true); // Trigger complete animation
      setTimeout(() => {
        handleSubmit(undefined);
        setLocalStorageInput('');
      }, 700);
    } else {
      handleSubmit(undefined);
      setLocalStorageInput('');
    }
    if (textareaRef.current) {
      textareaRef.current.style.height = '90px';
    }
    if (width && width > 768) {
      textareaRef.current?.focus();
    }
  }, [
    handleSubmit,
    setLocalStorageInput,
    width,
    chatId,
  ]);

  return (
    <div className="w-full flex flex-col"style={{alignItems:'flex-start'}}>
      <div className="w-full flex items-center inputParent mb-4">
        <Textarea
          ref={textareaRef}
          placeholder="Ask a question..."
          value={input}
          onChange={handleInput}
          style={{ minWidth: '100%',
            transition: 'background-color 0.5s ease-in-out', // Add smooth transition
           }}
          className={cx(
            `min-h-[24px] max-h-[calc(25dvh)] overflow-auto resize-none rounded-xl !text-base`,
            isTextFieldSelected ? 'bg-white' : 'bg-muted',
            className,
          )}
          rows={3}
          autoFocus={width && width > 768?true:false}
          onFocus={() => {setIsTextFieldSelected(true)}}
          onBlur={() => {setIsTextFieldSelected(false)}}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              if (isLoading) {
                toast.error('Please wait for the model to finish its response!');
              } else {
                submitForm();
                resetTranscript()
              }
            }
          }}
        />
        {/* {!isListening ? (
          <Button
            className="rounded-full p-1.5 h-fit m-0.5 border dark:border-zinc-600 button chatButton"
            onClick={(event) => {
              event.preventDefault();
              handleListeningChange(event);
            }}
          >
            <MicIcon />
          </Button>
        ) : (
          <Button
            className="rounded-full p-1.5 h-fit bg-red-600  m-0.5 border dark:border-zinc-600 button chatButton"
            onClick={(event) => {
              event.preventDefault();
              handleListeningChange(event);
            }}
          >
            <AnimatedMicIcon> </AnimatedMicIcon>
          </Button>
        )} */}
        <Button
          className="rounded-full p-1.5 h-fit m-0.5 border dark:border-zinc-600 button chatButton chatButtonArrow"
          onClick={(event) => {
            event.preventDefault();
            submitForm();
            resetTranscript()
          }}
          disabled={input.length === 0 || isLoading}
        >
          <ArrowUpIcon size={14} />
        </Button></div>
      {/* <div className="w-full flex justify-center">
        <p className="text-xs text-muted-foreground italic">
          This AI-generated content may contain errors, inaccuracies, or views not representing our organization. Check important info.
        </p>
      </div> */}
        
      {/* {messages?.length == 0 && <SuggestedActions append={append} chatId={chatId} />} */}
    </div>
  );
}

export const MultimodalInput = memo(
  PureMultimodalInput
);
