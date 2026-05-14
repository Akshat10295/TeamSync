import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Sparkles, X, MessageSquare, Code } from 'lucide-react';
import api from '../lib/api';

export default function AiSidebar({ isOpen, onClose, currentCode }) {
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Hello! I am your TeamSync AI. How can I help you with your code today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (customPrompt) => {
    const prompt = customPrompt || input;
    if (!prompt.trim() || loading) return;

    setMessages(prev => [...prev, { role: 'user', text: prompt }]);
    if (!customPrompt) setInput('');
    setLoading(true);

    try {
      const data = await api('/api/ai/chat', 'POST', { prompt, context: currentCode });
      if (data?.response) {
        setMessages(prev => [...prev, { role: 'ai', text: data.response }]);
      } else {
        throw new Error('No response');
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Sorry, I hit a snag. Please try again!' }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 bottom-0 w-80 bg-[#1e1e1e] border-l border-zinc-800 shadow-2xl z-[150] flex flex-col">
      <div className="flex items-center justify-between p-4 bg-[#252526] border-b border-zinc-800">
        <div className="flex items-center space-x-2">
          <Sparkles size={18} className="text-purple-400" />
          <span className="font-bold text-zinc-100">TeamSync AI</span>
        </div>
        <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
          <X size={20} />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] p-3 rounded-2xl text-sm ${
              m.role === 'user' ? 'bg-purple-600 text-white rounded-tr-none' : 'bg-zinc-800 text-zinc-100 border border-zinc-700 rounded-tl-none'
            }`}>
              <p className="whitespace-pre-wrap">{m.text}</p>
            </div>
          </div>
        ))}
        {loading && <div className="text-zinc-500 text-xs italic animate-pulse">AI is thinking...</div>}
      </div>

      <div className="p-4 border-t border-zinc-800 bg-[#252526]">
        <button 
          onClick={() => handleSend("Can you explain the current code file?")}
          disabled={loading || !currentCode}
          className="w-full mb-3 flex items-center justify-center space-x-2 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-xl border border-zinc-700 transition-all"
        >
          <Code size={14} />
          <span>Explain Code</span>
        </button>
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
            placeholder="Ask anything..."
            className="w-full bg-[#1e1e1e] border border-zinc-700 rounded-xl px-4 py-3 pr-10 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none h-20"
          />
          <button onClick={() => handleSend()} className="absolute right-3 bottom-3 text-purple-500 hover:text-purple-400">
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
