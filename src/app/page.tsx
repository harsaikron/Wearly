'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import CameraCapture from '@/components/Camera';
import { useWardrobeStore } from '@/store/wardrobe';
import { stripDataPrefix, compressImage } from '@/lib/image-utils';
import {
  Camera, Shirt, Sparkles, Send, Loader,
  ImageIcon, X, Thermometer, Wind, Droplets,
  ExternalLink, TrendingUp, CalendarDays, Gem, Lightbulb, Flag, RefreshCw, Zap,
  Mars, Venus, Watch, FlaskConical, Paperclip, ChevronLeft, ChevronRight,
} from 'lucide-react';
import MirrorSlide from '@/components/MirrorSlide';
import {
  EventIcon, SeasonIcon,
} from '@/components/icons/SgIcons';
import WeatherAnimationIcon from '@/components/WeatherAnimationIcon';

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
  image_url?: string; // enriched client-side from wardrobe
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
interface GroomingStep {
  step: string;
  product_name?: string;
  recommendation: string;
  icon: string;
}
interface StrapSuggestion {
  strap_color: string;
  strap_hex: string;
  reason: string;
}
interface GroomingResult {
  skincare_routine?: GroomingStep[];
  strap_suggestion?: StrapSuggestion;
  accessory_tips?: { type: string; tip: string; color_suggestion: string }[];
  fragrance_note?: string;
  weather_note?: string;
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
  const [grooming, setGrooming]             = useState<GroomingResult | null>(null);
  const [groomingLoading, setGroomingLoading] = useState(false);
  const fileInputRef                        = useRef<HTMLInputElement>(null);

  // Mobile slider state
  const [activeSlide, setActiveSlide] = useState(1); // 0=Mirror, 1=Chat, 2=Today
  const [chatImg, setChatImg]         = useState<string | null>(null);
  const chatImgRef                    = useRef<HTMLInputElement>(null);

  // Gender toggle — persisted in localStorage
  const [gender, setGender] = useState<'male' | 'female'>('male');
  useEffect(() => {
    const saved = localStorage.getItem('wearly-gender') as 'male' | 'female' | null;
    if (saved) setGender(saved);
  }, []);
  function toggleGender(g: 'male' | 'female') {
    setGender(g);
    localStorage.setItem('wearly-gender', g);
    // Re-fetch OOTD with new gender context
    setOotd(null);
    setTrendCards([]);
    if (weather) fetchOOTD(weather, items, events, g);
  }

  const genderLabel = gender === 'male' ? 'men' : 'women';

  const fetchOOTD = useCallback(async function fetchOOTDImpl(
    currentWeather: Weather,
    currentItems: typeof items,
    eventsData: EventsData | null,
    genderOverride?: 'male' | 'female'
  ) {
    if (currentItems.length === 0) return;
    setOotdLoading(true);
    try {
      const day = new Date().toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Singapore' });
      const nearEvent = eventsData?.upcoming.find((e) => e.daysAway >= 0 && e.daysAway <= 7);
      const activeGender = genderOverride ?? gender;
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
          gender: activeGender,
        }),
      });
      const data = await res.json() as OOTDResult & { error?: string };
      if (!res.ok || data.error) return;

      // Enrich OOTD items with actual wardrobe images (match by name)
      const enrichedItems = (data.items ?? []).map((ootdItem) => {
        const wardrobeMatch = currentItems.find(
          (w) => w.name.toLowerCase().trim() === ootdItem.name.toLowerCase().trim()
        );
        return { ...ootdItem, image_url: wardrobeMatch?.image_url };
      });
      setOotd({ ...data, items: enrichedItems });
    } catch { /* silent */ } finally {
      setOotdLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gender]);

  async function fetchGrooming(currentWeather: Weather, currentItems: typeof items) {
    const groomingItems = currentItems.filter((i) => ['skincare','fragrance','grooming','makeup'].includes(i.category));
    const watchWithStraps = currentItems.find((i) => i.category === 'watch' && (i.straps?.length ?? 0) > 0);
    setGroomingLoading(true);
    try {
      const res = await fetch('/api/grooming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outfit: currentItems
            .filter((i) => !['skincare','fragrance','grooming'].includes(i.category))
            .slice(0, 6)
            .map((i) => ({ name: i.name, category: i.category, color_name: i.color_name })),
          groomingItems: groomingItems.map((i) => ({
            name: i.name, category: i.category,
            grooming_type: i.grooming_type, spf: i.spf, color_name: i.color_name,
          })),
          watchStraps: watchWithStraps?.straps?.map((s) => ({
            color_name: s.color_name, color_hex: s.color_hex, material: s.material,
          })),
          weather: {
            temperature: currentWeather.temperature,
            condition: currentWeather.condition,
            humidity: currentWeather.humidity,
            description: currentWeather.description,
          },
        }),
      });
      const d = await res.json();
      if (!d.error) setGrooming(d as GroomingResult);
    } catch { /* silent */ } finally { setGroomingLoading(false); }
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

  // Auto-fetch OOTD once weather + events are ready (also re-fetch when gender changes)
  useEffect(() => {
    if (weather && !ootd && !ootdLoading) {
      fetchOOTD(weather, items, events);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weather, events, fetchOOTD]);

  // Auto-fetch grooming suggestions once weather is ready
  useEffect(() => {
    if (weather && !grooming && !groomingLoading && items.length > 0) {
      fetchGrooming(weather, items);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weather, items.length]);

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  // Fetch one photo per trending style when events or gender changes
  useEffect(() => {
    if (!events) return;
    const terms = events.season.trending.slice(0, 4);
    setTrendLoading(true);
    setTrendCards([]);
    let cancelled = false;
    // Strict gender suffix so images match the active tab
    const genderSuffix = gender === 'male'
      ? 'menswear men male model'
      : 'womenswear women female model';
    (async () => {
      const results: { term: string; img: InspirationImage | null }[] = [];
      for (const term of terms) {
        if (cancelled) break;
        try {
          const r = await fetch(`/api/images?q=${encodeURIComponent(term + ' Singapore ' + genderSuffix)}`);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, gender]);

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

  function openCamera() {
    setShowCamera(true);
    // Scroll to top so the fixed camera overlay isn't hidden behind content on mobile
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    return `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(q + ' ' + genderLabel + ' outfit')}`;
  }
  function googleImagesUrl(q: string) {
    return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(q + ' ' + genderLabel + ' outfit Singapore')}`;
  }

  const QUICK = gender === 'male'
    ? [
        'What to wear for office today?',
        'Best outfit for Singapore heat?',
        'Smart casual evening look?',
        'Suggest a weekend outfit',
      ]
    : [
        'What to wear for work today?',
        'Feminine summer outfit ideas?',
        'Smart casual evening look?',
        'Weekend brunch outfit ideas',
      ];

  return (
    <>
    {/* ── MOBILE FULL-PAGE SLIDER (hidden on md+) ────── */}
    <div className="md:hidden" style={{ width: '100vw', height: '100dvh', overflow: 'hidden', position: 'relative' }}>

      {/* Slide dot indicators */}
      <div style={{ position: 'absolute', top: 16, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 6, zIndex: 30 }}>
        {[0, 1, 2].map((i) => (
          <button key={i} onClick={() => setActiveSlide(i)} style={{
            width: i === activeSlide ? 20 : 6,
            height: 6,
            borderRadius: 3,
            background: i === activeSlide ? '#A8D060' : 'rgba(255,255,255,0.35)',
            border: 'none',
            padding: 0,
            transition: 'all 0.3s ease',
            cursor: 'pointer',
          }} />
        ))}
      </div>

      {/* Slide container */}
      <div style={{
        display: 'flex',
        width: '300vw',
        height: '100%',
        transform: `translateX(${-activeSlide * 100}vw)`,
        transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>

        {/* ── Slide 0: Mirror ─── */}
        <div style={{ width: '100vw', height: '100dvh', flexShrink: 0 }}>
          <MirrorSlide isActive={activeSlide === 0} weather={weather} />
        </div>

        {/* ── Slide 1: AI Chat ─── */}
        <div style={{ width: '100vw', height: '100dvh', flexShrink: 0, overflowY: 'auto', background: 'var(--background)' }}>
          <div style={{ padding: '52px 20px 140px', maxWidth: 480, margin: '0 auto' }}>
            {/* Hero header */}
            <p style={{ fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>Your Style · Intelligence</p>
            <h1 style={{ fontFamily: 'var(--font-display), Georgia, serif', fontSize: 'clamp(2.2rem,9vw,3.4rem)', fontWeight: 600, fontStyle: 'italic', letterSpacing: '-0.025em', lineHeight: 0.95, color: 'var(--foreground)', margin: '0 0 20px' }}>
              Dress with<br/>
              <span style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>intention.</span>
            </h1>

            {/* Gender toggle */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: 4, borderRadius: 16, background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(16px) saturate(160%)', WebkitBackdropFilter: 'blur(16px) saturate(160%)', border: '1.5px solid rgba(255,255,255,0.85)', boxShadow: 'var(--shadow-sm)' }}>
                <button onClick={() => toggleGender('male')} style={gender === 'male' ? { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 12, fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', background: 'linear-gradient(to bottom, var(--primary-mid), var(--primary))', color: '#fff', boxShadow: 'var(--shadow-btn)' } : { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 12, fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', background: 'transparent', color: 'var(--muted)' }}>
                  <Mars size={15} /> Male
                </button>
                <button onClick={() => toggleGender('female')} style={gender === 'female' ? { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 12, fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #BE185D, #9B1750)', color: '#fff', boxShadow: '0 4px 14px rgba(190,24,93,0.35)' } : { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 12, fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', background: 'transparent', color: 'var(--muted)' }}>
                  <Venus size={15} /> Female
                </button>
              </div>
            </div>

            {/* Chat input with image attachment */}
            <div style={{ marginBottom: 12 }}>
              {chatImg && (
                <div style={{ position: 'relative', display: 'inline-block', marginBottom: 10 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={chatImg} alt="attached" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 12, border: '2px solid var(--card-border)' }} />
                  <button onClick={() => setChatImg(null)} style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: 'var(--foreground)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <X size={10} color="#fff" />
                  </button>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.80)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1.5px solid rgba(255,255,255,0.85)', borderRadius: 18, padding: '12px 14px', boxShadow: 'var(--shadow-md)' }}>
                <Sparkles size={15} style={{ color: 'var(--primary-mid)', flexShrink: 0 }} />
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && (question.trim() || chatImg)) { askAI(question || 'What do you think of this outfit?', chatImg ?? undefined); setChatImg(null); } }}
                  placeholder="Ask AI anything… what to wear today?"
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: 'var(--foreground)' }}
                />
                <input ref={chatImgRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  e.target.value = '';
                  const { compressImage: compress } = await import('@/lib/image-utils');
                  const compressed = await compress(file);
                  setChatImg(compressed);
                }} />
                <button onClick={() => chatImgRef.current?.click()} style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--muted-bg)', border: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                  <Paperclip size={15} style={{ color: 'var(--muted)' }} />
                </button>
                <button
                  onClick={() => { if (question.trim() || chatImg) { askAI(question || 'What do you think of this outfit?', chatImg ?? undefined); setChatImg(null); } }}
                  disabled={(!question.trim() && !chatImg) || loading}
                  style={{ width: 36, height: 36, borderRadius: 11, background: 'linear-gradient(to bottom, var(--primary-mid), var(--primary))', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, opacity: ((!question.trim() && !chatImg) || loading) ? 0.4 : 1 }}
                >
                  <Send size={15} color="#fff" />
                </button>
              </div>
            </div>

            {/* Quick prompts */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {QUICK.map((q, i) => {
                const colors = [
                  { bg: '#E8EDF5', color: '#2563EB', border: '#BFCFE8' },
                  { bg: '#FEF3E8', color: '#C2570A', border: '#F8D5B0' },
                  { bg: '#FDE8F3', color: '#BE185D', border: '#F5BCD9' },
                  { bg: '#E8F3EE', color: '#2C4A1E', border: '#B0D4BC' },
                ];
                const c = colors[i % colors.length];
                return (
                  <button key={q} onClick={() => { setQuestion(q); askAI(q); }} style={{ padding: '8px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: c.bg, color: c.color, border: `1.5px solid ${c.border}`, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
                    {q}
                  </button>
                );
              })}
            </div>

            {/* Photo display */}
            {photo && (
              <div style={{ position: 'relative', marginBottom: 16, borderRadius: 16, overflow: 'hidden' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo} alt="captured" style={{ width: '100%', objectFit: 'cover', maxHeight: 240, display: 'block' }} />
                <button onClick={clearPhoto} style={{ position: 'absolute', top: 10, right: 10, width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.92)', border: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <X size={14} style={{ color: 'var(--foreground)' }} />
                </button>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', marginBottom: 12 }}>
                <Loader size={16} style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
                <p style={{ fontSize: 14, color: 'var(--muted)' }}>Gemma 4 is analysing…</p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{ padding: '12px 16px', borderRadius: 14, background: 'rgba(239,68,68,0.06)', marginBottom: 12 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#dc2626', marginBottom: 4 }}>Could not get a response</p>
                <p style={{ fontSize: 12, color: 'var(--muted)' }}>{error}</p>
              </div>
            )}

            {/* AI Suggestion */}
            {suggestion && !loading && (
              <div style={{ borderRadius: 18, background: 'var(--card)', border: '1px solid var(--card-border)', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12, boxShadow: 'var(--shadow-sm)' }}>
                {suggestion.occasion && <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: 'var(--muted-bg)', color: 'var(--muted)', border: '1px solid var(--card-border)', marginBottom: 4, textTransform: 'capitalize', width: 'fit-content' }}>{suggestion.occasion}</span>}
                {suggestion.headline && <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--foreground)', lineHeight: 1.3, margin: 0 }}>{suggestion.headline}</h3>}
                <p style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--foreground)', margin: 0 }}>{suggestion.message}</p>
                {suggestion.outfit_items && suggestion.outfit_items.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Outfit Breakdown</p>
                    {suggestion.outfit_items.map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12, background: 'var(--muted-bg)', border: '1px solid var(--card-border)' }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: item.color_hex, border: '1px solid rgba(0,0,0,0.08)', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.piece}</p>
                          {item.note && <p style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.note}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {suggestion.style_tip && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', borderRadius: 12, background: 'rgba(44,74,30,0.05)', border: '1px solid rgba(44,74,30,0.14)' }}>
                    <Lightbulb size={13} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 1 }} />
                    <p style={{ fontSize: 12, color: 'var(--foreground)', lineHeight: 1.5, margin: 0 }}>{suggestion.style_tip}</p>
                  </div>
                )}
                {suggestion.search_query && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <a href={pinterestUrl(suggestion.search_query)} target="_blank" rel="noopener noreferrer" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', borderRadius: 12, background: '#e60023', color: '#fff', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                      <ExternalLink size={11} /> Pinterest
                    </a>
                    <a href={googleImagesUrl(suggestion.search_query)} target="_blank" rel="noopener noreferrer" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', borderRadius: 12, background: 'var(--muted-bg)', border: '1px solid var(--card-border)', color: 'var(--foreground)', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                      <ExternalLink size={11} /> Google Images
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Slide 2: Today ─── */}
        <div style={{ width: '100vw', height: '100dvh', flexShrink: 0, overflowY: 'auto', background: 'var(--background)' }}>
          <div style={{ padding: '52px 20px 140px', maxWidth: 480, margin: '0 auto' }}>

            {/* Weather card */}
            <div style={{ borderRadius: 18, marginBottom: 20, background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-mid) 60%, #4A7A2E 100%)', boxShadow: '0 6px 28px rgba(44,74,30,0.30)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' as const }}>
              <div>
                <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', marginBottom: 4 }}>{sgDay}</p>
                <p style={{ fontFamily: 'var(--font-display), Georgia, serif', fontStyle: 'italic', fontSize: '1.4rem', fontWeight: 500, color: '#fff', lineHeight: 1.1, letterSpacing: '-0.01em' }}>{sgDate}</p>
                <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.55)', marginTop: 3 }}>{sgTime} · Singapore</p>
              </div>
              {weather ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{ fontSize: '2.2rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1 }}>{weather.temperature}°</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)', textTransform: 'capitalize', maxWidth: 110 }}>{weather.description}</p>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.65rem', color: 'rgba(255,255,255,0.55)' }}><Droplets size={10} /> {weather.humidity}%</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.65rem', color: 'rgba(255,255,255,0.55)' }}><Wind size={10} /> {weather.wind_speed}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Loader size={14} style={{ color: 'rgba(255,255,255,0.6)', animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)' }}>Fetching weather…</span>
                </div>
              )}
            </div>

            {/* OOTD card */}
            <div style={{ borderRadius: 18, overflow: 'hidden', marginBottom: 20, background: 'var(--card)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg, rgba(44,74,30,0.06), rgba(44,74,30,0.04))', borderBottom: '1px solid var(--card-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Zap size={15} style={{ color: 'var(--accent)' }} />
                  <p style={{ fontFamily: 'var(--font-display), Georgia, serif', fontStyle: 'italic', fontWeight: 600, fontSize: '1.05rem', letterSpacing: '-0.01em', color: 'var(--foreground)' }}>Outfit of the Day</p>
                </div>
                <button onClick={() => weather && fetchOOTD(weather, items, events, gender)} disabled={ootdLoading || !weather} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '6px 10px', borderRadius: 10, background: 'var(--muted-bg)', color: 'var(--muted)', border: '1px solid var(--card-border)', cursor: 'pointer', opacity: (ootdLoading || !weather) ? 0.4 : 1 }}>
                  <RefreshCw size={11} /> {ootdLoading ? 'Picking…' : 'Refresh'}
                </button>
              </div>
              {ootdLoading && !ootd && (
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[0,1,2].map((i) => <div key={i} className="shimmer rounded-lg h-4 w-full" />)}
                </div>
              )}
              {!ootdLoading && !ootd && items.length === 0 && (
                <div style={{ padding: '24px', textAlign: 'center' }}>
                  <Shirt size={24} style={{ color: 'var(--muted)', margin: '0 auto 8px' }} />
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)', marginBottom: 4 }}>No wardrobe items yet</p>
                  <p style={{ fontSize: 12, color: 'var(--muted)' }}>Add clothes to your wardrobe and AI will pick today&apos;s best outfit automatically.</p>
                  <a href="/wardrobe" style={{ display: 'inline-block', marginTop: 10, fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 10, background: 'rgba(44,74,30,0.08)', color: 'var(--accent)', textDecoration: 'none' }}>Go to Wardrobe →</a>
                </div>
              )}
              {ootd && (
                <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>{ootd.outfit_name} <span style={{ fontWeight: 400, fontSize: 11, color: 'var(--muted)' }}>· {ootd.mood}</span></p>
                  <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{ootd.overall_reason}</p>
                  {ootd.items?.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: 'var(--muted-bg)', border: '1px solid var(--card-border)' }}>
                      <div style={{ width: 28, height: 28, borderRadius: 6, background: item.color_hex, border: '1px solid rgba(0,0,0,0.08)', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
                        <p style={{ fontSize: 10, color: 'var(--muted)' }}>{item.category} · {item.color_name}</p>
                      </div>
                    </div>
                  ))}
                  {ootd.style_tip && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', borderRadius: 10, background: 'rgba(44,74,30,0.05)', border: '1px solid rgba(44,74,30,0.14)' }}>
                      <Sparkles size={12} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 1 }} />
                      <p style={{ fontSize: 12, color: 'var(--foreground)', lineHeight: 1.5, margin: 0 }}><span style={{ fontWeight: 600 }}>Style tip: </span>{ootd.style_tip}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Wardrobe status */}
            <div style={{ borderRadius: 18, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1.5px solid rgba(255,255,255,0.80)', boxShadow: 'var(--shadow-md)', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #E8F3EE, #D0EDD8)', border: '1.5px solid #B0D4BC' }}>
                  <Shirt size={18} style={{ color: 'var(--primary-mid)' }} />
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>{items.length === 0 ? 'Wardrobe empty' : `${items.length} item${items.length !== 1 ? 's' : ''}`}</p>
                  <p style={{ fontSize: 12, color: 'var(--muted)' }}>{items.length === 0 ? 'Add clothes so AI can suggest outfits' : 'AI picks from your wardrobe'}</p>
                </div>
              </div>
              <a href="/wardrobe" style={{ padding: '10px 18px', fontSize: 13, borderRadius: 12, background: 'linear-gradient(to bottom, var(--primary-mid), var(--primary))', color: '#fff', fontWeight: 700, textDecoration: 'none' }}>
                {items.length === 0 ? 'Add Clothes' : 'View'}
              </a>
            </div>

            {/* Trending cards */}
            {events && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <TrendingUp size={15} style={{ color: '#e91e8c' }} />
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>Trending Looks</p>
                </div>
                <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
                  {trendLoading && trendCards.length === 0 && [0,1,2,3].map((i) => (
                    <div key={i} className="shrink-0 rounded-2xl shimmer" style={{ width: 120, height: 160, flexShrink: 0 }} />
                  ))}
                  {trendCards.map(({ term, img }) => (
                    <a key={term} href={`https://www.pinterest.com/search/pins/?q=${encodeURIComponent(term + ' ' + genderLabel + ' outfit')}`} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0, position: 'relative', width: 120, height: 160, borderRadius: 16, overflow: 'hidden', background: 'var(--muted-bg)', border: '1px solid var(--card-border)', textDecoration: 'none', display: 'block' }}>
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img.url} alt={img.alt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <ImageIcon size={22} style={{ color: 'var(--muted)' }} />
                        </div>
                      )}
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 10px 10px', background: 'linear-gradient(transparent, rgba(0,0,0,0.72))' }}>
                        <p style={{ color: '#fff', fontSize: 10, fontWeight: 600, lineHeight: 1.3 }}>{term}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Left / Right swipe arrows */}
      {activeSlide > 0 && (
        <button onClick={() => setActiveSlide((s) => s - 1)} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20, cursor: 'pointer' }}>
          <ChevronLeft size={18} color="#fff" />
        </button>
      )}
      {activeSlide < 2 && (
        <button onClick={() => setActiveSlide((s) => s + 1)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20, cursor: 'pointer' }}>
          <ChevronRight size={18} color="#fff" />
        </button>
      )}
    </div>

    {/* ── DESKTOP LAYOUT (hidden on mobile) ─── */}
    <div className="hidden md:block max-w-2xl mx-auto px-4 page-enter" style={{ paddingTop: '28px' }}>

      {/* ── Editorial Hero Header ─────────────────────────────── */}
      <div className="mb-6" style={{ paddingBottom: 4 }}>
        <p style={{
          fontSize: '0.6rem',
          fontWeight: 700,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          marginBottom: 6,
        }}>
          Your Style · Intelligence
        </p>
        <h1 style={{
          fontFamily: 'var(--font-display), Georgia, serif',
          fontSize: 'clamp(2.6rem, 10vw, 4.2rem)',
          fontWeight: 600,
          fontStyle: 'italic',
          letterSpacing: '-0.025em',
          lineHeight: 0.95,
          color: 'var(--foreground)',
          margin: 0,
        }}>
          Dress with
          <br />
          <span style={{
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-mid) 50%, var(--accent) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            intention.
          </span>
        </h1>
      </div>

      {/* ── Gender toggle ─────────────────────────────────────── */}
      <div className="flex justify-center mb-5">
        <div
          className="flex items-center gap-1 p-1 rounded-2xl"
          style={{
            background: 'rgba(255,255,255,0.75)',
            backdropFilter: 'blur(16px) saturate(160%)',
            WebkitBackdropFilter: 'blur(16px) saturate(160%)',
            border: '1.5px solid rgba(255,255,255,0.85)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <button
            onClick={() => toggleGender('male')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={gender === 'male' ? {
              background: 'linear-gradient(to bottom, var(--primary-mid), var(--primary))',
              color: '#fff',
              boxShadow: 'var(--shadow-btn)',
            } : {
              background: 'transparent',
              color: 'var(--muted)',
            }}
          >
            <Mars size={15} />
            Male
          </button>
          <button
            onClick={() => toggleGender('female')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={gender === 'female' ? {
              background: 'linear-gradient(135deg, #BE185D, #9B1750)',
              color: '#fff',
              boxShadow: '0 4px 14px rgba(190,24,93,0.35)',
            } : {
              background: 'transparent',
              color: 'var(--muted)',
            }}
          >
            <Venus size={15} />
            Female
          </button>
        </div>
      </div>

      {/* ── Weather + Date strip ───────────────────────────────── */}
      <div
        className="rounded-2xl mb-6"
        style={{
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-mid) 60%, #4A7A2E 100%)',
          boxShadow: '0 6px 28px rgba(44,74,30,0.30), inset 0 1px 0 rgba(255,255,255,0.12)',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap' as const,
        }}
      >
        {/* Date / Time */}
        <div>
          <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', marginBottom: 4 }}>
            {sgDay}
          </p>
          <p style={{
            fontFamily: 'var(--font-display), Georgia, serif',
            fontStyle: 'italic',
            fontSize: '1.4rem',
            fontWeight: 500,
            color: '#fff',
            lineHeight: 1.1,
            letterSpacing: '-0.01em',
          }}>
            {sgDate}
          </p>
          <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.55)', marginTop: 3 }}>
            {sgTime} · Singapore · {sgSeason}
          </p>
        </div>

        {/* Weather */}
        {weather ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <WeatherAnimationIcon condition={weather.condition} temperature={weather.temperature} size={52} color="#ffffff" />
              <span style={{ fontSize: '2.2rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1 }}>
                {weather.temperature}°
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)', textTransform: 'capitalize', maxWidth: 110 }}>
                {weather.description}
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.65rem', color: 'rgba(255,255,255,0.55)' }}>
                  <Thermometer size={10} /> {weather.feels_like}°
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.65rem', color: 'rgba(255,255,255,0.55)' }}>
                  <Droplets size={10} /> {weather.humidity}%
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.65rem', color: 'rgba(255,255,255,0.55)' }}>
                  <Wind size={10} /> {weather.wind_speed}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Loader size={14} style={{ color: 'rgba(255,255,255,0.6)', animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)' }}>Fetching weather…</span>
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
          style={{ background: 'linear-gradient(135deg, rgba(44,74,30,0.06) 0%, rgba(44,74,30,0.04) 100%)', borderBottom: '1px solid var(--card-border)' }}
        >
          <div className="flex items-center gap-2">
            <Zap size={15} style={{ color: 'var(--accent)' }} />
            <p style={{ fontFamily: 'var(--font-display), Georgia, serif', fontStyle: 'italic', fontWeight: 600, fontSize: '1.05rem', letterSpacing: '-0.01em', color: 'var(--foreground)' }}>Outfit of the Day</p>
            {ootd && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ background: 'rgba(44,74,30,0.08)', color: 'var(--accent)', border: '1px solid rgba(44,74,30,0.18)' }}
              >
                {ootd.mood}
              </span>
            )}
          </div>
          <button
            onClick={() => weather && fetchOOTD(weather, items, events, gender)}
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
              style={{ background: 'rgba(44,74,30,0.08)', color: 'var(--accent)' }}
            >
              Go to Wardrobe →
            </a>
          </div>
        )}

        {/* OOTD result — flat-lay board style */}
        {ootd && (
          <div className="flex flex-col">

            {/* ── Flat-lay board ────────────────────────────── */}
            <div
              className="relative mx-4 mt-3 mb-0 rounded-3xl overflow-hidden"
              style={{
                background: 'linear-gradient(145deg, #F5F0EC 0%, #EDE6DE 60%, #E8DFD5 100%)',
                minHeight: 220,
                border: '1px solid rgba(0,0,0,0.06)',
              }}
            >
              {/* Outfit name overlay */}
              <div
                className="absolute top-3 left-3 z-10 px-3 py-1.5 rounded-full"
                style={{
                  background: 'rgba(255,255,255,0.85)',
                  backdropFilter: 'blur(8px)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                }}
              >
                <p className="text-xs font-bold" style={{ color: 'var(--primary)' }}>{ootd.outfit_name}</p>
              </div>
              {/* Mood badge */}
              {ootd.mood && (
                <div
                  className="absolute top-3 right-3 z-10 px-3 py-1.5 rounded-full"
                  style={{
                    background: 'linear-gradient(135deg, var(--primary-mid), var(--primary))',
                    boxShadow: 'var(--shadow-btn)',
                  }}
                >
                  <p className="text-xs font-bold" style={{ color: '#fff' }}>{ootd.mood}</p>
                </div>
              )}

              {/* Items grid — flat-lay spread */}
              <div
                className="flex flex-wrap justify-center items-center gap-4 px-4 py-10"
                style={{ minHeight: 220 }}
              >
                {ootd.items?.map((item, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center gap-1.5"
                    style={{
                      transform: `rotate(${[-4, 3, -2, 5][i % 4]}deg)`,
                      transition: 'transform 0.2s ease',
                    }}
                  >
                    {item.image_url ? (
                      <div
                        className="rounded-2xl overflow-hidden"
                        style={{
                          width: ootd.items.length <= 2 ? 110 : ootd.items.length === 3 ? 95 : 80,
                          height: ootd.items.length <= 2 ? 130 : ootd.items.length === 3 ? 112 : 96,
                          background: '#fff',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.16), 0 2px 6px rgba(0,0,0,0.08)',
                          border: '2px solid rgba(255,255,255,0.9)',
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.image_url}
                          alt={item.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                    ) : (
                      <div
                        className="cbm-card-bg rounded-2xl flex items-center justify-center"
                        data-cn={item.color_name ?? ''}
                        style={{
                          width: ootd.items.length <= 2 ? 110 : ootd.items.length === 3 ? 95 : 80,
                          height: ootd.items.length <= 2 ? 130 : ootd.items.length === 3 ? 112 : 96,
                          background: `linear-gradient(135deg, ${item.color_hex ?? '#C8C8C8'}, ${item.color_hex ?? '#C8C8C8'}CC)`,
                          boxShadow: '0 8px 24px rgba(0,0,0,0.16), 0 2px 6px rgba(0,0,0,0.08)',
                          border: '2px solid rgba(255,255,255,0.9)',
                        }}
                      >
                        <Shirt size={28} style={{ color: 'rgba(255,255,255,0.75)' }} />
                      </div>
                    )}
                    {/* Item label */}
                    <span
                      className="px-2 py-0.5 rounded-full text-center"
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        background: 'rgba(255,255,255,0.80)',
                        color: 'var(--foreground-mid)',
                        backdropFilter: 'blur(4px)',
                        maxWidth: 90,
                        lineHeight: 1.3,
                        textAlign: 'center',
                      }}
                    >
                      {item.name.split(' ').slice(0, 3).join(' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Details section ───────────────────────────── */}
            <div className="px-4 py-4 flex flex-col gap-3">

              {/* Overall reason */}
              <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>{ootd.overall_reason}</p>

              {/* Item breakdown */}
              <div className="flex flex-col gap-2">
                {ootd.items?.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                    style={{ background: 'var(--muted-bg)', border: '1px solid var(--card-border)' }}
                  >
                    {/* Color swatch */}
                    <div
                      className="cbm-swatch w-8 h-8 rounded-lg shrink-0 border"
                      data-cn={item.color_name ?? ''}
                      style={{ background: item.color_hex ?? '#e5e7eb', borderColor: 'rgba(0,0,0,0.08)' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: 'var(--foreground)' }}>{item.name}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--muted)', fontSize: 10 }}>{item.category} · {item.color_name}</p>
                    </div>
                    {/* WHY inline */}
                    <div className="flex items-start gap-1 max-w-[48%]">
                      <Lightbulb size={10} style={{ color: 'var(--accent)', marginTop: 1, flexShrink: 0 }} />
                      <p style={{ fontSize: 10, color: 'var(--muted)', lineHeight: 1.4 }}>{item.why}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Style tip */}
              {ootd.style_tip && (
                <div
                  className="rounded-xl px-3 py-2.5 flex items-start gap-2"
                  style={{ background: 'rgba(44,74,30,0.05)', border: '1px solid rgba(44,74,30,0.14)' }}
                >
                  <Sparkles size={12} style={{ color: 'var(--accent)', marginTop: 2, flexShrink: 0 }} />
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--foreground)' }}>
                    <span className="font-semibold">Style tip: </span>{ootd.style_tip}
                  </p>
                </div>
              )}

              <p className="text-xs text-right" style={{ color: 'var(--muted)' }}>
                Selected by Gemma 4 · {ootd.backend === 'ollama' ? 'Running locally' : 'Cloud AI'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Grooming & Accessories AI ─────────────────────────── */}
      {(groomingLoading || grooming) && items.length > 0 && (
        <div
          className="rounded-2xl overflow-hidden mb-6"
          style={{ background: 'var(--card)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-sm)' }}
        >
          {/* Header */}
          <div
            className="px-4 py-3 flex items-center justify-between"
            style={{ background: 'linear-gradient(135deg, rgba(190,24,93,0.05) 0%, rgba(124,58,237,0.04) 100%)', borderBottom: '1px solid var(--card-border)' }}
          >
            <div className="flex items-center gap-2">
              <FlaskConical size={15} style={{ color: '#be185d' }} />
              <p className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>Grooming &amp; Accessories</p>
              {grooming?.weather_note && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium hidden sm:inline"
                  style={{ background: 'rgba(190,24,93,0.08)', color: '#be185d', border: '1px solid rgba(190,24,93,0.15)' }}>
                  AI powered
                </span>
              )}
            </div>
            <button
              onClick={() => { setGrooming(null); if (weather) fetchGrooming(weather, items); }}
              disabled={groomingLoading}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-xl font-medium hover:opacity-80 disabled:opacity-40"
              style={{ background: 'var(--muted-bg)', color: 'var(--muted)', border: '1px solid var(--card-border)' }}
            >
              <RefreshCw size={11} className={groomingLoading ? 'animate-spin' : ''} />
              {groomingLoading ? 'Thinking…' : 'Refresh'}
            </button>
          </div>

          {groomingLoading && !grooming && (
            <div className="px-4 py-4 flex flex-col gap-3">
              {[0,1,2].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="shimmer w-8 h-8 rounded-xl shrink-0" />
                  <div className="flex-1 flex flex-col gap-1.5">
                    <div className="shimmer h-3 rounded w-1/3" />
                    <div className="shimmer h-2.5 rounded w-4/5" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {grooming && (
            <div className="px-4 py-4 flex flex-col gap-4">

              {/* Weather note */}
              {grooming.weather_note && (
                <div className="px-3 py-2.5 rounded-xl flex items-start gap-2"
                  style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)' }}>
                  <span style={{ fontSize: 15 }}>☀️</span>
                  <p className="text-xs leading-relaxed" style={{ color: '#92400e' }}>{grooming.weather_note}</p>
                </div>
              )}

              {/* Skincare routine */}
              {grooming.skincare_routine && grooming.skincare_routine.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--muted)' }}>
                    Morning Routine
                  </p>
                  <div className="flex flex-col gap-2">
                    {grooming.skincare_routine.map((step, i) => (
                      <div key={i} className="flex items-start gap-3 px-3 py-2.5 rounded-xl"
                        style={{ background: 'var(--muted-bg)', border: '1px solid var(--card-border)' }}>
                        <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>{step.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs font-bold" style={{ color: 'var(--foreground)' }}>{step.step}</p>
                            {step.product_name && (
                              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                                style={{ background: 'rgba(190,24,93,0.08)', color: '#be185d', border: '1px solid rgba(190,24,93,0.15)' }}>
                                {step.product_name}
                              </span>
                            )}
                          </div>
                          <p className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--muted)' }}>{step.recommendation}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Watch strap suggestion */}
              {grooming.strap_suggestion && (
                <div className="px-3 py-3 rounded-xl flex items-center gap-3"
                  style={{ background: 'rgba(44,74,30,0.05)', border: '1px solid rgba(44,74,30,0.15)' }}>
                  <Watch size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold" style={{ color: 'var(--foreground)' }}>Strap of the Day</p>
                      <div className="w-4 h-4 rounded-full border-2"
                        style={{ background: grooming.strap_suggestion.strap_hex, borderColor: 'rgba(255,255,255,0.8)', flexShrink: 0 }}/>
                      <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
                        {grooming.strap_suggestion.strap_color}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{grooming.strap_suggestion.reason}</p>
                  </div>
                </div>
              )}

              {/* Accessory tips */}
              {grooming.accessory_tips && grooming.accessory_tips.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--muted)' }}>
                    Accessory Tips
                  </p>
                  <div className="flex flex-col gap-2">
                    {grooming.accessory_tips.map((tip, i) => (
                      <div key={i} className="flex items-start gap-2 px-3 py-2.5 rounded-xl"
                        style={{ background: 'var(--muted-bg)', border: '1px solid var(--card-border)' }}>
                        <Gem size={13} style={{ color: '#7c3aed', marginTop: 1, flexShrink: 0 }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold capitalize" style={{ color: 'var(--foreground)' }}>{tip.type}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                            {tip.tip}
                            {tip.color_suggestion && (
                              <span style={{ color: 'var(--primary-mid)' }}> · {tip.color_suggestion}</span>
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Fragrance note */}
              {grooming.fragrance_note && (
                <div className="px-3 py-2.5 rounded-xl flex items-start gap-2"
                  style={{ background: 'rgba(124,58,237,0.05)', border: '1px solid rgba(124,58,237,0.15)' }}>
                  <span style={{ fontSize: 15 }}>💨</span>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: '#7c3aed' }}>Fragrance</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{grooming.fragrance_note}</p>
                  </div>
                </div>
              )}

              {/* CTA: add grooming items */}
              {items.filter((i) => ['skincare','fragrance','grooming','makeup'].includes(i.category)).length === 0 && (
                <a href="/wardrobe"
                  className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold"
                  style={{ background: 'rgba(190,24,93,0.06)', color: '#be185d', border: '1px dashed rgba(190,24,93,0.3)' }}>
                  <FlaskConical size={14}/> Upload your creams, makeup &amp; skincare →
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Season Discovery + Trends ─────────────────────────── */}
      {events && (
        <div className="mb-6 flex flex-col gap-4">

          {/* ① Today's event banner */}
          {events.upcoming[0]?.daysAway === 0 && (
            <div
              className="rounded-2xl px-4 py-4 flex items-start gap-3"
              style={{ background: 'linear-gradient(135deg, var(--primary-mid) 0%, var(--primary-light) 100%)', color: '#fff' }}
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
            <div className="px-4 pt-4 pb-3" style={{ background: 'linear-gradient(135deg, rgba(44,74,30,0.06) 0%, rgba(44,74,30,0.04) 100%)' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <SeasonIcon season={events.season.season} size={18} color="var(--accent)" />
                  <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
                    {events.season.season}
                  </p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: 'rgba(44,74,30,0.08)', color: 'var(--accent)', border: '1px solid rgba(44,74,30,0.18)' }}>
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
                href={`https://www.pinterest.com/search/pins/?q=${encodeURIComponent(events.season.trending[0] + ' ' + genderLabel + ' outfit Singapore')}`}
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
                  href={`https://www.pinterest.com/search/pins/?q=${encodeURIComponent(term + ' ' + genderLabel + ' outfit')}`}
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
                  href={`https://www.pinterest.com/search/pins/?q=${encodeURIComponent(genderLabel + ' outfit Singapore ' + events.season.season)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="shrink-0 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all hover:opacity-80"
                  style={{ width: 100, height: 175, background: 'linear-gradient(135deg, rgba(233,30,140,0.06), rgba(44,74,30,0.06))', border: '1px dashed rgba(233,30,140,0.3)', flexShrink: 0 }}
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
                href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(events.season.trending.slice(0, 2).join(' ') + ' ' + genderLabel + ' Singapore outfit')}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:opacity-80"
                style={{ background: 'var(--card)', border: '1px solid var(--card-border)', color: 'var(--muted)', boxShadow: 'var(--shadow-sm)' }}
              >
                <ExternalLink size={10} /> Google Images
              </a>
              <a
                href={`https://www.instagram.com/explore/tags/${encodeURIComponent((events.season.trending[0] + genderLabel).replace(/\s+/g, ''))}/`}
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
                  href={`https://www.pinterest.com/search/pins/?q=${encodeURIComponent(t + ' ' + genderLabel)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="px-3 py-1 rounded-full text-xs font-medium transition-all hover:opacity-80"
                  style={{
                    background: i % 2 === 0
                      ? 'linear-gradient(135deg, rgba(233,30,140,0.08), rgba(44,74,30,0.04))'
                      : 'linear-gradient(135deg, rgba(44,74,30,0.07), rgba(99,102,241,0.04))',
                    border: `1px solid ${i % 2 === 0 ? 'rgba(233,30,140,0.2)' : 'rgba(44,74,30,0.18)'}`,
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
                    background: ev.daysAway === 0 ? 'rgba(44,74,30,0.07)' : 'var(--muted-bg)',
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
                onClick={openCamera}
                className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(to bottom, var(--primary-mid), var(--primary))', color: '#fff', boxShadow: 'var(--shadow-btn)' }}
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
                style={{ background: 'var(--accent-muted)', border: '1px solid rgba(44,74,30,0.14)' }}
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

      {/* ── Ask AI input — glass frosted ─────────────────────── */}
      <div
        className="flex items-center gap-3 rounded-2xl px-4 py-3.5 mb-4"
        style={{
          background: 'rgba(255,255,255,0.80)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '1.5px solid rgba(255,255,255,0.85)',
          boxShadow: 'var(--shadow-md), inset 0 1px 0 rgba(255,255,255,0.9)',
        }}
      >
        <Sparkles size={16} style={{ color: 'var(--primary-mid)' }} />
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && question.trim() && askAI(question)}
          placeholder="Ask AI anything… what to wear today?"
          className="flex-1 bg-transparent outline-none text-sm font-medium"
          style={{ color: 'var(--foreground)' }}
        />
        <button
          onClick={() => question.trim() && askAI(question)}
          disabled={!question.trim() || loading}
          className="w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-40 btn-bounce"
          style={{ background: 'linear-gradient(to bottom, var(--primary-mid), var(--primary))', boxShadow: 'var(--shadow-btn)' }}
        >
          <Send size={14} style={{ color: '#fff' }} />
        </button>
      </div>

      {/* ── Quick prompts — colorful pills ───────────────────── */}
      <div className="flex flex-wrap gap-2 mb-8">
        {QUICK.map((q, i) => {
          const colors = [
            { bg: '#E8EDF5', color: '#2563EB', border: '#BFCFE8' },   // blue
            { bg: '#FEF3E8', color: '#C2570A', border: '#F8D5B0' },   // amber
            { bg: '#FDE8F3', color: '#BE185D', border: '#F5BCD9' },   // pink
            { bg: '#E8F3EE', color: '#2C4A1E', border: '#B0D4BC' },   // green
          ];
          const c = colors[i % colors.length];
          return (
            <button
              key={q}
              onClick={() => { setQuestion(q); askAI(q); }}
              className="px-3 py-2 rounded-full text-xs font-semibold transition-all btn-bounce"
              style={{ background: c.bg, color: c.color, border: `1.5px solid ${c.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}
            >
              {q}
            </button>
          );
        })}
      </div>

      {/* ── Wardrobe status — glass card ─────────────────────── */}
      <div
        className="rounded-2xl p-4 flex items-center justify-between"
        style={{
          background: 'rgba(255,255,255,0.78)',
          backdropFilter: 'blur(16px) saturate(160%)',
          WebkitBackdropFilter: 'blur(16px) saturate(160%)',
          border: '1.5px solid rgba(255,255,255,0.80)',
          boxShadow: 'var(--shadow-md), inset 0 1px 0 rgba(255,255,255,0.9)',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #E8F3EE, #D0EDD8)', border: '1.5px solid #B0D4BC' }}>
            <Shirt size={18} style={{ color: 'var(--primary-mid)' }} />
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>
              {items.length === 0 ? 'Wardrobe empty' : `${items.length} item${items.length !== 1 ? 's' : ''}`}
            </p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              {items.length === 0 ? 'Add clothes so AI can suggest outfits' : 'AI picks from your wardrobe'}
            </p>
          </div>
        </div>
        <Link
          href="/wardrobe"
          className="btn-primary"
          style={{ padding: '10px 18px', fontSize: 13 }}
        >
          {items.length === 0 ? 'Add Clothes' : 'View'}
        </Link>
      </div>

      {showCamera && (
        <CameraCapture onCapture={onCameraCapture} onClose={() => setShowCamera(false)} />
      )}
    </div>
    </>
  );
}
