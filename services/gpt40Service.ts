  
    import { SYSTEM_PROMPT, QUERY_OPTIMIZER_PROMPT, KNOWLEDGE_JSON_PROMPT } from '../constants';
import type { ChatbotResponse, SearchResult, IntentKnowledgeItem, ChatMessage } from '../types';

// Define a local type for chat messages to remove the OpenAI dependency
type ChatMessageParam = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

const API_BASE_URL = '/.netlify/functions';

const getChatCompletion = async (messages: ChatMessageParam[], model: string = "gpt-4o-mini", isJson = false) => {
  const body: any = { messages, model };
  if (isJson) {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch(`${API_BASE_URL}/api/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.json();
    throw new Error(`Failed to get chat completion: ${errorBody.error || response.statusText}`);
  }

  return response.json();
};


export const getOptimizedQuery = async (history: ChatMessage[], userQuery: string): Promise<string> => {
  // Format the last 4 messages of history into a simple string
  const historyString = history
    .slice(-4)
    .map(msg => `${msg.role === 'bot' ? 'Assistant' : 'User'}: ${msg.content}`)
    .join('\n');

  const prompt = QUERY_OPTIMIZER_PROMPT
    .replace('{CONVERSATION_HISTORY}', historyString)
    .replace('{USER_QUESTION}', userQuery);
    
  try {
    const messages: ChatMessageParam[] = [{ role: "user", content: prompt }];
    const response = await getChatCompletion(messages, "gpt-4o-mini", false);
    return response.choices[0].message.content?.trim() || userQuery;
  } catch (error) {
    console.error("Error optimizing query:", error);
    return userQuery;
  }
};
const buildUserPrompt = (originalQuery: string, optimizedQuery: string, context: SearchResult[]): string => {
      const contextString = context
        .map(result => `Document ${result.document.id} (Similarity: ${result.similarity.toFixed(4)}):\n${result.document.content}`)
        .join('\n\n---\n\n');
      
      const topSimilarity = context.length > 0 ? context[0].similarity.toFixed(4) : "N/A";
    
      return `
User's Latest Question: "${originalQuery}"

[Reference Data]
Optimized Search Query: "${optimizedQuery}"
Top Document Similarity Score: ${topSimilarity}
Context Documents:
${contextString}
      `;
    };
    
export const getLLMResponse = async (
  history: ChatMessage[], 
  originalQuery: string, 
  optimizedQuery: string, 
  context: SearchResult[]
): Promise<ChatbotResponse | null> => {
  const userPrompt = buildUserPrompt(originalQuery, optimizedQuery, context);

  // Take the last 6 messages from history for context, and sanitize them
  const recentHistory = history
    .slice(-6)
    .map(({ role, content }) => ({
      role: role === 'bot' ? 'assistant' : role,
      content
    } as ChatMessageParam));

  try {
    const messages: ChatMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...recentHistory,
      { role: "user", content: userPrompt }
    ];

    const response = await getChatCompletion(messages, "gpt-4o-mini", true);
    
    const content = response.choices[0].message.content;
    if (!content) {
        throw new Error("Empty response from LLM");
    }

    const parsedJson = JSON.parse(content) as ChatbotResponse;
    parsedJson.optimized_query = optimizedQuery;

    return parsedJson;

  } catch (error) {
    console.error("Error generating content from LLM:", error);
    return {
      decision: "not_answerable",
      similarity_top: context.length > 0 ? context[0].similarity : 0,
      used_context_ids: [],
      answer_korean: "AI 응답을 처리하는 중 오류가 발생했습니다. 다시 시도해 주세요.",
      notes: error instanceof Error ? error.message : "An unknown error occurred.",
      optimized_query: optimizedQuery
    };
  }
};

export const generateKnowledgeBaseJSON = async (rawText: string): Promise<IntentKnowledgeItem[]> => {
  const prompt = KNOWLEDGE_JSON_PROMPT.replace('{RAW_TEXT}', rawText);

  try {
    const response = await fetch(`${API_BASE_URL}/api/generate-knowledge`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: rawText, prompt: KNOWLEDGE_JSON_PROMPT }),
    });

    if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(`Failed to generate knowledge: ${errorBody.error || response.statusText}`);
    }
    
    const completion = await response.json();
    const content = completion.choices[0].message.content;

    if (!content) {
        throw new Error("Empty response from knowledge generation endpoint");
    }
    
    const parsed = JSON.parse(content);
    const newItems = parsed.knowledgeItems || [];
    
    if (!Array.isArray(newItems)) {
        throw new Error("API did not return an array in knowledgeItems");
    }

    // Ensure uniqueness of new IDs
    return newItems.map((item: any) => ({
      ...item,
      id: `${item.id || 'new'}-${Date.now()}`
    }));
  } catch (error) {
    console.error("Error generating knowledge base JSON:", error);
    return [];
  }
};
    
  