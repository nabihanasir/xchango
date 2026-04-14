import { apiClient } from './httpClient';

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface Participant {
  _id: string;
  name: string;
  role: string;
  email: string;
}

export interface ChatMessage {
  _id: string;
  conversation: string;
  sender: string;
  text: string;
  createdAt: string;
}

export interface Conversation {
  _id: string;
  participants: Participant[];
  lastMessage?: ChatMessage;
  updatedAt: string;
}

const unwrap = async <T>(request: Promise<{ data: ApiEnvelope<T> }>) => {
  const response = await request;
  return response.data.data;
};

export const chatApi = {
  getConversations: () => unwrap<Conversation[]>(apiClient.get('/chat/conversations')),
  getMessages: (conversationId: string) =>
    unwrap<ChatMessage[]>(apiClient.get(`/chat/messages/${conversationId}`)),
  startConversation: (participantId: string) =>
    unwrap<Conversation>(apiClient.post('/chat/conversations', { participantId })),
  sendMessage: (conversationId: string, text: string) =>
    unwrap<ChatMessage>(apiClient.post('/chat/messages', { conversationId, text })),
};
