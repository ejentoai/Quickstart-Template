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
import { Pencil, X, Paperclip, ArrowUp, XCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Spinner } from './ui/spinner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { useApiService } from '@/hooks/useApiService';
import { useConfig } from '@/app/context/ConfigContext';
import { ConfigError } from './configError';
import { handleSetQueryParams } from '@/lib/utils';
import 'regenerator-runtime/runtime';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
 
// Interface for current file being uploaded
interface CurrentFileUpload {
  file: File;
  status: 'uploading' | 'success' | 'error';
  error?: string;
  previewUrl?: string;
}
 
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
 
  // Track uploaded files (successful ones)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  // Track current file being uploaded
  const [currentUpload, setCurrentUpload] = useState<CurrentFileUpload | null>(null);
  // Track if there are any failed uploads
  const [hasFailedUpload, setHasFailedUpload] = useState(false);
  // Track if thread is being created
  const [isCreatingThread, setIsCreatingThread] = useState(false);
  // Track if thread creation failed
  const [threadCreationFailed, setThreadCreationFailed] = useState(false);
 
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
 
  // Create preview URL for file
  useEffect(() => {
    if (currentUpload?.file) {
      const file = currentUpload.file;
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setCurrentUpload(prev => prev ? { ...prev, previewUrl: url } : null);
       
        return () => URL.revokeObjectURL(url);
      }
    }
  }, [currentUpload?.file]);
 
  if (!apiService && !configLoading) {
    //although config is validated before login but for safe side we are checking it here
    return <ConfigError validationError={validationError}/>;
  }
 
  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setForceComplete(false);
    setInput(event.target.value);
    adjustHeight();
  };
 
  const createThread = async () => {
    const active_thread_id = localStorage.getItem('active_thread_id')
    const parseId = active_thread_id ? parseInt(active_thread_id) : null
   
    if(!parseId || parseId < 0){
        // Create thread first
        if(!config?.agentId){
          throw new Error('Agent id missing')
        }
        const response = await apiService?.createChatThread(Number(config?.agentId))
       
        if(response?.data.id){
          localStorage.setItem('active_thread_id', response?.data?.id.toString())
          handleSetQueryParams(response?.data?.id.toString(), response?.data.title);
          return response?.data?.id
        }
        else{
          throw new Error('Failed to create thread')
        }
    }
    else{
      return active_thread_id
    }
  }
 
  const handleAttachClick = async (event: React.MouseEvent) => {
    event.preventDefault();
   
    // Check if already uploading
    if (currentUpload?.status === 'uploading') {
      toast.error('Please wait for current upload to complete');
      return;
    }
 
    // Check if already creating thread
    if (isCreatingThread) {
      toast.error('Please wait, creating thread...');
      return;
    }
 
    // Reset thread creation failed state when user tries again
    setThreadCreationFailed(false);
    
    // Check if thread already exists
    const active_thread_id = localStorage.getItem('active_thread_id');
    const parseId = active_thread_id ? parseInt(active_thread_id) : null;
   
    // If thread already exists, open file dialog immediately
    if (parseId && parseId > 0) {
      fileInputRef.current?.click();
      return;
    }
 
    // Otherwise, create thread first
    try {
      setIsCreatingThread(true);
     
      // Only create the thread, nothing else
      const thread_id = await createThread();
      if (!thread_id) throw new Error("Something went wrong");
 
      // After thread is successfully created, open file dialog
      fileInputRef.current?.click();
     
    } catch (error) {
      console.error('Failed to create thread:', error);
      setThreadCreationFailed(true);
      toast.error(error instanceof Error ? error.message : 'Failed to create thread. Please try again.');
    } finally {
      setIsCreatingThread(false);
    }
  };
 
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
   
    // Only process one file at a time
    if (files.length > 0) {
      const file = files[0]; // Take only the first file
     
      // Check if already uploading
      if (currentUpload?.status === 'uploading') {
        toast.error('Please wait for current upload to complete');
        return;
      }
     
      // Set current upload
      setCurrentUpload({
        file,
        status: 'uploading'
      });
     
      // Clear any previous failed state
      setHasFailedUpload(false);
     
      // Trigger file submission (now this will handle corpus creation, connection, and upload)
      handleFileSubmission(file);
    }
   
    // Clear the input value so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
 
  const removeUploadedFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };
 
  const removeCurrentUpload = () => {
    setCurrentUpload(null);
    setHasFailedUpload(false);
  };
 
  const editCurrentUpload = () => {
    if (currentUpload?.status !== 'uploading') {
      fileInputRef.current?.click();
    }
  };
 
  const submitForm = useCallback(() => {
    if (input.trim().length === 0 && uploadedFiles.length === 0) return;
   
    // Check if any file is currently uploading
    if (currentUpload?.status === 'uploading') {
      toast.error('Please wait for file to finish uploading');
      return;
    }
   
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
    uploadedFiles.length,
    currentUpload
  ]);
 
  const handleFileSubmission = async (file: File) => {
    try {      
      const thread_id = localStorage.getItem('active_thread_id');
  
      // Create corpus if it does not exist
      const corpus_id = await createCorpus(thread_id);
      if (!corpus_id) throw new Error("Failed to create corpus");
  
      // Get thread ID (should exist now from handleAttachClick)
      if (!thread_id) throw new Error("Thread ID not found");
  
      // Create corpus and thread connection
      const corpus_connection = localStorage.getItem('corpus_connection')
      if(!corpus_connection){
        const response = await apiService?.createCorpusThreadConnection(thread_id?.toString(), corpus_id?.toString())
        if (response?.data.id) {
          localStorage.setItem('corpus_connection', response.data.id)
        }
      }
  
      // Upload document to corpus
      const uploadResponse = await apiService?.uploadDocumentToCorpus(corpus_id?.toString(), file);
      console.log(uploadResponse,'uploadRespinse')
      if (uploadResponse?.data?.id) {
        console.log(uploadResponse?.data?.id,'uploadResponse?.data?.id')
        const documentId = uploadResponse.data.id;
       
        // Start polling for document status
        let pollCount = 0;
        const maxPolls = 30; // 30 seconds max (1 second interval)
        let pollingActive = true;
        let toastShown = false; // Flag to prevent multiple toasts
       
        const pollInterval = setInterval(async () => {
          if (!pollingActive) return;
         
          try {
            pollCount++;
           
            // Get document status
            const statusResponse = await apiService?.getDocumentStatus(documentId);
           
            if (statusResponse?.data) {
              const documentData = statusResponse.data;
             
              // Check if step is "completed" or if there's an error
              if (documentData.step === "completed") {
                // Upload successful
                pollingActive = false;
                clearInterval(pollInterval);
               
                setCurrentUpload({
                  file,
                  status: 'success'
                });
               
                setUploadedFiles(prev => [...prev, file]);
                
                // Only show toast if not already shown
                if (!toastShown) {
                  toastShown = true;
                  toast.success(`${file.name} uploaded successfully`);
                }
                
                setCurrentUpload(null);
               
              } else if (documentData.is_failed === true || documentData.step === "failed") {
                // Upload failed
                pollingActive = false;
                clearInterval(pollInterval);
               
                // Get the current preview URL from the existing currentUpload state
                const currentPreviewUrl = currentUpload?.previewUrl;
               
                // Mark current upload as error but preserve the preview
                setCurrentUpload({
                  file,
                  status: 'error',
                  error: 'Document processing failed',
                  previewUrl: currentPreviewUrl // Preserve the preview URL
                });
               
                setHasFailedUpload(true);
                
                // Only show toast if not already shown
                if (!toastShown) {
                  toastShown = true;
                  toast.error(`Failed to upload ${file.name} - processing failed`);
                }
               
              } else if (pollCount >= maxPolls) {
                // Timeout reached
                pollingActive = false;
                clearInterval(pollInterval);
               
                // Get the current preview URL from the existing currentUpload state
                const currentPreviewUrl = currentUpload?.previewUrl;
               
                // Mark current upload as error due to timeout but preserve the preview
                setCurrentUpload({
                  file,
                  status: 'error',
                  error: 'Upload timeout - document processing took too long',
                  previewUrl: currentPreviewUrl // Preserve the preview URL
                });
               
                setHasFailedUpload(true);
                
                // Only show toast if not already shown
                if (!toastShown) {
                  toastShown = true;
                  toast.error(`Failed to upload ${file.name} - timeout`);
                }
              }
              // Otherwise, continue polling (step is still "pending")
            }
          } catch (pollError) {
            // Only handle error if polling is still active
            if (pollingActive) {
              pollingActive = false;
              clearInterval(pollInterval);
             
              // Get the current preview URL from the existing currentUpload state
              const currentPreviewUrl = currentUpload?.previewUrl;
             
              // Mark current upload as error due to polling error but preserve the preview
              setCurrentUpload({
                file,
                status: 'error',
                error: pollError instanceof Error ? pollError.message : 'Error checking document status',
                previewUrl: currentPreviewUrl // Preserve the preview URL
              });
             
              setHasFailedUpload(true);
              
              // Only show toast if not already shown
              if (!toastShown) {
                toastShown = true;
                toast.error(`Failed to check status for ${file.name}`);
              }
            }
          }
        }, 1000); // Poll every 1 second
       
      } else {
        throw new Error('Upload failed - no document ID received');
      }
     
    } catch (error) {
      console.error('something went wrong when uploading file', error);
     
      // Get the current preview URL from the existing currentUpload state
      const currentPreviewUrl = currentUpload?.previewUrl;
     
      // Mark current upload as error but preserve the preview
      setCurrentUpload({
        file,
        status: 'error',
        error: error instanceof Error ? error.message : 'Upload failed',
        previewUrl: currentPreviewUrl // Preserve the preview URL
      });
     
      setHasFailedUpload(true);
      toast.error(`Failed to upload ${file.name}`);
    }
  };
 
  const createCorpus = async (thread_id : any) => {
    const corpus_id = localStorage.getItem('corpus_id')
   
    if(!corpus_id){
      try{
        const response = await apiService?.createCorpus(thread_id)
        localStorage.setItem('corpus_id', response.data.id)
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
 
  const retryFailedUpload = () => {
    if (currentUpload && currentUpload.status === 'error') {
      const file = currentUpload.file;
      setCurrentUpload({
        file,
        status: 'uploading',
        previewUrl: currentUpload.previewUrl // Preserve preview URL during retry
      });
      setHasFailedUpload(false);
      handleFileSubmission(file);
    }
  };
 
  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return '📄';
      case 'doc':
      case 'docx':
        return '📝';
      case 'txt':
        return '📃';
      case 'csv':
        return '📊';
      default:
        return '📎';
    }
  };
 
  return (
    <div className="w-full flex flex-col items-center">
      {/* Small File Preview Thumbnails */}
      {(currentUpload || uploadedFiles.length > 0) && (
        <div className="flex flex-wrap gap-2 mb-3 w-full max-w-3xl px-2">
          {/* Current upload preview */}
          {currentUpload && (
            <div className="relative">
              <div className={cx(
                "w-20 h-20 rounded-lg overflow-hidden border-2 bg-gray-100 flex items-center justify-center",
                currentUpload.status === 'error' ? 'border-red-500' : 'border-gray-300'
              )}>
                {/* Always show preview URL if available, regardless of status */}
                {currentUpload.previewUrl ? (
                  <img
                    src={currentUpload.previewUrl}
                    alt={currentUpload.file.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  /* Only show icon if there's no preview URL (non-image files) */
                  <div className="text-3xl opacity-50">
                    {getFileIcon(currentUpload.file.name)}
                  </div>
                )}
               
                {/* Loading Spinner Overlay - only show when uploading */}
                {currentUpload.status === 'uploading' && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Spinner className="h-6 w-6 text-white" />
                  </div>
                )}
              </div>
             
              {/* Close button - always red for error state, otherwise black */}
              <button
                onClick={removeCurrentUpload}
                className={cx(
                  "absolute -top-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center text-xs shadow-lg",
                  currentUpload.status === 'error'
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : "bg-gray-800 hover:bg-gray-900 text-white"
                )}
              >
                ×
              </button>
            </div>
          )}
         
          {/* Previously uploaded files */}
          {uploadedFiles.map((file, index) => {
            const isImage = file.type.startsWith('image/');
            const previewUrl = isImage ? URL.createObjectURL(file) : null;
           
            return (
              <div key={index} className="relative">
                <div className="w-20 h-20 rounded-lg overflow-hidden border-2 border-gray-300 bg-gray-100 flex items-center justify-center">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-3xl opacity-50">
                      {getFileIcon(file.name)}
                    </div>
                  )}
                </div>
               
                {/* Close button */}
                <button
                  onClick={() => removeUploadedFile(index)}
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-gray-800 hover:bg-gray-900 text-white flex items-center justify-center text-xs shadow-lg"
                >
                  ×
                </button>
              </div>
            );
          })}
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
          accept="image/*,.pdf,.doc,.docx,.txt,.csv"
          disabled={currentUpload?.status === 'uploading' || isCreatingThread}
        />
       
        {/* Plus button */}
        <TooltipProvider>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cx(
                  "rounded-full h-10 w-10 hover:bg-slate-50 shrink-0 transition-all",
                  (currentUpload?.status === 'uploading' || isCreatingThread) && "opacity-50 cursor-not-allowed"
                )}
                onClick={handleAttachClick}
                type="button"
                disabled={currentUpload?.status === 'uploading' || isCreatingThread}
              >
                {isCreatingThread ? (
                  <Spinner className="h-5 w-5" />
                ) : (
                  <Paperclip className="h-5 w-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-black text-white border-none rounded-lg px-3 py-1.5 text-xs mb-2">
              {isCreatingThread
                ? 'Creating thread...'
                : currentUpload?.status === 'uploading'
                  ? 'Uploading file...'
                  : threadCreationFailed
                    ? 'Click to retry thread creation'
                    : 'Add files (one at a time)'}
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
              } else if (currentUpload?.status === 'uploading') {
                toast.error('Please wait for file to finish uploading');
              } else if (isCreatingThread) {
                toast.error('Please wait for thread creation to complete');
              } else {
                submitForm();
                resetTranscript()
              }
            }
          }}
        />
       
        {/* Arrow icon */}
        <Button
          variant="ghost"
          size="icon"
          className={cx(
            "rounded-full h-10 w-10 transition-all shrink-0",
            (input.trim().length > 0 || uploadedFiles.length > 0) ? "text-slate-900" : "text-slate-300",
            "hover:bg-slate-50",
            (currentUpload?.status === 'uploading' || isLoading || isCreatingThread) && "opacity-50 cursor-not-allowed"
          )}
          onClick={(event) => {
            event.preventDefault();
            if (currentUpload?.status === 'uploading') {
              toast.error('Please wait for file to finish uploading');
              return;
            }
            if (isCreatingThread) {
              toast.error('Please wait for thread creation to complete');
              return;
            }
            submitForm();
            resetTranscript()
          }}
          disabled={(input.trim().length === 0 && uploadedFiles.length === 0) || isLoading || currentUpload?.status === 'uploading' || isCreatingThread}
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
 
export const MultimodalInput = memo(
  PureMultimodalInput
);
 