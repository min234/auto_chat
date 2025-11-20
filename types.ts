export interface ChatbotResponse {
  decision: "answerable" | "not_answerable";
  similarity_top: number;
  used_context_ids: (number | string)[];
  answer_korean: string;
  notes: string;
  optimized_query?: string;
}

export interface ChatMessage {
  id: number;
  role: 'user' | 'bot';
  content: string;
  debugInfo?: ChatbotResponse;
}

export interface Document {
  id: number | string;
  content: string;
  keywords?: string[];
}

export interface SearchResult {
  id: number;
  similarity: number;
  document: Document;
}

export interface IntentKnowledgeItem {
  id: string;
  type: 'intent';
  intent: string;
  user_utterances: string[];
  answer: string;
  category: string;
}

export type VectorStore = { [key: string]: number[] };

export type Knowledge = IntentKnowledgeItem[];

export type GoogleAuthTokens = any;