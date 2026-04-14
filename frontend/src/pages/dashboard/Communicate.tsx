import { useEffect, useState, useRef } from 'react';
import { MessageSquare, Search, Send, User as UserIcon } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import { chatApi, type Conversation, type ChatMessage } from '../../lib/chatApi';

const API_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5000';

export default function Communicate() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    const newSocket = io(API_URL);
    setSocket(newSocket);

    newSocket.emit('join_room', user._id);

    const loadConversations = async () => {
      try {
        const data = await chatApi.getConversations();
        setConversations(data);
      } catch (err) {
        console.error('Failed to load conversations', err);
      }
    };

    void loadConversations();

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  useEffect(() => {
    if (socket) {
      socket.on('receive_message', (message: ChatMessage) => {
        setMessages((prev) => [...prev, message]);
        // Update last message in conversations locally
        setConversations(prevConvs => prevConvs.map(conv => 
          conv._id === message.conversation 
            ? { ...conv, lastMessage: message }
            : conv
        ));
      });
    }
  }, [socket]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async (conversationId: string) => {
    try {
      const data = await chatApi.getMessages(conversationId);
      setMessages(data);
    } catch (err) {
      console.error('Failed to load messages', err);
    }
  };

  const handleSendMessage = async () => {
    if (newMessage.trim() === '' || !socket || !currentConversation || !user) return;

    try {
      const sentMessage = await chatApi.sendMessage(currentConversation._id, newMessage);
      
      const receiver = currentConversation.participants.find(p => p._id !== user._id);
      
      if (receiver) {
        socket.emit('send_message', { receiverId: receiver._id, message: sentMessage });
      }

      setMessages((prev) => [...prev, sentMessage]);
      setConversations(prevConvs => prevConvs.map(conv => 
        conv._id === currentConversation._id 
          ? { ...conv, lastMessage: sentMessage }
          : conv
      ));
      setNewMessage('');
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  const selectConversation = (conv: Conversation) => {
    setCurrentConversation(conv);
    void loadMessages(conv._id);
  };

  const getOtherParticipant = (conv: Conversation) => {
    if (!user) return null;
    return conv.participants.find(p => p._id !== user._id);
  };

  return (
    <div className="h-[calc(100vh-160px)] flex gap-6 animate-fade-in">
      {/* Contact List */}
      <div className="w-2/5 bg-white border border-light-color/50 rounded-3xl flex flex-col overflow-hidden shadow-sm">
        <div className="p-6 border-b border-light-color/50">
          <h2 className="text-2xl font-bold text-dark-blue flex items-center gap-3 mb-5">
            <MessageSquare className="h-7 w-7 text-accent-yellow" />
            Messages
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search contacts..."
              className="w-full pl-10 pr-4 py-3 border border-light-color rounded-xl focus:outline-none focus:border-dark-blue/30 text-base"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-8 text-center text-body-text/60">No conversations found.</div>
          ) : (
            conversations.map((conv) => {
              const other = getOtherParticipant(conv);
              if (!other) return null;

              return (
                <div 
                  key={conv._id} 
                  onClick={() => selectConversation(conv)}
                  className={`px-5 py-5 border-b border-light-color/50 flex items-center gap-4 cursor-pointer hover:bg-light-color/10 transition-colors ${currentConversation?._id === conv._id ? 'bg-light-color/30' : ''}`}
                >
                  <div className="relative flex-shrink-0">
                    <div className="h-14 w-14 bg-dark-blue rounded-full flex items-center justify-center text-white">
                      <UserIcon className="h-7 w-7" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <h4 className="text-base font-bold text-dark-blue truncate">{other.name}</h4>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-2">
                        {other.role}
                      </span>
                    </div>
                    <p className="text-sm text-body-text truncate">{conv.lastMessage?.text || 'No messages yet'}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-white border border-light-color/50 rounded-3xl flex flex-col overflow-hidden shadow-sm">
        {currentConversation ? (
          <>
            <div className="h-24 border-b border-light-color/50 px-8 flex items-center justify-between bg-white/80 backdrop-blur-sm z-10">
              <div className="flex items-center gap-5">
                <div className="h-14 w-14 bg-dark-blue rounded-full flex items-center justify-center text-white relative flex-shrink-0">
                  <UserIcon className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="font-bold text-dark-blue text-xl">{getOtherParticipant(currentConversation)?.name || 'Unknown'}</h3>
                  <p className="text-sm text-slate-500 font-medium tracking-wide">
                    {getOtherParticipant(currentConversation)?.role || 'User'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-light-color/10">
              {messages.map((msg, i) => {
                const isMe = msg.sender === user?._id;
                return (
                  <div key={msg._id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-2xl px-6 py-4 shadow-sm relative ${isMe ? 'bg-dark-blue text-white rounded-tr-sm shadow-md' : 'bg-white border border-light-color/50 rounded-tl-sm'}`}>
                      <p className={`text-base leading-relaxed ${isMe ? 'text-white/90' : 'text-body-text'}`}>{msg.text}</p>
                      <span className={`text-[10px] font-semibold absolute -bottom-6 ${isMe ? 'right-2' : 'left-2'} text-slate-400`}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={scrollRef} />
            </div>

            <div className="p-5 bg-white border-t border-light-color/50 mt-4">
              <div className="flex items-center gap-3 bg-light-color/20 border border-light-color p-2 rounded-2xl">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && void handleSendMessage()}
                  placeholder="Type your message..."
                  className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 px-4 text-base text-body-text"
                />
                <button 
                  onClick={() => void handleSendMessage()}
                  className="bg-accent-yellow hover:bg-yellow-default text-dark-blue p-3.5 rounded-xl transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-yellow"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-body-text/40 space-y-4">
            <MessageSquare className="h-20 w-20 opacity-10" />
            <p className="text-xl font-medium">Select a conversation to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}
