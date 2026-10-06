import { apiClient } from './httpClient';

export interface AssistantTurn {
  role: 'user' | 'assistant';
  text: string;
}

export interface AssistantReply {
  answer: string;
  suggestions: string[];
  answeredBy: 'llm' | 'faq';
}

export const assistantApi = {
  ask: async (message: string, history: AssistantTurn[]) => {
    const response = await apiClient.post<{ data: AssistantReply }>('/assistant/ask', { message, history });
    return response.data.data;
  },
};
