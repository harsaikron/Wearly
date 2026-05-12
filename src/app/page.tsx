'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import CameraCapture from '@/components/Camera';
import { useWardrobeStore } from '@/store/wardrobe';
import { stripDataPrefix } from '@/lib/image-utils';
import { Camera, Shirt, Sparkles, Send, Loader } from 'lucide-react';

interface AISuggestion {
  message: string;
  style_tip?: string;
  occasion?: string;
}

export default function HomePage() {
  const { items } = useWardrobeStore();

  const [showCamera, setShowCamera]   = useState(false);
  const [photo, setPhoto]             = useState<string | null>(null);
  const [question, setQuestion]       = useState('');
  const [suggestion, setSuggestion]   = useState<AISuggestion | null>(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

  async function askAI(q: string, capturedPhoto?: string) {
    const query   = q || 'What outfit should I wear today in Singapore?';
    const img     = capturedPhoto ?? photo;
    setLoading(true);
    setError('');
    setSuggestion(null);

    try {
      const res = await fetch('/api/stylist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          wardrobe: items.map((i) => ({
            name: i.name, category: i.category,
            color_hex: i.color_hex, color_name: i.color_name, tags: i.tags,
          })),
          photo_base64: img ? stripDataPrefix(img) : undefined,
          weather: { temperature: 31, description: 'Humid and sunny', condition: 'hot', city: 'Singapore' },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'AI error');
      setSuggestion({ message: data.message ?? JSON.stringify(data), style_tip: data.style_tip, occasion: data.occasion });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI unavailable. Make sure Ollama is running.');
    } finally {
      setLoading(false);
    }
  }

  function onCameraCapture(dataUrl: string) {
    setPhoto(dataUrl);
    setShowCamera(false);
    askAI('What do you think of this outfit? Give me styling advice.', dataUrl);
  }

  const QUICK = [
    'What to wear for office today?',
    'Best outfit for Singapore heat?',
    'Smart casual evening look?',
    'Suggest a weekend outfit',
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">

      {/* Hero */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">
          <span className="gold-text">Wearly</span>
        </h1>
        <p style={{ color: 'var(--muted)' }} className="text-sm">
          Your AI wardrobe — powered by Gemma, running on your Mac.
        </p>
      </div>

      {/* Camera / photo area */}
      <div
        className="rounded-2xl overflow-hidden mb-4"
        style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
      >
        {photo ? (
          <div className="relative">
            <Image src={photo} alt="captured" width={600} height={400} className="w-full object-cover rounded-t-2xl" style={{ maxHeight: 300 }} />
            <button
              onClick={() => { setPhoto(null); setSuggestion(null); }}
              className="absolute top-3 right-3 px-3 py-1.5 rounded-xl text-xs font-medium"
              style={{ background: 'rgba(10,10,15,0.8)', color: '#f0ede8', border: '1px solid #1e1e2e' }}
            >
              Clear
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowCamera(true)}
            className="w-full py-14 flex flex-col items-center gap-3 transition-all hover:bg-[var(--muted-bg)]"
          >
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'var(--accent-muted)' }}>
              <Camera size={28} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <p className="font-semibold text-sm">Take a photo</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                Use your camera — AI will give instant style advice
              </p>
            </div>
          </button>
        )}

        {/* AI suggestion */}
        {loading && (
          <div className="flex items-center gap-3 px-4 py-4" style={{ borderTop: '1px solid var(--card-border)' }}>
            <Loader size={16} className="animate-spin shrink-0" style={{ color: 'var(--accent)' }} />
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Gemma is thinking…</p>
          </div>
        )}

        {error && (
          <div className="px-4 py-3" style={{ borderTop: '1px solid var(--card-border)', background: 'rgba(217,123,123,0.06)' }}>
            <p className="text-sm" style={{ color: '#d97b7b' }}>{error}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
              Run: <code className="px-1 py-0.5 rounded" style={{ background: 'var(--muted-bg)' }}>brew services start ollama</code>
            </p>
          </div>
        )}

        {suggestion && (
          <div className="px-4 py-4" style={{ borderTop: '1px solid var(--card-border)' }}>
            {suggestion.occasion && (
              <span className="tag-pill mb-3 inline-block">{suggestion.occasion}</span>
            )}
            <p className="text-sm leading-relaxed" style={{ color: 'var(--foreground)' }}>
              {suggestion.message}
            </p>
            {suggestion.style_tip && (
              <p className="text-xs mt-3 italic" style={{ color: 'var(--accent)' }}>
                💡 {suggestion.style_tip}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Ask AI input */}
      <div
        className="flex items-center gap-3 rounded-2xl px-4 py-3 mb-4"
        style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
      >
        <Sparkles size={16} style={{ color: 'var(--accent)' }} />
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && question.trim() && askAI(question)}
          placeholder="Ask AI anything… what to wear today?"
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: 'var(--foreground)' }}
        />
        <button
          onClick={() => question.trim() && askAI(question)}
          disabled={!question.trim() || loading}
          className="w-8 h-8 rounded-xl flex items-center justify-center disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c96a)' }}
        >
          <Send size={14} style={{ color: '#000' }} />
        </button>
      </div>

      {/* Quick prompts */}
      <div className="flex flex-wrap gap-2 mb-8">
        {QUICK.map((q) => (
          <button key={q} onClick={() => { setQuestion(q); askAI(q); }}
            className="px-3 py-1.5 rounded-full text-xs transition-all hover:opacity-80"
            style={{ background: 'var(--accent-muted)', border: '1px solid rgba(201,168,76,0.3)', color: 'var(--accent)' }}>
            {q}
          </button>
        ))}
      </div>

      {/* Wardrobe status */}
      <div
        className="rounded-2xl p-4 flex items-center justify-between"
        style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-muted)' }}>
            <Shirt size={18} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <p className="text-sm font-semibold">
              {items.length === 0 ? 'Wardrobe empty' : `${items.length} item${items.length !== 1 ? 's' : ''} in wardrobe`}
            </p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              {items.length === 0 ? 'Add clothes so AI can suggest outfits' : 'AI suggestions based on your clothes'}
            </p>
          </div>
        </div>
        <Link href="/wardrobe" className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
          style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c96a)', color: '#000' }}>
          {items.length === 0 ? 'Add Clothes' : 'View'}
        </Link>
      </div>

      {showCamera && <CameraCapture onCapture={onCameraCapture} onClose={() => setShowCamera(false)} />}
    </div>
  );
}
