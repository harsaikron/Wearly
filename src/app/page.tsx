'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import CameraCapture from '@/components/Camera';
import { useWardrobeStore } from '@/store/wardrobe';
import { stripDataPrefix, compressImage } from '@/lib/image-utils';
import {
  Camera, Shirt, Sparkles, Send, Loader,
  ImageIcon, X, Thermometer, Wind, Droplets,
  ExternalLink, Sun, CloudRain, Cloud,
} from 'lucide-react';

interface OutfitItem {
  piece: string;
  color_name: string;
  color_hex: string;
  note: string;
}
interface AISuggestion {
  headline?: string;
  message: string;
  outfit_items?: OutfitItem[];
  style_tip?: string;
  occasion?: string;
  search_query?: string;
}
interface Weather {
  temperature: number;
  feels_like: number;
  description: string;
  humidity: number;
  wind_speed: number;
  city: string;
  condition: string;
  uv_index?: number;
}

function WeatherIcon({ condition }: { condition: string }) {
  if (condition === 'rainy') return <CloudRain size={14} style={{ color: '#6b9fd4' }} />;
  if (condition === 'cloudy') return <Cloud size={14} style={{ color: '#94a3b8' }} />;
  return <Sun size={14} style={{ color: '#f59e0b' }} />;
}

function getContrastHex(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 >= 128 ? '#1f2937' : '#ffffff';
}

export default function HomePage() {
  const { items } = useWardrobeStore();

  const [showCamera, setShowCamera]   = useState(false);
  const [photo, setPhoto]             = useState<string | null>(null);
  const [question, setQuestion]       = useState('');
  const [suggestion, setSuggestion]   = useState<AISuggestion | null>(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [weather, setWeather]         = useState<Weather | null>(null);
  const [now, setNow]                 = useState(new Date());
  const fileInputRef                  = useRef<HTMLInputElement>(null);

  // Fetch weather on mount
  useEffect(() => {
    fetch('/api/weather?city=Singapore')
      .then((r) => r.json())
      .then(setWeather)
      .catch(() => null);
  }, []);

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const sgTime = now.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Singapore' });
  const sgDay  = now.toLocaleDateString('en-SG', { weekday: 'long', timeZone: 'Asia/Singapore' });
  const sgDate = now.toLocaleDateString('en-SG', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Singapore' });
  const sgSeason = 'Tropical · No dry season';

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
          weather: weather
            ? { temperature: weather.temperature, feels_like: weather.feels_like, description: weather.description, condition: weather.condition, city: weather.city, humidity: weather.humidity }
            : { temperature: 31, feels_like: 36, description: 'Humid and sunny', condition: 'hot', city: 'Singapore', humidity: 84 },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'AI error');
      setSuggestion(data as AISuggestion);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI unavailable.');
    } finally {
      setLoading(false);
    }
  }

  function onCameraCapture(dataUrl: string) {
    setPhoto(dataUrl);
    setShowCamera(false);
    askAI('What do you think of this outfit? Give me detailed styling advice.', dataUrl);
  }

  async function onFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const compressed = await compressImage(file);
    setPhoto(compressed);
    askAI('Analyse this clothing item and give me a detailed outfit suggestion.', compressed);
  }

  function clearPhoto() {
    setPhoto(null);
    setSuggestion(null);
    setError('');
  }

  // Build Unsplash inspiration image URLs from search query
  function inspirationImages(query: string) {
    const q = encodeURIComponent(query);
    return [
      `https://source.unsplash.com/featured/320x420/?${q},men,fashion`,
      `https://source.unsplash.com/featured/320x420/?${q},outfit,style`,
      `https://source.unsplash.com/featured/320x420/?${q},menswear,look`,
    ];
  }

  function pinterestUrl(q: string) {
    return `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(q + ' men outfit')}`;
  }
  function googleImagesUrl(q: string) {
    return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(q + ' men outfit Singapore')}`;
  }

  const QUICK = [
    'What to wear for office today?',
    'Best outfit for Singapore heat?',
    'Smart casual evening look?',
    'Suggest a weekend outfit',
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">

      {/* ── Weather + Date strip ───────────────────────────────── */}
      <div
        className="rounded-2xl px-4 py-3 mb-6 flex items-center justify-between gap-4 flex-wrap"
        style={{ background: 'var(--card)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-sm)' }}
      >
        {/* Date / Time */}
        <div>
          <p className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>{sgDay}</p>
          <p className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>{sgDate}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{sgTime} · Singapore · {sgSeason}</p>
        </div>

        {/* Weather */}
        {weather ? (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <WeatherIcon condition={weather.condition} />
              <span className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>{weather.temperature}°C</span>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium capitalize" style={{ color: 'var(--foreground)', maxWidth: 120 }}>
                {weather.description}
              </p>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--muted)' }}>
                  <Thermometer size={11} /> {weather.feels_like}°C feels like
                </span>
                <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--muted)' }}>
                  <Droplets size={11} /> {weather.humidity}%
                </span>
                <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--muted)' }}>
                  <Wind size={11} /> {weather.wind_speed} km/h
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Loader size={14} className="animate-spin" style={{ color: 'var(--accent)' }} />
            <span className="text-xs" style={{ color: 'var(--muted)' }}>Fetching weather…</span>
          </div>
        )}
      </div>

      {/* ── Hero ──────────────────────────────────────────────── */}
      <div className="text-center mb-6">
        <h1 className="text-4xl font-bold mb-1 tracking-tight" style={{ color: 'var(--foreground)' }}>
          Your AI <span className="accent-text">Wardrobe</span>
        </h1>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Powered by Gemma 4 — running on your Mac.
        </p>
      </div>

      {/* ── Photo area ────────────────────────────────────────── */}
      <div
        className="rounded-2xl overflow-hidden mb-4"
        style={{ background: 'var(--card)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-sm)' }}
      >
        {photo ? (
          <div className="relative">
            <Image
              src={photo} alt="captured"
              width={600} height={400}
              className="w-full object-cover"
              style={{ maxHeight: 280 }}
            />
            <button
              onClick={clearPhoto}
              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-105"
              style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-sm)' }}
            >
              <X size={14} style={{ color: 'var(--foreground)' }} />
            </button>
          </div>
        ) : (
          <div className="py-10 px-6 flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'var(--accent-muted)' }}>
              <Camera size={26} style={{ color: 'var(--accent)' }} />
            </div>
            <div className="text-center">
              <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>Add a photo for instant AI style advice</p>
              <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Take a live photo or upload from your Mac / phone gallery</p>
            </div>
            <div className="flex gap-3 w-full max-w-xs">
              <button
                onClick={() => setShowCamera(true)}
                className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)', color: '#fff', boxShadow: '0 2px 8px rgba(99,102,241,0.25)' }}
              >
                <Camera size={18} />
                <span className="text-xs">Camera</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
                style={{ background: 'var(--muted-bg)', border: '1px solid var(--card-border)', color: 'var(--foreground)' }}
              >
                <ImageIcon size={18} style={{ color: 'var(--accent)' }} />
                <span className="text-xs">Gallery</span>
              </button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileSelect} />
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-3 px-4 py-4" style={{ borderTop: '1px solid var(--card-border)' }}>
            <Loader size={16} className="animate-spin shrink-0" style={{ color: 'var(--accent)' }} />
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Gemma 4 is analysing…</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="px-4 py-4 flex flex-col gap-1.5" style={{ borderTop: '1px solid var(--card-border)', background: 'rgba(239,68,68,0.04)' }}>
            <p className="text-sm font-semibold" style={{ color: '#dc2626' }}>
              {error.includes('GROQ_API_KEY') || error.includes('invalid_api_key') || error.includes('Invalid API Key')
                ? 'AI not connected — API key missing'
                : error.includes('rate limit') ? 'Rate limit reached'
                : error.includes('offline') ? 'AI offline'
                : 'Could not get a response'}
            </p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              {error.includes('GROQ_API_KEY') || error.includes('invalid_api_key') || error.includes('Invalid API Key')
                ? 'Add GROQ_API_KEY in Vercel → Settings → Environment Variables (free at console.groq.com)'
                : error.includes('rate limit') ? 'Wait a moment and try again.'
                : error.includes('offline') ? 'Run: brew services start ollama'
                : error}
            </p>
          </div>
        )}

        {/* ── AI Suggestion Card ── */}
        {suggestion && !loading && (
          <div className="px-4 py-5 flex flex-col gap-4" style={{ borderTop: '1px solid var(--card-border)' }}>

            {/* Occasion + Headline */}
            <div>
              {suggestion.occasion && (
                <span className="tag-pill mb-2 inline-block capitalize">{suggestion.occasion}</span>
              )}
              {suggestion.headline && (
                <h3 className="text-lg font-bold leading-tight mt-1" style={{ color: 'var(--foreground)' }}>
                  {suggestion.headline}
                </h3>
              )}
            </div>

            {/* Message */}
            <p className="text-sm leading-relaxed" style={{ color: 'var(--foreground)' }}>
              {suggestion.message}
            </p>

            {/* Outfit items */}
            {suggestion.outfit_items && suggestion.outfit_items.length > 0 && (
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--muted)' }}>OUTFIT BREAKDOWN</p>
                <div className="flex flex-col gap-2">
                  {suggestion.outfit_items.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                      style={{ background: 'var(--muted-bg)', border: '1px solid var(--card-border)' }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg shrink-0 border"
                        style={{
                          background: item.color_hex,
                          borderColor: 'rgba(0,0,0,0.08)',
                        }}
                        title={item.color_name}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>
                          {item.piece}
                        </p>
                        {item.note && (
                          <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>{item.note}</p>
                        )}
                      </div>
                      <span
                        className="text-xs px-2 py-0.5 rounded-lg font-mono shrink-0"
                        style={{
                          background: item.color_hex,
                          color: getContrastHex(item.color_hex.length === 7 ? item.color_hex : '#888888'),
                          border: '1px solid rgba(0,0,0,0.1)',
                          fontSize: 10,
                        }}
                      >
                        {item.color_name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Style tip */}
            {suggestion.style_tip && (
              <div
                className="flex items-start gap-2 px-3 py-2.5 rounded-xl"
                style={{ background: 'var(--accent-muted)', border: '1px solid rgba(99,102,241,0.15)' }}
              >
                <span style={{ fontSize: 14 }}>💡</span>
                <p className="text-xs font-medium leading-relaxed" style={{ color: 'var(--accent)' }}>
                  {suggestion.style_tip}
                </p>
              </div>
            )}

            {/* Outfit Inspiration */}
            {suggestion.search_query && (
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--muted)' }}>OUTFIT INSPIRATION</p>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {inspirationImages(suggestion.search_query).map((url, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={url}
                      alt={`Outfit inspiration ${i + 1}`}
                      className="w-full rounded-xl object-cover"
                      style={{ aspectRatio: '3/4', background: 'var(--muted-bg)' }}
                      loading="lazy"
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <a
                    href={pinterestUrl(suggestion.search_query)}
                    target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-90"
                    style={{ background: '#e60023', color: '#fff' }}
                  >
                    <ExternalLink size={12} /> Pinterest
                  </a>
                  <a
                    href={googleImagesUrl(suggestion.search_query)}
                    target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-90"
                    style={{ background: 'var(--muted-bg)', border: '1px solid var(--card-border)', color: 'var(--foreground)' }}
                  >
                    <ExternalLink size={12} /> Google Images
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Ask AI input ──────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 rounded-2xl px-4 py-3 mb-4"
        style={{ background: 'var(--card)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-sm)' }}
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

      {/* ── Quick prompts ─────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 mb-8">
        {QUICK.map((q) => (
          <button
            key={q}
            onClick={() => { setQuestion(q); askAI(q); }}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:opacity-80"
            style={{ background: 'var(--card)', border: '1px solid var(--card-border)', color: 'var(--accent)', boxShadow: 'var(--shadow-sm)' }}
          >
            {q}
          </button>
        ))}
      </div>

      {/* ── Wardrobe status ───────────────────────────────────── */}
      <div
        className="rounded-2xl p-4 flex items-center justify-between"
        style={{ background: 'var(--card)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-sm)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-muted)' }}>
            <Shirt size={18} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
              {items.length === 0 ? 'Wardrobe empty' : `${items.length} item${items.length !== 1 ? 's' : ''} in wardrobe`}
            </p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              {items.length === 0 ? 'Add clothes so AI can suggest outfits' : 'AI suggestions based on your clothes'}
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
