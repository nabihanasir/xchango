import { useEffect, useRef, useState } from 'react';
import { Bot, MessageCircle, Send, X } from 'lucide-react';
import { assistantApi, type AssistantTurn } from '../lib/assistantApi';

const GREETING: AssistantTurn = {
  role: 'assistant',
  text: 'Hi! I can answer questions about applications, visas, course equivalency and your account. What would you like to know?',
};

const STARTERS = ['How do I apply?', 'How does the visa process work?', 'How is credit transferred?', 'I forgot my password'];

/** Floating bottom-right FAQ assistant, mounted once for every page. */
export default function FaqChatWidget() {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<AssistantTurn[]>([GREETING]);
  const [suggestions, setSuggestions] = useState<string[]>(STARTERS);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, loading, open]);

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || loading) return;

    // The greeting is UI-only, so it is not sent as conversation history.
    const history = turns.slice(1);
    setTurns((current) => [...current, { role: 'user', text }]);
    setInput('');
    setSuggestions([]);
    setLoading(true);

    try {
      const reply = await assistantApi.ask(text, history);
      setTurns((current) => [...current, { role: 'assistant', text: reply.answer }]);
      setSuggestions(reply.suggestions);
    } catch {
      setTurns((current) => [
        ...current,
        { role: 'assistant', text: 'Sorry, I could not reach the help service. Please try again in a moment.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-[200] flex flex-col items-end gap-3 font-sans">
      {open && (
        <section
          role="dialog"
          aria-label="Xchango help assistant"
          className="flex h-[32rem] max-h-[calc(100vh-7rem)] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-2xl"
        >
          <header className="flex items-center gap-3 bg-dark-blue px-5 py-4 text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
              <Bot className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-black leading-tight">Xchango Assistant</p>
              <p className="text-[11px] text-white/70">Ask me anything about your exchange</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
              className="rounded-full p-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-4">
            {turns.map((turn, index) => (
              <div key={index} className={`flex ${turn.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <p
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-6 ${
                    turn.role === 'user'
                      ? 'rounded-br-md bg-dark-blue text-white'
                      : 'rounded-bl-md border border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  {turn.text}
                </p>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <p className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-400">
                  Typing…
                </p>
              </div>
            )}

            {!loading && suggestions.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => send(suggestion)}
                    className="rounded-full border border-dark-blue/20 bg-white px-3 py-1.5 text-xs font-semibold text-dark-blue transition-colors hover:bg-dark-blue hover:text-white"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 border-t border-slate-200 bg-white p-3"
          >
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Type your question…"
              maxLength={500}
              className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-dark-blue"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send message"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-dark-blue text-white transition-opacity disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </section>
      )}

      <button
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? 'Close help assistant' : 'Open help assistant'}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-dark-blue text-white shadow-xl transition-transform hover:scale-105"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
}
