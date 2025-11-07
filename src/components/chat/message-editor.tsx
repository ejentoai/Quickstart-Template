'use client';

/**
 * MESSAGE EDITOR COMPONENT - Inline message editing interface
 * 
 * This component provides inline editing capabilities for chat messages.
 * It allows users to modify their messages and resend them, which can be
 * useful for correcting typos or refining questions.
 * 
 * Key Features:
 * - Inline message editing with auto-resizing textarea
 * - Cancel and save functionality
 * - Integration with chat message state management
 * - Automatic height adjustment for content
 * - Loading states during message updates
 * - Error handling and user feedback
 * 
 * Architecture:
 * - Uses controlled components for form state
 * - Integrates with parent message component state
 * - Handles message reloading after edits
 * - Provides smooth UX transitions between view and edit modes
 */

import { Button } from '../ui/button';
import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';

/**
 * Message Editor Component Props Interface
 */
export type MessageEditorProps = {
  /** The message object being edited */
  message: any;
  /** Function to toggle between view and edit modes */
  setMode: Dispatch<SetStateAction<'view' | 'edit'>>;
  /** Function to update the messages array */
  setMessages: (
    messages: any[] | ((messages: any[]) => any[]),
  ) => void;
  /** Function to reload the chat after message update */
  reload: (
    chatRequestOptions?: any,
  ) => Promise<string | null | undefined>;
};

/**
 * Message Editor Component
 * 
 * Provides an inline editing interface for chat messages. When activated,
 * it replaces the message display with an editable textarea that allows
 * users to modify their message content.
 * 
 * Features:
 * - Auto-resizing textarea that grows with content
 * - Cancel functionality to discard changes
 * - Save functionality that updates the message and triggers reload
 * - Loading states during save operations
 * - Error handling with user feedback
 * - Smooth transitions between edit and view modes
 */
export function MessageEditor({
  message,
  setMode,
  setMessages,
  reload,
}: MessageEditorProps) {
  // TODO: Replace with actual server-side message ID retrieval
  const userMessageIdFromServer = 123;
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false); // Track save operation state
  const [draftContent, setDraftContent] = useState<string>(message.content); // Local edit state
  const textareaRef = useRef<HTMLTextAreaElement>(null); // Reference for textarea manipulation

  // Auto-adjust textarea height when component mounts
  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight();
    }
  }, []);

  /**
   * Adjusts the height of the textarea to fit its content
   * Prevents scrolling by dynamically resizing the textarea
   */
  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 2}px`;
    }
  };

  /**
   * Handles textarea input changes
   * Updates the draft content and adjusts height as user types
   * 
   * @param event - The input change event
   */
  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraftContent(event.target.value);
    adjustHeight();
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <Textarea
        ref={textareaRef}
        className="bg-transparent outline-none overflow-hidden resize-none !text-base rounded-xl w-full"
        value={draftContent}
        onChange={handleInput}
      />

      <div className="flex flex-row gap-2 justify-end">
        <Button
          variant="outline"
          className="h-fit py-2 px-3"
          onClick={() => {
            setMode('view');
          }}
        >
          Cancel
        </Button>
        <Button
          variant="default"
          className="h-fit py-2 px-3"
          disabled={isSubmitting}
          onClick={async () => {
            setIsSubmitting(true);
            const messageId = userMessageIdFromServer ?? message.id;

            if (!messageId) {
              toast.error('Something went wrong, please try again!');
              setIsSubmitting(false);
              return;
            }

            // await deleteTrailingMessages({
            //   id: messageId,
            // });

            setMessages((messages) => {
              const index = messages.findIndex((m) => m.id === message.id);

              if (index !== -1) {
                const updatedMessage = {
                  ...message,
                  content: draftContent,
                };

                return [...messages.slice(0, index), updatedMessage];
              }

              return messages;
            });

            setMode('view');
            reload();
          }}
        >
          {isSubmitting ? 'Sending...' : 'Send'}
        </Button>
      </div>
    </div>
  );
}
