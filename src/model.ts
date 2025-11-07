export interface CreateChatThreadParams {
  agentId: number;
  created_by: string;
  user_id: number;
}

export interface ChatThreadResponse {
  id: number;
  corpus_id: null | number;
  agent: number;
  created_by: string;
  user: number;
  created_on: string;
  modified_by: string;
  modified_on: string;
  title: string;
  is_deleted: boolean;
  chat_id: null | number;
}

export interface AllChatsResponseV2 {
  message: string;
  success: boolean;
  data: {
    chat_threads: ChatThreadResponse[];
  }
}

export type chatThreadResponse = {
  id: number;
  response: AgentChatResponse;
  stage: number | null;
  query_source: string;
  is_cleared: boolean;
  created_by: string;
  created_on: string;
  workflow: number;
  thread: number;
  user: number;
  comments: ChatReviewResponse[];
  feedback: chatFeedbackResponse[];
  chatlog_id?: number;
  question?: string;
};

export type chatThreadResponseV2 = {
  data: chatThreadResponse[];
  message: string;
  success: boolean;
}

export type ChatThreadAgentResponsesItemsV2 = {
  id: number;
  response: AgentChatResponse;
  stage: number | null;
  query_source: string;
  is_cleared: boolean;
  created_by: string;
  created_on: string;
  workflow: number;
  thread: number;
  user: number;
  comments: ChatReviewResponse[];
  feedback: chatFeedbackResponse[];
  chatlog_id?: number;
  question?: string;
};

export type ChatThreadAgentResponsesV2 = {
  data: ChatThreadAgentResponsesDataV2;
  message: string;
  success: boolean;
}

export type ChatThreadAgentResponsesDataV2 = {
  agent_responses: ChatThreadAgentResponsesItemsV2[];
}

export type chatFeedbackResponse = {
  id: number;
  is_upvote: boolean;
  is_downvote: boolean;
  created_by: string;
  created_on: string;
  workflow_response: number;
};
export type ChatReviewResponse = {
  id: number;
  comment?: string;
  created_by: string;
  created_on: string;
  workflow_response: number;
  response?: number;
  comments?: any[];
};

export interface AgentChatResponse {
  agents_used?: {
    id: number;
    name: string;
  }[];
  answer: string;
  query: string;
  sources: string;
  references: {
    order: number;
    url: string;
    number: number;
  }[];
  indexes: string[];
  followup_questions: string[];
  thread_name: string;
  agent_response_id: number;
  id: number;
}

export type AgentChatFeedbackRequestBody = {
  vote_type?: string;
};

export type Item = {
  // name: string;
  // versions: string[];
  // id: number;
  name: string;
  versions: string[];
  corpusIds: number[];
};

export type CorpusItem = {
  corpusName: string;
  corpusId: number[];
  versions: string[];
};

export interface ChatEventHandlers {
  onopen?: (response: any) => Promise<void>;
  onmessage?: (event: { data: string }) => void;
  onclose?: () => void;
  onerror?: (error: Error) => void;
  signal?: AbortSignal;
}
