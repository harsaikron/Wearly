'use client';

import { useState, useRef, useEffect } from 'react';
import { useWardrobeStore } from '@/store/wardrobe';
import {
  Send, Sparkles, Bot, User, CalendarDays, ShoppingBag,
  ExternalLink, Loader,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

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

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestion?: AISuggestion;
  error?: boolean;
}

interface SGEvent {
  name: string;
  emoji: string;
  date: string;
  outfit_tip: string;
  daysAway: number;
  dress_code: string;
  colors: string[];
}

// ── Static data ───────────────────────────────────────────────────────────────

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const OCCASIONS = [
  { label: 'Date Night',   emoji: '🌙', hint: 'romantic dinner date night' },
  { label: 'Office',       emoji: '💼', hint: 'smart professional office work' },
  { label: 'Casual',       emoji: '☕', hint: 'casual everyday relaxed chill' },
  { label: 'Weekend',      emoji: '🏖️', hint: 'weekend outdoor leisure' },
  { label: 'Party',        emoji: '🎉', hint: 'party night out celebration' },
  { label: 'Wedding',      emoji: '💒', hint: 'wedding formal guest attire' },
  { label: 'Festive',      emoji: '🎊', hint: 'festive cultural traditional' },
  { label: 'Travel',       emoji: '✈️', hint: 'travel airport comfortable' },
  { label: 'Gym',          emoji: '🏋️', hint: 'gym workout activewear' },
  { label: 'Beach / Pool', emoji: '🌊', hint: 'beach resort swimwear' },
];

// ── Shopping helpers ──────────────────────────────────────────────────────────

function sheinUrl(q: string)  { return `https://sg.shein.com/search?q=${encodeURIComponent(q)}&cat_id=2`; }
function shopeeUrl(q: string) { return `https://shopee.sg/search?keyword=${encodeURIComponent(q)}`; }
function zaloraUrl(q: string) { return `https://www.zalora.com.sg/search/?q=${encodeURIComponent(q)}`; }

function getContrast(hex: string) {
  if (!hex || hex.length < 7) return '#1f2937';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 >= 128 ? '#1f2937' : '#ffffff';
}

function uid() { return Math.random().toString(36).slice(2); }

// ── Shop buttons component ────────────────────────────────────────────────────

function ShopButtons({ query }: { query: string }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      <a href={sheinUrl(query)} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all hover:opacity-80"
        style={{ background: '#000', color: '#fff' }}>
        <ShoppingBag size={9} /> Shein
      </a>
      <a href={shopeeUrl(query)} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all hover:opacity-80"
        style={{ background: '#ee4d2d', color: '#fff' }}>
        <ShoppingBag size={9} /> Shopee
      </a>
      <a href={zaloraUrl(query)} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all hover:opacity-80"
        style={{ background: '#9b27af', color: '#fff' }}>
        <ShoppingBag size={9} /> Zalora
      </a>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function StylistPage() {
  const { items } = useWardrobeStore();

  // Today index (0 = Mon … 6 = Sun)
  const todayIdx = (new Date().getDay() + 6) % 7;

  const [selectedDay,      setSelectedDay]      = useState(todayIdx);
  const [selectedOccasion, setSelectedOccasion] = useState<string | null>(null);
  const [selectedEvent,    setSelectedEvent]    = useState<string | null>(null);
  const [events,           setEvents]           = useState<SGEvent[]>([]);
  const [messages,         setMessages]         = useState<Message[]>([]);
  const [input,            setInput]            = useState('');
  const [loading,          setLoading]          = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/events')
      .then((r) => r.json())
      .then((d) => setEvents(d.upcoming ?? []))
      .catch(() => null);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function buildQuery(): string {
    const dayLabel   = DAYS[selectedDay];
    const occ        = OCCASIONS.find((o) => o.label === selectedOccasion);
    if (selectedEvent) {
      return `What should I wear for ${selectedEvent} on ${dayLabel}? Give me a complete outfit with specific pieces, colours, and where to buy each item.`;
    }
    if (occ) {
      return `Suggest a ${occ.hint} outfit for ${dayLabel} in Singapore heat. Give me specific pieces with colours.`;
    }
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
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          query,
          wardrobe: items.map((i) => ({
            name: i.name, category: i.category,
            color_hex: i.color_hex, color_name: i.color_name, tags: i.tags,
          })),
          weather: { temperature: 31, feels_like: 36, description: 'Humid and sunny', condition: 'hot', city: 'Singapore', humidity: 84 },
        }),
      });
      const data = await res.json() as AISuggestion & { error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? 'AI error');
      setMessages((p) => [...p, {
        id: uid(), role: 'assistant',
        content: data.message ?? 'Here is my suggestion:',
        suggestion: data,
      }]);
    } catch (err) {
      setMessages((p) => [...p, {
        id: uid(), role: 'assistant',
        content: err instanceof Error ? err.message : 'Something went wrong.',
        error: true,
      }]);
    } finally {
      setLoading(false);
    }
  }

  const previewQuery = selectedEvent
    ? `${selectedEvent} outfit for ${DAYS[selectedDay]}`
    : selectedOccasion
    ? `${selectedOccasion} — ${DAYS[selectedDay]} in Singapore`
    : `What to wear on ${DAYS[selectedDay]}?`;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 animate-fade-in">

      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>
          AI Stylist
        </h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
          Pick day + occasion → get outfit + shop the look on Shein, Shopee &amp; Zalora
        </p>
      </div>

      {/* ── Planning Panel ──────────────────────────────────── */}
      <div
        className="rounded-2xl overflow-hidden mb-5"
        style={{ background: 'var(--card)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-sm)' }}
      >
        {/* Day Picker */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center gap-1.5 mb-2.5">
            <CalendarDays size={12} style={{ color: 'var(--accent)' }} />
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Which day?</p>
          </div>
          <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {DAYS.map((d, i) => (
              <button
                key={d}
                onClick={() => setSelectedDay(i)}
                className="shrink-0 flex flex-col items-center px-3.5 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-90"
                style={{
                  background: selectedDay === i
                    ? 'linear-gradient(135deg, #6366f1, #818cf8)'
                    : 'var(--muted-bg)',
                  color: selectedDay === i ? '#fff' : 'var(--foreground)',
                  border: i === todayIdx && selectedDay !== i
                    ? '1px dashed rgba(99,102,241,0.5)'
                    : '1px solid transparent',
                  minWidth: 44,
                }}
              >
                {d}
                {i === todayIdx && (
                  <span
                    className="w-1 h-1 rounded-full mt-0.5"
                    style={{ background: selectedDay === i ? 'rgba(255,255,255,0.7)' : 'var(--accent)' }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--card-border)' }} />

        {/* Occasion Grid */}
        <div className="px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide mb-2.5" style={{ color: 'var(--muted)' }}>Occasion</p>
          <div className="grid grid-cols-5 gap-2">
            {OCCASIONS.map((o) => {
              const active = selectedOccasion === o.label;
              return (
                <button
                  key={o.label}
                  onClick={() => { setSelectedOccasion(active ? null : o.label); setSelectedEvent(null); }}
                  className="flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all hover:opacity-80"
                  style={{
                    background: active ? 'var(--accent-muted)' : 'var(--muted-bg)',
                    border: `1px solid ${active ? 'rgba(99,102,241,0.35)' : 'var(--card-border)'}`,
                  }}
                >
                  <span style={{ fontSize: 22, lineHeight: 1 }}>{o.emoji}</span>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 600,
                      color: active ? 'var(--accent)' : 'var(--muted)',
                      textAlign: 'center',
                      lineHeight: 1.2,
                      maxWidth: 52,
                    }}
                  >
                    {o.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Festival / Events */}
        {events.filter((e) => e.daysAway <= 60).length > 0 && (
          <>
            <div style={{ borderTop: '1px solid var(--card-border)' }} />
            <div className="px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide mb-2.5" style={{ color: 'var(--muted)' }}>
                🎊 Festivals &amp; Events
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                {events.filter((e) => e.daysAway <= 60).map((ev) => {
                  const active = selectedEvent === ev.name;
                  return (
                    <button
                      key={ev.name}
                      onClick={() => { setSelectedEvent(active ? null : ev.name); setSelectedOccasion(null); }}
                      className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl transition-all hover:opacity-90"
                      style={{
                        background: active
                          ? 'linear-gradient(135deg, #6366f1, #818cf8)'
                          : 'var(--muted-bg)',
                        border: `1px solid ${active ? 'transparent' : 'var(--card-border)'}`,
                      }}
                    >
                      <span style={{ fontSize: 20 }}>{ev.emoji}</span>
                      <div className="text-left">
                        <p
                          className="text-xs font-semibold whitespace-nowrap"
                          style={{ color: active ? '#fff' : 'var(--foreground)', lineHeight: 1.2 }}
                        >
                          {ev.name}
                        </p>
                        <p style={{ fontSize: 10, color: active ? 'rgba(255,255,255,0.75)' : 'var(--muted)' }}>
                          {ev.daysAway === 0 ? 'Today 🎉' : ev.daysAway === 1 ? 'Tomorrow' : `in ${ev.daysAway}d`}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
              {/* Show outfit tip for selected event */}
              {selectedEvent && (() => {
                const ev = events.find((e) => e.name === selectedEvent);
                return ev ? (
                  <div
                    className="mt-2.5 px-3 py-2.5 rounded-xl text-xs leading-relaxed"
                    style={{ background: 'var(--accent-muted)', border: '1px solid rgba(99,102,241,0.2)', color: 'var(--accent)' }}
                  >
                    <strong>Dress code:</strong> {ev.dress_code} · {ev.outfit_tip}
                    <div className="flex gap-1.5 mt-1.5">
                      {ev.colors.map((c, i) => (
                        <div key={i} className="w-4 h-4 rounded-full" style={{ background: c, border: '1px solid rgba(0,0,0,0.1)' }} />
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          </>
        )}

        {/* CTA bar */}
        <div className="px-4 py-3" style={{ borderTop: '1px solid var(--card-border)', background: 'var(--muted-bg)' }}>
          <div className="flex items-center gap-2">
            <div
              className="flex-1 min-w-0 px-3 py-2 rounded-xl text-xs truncate"
              style={{ background: 'var(--card)', border: '1px solid var(--card-border)', color: 'var(--muted)' }}
            >
              {previewQuery}
            </div>
            <button
              onClick={() => ask()}
              disabled={loading}
              className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm transition-all hover:opacity-90 disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)', color: '#fff', boxShadow: '0 2px 8px rgba(99,102,241,0.3)' }}
            >
              {loading ? <Loader size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Get Outfit
            </button>
          </div>
        </div>
      </div>

      {/* ── Chat messages ────────────────────────────────────── */}
      {messages.length > 0 && (
        <div className="flex flex-col gap-5 mb-5">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {/* Avatar */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: msg.role === 'assistant' ? 'var(--accent-muted)' : 'var(--muted-bg)' }}
              >
                {msg.role === 'assistant'
                  ? <Bot size={15} style={{ color: 'var(--accent)' }} />
                  : <User size={15} style={{ color: 'var(--muted)' }} />}
              </div>

              {/* Bubble + card */}
              <div className={`flex flex-col gap-3 ${msg.role === 'user' ? 'items-end' : ''}`} style={{ maxWidth: '85%' }}>
                <div
                  className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                  style={msg.role === 'user'
                    ? { background: 'linear-gradient(135deg, #6366f1, #818cf8)', color: '#fff', borderBottomRightRadius: 6 }
                    : { background: 'var(--muted-bg)', border: '1px solid var(--card-border)', color: msg.error ? '#dc2626' : 'var(--foreground)', borderBottomLeftRadius: 6 }}
                >
                  {msg.content}
                </div>

                {/* Outfit card with shop links */}
                {msg.suggestion?.outfit_items && msg.suggestion.outfit_items.length > 0 && (
                  <div
                    className="w-full rounded-2xl overflow-hidden"
                    style={{ background: 'var(--card)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-sm)' }}
                  >
                    {/* Headline */}
                    {msg.suggestion.headline && (
                      <div className="px-4 py-3" style={{ background: 'var(--accent-muted)', borderBottom: '1px solid rgba(99,102,241,0.15)' }}>
                        <p className="font-bold text-sm" style={{ color: 'var(--accent)' }}>
                          {msg.suggestion.headline}
                        </p>
                        {msg.suggestion.occasion && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block capitalize"
                            style={{ background: 'rgba(99,102,241,0.12)', color: 'var(--accent)', border: '1px solid rgba(99,102,241,0.2)' }}
                          >
                            {msg.suggestion.occasion}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Each outfit item + per-item shop buttons */}
                    {msg.suggestion.outfit_items.map((item, i) => (
                      <div
                        key={i}
                        className="px-4 py-3"
                        style={{ borderBottom: i < msg.suggestion!.outfit_items!.length - 1 ? '1px solid var(--card-border)' : 'none' }}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div
                            className="w-9 h-9 rounded-xl shrink-0"
                            style={{ background: item.color_hex, border: '1px solid rgba(0,0,0,0.08)' }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                              {item.piece}
                            </p>
                            {item.note && (
                              <p className="text-xs" style={{ color: 'var(--muted)' }}>{item.note}</p>
                            )}
                          </div>
                          <span
                            className="text-xs px-2 py-0.5 rounded-lg font-mono shrink-0"
                            style={{ background: item.color_hex, color: getContrast(item.color_hex), fontSize: 10 }}
                          >
                            {item.color_name}
                          </span>
                        </div>
                        <div className="pl-12">
                          <ShopButtons query={`${item.piece} ${item.color_name} men`} />
                        </div>
                      </div>
                    ))}

                    {/* Style tip */}
                    {msg.suggestion.style_tip && (
                      <div
                        className="px-4 py-3"
                        style={{ background: 'rgba(99,102,241,0.04)', borderTop: '1px solid var(--card-border)' }}
                      >
                        <p className="text-xs leading-relaxed" style={{ color: 'var(--accent)' }}>
                          💡 {msg.suggestion.style_tip}
                        </p>
                      </div>
                    )}

                    {/* Shop Full Look row */}
                    {msg.suggestion.search_query && (
                      <div
                        className="px-4 py-3 flex items-center gap-2 flex-wrap"
                        style={{ borderTop: '1px solid var(--card-border)', background: 'var(--muted-bg)' }}
                      >
                        <span className="text-xs font-semibold flex items-center gap-1 mr-1" style={{ color: 'var(--muted)' }}>
                          <ShoppingBag size={11} /> Shop Full Look:
                        </span>
                        <a
                          href={sheinUrl(msg.suggestion.search_query + ' men')}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:opacity-80"
                          style={{ background: '#000', color: '#fff' }}
                        >
                          Shein <ExternalLink size={9} />
                        </a>
                        <a
                          href={shopeeUrl(msg.suggestion.search_query + ' men Singapore')}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:opacity-80"
                          style={{ background: '#ee4d2d', color: '#fff' }}
                        >
                          Shopee <ExternalLink size={9} />
                        </a>
                        <a
                          href={zaloraUrl(msg.suggestion.search_query)}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:opacity-80"
                          style={{ background: '#9b27af', color: '#fff' }}
                        >
                          Zalora <ExternalLink size={9} />
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="flex gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'var(--accent-muted)' }}
              >
                <Sparkles size={15} style={{ color: 'var(--accent)' }} />
              </div>
              <div
                className="px-4 py-3 rounded-2xl flex items-center gap-1.5"
                style={{ background: 'var(--muted-bg)', border: '1px solid var(--card-border)' }}
              >
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: 'var(--accent)', animation: `bounce 1.2s ease ${i * 0.2}s infinite` }}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* ── Free-text input ──────────────────────────────────── */}
      <div
        className="flex items-center gap-3 rounded-2xl px-4 py-3"
        style={{ background: 'var(--card)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-sm)' }}
      >
        <Sparkles size={15} style={{ color: 'var(--accent)' }} />
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ask()}
          placeholder="Or type a specific question…"
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: 'var(--foreground)' }}
        />
        <button
          onClick={() => ask()}
          disabled={!input.trim() || loading}
          className="w-8 h-8 rounded-xl flex items-center justify-center disabled:opacity-40 transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)' }}
        >
          <Send size={14} style={{ color: '#fff' }} />
        </button>
      </div>

      <style>{`@keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}`}</style>
    </div>
  );
}
