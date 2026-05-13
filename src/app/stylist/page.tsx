'use client';

import { useState, useRef, useEffect } from 'react';
import { useWardrobeStore } from '@/store/wardrobe';
import {
  Send, Sparkles, Bot, User, CalendarDays, ShoppingBag,
  ExternalLink, Loader, Lightbulb, Star, Leaf, Zap, Award,
  RefreshCw, ChevronDown, ChevronUp,
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
      <a href={zaloraUrl(query)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold hover:opacity-80" style={{ background:'#9b27af', color:'#fff' }}><ShoppingBag size={9}/> Zalora</a>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
type Tab = 'stylist' | 'eco';

export default function StylistPage() {
  const { items } = useWardrobeStore();
  const todayIdx = (new Date().getDay() + 6) % 7;

  const [tab, setTab] = useState<Tab>('stylist');

  // ── Stylist state ──
  const [selectedDay,      setSelectedDay]      = useState(todayIdx);
  const [selectedOccasion, setSelectedOccasion] = useState<string | null>(null);
  const [selectedEvent,    setSelectedEvent]    = useState<string | null>(null);
  const [sgEvents,         setSgEvents]         = useState<SGEvent[]>([]);
  const [messages,         setMessages]         = useState<Message[]>([]);
  const [input,            setInput]            = useState('');
  const [loading,          setLoading]          = useState(false);
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
    const query = overrideQuery ?? (input.trim() ? input : buildQuery());
    if (!query || loading) return;
    setInput('');
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

  const previewQuery = selectedEvent
    ? `${selectedEvent} outfit for ${DAYS[selectedDay]}`
    : selectedOccasion
    ? `${selectedOccasion} — ${DAYS[selectedDay]} in Singapore`
    : `What to wear on ${DAYS[selectedDay]}?`;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">

      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-bold" style={{ color:'var(--foreground)' }}>Stylist</h1>
        <p className="text-xs mt-0.5" style={{ color:'var(--muted)' }}>AI outfit advice &amp; sustainable fashion from your wardrobe</p>
      </div>

      {/* Full-width tabs */}
      <div className="flex gap-1 p-1 rounded-xl mb-5" style={{ background:'var(--card)', border:'1px solid var(--card-border)' }}>
        <button onClick={() => setTab('stylist')}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all"
          style={tab === 'stylist' ? { background:'var(--accent)', color:'#fff' } : { color:'var(--muted)' }}>
          <Sparkles size={12}/> Stylist
        </button>
        <button onClick={() => setTab('eco')}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all"
          style={tab === 'eco' ? { background:'#2e7d32', color:'#fff' } : { color:'var(--muted)' }}>
          <Leaf size={12}/> Eco Mode
        </button>
      </div>

      {/* ══════ STYLIST TAB ══════ */}
      {tab === 'stylist' && (
        <>
          <p className="text-xs mb-5" style={{ color:'var(--muted)' }}>
            Pick day + occasion → get outfit + shop the look on Shein, Shopee &amp; Zalora
          </p>

          {/* Planning Panel */}
          <div className="rounded-2xl overflow-hidden mb-5" style={{ background:'var(--card)', border:'1px solid var(--card-border)', boxShadow:'var(--shadow-sm)' }}>
            {/* Day Picker */}
            <div className="px-4 pt-4 pb-3">
              <div className="flex items-center gap-1.5 mb-2.5">
                <CalendarDays size={12} style={{ color:'var(--accent)' }}/>
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color:'var(--muted)' }}>Which day?</p>
              </div>
              <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth:'none' }}>
                {DAYS.map((d, i) => (
                  <button key={d} onClick={() => setSelectedDay(i)}
                    className="shrink-0 flex flex-col items-center px-3.5 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-90"
                    style={{
                      background: selectedDay === i ? 'linear-gradient(135deg,#6366f1,#818cf8)' : 'var(--muted-bg)',
                      color: selectedDay === i ? '#fff' : 'var(--foreground)',
                      border: i === todayIdx && selectedDay !== i ? '1px dashed rgba(99,102,241,0.5)' : '1px solid transparent',
                      minWidth: 44,
                    }}>
                    {d}
                    {i === todayIdx && <span className="w-1 h-1 rounded-full mt-0.5" style={{ background: selectedDay === i ? 'rgba(255,255,255,0.7)' : 'var(--accent)' }}/>}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ borderTop:'1px solid var(--card-border)' }}/>

            {/* Occasion Grid */}
            <div className="px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide mb-2.5" style={{ color:'var(--muted)' }}>Occasion</p>
              <div className="grid grid-cols-5 gap-2">
                {OCCASIONS.map((o) => {
                  const active = selectedOccasion === o.label;
                  return (
                    <button key={o.label} onClick={() => { setSelectedOccasion(active ? null : o.label); setSelectedEvent(null); }}
                      className="flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all hover:opacity-80"
                      style={{ background: active ? 'var(--accent-muted)' : 'var(--muted-bg)', border:`1px solid ${active ? 'rgba(99,102,241,0.35)' : 'var(--card-border)'}` }}>
                      <OccasionIcon label={o.label} size={22} color={active ? 'var(--accent)' : 'var(--muted)'}/>
                      <span style={{ fontSize:9, fontWeight:600, color: active ? 'var(--accent)' : 'var(--muted)', textAlign:'center', lineHeight:1.2, maxWidth:52 }}>{o.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SG Events */}
            {sgEvents.filter((e) => e.daysAway <= 60).length > 0 && (
              <>
                <div style={{ borderTop:'1px solid var(--card-border)' }}/>
                <div className="px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide mb-2.5" style={{ color:'var(--muted)' }}>
                    <Star size={12} style={{ display:'inline', marginRight:4 }}/>Festivals &amp; Events
                  </p>
                  <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth:'none' }}>
                    {sgEvents.filter((e) => e.daysAway <= 60).map((ev) => {
                      const active = selectedEvent === ev.name;
                      return (
                        <button key={ev.name} onClick={() => { setSelectedEvent(active ? null : ev.name); setSelectedOccasion(null); }}
                          className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl transition-all hover:opacity-90"
                          style={{ background: active ? 'linear-gradient(135deg,#6366f1,#818cf8)' : 'var(--muted-bg)', border:`1px solid ${active ? 'transparent' : 'var(--card-border)'}` }}>
                          <EventIcon name={ev.name} size={20} color={active ? '#fff' : 'var(--foreground)'}/>
                          <div className="text-left">
                            <p className="text-xs font-semibold whitespace-nowrap" style={{ color: active ? '#fff' : 'var(--foreground)', lineHeight:1.2 }}>{ev.name}</p>
                            <p style={{ fontSize:10, color: active ? 'rgba(255,255,255,0.75)' : 'var(--muted)' }}>{ev.daysAway === 0 ? 'Today' : ev.daysAway === 1 ? 'Tomorrow' : `in ${ev.daysAway}d`}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {selectedEvent && (() => {
                    const ev = sgEvents.find((e) => e.name === selectedEvent);
                    return ev ? (
                      <div className="mt-2.5 px-3 py-2.5 rounded-xl text-xs leading-relaxed" style={{ background:'var(--accent-muted)', border:'1px solid rgba(99,102,241,0.2)', color:'var(--accent)' }}>
                        <strong>Dress code:</strong> {ev.dress_code} · {ev.outfit_tip}
                        <div className="flex gap-1.5 mt-1.5">{ev.colors.map((c,i) => <div key={i} className="w-4 h-4 rounded-full" style={{ background:c, border:'1px solid rgba(0,0,0,0.1)' }}/>)}</div>
                      </div>
                    ) : null;
                  })()}
                </div>
              </>
            )}

            {/* CTA bar */}
            <div className="px-4 py-3" style={{ borderTop:'1px solid var(--card-border)', background:'var(--muted-bg)' }}>
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0 px-3 py-2 rounded-xl text-xs truncate" style={{ background:'var(--card)', border:'1px solid var(--card-border)', color:'var(--muted)' }}>
                  {previewQuery}
                </div>
                <button onClick={() => ask()} disabled={loading}
                  className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm transition-all hover:opacity-90 disabled:opacity-40"
                  style={{ background:'linear-gradient(135deg,#6366f1,#818cf8)', color:'#fff', boxShadow:'0 2px 8px rgba(99,102,241,0.3)' }}>
                  {loading ? <Loader size={14} className="animate-spin"/> : <Sparkles size={14}/>}
                  Get Outfit
                </button>
              </div>
            </div>
          </div>

          {/* Chat messages */}
          {messages.length > 0 && (
            <div className="flex flex-col gap-5 mb-5">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: msg.role === 'assistant' ? 'var(--accent-muted)' : 'var(--muted-bg)' }}>
                    {msg.role === 'assistant' ? <Bot size={15} style={{ color:'var(--accent)' }}/> : <User size={15} style={{ color:'var(--muted)' }}/>}
                  </div>
                  <div className={`flex flex-col gap-3 ${msg.role === 'user' ? 'items-end' : ''}`} style={{ maxWidth:'85%' }}>
                    <div className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                      style={msg.role === 'user'
                        ? { background:'linear-gradient(135deg,#6366f1,#818cf8)', color:'#fff', borderBottomRightRadius:6 }
                        : { background:'var(--muted-bg)', border:'1px solid var(--card-border)', color: msg.error ? '#dc2626' : 'var(--foreground)', borderBottomLeftRadius:6 }}>
                      {msg.content}
                    </div>
                    {msg.suggestion?.outfit_items && msg.suggestion.outfit_items.length > 0 && (
                      <div className="w-full rounded-2xl overflow-hidden" style={{ background:'var(--card)', border:'1px solid var(--card-border)', boxShadow:'var(--shadow-sm)' }}>
                        {msg.suggestion.headline && (
                          <div className="px-4 py-3" style={{ background:'var(--accent-muted)', borderBottom:'1px solid rgba(99,102,241,0.15)' }}>
                            <p className="font-bold text-sm" style={{ color:'var(--accent)' }}>{msg.suggestion.headline}</p>
                            {msg.suggestion.occasion && (
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block capitalize" style={{ background:'rgba(99,102,241,0.12)', color:'var(--accent)', border:'1px solid rgba(99,102,241,0.2)' }}>
                                {msg.suggestion.occasion}
                              </span>
                            )}
                          </div>
                        )}
                        {msg.suggestion.outfit_items.map((item, i) => (
                          <div key={i} className="px-4 py-3" style={{ borderBottom: i < msg.suggestion!.outfit_items!.length - 1 ? '1px solid var(--card-border)' : 'none' }}>
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-9 h-9 rounded-xl shrink-0" style={{ background: item.color_hex, border:'1px solid rgba(0,0,0,0.08)' }}/>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold" style={{ color:'var(--foreground)' }}>{item.piece}</p>
                                {item.note && <p className="text-xs" style={{ color:'var(--muted)' }}>{item.note}</p>}
                              </div>
                              <span className="text-xs px-2 py-0.5 rounded-lg font-mono shrink-0" style={{ background: item.color_hex, color: getContrast(item.color_hex), fontSize:10 }}>{item.color_name}</span>
                            </div>
                            <div className="pl-12"><ShopButtons query={`${item.piece} ${item.color_name} men`}/></div>
                          </div>
                        ))}
                        {msg.suggestion.style_tip && (
                          <div className="px-4 py-3" style={{ background:'rgba(99,102,241,0.04)', borderTop:'1px solid var(--card-border)' }}>
                            <p className="text-xs leading-relaxed" style={{ color:'var(--accent)' }}>
                              <Lightbulb size={13} style={{ flexShrink:0 }}/> {msg.suggestion.style_tip}
                            </p>
                          </div>
                        )}
                        {msg.suggestion.search_query && (
                          <div className="px-4 py-3 flex items-center gap-2 flex-wrap" style={{ borderTop:'1px solid var(--card-border)', background:'var(--muted-bg)' }}>
                            <span className="text-xs font-semibold flex items-center gap-1 mr-1" style={{ color:'var(--muted)' }}><ShoppingBag size={11}/> Shop Full Look:</span>
                            <a href={sheinUrl(msg.suggestion.search_query + ' men')} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold hover:opacity-80" style={{ background:'#000', color:'#fff' }}>Shein <ExternalLink size={9}/></a>
                            <a href={shopeeUrl(msg.suggestion.search_query + ' men Singapore')} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold hover:opacity-80" style={{ background:'#ee4d2d', color:'#fff' }}>Shopee <ExternalLink size={9}/></a>
                            <a href={zaloraUrl(msg.suggestion.search_query)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold hover:opacity-80" style={{ background:'#9b27af', color:'#fff' }}>Zalora <ExternalLink size={9}/></a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background:'var(--accent-muted)' }}>
                    <Sparkles size={15} style={{ color:'var(--accent)' }}/>
                  </div>
                  <div className="px-4 py-3 rounded-2xl flex items-center gap-1.5" style={{ background:'var(--muted-bg)', border:'1px solid var(--card-border)' }}>
                    {[0,1,2].map((i) => <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background:'var(--accent)', animation:`bounce 1.2s ease ${i*0.2}s infinite` }}/>)}
                  </div>
                </div>
              )}
              <div ref={bottomRef}/>
            </div>
          )}

          {/* Free-text input */}
          <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background:'var(--card)', border:'1px solid var(--card-border)', boxShadow:'var(--shadow-sm)' }}>
            <Sparkles size={15} style={{ color:'var(--accent)' }}/>
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ask()}
              placeholder="Or type a specific question…" className="flex-1 bg-transparent outline-none text-sm" style={{ color:'var(--foreground)' }}/>
            <button onClick={() => ask()} disabled={!input.trim() || loading}
              className="w-8 h-8 rounded-xl flex items-center justify-center disabled:opacity-40 transition-all hover:opacity-90"
              style={{ background:'linear-gradient(135deg,#6366f1,#818cf8)' }}>
              <Send size={14} style={{ color:'#fff' }}/>
            </button>
          </div>
        </>
      )}

      {/* ══════ ECO MODE TAB ══════ */}
      {tab === 'eco' && (
        <div className="space-y-5">
          {/* Hero */}
          <div className="rounded-2xl p-5 text-white" style={{ background:'linear-gradient(135deg,#1b5e20 0%,#2e7d32 50%,#388e3c 100%)' }}>
            <div className="flex items-center gap-2 mb-1">
              <Leaf size={18}/><span className="text-sm font-semibold uppercase tracking-wider opacity-80">AI for Good</span>
            </div>
            <h2 className="text-xl font-bold mb-1">Mindful Wardrobe</h2>
            <p className="text-sm opacity-80 leading-relaxed">
              Gemma 4 helps you rediscover the 80% of your wardrobe you never wear — reducing fast-fashion waste, one outfit at a time.
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs opacity-70">
              <Zap size={12}/><span>Powered by Gemma 4 · Runs locally · Zero cloud cost · Fully private</span>
            </div>
          </div>

          {/* Impact stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {CARBON_STATS.map((s) => (
              <div key={s.label} className="rounded-xl p-3 text-center" style={{ background:'var(--card)', border:'1px solid var(--card-border)' }}>
                <p className="text-xl font-bold" style={{ color:'#2e7d32' }}>{s.value}</p>
                <p className="text-xs mt-0.5 leading-tight" style={{ color:'var(--muted)' }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Wardrobe status */}
          <div className="rounded-2xl p-4" style={{ background:'var(--card)', border:'1px solid var(--card-border)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">Your Wardrobe</p>
                <p className="text-xs mt-0.5" style={{ color:'var(--muted)' }}>
                  {items.length === 0 ? 'No items yet — add clothes in the Wardrobe tab' : `${items.length} item${items.length > 1 ? 's' : ''} ready to be restyled`}
                </p>
              </div>
              {items.length > 0 && <div className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background:'#e8f5e9', color:'#2e7d32' }}>{items.length} items</div>}
            </div>
            {items.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {items.slice(0, 8).map((item) => (
                  <span key={item.id} className="text-xs px-2 py-0.5 rounded-full border" style={{ borderColor: item.color_hex, color:'var(--foreground)', background:`${item.color_hex}15` }}>{item.name}</span>
                ))}
                {items.length > 8 && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background:'var(--card-border)', color:'var(--muted)' }}>+{items.length - 8} more</span>}
              </div>
            )}
          </div>

          {/* Occasion + Event selector */}
          <div className="rounded-2xl p-4 space-y-4" style={{ background:'var(--card)', border:'1px solid var(--card-border)' }}>
            <div>
              <p className="text-sm font-semibold mb-2">Occasion</p>
              <div className="flex flex-wrap gap-2">
                {ECO_OCCASIONS.map((occ) => (
                  <button key={occ} onClick={() => setEcoOccasion(occ)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                    style={ecoOccasion === occ ? { background:'#2e7d32', color:'#fff' } : { background:'var(--card-border)', color:'var(--muted)' }}>
                    <OccasionIcon label={occ} size={13} color={ecoOccasion === occ ? '#fff' : undefined}/>{occ}
                  </button>
                ))}
              </div>
            </div>
            {upcomingEvents.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2">Upcoming Event <span className="font-normal text-xs" style={{ color:'var(--muted)' }}>(optional)</span></p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setEcoEvent('')} className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                    style={ecoEvent === '' ? { background:'#2e7d32', color:'#fff' } : { background:'var(--card-border)', color:'var(--muted)' }}>None</button>
                  {upcomingEvents.map((ev) => (
                    <button key={ev.name} onClick={() => setEcoEvent(ev.name)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                      style={ecoEvent === ev.name ? { background:'#2e7d32', color:'#fff' } : { background:'var(--card-border)', color:'var(--muted)' }}>
                      <EventIcon name={ev.name} size={13} color={ecoEvent === ev.name ? '#fff' : undefined}/>{ev.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button onClick={generateEco} disabled={ecoLoading || items.length === 0}
              className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
              style={ecoLoading || items.length === 0 ? { background:'var(--card-border)', color:'var(--muted)', cursor:'not-allowed' } : { background:'#2e7d32', color:'#fff' }}>
              {ecoLoading ? <><RefreshCw size={15} className="animate-spin"/> Gemma 4 is styling your wardrobe…</> : <><Leaf size={15}/> Style from what I own</>}
            </button>
            {ecoError && <p className="text-xs text-center" style={{ color:'#c62828' }}>{ecoError}</p>}
          </div>

          {/* Eco results */}
          {ecoResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl p-4" style={{ background:'#e8f5e9', border:'1px solid #a5d6a7' }}>
                  <div className="flex items-center gap-1.5 mb-1"><Award size={16} color="#2e7d32"/><span className="text-xs font-semibold" style={{ color:'#2e7d32' }}>Wardrobe Score</span></div>
                  <p className="text-lg font-bold" style={{ color:'#1b5e20' }}>{ecoResult.wardrobe_score}</p>
                  <p className="text-xs mt-1 leading-snug" style={{ color:'#2e7d32' }}>{ecoResult.score_breakdown}</p>
                </div>
                <div className="rounded-2xl p-4" style={{ background:'#e3f2fd', border:'1px solid #90caf9' }}>
                  <p className="text-xs font-semibold mb-1" style={{ color:'#1565c0' }}>Weekly Challenge</p>
                  <p className="text-sm font-medium leading-snug" style={{ color:'#0d47a1' }}>{ecoResult.weekly_challenge}</p>
                </div>
              </div>

              {totalCarbonSaved > 0 && (
                <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background:'#f1f8e9', border:'1px solid #c5e1a5' }}>
                  <Leaf size={18} color="#558b2f"/>
                  <div>
                    <p className="text-sm font-semibold" style={{ color:'#33691e' }}>~{totalCarbonSaved.toFixed(1)} kg CO₂ saved vs. buying new</p>
                    <p className="text-xs" style={{ color:'#558b2f' }}>{ecoResult.carbon_facts}</p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <p className="text-sm font-semibold">Your Sustainable Outfits</p>
                {ecoResult.outfits?.map((outfit, i) => (
                  <div key={i} className="rounded-2xl overflow-hidden" style={{ border:'1px solid var(--card-border)' }}>
                    <button className="w-full flex items-center justify-between px-4 py-3 text-left" style={{ background:'var(--card)' }}
                      onClick={() => setExpandedOutfit(expandedOutfit === i ? null : i)}>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background:'#2e7d32' }}>{i+1}</div>
                        <span className="font-semibold text-sm">{outfit.outfit_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {outfit.carbon_saved_kg > 0 && <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background:'#e8f5e9', color:'#2e7d32' }}>-{outfit.carbon_saved_kg}kg CO₂</span>}
                        {expandedOutfit === i ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}
                      </div>
                    </button>
                    {expandedOutfit === i && (
                      <div className="px-4 pb-4 space-y-3" style={{ background:'var(--card)', borderTop:'1px solid var(--card-border)' }}>
                        <div className="flex flex-wrap gap-1.5 pt-3">
                          {outfit.items.map((item) => <span key={item} className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background:'var(--card-border)', color:'var(--foreground)' }}>{item}</span>)}
                        </div>
                        <p className="text-sm" style={{ color:'var(--muted)' }}>{outfit.styling_note}</p>
                        <div className="rounded-xl px-3 py-2 flex items-start gap-2" style={{ background:'#f1f8e9' }}>
                          <Leaf size={13} color="#558b2f" className="mt-0.5 shrink-0"/>
                          <p className="text-xs leading-snug" style={{ color:'#33691e' }}>{outfit.eco_tip}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold mb-1.5" style={{ color:'var(--muted)' }}>Missing an item? Shop second-hand first:</p>
                          <div className="flex gap-2 flex-wrap">
                            <a href={`https://www.carousell.sg/search/${encodeURIComponent(outfit.items[0] ?? 'clothing')}/`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium" style={{ background:'#e8f5e9', color:'#2e7d32' }}><ExternalLink size={11}/>Carousell SG</a>
                            <a href="https://www.refash.sg" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium" style={{ background:'#e3f2fd', color:'#1565c0' }}><ExternalLink size={11}/>Refash</a>
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
          <div className="rounded-2xl p-4" style={{ background:'var(--card)', border:'1px solid var(--card-border)' }}>
            <div className="flex items-center gap-2 mb-3"><ShoppingBag size={16} style={{ color:'#2e7d32' }}/><p className="text-sm font-semibold">Buy Second-Hand First</p></div>
            <p className="text-xs mb-3" style={{ color:'var(--muted)' }}>Before buying new, check these Singapore platforms. Second-hand fashion saves up to 70% carbon vs. new production.</p>
            <div className="space-y-2">
              {SECONDHAND_LINKS.map((link) => (
                <a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-xl transition-all hover:opacity-90"
                  style={{ background: link.bg, border:`1px solid ${link.color}30` }}>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: link.color }}>{link.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: link.color, opacity:0.8 }}>{link.desc}</p>
                  </div>
                  <ExternalLink size={14} style={{ color: link.color }}/>
                </a>
              ))}
            </div>
          </div>

          {/* Gemma 4 badge */}
          <div className="rounded-2xl p-4" style={{ background:'linear-gradient(135deg,#1a237e10,#28359310)', border:'1px solid #3949ab30' }}>
            <p className="text-xs font-semibold mb-1" style={{ color:'#1a237e' }}>Powered by Gemma 4 (Local AI)</p>
            <p className="text-xs leading-relaxed" style={{ color:'var(--muted)' }}>
              All outfit suggestions run on <strong>Gemma 4</strong> via Ollama — directly on your device. No data sent to the cloud. No subscription. Accessible to anyone with a laptop.
            </p>
          </div>
        </div>
      )}

      <style>{`@keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}`}</style>
    </div>
  );
}
