'use client';

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
import { Paperclip, ArrowUp } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Spinner } from './ui/spinner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { useApiService } from '@/hooks/useApiService';
import { useConfig } from '@/app/context/ConfigContext';
import { ConfigError } from './configError';
import { decryptData, handleSetQueryParams } from '@/lib/utils';
import 'regenerator-runtime/runtime';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { useSearchParams } from "next/navigation";
import { getUserId } from '@/lib/getUserId';

// Interface for current file being uploaded
interface CurrentFileUpload {
  file: File;
  status: 'uploading' | 'success' | 'error';
  error?: string;
  previewUrl?: string;
  documentId?: string;
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

  const pollingTimeRef = useRef<NodeJS.Timeout | null>(null) //reference to set time out poll
  const isPollingActiveRef = useRef<boolean>(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isUploadCancelledRef = useRef<boolean>(false);
  // Add ref to track if attach button is processing
  const isAttachProcessingRef = useRef<boolean>(false);

  const allowedExtensions = [
    '.pdf',
    '.xlsx',
    '.xls',
    '.xlsm',
    '.docx',
    '.doc',
    '.docm',
    '.ppt',
    '.pptx',
    '.pptm',
    '.txt',
    '.csv',
    '.json',
    '.zip',
    '.html',
    '.eml',
    '.epub',
    '.gz',
    '.xml',
    '.odt',
    '.ods',
    '.odp',
    '.rtf',
    '.kml',
    '.png',
    '.jpg',
    '.jpeg',
    '.webp',
    '.gif',
    '.7z',
    '.tar',
    '.tar.xz',
    '.tar.bz2',
    '.tgz',
    '.png',
    '.jpg',
    '.jpeg'
  ];

  const MAX_FILE_SIZE = 100 * 1024 * 1024;
  const MAX_TOTAL_SIZE = 500 * 1024 * 1024;

  const { width } = useWindowSize();
  let thread_id;
  const searchParams = useSearchParams()
  const encryptedId = searchParams.get("id");
  let id = decryptData(encryptedId);

  // Track uploaded files (successful ones)
  const [uploadedFiles, setUploadedFiles] = useState<CurrentFileUpload[]>([]);
  // Track current file being uploaded
  const [currentUpload, setCurrentUpload] = useState<CurrentFileUpload | null>(null);
  // Track if there are any failed uploads
  const [hasFailedUpload, setHasFailedUpload] = useState(false);
  // Track if thread is being created
  const [isCreatingThread, setIsCreatingThread] = useState(false);
  // Track if thread creation failed
  const [threadCreationFailed, setThreadCreationFailed] = useState(false);
  // Add state to track if attach button is disabled during async operations
  const [isAttachDisabled, setIsAttachDisabled] = useState(false);
  // Add state to track if cancellation is in progress
  const [isCancelling, setIsCancelling] = useState(false);
  // Add state to track which file is being removed
  const [removingFileIndex, setRemovingFileIndex] = useState<number | null>(null);

  const { transcript, resetTranscript } = useSpeechRecognition();
  const { isLoading: configLoading, validationError, config } = useConfig();
  const apiService = useApiService();
  const isPublicAgent = process.env.NEXT_PUBLIC_AGENT === 'true'

  useEffect(() => {

    if (isFinished) {
      // Clear files after response is complete
      setUploadedFiles([]);
      setCurrentUpload(null);
    }

  }, [isFinished])

  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight();
    }
    return () => {
      // Clean up polling when component unmounts
      isPollingActiveRef.current = false;
      if (pollingTimeRef.current) {
        clearTimeout(pollingTimeRef.current);
        pollingTimeRef.current = null;
      }
    };
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

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Check file extension
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedExtensions.includes(extension)) {
      return {
        valid: false,
        error: `File type ${extension} is not supported.}`
      };
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File size exceeds the maximum limit of 100 MB.`
      };
    }

    return { valid: true };
  };

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

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setForceComplete(false);
    setInput(event.target.value);
    adjustHeight();
  };

  const isDuplicateFile = (file: File) => {
    const alreadyUploaded = uploadedFiles.some(
      (f) =>
        f.file.name === file.name &&
        f.file.size === file.size &&
        f.file.lastModified === file.lastModified
    )
    return alreadyUploaded
  }

  const createThread = async () => {

    if (isPublicAgent) {
      const response = await apiService?.createChatThread(Number(config?.agentId))
      if (response?.data.id) {
        localStorage.setItem('external_thread_id', response?.data?.id.toString())
        return response?.data?.id
      }
      else {
        throw new Error('Failed to create thread')
      }
    }
    const active_thread_id = localStorage.getItem('active_thread_id')
    const parseId = active_thread_id ? parseInt(active_thread_id) : null

    if (!parseId || parseId < 0) {
      // Create thread first
      if (!config?.agentId) {
        throw new Error('Agent id missing')
      }
      const response = await apiService?.createChatThread(Number(config?.agentId))

      if (response?.data.id) {
        localStorage.setItem('active_thread_id', response?.data?.id.toString())
        handleSetQueryParams(response?.data?.id.toString(), response?.data.title);
        return response?.data?.id
      }
      else {
        throw new Error('Failed to create thread')
      }
    }
    else {
      return active_thread_id
    }
  }

  const handleAttachClick = async (event: React.MouseEvent) => {
    event.preventDefault();

    // Prevent multiple clicks if already processing
    if (isAttachProcessingRef.current || isCreatingThread || currentUpload?.status === 'uploading') {
      return;
    }

    // Set processing flag
    isAttachProcessingRef.current = true;
    setIsAttachDisabled(true);

    try {
      // Check if already uploading
      if ((currentUpload as any)?.status === 'uploading'){
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

      // For public agent mode always create the thread as we need external thread id
      if (isPublicAgent) {
        const external_thread_id = localStorage.getItem('external_thread_id')
        try {
          const response = await fetch(`/api/thread/${id}`);
          if (response.ok) {
            const threadData = await response.json();
            if (threadData.externalApiId) {
              localStorage.setItem('external_thread_id', threadData.externalApiId)
              thread_id = threadData.externalApiId
            }
            else if (!external_thread_id) {
              thread_id = await createThread();
              if (!thread_id) throw new Error("Something went wrong");
            }
          }
        }
        catch (error) {
          console.error('Failed to create thread:', error);
          setThreadCreationFailed(true);
          toast.error(error instanceof Error ? error.message : 'Failed to create thread. Please try again.');
          // Re-enable button on error
          isAttachProcessingRef.current = false;
          setIsAttachDisabled(false);
          return;
        }
      }

      // Check if thread already exists
      const active_thread_id = localStorage.getItem('active_thread_id');
      const parseId = active_thread_id ? parseInt(active_thread_id) : null;

      // If thread already exists, open file dialog immediately
      if (parseId && parseId > 0) {
        // Re-enable button before opening dialog
        isAttachProcessingRef.current = false;
        setIsAttachDisabled(false);
        // Small delay to ensure state updates before opening dialog
        setTimeout(() => {
          fileInputRef.current?.click();
        }, 50);
        return;
      }

      // Otherwise, create thread first
      try {
        setIsCreatingThread(true);

        // Only create the thread, nothing else
        thread_id = await createThread();
        if (!thread_id) throw new Error("Something went wrong");

        // Re-enable button before opening dialog
        isAttachProcessingRef.current = false;
        setIsAttachDisabled(false);
        
        // After thread is successfully created, open file dialog
        setTimeout(() => {
          fileInputRef.current?.click();
        }, 50);

      } catch (error) {
        console.error('Failed to create thread:', error);
        setThreadCreationFailed(true);
        toast.error(error instanceof Error ? error.message : 'Failed to create thread. Please try again.');
      } finally {
        setIsCreatingThread(false);
      }
    } finally {
      // Ensure we re-enable if something unexpected happens
      setTimeout(() => {
        isAttachProcessingRef.current = false;
        setIsAttachDisabled(false);
      }, 500);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    // Only process one file at a time
    if (files.length > 0) {
      const file = files[0];

      // Calculate total size of existing uploaded files + new file
      const existingTotalSize = uploadedFiles.reduce((total, f) => total + f.file.size, 0);
      const newTotalSize = existingTotalSize + file.size;

      if (newTotalSize > MAX_TOTAL_SIZE) {
        toast.error(
          'Total file size exceeds 500 MB'
        );
        return;
      }

      const validation = validateFile(file);
      if (!validation.valid) {
        toast.error(validation.error);
        return;
      }

      //Duplicate check
      if (isDuplicateFile(file)) {
        toast.error('This file has already been uploaded.');
        return;
      }

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

      // Trigger file submission
      handleFileSubmission(file);
    }

    // Clear the input value so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove already uploaded file
  const removeUploadedFile = async (index: number) => {
    // Prevent multiple removal attempts on the same file
    if (removingFileIndex === index) return;
    
    setRemovingFileIndex(index);
    
    try {
      const fileToRemove = uploadedFiles[index];
      const corpusId = localStorage.getItem('corpus_id');

      if (corpusId && fileToRemove.documentId) {
        try {
          await apiService?.deleteDocumentFromCorpus(corpusId, [Number(fileToRemove.documentId)]);
          toast.success(`${fileToRemove.file.name} removed`);
        } catch (error) {
          console.error('Failed to delete document:', error);
          toast.error(`Failed to remove ${fileToRemove.file.name}`);
        }
      }
      else {
        console.error('Failed to delete document');
        toast.error(`Failed to remove ${fileToRemove.file.name}`);
      }

      // Remove from state
      setUploadedFiles(prev => prev.filter((_, i) => i !== index));
      
    } finally {
      setRemovingFileIndex(null);
    }
  };

  const removeCurrentUpload = async () => {
    // Prevent multiple cancellation attempts
    if (isCancelling) return;
    
    setIsCancelling(true);
    
    try {
      // Mark upload as cancelled
      isUploadCancelledRef.current = true;

      // Stop polling
      isPollingActiveRef.current = false;

      // Clear timeout if exists
      if (pollingTimeRef.current) {
        clearTimeout(pollingTimeRef.current);
        pollingTimeRef.current = null;
      }

      // If there's an active upload with documentId, you might want to call an API to cancel it
      if (currentUpload?.documentId) {
        try {
          // Optional: Call API to cancel the upload if your backend supports it
          // await apiService?.cancelDocumentUpload(currentUpload.documentId);
        } catch (error) {
          console.error('Failed to cancel upload on server:', error);
        }
      }

      // Clear UI state
      setCurrentUpload(null);
      setHasFailedUpload(false);
      
    } finally {
      setIsCancelling(false);
    }
  };

  const editCurrentUpload = () => {
    if (currentUpload?.status !== 'uploading') {
      fileInputRef.current?.click();
    }
  };

  const submitForm = useCallback(() => {
    if (input.trim().length === 0 && uploadedFiles.length === 0 && !currentUpload) return;

    // Check if any file is currently uploading
    if (currentUpload?.status === 'uploading') {
      toast.error('Please wait for file to finish uploading');
      return;
    }

    const Attachment = uploadedFiles.length > 0 || currentUpload !== null;

    const messageData = {
      content: input,
      files: uploadedFiles,
      hasAttachments: Attachment
    }

    if (input?.length < 50 && (messages?.length || 0) < 1) {
      setForceComplete(true);
      setTimeout(() => {
        handleSubmit(input, undefined, undefined, uploadedFiles);
        setLocalStorageInput('');
      }, 700);
    } else {
      handleSubmit(input, undefined, undefined, uploadedFiles);
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
      // Reset cancel flag when new upload starts
      isUploadCancelledRef.current = false;

      if (isPublicAgent) {
        thread_id = localStorage.getItem('external_thread_id');
      } else {
        thread_id = localStorage.getItem('active_thread_id');
      }

      if (isUploadCancelledRef.current) return;

      // Create corpus
      const corpus_id = await createCorpus(thread_id);
      if (!corpus_id) throw new Error("Failed to create corpus");

      if (isUploadCancelledRef.current) return;

      if (!thread_id) throw new Error("Thread ID not found");

      // Create corpus-thread connection if not exists
      const corpus_connection = localStorage.getItem('corpus_connection');

      if (!corpus_connection) {
        const response = await apiService?.createCorpusThreadConnection(
          thread_id?.toString(),
          corpus_id?.toString()
        );

        if (isUploadCancelledRef.current) return;

        if (response?.data.id) {
          localStorage.setItem('corpus_connection', response.data.id);
        }
      }

      if (isUploadCancelledRef.current) return;

      const res = await fetch("/api/userInfo");
      const data = await res.json();
      const user_id = data.user_id
      // Upload document
      const uploadResponse = await apiService?.uploadDocumentToCorpus(
        corpus_id?.toString(),
        file,
        user_id
      );

      if (isUploadCancelledRef.current) {
        return;
      }

      if (!uploadResponse?.data?.id) {
        throw new Error('Upload failed - no document ID received');
      }

      const documentId = uploadResponse.data.id;

      // Update currentUpload with documentId
      setCurrentUpload(prev => prev ? { ...prev, documentId } : null);

      // Start polling ONLY if not cancelled
      if (isUploadCancelledRef.current) return;

      let pollCount = 0;
      const maxPolls = 30;
      let toastShown = false;

      isPollingActiveRef.current = true;

      const poll = async () => {
        if (!isPollingActiveRef.current || isUploadCancelledRef.current) {
          return;
        }

        try {
          pollCount++;

          const statusResponse = await apiService?.getDocumentStatus(documentId);

          if (!isPollingActiveRef.current || isUploadCancelledRef.current) {
            return;
          }

          if (statusResponse?.data) {
            const documentData = statusResponse.data;

            if (documentData.step === "completed") {
              const uploadedFile: CurrentFileUpload = {
                file,
                status: "success",
                documentId // store the document ID
              };

              setUploadedFiles(prev => [...prev, uploadedFile]);
              if (!toastShown) {
                toastShown = true;
                toast.success(`${file.name} uploaded successfully`);
              }

              setCurrentUpload(null);
              isPollingActiveRef.current = false;
              return;
            }

            if (
              documentData.is_failed === true ||
              documentData.step === "failed"
            ) {
              setCurrentUpload({
                file,
                status: "error",
                error: "Document processing failed"
              });
              setCurrentUpload(null);
              setHasFailedUpload(true);

              if (!toastShown) {
                toastShown = true;
                toast.error(`Failed to upload ${file.name}`);
              }

              isPollingActiveRef.current = false;
              return;
            }

            if (pollCount >= maxPolls) {
              setCurrentUpload({
                file,
                status: "error",
                error: "Upload timeout - document processing took too long"
              });
              setCurrentUpload(null);
              setHasFailedUpload(true);

              if (!toastShown) {
                toastShown = true;
                toast.error(`Failed to upload ${file.name} - timeout`);
              }

              isPollingActiveRef.current = false;
              return;
            }
          }

          if (isPollingActiveRef.current && !isUploadCancelledRef.current) {
            pollingTimeRef.current = setTimeout(poll, 4000);
          }

        } catch (pollError) {
          if (isUploadCancelledRef.current) return;

          setCurrentUpload({
            file,
            status: "error",
            error: pollError instanceof Error
              ? pollError.message
              : "Error checking document status"
          });

          setCurrentUpload(null);
          setHasFailedUpload(true);

          if (!toastShown) {
            toastShown = true;
            toast.error(`Failed to check status for ${file.name}`);
          }

          isPollingActiveRef.current = false;
        }
      };

      // Start first poll only if not cancelled
      if (!isUploadCancelledRef.current) {
        poll();
      }

    } catch (error) {
      if (isUploadCancelledRef.current) return;

      console.error('something went wrong when uploading file', error);

      setCurrentUpload({
        file,
        status: 'error',
        error: error instanceof Error ? error.message : 'Upload failed'
      });

      setHasFailedUpload(true);
      toast.error(`Failed to upload ${file.name}`);
    }
  };

  const createCorpus = async (thread_id: any) => {
    const corpus_id = localStorage.getItem('corpus_id')

    if (!corpus_id) {
      try {
        const response = await apiService?.createCorpus(thread_id)
        localStorage.setItem('corpus_id', response.data.id)
        return response.data.id
      }
      catch (error) {
        console.error('failed to create corpus')
        throw new Error('Failed to create corpus')
      }
    }
    else {
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

  if (!apiService && !configLoading) {
    //although config is validated before login but for safe side we are checking it here
    return <ConfigError validationError={validationError} />;
  }

  // Determine if attach button should be disabled
  const isAttachButtonDisabled = isAttachDisabled ||
    currentUpload?.status === 'uploading' ||
    isCreatingThread ||
    isAttachProcessingRef.current;

  return (
    <div className="w-full flex flex-col items-center">

      {(currentUpload || uploadedFiles.length > 0) && (
        <div className="flex flex-wrap gap-2 mb-3 w-full max-w-3xl px-2">

          {currentUpload && (
            <div className="relative">
              <div className={cx(
                "w-20 h-20 rounded-lg overflow-hidden border-2 bg-gray-100 flex items-center justify-center",
                currentUpload.status === 'error' ? 'border-red-500' : 'border-gray-300'
              )}>

                {currentUpload.previewUrl ? (
                  <img
                    src={currentUpload.previewUrl}
                    alt={currentUpload.file.name}
                    className="w-full h-full object-cover"
                  />
                ) : (

                  <div className="text-3xl opacity-50">
                    {getFileIcon(currentUpload.file.name)}
                  </div>
                )}

                {/* Loading Spinner Overlay  */}
                {currentUpload.status === 'uploading' && !isCancelling && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Spinner className="h-6 w-6 text-white" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Previously uploaded files */}
          {uploadedFiles.map((file, index) => {
            const isImage = file.file.type.startsWith('image/');
            const previewUrl = isImage ? URL.createObjectURL(file.file) : null;
            const isRemoving = removingFileIndex === index;

            return (
              <div key={index} className="relative">
                <div className="w-20 h-20 rounded-lg overflow-hidden border-2 border-gray-300 bg-gray-100 flex items-center justify-center">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt={file.file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-3xl opacity-50">
                      {getFileIcon(file.file.name)}
                    </div>
                  )}
                  
                  {/* Loading Overlay when removing */}
                  {isRemoving && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Spinner className="h-6 w-6 text-white" />
                    </div>
                  )}
                </div>

                {/* Close button with loading state */}
                <button
                  type="button"
                  onClick={() => removeUploadedFile(index)}
                  disabled={isRemoving}
                  className={cx(
                    "absolute -top-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center text-xs shadow-lg transition-all",
                    "bg-gray-800 hover:bg-gray-900 text-white",
                    isRemoving && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {isRemoving ? (
                    <Spinner className="h-3 w-3" />
                  ) : (
                    '×'
                  )}
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
          disabled={isAttachButtonDisabled}
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
                  isAttachButtonDisabled && "opacity-50 cursor-not-allowed"
                )}
                onClick={handleAttachClick}
                type="button"
                disabled={isAttachButtonDisabled}
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
          onFocus={() => { setIsTextFieldSelected(true) }}
          onBlur={() => { setIsTextFieldSelected(false) }}
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