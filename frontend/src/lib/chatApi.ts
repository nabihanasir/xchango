import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

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

const chatApiClient = axios.create({
  baseURL: API_BASE,
});

chatApiClient.interceptors.request.use((config) => {
  const storedUser = localStorage.getItem('user');
  if (!storedUser) return config;
  const user = JSON.parse(storedUser) as { token?: string };
  if (user.token) {
    config.headers.Authorization = `Bearer ${user.token}`;
  }
  return config;
});

const unwrap = async <T>(request: Promise<{ data: ApiEnvelope<T> }>) => {
  const response = await request;
  return response.data.data;
};

export const chatApi = {
  getConversations: () => unwrap<Conversation[]>(chatApiClient.get('/chat/conversations')),
  getMessages: (conversationId: string) =>
    unwrap<ChatMessage[]>(chatApiClient.get(`/chat/messages/${conversationId}`)),
  startConversation: (participantId: string) =>
    unwrap<Conversation>(chatApiClient.post('/chat/conversations', { participantId })),
  sendMessage: (conversationId: string, text: string) =>
    unwrap<ChatMessage>(chatApiClient.post('/chat/messages', { conversationId, text })),
};
