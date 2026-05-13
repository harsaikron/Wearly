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
  ExternalLink, TrendingUp, CalendarDays, Gem, Lightbulb, Flag, RefreshCw, Zap,
} from 'lucide-react';
import {
  EventIcon, SeasonIcon, WeatherConditionIcon,
} from '@/components/icons/SgIcons';

interface SGEvent {
  name: string;
  date: string;
  type: string;
  outfit_tip: string;
  colors: string[];
  color_names: string[];
  dress_code: string;
  daysAway: number;
}
interface SeasonContext {
  season: string;
  tip: string;
  trending: string[];
}
interface EventsData {
  upcoming: SGEvent[];
  season: SeasonContext;
  trends: string[];
}

interface OOTDItem {
  name: string;
  category: string;
  color_name: string;
  color_hex: string;
  why: string;
}
interface OOTDResult {
  outfit_name: string;
  overall_reason: string;
  items: OOTDItem[];
  style_tip: string;
  mood: string;
  backend?: string;
}

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
interface InspirationImage {
  url: string;
  thumb: string;
  alt: string;
  credit: string;
  credit_url: string;
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


function getContrastHex(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 >= 128 ? '#1f2937' : '#ffffff';
}

export default function HomePage() {
  const { items } = useWardrobeStore();

  const [showCamera, setShowCamera]         = useState(false);
  const [photo, setPhoto]                   = useState<string | null>(null);
  const [question, setQuestion]             = useState('');
  const [suggestion, setSuggestion]         = useState<AISuggestion | null>(null);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState('');
  const [weather, setWeather]               = useState<Weather | null>(null);
  const [now, setNow]                       = useState(new Date());
  const [inspirationImgs, setInspirationImgs] = useState<InspirationImage[]>([]);
  const [imgLoading, setImgLoading]         = useState(false);
  const [events, setEvents]                 = useState<EventsData | null>(null);
  const [trendCards, setTrendCards]         = useState<{ term: string; img: InspirationImage | null }[]>([]);
  const [trendLoading, setTrendLoading]     = useState(false);
  const [ootd, setOotd]                     = useState<OOTDResult | null>(null);
  const [ootdLoading, setOotdLoading]       = useState(false);
  const fileInputRef                        = useRef<HTMLInputElement>(null);

  async function fetchOOTD(currentWeather: Weather, currentItems: typeof items, eventsData: EventsData | null) {
    if (currentItems.length === 0) return;
    setOotdLoading(true);
    try {
      const day = new Date().toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Singapore' });
      const nearEvent = eventsData?.upcoming.find((e) => e.daysAway >= 0 && e.daysAway <= 7);
      const res = await fetch('/api/ootd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wardrobe: currentItems.map((i) => ({
            name: i.name, category: i.category,
            color_name: i.color_name, color_hex: i.color_hex,
            tags: i.tags, times_worn: i.times_worn,
          })),
          weather: {
            temperature: currentWeather.temperature,
            feels_like: currentWeather.feels_like,
            description: currentWeather.description,
            condition: currentWeather.condition,
            humidity: currentWeather.humidity,
          },
          day,
          event: nearEvent?.name,
        }),
      });
      const data = await res.json() as OOTDResult & { error?: string };
      if (!res.ok || data.error) return;
      setOotd(data);
    } catch { /* silent */ } finally {
      setOotdLoading(false);
    }
  }

  // Fetch weather on mount
  useEffect(() => {
    fetch('/api/weather?city=Singapore')
      .then((r) => r.json())
      .then(setWeather)
      .catch(() => null);
    fetch('/api/events')
      .then((r) => r.json())
      .then(setEvents)
      .catch(() => null);
  }, []);

  // Auto-fetch OOTD once weather + events are ready
  useEffect(() => {
    if (weather && !ootd && !ootdLoading) {
      fetchOOTD(weather, items, events);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weather, events]);

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  // Fetch one photo per trending style when events load
  useEffect(() => {
    if (!events) return;
    const terms = events.season.trending.slice(0, 4);
    setTrendLoading(true);
    setTrendCards([]);
    let cancelled = false;
    (async () => {
      const results: { term: string; img: InspirationImage | null }[] = [];
      for (const term of terms) {
        if (cancelled) break;
        try {
          const r = await fetch(`/api/images?q=${encodeURIComponent(term + ' Singapore men outfit')}`);
          const d = await r.json();
          results.push({ term, img: (d.images ?? [])[0] ?? null });
          if (!cancelled) setTrendCards([...results]);
        } catch {
          results.push({ term, img: null });
        }
      }
      if (!cancelled) setTrendLoading(false);
    })();
    return () => { cancelled = true; };
  }, [events]);

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
      const s = data as AISuggestion;
      setSuggestion(s);

      // Fetch outfit inspiration images
      if (s.search_query) {
        setInspirationImgs([]);
        setImgLoading(true);
        fetch(`/api/images?q=${encodeURIComponent(s.search_query)}`)
          .then((r) => r.json())
          .then((d) => setInspirationImgs(d.images ?? []))
          .catch(() => setInspirationImgs([]))
          .finally(() => setImgLoading(false));
      }
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
    setInspirationImgs([]);
    setError('');
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
              <WeatherConditionIcon condition={weather.condition} size={16} />
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

      {/* ── Outfit of the Day ─────────────────────────────────── */}
      <div
        className="rounded-2xl overflow-hidden mb-6"
        style={{ background: 'var(--card)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-sm)' }}
      >
        {/* Header */}
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.07) 0%, rgba(168,85,247,0.05) 100%)', borderBottom: '1px solid var(--card-border)' }}
        >
          <div className="flex items-center gap-2">
            <Zap size={15} style={{ color: 'var(--accent)' }} />
            <p className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>Outfit of the Day</p>
            {ootd && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--accent)', border: '1px solid rgba(99,102,241,0.2)' }}
              >
                {ootd.mood}
              </span>
            )}
          </div>
          <button
            onClick={() => weather && fetchOOTD(weather, items, events)}
            disabled={ootdLoading || !weather}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-xl font-medium transition-all hover:opacity-80 disabled:opacity-40"
            style={{ background: 'var(--muted-bg)', color: 'var(--muted)', border: '1px solid var(--card-border)' }}
          >
            <RefreshCw size={11} className={ootdLoading ? 'animate-spin' : ''} />
            {ootdLoading ? 'Picking…' : 'Refresh'}
          </button>
        </div>

        {/* Loading shimmer */}
        {ootdLoading && !ootd && (
          <div className="px-4 py-4 flex flex-col gap-3">
            <div className="shimmer rounded-lg h-4 w-3/5" />
            <div className="shimmer rounded-lg h-3 w-full" />
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="shimmer rounded-lg w-9 h-9 shrink-0" />
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="shimmer rounded h-3 w-2/5" />
                  <div className="shimmer rounded h-2.5 w-4/5" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty wardrobe prompt */}
        {!ootdLoading && !ootd && items.length === 0 && (
          <div className="px-4 py-6 flex flex-col items-center gap-2 text-center">
            <Shirt size={24} style={{ color: 'var(--muted)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>No wardrobe items yet</p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>Add clothes to your wardrobe and AI will pick today's best outfit automatically.</p>
            <a
              href="/wardrobe"
              className="mt-1 text-xs font-semibold px-3 py-1.5 rounded-xl"
              style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--accent)' }}
            >
              Go to Wardrobe →
            </a>
          </div>
        )}

        {/* OOTD result */}
        {ootd && (
          <div className="px-4 py-4 flex flex-col gap-3">
            {/* Outfit name + overall reason */}
            <div>
              <h3 className="font-bold text-base leading-tight" style={{ color: 'var(--foreground)' }}>{ootd.outfit_name}</h3>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--muted)' }}>{ootd.overall_reason}</p>
            </div>

            {/* Items with WHY */}
            <div className="flex flex-col gap-2">
              {ootd.items?.map((item, i) => (
                <div
                  key={i}
                  className="rounded-xl overflow-hidden"
                  style={{ border: '1px solid var(--card-border)' }}
                >
                  <div
                    className="flex items-center gap-3 px-3 py-2.5"
                    style={{ background: 'var(--muted-bg)' }}
                  >
                    {/* Color swatch */}
                    <div
                      className="w-9 h-9 rounded-lg shrink-0 border-2"
                      style={{
                        background: item.color_hex ?? '#e5e7eb',
                        borderColor: 'rgba(0,0,0,0.08)',
                      }}
                      title={item.color_name}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>{item.name}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>{item.category} · {item.color_name}</p>
                    </div>
                  </div>
                  {/* WHY this item */}
                  <div
                    className="px-3 py-2 flex items-start gap-2"
                    style={{ background: 'var(--card)', borderTop: '1px solid var(--card-border)' }}
                  >
                    <Lightbulb size={11} style={{ color: 'var(--accent)', marginTop: 2, flexShrink: 0 }} />
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>{item.why}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Style tip */}
            {ootd.style_tip && (
              <div
                className="rounded-xl px-3 py-2.5 flex items-start gap-2"
                style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)' }}
              >
                <Sparkles size={12} style={{ color: 'var(--accent)', marginTop: 2, flexShrink: 0 }} />
                <p className="text-xs leading-relaxed" style={{ color: 'var(--foreground)' }}>
                  <span className="font-semibold">Style tip: </span>{ootd.style_tip}
                </p>
              </div>
            )}

            {/* AI badge */}
            <p className="text-xs text-right" style={{ color: 'var(--muted)' }}>
              Selected by Gemma 4 · {ootd.backend === 'ollama' ? 'Running locally' : 'Cloud AI'}
            </p>
          </div>
        )}
      </div>

      {/* ── Season Discovery + Trends ─────────────────────────── */}
      {events && (
        <div className="mb-6 flex flex-col gap-4">

          {/* ① Today's event banner */}
          {events.upcoming[0]?.daysAway === 0 && (
            <div
              className="rounded-2xl px-4 py-4 flex items-start gap-3"
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)', color: '#fff' }}
            >
              <EventIcon name={events.upcoming[0].name} size={32} color="#fff" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wide" style={{ opacity: 0.8 }}>Today</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(255,255,255,0.2)' }}>
                    {events.upcoming[0].dress_code}
                  </span>
                </div>
                <p className="font-bold text-lg leading-tight">{events.upcoming[0].name}</p>
                <p className="text-xs mt-1 leading-relaxed" style={{ opacity: 0.9 }}>{events.upcoming[0].outfit_tip}</p>
                <div className="flex gap-2 mt-2.5">
                  {events.upcoming[0].colors.map((c, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full border-2" style={{ background: c, borderColor: 'rgba(255,255,255,0.5)' }} />
                      <span className="text-xs font-medium" style={{ opacity: 0.85 }}>{events.upcoming[0].color_names[i]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ② Season Spotlight */}
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-sm)' }}>
            <div className="px-4 pt-4 pb-3" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(233,30,140,0.04) 100%)' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <SeasonIcon season={events.season.season} size={18} color="var(--accent)" />
                  <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
                    {events.season.season}
                  </p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--accent)', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <Flag size={11} style={{ display: 'inline', marginRight: 3 }} /> Singapore
                </span>
              </div>
              <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--foreground)' }}>
                {events.season.tip}
              </p>
            </div>
            <div className="px-4 py-3" style={{ borderTop: '1px solid var(--card-border)' }}>
              <p className="text-xs font-semibold mb-2.5" style={{ color: 'var(--muted)' }}>WHAT TO WEAR THIS SEASON</p>
              <div className="flex flex-wrap gap-2">
                {events.season.trending.map((t) => (
                  <span key={t} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                    style={{ background: 'var(--muted-bg)', border: '1px solid var(--card-border)', color: 'var(--foreground)' }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', flexShrink: 0 }} /> {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ③ Trending Looks — Insta snaps */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp size={15} style={{ color: '#e91e8c' }} />
                <p className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>
                  Trending Looks &mdash; {now.toLocaleDateString('en-SG', { month: 'long', timeZone: 'Asia/Singapore' })}
                </p>
              </div>
              <a
                href={`https://www.pinterest.com/search/pins/?q=${encodeURIComponent(events.season.trending[0] + ' men outfit Singapore')}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs font-semibold transition-opacity hover:opacity-70"
                style={{ color: '#e91e8c' }}
              >
                Pinterest <ExternalLink size={10} />
              </a>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
              {/* Shimmer cards while loading */}
              {trendLoading && trendCards.length === 0 && [0, 1, 2, 3].map((i) => (
                <div key={i} className="shrink-0 rounded-2xl shimmer" style={{ width: 130, height: 175 }} />
              ))}

              {/* Photo cards */}
              {trendCards.map(({ term, img }) => (
                <a
                  key={term}
                  href={`https://www.pinterest.com/search/pins/?q=${encodeURIComponent(term + ' men outfit')}`}
                  target="_blank" rel="noopener noreferrer"
                  className="shrink-0 relative rounded-2xl overflow-hidden group block"
                  style={{ width: 130, height: 175, background: 'var(--muted-bg)', border: '1px solid var(--card-border)', flexShrink: 0 }}
                >
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img.url} alt={img.alt}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                      <ImageIcon size={22} style={{ color: 'var(--muted)' }} />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 px-2.5 py-2.5"
                    style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.72))' }}>
                    <p className="text-white font-semibold leading-tight" style={{ fontSize: 10 }}>{term}</p>
                    {img && <p style={{ fontSize: 9, opacity: 0.7, color: '#fff' }}>{img.credit}</p>}
                  </div>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.9)' }}>
                      <ExternalLink size={10} style={{ color: '#e91e8c' }} />
                    </div>
                  </div>
                </a>
              ))}

              {/* "More" card */}
              {trendCards.length > 0 && (
                <a
                  href={`https://www.pinterest.com/search/pins/?q=${encodeURIComponent('men outfit Singapore ' + events.season.season)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="shrink-0 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all hover:opacity-80"
                  style={{ width: 100, height: 175, background: 'linear-gradient(135deg, rgba(233,30,140,0.06), rgba(99,102,241,0.06))', border: '1px dashed rgba(233,30,140,0.3)', flexShrink: 0 }}
                >
                  <ExternalLink size={18} style={{ color: '#e91e8c' }} />
                  <p className="text-xs font-semibold text-center" style={{ color: '#e91e8c', maxWidth: 72, lineHeight: 1.3 }}>
                    More on Pinterest
                  </p>
                </a>
              )}
            </div>

            {/* Also check Google Images */}
            <div className="flex gap-2 mt-2">
              <a
                href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(events.season.trending.slice(0, 2).join(' ') + ' men Singapore outfit')}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:opacity-80"
                style={{ background: 'var(--card)', border: '1px solid var(--card-border)', color: 'var(--muted)', boxShadow: 'var(--shadow-sm)' }}
              >
                <ExternalLink size={10} /> Google Images
              </a>
              <a
                href={`https://www.instagram.com/explore/tags/${encodeURIComponent(events.season.trending[0].replace(/\s+/g, ''))}/`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:opacity-80"
                style={{ background: 'var(--card)', border: '1px solid var(--card-border)', color: 'var(--muted)', boxShadow: 'var(--shadow-sm)' }}
              >
                <Camera size={11} /> Instagram
              </a>
            </div>
          </div>

          {/* ④ Trending on Social — clickable hashtags */}
          <div className="rounded-2xl px-4 py-3" style={{ background: 'var(--card)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-sm)' }}>
            <div className="flex items-center gap-2 mb-2.5">
              <Gem size={13} style={{ color: '#e91e8c' }} />
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
                Trending on Social
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {events.trends.map((t, i) => (
                <a
                  key={t}
                  href={`https://www.pinterest.com/search/pins/?q=${encodeURIComponent(t + ' men')}`}
                  target="_blank" rel="noopener noreferrer"
                  className="px-3 py-1 rounded-full text-xs font-medium transition-all hover:opacity-80"
                  style={{
                    background: i % 2 === 0
                      ? 'linear-gradient(135deg, rgba(233,30,140,0.08), rgba(233,30,140,0.04))'
                      : 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(99,102,241,0.04))',
                    border: `1px solid ${i % 2 === 0 ? 'rgba(233,30,140,0.2)' : 'rgba(99,102,241,0.2)'}`,
                    color: i % 2 === 0 ? '#c2185b' : 'var(--accent)',
                  }}
                >
                  #{t.toLowerCase().replace(/[\s/]+/g, '')}
                </a>
              ))}
            </div>
          </div>

          {/* ⑤ Upcoming Events — compact horizontal strip */}
          <div className="rounded-2xl px-4 py-3" style={{ background: 'var(--card)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-sm)' }}>
            <div className="flex items-center gap-2 mb-2.5">
              <CalendarDays size={13} style={{ color: 'var(--accent)' }} />
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Upcoming Events</p>
            </div>
            <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {events.upcoming.filter((e) => e.daysAway >= 0).map((ev) => (
                <div
                  key={ev.date}
                  className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{
                    background: ev.daysAway === 0 ? 'rgba(99,102,241,0.08)' : 'var(--muted-bg)',
                    border: `1px solid ${ev.daysAway === 0 ? 'rgba(99,102,241,0.25)' : 'var(--card-border)'}`,
                  }}
                  title={ev.outfit_tip}
                >
                  <EventIcon name={ev.name} size={18} color="var(--foreground)" />
                  <div>
                    <p className="text-xs font-semibold whitespace-nowrap" style={{ color: 'var(--foreground)', lineHeight: 1.2 }}>
                      {ev.name.split(' ').slice(0, 2).join(' ')}
                    </p>
                    <p className="text-xs whitespace-nowrap" style={{ color: ev.daysAway === 0 ? 'var(--accent)' : 'var(--muted)' }}>
                      {ev.daysAway === 0 ? 'Today' : ev.daysAway === 1 ? 'Tomorrow' : `in ${ev.daysAway}d`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

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
                <Lightbulb size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <p className="text-xs font-medium leading-relaxed" style={{ color: 'var(--accent)' }}>
                  {suggestion.style_tip}
                </p>
              </div>
            )}

            {/* Outfit Inspiration */}
            {suggestion.search_query && (
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--muted)' }}>OUTFIT INSPIRATION</p>

                {/* Loading skeleton */}
                {imgLoading && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-full rounded-xl shimmer"
                        style={{ aspectRatio: '3/4' }}
                      />
                    ))}
                  </div>
                )}

                {/* Real images from Pexels / Pixabay */}
                {!imgLoading && inspirationImgs.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {inspirationImgs.map((img, i) => (
                      <a
                        key={i}
                        href={img.credit_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block relative rounded-xl overflow-hidden group"
                        style={{ aspectRatio: '3/4', background: 'var(--muted-bg)' }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.url}
                          alt={img.alt}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div
                          className="absolute bottom-0 left-0 right-0 px-2 py-1 text-xs truncate opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ background: 'rgba(0,0,0,0.55)', color: '#fff' }}
                        >
                          {img.credit}
                        </div>
                      </a>
                    ))}
                  </div>
                )}

                {/* Colour palette fallback — shown when no API key is configured */}
                {!imgLoading && inspirationImgs.length === 0 && suggestion.outfit_items && suggestion.outfit_items.length > 0 && (
                  <div className="rounded-xl p-4 mb-3" style={{ background: 'var(--muted-bg)', border: '1px solid var(--card-border)' }}>
                    <p className="text-xs mb-3" style={{ color: 'var(--muted)' }}>
                      Outfit colour palette — add <code className="px-1 rounded" style={{ background: 'var(--card-border)', fontSize: 10 }}>PEXELS_API_KEY</code> to Vercel for real photos
                    </p>
                    <div className="flex gap-3 flex-wrap">
                      {suggestion.outfit_items.map((item, i) => (
                        <div key={i} className="flex flex-col items-center gap-1.5">
                          <div
                            className="w-12 h-12 rounded-xl border"
                            style={{ background: item.color_hex, borderColor: 'rgba(0,0,0,0.1)' }}
                          />
                          <p className="text-xs text-center" style={{ color: 'var(--muted)', maxWidth: 56, lineHeight: 1.2 }}>
                            {item.piece.split(' ').slice(-1)[0]}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* External search links */}
                <div className="flex gap-2">
                  <a
                    href={pinterestUrl(suggestion.search_query)}
                    target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all hover:opacity-90"
                    style={{ background: '#e60023', color: '#fff' }}
                  >
                    <ExternalLink size={12} /> Pinterest
                  </a>
                  <a
                    href={googleImagesUrl(suggestion.search_query)}
                    target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all hover:opacity-90"
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
