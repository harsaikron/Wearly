'use client';

import { useState, useRef, useEffect } from 'react';
import { useWardrobeStore } from '@/store/wardrobe';
import { PlannedOutfit } from '@/types';
import {
  Sparkles, Bot, User, ShoppingBag,
  ExternalLink, Loader, Lightbulb, Leaf, Zap, Award,
  RefreshCw, ChevronDown, ChevronUp, CalendarPlus, Check, X,
  Paperclip, Send, Camera,
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

  const [tab, setTab] = useState<Tab>('stylist');

  // ── Stylist state ──
  const [messages,         setMessages]         = useState<Message[]>([]);
  const [loading,          setLoading]          = useState(false);
  const [plannerMsg,       setPlannerMsg]       = useState<{ id: string; suggestion: AISuggestion } | null>(null);
  const [savedDates,       setSavedDates]       = useState<Record<string, string>>({});
  const [userMessage,      setUserMessage]      = useState('');
  const [chatPhoto,        setChatPhoto]        = useState<string | null>(null);
  const [showAttachMenu,   setShowAttachMenu]   = useState(false);
  const bottomRef    = useRef<HTMLDivElement>(null);
  const chatImgRef   = useRef<HTMLInputElement>(null);
  const cameraRef    = useRef<HTMLInputElement>(null);
  const chatTARef    = useRef<HTMLTextAreaElement>(null);

  // ── Eco state ──
  const [ecoOccasion,      setEcoOccasion]      = useState('Casual');
  const [ecoEvent,         setEcoEvent]         = useState('');
  const [ecoResult,        setEcoResult]        = useState<EcoResult | null>(null);
  const [ecoLoading,       setEcoLoading]       = useState(false);
  const [ecoError,         setEcoError]         = useState('');
  const [expandedOutfit,   setExpandedOutfit]   = useState<number | null>(0);

  const upcomingEvents = getUpcomingEvents(4);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function handlePhoto(file: File) {
    const { compressImage } = await import('@/lib/image-utils');
    setChatPhoto(await compressImage(file));
  }

  async function ask(overrideQuery?: string, photo?: string) {
    const query = overrideQuery?.trim() || 'What should I wear today in Singapore? Give me specific pieces with colours.';
    if (!query || loading) return;
    setMessages((p) => [...p, { id: uid(), role: 'user', content: query }]);
    setUserMessage('');
    setChatPhoto(null);
    if (chatTARef.current) chatTARef.current.style.height = 'auto';
    setLoading(true);
    try {
      const res = await fetch('/api/stylist', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          wardrobe: items.map((i) => ({ name: i.name, category: i.category, color_hex: i.color_hex, color_name: i.color_name, tags: i.tags })),
          weather: { temperature: 31, feels_like: 36, description: 'Humid and sunny', condition: 'hot', city: 'Singapore', humidity: 84 },
          ...(photo ? { photo_base64: photo.replace(/^data:[^;]+;base64,/, '') } : {}),
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
    <>
    <style>{`@keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}} @keyframes msgIn{from{opacity:0;transform:translateY(8px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}} @keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
    <div className="fixed inset-0 z-10 flex flex-col md:top-16" style={{ background: 'var(--background)' }}>

      {/* ── Header banner ── */}
      <div style={{ flexShrink: 0, background: 'linear-gradient(160deg,#2C4A1E 0%,#3A6028 55%,#4E7A35 100%)', padding: '20px 20px 28px' }}>
        <p style={{ fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(168,208,96,0.70)', marginBottom: 6 }}>AI Outfit Advice · Eco Fashion</p>
        <h1 style={{ fontFamily: 'var(--font-display),Georgia,serif', fontSize: 'clamp(1.8rem,7vw,2.6rem)', fontWeight: 600, fontStyle: 'italic', letterSpacing: '-0.025em', lineHeight: 0.95, color: '#fff', margin: 0 }}>
          Your{' '}<span style={{ background: 'linear-gradient(135deg,#A8D060 0%,#7AB648 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Stylist</span>
        </h1>
      </div>

      {/* ── Tab bar ── */}
      <div style={{ flexShrink: 0, padding: '0 16px', marginTop: -16, position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 16, background: 'var(--card)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-sm)', maxWidth: 640, margin: '0 auto' }}>
          <button onClick={() => setTab('stylist')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all"
            style={tab === 'stylist'
              ? { background: 'linear-gradient(135deg, #5A9240, #2C4A1E)', color: '#fff', boxShadow: '0 2px 12px rgba(90,146,64,0.40)' }
              : { color: 'var(--muted)' }}>
            <Sparkles size={12}/> Stylist
          </button>
          <button onClick={() => setTab('eco')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all"
            style={tab === 'eco'
              ? { background: 'linear-gradient(135deg, #5A9240, #2C4A1E)', color: '#fff', boxShadow: '0 2px 12px rgba(90,146,64,0.40)' }
              : { color: 'var(--muted)' }}>
            <Leaf size={12}/> Eco Mode
          </button>
        </div>
      </div>

      {/* ── Content area ── */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>

      {/* ══ STYLIST TAB — clean chat ══ */}
      {tab === 'stylist' && (
        <>
          {/* Messages scroll area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {messages.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: '32px 20px' }}>
                <div style={{ width: 72, height: 72, borderRadius: 24, background: 'linear-gradient(135deg,#5A9240,#2C4A1E)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 32px rgba(44,74,30,0.28)' }}>
                  <Sparkles size={32} color="#fff" />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--foreground)', marginBottom: 8 }}>Your AI Style Assistant</p>
                  <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, maxWidth: 260 }}>
                    Ask me anything about outfits — attach a photo for personalized advice.
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 320 }}>
                  {['What should I wear today?', 'Smart casual for Singapore heat?', 'Outfit for a date night?', 'What goes with navy blue?'].map((s) => (
                    <button key={s} onClick={() => ask(s)} style={{ padding: '11px 16px', borderRadius: 14, fontSize: 13, fontWeight: 500, border: '1.5px solid var(--card-border)', background: 'var(--card)', color: 'var(--foreground)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease' }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : messages.map((msg) => (
              <div key={msg.id} style={{ display: 'flex', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8, animation: 'msgIn 0.25s cubic-bezier(0.34,1.56,0.64,1)' }}>
                {msg.role === 'assistant' && (
                  <div style={{ width: 30, height: 30, borderRadius: 10, background: 'linear-gradient(135deg,#5A9240,#2C4A1E)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(44,74,30,0.22)' }}>
                    <Sparkles size={13} color="#fff" />
                  </div>
                )}
                <div style={{ maxWidth: '80%', display: 'flex', flexDirection: 'column', gap: 6, alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    padding: '11px 15px', lineHeight: 1.6, fontSize: 14,
                    borderRadius: msg.role === 'user' ? '18px 18px 5px 18px' : '5px 18px 18px 18px',
                    background: msg.role === 'user' ? 'linear-gradient(135deg,#5A9240,#2C4A1E)' : 'var(--card)',
                    color: msg.role === 'user' ? '#fff' : (msg.error ? '#f87171' : 'var(--foreground)'),
                    border: msg.role === 'assistant' ? '1px solid var(--card-border)' : 'none',
                    boxShadow: msg.role === 'user' ? '0 4px 14px rgba(44,74,30,0.28)' : '0 2px 8px rgba(0,0,0,0.06)',
                  }}>
                    {msg.content}
                  </div>
                  {msg.suggestion?.outfit_items && msg.suggestion.outfit_items.length > 0 && (
                    <div className="w-full rounded-2xl overflow-hidden" style={{ background:'var(--card)', border:'1px solid var(--card-border)' }}>
                      {msg.suggestion.headline && (
                        <div style={{ padding:'12px 16px', background:'rgba(90,146,64,0.08)', borderBottom:'1px solid var(--card-border)' }}>
                          <p style={{ fontWeight:700, fontSize:14, color:'var(--accent)' }}>{msg.suggestion.headline}</p>
                          {msg.suggestion.occasion && <span className="text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block capitalize" style={{ background:'rgba(168,208,96,0.15)', color:'#A8D060', border:'1px solid rgba(168,208,96,0.30)' }}>{msg.suggestion.occasion}</span>}
                        </div>
                      )}
                      {msg.suggestion.outfit_items.map((item, i) => (
                        <div key={i} className="px-4 py-3" style={{ borderBottom: i < msg.suggestion!.outfit_items!.length - 1 ? '1px solid var(--card-border)' : 'none' }}>
                          <div className="flex items-center gap-3 mb-2">
                            <div className="cbm-swatch w-9 h-9 rounded-xl shrink-0" data-cn={item.color_name} style={{ background: item.color_hex, border:'1px solid rgba(0,0,0,0.10)' }}/>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold" style={{ color:'var(--foreground)' }}>{item.piece}</p>
                              {item.note && <p className="text-xs" style={{ color:'var(--muted)' }}>{item.note}</p>}
                            </div>
                            <span className="text-xs px-2 py-0.5 rounded-lg font-mono shrink-0" style={{ background: item.color_hex, color: getContrast(item.color_hex), fontSize:10 }}>{item.color_name}</span>
                          </div>
                          <div className="pl-12"><ShopButtons query={`${item.piece} ${item.color_name}`}/></div>
                        </div>
                      ))}
                      {msg.suggestion.style_tip && (
                        <div className="px-4 py-3" style={{ borderTop:'1px solid var(--card-border)' }}>
                          <p className="text-xs leading-relaxed flex items-start gap-1.5" style={{ color:'var(--accent)' }}>
                            <Lightbulb size={13} style={{ flexShrink:0, marginTop:1 }}/> {msg.suggestion.style_tip}
                          </p>
                        </div>
                      )}
                      {msg.suggestion.outfit_items.length > 0 && (
                        <div className="px-4 py-3" style={{ borderTop:'1px solid var(--card-border)' }}>
                          {savedDates[msg.id] ? (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background:'rgba(90,146,64,0.15)', border:'1px solid rgba(90,146,64,0.30)' }}>
                              <Check size={13} style={{ color:'#A8D060', flexShrink:0 }} />
                              <span className="text-xs font-semibold" style={{ color:'#A8D060' }}>Saved to {new Date(savedDates[msg.id] + 'T00:00:00').toLocaleDateString('en-SG', { weekday:'short', month:'short', day:'numeric' })}</span>
                            </div>
                          ) : (
                            <button onClick={() => setPlannerMsg({ id: msg.id, suggestion: msg.suggestion! })}
                              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
                              style={{ background:'rgba(90,146,64,0.15)', color:'#A8D060', border:'1px solid rgba(90,146,64,0.35)' }}>
                              <CalendarPlus size={14} /> Add to Planner
                            </button>
                          )}
                        </div>
                      )}
                      {msg.suggestion.search_query && (
                        <div className="px-4 py-3 flex items-center gap-2 flex-wrap" style={{ borderTop:'1px solid var(--card-border)', background:'var(--muted-bg)' }}>
                          <span className="text-xs font-semibold flex items-center gap-1 mr-1" style={{ color:'var(--muted)' }}><ShoppingBag size={11}/> Shop:</span>
                          <a href={sheinUrl(msg.suggestion.search_query)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold hover:opacity-80" style={{ background:'#000', color:'#fff' }}>Shein <ExternalLink size={9}/></a>
                          <a href={shopeeUrl(msg.suggestion.search_query + ' Singapore')} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold hover:opacity-80" style={{ background:'#ee4d2d', color:'#fff' }}>Shopee <ExternalLink size={9}/></a>
                          <a href={zaloraUrl(msg.suggestion.search_query)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold hover:opacity-80" style={{ background:'linear-gradient(to bottom, var(--primary-mid), var(--primary))', color:'#fff' }}>Zalora <ExternalLink size={9}/></a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: 10, background: 'linear-gradient(135deg,#5A9240,#2C4A1E)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Sparkles size={13} color="#fff" />
                </div>
                <div style={{ padding: '14px 18px', borderRadius: '5px 18px 18px 18px', background: 'var(--card)', border: '1px solid var(--card-border)', display: 'flex', gap: 5 }}>
                  {[0,1,2].map((i) => <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--muted)', display: 'inline-block', animation: `bounce 1.2s ease ${i * 0.18}s infinite` }} />)}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* ── Input bar ── */}
          <div style={{ flexShrink: 0, background: 'var(--card)', borderTop: '1px solid var(--card-border)', padding: '10px 14px', position: 'relative' }}>

            {/* Attach action sheet — slides up above input */}
            {showAttachMenu && (
              <>
                {/* Backdrop */}
                <div style={{ position: 'fixed', inset: 0, zIndex: 48 }} onClick={() => setShowAttachMenu(false)} />
                <div style={{
                  position: 'absolute', bottom: '100%', left: 14, right: 14, marginBottom: 8, zIndex: 49,
                  background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: 18,
                  boxShadow: '0 -4px 32px rgba(0,0,0,0.14)', overflow: 'hidden',
                  animation: 'slideUp 0.22s cubic-bezier(0.34,1.56,0.64,1)',
                }}>
                  <button
                    onClick={() => { cameraRef.current?.click(); setShowAttachMenu(false); }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', border: 'none', background: 'transparent', cursor: 'pointer', borderBottom: '1px solid var(--card-border)', textAlign: 'left' }}
                  >
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#5A9240,#2C4A1E)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Camera size={19} color="#fff" />
                    </div>
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--foreground)', margin: 0, lineHeight: 1.3 }}>Camera</p>
                      <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0, marginTop: 2 }}>Take a photo now</p>
                    </div>
                  </button>
                  <button
                    onClick={() => { chatImgRef.current?.click(); setShowAttachMenu(false); }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--muted-bg)', border: '1.5px solid var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Paperclip size={19} style={{ color: 'var(--muted)' }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--foreground)', margin: 0, lineHeight: 1.3 }}>Photo Library</p>
                      <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0, marginTop: 2 }}>Choose from gallery</p>
                    </div>
                  </button>
                </div>
              </>
            )}

            {/* Hidden file inputs */}
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; e.target.value = ''; await handlePhoto(f); }} />
            <input ref={chatImgRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; e.target.value = ''; await handlePhoto(f); }} />

            {/* Photo preview */}
            {chatPhoto && (
              <div style={{ marginBottom: 8, display: 'flex' }}>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={chatPhoto} alt="attached" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 12, border: '2px solid var(--card-border)' }} />
                  <button onClick={() => setChatPhoto(null)} style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: 'var(--foreground)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <X size={10} color="#fff" />
                  </button>
                </div>
              </div>
            )}

            {/* Input row: single attach button + textarea + send */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
              {/* Single attach/media button */}
              <button
                onClick={() => setShowAttachMenu((v) => !v)}
                style={{
                  width: 42, height: 42, borderRadius: 14, flexShrink: 0, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: showAttachMenu ? 'rgba(90,146,64,0.12)' : 'var(--muted-bg)',
                  border: showAttachMenu ? '1.5px solid rgba(90,146,64,0.40)' : '1.5px solid var(--card-border)',
                  transition: 'all 0.2s ease',
                }}
              >
                <Paperclip size={17} style={{ color: showAttachMenu ? 'var(--accent)' : 'var(--muted)', transition: 'color 0.2s ease' }} />
              </button>

              {/* Textarea + send */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 8, background: '#fff', border: '1.5px solid var(--card-border)', borderRadius: 22, padding: '10px 10px 10px 14px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', minWidth: 0 }}>
                <textarea
                  ref={chatTARef}
                  value={userMessage}
                  onChange={(e) => { setUserMessage(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (userMessage.trim() || chatPhoto) { ask(userMessage, chatPhoto ?? undefined); setShowAttachMenu(false); } } }}
                  onFocus={() => setShowAttachMenu(false)}
                  placeholder="Ask your stylist…"
                  rows={1}
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 16, color: 'var(--foreground)', resize: 'none', overflow: 'hidden', lineHeight: 1.5, maxHeight: 120, fontFamily: 'inherit', minWidth: 0, WebkitAppearance: 'none' }}
                />
                <button
                  onClick={() => { if (userMessage.trim() || chatPhoto) { ask(userMessage, chatPhoto ?? undefined); setShowAttachMenu(false); } }}
                  disabled={!userMessage.trim() && !chatPhoto}
                  style={{ width: 34, height: 34, borderRadius: 11, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'all 0.18s ease',
                    background: (userMessage.trim() || chatPhoto) ? 'linear-gradient(135deg,#5A9240,#2C4A1E)' : 'var(--muted-bg)',
                    boxShadow: (userMessage.trim() || chatPhoto) ? '0 4px 14px rgba(44,74,30,0.28)' : 'none',
                  }}>
                  {loading ? <Loader size={13} style={{ color: 'var(--muted)', animation: 'spin 1s linear infinite' }} /> : <Send size={14} color={(userMessage.trim() || chatPhoto) ? '#fff' : 'var(--muted)'} />}
                </button>
              </div>
            </div>
          </div>
          {/* Nav clearance spacer — only on mobile */}
          <div className="md:hidden" style={{ flexShrink: 0, height: 'calc(env(safe-area-inset-bottom) + 84px)', background: 'var(--card)' }} />
        </>
      )}

      {/* ══ ECO TAB ══ */}
      {tab === 'eco' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: 'calc(env(safe-area-inset-bottom) + 84px)' }} className="space-y-4">
          {/* Hero */}
          <div className="rounded-3xl p-5" style={{
            background: 'linear-gradient(135deg, rgba(44,74,30,0.85), rgba(26,46,18,0.80))',
            border: '1px solid rgba(90,146,64,0.30)',
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
                background: 'var(--muted-bg)',
                border: '1px solid var(--card-border)',
              }}>
                <p style={{ fontSize:'1.25rem', fontWeight:800, color:'var(--accent)', margin:0 }}>{s.value}</p>
                <p style={{ fontSize:10, color:'var(--muted)', marginTop:4, lineHeight:1.3 }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Wardrobe status */}
          <div className="rounded-2xl p-4" style={{
            background: 'var(--card)',
            border: '1px solid var(--card-border)',
          }}>
            <div className="flex items-center justify-between">
              <div>
                <p style={{ fontWeight:600, fontSize:14, color:'var(--foreground)' }}>Your Wardrobe</p>
                <p style={{ fontSize:11, marginTop:3, color:'var(--muted)' }}>
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
                  <span key={item.id} style={{ fontSize:11, padding:'2px 10px', borderRadius:20, border:`1px solid ${item.color_hex}55`, color:'var(--foreground)', background:`${item.color_hex}20` }}>{item.name}</span>
                ))}
                {items.length > 8 && <span style={{ fontSize:11, padding:'2px 10px', borderRadius:20, background:'var(--muted-bg)', color:'var(--muted)' }}>+{items.length - 8} more</span>}
              </div>
            )}
          </div>

          {/* Occasion + Event selector */}
          <div className="rounded-3xl overflow-hidden" style={{
            background: 'var(--card)',
            border: '1px solid var(--card-border)',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ padding:'16px 16px 12px' }}>
              <p style={{ fontSize:'0.6rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--accent)', marginBottom:10 }}>Occasion</p>
              <div className="flex flex-wrap gap-2">
                {ECO_OCCASIONS.map((occ) => (
                  <button key={occ} onClick={() => setEcoOccasion(occ)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                    style={ecoOccasion === occ
                      ? { background:'rgba(90,146,64,0.10)', color:'var(--accent)', border:'1px solid rgba(90,146,64,0.40)' }
                      : { background:'var(--muted-bg)', color:'var(--muted)', border:'1px solid var(--card-border)' }}>
                    <OccasionIcon label={occ} size={13} color={ecoOccasion === occ ? 'var(--accent)' : 'var(--muted)'}/>{occ}
                  </button>
                ))}
              </div>
            </div>
            {upcomingEvents.length > 0 && (
              <>
                <div style={{ borderTop:'1px solid var(--card-border)' }}/>
                <div style={{ padding:'12px 16px' }}>
                  <p style={{ fontSize:'0.6rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--accent)', marginBottom:10 }}>
                    Upcoming Event <span style={{ fontWeight:400, textTransform:'none', letterSpacing:'normal', fontSize:10, color:'var(--muted)' }}>(optional)</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setEcoEvent('')}
                      className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                      style={ecoEvent === ''
                        ? { background:'rgba(90,146,64,0.10)', color:'var(--accent)', border:'1px solid rgba(90,146,64,0.40)' }
                        : { background:'var(--muted-bg)', color:'var(--muted)', border:'1px solid var(--card-border)' }}>None</button>
                    {upcomingEvents.map((ev) => (
                      <button key={ev.name} onClick={() => setEcoEvent(ev.name)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                        style={ecoEvent === ev.name
                          ? { background:'rgba(90,146,64,0.10)', color:'var(--accent)', border:'1px solid rgba(90,146,64,0.40)' }
                          : { background:'var(--muted-bg)', color:'var(--muted)', border:'1px solid var(--card-border)' }}>
                        <EventIcon name={ev.name} size={13} color={ecoEvent === ev.name ? 'var(--accent)' : 'var(--muted)'}/>{ev.name}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
            <div style={{ padding:'12px 16px', borderTop:'1px solid var(--card-border)', background:'var(--muted-bg)' }}>
              <button onClick={generateEco} disabled={ecoLoading || items.length === 0}
                className="w-full py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
                style={ecoLoading || items.length === 0
                  ? { background:'var(--muted-bg)', color:'var(--muted)', cursor:'not-allowed', border:'1px solid var(--card-border)' }
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
                <div className="rounded-2xl p-4" style={{ background:'rgba(90,146,64,0.10)', border:'1px solid rgba(90,146,64,0.30)' }}>
                  <div className="flex items-center gap-1.5 mb-1"><Award size={15} style={{ color:'var(--accent)' }}/><span style={{ fontSize:11, fontWeight:700, color:'var(--accent)' }}>Wardrobe Score</span></div>
                  <p style={{ fontSize:'1.2rem', fontWeight:800, color:'var(--foreground)', margin:'4px 0 6px' }}>{ecoResult.wardrobe_score}</p>
                  <p style={{ fontSize:11, lineHeight:1.4, color:'var(--accent)' }}>{ecoResult.score_breakdown}</p>
                </div>
                <div className="rounded-2xl p-4" style={{ background:'var(--card)', border:'1px solid var(--card-border)' }}>
                  <p style={{ fontSize:11, fontWeight:700, color:'var(--accent)', marginBottom:6 }}>Weekly Challenge</p>
                  <p style={{ fontSize:12, fontWeight:500, lineHeight:1.45, color:'var(--foreground)' }}>{ecoResult.weekly_challenge}</p>
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
                <p style={{ fontSize:13, fontWeight:700, color:'var(--foreground)', letterSpacing:'0.01em' }}>Your Sustainable Outfits</p>
                {ecoResult.outfits?.map((outfit, i) => (
                  <div key={i} className="rounded-2xl overflow-hidden" style={{ background:'var(--card)', border:'1px solid var(--card-border)' }}>
                    <button className="w-full flex items-center justify-between px-4 py-3 text-left"
                      style={{ background:'transparent' }}
                      onClick={() => setExpandedOutfit(expandedOutfit === i ? null : i)}>
                      <div className="flex items-center gap-2">
                        <div style={{ width:28, height:28, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, color:'#fff', background:'linear-gradient(135deg,#5A9240,#2C4A1E)', flexShrink:0 }}>{i+1}</div>
                        <span style={{ fontWeight:600, fontSize:13, color:'var(--foreground)' }}>{outfit.outfit_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {outfit.carbon_saved_kg > 0 && <span style={{ fontSize:10, padding:'2px 8px', borderRadius:12, fontWeight:700, background:'rgba(90,146,64,0.10)', color:'var(--accent)', border:'1px solid rgba(90,146,64,0.30)' }}>-{outfit.carbon_saved_kg}kg CO₂</span>}
                        {expandedOutfit === i ? <ChevronUp size={15} style={{ color:'var(--muted)' }}/> : <ChevronDown size={15} style={{ color:'var(--muted)' }}/>}
                      </div>
                    </button>
                    {expandedOutfit === i && (
                      <div className="px-4 pb-4 space-y-3" style={{ borderTop:'1px solid var(--card-border)' }}>
                        <div className="flex flex-wrap gap-1.5 pt-3">
                          {outfit.items.map((item) => <span key={item} style={{ fontSize:11, padding:'3px 10px', borderRadius:14, fontWeight:500, background:'var(--muted-bg)', color:'var(--foreground)', border:'1px solid var(--card-border)' }}>{item}</span>)}
                        </div>
                        <p style={{ fontSize:13, color:'var(--muted)', lineHeight:1.5 }}>{outfit.styling_note}</p>
                        <div style={{ borderRadius:14, padding:'10px 12px', display:'flex', alignItems:'flex-start', gap:8, background:'rgba(90,146,64,0.08)', border:'1px solid rgba(90,146,64,0.20)' }}>
                          <Leaf size={13} style={{ color:'var(--accent)', marginTop:2, flexShrink:0 }}/>
                          <p style={{ fontSize:12, lineHeight:1.5, color:'var(--accent)' }}>{outfit.eco_tip}</p>
                        </div>
                        <div>
                          <p style={{ fontSize:11, fontWeight:600, color:'var(--muted)', marginBottom:8 }}>Missing an item? Shop second-hand first:</p>
                          <div className="flex gap-2 flex-wrap">
                            <a href={`https://www.carousell.sg/search/${encodeURIComponent(outfit.items[0] ?? 'clothing')}/`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-xl font-semibold" style={{ background:'rgba(90,146,64,0.10)', color:'var(--accent)', border:'1px solid rgba(90,146,64,0.30)' }}><ExternalLink size={11}/>Carousell SG</a>
                            <a href="https://www.refash.sg" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-xl font-semibold" style={{ background:'var(--muted-bg)', color:'var(--foreground)', border:'1px solid var(--card-border)' }}><ExternalLink size={11}/>Refash</a>
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
            background: 'var(--card)',
            border: '1px solid var(--card-border)',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ padding:'16px 16px 12px' }}>
              <div className="flex items-center gap-2 mb-1">
                <ShoppingBag size={14} style={{ color:'var(--accent)' }}/>
                <p style={{ fontSize:'0.6rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--accent)', margin:0 }}>Buy Second-Hand First</p>
              </div>
              <p style={{ fontSize:12, color:'var(--muted)', lineHeight:1.5, marginTop:6 }}>Before buying new, check these Singapore platforms. Second-hand fashion saves up to 70% carbon vs. new production.</p>
            </div>
            <div style={{ padding:'0 12px 14px', display:'flex', flexDirection:'column', gap:8 }}>
              {SECONDHAND_LINKS.map((link) => (
                <a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-2xl transition-all hover:opacity-80"
                  style={{ background:'var(--muted-bg)', border:'1px solid var(--card-border)' }}>
                  <div>
                    <p style={{ fontSize:13, fontWeight:600, color:'var(--foreground)' }}>{link.name}</p>
                    <p style={{ fontSize:11, marginTop:2, color:'var(--muted)' }}>{link.desc}</p>
                  </div>
                  <ExternalLink size={13} style={{ color:'var(--accent)', flexShrink:0 }}/>
                </a>
              ))}
            </div>
          </div>

          {/* Gemma 4 badge */}
          <div className="rounded-2xl p-4" style={{ background:'var(--muted-bg)', border:'1px solid var(--card-border)' }}>
            <p style={{ fontSize:11, fontWeight:700, color:'var(--accent)', marginBottom:6 }}>Powered by Gemma 4 (Local AI)</p>
            <p style={{ fontSize:12, lineHeight:1.55, color:'var(--muted)' }}>
              All outfit suggestions run on <strong style={{ color:'var(--foreground)' }}>Gemma 4</strong> via Ollama — directly on your device. No data sent to the cloud. No subscription. Accessible to anyone with a laptop.
            </p>
          </div>
        </div>
      )}

      </div>{/* end content area */}
    </div>{/* end full-height container */}

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
    </>
  );
}
