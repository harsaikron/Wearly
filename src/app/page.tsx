'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import CameraCapture from '@/components/Camera';
import { useWardrobeStore } from '@/store/wardrobe';
import { stripDataPrefix, compressImage } from '@/lib/image-utils';
import { Camera, Shirt, Sparkles, Send, Loader, ImageIcon, X } from 'lucide-react';

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
  const fileInputRef                  = useRef<HTMLInputElement>(null);

  async function askAI(q: string, capturedPhoto?: string) {
    const query = q || 'What outfit should I wear today in Singapore?';
    const img   = capturedPhoto ?? photo;
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

  async function onFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // reset so same file can be re-selected
    e.target.value = '';
    const compressed = await compressImage(file);
    setPhoto(compressed);
    askAI('What do you think of this outfit? Give me styling advice.', compressed);
  }

  function clearPhoto() {
    setPhoto(null);
    setSuggestion(null);
    setError('');
  }

  const QUICK = [
    'What to wear for office today?',
    'Best outfit for Singapore heat?',
    'Smart casual evening look?',
    'Suggest a weekend outfit',
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 animate-fade-in">

      {/* Hero */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2 tracking-tight" style={{ color: 'var(--foreground)' }}>
          Your AI <span className="accent-text">Wardrobe</span>
        </h1>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Powered by Gemma 4 — running on your Mac.
        </p>
      </div>

      {/* Photo area */}
      <div
        className="rounded-2xl overflow-hidden mb-4"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--card-border)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {photo ? (
          /* ── Photo preview ── */
          <div className="relative">
            <Image
              src={photo} alt="captured"
              width={600} height={400}
              className="w-full object-cover rounded-t-2xl"
              style={{ maxHeight: 300 }}
            />
            <button
              onClick={clearPhoto}
              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-105"
              style={{
                background: 'rgba(255,255,255,0.92)',
                border: '1px solid var(--card-border)',
                boxShadow: 'var(--shadow-sm)',
                color: 'var(--foreground)',
              }}
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          /* ── Upload prompt ── */
          <div className="py-10 px-6 flex flex-col items-center gap-5">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: 'var(--accent-muted)' }}
            >
              <Camera size={28} style={{ color: 'var(--accent)' }} />
            </div>

            <div className="text-center">
              <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>
                Add a photo for instant AI style advice
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                Take a live photo or upload from your gallery
              </p>
            </div>

            {/* Two action buttons */}
            <div className="flex gap-3 w-full max-w-xs">
              <button
                onClick={() => setShowCamera(true)}
                className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl font-medium text-sm transition-all hover:opacity-90"
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                  color: '#fff',
                  boxShadow: '0 2px 8px rgba(99,102,241,0.25)',
                }}
              >
                <Camera size={18} />
                <span className="text-xs">Camera</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl font-medium text-sm transition-all hover:opacity-90"
                style={{
                  background: 'var(--muted-bg)',
                  border: '1px solid var(--card-border)',
                  color: 'var(--foreground)',
                }}
              >
                <ImageIcon size={18} style={{ color: 'var(--accent)' }} />
                <span className="text-xs">Gallery</span>
              </button>
            </div>

            {/* Hidden file input — works on Mac and mobile gallery */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFileSelect}
            />
          </div>
        )}

        {/* AI loading */}
        {loading && (
          <div
            className="flex items-center gap-3 px-4 py-4"
            style={{ borderTop: '1px solid var(--card-border)' }}
          >
            <Loader size={16} className="animate-spin shrink-0" style={{ color: 'var(--accent)' }} />
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Gemma 4 is thinking…</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            className="px-4 py-4 flex flex-col gap-2"
            style={{ borderTop: '1px solid var(--card-border)', background: 'rgba(239,68,68,0.04)' }}
          >
            <p className="text-sm font-medium" style={{ color: '#dc2626' }}>
              {error.includes('GROQ_API_KEY') || error.includes('Invalid API Key') || error.includes('invalid_api_key')
                ? 'AI not connected — Groq API key missing'
                : error.includes('AI offline')
                  ? 'AI offline'
                  : 'Could not get a response'}
            </p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              {error.includes('GROQ_API_KEY') || error.includes('Invalid API Key') || error.includes('invalid_api_key')
                ? 'Go to Vercel → Project Settings → Environment Variables and add your GROQ_API_KEY (free at console.groq.com)'
                : error.includes('rate limit') || error.includes('429')
                  ? 'Rate limit hit. Wait a few seconds and try again.'
                  : error.includes('Ollama') || error.includes('ollama')
                    ? 'Make sure Ollama is running: brew services start ollama'
                    : error}
            </p>
          </div>
        )}

        {/* Suggestion */}
        {suggestion && (
          <div className="px-4 py-4" style={{ borderTop: '1px solid var(--card-border)' }}>
            {suggestion.occasion && (
              <span className="tag-pill mb-3 inline-block">{suggestion.occasion}</span>
            )}
            <p className="text-sm leading-relaxed" style={{ color: 'var(--foreground)' }}>
              {suggestion.message}
            </p>
            {suggestion.style_tip && (
              <p
                className="text-xs mt-3 font-medium"
                style={{
                  color: 'var(--accent)',
                  background: 'var(--accent-muted)',
                  padding: '8px 12px',
                  borderRadius: 10,
                }}
              >
                💡 {suggestion.style_tip}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Ask AI input */}
      <div
        className="flex items-center gap-3 rounded-2xl px-4 py-3 mb-4"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--card-border)',
          boxShadow: 'var(--shadow-sm)',
        }}
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
          className="w-8 h-8 rounded-xl flex items-center justify-center disabled:opacity-40 transition-opacity"
          style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)' }}
        >
          <Send size={14} style={{ color: '#fff' }} />
        </button>
      </div>

      {/* Quick prompts */}
      <div className="flex flex-wrap gap-2 mb-8">
        {QUICK.map((q) => (
          <button
            key={q}
            onClick={() => { setQuestion(q); askAI(q); }}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:opacity-80"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--card-border)',
              color: 'var(--accent)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Wardrobe status */}
      <div
        className="rounded-2xl p-4 flex items-center justify-between"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--card-border)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--accent-muted)' }}
          >
            <Shirt size={18} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
              {items.length === 0
                ? 'Wardrobe empty'
                : `${items.length} item${items.length !== 1 ? 's' : ''} in wardrobe`}
            </p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              {items.length === 0
                ? 'Add clothes so AI can suggest outfits'
                : 'AI suggestions based on your clothes'}
            </p>
          </div>
        </div>
        <Link
          href="/wardrobe"
          className="px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)', color: '#fff' }}
        >
          {items.length === 0 ? 'Add Clothes' : 'View'}
        </Link>
      </div>

      {showCamera && (
        <CameraCapture onCapture={onCameraCapture} onClose={() => setShowCamera(false)} />
      )}
    </div>
  );
}
