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
  if (!text) {
    return null;
  }

  try {
    // Decrypt the text and handle the key internally
    const bytes = CryptoJS.AES.decrypt(text.replace(/_/g, '/'), secretKey!);
    const decryptedText = bytes.toString(CryptoJS.enc.Utf8);

    // Check if the decrypted text is empty or undefined
    if (!decryptedText) {
      throw new Error('Decryption resulted in an empty string.');
    }

    // Attempt to parse the decrypted text as JSON
    const data = JSON.parse(decryptedText);
    return data;
  } catch (error:any) {
    console.error('Error decrypting or parsing data:', error.message);
    return null; // Return null to avoid breaking the app
  }
};

export const refreshIfEmpty = (value: any) => {
  if (value === null || value === undefined || value === '') {
    window.location.reload();
  }
};
