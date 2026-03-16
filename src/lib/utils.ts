import axios from "axios"
import { clsx, type ClassValue } from "clsx"
import { customAlphabet } from 'nanoid'
import { twMerge } from "tailwind-merge"
import CryptoJS from "crypto-js";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const nanoid = customAlphabet(
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  7
) // 7-character random string

// export async function fetcher<JSON = any>(
//   input: { url: string, headers: Record<string, string> },
//   init?: RequestInit
// ): Promise<JSON> {
//   // Extract the URL and headers
//   const { url, headers } = input;

//   const res = await fetch(url, {
//     ...init, // Spread any additional options from init (if any)
//     headers, // Add the custom headers
//   });

//   if (!res.ok) {
//     const json = await res.json();
//     if (json.error) {
//       const error = new Error(json.error) as Error & {
//         status: number;
//       };
//       error.status = res.status;
//       throw error;
//     } else {
//       throw new Error('An unexpected error occurred');
//     }
//   }

//   return res.json();
// }


export function isPublicAgentMode(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const publicAgent = process.env.NEXT_PUBLIC_AGENT;
  const result = publicAgent === 'true' || publicAgent === '1';

  return result;
}


export const fetcher = (url:string, options = {}) =>
  axios
    .get(url, { ...options })
    .then((response) => response.data);

export function formatDate(input: string | number | Date): string {
  const date = new Date(input)
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}



interface ApplicationError extends Error {
  info: string;
  status: number;
}


export function getLocalStorage(key: string) {
  if (typeof window !== 'undefined') {
    return JSON.parse(localStorage.getItem(key) || '[]');
  }
  return [];
}

function addToolMessageToChat({
  toolMessage,
  messages,
}: {
  toolMessage: any;
  messages: Array<any>; 
}): Array<any> {
  return messages.map((message) => {
    if (message.toolInvocations) {
      return {
        ...message,
        toolInvocations: message.toolInvocations.map((toolInvocation:any) => {
          const toolResult = toolMessage.content.find(
            (tool:any) => tool.toolCallId === toolInvocation.toolCallId,
          );

          if (toolResult) {
            return {
              ...toolInvocation,
              state: 'result',
              result: toolResult.result,
            };
          }

          return toolInvocation;
        }),
      };
    }

    return message;
  });
}

export function convertToUIMessages(
  messages: Array<any>,
): Array<any> {
  return messages.reduce((chatMessages: Array<any>, message) => {
    if (message.role === 'tool') {
      return addToolMessageToChat({
        toolMessage: message as any,
        messages: chatMessages,
      });
    }

    let textContent = '';
    const toolInvocations: Array<any> = [];

    if (typeof message.content === 'string') {
      textContent = message.content;
    } else if (Array.isArray(message.content)) {
      for (const content of message.content) {
        if (content.type === 'text') {
          textContent += content.text;
        } else if (content.type === 'tool-call') {
          toolInvocations.push({
            state: 'call',
            toolCallId: content.toolCallId,
            toolName: content.toolName,
            args: content.args,
          });
        }
      }
    }

    chatMessages.push({
      id: message.id,
      role: message.role as any,
      content: textContent,
      toolInvocations,
    });

    return chatMessages;
  }, []);
}

export function sanitizeResponseMessages(
  messages: Array<any>,
): Array<any> {
  const toolResultIds: Array<string> = [];

  for (const message of messages) {
    if (message.role === 'tool') {
      for (const content of message.content) {
        if (content.type === 'tool-result') {
          toolResultIds.push(content.toolCallId);
        }
      }
    }
  }

  const messagesBySanitizedContent = messages.map((message) => {
    if (message.role !== 'assistant') return message;

    if (typeof message.content === 'string') return message;

    const sanitizedContent = message.content.filter((content:any) =>
      content.type === 'tool-call'
        ? toolResultIds.includes(content.toolCallId)
        : content.type === 'text'
          ? content.text.length > 0
          : true,
    );

    return {
      ...message,
      content: sanitizedContent,
    };
  });

  return messagesBySanitizedContent.filter(
    (message) => message.content.length > 0,
  );
}

export function sanitizeUIMessages(messages: Array<any>): Array<any> {
  const messagesBySanitizedToolInvocations = messages.map((message) => {
    if (message.role !== 'assistant') return message;

    if (!message.toolInvocations) return message;

    const toolResultIds: Array<string> = [];

    for (const toolInvocation of message.toolInvocations) {
      if (toolInvocation.state === 'result') {
        toolResultIds.push(toolInvocation.toolCallId);
      }
    }

    const sanitizedToolInvocations = message.toolInvocations.filter(
      (toolInvocation:any) =>
        toolInvocation.state === 'result' ||
        toolResultIds.includes(toolInvocation.toolCallId),
    );

    return {
      ...message,
      toolInvocations: sanitizedToolInvocations,
    };
  });

  return messagesBySanitizedToolInvocations.filter(
    (message) =>
      message.content.length > 0 ||
      (message.toolInvocations && message.toolInvocations.length > 0),
  );
}

export function getMostRecentUserMessage(messages: Array<any>) {
  const userMessages = messages.filter((message) => message.role === 'user');
  return userMessages.at(-1);
}

export function getDocumentTimestampByIndex(
  documents: Array<any>,
  index: number,
) {
  if (!documents) return new Date();
  if (index > documents.length) return new Date();

  return documents[index].createdAt;
}

export function getMessageIdFromAnnotations(message: any) {
  if (!message.annotations) return message.id;

  const [annotation] = message.annotations;
  if (!annotation) return message.id;


  return annotation.messageIdFromServer;
}

export const handleSetQueryParams = (id: string, title: string) => {
  const params = new URLSearchParams(window.location.search); // Get current query params

  // Set the new query parameters
  params.set('id', encryptData(id));
  params.set('title', encryptData(title));

  // Update the URL without reloading the page
  window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
};
const secretKey = process.env.NEXT_PUBLIC_SECRET_KEY

export const encryptData = (text: any) => {
  const data = CryptoJS.AES.encrypt(
    JSON.stringify(text),
    secretKey!
  ).toString().replace(/\//g, '_');

  return data;
};

export const decryptData = (text: any) => {
  if (!text || typeof text !== "string") {
    return null;
  }

  try {
    const bytes = CryptoJS.AES.decrypt(text.replace(/_/g, '/'), secretKey!);
    const decryptedText = bytes.toString(CryptoJS.enc.Utf8);

    // If decryption fails, CryptoJS returns empty string
    if (!decryptedText || decryptedText.trim() === "") {
      return null; 
    }

    // Try parsing JSON safely
    try {
      return JSON.parse(decryptedText);
    } catch {
      // If it's not JSON, return raw string
      return decryptedText;
    }

  } catch {
    // Silent failure — this is expected for invalid input
    return null;
  }
};


export const refreshIfEmpty = (value: any) => {
  if (value === null || value === undefined || value === '') {
    window.location.reload();
  }
};

// export function sanitizeInput(input: string | undefined): string | undefined {
//   if (!input) return input
//   return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] })?.trim()
// }

// utils/messageDocumentPairing.ts

interface ChatDocument extends Document {
  id: number;
  created_on: string;
  source: string;
  description: string;
}

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
  created_on?: string;
  paired_documents?: Document[]; 
}
// utils/messageDocumentPairing.ts

interface ChatDocument {
  id: number;
  created_on: string;
  source: string;
  description: string;
  is_failed?: boolean;  // Add these fields
  step?: string;        // Add these fields
}

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
  created_on?: string;
  documents?: ChatDocument[];
}

/**
 * Filter out failed documents
 * Documents with is_failed === true or step === "failed" are excluded
 */
const filterFailedDocuments = (documents: ChatDocument[]): ChatDocument[] => {
  return documents.filter(doc => {
    const isFailed = doc.is_failed === true || doc.step === "failed";
    return !isFailed;
  });
};

/**
 * Pair documents with messages based on time intervals between user messages
 * Documents that fall between Msg1 and Msg2 belong to Msg2
 * Failed documents are automatically excluded
 * 
 * Timeline:
 * Msg1 (10:00) ── Documents uploaded ── Msg2 (10:05) → Documents belong to Msg2
 *                    (10:02, 10:03)
 */
export const pairMessagesWithDocuments = (
  messages: any[],
  documents: ChatDocument[]
): Message[] => {

  // First, filter out failed documents
  const validDocuments = filterFailedDocuments(documents);
  
  if (!validDocuments.length) return messages;

  // Sort messages by timestamp
  const sortedMessages = [...messages].sort((a, b) => {
    if (!a.created_on) return 1;
    if (!b.created_on) return -1;
    return new Date(a.created_on).getTime() - new Date(b.created_on).getTime();
  });

  // Sort valid documents by timestamp
  const sortedDocs = [...validDocuments].sort((a, b) => 
    new Date(a.created_on).getTime() - new Date(b.created_on).getTime()
  );

  // Get all user messages with timestamps
  const userMessages = sortedMessages
    .map((msg, index) => ({ ...msg, originalIndex: index }))
    .filter(msg => msg.role === 'user' && msg.created_on);

  if (!userMessages.length) return messages;

  const result = [...sortedMessages];
  let docIndex = 0;

  // Handle documents that come before the first user message
  const firstMsg = userMessages[0];
  const firstMsgTime = new Date(firstMsg.created_on!).getTime();
  
  const docsBeforeFirst: ChatDocument[] = [];
  while (docIndex < sortedDocs.length) {
    const doc = sortedDocs[docIndex];
    const docTime = new Date(doc.created_on).getTime();
    
    if (docTime < firstMsgTime) {
      docsBeforeFirst.push(doc);
      docIndex++;
    } else {
      break;
    }
  }
  
  // Attach documents before first message to the first message
  if (docsBeforeFirst.length > 0) {
    const firstIndex = firstMsg.originalIndex;
    result[firstIndex] = {
      ...result[firstIndex],
      documents: docsBeforeFirst
    };
  }

  // For each subsequent user message
  for (let i = 1; i < userMessages.length; i++) {
    const currentMsg = userMessages[i];
    const prevMsg = userMessages[i - 1];
    
    const prevTime = new Date(prevMsg.created_on!).getTime();
    const currentTime = new Date(currentMsg.created_on!).getTime();
    
    
    // Collect documents that fall between previous message and current message
    const docsForCurrentMsg: ChatDocument[] = [];
    
    while (docIndex < sortedDocs.length) {
      const doc = sortedDocs[docIndex];
      const docTime = new Date(doc.created_on).getTime();
      
      while (docIndex < sortedDocs.length) {
        const doc = sortedDocs[docIndex];
        const docTime = new Date(doc.created_on).getTime();
      
        // prevent overlap with previous message
        if (docTime <= prevTime) {
          docIndex++;
          continue;
        }
      
        if (docTime > currentTime) {
          break;
        }
      
        docsForCurrentMsg.push(doc);
        docIndex++;
      }
    }
    
    // Add documents to the current user message
    if (docsForCurrentMsg.length > 0) {
      const originalIndex = currentMsg.originalIndex;
      result[originalIndex] = {
        ...result[originalIndex],
        documents: docsForCurrentMsg
      };
    }
  }
  
  // Handle documents that come after the last message
  const lastUserMsg = userMessages[userMessages.length - 1];
  if (lastUserMsg && docIndex < sortedDocs.length) {
    const remainingDocs = sortedDocs.slice(docIndex);
    if (remainingDocs.length > 0) {
      const lastIndex = lastUserMsg.originalIndex;
      const existingDocs = result[lastIndex].documents || [];
      result[lastIndex] = {
        ...result[lastIndex],
        documents: [...existingDocs, ...remainingDocs]
      };
      console.log(`Added ${remainingDocs.length} valid docs to last message`);
    }
  }

  return result;
};

/**
 * Group documents by their proximity to messages
 * Returns a map of message indices to their paired documents
 * Failed documents are automatically excluded
 */
export const getMessageDocumentPairs = (
  messages: Message[],
  documents: ChatDocument[]
): Map<number, ChatDocument[]> => {
  const pairs = new Map<number, ChatDocument[]>();
  
  if (!documents.length) return pairs;

  // First, get the properly paired messages (which already filters failed docs)
  const pairedMessages = pairMessagesWithDocuments(messages, documents);
  
  // Then create a map of index -> documents
  pairedMessages.forEach((message, index) => {
    if (message.role === "user" && message.documents && message.documents.length > 0) {
      pairs.set(index, message.documents);
    }
  });

  return pairs;
};