'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import OutfitBoard from '@/components/OutfitBoard';
import { useWardrobeStore } from '@/store/wardrobe';
import { OutfitSuggestion } from '@/types';
import { Send, Sparkles, Bot, User, AlertCircle, Shirt } from 'lucide-react';

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
  "What works in Singapore's heat?",
  'Smart casual weekend look',
  'Birthday dinner outfit',
];

const WEATHER = { temperature: 31, description: 'Humid and sunny', condition: 'hot', city: 'Singapore' };

export default function StylistPage() {
  const { items } = useWardrobeStore();
  const hasItems = items.length > 0;

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: hasItems
        ? `Hello! I'm your AI Stylist powered by **Gemma** running locally or via Groq. I can see your wardrobe has **${items.length} item${items.length !== 1 ? 's'  : ''}**. Ask me what to wear — for any occasion, weather, or mood.`
        : `Hello! I'm your AI Stylist. Your wardrobe is currently empty — **add some clothes first** and I'll suggest outfits based on what you actually own.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function buildSuggestion(data: Record<string, unknown>): OutfitSuggestion {
    const findItem = (name: unknown) => {
      if (!name || typeof name !== 'string') return undefined;
      return (
        items.find((i) => i.name.toLowerCase() === name.toLowerCase()) ??
        items.find((i) => i.name.toLowerCase().includes(name.toLowerCase().split(' ')[0]))
      );
    };
    const outfit = data.outfit as Record<string, string> ?? {};
    return {
      outfit: {
        shirt:  findItem(outfit.shirt)  ?? items.find((i) => ['shirt','tshirt','formal_shirt'].includes(i.category)),
        pants:  findItem(outfit.pants)  ?? items.find((i) => ['pants','jeans','shorts'].includes(i.category)),
        shoes:  findItem(outfit.shoes)  ?? items.find((i) => ['shoes','sneakers','loafers'].includes(i.category)),
        jacket: findItem(outfit.jacket),
        watch:  findItem(outfit.watch),
      },
      color_pairs: (data.color_pairs as OutfitSuggestion['color_pairs']) ?? [],
      occasion: (data.occasion as OutfitSuggestion['occasion']) ?? 'casual',
      reason: (data.message as string) ?? '',
      style_tip: (data.style_tip as string) ?? '',
    };
  }

  async function sendMessage(text: string) {
    if (!text.trim() || loading || !hasItems) return;
    setMessages((p) => [...p, { id: crypto.randomUUID(), role: 'user', content: text }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/stylist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: text,
          wardrobe: items.map((i) => ({
            name: i.name, category: i.category,
            color_hex: i.color_hex, color_name: i.color_name, tags: i.tags,
          })),
          weather: WEATHER,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? 'AI error');

      setMessages((p) => [
        ...p,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: (data.message as string) ?? 'Here is my suggestion:',
          suggestion: buildSuggestion(data as Record<string, unknown>),
        },
      ]);
    } catch (err) {
      setMessages((p) => [
        ...p,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: err instanceof Error ? err.message : 'Something went wrong.',
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function bold(text: string) {
    return text.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#e8c96a">$1</strong>');
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 animate-fade-in flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold">AI Stylist</h1>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'rgba(160,196,160,0.15)', color: '#a0c4a0', border: '1px solid rgba(160,196,160,0.3)' }}>
            Gemma · Local / Groq
          </span>
        </div>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          {hasItems
            ? `Styling from your ${items.length} wardrobe items. Ask anything.`
            : 'Add clothes to your wardrobe first, then come back for AI outfit advice.'}
        </p>
      </div>

      {/* Empty wardrobe notice */}
      {!hasItems && (
        <div
          className="rounded-2xl p-8 flex flex-col items-center text-center mb-4"
          style={{ background: 'var(--card)', border: '2px dashed var(--card-border)' }}
        >
          <Shirt size={40} className="mb-3" style={{ color: 'var(--muted)' }} />
          <p className="font-semibold mb-1">Wardrobe is empty</p>
          <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>The AI Stylist works from your actual clothes. Add items first.</p>
          <Link href="/wardrobe" className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm" style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c96a)', color: '#000' }}>
            Go to Wardrobe
          </Link>
        </div>
      )}

      {/* Quick prompts */}
      {hasItems && (
        <div className="flex gap-2 flex-wrap mb-4">
          {QUICK_PROMPTS.map((p) => (
            <button key={p} onClick={() => sendMessage(p)}
              className="px-3 py-1.5 rounded-full text-xs transition-all hover:opacity-80"
              style={{ background: 'var(--accent-muted)', border: '1px solid rgba(201,168,76,0.3)', color: 'var(--accent)' }}
            >{p}</button>
          ))}
        </div>
      )}

      {/* Chat */}
      <div className="flex-1 overflow-y-auto rounded-2xl p-4 flex flex-col gap-4" style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}>
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: msg.error ? 'rgba(217,123,123,0.15)' : msg.role === 'assistant' ? 'var(--accent-muted)' : 'var(--muted-bg)' }}>
              {msg.error ? <AlertCircle size={15} style={{ color: '#d97b7b' }} /> : msg.role === 'assistant' ? <Bot size={15} style={{ color: 'var(--accent)' }} /> : <User size={15} style={{ color: 'var(--muted)' }} />}
            </div>
            <div className={`flex flex-col gap-2 max-w-[80%] ${msg.role === 'user' ? 'items-end' : ''}`}>
              <div className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                style={{
                  background: msg.error ? 'rgba(217,123,123,0.08)' : msg.role === 'user' ? 'linear-gradient(135deg,rgba(201,168,76,0.2),rgba(201,168,76,0.1))' : 'var(--muted-bg)',
                  border: msg.error ? '1px solid rgba(217,123,123,0.3)' : msg.role === 'user' ? '1px solid rgba(201,168,76,0.3)' : '1px solid var(--card-border)',
                  color: msg.error ? '#d97b7b' : 'var(--foreground)',
                }}
                dangerouslySetInnerHTML={{ __html: bold(msg.content) }}
              />
              {msg.suggestion && <div className="w-full"><OutfitBoard suggestion={msg.suggestion} /></div>}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--accent-muted)' }}>
              <Sparkles size={15} style={{ color: 'var(--accent)' }} />
            </div>
            <div className="px-4 py-3 rounded-2xl flex items-center gap-1" style={{ background: 'var(--muted-bg)', border: '1px solid var(--card-border)' }}>
              {[0,1,2].map((i) => (
                <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)', animation: `bounce 1.2s ease ${i*0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-4 flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}>
        <input
          type="text" value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
          placeholder={hasItems ? 'What should I wear today for…' : 'Add clothes to your wardrobe first'}
          disabled={!hasItems}
          className="flex-1 bg-transparent outline-none text-sm disabled:opacity-40"
          style={{ color: 'var(--foreground)' }}
        />
        <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading || !hasItems}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c96a)' }}>
          <Send size={15} style={{ color: '#000' }} />
        </button>
      </div>
      <style>{`@keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}`}</style>
    </div>
  );
}
