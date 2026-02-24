import axios from 'axios';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { UserConfig } from './app/context/ConfigContext';
import { getProxiedUrl, getApiHeaders, API_CONFIG } from './lib/api-config';
import { 
  AgentChatFeedbackRequestBody, 
  ChatEventHandlers, 
  chatThreadResponse, 
  ChatThreadResponse, 
  chatThreadResponseV2, 
  AllChatsResponseV2, 
  ChatThreadAgentResponsesV2,
  createChatThreadResponse
} from './model';

/**
 * Unified API Service class that handles all API calls
 * 
 * PUBLIC_AGENT MODE INTEGRATION:
 * When PUBLIC_AGENT=true, this service uses the author's credentials from environment variables
 * (provided via ConfigContext) to make API calls on behalf of public users.
 * 
 * All API calls in PUBLIC_AGENT mode:
 * - Use the author's API key and access token (from env vars)
 * - Store responses locally in IndexedDB (not on server)
 * - Support browser-only chat sessions with data isolation
 * 
 * @see ConfigContext for credential management
 * @see PublicAgentSessionContext for IndexedDB storage
 */
export class ApiService {
  constructor(private config: UserConfig) {}

  private getHeaders(baseUrl?: string): Record<string, string> {
    // For environment-driven config, credentials may not be in client config
    // They are retrieved server-side via proxy. Use empty strings as fallback.
    return getApiHeaders(
      baseUrl || this.config.baseUrl, 
      this.config.ejentoAccessToken || '',
      this.config.apiKey || ''
    );
  }

  async getCurrentUser(): Promise<any> {
    try {
      const url = getProxiedUrl(
        'api/v2/users/me',
        this.config.baseUrl
      );
      const response = await axios.get(url, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  async getAgent(agentId: string): Promise<{success: boolean, message: string, data: any}> {
    try {
      const url = getProxiedUrl(
        `api/v2/agents/${agentId}`,
        this.config.baseUrl
      );
      const response = await axios.get(url, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        // Return error response in the expected format
        return {
          success: false,
          message: error.response.data?.message || 'Failed to retrieve agent',
          data: null
        };
      }
      throw error;
    }
  }

  async getCorpus(): Promise<any> {
    try {
      const url = getProxiedUrl(
        `api/v2/agents/${this.config.agentId}/corpora?verbosity=medium&is_enabled=true`,
        this.config.baseUrl
      );
      const response = await axios.get(url, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        return error.response.status;
      }
      throw error;
    }
  }

  // ==================== CHAT METHODS ====================

  async streamChatRequest(
    options: any,
    handlers: ChatEventHandlers
  ): Promise<() => void> {
    const requestBody  = options;
    const agentId = this.config.agentId;
  
    const controller = new AbortController();
    const signal = handlers.signal || controller.signal;
  
    try {
      console.log('this api is suing9')
      const url = getProxiedUrl(
        `response-service/api/v2/agents/${agentId}/responses/stream`,
        this.config.baseUrl
      );
      const headers = this.getHeaders();
      
      await fetchEventSource(url, {
        method: "POST",
        headers: {
          ...headers,
          "Accept": "text/event-stream",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,PUT,POST,DELETE,PATCH,OPTIONS"
        },
        signal,
        openWhenHidden: true,
        body: JSON.stringify(requestBody),
        onopen: async (res) => {
          await handlers.onopen?.(res);
        },
        onmessage: (event) => {
          handlers.onmessage?.(event);
        },
        onclose: () => {
          handlers.onclose?.();
        },
        onerror: handlers.onerror || ((err) => {
          console.error("Stream connection error:", err);
        })
      });
    } catch (error) {
      console.error("Failed to establish stream connection:", error);
      handlers.onerror?.(error instanceof Error ? error : new Error(String(error)));
    }
  
    return () => controller.abort();
  }

  async sendChat(data: any): Promise<any> {
    try {
      console.log('this api is suing8')
      const { agent_id, ...rest } = data;
      const url = getProxiedUrl(
        `response-service/api/v2/agents/${this.config.agentId}/responses`,
        this.config.baseUrl
      );
      const response = await axios.post<any>(url, data, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        const statusCode = error.response.status;
        const serverMessage = error.response.data?.message || "Unknown error occurred";
        console.error(`Error ${statusCode}: ${serverMessage}`);
        return {
          success: false,
          status: statusCode,
          message: serverMessage,
        };
      }

      console.error("An unexpected error occurred:", error.message);
      return {
        success: false,
        status: 500,
        message: "An unexpected error occurred.",
      };
    }
  }

  async getChatlogs(threadID: number): Promise<ChatThreadAgentResponsesV2> {
    try {
      console.log('this api is suing7')
      const url = getProxiedUrl(
        `api/v2/chat-threads/${threadID}/agent-responses?include_steps=true`,
        this.config.baseUrl
      );
      const response = await axios.get<ChatThreadAgentResponsesV2>(url, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(error.response.data.message || "Failed to get chat thread.");
      }
      throw new Error("An unexpected error occurred.");
    }
  }

  async handleUpvote(data: AgentChatFeedbackRequestBody, chatId: number): Promise<any> {

    const body = {
      vote_type: data?.vote_type,
    };

    try {
      const url = getProxiedUrl(
        `api/v2/agent-responses/${chatId}/feedbacks`,
        this.config.baseUrl
      );
      const response = await axios.post(url, body, {
        headers: this.getHeaders(),
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorData = error.response.data;
        throw new Error(errorData.message || 'Failed to record feedback.');
      }
      throw new Error('An error occurred while making the request.');
    }
  }

  async handleDownvote(data: AgentChatFeedbackRequestBody, chatId: number): Promise<any> {

    const body = {
      vote_type: data?.vote_type,
    };

    try {
      const url = getProxiedUrl(
        `api/v2/agent-responses/${chatId}/feedbacks`,
        this.config.baseUrl
      );
      const response = await axios.post(url, body, {
        headers: this.getHeaders(),
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorData = error.response.data;
        throw new Error(errorData.message || 'Failed to record feedback.');
      }
      throw new Error('An error occurred while making the request.');
    }
  }

  async handleComment(data: any): Promise<chatThreadResponse> {
    try {

      const body = {
        comment: data?.comment,
        created_by: data?.created_by
      }
      const url = getProxiedUrl(
        `api/v2/agent-responses/${data?.chat_id}/comments`,
        this.config.baseUrl
      );
      const response = await axios.post(url, body, {
        headers: this.getHeaders(),
      });

      return response.data as chatThreadResponse;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorData = error.response.data;
        throw new Error(errorData.message || 'Failed to record feedback.');
      }
      throw new Error('An error occurred while making the request.');
    }
  }

  async createChatThread(agentId: number, created_by?: string): Promise<createChatThreadResponse[]> {

    if (!agentId) {
      throw new Error("agentId is required.");
    }

    try {
      const body = {
        agent: agentId,
        created_by: created_by,
      };

      const url = getProxiedUrl(
        `api/v2/agents/${agentId}/chat-threads`,
        this.config.baseUrl
      );
      const response = await axios.post<createChatThreadResponse[]>(url, body, {
        headers: this.getHeaders(),
      });

      return response.data;
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data?.message || "Failed to create chat thread.");
      }
      throw new Error("An unexpected error occurred while creating the chat thread.");
    }
  }

  async createCorpusThreadConnection(threadId: string, corpus_id: string){

    if (!threadId && !corpus_id) {
      throw new Error("missing required parameters");
    }

    try {
      const url = getProxiedUrl(
        `/api/v2/chat-threads/${threadId}/corpora/${corpus_id}`,
        this.config.baseUrl
      );
      const response = await axios.post(url,{
        headers: this.getHeaders(),
      });

      return response.data;
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data?.message || "Failed to create chat thread.");
      }
      throw new Error("An unexpected error occurred while creating the chat thread.");
    }
  }

  async createCorpus(thread_id :  any){
    console.log(thread_id,'thread id')
    const body = {
      name: `AttachmentCorpus-${thread_id}`,
      description: "Attachment Corpus",
      indexing_mode_id: 3,
      corpus_type : 'attachment',
    }
    try {
      const url = getProxiedUrl(
        `/api/v2/corpora`,
        this.config.baseUrl
      );
      const response = await axios.post(url,body,{
        headers: this.getHeaders(),

      });
      console.log(response,'response from corpus')
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(error.response.data.message || "Failed to get chat threads.");
      }
      throw new Error("An unexpected error occurred.");
    }
  }
  async uploadDocumentToCorpus(corpusId: string, file: File){
    try {
      const formData = new FormData();
  
      formData.append("user_id", "722"); // required
      formData.append("content_type", "file"); // required
      formData.append("upload_from", "web"); // required
      formData.append("attachment", "true"); // required
      formData.append("source", file); // important (file)
  
      const response = await fetch(`/api/corpus?id=${corpusId}`, {
        method: "POST",
        body: formData,
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        throw new Error(data.message || "Upload failed");
      }
      return data
    } catch (error) {
      console.error("Error uploading document:", error);
    }
  };

  async getDocumentStatus(documentId: number): Promise<any> {
    try {
      const url = getProxiedUrl(
        `api/v2/documents/${documentId}`,
        this.config.baseUrl
      );
      const response = await axios.get(url, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data?.message || "Failed to get document status."
        );
      }
      throw new Error("An unexpected error occurred while getting document status.");
    }
  }


  async getChatThreads(): Promise<AllChatsResponseV2> {

    try {
      const url = getProxiedUrl(
        `api/v2/agents/${this.config.agentId}/chat-threads?query_source=app-ejento`,
        this.config.baseUrl
      );
      const response = await axios.get<AllChatsResponseV2>(url, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(error.response.data.message || "Failed to get chat threads.");
      }
      throw new Error("An unexpected error occurred.");
    }
  }

  async deleteChatThread(deleteId: number): Promise<any> {

    try {
      console.log('this api is suing2')
      const url = getProxiedUrl(
        `api/v2/chat-threads/${deleteId}`,
        this.config.baseUrl
      );
      const response = await axios.delete<any>(url, {
        headers: this.getHeaders(),
      });

      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(error.response.data.message || "Failed to delete chat thread.");
      }
      throw new Error("An unexpected error occurred.");
    }
  }

  async updateChatThreadTitle(chatId: number, newTitle: string, modifiedBy?: string): Promise<AllChatsResponseV2> {

    const created_by = modifiedBy || this.config.userInfo?.email || 'user'
    try {
      console.log('this api is suing')
      const url = getProxiedUrl(
        `api/v2/chat-threads/${chatId}`,
        this.config.baseUrl
      );
      const response = await axios.put<AllChatsResponseV2>(
        url,
        {
          title: newTitle, 
        },
        {
          headers: this.getHeaders(),
        }
      );

      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(error.response.data.message || "Failed to update chat thread title.");
      }
      throw new Error("An unexpected error occurred while updating the chat thread title.");
    }
  }

    // ==================== Authentication METHODS ====================

    async passwordlessAuth(email: string, otp_session_id? : string) {
      if (!email) {
        throw new Error("Email is required for passwordless authentication.");
      }
    
      try {
        const url = getProxiedUrl(
          'auth-service/api/v2/users/passwordless-auth',
          this.config.baseUrl
        );

        const path = `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirmation/`

        const payload: {
          email: string;
          next: string;
          otp_session_id?: string;
        } = {
          email,
          next: path,
        };
        
        if (otp_session_id) {
          payload.otp_session_id = otp_session_id; //needed when we are requiring a new otp code 
        }
    
        const response = await axios.post(url, payload, {
          headers: this.getHeaders(),
        });
        console.log('Response at line 401:', response); 
        return {
          success: true,
          message: "Email sent successfully.",
          data: response.data || {},
        };
      } catch (error: any) {
        
        
        const status = error?.response?.status;
        let userMessage;

        if( status === 401 ) { userMessage = 'you are not authorized' }
        else if (status === 500) userMessage = "Server error. Try again later.";
        else{
          userMessage = error?.response?.data?.detail || "Something went wrong. Please try again.";
        }

        if (axios.isAxiosError(error) && error.response) {
          return {
            success: false,
            message: userMessage,
          };
        }
    
        return {
          success: false,
          message: "An unexpected error occurred.",
        };
      }
    };

    async featureFlags() {
      try {
        const url = getProxiedUrl(
          'auth-service/api/v2/feature-flags/logins',
          this.config.baseUrl
        );
    
        const response = await axios.get(url,{
          headers: getApiHeaders(
            this.config.baseUrl,
            this.config.ejentoAccessToken || '',
            this.config.apiKey || ''
          ),
        });
    
        return {
          success: true,
          data: response.data || {},
        };
      } catch (error: any) {
        
        if (axios.isAxiosError(error) && error.response) {
          return {
            success: false,
            error: error,
          };
        }
    
        throw new Error('An unexpected error occurred.');
        };
    }

    async validateMagicLink(token : string) {
      if (!token) {
        throw new Error("Token is required for magic link validation.");
      }
    
      try {
        const url = getProxiedUrl(
          'auth-service/api/v2/users/validate-magic-link',
          this.config.baseUrl
        );

        const response = await axios.post(url, {token}, {
          headers: getApiHeaders(
            this.config.baseUrl,
            this.config.ejentoAccessToken || '',
            this.config.apiKey || ''
          ),
        });
         
        if(response?.data?.success){
           
          return {
            success: true,
            message: "Magic link validated successfully",
            data: response.data || {},
          };

        }
        else{
          return {
            success: false,
            message: response.data.message || 'Unable to validate magic link',
            data: response.data || {},
          };
        }
    
      } catch (error : any) {
        const status = error?.response?.status;
        let userMessage;
        if (status === 401) userMessage = "You are not authorized.";
        else if (status === 500) userMessage = "Server error. Try again later.";
        else {
          userMessage = error?.response?.data?.detail || "Something went wrong. Please try again.";
        }
    
        return {
          success: false,
          message: userMessage,
        };
      }
    }

    async validateOtp(otp_session_id : string, code : string) {
      if (!otp_session_id && !code) {
        throw new Error("Something went wrong. Please try again.");
      }
    
      try {
        const url = getProxiedUrl(
          'auth-service/api/v2/users/verify-otp',
          this.config.baseUrl
        );
    
        const response = await axios.post(url, {otp_session_id,code}, {
          headers: getApiHeaders(
            this.config.baseUrl,
            this.config.ejentoAccessToken || '',
            this.config.apiKey || ''
          ),
        });
    
        return {
          success: true,
          message: "otp validated successfully",
          data: response.data || {},
        };
    
      } catch (error : any) {
        const status = error?.response?.status;
        let userMessage;
        if (status === 401) userMessage = "You are not authorized.";
        else if (status === 500) userMessage = "Server error. Try again later.";
        else{
          userMessage = error?.response?.data?.detail || 'Something went wrong. Please try again.'
        }
    
        return {
          success: false,
          message: userMessage,
        };
      }
    }

    // ==================== SSO METHODS ====================

    async SSO_PROVIDER(provider: string): Promise<string | null> {
      try {
        const res = await fetch(`/api/sso/${provider}`);
        const data = await res.json();
    
        if (data?.success && data?.redirectUrl) {
          return data.redirectUrl;
        }
    
        return null;
      } catch (error) {
        console.error(error);
        return null;
      }
    }
    
  }
  