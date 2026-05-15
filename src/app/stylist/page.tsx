'use client';

import { useState, useRef, useEffect } from 'react';
import { useWardrobeStore } from '@/store/wardrobe';
import { PlannedOutfit } from '@/types';
import {
  Sparkles, Bot, User, CalendarDays, ShoppingBag,
  ExternalLink, Loader, Lightbulb, Leaf, Zap, Award,
  RefreshCw, ChevronDown, ChevronUp, CalendarPlus, Check, X,
} from 'lucide-react';
import { EventIcon, OccasionIcon } from '@/components/icons/SgIcons';
import { getUpcomingEvents } from '@/lib/singapore-events';

// ── Types ─────────────────────────────────────────────────────────────────────
interface OutfitItem { piece: string; color_name: string; color_hex: string; note: string; }
interface AISuggestion {
  headline?: string; message: string; outfit_items?: OutfitItem[];
  style_tip?: string; occasion?: string; search_query?: string;
}
interface Message { id: string; role: 'user' | 'assistant'; content: string; suggestion?: AISuggestion; error?: boolean; }
interface SGEvent { name: string; date: string; outfit_tip: string; daysAway: number; dress_code: string; colors: string[]; }
interface EcoOutfit { outfit_name: string; items: string[]; styling_note: string; eco_tip: string; carbon_saved_kg: number; }
interface EcoResult {
  outfits: EcoOutfit[]; wardrobe_score: string; score_breakdown: string;
  weekly_challenge: string; carbon_facts: string;
}

// ── Static data ───────────────────────────────────────────────────────────────
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const OCCASIONS = [
  { label: 'Date Night',   hint: 'romantic dinner date night' },
  { label: 'Office',       hint: 'smart professional office work' },
  { label: 'Casual',       hint: 'casual everyday relaxed chill' },
  { label: 'Weekend',      hint: 'weekend outdoor leisure' },
  { label: 'Party',        hint: 'party night out celebration' },
  { label: 'Wedding',      hint: 'wedding formal guest attire' },
  { label: 'Festive',      hint: 'festive cultural traditional' },
  { label: 'Travel',       hint: 'travel airport comfortable' },
  { label: 'Gym',          hint: 'gym workout activewear' },
  { label: 'Beach / Pool', hint: 'beach resort swimwear' },
];
const ECO_OCCASIONS = ['Casual','Office','Date Night','Weekend','Party','Wedding','Festive','Travel','Gym','Beach / Pool'];
const CARBON_STATS = [
  { value: '10%', label: 'of global CO₂ from fashion' },
  { value: '92M', label: 'tonnes of textile waste/year' },
  { value: '3×',  label: 'more wears = 30% less carbon' },
  { value: '70%', label: 'of wardrobes never worn again' },
];
const SECONDHAND_LINKS = [
  { name: 'Carousell SG', url: 'https://www.carousell.sg/categories/women-fashion-1/?sort_by=3', desc: "Singapore's largest second-hand fashion marketplace", bg: '#e8f5e9', color: '#2e7d32' },
  { name: 'Refash',       url: 'https://www.refash.sg',         desc: 'SG consignment store — earn cash from clothes', bg: '#e3f2fd', color: '#1565c0' },
  { name: 'Style Theory', url: 'https://sg.styletheory.co',     desc: 'Rent designer clothes in Singapore',           bg: '#f3e5f5', color: '#6a1b9a' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function sheinUrl(q: string)  { return `https://sg.shein.com/search?q=${encodeURIComponent(q)}&cat_id=2`; }
function shopeeUrl(q: string) { return `https://shopee.sg/search?keyword=${encodeURIComponent(q)}`; }
function zaloraUrl(q: string) { return `https://www.zalora.com.sg/search/?q=${encodeURIComponent(q)}`; }
function getContrast(hex: string) {
  if (!hex || hex.length < 7) return '#1f2937';
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return (r*299+g*587+b*114)/1000 >= 128 ? '#1f2937' : '#ffffff';
}
function uid() { return Math.random().toString(36).slice(2); }

function ShopButtons({ query }: { query: string }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      <a href={sheinUrl(query)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold hover:opacity-80" style={{ background:'#000', color:'#fff' }}><ShoppingBag size={9}/> Shein</a>
      <a href={shopeeUrl(query)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold hover:opacity-80" style={{ background:'#ee4d2d', color:'#fff' }}><ShoppingBag size={9}/> Shopee</a>
      <a href={zaloraUrl(query)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold hover:opacity-80" style={{ background:'linear-gradient(to bottom, var(--primary-mid), var(--primary))', color:'#fff' }}><ShoppingBag size={9}/> Zalora</a>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
type Tab = 'stylist' | 'eco';

// ── Add-to-Planner modal ──────────────────────────────────────────────────────
function PlannerModal({
  suggestion,
  onClose,
  onSaved,
}: {
  suggestion: AISuggestion;
  onClose: () => void;
  onSaved: (date: string) => void;
}) {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  return (
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center"
      style={{ zIndex: 9000, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl p-6 flex flex-col gap-4"
        style={{ background: 'var(--card)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-md)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarPlus size={18} style={{ color: 'var(--accent)' }} />
            <p className="font-bold text-sm" style={{ color: 'var(--foreground)' }}>Add to Planner</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full" style={{ background: 'var(--muted-bg)' }}>
            <X size={14} style={{ color: 'var(--muted)' }} />
          </button>
        </div>
        <p className="text-xs" style={{ color: 'var(--muted)' }}>
          {suggestion.headline ?? 'Outfit'} · {(suggestion.outfit_items ?? []).length} piece{(suggestion.outfit_items ?? []).length !== 1 ? 's' : ''}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {(suggestion.outfit_items ?? []).slice(0, 4).map((item, i) => (
            <span key={i} className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${item.color_hex}22`, color: 'var(--foreground)', border: `1px solid ${item.color_hex}44` }}>
              {item.piece}
            </span>
          ))}
        </div>
        <div>
          <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--muted)' }}>PICK A DATE</label>
          <input
            type="date"
            value={date}
            min={today}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
            style={{ background: 'var(--muted-bg)', border: '1.5px solid var(--card-border)', color: 'var(--foreground)', fontSize: 16 }}
          />
        </div>
        <button
          onClick={() => { onSaved(date); onClose(); }}
          className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(to bottom, var(--primary-mid), var(--primary))', color: '#fff' }}
        >
          <Check size={15} /> Save to {new Date(date + 'T00:00:00').toLocaleDateString('en-SG', { weekday: 'short', month: 'short', day: 'numeric' })}
        </button>
      </div>
    </div>
  );
}

export default function StylistPage() {
  const { items, addPlannedOutfit } = useWardrobeStore();
  const todayIdx = (new Date().getDay() + 6) % 7;

  const [tab, setTab] = useState<Tab>('stylist');

  // ── Stylist state ──
  const [selectedDay,      setSelectedDay]      = useState(todayIdx);
  const [selectedOccasion, setSelectedOccasion] = useState<string | null>(null);
  const [selectedEvent,    setSelectedEvent]    = useState<string | null>(null);
  const [sgEvents,         setSgEvents]         = useState<SGEvent[]>([]);
  const [messages,         setMessages]         = useState<Message[]>([]);
  const [loading,          setLoading]          = useState(false);
  const [plannerMsg,       setPlannerMsg]       = useState<{ id: string; suggestion: AISuggestion } | null>(null);
  const [savedDates,       setSavedDates]       = useState<Record<string, string>>({});
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Eco state ──
  const [ecoOccasion,      setEcoOccasion]      = useState('Casual');
  const [ecoEvent,         setEcoEvent]         = useState('');
  const [ecoResult,        setEcoResult]        = useState<EcoResult | null>(null);
  const [ecoLoading,       setEcoLoading]       = useState(false);
  const [ecoError,         setEcoError]         = useState('');
  const [expandedOutfit,   setExpandedOutfit]   = useState<number | null>(0);

  const upcomingEvents = getUpcomingEvents(4);

  useEffect(() => {
    fetch('/api/events').then((r) => r.json()).then((d) => setSgEvents(d.upcoming ?? [])).catch(() => null);
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // ── Stylist helpers ──
  function buildQuery() {
    const dayLabel = DAYS[selectedDay];
    const occ = OCCASIONS.find((o) => o.label === selectedOccasion);
    if (selectedEvent) return `What should I wear for ${selectedEvent} on ${dayLabel}? Give me a complete outfit with specific pieces, colours, and where to buy each item.`;
    if (occ) return `Suggest a ${occ.hint} outfit for ${dayLabel} in Singapore heat. Give me specific pieces with colours.`;
    return `What should I wear on ${dayLabel} in Singapore?`;
  }

  async function ask(overrideQuery?: string) {
    const query = overrideQuery ?? buildQuery();
    if (!query || loading) return;
    setMessages((p) => [...p, { id: uid(), role: 'user', content: query }]);
    setLoading(true);
    try {
      const res = await fetch('/api/stylist', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          wardrobe: items.map((i) => ({ name: i.name, category: i.category, color_hex: i.color_hex, color_name: i.color_name, tags: i.tags })),
          weather: { temperature: 31, feels_like: 36, description: 'Humid and sunny', condition: 'hot', city: 'Singapore', humidity: 84 },
        }),
      });
      const data = await res.json() as AISuggestion & { error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? 'AI error');
      setMessages((p) => [...p, { id: uid(), role: 'assistant', content: data.message ?? 'Here is my suggestion:', suggestion: data }]);
    } catch (err) {
      setMessages((p) => [...p, { id: uid(), role: 'assistant', content: err instanceof Error ? err.message : 'Something went wrong.', error: true }]);
    } finally { setLoading(false); }
  }

  // ── Eco helpers ──
  async function generateEco() {
    if (items.length === 0) { setEcoError('Add clothes to your wardrobe first.'); return; }
    setEcoLoading(true); setEcoError(''); setEcoResult(null);
    try {
      const res = await fetch('/api/sustainable', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({ name: i.name, category: i.category, color_name: i.color_name, tags: i.tags })),
          occasion: ecoOccasion,
          event: ecoEvent || undefined,
        }),
      });
      const data = await res.json() as EcoResult & { error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? 'AI error');
      setEcoResult(data); setExpandedOutfit(0);
    } catch (e) { setEcoError(String(e)); } finally { setEcoLoading(false); }
  }

  const totalCarbonSaved = ecoResult?.outfits?.reduce((s, o) => s + (o.carbon_saved_kg ?? 0), 0) ?? 0;

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>

      {/* ── Rich animated gradient background ─────────────────── */}
      <style>{`
        @keyframes stOrb1 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(10vw,8vh) scale(1.18)} 66%{transform:translate(-6vw,14vh) scale(0.88)} }
        @keyframes stOrb2 { 0%,100%{transform:translate(0,0) scale(1)} 40%{transform:translate(-12vw,-10vh) scale(1.22)} 70%{transform:translate(8vw,6vh) scale(0.85)} }
        @keyframes stOrb3 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(8vw,-16vh) scale(1.25)} }
        @keyframes stOrb4 { 0%,100%{transform:translate(0,0) scale(1)} 45%{transform:translate(-8vw,12vh) scale(1.15)} }
        @keyframes stShimmer { 0%{opacity:0.4} 50%{opacity:0.7} 100%{opacity:0.4} }
      `}</style>

      <div aria-hidden="true" style={{
        position: 'fixed', inset: 0, zIndex: 0,
        background: 'linear-gradient(170deg, #0d1a09 0%, #1a2e12 25%, #0f1d0b 50%, #162611 75%, #0a1508 100%)',
      }}>
        {/* Orb 1 — large top-left emerald */}
        <div style={{
          position: 'absolute', top: '-10%', left: '-20%',
          width: '80vw', height: '80vw', borderRadius: '50%',
          background: 'radial-gradient(circle at 40% 40%, rgba(90,146,64,0.55) 0%, rgba(44,74,30,0.25) 40%, transparent 70%)',
          animation: 'stOrb1 16s ease-in-out infinite', filter: 'blur(2px)',
        }} />
        {/* Orb 2 — right lime */}
        <div style={{
          position: 'absolute', top: '20%', right: '-25%',
          width: '70vw', height: '70vw', borderRadius: '50%',
          background: 'radial-gradient(circle at 60% 50%, rgba(122,182,72,0.35) 0%, rgba(61,107,40,0.15) 45%, transparent 70%)',
          animation: 'stOrb2 20s ease-in-out infinite', filter: 'blur(3px)',
        }} />
        {/* Orb 3 — bottom center deep green */}
        <div style={{
          position: 'absolute', bottom: '-15%', left: '10%',
          width: '60vw', height: '60vw', borderRadius: '50%',
          background: 'radial-gradient(circle at 50% 60%, rgba(44,74,30,0.45) 0%, rgba(26,58,18,0.20) 50%, transparent 75%)',
          animation: 'stOrb3 24s ease-in-out infinite', filter: 'blur(2px)',
        }} />
        {/* Orb 4 — accent highlight */}
        <div style={{
          position: 'absolute', top: '55%', left: '30%',
          width: '40vw', height: '40vw', borderRadius: '50%',
          background: 'radial-gradient(circle at center, rgba(168,208,96,0.18) 0%, transparent 65%)',
          animation: 'stOrb4 18s ease-in-out infinite', filter: 'blur(1px)',
        }} />
        {/* Noise grain */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
          backgroundSize: '180px', opacity: 0.04,
        }} />
        {/* Top vignette */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '30%',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, transparent 100%)',
        }} />
      </div>

    <div className="max-w-2xl mx-auto px-4" style={{ position: 'relative', zIndex: 1, paddingTop: 28, paddingBottom: 24 }}>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(168,208,96,0.7)', marginBottom: 8 }}>
          AI Outfit Advice · Events · Mindful Fashion
        </p>
        <h1 style={{
          fontFamily: 'var(--font-display), Georgia, serif',
          fontSize: 'clamp(2.4rem, 9vw, 3.6rem)',
          fontWeight: 600, fontStyle: 'italic',
          letterSpacing: '-0.025em', lineHeight: 0.95,
          color: '#ffffff', margin: 0,
        }}>
          Your{' '}
          <span style={{
            background: 'linear-gradient(135deg, #A8D060 0%, #7AB648 50%, #5A9240 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>Stylist</span>
        </h1>
      </div>

      {/* Full-width tabs */}
      <div style={{
        display: 'flex', gap: 4, padding: 4, borderRadius: 18, marginBottom: 20,
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.10)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      }}>
        <button onClick={() => setTab('stylist')}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all"
          style={tab === 'stylist'
            ? { background: 'linear-gradient(135deg, #5A9240, #2C4A1E)', color: '#fff', boxShadow: '0 2px 12px rgba(90,146,64,0.40)' }
            : { color: 'rgba(255,255,255,0.45)' }}>
          <Sparkles size={12}/> Stylist
        </button>
        <button onClick={() => setTab('eco')}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all"
          style={tab === 'eco'
            ? { background: 'linear-gradient(135deg, #5A9240, #2C4A1E)', color: '#fff', boxShadow: '0 2px 12px rgba(90,146,64,0.40)' }
            : { color: 'rgba(255,255,255,0.45)' }}>
          <Leaf size={12}/> Eco Mode
        </button>
      </div>

      {/* ══════ STYLIST TAB ══════ */}
      {tab === 'stylist' && (
        <>
          <p className="text-xs mb-4" style={{ color:'rgba(255,255,255,0.40)', letterSpacing: '0.02em' }}>
            Pick day + occasion → get outfit + shop the look on Shein, Shopee &amp; Zalora
          </p>

          {/* Planning Panel — glass card */}
          <div className="rounded-3xl overflow-hidden mb-5" style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            backdropFilter: 'blur(24px) saturate(160%)',
            WebkitBackdropFilter: 'blur(24px) saturate(160%)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.10)',
          }}>
            {/* Day Picker */}
            <div style={{ padding: '16px 16px 12px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:12 }}>
                <CalendarDays size={11} style={{ color:'#A8D060' }}/>
                <p style={{ fontSize:'0.6rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(168,208,96,0.8)', margin:0 }}>Which day?</p>
              </div>
              <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth:'none' }}>
                {DAYS.map((d, i) => (
                  <button key={d} onClick={() => setSelectedDay(i)}
                    className="shrink-0 flex flex-col items-center px-3.5 py-2 rounded-2xl text-xs font-bold transition-all"
                    style={{
                      background: selectedDay === i
                        ? 'linear-gradient(135deg, #5A9240, #2C4A1E)'
                        : 'rgba(255,255,255,0.07)',
                      color: selectedDay === i ? '#fff' : 'rgba(255,255,255,0.55)',
                      border: selectedDay === i ? '1px solid rgba(90,146,64,0.5)' : '1px solid rgba(255,255,255,0.08)',
                      boxShadow: selectedDay === i ? '0 2px 12px rgba(90,146,64,0.35)' : 'none',
                      minWidth: 44,
                    }}>
                    {d}
                    {i === todayIdx && <span style={{ width:4, height:4, borderRadius:'50%', marginTop:3, display:'block', background: selectedDay === i ? 'rgba(255,255,255,0.7)' : '#A8D060' }}/>}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ borderTop:'1px solid rgba(255,255,255,0.07)' }}/>

            {/* Occasion Grid */}
            <div style={{ padding: '12px 16px' }}>
              <p style={{ fontSize:'0.6rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(168,208,96,0.8)', marginBottom:12 }}>Occasion</p>
              <div className="grid grid-cols-5 gap-2">
                {OCCASIONS.map((o) => {
                  const active = selectedOccasion === o.label;
                  return (
                    <button key={o.label} onClick={() => { setSelectedOccasion(active ? null : o.label); setSelectedEvent(null); }}
                      className="flex flex-col items-center gap-1.5 py-2.5 rounded-2xl transition-all"
                      style={{
                        background: active ? 'rgba(90,146,64,0.25)' : 'rgba(255,255,255,0.05)',
                        border: active ? '1px solid rgba(90,146,64,0.55)' : '1px solid rgba(255,255,255,0.07)',
                        boxShadow: active ? '0 0 16px rgba(90,146,64,0.20)' : 'none',
                      }}>
                      <OccasionIcon label={o.label} size={22} color={active ? '#A8D060' : 'rgba(255,255,255,0.40)'}/>
                      <span style={{ fontSize:9, fontWeight:active ? 700 : 500, color: active ? '#A8D060' : 'rgba(255,255,255,0.40)', textAlign:'center', lineHeight:1.2, maxWidth:52 }}>{o.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SG Events */}
            {sgEvents.filter((e) => e.daysAway <= 60).length > 0 && (
              <>
                <div style={{ borderTop:'1px solid rgba(255,255,255,0.07)' }}/>
                <div style={{ padding:'12px 16px' }}>
                  <p style={{ fontSize:'0.6rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(168,208,96,0.8)', marginBottom:10 }}>
                    Festivals &amp; Events
                  </p>
                  <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth:'none' }}>
                    {sgEvents.filter((e) => e.daysAway <= 60).map((ev) => {
                      const active = selectedEvent === ev.name;
                      return (
                        <button key={ev.name} onClick={() => { setSelectedEvent(active ? null : ev.name); setSelectedOccasion(null); }}
                          className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-2xl transition-all"
                          style={{
                            background: active ? 'rgba(90,146,64,0.30)' : 'rgba(255,255,255,0.06)',
                            border: active ? '1px solid rgba(90,146,64,0.55)' : '1px solid rgba(255,255,255,0.08)',
                          }}>
                          <EventIcon name={ev.name} size={20} color={active ? '#A8D060' : 'rgba(255,255,255,0.50)'}/>
                          <div className="text-left">
                            <p style={{ fontSize:11, fontWeight:600, color: active ? '#A8D060' : 'rgba(255,255,255,0.75)', lineHeight:1.2, whiteSpace:'nowrap' }}>{ev.name}</p>
                            <p style={{ fontSize:10, color:'rgba(255,255,255,0.35)' }}>{ev.daysAway === 0 ? 'Today' : ev.daysAway === 1 ? 'Tomorrow' : `in ${ev.daysAway}d`}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {selectedEvent && (() => {
                    const ev = sgEvents.find((e) => e.name === selectedEvent);
                    return ev ? (
                      <div style={{ marginTop:10, padding:'10px 12px', borderRadius:14, background:'rgba(90,146,64,0.15)', border:'1px solid rgba(90,146,64,0.30)', fontSize:12, color:'#A8D060', lineHeight:1.5 }}>
                        <strong>Dress code:</strong> {ev.dress_code} · {ev.outfit_tip}
                        <div className="flex gap-1.5 mt-1.5 flex-wrap">{ev.colors.map((c,i) => (
                          <div key={i} className="cbm-swatch" data-cn={c} title={c} style={{ width:16, height:16, borderRadius:'50%', background:c, border:'1.5px solid rgba(255,255,255,0.25)', flexShrink:0 }}/>
                        ))}</div>
                      </div>
                    ) : null;
                  })()}
                </div>
              </>
            )}

            {/* CTA bar */}
            <div style={{ padding:'12px 16px', borderTop:'1px solid rgba(255,255,255,0.07)', background:'rgba(0,0,0,0.15)' }}>
              <button onClick={() => ask()} disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-all disabled:opacity-40"
                style={{ background:'linear-gradient(135deg, #5A9240, #2C4A1E)', color:'#fff', boxShadow:'0 4px 16px rgba(90,146,64,0.40)' }}>
                {loading ? <Loader size={14} className="animate-spin"/> : <Sparkles size={14}/>}
                Get Outfit
              </button>
            </div>
          </div>

          {/* Chat messages */}
          {messages.length > 0 && (
            <div className="flex flex-col gap-4 mb-5">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div style={{ width:34, height:34, borderRadius:'50%', flexShrink:0, marginTop:2, display:'flex', alignItems:'center', justifyContent:'center',
                    background: msg.role === 'assistant' ? 'rgba(90,146,64,0.25)' : 'rgba(255,255,255,0.10)',
                    border: msg.role === 'assistant' ? '1px solid rgba(90,146,64,0.40)' : '1px solid rgba(255,255,255,0.15)',
                  }}>
                    {msg.role === 'assistant' ? <Bot size={15} style={{ color:'#A8D060' }}/> : <User size={15} style={{ color:'rgba(255,255,255,0.7)' }}/>}
                  </div>
                  <div className={`flex flex-col gap-3 ${msg.role === 'user' ? 'items-end' : ''}`} style={{ maxWidth:'85%' }}>
                    <div style={{ padding:'10px 14px', borderRadius:18, fontSize:14, lineHeight:1.55,
                      ...(msg.role === 'user'
                        ? { background:'linear-gradient(135deg, #5A9240, #2C4A1E)', color:'#fff', borderBottomRightRadius:4, boxShadow:'0 4px 16px rgba(90,146,64,0.30)' }
                        : { background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', color: msg.error ? '#f87171' : 'rgba(255,255,255,0.88)', borderBottomLeftRadius:4, backdropFilter:'blur(12px)' }),
                    }}>
                      {msg.content}
                    </div>
                    {msg.suggestion?.outfit_items && msg.suggestion.outfit_items.length > 0 && (
                      <div className="w-full rounded-2xl overflow-hidden" style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', backdropFilter:'blur(20px)' }}>
                        {msg.suggestion.headline && (
                          <div style={{ padding:'12px 16px', background:'rgba(90,146,64,0.18)', borderBottom:'1px solid rgba(90,146,64,0.20)' }}>
                            <p style={{ fontWeight:700, fontSize:14, color:'#A8D060' }}>{msg.suggestion.headline}</p>
                            {msg.suggestion.occasion && (
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block capitalize" style={{ background:'rgba(168,208,96,0.15)', color:'#A8D060', border:'1px solid rgba(168,208,96,0.30)' }}>
                                {msg.suggestion.occasion}
                              </span>
                            )}
                          </div>
                        )}
                        {msg.suggestion.outfit_items.map((item, i) => (
                          <div key={i} className="px-4 py-3" style={{ borderBottom: i < msg.suggestion!.outfit_items!.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
                            <div className="flex items-center gap-3 mb-2">
                              <div className="cbm-swatch w-9 h-9 rounded-xl shrink-0" data-cn={item.color_name} style={{ background: item.color_hex, border:'1px solid rgba(255,255,255,0.15)' }}/>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold" style={{ color:'rgba(255,255,255,0.88)' }}>{item.piece}</p>
                                {item.note && <p className="text-xs" style={{ color:'rgba(255,255,255,0.45)' }}>{item.note}</p>}
                              </div>
                              <span className="text-xs px-2 py-0.5 rounded-lg font-mono shrink-0" style={{ background: item.color_hex, color: getContrast(item.color_hex), fontSize:10 }}>{item.color_name}</span>
                            </div>
                            <div className="pl-12"><ShopButtons query={`${item.piece} ${item.color_name} men`}/></div>
                          </div>
                        ))}
                        {msg.suggestion.style_tip && (
                          <div className="px-4 py-3" style={{ borderTop:'1px solid rgba(255,255,255,0.08)' }}>
                            <p className="text-xs leading-relaxed flex items-start gap-1.5" style={{ color:'#A8D060' }}>
                              <Lightbulb size={13} style={{ flexShrink:0, marginTop:1 }}/> {msg.suggestion.style_tip}
                            </p>
                          </div>
                        )}
                        {/* Add to Planner */}
                        {msg.suggestion.outfit_items && msg.suggestion.outfit_items.length > 0 && (
                          <div className="px-4 py-3" style={{ borderTop:'1px solid rgba(255,255,255,0.08)' }}>
                            {savedDates[msg.id] ? (
                              <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background:'rgba(90,146,64,0.15)', border:'1px solid rgba(90,146,64,0.30)' }}>
                                <Check size={13} style={{ color:'#A8D060', flexShrink:0 }} />
                                <span className="text-xs font-semibold" style={{ color:'#A8D060' }}>
                                  Saved to {new Date(savedDates[msg.id] + 'T00:00:00').toLocaleDateString('en-SG', { weekday:'short', month:'short', day:'numeric' })}
                                </span>
                              </div>
                            ) : (
                              <button
                                onClick={() => setPlannerMsg({ id: msg.id, suggestion: msg.suggestion! })}
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                                style={{ background:'rgba(90,146,64,0.15)', color:'#A8D060', border:'1px solid rgba(90,146,64,0.35)' }}
                              >
                                <CalendarPlus size={14} /> Add to Planner
                              </button>
                            )}
                          </div>
                        )}

                        {msg.suggestion.search_query && (
                          <div className="px-4 py-3 flex items-center gap-2 flex-wrap" style={{ borderTop:'1px solid rgba(255,255,255,0.08)', background:'rgba(0,0,0,0.15)' }}>
                            <span className="text-xs font-semibold flex items-center gap-1 mr-1" style={{ color:'rgba(255,255,255,0.40)' }}><ShoppingBag size={11}/> Shop Full Look:</span>
                            <a href={sheinUrl(msg.suggestion.search_query + ' men')} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold hover:opacity-80" style={{ background:'#000', color:'#fff' }}>Shein <ExternalLink size={9}/></a>
                            <a href={shopeeUrl(msg.suggestion.search_query + ' men Singapore')} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold hover:opacity-80" style={{ background:'#ee4d2d', color:'#fff' }}>Shopee <ExternalLink size={9}/></a>
                            <a href={zaloraUrl(msg.suggestion.search_query)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold hover:opacity-80" style={{ background:'linear-gradient(to bottom, var(--primary-mid), var(--primary))', color:'#fff' }}>Zalora <ExternalLink size={9}/></a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background:'rgba(90,146,64,0.20)', border:'1px solid rgba(90,146,64,0.35)' }}>
                    <Sparkles size={15} style={{ color:'#A8D060' }}/>
                  </div>
                  <div className="px-4 py-3 rounded-2xl flex items-center gap-1.5" style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', backdropFilter:'blur(12px)' }}>
                    {[0,1,2].map((i) => <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background:'#A8D060', animation:`bounce 1.2s ease ${i*0.2}s infinite` }}/>)}
                  </div>
                </div>
              )}
              <div ref={bottomRef}/>
            </div>
          )}

        </>
      )}

      {/* ══════ ECO MODE TAB ══════ */}
      {tab === 'eco' && (
        <div className="space-y-4">
          {/* Hero */}
          <div className="rounded-3xl p-5" style={{
            background: 'linear-gradient(135deg, rgba(44,74,30,0.70) 0%, rgba(26,46,18,0.60) 100%)',
            border: '1px solid rgba(90,146,64,0.35)',
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 4px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(168,208,96,0.15)',
          }}>
            <div className="flex items-center gap-2 mb-2">
              <div style={{ width:28, height:28, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(168,208,96,0.20)', border:'1px solid rgba(168,208,96,0.35)' }}>
                <Leaf size={14} style={{ color:'#A8D060' }}/>
              </div>
              <span style={{ fontSize:'0.6rem', fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'rgba(168,208,96,0.80)' }}>AI for Good</span>
            </div>
            <h2 style={{ fontFamily:'var(--font-display), Georgia, serif', fontStyle:'italic', fontWeight:600, fontSize:'1.5rem', color:'#ffffff', margin:'0 0 8px', letterSpacing:'-0.02em' }}>Mindful Wardrobe</h2>
            <p style={{ fontSize:13, color:'rgba(255,255,255,0.70)', lineHeight:1.55 }}>
              Gemma 4 helps you rediscover the 80% of your wardrobe you never wear — reducing fast-fashion waste, one outfit at a time.
            </p>
            <div style={{ marginTop:12, display:'flex', alignItems:'center', gap:6 }}>
              <Zap size={11} style={{ color:'rgba(168,208,96,0.60)' }}/>
              <span style={{ fontSize:10, color:'rgba(255,255,255,0.40)', letterSpacing:'0.03em' }}>Gemma 4 · Runs locally · Zero cloud · Fully private</span>
            </div>
          </div>

          {/* Impact stats */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {CARBON_STATS.map((s) => (
              <div key={s.label} className="rounded-2xl p-3 text-center" style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.10)',
                backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
              }}>
                <p style={{ fontSize:'1.25rem', fontWeight:800, color:'#A8D060', margin:0 }}>{s.value}</p>
                <p style={{ fontSize:10, color:'rgba(255,255,255,0.45)', marginTop:4, lineHeight:1.3 }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Wardrobe status */}
          <div className="rounded-2xl p-4" style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.10)',
            backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          }}>
            <div className="flex items-center justify-between">
              <div>
                <p style={{ fontWeight:600, fontSize:14, color:'rgba(255,255,255,0.88)' }}>Your Wardrobe</p>
                <p style={{ fontSize:11, marginTop:3, color:'rgba(255,255,255,0.45)' }}>
                  {items.length === 0 ? 'No items yet — add clothes in the Wardrobe tab' : `${items.length} item${items.length > 1 ? 's' : ''} ready to be restyled`}
                </p>
              </div>
              {items.length > 0 && (
                <div style={{ borderRadius:20, padding:'3px 10px', fontSize:11, fontWeight:700, background:'rgba(90,146,64,0.25)', color:'#A8D060', border:'1px solid rgba(90,146,64,0.40)' }}>
                  {items.length} items
                </div>
              )}
            </div>
            {items.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {items.slice(0, 8).map((item) => (
                  <span key={item.id} style={{ fontSize:11, padding:'2px 10px', borderRadius:20, border:`1px solid ${item.color_hex}55`, color:'rgba(255,255,255,0.70)', background:`${item.color_hex}20` }}>{item.name}</span>
                ))}
                {items.length > 8 && <span style={{ fontSize:11, padding:'2px 10px', borderRadius:20, background:'rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.40)' }}>+{items.length - 8} more</span>}
              </div>
            )}
          </div>

          {/* Occasion + Event selector */}
          <div className="rounded-3xl overflow-hidden" style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            backdropFilter: 'blur(24px) saturate(160%)',
            WebkitBackdropFilter: 'blur(24px) saturate(160%)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.10)',
          }}>
            <div style={{ padding:'16px 16px 12px' }}>
              <p style={{ fontSize:'0.6rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(168,208,96,0.80)', marginBottom:10 }}>Occasion</p>
              <div className="flex flex-wrap gap-2">
                {ECO_OCCASIONS.map((occ) => (
                  <button key={occ} onClick={() => setEcoOccasion(occ)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                    style={ecoOccasion === occ
                      ? { background:'rgba(90,146,64,0.30)', color:'#A8D060', border:'1px solid rgba(90,146,64,0.55)', boxShadow:'0 0 12px rgba(90,146,64,0.20)' }
                      : { background:'rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.50)', border:'1px solid rgba(255,255,255,0.08)' }}>
                    <OccasionIcon label={occ} size={13} color={ecoOccasion === occ ? '#A8D060' : 'rgba(255,255,255,0.40)'}/>{occ}
                  </button>
                ))}
              </div>
            </div>
            {upcomingEvents.length > 0 && (
              <>
                <div style={{ borderTop:'1px solid rgba(255,255,255,0.07)' }}/>
                <div style={{ padding:'12px 16px' }}>
                  <p style={{ fontSize:'0.6rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(168,208,96,0.80)', marginBottom:10 }}>
                    Upcoming Event <span style={{ fontWeight:400, textTransform:'none', letterSpacing:'normal', fontSize:10, color:'rgba(255,255,255,0.35)' }}>(optional)</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setEcoEvent('')}
                      className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                      style={ecoEvent === ''
                        ? { background:'rgba(90,146,64,0.30)', color:'#A8D060', border:'1px solid rgba(90,146,64,0.55)' }
                        : { background:'rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.50)', border:'1px solid rgba(255,255,255,0.08)' }}>None</button>
                    {upcomingEvents.map((ev) => (
                      <button key={ev.name} onClick={() => setEcoEvent(ev.name)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                        style={ecoEvent === ev.name
                          ? { background:'rgba(90,146,64,0.30)', color:'#A8D060', border:'1px solid rgba(90,146,64,0.55)' }
                          : { background:'rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.50)', border:'1px solid rgba(255,255,255,0.08)' }}>
                        <EventIcon name={ev.name} size={13} color={ecoEvent === ev.name ? '#A8D060' : 'rgba(255,255,255,0.45)'}/>{ev.name}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
            <div style={{ padding:'12px 16px', borderTop:'1px solid rgba(255,255,255,0.07)', background:'rgba(0,0,0,0.15)' }}>
              <button onClick={generateEco} disabled={ecoLoading || items.length === 0}
                className="w-full py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
                style={ecoLoading || items.length === 0
                  ? { background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.25)', cursor:'not-allowed', border:'1px solid rgba(255,255,255,0.08)' }
                  : { background:'linear-gradient(135deg, #5A9240, #2C4A1E)', color:'#fff', boxShadow:'0 4px 16px rgba(90,146,64,0.40)' }}>
                {ecoLoading ? <><RefreshCw size={15} className="animate-spin"/> Gemma 4 is styling your wardrobe…</> : <><Leaf size={15}/> Style from what I own</>}
              </button>
              {ecoError && <p style={{ fontSize:12, textAlign:'center', color:'#f87171', marginTop:8 }}>{ecoError}</p>}
            </div>
          </div>

          {/* Eco results */}
          {ecoResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl p-4" style={{ background:'rgba(90,146,64,0.20)', border:'1px solid rgba(90,146,64,0.40)', backdropFilter:'blur(12px)' }}>
                  <div className="flex items-center gap-1.5 mb-1"><Award size={15} style={{ color:'#A8D060' }}/><span style={{ fontSize:11, fontWeight:700, color:'#A8D060' }}>Wardrobe Score</span></div>
                  <p style={{ fontSize:'1.2rem', fontWeight:800, color:'#ffffff', margin:'4px 0 6px' }}>{ecoResult.wardrobe_score}</p>
                  <p style={{ fontSize:11, lineHeight:1.4, color:'rgba(168,208,96,0.80)' }}>{ecoResult.score_breakdown}</p>
                </div>
                <div className="rounded-2xl p-4" style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', backdropFilter:'blur(12px)' }}>
                  <p style={{ fontSize:11, fontWeight:700, color:'rgba(168,208,96,0.75)', marginBottom:6 }}>Weekly Challenge</p>
                  <p style={{ fontSize:12, fontWeight:500, lineHeight:1.45, color:'rgba(255,255,255,0.80)' }}>{ecoResult.weekly_challenge}</p>
                </div>
              </div>

              {totalCarbonSaved > 0 && (
                <div className="rounded-2xl px-4 py-3 flex items-center gap-3" style={{ background:'rgba(90,146,64,0.15)', border:'1px solid rgba(90,146,64,0.30)' }}>
                  <Leaf size={18} style={{ color:'#A8D060', flexShrink:0 }}/>
                  <div>
                    <p style={{ fontSize:13, fontWeight:700, color:'#A8D060' }}>~{totalCarbonSaved.toFixed(1)} kg CO₂ saved vs. buying new</p>
                    <p style={{ fontSize:11, color:'rgba(168,208,96,0.65)', marginTop:2 }}>{ecoResult.carbon_facts}</p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <p style={{ fontSize:13, fontWeight:700, color:'rgba(255,255,255,0.80)', letterSpacing:'0.01em' }}>Your Sustainable Outfits</p>
                {ecoResult.outfits?.map((outfit, i) => (
                  <div key={i} className="rounded-2xl overflow-hidden" style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.10)', backdropFilter:'blur(16px)' }}>
                    <button className="w-full flex items-center justify-between px-4 py-3 text-left"
                      style={{ background:'transparent' }}
                      onClick={() => setExpandedOutfit(expandedOutfit === i ? null : i)}>
                      <div className="flex items-center gap-2">
                        <div style={{ width:28, height:28, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, color:'#fff', background:'linear-gradient(135deg,#5A9240,#2C4A1E)', flexShrink:0 }}>{i+1}</div>
                        <span style={{ fontWeight:600, fontSize:13, color:'rgba(255,255,255,0.88)' }}>{outfit.outfit_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {outfit.carbon_saved_kg > 0 && <span style={{ fontSize:10, padding:'2px 8px', borderRadius:12, fontWeight:700, background:'rgba(90,146,64,0.25)', color:'#A8D060', border:'1px solid rgba(90,146,64,0.40)' }}>-{outfit.carbon_saved_kg}kg CO₂</span>}
                        {expandedOutfit === i ? <ChevronUp size={15} style={{ color:'rgba(255,255,255,0.45)' }}/> : <ChevronDown size={15} style={{ color:'rgba(255,255,255,0.45)' }}/>}
                      </div>
                    </button>
                    {expandedOutfit === i && (
                      <div className="px-4 pb-4 space-y-3" style={{ borderTop:'1px solid rgba(255,255,255,0.07)' }}>
                        <div className="flex flex-wrap gap-1.5 pt-3">
                          {outfit.items.map((item) => <span key={item} style={{ fontSize:11, padding:'3px 10px', borderRadius:14, fontWeight:500, background:'rgba(255,255,255,0.10)', color:'rgba(255,255,255,0.75)', border:'1px solid rgba(255,255,255,0.12)' }}>{item}</span>)}
                        </div>
                        <p style={{ fontSize:13, color:'rgba(255,255,255,0.60)', lineHeight:1.5 }}>{outfit.styling_note}</p>
                        <div style={{ borderRadius:14, padding:'10px 12px', display:'flex', alignItems:'flex-start', gap:8, background:'rgba(90,146,64,0.15)', border:'1px solid rgba(90,146,64,0.25)' }}>
                          <Leaf size={13} style={{ color:'#A8D060', marginTop:2, flexShrink:0 }}/>
                          <p style={{ fontSize:12, lineHeight:1.5, color:'rgba(168,208,96,0.85)' }}>{outfit.eco_tip}</p>
                        </div>
                        <div>
                          <p style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.40)', marginBottom:8 }}>Missing an item? Shop second-hand first:</p>
                          <div className="flex gap-2 flex-wrap">
                            <a href={`https://www.carousell.sg/search/${encodeURIComponent(outfit.items[0] ?? 'clothing')}/`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-xl font-semibold" style={{ background:'rgba(90,146,64,0.20)', color:'#A8D060', border:'1px solid rgba(90,146,64,0.35)' }}><ExternalLink size={11}/>Carousell SG</a>
                            <a href="https://www.refash.sg" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-xl font-semibold" style={{ background:'rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.65)', border:'1px solid rgba(255,255,255,0.12)' }}><ExternalLink size={11}/>Refash</a>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Second-hand links */}
          <div className="rounded-3xl overflow-hidden" style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.10)',
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          }}>
            <div style={{ padding:'16px 16px 12px' }}>
              <div className="flex items-center gap-2 mb-1">
                <ShoppingBag size={14} style={{ color:'#A8D060' }}/>
                <p style={{ fontSize:'0.6rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(168,208,96,0.80)', margin:0 }}>Buy Second-Hand First</p>
              </div>
              <p style={{ fontSize:12, color:'rgba(255,255,255,0.40)', lineHeight:1.5, marginTop:6 }}>Before buying new, check these Singapore platforms. Second-hand fashion saves up to 70% carbon vs. new production.</p>
            </div>
            <div style={{ padding:'0 12px 14px', display:'flex', flexDirection:'column', gap:8 }}>
              {SECONDHAND_LINKS.map((link) => (
                <a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-2xl transition-all hover:opacity-80"
                  style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.10)' }}>
                  <div>
                    <p style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.88)' }}>{link.name}</p>
                    <p style={{ fontSize:11, marginTop:2, color:'rgba(255,255,255,0.40)' }}>{link.desc}</p>
                  </div>
                  <ExternalLink size={13} style={{ color:'rgba(168,208,96,0.70)', flexShrink:0 }}/>
                </a>
              ))}
            </div>
          </div>

          {/* Gemma 4 badge */}
          <div className="rounded-2xl p-4" style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
            <p style={{ fontSize:11, fontWeight:700, color:'rgba(168,208,96,0.70)', marginBottom:6 }}>Powered by Gemma 4 (Local AI)</p>
            <p style={{ fontSize:12, lineHeight:1.55, color:'rgba(255,255,255,0.40)' }}>
              All outfit suggestions run on <strong style={{ color:'rgba(255,255,255,0.60)' }}>Gemma 4</strong> via Ollama — directly on your device. No data sent to the cloud. No subscription. Accessible to anyone with a laptop.
            </p>
          </div>
        </div>
      )}

      <style>{`@keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}`}</style>

      {/* Add to Planner modal */}
      {plannerMsg && (
        <PlannerModal
          suggestion={plannerMsg.suggestion}
          onClose={() => setPlannerMsg(null)}
          onSaved={(date) => {
            const s = plannerMsg.suggestion;
            const planned: PlannedOutfit = {
              id: uid(),
              date,
              title: s.headline ?? s.occasion ?? 'AI Outfit',
              items: (s.outfit_items ?? []).map((i) => ({ piece: i.piece, color_name: i.color_name, color_hex: i.color_hex, note: i.note })),
              occasion: s.occasion,
              source: 'stylist',
              created_at: new Date().toISOString(),
            };
            addPlannedOutfit(planned);
            setSavedDates((prev) => ({ ...prev, [plannerMsg.id]: date }));
          }}
        />
      )}
    </div>
    </div>
  );
}
