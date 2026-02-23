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
import { AnimatedMicIcon, ArrowUpIcon, MicIcon, AttachmentIcon } from './icons';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import 'regenerator-runtime/runtime';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { useApiService } from '@/hooks/useApiService';
import { useConfig } from '@/app/context/ConfigContext';
import { ConfigError } from './configError';
import { handleSetQueryParams } from '@/lib/utils';
 
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
  append: any
  handleSubmit: any
  className?: string;
  setIsTextFieldSelected: (value: boolean) => void;
  isTextFieldSelected?: boolean;
  isFinished?: boolean;
  setForceComplete: (value: boolean) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { width } = useWindowSize();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const { transcript, resetTranscript } = useSpeechRecognition();
  const { isLoading: configLoading, validationError, config } = useConfig();
  const apiService = useApiService();
 
  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight();
    }
  }, []);
 
  const inactivityTimer = useRef<NodeJS.Timeout | null>(null);
 
  useEffect(() => {
    if (transcript !== '') {
      setInput(transcript);
 
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
 
      inactivityTimer.current = setTimeout(() => {
        SpeechRecognition.stopListening();
      }, 8000);
    }
  }, [transcript, setInput]);
 
  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };
 
  const [localStorageInput, setLocalStorageInput] = useLocalStorage(
    'input',
    '',
  );
 
  useEffect(() => {
    if (textareaRef.current) {
      const domValue = textareaRef.current.value;
      const finalValue = domValue || localStorageInput || '';
      setInput(finalValue);
      adjustHeight();
    }
  }, []);
 
  useEffect(() => {
    setLocalStorageInput(input);
  }, [input, setLocalStorageInput]);

  if (!apiService && !configLoading) {
    //although config is validated before login but for safe side we are checking it here 
    return <ConfigError validationError={validationError}/>;
  }
 
  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setForceComplete(false);
    setInput(event.target.value);
    adjustHeight();
  };
 
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
    toast.success(`${files.length} file(s) selected`);
  };
 
  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };
 
  const submitForm = useCallback(() => {
    if (input.trim().length === 0 && selectedFiles.length === 0) return;
   
    if (input?.length < 50 && (messages?.length || 0) < 1) {
      setForceComplete(true);
      setTimeout(() => {
        handleSubmit(undefined);
        setLocalStorageInput('');
      }, 700);
    } else {
      handleSubmit(undefined);
      setLocalStorageInput('');
    }
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    if (width && width > 768) {
      textareaRef.current?.focus();
    }
  }, [
    handleSubmit,
    setLocalStorageInput,
    width,
    input,
    messages?.length,
    setForceComplete,
    selectedFiles.length
  ]);

  const createThread = async () => {

    const active_thread_id = localStorage.getItem('active_thread_id')
    const parseId = active_thread_id ? parseInt(active_thread_id) : null
    console.log(parseId,'parseId')
    if(!parseId || parseId < 0){
      console.log('hete i ')
        //so create thread first
        //update the url and localStorage after document get selected
          if(!config?.agentId){
            throw new Error('Agent id missing')
          }
          const response = await apiService?.createChatThread(Number(config?.agentId))
          console.log(response,'response hai')
          if(response?.data.id){
            console.log(response?.data.id,'response?.data.id')
            localStorage.setItem('active_thread_id',response?.data?.id)
            console.log('fdsa')
            handleSetQueryParams(response?.data?.id.toString(), response?.data.title);
            return response?.data?.id
          }
          else{
            console.log('ejvdawj')
            throw new Error('Failed to create thread')
          }
    }
    else{
      console.log('hete i esf')
      return active_thread_id
    }
  }
  
  const createCorpus = async () => {
    
    const corpus_id = localStorage.getItem('corpus_id')
    console.log(corpus_id,'cporpnjd')
    if(!corpus_id){
      try{
        const response = await apiService?.createCorpus()
        localStorage.setItem('corpus_id',response.data.id)
        return response.data.id
      }
      catch(error){
        console.error('failed to create corpus')
        throw new Error('Failed to create corpus')
      }
    }
    else{
      return corpus_id
    }
  }

  const handleFileSubmission = async () => {
      console.log('file submited')
      
      //create thread if not exist
      const thread_id = await createThread();
      if (!thread_id) throw new Error("Failed to create thread");
    
      // create corpus if it does not exist
      const corpus_id = await createCorpus();
      if (!corpus_id) throw new Error("Failed to create corpus");

      //create corpus and thread connection
      const corpus_correction = localStorage.getItem('corpus_connection')
      if(!corpus_correction){
        const response = await apiService?.createCorpusThreadConnection(thread_id?.toString(),corpus_id?.toString())
        localStorage.setItem('corpus_connection',response.data.id)
        console.log(response,'response for corpus creation')
      }

      //upload document in corpus 
      const response = await apiService?.uploadDocumentToCorpus(corpus_id,selectedFiles)
      
      

          
  }
 
  return (
    <div className="w-full flex flex-col items-center">
      {/* File preview section */}
      {selectedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 p-2 bg-muted/30 rounded-lg w-full max-w-3xl">
          {selectedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 bg-background border rounded-lg px-3 py-1.5 text-sm"
            >
              <span className="max-w-[150px] truncate">{file.name}</span>
              <button
                onClick={() => removeFile(index)}
                className="text-muted-foreground hover:text-foreground"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
     
      <div className={cx(
        "w-full max-w-3xl flex items-center gap-2 border border-slate-200 rounded-full px-5 py-3 transition-all duration-200 bg-white",
        className
      )}>
        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          multiple
          accept="image/*,.pdf,.doc,.docx,.txt,.csv"
        />
       
        {/* Plus button inside input */}
        <TooltipProvider>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full h-10 w-10 hover:bg-slate-50 shrink-0"
                onClick={async (event) => {
                  event.preventDefault();
                  try{
                    
                    await handleFileSubmission();
                    
                  }
                  catch(error){
                    console.error('something went wrong when uploading file',error)
                    toast.error('something went wrong when uploading file')
                  }
                 
                }}
                type="button"
              >
                <AttachmentIcon size={24} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-black text-white border-none rounded-lg px-3 py-1.5 text-xs mb-2">
              Add files and more
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
 
 
        <Textarea
          ref={textareaRef}
          placeholder="Ask anything"
          value={input}
          onChange={handleInput}
          className="flex-1 min-h-[40px] max-h-[25vh] overflow-auto resize-none border-none focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none bg-transparent text-[17px] p-0 py-2 shadow-none placeholder:text-slate-400 [&:focus]:border-none [&:focus]:ring-0 [&:focus]:outline-none [&:focus-visible]:border-none [&:focus-visible]:ring-0 [&:focus-visible]:outline-none"
          rows={1}
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
       
        {/* Arrow icon replacing Mic icon */}
        <Button
          variant="ghost"
          size="icon"
          className={cx(
            "rounded-full h-10 w-10 transition-all shrink-0",
            (input.trim().length > 0 || selectedFiles.length > 0) ? "text-slate-900" : "text-slate-300",
            "hover:bg-slate-50"
          )}
          onClick={(event) => {
            event.preventDefault();
            submitForm();
            resetTranscript()
          }}
          disabled={(input.trim().length === 0 && selectedFiles.length === 0) || isLoading}
        >
          <ArrowUpIcon size={24} />
        </Button>
      </div>
    </div>
  );
}
 
export const MultimodalInput = memo(
  PureMultimodalInput
);
 