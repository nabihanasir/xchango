import { MessageSquare, Search, Send, User } from 'lucide-react';

export default function Communicate() {
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
          {/* Active Contact */}
          <div className="px-5 py-5 border-b border-light-color/50 bg-light-color/30 flex items-center gap-4 cursor-pointer">
            <div className="relative flex-shrink-0">
              <div className="h-14 w-14 bg-dark-blue rounded-full flex items-center justify-center text-white">
                <User className="h-7 w-7" />
              </div>
              <div className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 bg-green-500 rounded-full border-2 border-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-1">
                <h4 className="text-base font-bold text-dark-blue truncate">Advisor Sarah</h4>
                <span className="text-xs text-gray-500 flex-shrink-0 ml-2">10:42 AM</span>
              </div>
              <p className="text-sm text-body-text truncate">How is your application to Kyungdong...</p>
            </div>
          </div>

          {/* Other Contacts */}
          {[1, 2, 3].map(i => (
            <div key={i} className="px-5 py-5 border-b border-light-color/50 flex items-center gap-4 cursor-pointer hover:bg-light-color/10 transition-colors">
              <div className="h-14 w-14 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 flex-shrink-0">
                <User className="h-7 w-7" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <h4 className="text-base font-bold text-dark-blue truncate">University Rep {i}</h4>
                  <span className="text-xs text-gray-500 flex-shrink-0 ml-2">Yesterday</span>
                </div>
                <p className="text-sm text-body-text truncate">Please submit your transcripts.</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-white border border-light-color/50 rounded-3xl flex flex-col overflow-hidden shadow-sm">
        {/* Chat Header */}
        <div className="h-24 border-b border-light-color/50 px-8 flex items-center justify-between bg-white/80 backdrop-blur-sm z-10">
          <div className="flex items-center gap-5">
            <div className="h-14 w-14 bg-dark-blue rounded-full flex items-center justify-center text-white relative flex-shrink-0">
              <User className="h-7 w-7" />
              <div className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 bg-green-500 rounded-full border-2 border-white" />
            </div>
            <div>
              <h3 className="font-bold text-dark-blue text-xl">Advisor Sarah</h3>
              <p className="text-sm text-green-500 font-medium tracking-wide">Online</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-light-color/10">
          <div className="flex justify-start">
            <div className="max-w-[70%] bg-white border border-light-color/50 rounded-2xl rounded-tl-sm px-6 py-4 shadow-sm relative">
              <p className="text-body-text text-base leading-relaxed">Hello! I'm reviewing your application to Kyungdong University. Could you upload your latest IELTS scorecard?</p>
              <span className="text-xs text-gray-400 absolute -bottom-6 left-2">10:42 AM</span>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="max-w-[70%] bg-dark-blue text-white rounded-2xl rounded-tr-sm px-6 py-4 shadow-md relative">
              <p className="text-white/90 text-base leading-relaxed">Hi Sarah, sure. I will upload it in the next hour from the portal.</p>
              <span className="text-xs text-gray-400 absolute -bottom-6 right-2">10:45 AM</span>
            </div>
          </div>
        </div>

        {/* Input Area */}
        <div className="p-5 bg-white border-t border-light-color/50">
          <div className="flex items-center gap-3 bg-light-color/20 border border-light-color p-2 rounded-2xl">
            <input
              type="text"
              placeholder="Type your message..."
              className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 px-4 text-base text-body-text"
            />
            <button className="bg-accent-yellow hover:bg-yellow-default text-dark-blue p-3.5 rounded-xl transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-yellow">
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
