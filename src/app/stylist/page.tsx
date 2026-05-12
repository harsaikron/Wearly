'use client';

import { useState, useRef, useEffect } from 'react';
import OutfitBoard from '@/components/OutfitBoard';
import { mockClothingItems, mockWeather, mockTodaySuggestion } from '@/lib/mock-data';
import { OutfitSuggestion } from '@/types';
import { Send, Sparkles, Bot, User, AlertCircle } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestion?: OutfitSuggestion;
  error?: boolean;
}

const QUICK_PROMPTS = [
  'What should I wear for office today?',
  'Suggest a date night outfit',
  "What's best for Singapore's heat?",
  'Plan a smart casual weekend look',
  'I have a birthday dinner — what to wear?',
];

function aiResponseToSuggestion(data: {
  outfit?: Record<string, string | null>;
  color_pairs?: { item1: string; hex1: string; item2: string; hex2: string }[];
  occasion?: string;
  style_tip?: string;
}): OutfitSuggestion {
  const wardrobeMap = Object.fromEntries(mockClothingItems.map((i) => [i.name.toLowerCase(), i]));

  const resolveItem = (name: string | null | undefined) => {
    if (!name) return undefined;
    return wardrobeMap[name.toLowerCase()] ?? mockClothingItems[0];
  };

  return {
    outfit: {
      shirt:  resolveItem(data.outfit?.shirt),
      pants:  resolveItem(data.outfit?.pants),
      shoes:  resolveItem(data.outfit?.shoes),
      jacket: resolveItem(data.outfit?.jacket),
      watch:  resolveItem(data.outfit?.watch),
    },
    color_pairs: data.color_pairs ?? mockTodaySuggestion.color_pairs,
    occasion: (data.occasion as OutfitSuggestion['occasion']) ?? 'casual',
    reason: '',
    style_tip: data.style_tip ?? '',
  };
}

export default function StylistPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: `Hello! I'm your AI Stylist powered by **Gemma 3** running locally on your Mac. Tell me what you need — an occasion, the weather, a mood — and I'll pick the perfect outfit. Today it's **${mockWeather.temperature}°C and ${mockWeather.description.toLowerCase()}** in ${mockWeather.city}.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/stylist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: text,
          wardrobe: mockClothingItems.map((i) => ({
            name: i.name,
            category: i.category,
            color_hex: i.color_hex,
            color_name: i.color_name,
            tags: i.tags,
          })),
          weather: {
            temperature: mockWeather.temperature,
            description: mockWeather.description,
            condition: mockWeather.condition,
            city: mockWeather.city,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error ?? 'Unknown error');
      }

      const aiMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.message ?? 'Here is my suggestion:',
        suggestion: aiResponseToSuggestion(data),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const errMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: err instanceof Error ? err.message : 'Something went wrong. Make sure Ollama is running with gemma3:4b.',
        error: true,
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  }

  function renderContent(text: string) {
    return text.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#e8c96a">$1</strong>');
  }

  return (
    <div
      className="max-w-4xl mx-auto px-4 sm:px-6 py-8 animate-fade-in flex flex-col"
      style={{ height: 'calc(100vh - 64px)' }}
    >
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold">AI Stylist</h1>
          <span
            className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ background: 'rgba(160,196,160,0.15)', color: '#a0c4a0', border: '1px solid rgba(160,196,160,0.3)' }}
          >
            Gemma 3 · Local
          </span>
        </div>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          Powered by Gemma 3 4B running locally via Ollama — no data leaves your Mac.
        </p>
      </div>

      {/* Quick prompts */}
      <div className="flex gap-2 flex-wrap mb-4">
        {QUICK_PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => sendMessage(p)}
            className="px-3 py-1.5 rounded-full text-xs transition-all hover:opacity-80"
            style={{
              background: 'var(--accent-muted)',
              border: '1px solid rgba(201,168,76,0.3)',
              color: 'var(--accent)',
            }}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Chat window */}
      <div
        className="flex-1 overflow-y-auto rounded-2xl p-4 flex flex-col gap-4"
        style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
              style={{
                background: msg.error
                  ? 'rgba(217,123,123,0.15)'
                  : msg.role === 'assistant'
                  ? 'var(--accent-muted)'
                  : 'var(--muted-bg)',
              }}
            >
              {msg.error ? (
                <AlertCircle size={15} style={{ color: '#d97b7b' }} />
              ) : msg.role === 'assistant' ? (
                <Bot size={15} style={{ color: 'var(--accent)' }} />
              ) : (
                <User size={15} style={{ color: 'var(--muted)' }} />
              )}
            </div>

            <div className={`flex flex-col gap-2 max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div
                className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                style={{
                  background: msg.error
                    ? 'rgba(217,123,123,0.08)'
                    : msg.role === 'user'
                    ? 'linear-gradient(135deg, rgba(201,168,76,0.2), rgba(201,168,76,0.1))'
                    : 'var(--muted-bg)',
                  border: msg.error
                    ? '1px solid rgba(217,123,123,0.3)'
                    : msg.role === 'user'
                    ? '1px solid rgba(201,168,76,0.3)'
                    : '1px solid var(--card-border)',
                  color: msg.error ? '#d97b7b' : 'var(--foreground)',
                }}
                dangerouslySetInnerHTML={{ __html: renderContent(msg.content) }}
              />
              {msg.suggestion && (
                <div className="w-full">
                  <OutfitBoard suggestion={msg.suggestion} />
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'var(--accent-muted)' }}
            >
              <Sparkles size={15} style={{ color: 'var(--accent)' }} />
            </div>
            <div
              className="px-4 py-3 rounded-2xl flex items-center gap-1"
              style={{ background: 'var(--muted-bg)', border: '1px solid var(--card-border)' }}
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: 'var(--accent)',
                    animation: `bounce 1.2s ease ${i * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div
        className="mt-4 flex items-center gap-3 rounded-2xl px-4 py-3"
        style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
          placeholder="What should I wear today for…"
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: 'var(--foreground)' }}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || loading}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c96a)' }}
        >
          <Send size={15} style={{ color: '#000' }} />
        </button>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
