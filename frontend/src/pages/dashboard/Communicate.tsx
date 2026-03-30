import { useEffect, useState, useRef } from 'react';
import { MessageSquare, Search, Send, User as UserIcon } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

const API_URL = 'http://localhost:5000';

export default function Communicate() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [currentConversation, setCurrentConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const newSocket = io(API_URL);
    setSocket(newSocket);

    // Mock fetching conversations for now, in real app call API
    setConversations([
      { id: '1', name: 'Advisor Sarah', role: 'Advisor', lastMessage: 'Reviewing your application...', online: true },
      { id: '2', name: 'Admin RIO', role: 'Admin', lastMessage: 'Documents received.', online: false },
    ]);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('receive_message', (message: any) => {
        setMessages((prev) => [...prev, message]);
      });
    }
  }, [socket]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (newMessage.trim() === '' || !socket) return;

    const messageData = {
      text: newMessage,
      sender: 'me', // In real app, use auth user ID
      createdAt: new Date().toISOString(),
    };

    socket.emit('send_message', { receiverId: currentConversation?.id, message: messageData });
    setMessages((prev) => [...prev, messageData]);
    setNewMessage('');
  };

  const selectConversation = (conv: any) => {
    setCurrentConversation(conv);
    // Mock messages for selection
    setMessages([
      { text: `Hello! I'm ${conv.name}. How can I help you?`, sender: 'them', createdAt: new Date().toISOString() },
    ]);
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
          {conversations.map((conv) => (
            <div 
              key={conv.id} 
              onClick={() => selectConversation(conv)}
              className={`px-5 py-5 border-b border-light-color/50 flex items-center gap-4 cursor-pointer hover:bg-light-color/10 transition-colors ${currentConversation?.id === conv.id ? 'bg-light-color/30' : ''}`}
            >
              <div className="relative flex-shrink-0">
                <div className="h-14 w-14 bg-dark-blue rounded-full flex items-center justify-center text-white">
                  <UserIcon className="h-7 w-7" />
                </div>
                {conv.online && <div className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 bg-green-500 rounded-full border-2 border-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <h4 className="text-base font-bold text-dark-blue truncate">{conv.name}</h4>
                  <span className="text-xs text-gray-500 flex-shrink-0 ml-2">Just now</span>
                </div>
                <p className="text-sm text-body-text truncate">{conv.lastMessage}</p>
              </div>
            </div>
          ))}
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
                  {currentConversation.online && <div className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 bg-green-500 rounded-full border-2 border-white" />}
                </div>
                <div>
                  <h3 className="font-bold text-dark-blue text-xl">{currentConversation.name}</h3>
                  <p className={`text-sm ${currentConversation.online ? 'text-green-500' : 'text-gray-400'} font-medium tracking-wide`}>
                    {currentConversation.online ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-light-color/10">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-2xl px-6 py-4 shadow-sm relative ${msg.sender === 'me' ? 'bg-dark-blue text-white rounded-tr-sm shadow-md' : 'bg-white border border-light-color/50 rounded-tl-sm'}`}>
                    <p className={`text-base leading-relaxed ${msg.sender === 'me' ? 'text-white/90' : 'text-body-text'}`}>{msg.text}</p>
                    <span className="text-xs text-gray-400 absolute -bottom-6 right-2">
                       {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>

            <div className="p-5 bg-white border-t border-light-color/50">
              <div className="flex items-center gap-3 bg-light-color/20 border border-light-color p-2 rounded-2xl">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type your message..."
                  className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 px-4 text-base text-body-text"
                />
                <button 
                  onClick={handleSendMessage}
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
