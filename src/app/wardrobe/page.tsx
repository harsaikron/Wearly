'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import CameraCapture from '@/components/Camera';
import UploadZone from '@/components/UploadZone';
import { useWardrobeStore } from '@/store/wardrobe';
import { useListingsStore } from '@/store/listings';
import { ClothingItem, ClothingCategory, OccasionTag, Listing, ListingCondition } from '@/types';
import { categoryLabel, occasionLabel } from '@/lib/utils';
import { categoryBadgeStyle, badgeInlineStyle } from '@/lib/badges';
import { compressImage, stripDataPrefix } from '@/lib/image-utils';
import {
  Plus, X, Search, Shirt, Loader, Sparkles, Trash2, Camera,
  Heart, BarChart2, ShoppingBag, RefreshCw, Lightbulb, Award,
  AlertTriangle, Package, Palette, Star, ExternalLink,
  Calendar, ChevronRight, ChevronLeft, CalendarDays, Zap, Leaf, Tag, Plane, MapPin,
  Building2, Landmark, Umbrella, Sun, ShoppingCart, Droplets, ChevronDown, ChevronUp,
} from 'lucide-react';

// ── Google Calendar types ──────────────────────────────────────────────────────
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (cfg: object) => { requestAccessToken: () => void };
        };
      };
    };
  }
}

interface GCalEvent {
  id: string;
  summary: string;
  start: { date?: string; dateTime?: string };
  end: { date?: string; dateTime?: string };
  location?: string;
  description?: string;
}
interface TravelEvent {
  event: GCalEvent;
  destination: string;
  durationDays: number;
  packingList?: string[];
  loading?: boolean;
}

const TRAVEL_KEYWORDS = ['trip','travel','flight','vacation','holiday','tour','visit','thailand','australia','japan','korea','london','paris','bali','malaysia','indonesia','vietnam','hong kong','dubai','usa','uk','europe'];

function detectTravel(ev: GCalEvent) {
  const text = `${ev.summary ?? ''} ${ev.description ?? ''} ${ev.location ?? ''}`.toLowerCase();
  const isTravel = TRAVEL_KEYWORDS.some((k) => text.includes(k));
  const start = new Date(ev.start.dateTime ?? ev.start.date ?? Date.now());
  const end   = new Date(ev.end.dateTime   ?? ev.end.date   ?? Date.now());
  const durationDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
  return { isTravel, destination: ev.location ?? ev.summary ?? 'Unknown', durationDays };
}

// ── Planner constants ──────────────────────────────────────────────────────────
const CATEGORIES: ClothingCategory[] = [
  'shirt','formal_shirt','tshirt','pants','jeans','shorts',
  'shoes','sneakers','loafers','jacket','watch','belt','accessory',
];
const OCCASIONS: OccasionTag[] = [
  'office','casual','date_night','weekend','smart_casual',
  'minimal','luxury','travel','festive','gym',
];
const CONDITIONS: ListingCondition[] = ['New', 'Like New', 'Good', 'Fair'];
const SIZES = ['XS','S','M','L','XL','XXL','28','30','32','34','36','38','40','42','UK6','UK7','UK8','UK9','UK10','UK11'];

const EVENT_TYPES = ['workday','weekend','event','birthday','dinner','travel','casual'] as const;
type EventType = typeof EVENT_TYPES[number];
const EVENT_COLORS: Record<EventType, string> = {
  workday:'#4a90d9', weekend:'#7ec97e', event:'#c9a84c',
  birthday:'#d97b7b', dinner:'#b07cc9', travel:'#7bbbc9', casual:'#6b6b7b',
};
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

interface DayData { eventType: EventType; outfitIndex: number; }
function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function firstDay(y: number, m: number) { return new Date(y, m, 1).getDay(); }

// ── Health types ───────────────────────────────────────────────────────────────
type Tab = 'closet' | 'health' | 'plan';
type FilterCat = ClothingCategory | 'all';

interface HealthCombo {
  outfit_name: string; items: string[];
  colors: { name: string; hex: string }[];
  confidence: number; style_reason: string;
  comfort: number; sustainability: number; calendar_label: string;
}
interface LifecycleItem {
  name: string; prediction: string; resale_window: string; demand_trend: string; action: string;
}
interface HealthData {
  overall_score: number; grade: string; summary: string;
  overused: { name: string; times_worn: number; tip: string }[];
  unused: { name: string; days_since: number; tip: string; resell_suggestion: string }[];
  duplicate_colors: { color: string; hex: string; count: number; items: string[] }[];
  missing_essentials: { item: string; reason: string; priority: string }[];
  lifecycle: LifecycleItem[];
  outfit_combos: HealthCombo[];
}

const PREDICTION_COLOR: Record<string, string> = {
  high_usage: '#22c55e', low_usage: '#94a3b8', seasonal_peak: '#f59e0b',
  resale_ready: 'var(--primary-mid)', donate: '#ef4444',
};
const PREDICTION_LABEL: Record<string, string> = {
  high_usage: 'Keep using', low_usage: 'Consider selling', seasonal_peak: 'Seasonal peak',
  resale_ready: 'Sell now', donate: 'Donate',
};

// ── ScoreRing ──────────────────────────────────────────────────────────────────
function ScoreRing({ score, grade }: { score: number; grade: string }) {
  const r = 40, circ = 2 * Math.PI * r;
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';
  return (
    <div className="relative flex items-center justify-center" style={{ width: 100, height: 100 }}>
      <svg width={100} height={100} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={50} cy={50} r={r} fill="none" stroke="var(--card-border)" strokeWidth={8}/>
        <circle cx={50} cy={50} r={r} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={`${(score/100)*circ} ${circ}`} strokeLinecap="round"/>
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-xl font-bold" style={{ color }}>{score}</span>
        <span className="text-xs font-semibold" style={{ color }}>{grade}</span>
      </div>
    </div>
  );
}

// ── Trip planner types ─────────────────────────────────────────────────────────
interface TripDay {
  day: number;
  title: string;
  place: string;
  activity_type: string;
  weather_note: string;
  outfit_name: string;
  items: string[];
  from_wardrobe: string[];
  need_to_buy: string[];
  styling_note: string;
  eco_tip: string;
  buy_query: string;
  can_rent: boolean;
  rent_query?: string;
}
interface TripPlan {
  destination: string;
  climate: string;
  days: TripDay[];
  packing_essentials: string[];
}

const ACTIVITY_COLOR: Record<string, string> = {
  travel: 'var(--primary-mid)', beach: '#f59e0b', temple: '#8b5cf6', city: '#3b82f6',
  night_market: '#ec4899', fine_dining: '#ef4444', water_sports: '#06b6d4',
  shopping: '#10b981', resort: '#f97316', hiking: '#84cc16',
};

function ActivityIcon({ type, size = 13 }: { type: string; size?: number }) {
  const color = ACTIVITY_COLOR[type] ?? 'var(--primary-mid)';
  const s = { color };
  switch (type) {
    case 'beach':       return <Sun size={size} style={s}/>;
    case 'temple':      return <Landmark size={size} style={s}/>;
    case 'city':        return <Building2 size={size} style={s}/>;
    case 'night_market':return <ShoppingBag size={size} style={s}/>;
    case 'fine_dining': return <Star size={size} style={s}/>;
    case 'water_sports':return <Droplets size={size} style={s}/>;
    case 'shopping':    return <ShoppingCart size={size} style={s}/>;
    case 'resort':      return <Umbrella size={size} style={s}/>;
    case 'hiking':      return <MapPin size={size} style={s}/>;
    default:            return <Plane size={size} style={s}/>;
  }
}

function sheinTripUrl(q: string)    { return `https://sg.shein.com/search?q=${encodeURIComponent(q)}`; }
function shopeeTripUrl(q: string)   { return `https://shopee.sg/search?keyword=${encodeURIComponent(q)}`; }
function zaloraTripUrl(q: string)   { return `https://www.zalora.com.sg/search/?q=${encodeURIComponent(q)}`; }
function carousellTripUrl(q: string){ return `https://www.carousell.sg/search/${encodeURIComponent(q)}/`; }

// ── Google Calendar section ────────────────────────────────────────────────────
function CalendarSection({ wardrobeItems }: { wardrobeItems: ClothingItem[] }) {
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<GCalEvent[]>([]);
  const [travelEvents, setTravelEvents] = useState<TravelEvent[]>([]);
  const [loadingCal, setLoadingCal] = useState(false);
  const [calError, setCalError] = useState('');
  const tokenRef = useRef<string>('');
  const scriptLoaded = useRef(false);
  const [tripPlans, setTripPlans] = useState<Record<string, TripPlan>>({});
  const [tripLoadings, setTripLoadings] = useState<Record<string, boolean>>({});
  const [expandedDays, setExpandedDays] = useState<Record<string, number | null>>({});

  useEffect(() => {
    if (scriptLoaded.current) return;
    scriptLoaded.current = true;
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    document.head.appendChild(s);
  }, []);

  async function fetchCalEvents(token: string) {
    setLoadingCal(true); setCalError('');
    try {
      const now = new Date().toISOString();
      const future = new Date(Date.now() + 90 * 86400000).toISOString();
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now}&timeMax=${future}&maxResults=50&singleEvents=true&orderBy=startTime`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error('Calendar API error');
      const data = await res.json();
      const evs: GCalEvent[] = data.items ?? [];
      setEvents(evs);
      setTravelEvents(evs.map((ev) => { const d = detectTravel(ev); return d.isTravel ? { event: ev, ...d } : null; }).filter(Boolean) as TravelEvent[]);
    } catch (e) { setCalError(String(e)); } finally { setLoadingCal(false); }
  }

  async function generateTripPlan(tv: TravelEvent) {
    const eid = tv.event.id;
    setTripLoadings((p) => ({ ...p, [eid]: true }));
    try {
      const res = await fetch('/api/trip-planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: tv.destination,
          duration_days: tv.durationDays,
          wardrobe: wardrobeItems.map((i) => ({ name: i.name, category: i.category, color_name: i.color_name, tags: i.tags })),
        }),
      });
      const data = await res.json() as TripPlan;
      setTripPlans((p) => ({ ...p, [eid]: data }));
      setExpandedDays((p) => ({ ...p, [eid]: 1 }));
    } catch { /* silent */ } finally {
      setTripLoadings((p) => ({ ...p, [eid]: false }));
    }
  }

  function connectGoogle() {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId || !window.google) {
      setConnected(true);
      const mock: GCalEvent[] = [
        { id:'1', summary:'Trip to Thailand', start:{ date:'2026-06-05' }, end:{ date:'2026-06-12' }, location:'Bangkok, Thailand', description:'7-day holiday' },
        { id:'2', summary:'Travel to Australia', start:{ date:'2026-07-10' }, end:{ date:'2026-07-17' }, location:'Sydney, Australia', description:'Business trip' },
        { id:'3', summary:'Team Meeting', start:{ dateTime:'2026-05-20T10:00:00' }, end:{ dateTime:'2026-05-20T11:00:00' } },
      ];
      setEvents(mock);
      setTravelEvents(mock.map((ev) => { const d = detectTravel(ev); return d.isTravel ? { event: ev, ...d } : null; }).filter(Boolean) as TravelEvent[]);
      return;
    }
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/calendar.events.readonly',
      callback: (resp: { access_token?: string; error?: string }) => {
        if (resp.access_token) { tokenRef.current = resp.access_token; setConnected(true); fetchCalEvents(resp.access_token); }
        else setCalError(resp.error ?? 'Auth failed');
      },
    });
    client.requestAccessToken();
  }

  const nonTravel = events.filter((ev) => !detectTravel(ev).isTravel);

  return (
    <div className="rounded-2xl overflow-hidden mb-5" style={{ background:'var(--card)', border:'1px solid var(--card-border)' }}>
      <div className="px-4 py-3 flex items-center justify-between"
        style={{ background:'linear-gradient(135deg,rgba(44,74,30,0.06),rgba(59,130,246,0.05))', borderBottom:'1px solid var(--card-border)' }}>
        <div className="flex items-center gap-2">
          <CalendarDays size={15} style={{ color:'var(--accent)' }}/>
          <p className="text-sm font-bold" style={{ color:'var(--foreground)' }}>Google Calendar Sync</p>
        </div>
        {connected && <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background:'rgba(34,197,94,0.1)', color:'#16a34a' }}>Connected</span>}
      </div>
      <div className="px-4 py-4">
        {!connected ? (
          <div className="flex flex-col items-center gap-3 py-2">
            <p className="text-sm text-center" style={{ color:'var(--muted)' }}>
              Sync Google Calendar to see upcoming trips and get AI packing lists from your wardrobe.
            </p>
            <button onClick={connectGoogle} className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold" style={{ background:'var(--accent)', color:'#fff' }}>
              <CalendarDays size={15}/> Connect Google Calendar
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {loadingCal && <div className="flex items-center gap-2 text-sm" style={{ color:'var(--muted)' }}><Loader size={14} className="animate-spin"/> Fetching events…</div>}
            {calError && <p className="text-xs" style={{ color:'#dc2626' }}>{calError}</p>}

            {travelEvents.length > 0 && (
              <div className="space-y-4">
                <p className="text-xs font-bold uppercase tracking-wide" style={{ color:'var(--accent)' }}>Upcoming Trips</p>
                {travelEvents.map((tv) => {
                  const eid = tv.event.id;
                  const plan = tripPlans[eid];
                  const isLoading = tripLoadings[eid];
                  const expandedDay = expandedDays[eid] ?? null;
                  return (
                    <div key={eid} className="rounded-2xl overflow-hidden" style={{ border:'1px solid rgba(44,74,30,0.18)' }}>
                      {/* Trip header */}
                      <div className="px-4 py-3 flex items-start justify-between gap-3"
                        style={{ background:'linear-gradient(135deg,rgba(44,74,30,0.07),rgba(59,130,246,0.05))' }}>
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <Plane size={15} style={{ color:'var(--accent)', marginTop:2, flexShrink:0 }}/>
                          <div>
                            <p className="text-sm font-bold" style={{ color:'var(--foreground)' }}>{tv.event.summary}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              {tv.event.location && <span className="flex items-center gap-1 text-xs" style={{ color:'var(--muted)' }}><MapPin size={9}/>{tv.event.location}</span>}
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background:'rgba(44,74,30,0.08)', color:'var(--accent)' }}>{tv.durationDays} days</span>
                              {plan && <span className="text-xs" style={{ color:'var(--muted)' }}>{plan.climate}</span>}
                            </div>
                          </div>
                        </div>
                        {!plan && (
                          <button onClick={() => generateTripPlan(tv)} disabled={isLoading}
                            className="shrink-0 flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-all"
                            style={{ background:'var(--accent)', color:'#fff', opacity: isLoading ? 0.7 : 1 }}>
                            {isLoading ? <><Loader size={11} className="animate-spin"/> Planning…</> : <><Sparkles size={11}/> Plan Day by Day</>}
                          </button>
                        )}
                      </div>

                      {/* Day-by-day agenda */}
                      {plan && (
                        <div className="divide-y" style={{ borderColor:'var(--card-border)' }}>
                          {/* Packing essentials banner */}
                          {plan.packing_essentials?.length > 0 && (
                            <div className="px-4 py-2.5 flex items-center gap-2 flex-wrap" style={{ background:'rgba(99,102,241,0.04)' }}>
                              <span className="text-xs font-semibold shrink-0" style={{ color:'var(--accent)' }}>Must-pack:</span>
                              {plan.packing_essentials.slice(0, 5).map((e, i) => (
                                <span key={i} className="text-xs px-2 py-0.5 rounded-full" style={{ background:'rgba(44,74,30,0.07)', color:'var(--accent)', border:'1px solid rgba(44,74,30,0.14)' }}>{e}</span>
                              ))}
                            </div>
                          )}

                          {plan.days?.map((dayPlan) => {
                            const acColor = ACTIVITY_COLOR[dayPlan.activity_type] ?? 'var(--primary-mid)';
                            const isExpanded = expandedDay === dayPlan.day;
                            return (
                              <div key={dayPlan.day} style={{ background:'var(--card)' }}>
                                {/* Day row — tap to expand */}
                                <button
                                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all"
                                  style={{ background: isExpanded ? `${acColor}06` : 'transparent' }}
                                  onClick={() => setExpandedDays((p) => ({ ...p, [eid]: isExpanded ? null : dayPlan.day }))}>
                                  <div className="shrink-0 w-9 h-9 rounded-xl flex flex-col items-center justify-center"
                                    style={{ background:`${acColor}15`, border:`1px solid ${acColor}30` }}>
                                    <span className="text-xs font-bold leading-none" style={{ color: acColor }}>D{dayPlan.day}</span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                      <ActivityIcon type={dayPlan.activity_type}/>
                                      <p className="text-sm font-semibold truncate" style={{ color:'var(--foreground)' }}>{dayPlan.title}</p>
                                    </div>
                                    <p className="text-xs truncate" style={{ color:'var(--muted)' }}>{dayPlan.place}</p>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-xs hidden sm:block" style={{ color:'var(--muted)' }}>{dayPlan.weather_note}</span>
                                    {isExpanded ? <ChevronUp size={14} style={{ color:'var(--muted)' }}/> : <ChevronDown size={14} style={{ color:'var(--muted)' }}/>}
                                  </div>
                                </button>

                                {/* Expanded detail */}
                                {isExpanded && (
                                  <div className="px-4 pb-4 space-y-3" style={{ borderTop:`1px solid ${acColor}20` }}>
                                    {/* Weather (mobile) */}
                                    <p className="text-xs pt-1 sm:hidden" style={{ color:'var(--muted)' }}>{dayPlan.weather_note}</p>

                                    {/* Outfit card */}
                                    <div className="rounded-xl overflow-hidden" style={{ border:`1px solid ${acColor}25` }}>
                                      <div className="px-3 py-2 flex items-center gap-2" style={{ background:`${acColor}10` }}>
                                        <Sparkles size={12} style={{ color: acColor }}/>
                                        <p className="text-xs font-bold" style={{ color: acColor }}>{dayPlan.outfit_name}</p>
                                      </div>
                                      <div className="px-3 py-2.5 space-y-2" style={{ background:'var(--card)' }}>
                                        {/* Items — green if from wardrobe */}
                                        <div className="flex flex-wrap gap-1.5">
                                          {dayPlan.items?.map((item, j) => {
                                            const owned = dayPlan.from_wardrobe?.includes(item);
                                            return (
                                              <span key={j} className="text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1"
                                                style={{ background: owned ? 'rgba(34,197,94,0.1)' : 'var(--muted-bg)', color: owned ? '#16a34a' : 'var(--foreground)', border:`1px solid ${owned ? 'rgba(34,197,94,0.25)' : 'var(--card-border)'}` }}>
                                                {owned && <Leaf size={9} style={{ color:'#16a34a' }}/>}{item}
                                              </span>
                                            );
                                          })}
                                        </div>
                                        {dayPlan.from_wardrobe?.length > 0 && (
                                          <p className="text-xs flex items-center gap-1" style={{ color:'#16a34a' }}>
                                            <Leaf size={9}/>{dayPlan.from_wardrobe.length} item{dayPlan.from_wardrobe.length > 1 ? 's' : ''} from your wardrobe
                                          </p>
                                        )}
                                        <p className="text-xs leading-relaxed" style={{ color:'var(--muted)' }}>
                                          <Lightbulb size={10} style={{ display:'inline', marginRight:3, color: acColor }}/>{dayPlan.styling_note}
                                        </p>
                                        <div className="flex items-start gap-1.5 rounded-lg px-2.5 py-1.5" style={{ background:'rgba(34,197,94,0.06)', border:'1px solid rgba(34,197,94,0.15)' }}>
                                          <Leaf size={10} style={{ color:'#16a34a', marginTop:2, flexShrink:0 }}/>
                                          <p className="text-xs leading-snug" style={{ color:'#16a34a' }}>{dayPlan.eco_tip}</p>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Need to buy */}
                                    {dayPlan.need_to_buy?.length > 0 && (
                                      <div>
                                        <p className="text-xs font-semibold mb-1.5" style={{ color:'var(--muted)' }}>NEED TO GET:</p>
                                        <div className="flex flex-wrap gap-1.5">
                                          {dayPlan.need_to_buy.map((item, j) => (
                                            <span key={j} className="text-xs px-2 py-0.5 rounded-full" style={{ background:'rgba(239,68,68,0.08)', color:'#ef4444', border:'1px solid rgba(239,68,68,0.2)' }}>{item}</span>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Buy / Rent links */}
                                    <div className="space-y-2">
                                      <p className="text-xs font-semibold" style={{ color:'var(--muted)' }}>SHOP THIS LOOK:</p>
                                      <div className="flex flex-wrap gap-1.5">
                                        <a href={shopeeTripUrl(dayPlan.buy_query + ' Singapore')} target="_blank" rel="noopener noreferrer"
                                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold" style={{ background:'#ee4d2d', color:'#fff' }}>
                                          <ShoppingCart size={10}/> Shopee
                                        </a>
                                        <a href={sheinTripUrl(dayPlan.buy_query)} target="_blank" rel="noopener noreferrer"
                                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold" style={{ background:'#000', color:'#fff' }}>
                                          <ShoppingCart size={10}/> Shein
                                        </a>
                                        <a href={zaloraTripUrl(dayPlan.buy_query)} target="_blank" rel="noopener noreferrer"
                                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold" style={{ background:'#9b27af', color:'#fff' }}>
                                          <ShoppingCart size={10}/> Zalora
                                        </a>
                                        {dayPlan.can_rent && dayPlan.rent_query && (
                                          <a href={carousellTripUrl(dayPlan.rent_query)} target="_blank" rel="noopener noreferrer"
                                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold" style={{ background:'rgba(34,197,94,0.12)', color:'#16a34a', border:'1px solid rgba(34,197,94,0.25)' }}>
                                            <Leaf size={10}/> Rent · Carousell
                                          </a>
                                        )}
                                      </div>
                                      <a href={`https://calendar.google.com/calendar/r/eventedit?text=${encodeURIComponent(`Day ${dayPlan.day}: ${dayPlan.outfit_name}`)}&details=${encodeURIComponent(`${dayPlan.place}\n\nOutfit: ${dayPlan.items?.join(', ')}\n\n${dayPlan.styling_note}`)}`}
                                        target="_blank" rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color:'var(--accent)' }}>
                                        <ExternalLink size={10}/> Save Day {dayPlan.day} to Calendar
                                      </a>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {nonTravel.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color:'var(--muted)' }}>Upcoming Events</p>
                <div className="space-y-1">
                  {nonTravel.slice(0, 5).map((ev) => (
                    <div key={ev.id} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background:'var(--muted-bg)', border:'1px solid var(--card-border)' }}>
                      <CalendarDays size={12} style={{ color:'var(--muted)', flexShrink:0 }}/>
                      <span className="text-xs flex-1 truncate" style={{ color:'var(--foreground)' }}>{ev.summary}</span>
                      <span className="text-xs shrink-0" style={{ color:'var(--muted)' }}>
                        {new Date(ev.start.dateTime ?? ev.start.date ?? '').toLocaleDateString('en-SG',{month:'short',day:'numeric'})}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function WardrobePage() {
  const { items, addItem, removeItem, outfits } = useWardrobeStore();
  const { addListing, seed } = useListingsStore();
  useEffect(() => { seed(); }, [seed]);

  const [tab, setTab] = useState<Tab>('closet');

  // ── Closet state ──
  const [filter, setFilter]         = useState<FilterCat>('all');
  const [search, setSearch]         = useState('');
  const [showAdd, setShowAdd]       = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [preview, setPreview]       = useState('');
  const [analyzing, setAnalyzing]   = useState(false);
  const [form, setForm] = useState({
    name: '', category: 'shirt' as ClothingCategory,
    color_hex: '#FFFFFF', color_name: 'White', tags: [] as OccasionTag[],
  });

  // ── Sell/Rent state ──
  const [sellItem, setSellItem]     = useState<ClothingItem | null>(null);
  const [sellMode, setSellMode]     = useState<'sell'|'rent'>('sell');
  const [listForm, setListForm]     = useState({ title:'', brand:'', size:'M', condition:'Good' as ListingCondition, price:'', rent_price:'', description:'', pickup_location:'' });
  const [aiListing, setAiListing]   = useState<{ title:string; description:string; suggested_price?:number; suggested_rent?:number } | null>(null);
  const [listingLoading, setListingLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // ── Health state ──
  const [health, setHealth]         = useState<HealthData | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState('');

  // ── Plan state ──
  const today = new Date();
  const [planYear, setPlanYear]     = useState(today.getFullYear());
  const [planMonth, setPlanMonth]   = useState(today.getMonth());
  const [planDay, setPlanDay]       = useState<number | null>(null);
  const [dayData, setDayData]       = useState<Record<string, DayData>>({});
  const [assignEvent, setAssignEvent]         = useState<EventType>('workday');
  const [assignOutfitIdx, setAssignOutfitIdx] = useState(0);

  // ── Closet helpers ──
  const filtered = items.filter((item) => {
    const matchCat    = filter === 'all' || item.category === filter;
    const matchSearch = !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.color_name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  async function analyzePhoto(dataUrl: string) {
    setPreview(dataUrl); setAnalyzing(true);
    try {
      const res = await fetch('/api/analyze-clothing', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: stripDataPrefix(dataUrl) }),
      });
      if (res.ok) {
        const d = await res.json();
        setForm({ name: d.suggested_name??'', category: d.category??'shirt', color_hex: d.color_hex??'#FFFFFF', color_name: d.color_name??'White', tags: d.tags??[] });
      }
    } catch { /* keep blank */ } finally { setAnalyzing(false); }
  }

  function onCameraCapture(dataUrl: string) { setShowCamera(false); setShowAdd(true); analyzePhoto(dataUrl); }
  const handleFile = useCallback(async (file: File) => {
    const compressed = await compressImage(file);
    setShowAdd(true); analyzePhoto(compressed);
  }, []);

  function saveItem() {
    addItem({
      id: crypto.randomUUID(), user_id: 'local',
      name: form.name || 'Unnamed Item',
      category: form.category, color_hex: form.color_hex, color_name: form.color_name,
      image_url: preview, brand: undefined, tags: form.tags,
      times_worn: 0, created_at: new Date().toISOString(),
    });
    setShowAdd(false); setPreview('');
    setForm({ name:'', category:'shirt', color_hex:'#FFFFFF', color_name:'White', tags:[] });
  }

  // ── Sell/Rent helpers ──
  async function openSell(item: ClothingItem, mode: 'sell'|'rent') {
    setSellItem(item); setSellMode(mode);
    setListForm({ title:'', brand: item.brand??'', size:'M', condition:'Good', price:'', rent_price:'', description:'', pickup_location:'' });
    setAiListing(null); setListingLoading(true);
    try {
      const res = await fetch('/api/ai-listing', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: item.name, category: item.category, brand: item.brand, condition: 'Good', color_name: item.color_name, times_worn: item.times_worn, mode }),
      });
      if (res.ok) {
        const d = await res.json();
        setAiListing(d);
        setListForm((f) => ({ ...f, title: d.title??'', description: d.description??'', price: d.suggested_price ? String(d.suggested_price) : '', rent_price: d.suggested_rent ? String(d.suggested_rent) : '' }));
      }
    } catch { /* use manual */ } finally { setListingLoading(false); }
  }

  async function publishListing() {
    if (!sellItem) return;
    setPublishing(true);
    addListing({
      id: crypto.randomUUID(), item_id: sellItem.id,
      title: listForm.title || sellItem.name, category: sellItem.category,
      brand: listForm.brand, size: listForm.size, condition: listForm.condition,
      price: parseFloat(listForm.price) || 0,
      rent_price_day: sellMode === 'rent' ? parseFloat(listForm.rent_price) || 0 : undefined,
      description: listForm.description, image_url: sellItem.image_url,
      color_hex: sellItem.color_hex, color_name: sellItem.color_name,
      seller_name: 'You', seller_distance_km: 0,
      pickup_location: listForm.pickup_location, availability: 'available',
      mode: sellMode === 'rent' ? 'rent' : 'sell',
      is_mine: true, sustainability_badge: true, created_at: new Date().toISOString(),
    } as Listing);
    setPublishing(false); setSellItem(null);
  }

  // ── Health helpers ──
  async function fetchHealth() {
    if (items.length === 0) return;
    setHealthLoading(true); setHealthError('');
    try {
      const res = await fetch('/api/closet-health', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: items.map((i) => ({ name:i.name, category:i.category, color_name:i.color_name, color_hex:i.color_hex, tags:i.tags, times_worn:i.times_worn, last_worn:i.last_worn, created_at:i.created_at })) }),
      });
      const d = await res.json();
      if (!res.ok || d.error) throw new Error(d.error);
      setHealth(d as HealthData);
    } catch (e) { setHealthError(String(e)); } finally { setHealthLoading(false); }
  }

  useEffect(() => { if (tab === 'health' && !health && !healthLoading) fetchHealth(); }, [tab]);

  function comboCalUrl(combo: HealthCombo) {
    return `https://calendar.google.com/calendar/r/eventedit?text=${encodeURIComponent(`Outfit: ${combo.outfit_name}`)}&details=${encodeURIComponent(combo.items.join(' + '))}`;
  }

  // ── Plan helpers ──
  function planKey(day: number) {
    return `${planYear}-${String(planMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  }
  function navMonth(dir: -1|1) {
    const d = new Date(planYear, planMonth + dir, 1);
    setPlanYear(d.getFullYear()); setPlanMonth(d.getMonth()); setPlanDay(null);
  }
  function assignDay() {
    if (!planDay) return;
    setDayData((p) => ({ ...p, [planKey(planDay)]: { eventType: assignEvent, outfitIndex: assignOutfitIdx } }));
  }
  function autoFill() {
    const next: Record<string, DayData> = {};
    for (let d = 1; d <= daysInMonth(planYear, planMonth); d++) {
      const dow = new Date(planYear, planMonth, d).getDay();
      next[planKey(d)] = { eventType: dow === 0 || dow === 6 ? 'weekend' : 'workday', outfitIndex: outfits.length ? d % outfits.length : 0 };
    }
    setDayData((p) => ({ ...p, ...next }));
  }

  const selPlanData   = planDay ? dayData[planKey(planDay)] : null;
  const selPlanOutfit = selPlanData && outfits[selPlanData.outfitIndex] ? outfits[selPlanData.outfitIndex] : null;

  // ── Tab config ──
  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'closet', label: 'Closet', icon: <Shirt size={13}/> },
    { key: 'health', label: 'Health', icon: <BarChart2 size={13}/> },
    { key: 'plan',   label: 'Plan',   icon: <CalendarDays size={13}/> },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 page-enter">

      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-bold" style={{ color:'var(--foreground)' }}>Wardrobe</h1>
        <p className="text-xs mt-0.5" style={{ color:'var(--muted)' }}>Manage your closet, health score &amp; outfit plan</p>
      </div>

      {/* Full-width tabs */}
      <div className="flex gap-1 p-1 rounded-xl mb-5" style={{ background:'var(--card)', border:'1px solid var(--card-border)' }}>
        {TABS.map(({ key, label, icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all"
            style={tab === key ? { background:'var(--accent)', color:'#fff' } : { color:'var(--muted)' }}>
            {icon}{label}
          </button>
        ))}
      </div>

      {/* ══════ CLOSET TAB ══════ */}
      {tab === 'closet' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 px-3 rounded-xl" style={{ background:'var(--card)', border:'1px solid var(--card-border)' }}>
              <Search size={14} style={{ color:'var(--muted)' }}/>
              <input className="flex-1 text-sm py-2.5 bg-transparent outline-none" placeholder="Search items…"
                style={{ color:'var(--foreground)' }} value={search} onChange={(e) => setSearch(e.target.value)}/>
            </div>
            <button onClick={() => { setPreview(''); setShowAdd(true); }}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background:'var(--accent)', color:'#fff' }}>
              <Plus size={15}/> Add
            </button>
          </div>

          {/* Category pills — colorful badges */}
          <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
            {(['all', ...CATEGORIES] as FilterCat[]).map((c) => {
              const isActive = filter === c;
              const s = c !== 'all' ? categoryBadgeStyle(c) : null;
              return (
              <button key={c} onClick={() => setFilter(c)}
                className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all btn-bounce"
                style={isActive && s
                  ? { background: s.bg, color: s.color, border: `1.5px solid ${s.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.10)' }
                  : isActive
                  ? { background: 'var(--primary-muted)', color: 'var(--primary-mid)', border: '1.5px solid rgba(44,74,30,0.25)' }
                  : { background: 'var(--card)', color: 'var(--muted)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-xs)' }}>
                {c === 'all' ? 'All items' : categoryLabel(c)}
              </button>
              );
            })}
          </div>

          {/* Grid */}
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <Shirt size={36} style={{ color:'var(--muted)', margin:'0 auto 12px' }}/>
              <p className="font-semibold text-sm" style={{ color:'var(--foreground)' }}>No items yet</p>
              <p className="text-xs mt-1" style={{ color:'var(--muted)' }}>Add clothes using camera or gallery</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 stagger-grid">
              {filtered.map((item) => {
                const daysSince = item.last_worn ? Math.floor((Date.now() - new Date(item.last_worn).getTime()) / 86400000) : null;
                const isUnused  = !item.last_worn || (daysSince !== null && daysSince > 60);
                const isOverused = item.times_worn > 10;
                return (
                  <div key={item.id} className="rounded-2xl overflow-hidden flex flex-col card-lift"
                    style={{ background:'var(--card)', border:`1.5px solid ${item.favorite ? 'rgba(236,72,153,0.35)' : categoryBadgeStyle(item.category).border}`, boxShadow:'var(--shadow-md)' }}>
                    {/* Clickable area → detail page */}
                    <Link href={`/wardrobe/${item.id}`} className="block">
                      <div className="relative w-full" style={{ height:160, background: `linear-gradient(135deg, ${categoryBadgeStyle(item.category).bg} 0%, #ffffff 100%)` }}>
                        {item.image_url ? (
                          <Image src={item.image_url} alt={item.name} fill className="object-cover"/>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center flex-col gap-2">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: categoryBadgeStyle(item.category).bg, border: `1.5px solid ${categoryBadgeStyle(item.category).border}` }}>
                              <Shirt size={22} style={{ color: categoryBadgeStyle(item.category).color }}/>
                            </div>
                            <div className="w-6 h-6 rounded-full border-2" style={{ background: item.color_hex, borderColor:'rgba(255,255,255,0.8)', boxShadow:'0 2px 6px rgba(0,0,0,0.15)' }}/>
                          </div>
                        )}
                        {/* Glass category badge */}
                        <div className="absolute top-2 left-2 badge-glass capitalize" style={{ color: categoryBadgeStyle(item.category).color, fontSize:10, fontWeight:700 }}>
                          {categoryLabel(item.category)}
                        </div>
                        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                          {isUnused   && <span className="badge-glass text-xs font-bold" style={{ color:'#B91C1C', fontSize:9 }}>Unused</span>}
                          {isOverused && <span className="badge-glass text-xs font-bold" style={{ color:'#92400E', fontSize:9 }}>Overused</span>}
                          {item.favorite && (
                            <div className="w-6 h-6 rounded-full flex items-center justify-center badge-glass">
                              <Heart size={11} fill="#ec4899" stroke="#ec4899"/>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="px-3 pt-3 pb-1 flex flex-col gap-1.5">
                        <div>
                          <p className="font-semibold text-sm leading-tight truncate" style={{ color:'var(--foreground)' }}>{item.name}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-4 h-4 rounded-full border-2" style={{ background: item.color_hex, borderColor:'rgba(255,255,255,0.8)', boxShadow:'0 1px 4px rgba(0,0,0,0.12)' }}/>
                          <span className="text-xs" style={{ color:'var(--muted)' }}>{item.color_name}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs" style={{ color:'var(--muted)' }}>
                          <span className="flex items-center gap-0.5"><Heart size={10}/> {item.times_worn}×</span>
                          <span>{daysSince !== null ? `${daysSince}d ago` : 'Never worn'}</span>
                        </div>
                      </div>
                    </Link>
                    <div className="px-3 pb-3 pt-1 flex gap-1.5 mt-auto">
                      <Link href={`/wardrobe/${item.id}`} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold" style={{ background:'rgba(44,74,30,0.08)', color:'var(--accent)' }}>
                        <Sparkles size={11}/> Style
                      </Link>
                      <button onClick={() => openSell(item, 'sell')} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold" style={{ background:'rgba(34,197,94,0.1)', color:'#16a34a' }}>
                        <Tag size={11}/> Sell
                      </button>
                      <button onClick={() => openSell(item, 'rent')} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold" style={{ background:'rgba(245,158,11,0.1)', color:'#d97706' }}>
                        <ShoppingBag size={11}/> Rent
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════ HEALTH TAB ══════ */}
      {tab === 'health' && (
        <div className="space-y-5">
          {items.length === 0 && (
            <div className="text-center py-12">
              <BarChart2 size={32} style={{ color:'var(--muted)', margin:'0 auto 12px' }}/>
              <p className="text-sm font-semibold" style={{ color:'var(--foreground)' }}>Add items first</p>
              <p className="text-xs mt-1" style={{ color:'var(--muted)' }}>Health score appears once you have wardrobe items.</p>
            </div>
          )}
          {healthLoading && (
            <div className="flex flex-col gap-4">
              <div className="shimmer rounded-2xl h-32"/>
              {[0,1,2,3].map((i) => <div key={i} className="shimmer rounded-2xl h-24"/>)}
            </div>
          )}
          {healthError && (
            <div className="rounded-xl px-4 py-3 text-sm" style={{ background:'rgba(239,68,68,0.06)', color:'#dc2626', border:'1px solid rgba(239,68,68,0.2)' }}>
              {healthError} — <button onClick={fetchHealth} className="underline">Retry</button>
            </div>
          )}
          {health && !healthLoading && (
            <>
              {/* Score card */}
              <div className="rounded-2xl p-5 flex items-center gap-5" style={{ background:'var(--card)', border:'1px solid var(--card-border)', boxShadow:'var(--shadow-md)' }}>
                <ScoreRing score={health.overall_score} grade={health.grade}/>
                <div className="flex-1">
                  <p className="font-bold text-base" style={{ color:'var(--foreground)' }}>Closet Health Score</p>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color:'var(--muted)' }}>{health.summary}</p>
                  <button onClick={fetchHealth} className="flex items-center gap-1 mt-2 text-xs font-semibold" style={{ color:'var(--accent)' }}>
                    <RefreshCw size={11}/> Refresh
                  </button>
                </div>
              </div>

              {health.overused?.length > 0 && (
                <Section icon={<AlertTriangle size={15} color="#f59e0b"/>} title="Overused Items" color="#f59e0b">
                  {health.overused.map((o,i) => (
                    <div key={i} className="flex items-center justify-between py-2" style={{ borderBottom:'1px solid var(--card-border)' }}>
                      <div>
                        <p className="text-sm font-semibold" style={{ color:'var(--foreground)' }}>{o.name}</p>
                        <p className="text-xs" style={{ color:'var(--muted)' }}>Worn {o.times_worn}× — {o.tip}</p>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background:'rgba(245,158,11,0.1)', color:'#d97706' }}>{o.times_worn}×</span>
                    </div>
                  ))}
                </Section>
              )}

              {health.unused?.length > 0 && (
                <Section icon={<Package size={15} color="#6366f1"/>} title="Unused Items" color="#6366f1">
                  {health.unused.map((u,i) => (
                    <div key={i} className="py-2" style={{ borderBottom:'1px solid var(--card-border)' }}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold" style={{ color:'var(--foreground)' }}>{u.name}</p>
                        <span className="text-xs" style={{ color:'var(--muted)' }}>{u.days_since}d idle</span>
                      </div>
                      <p className="text-xs mt-0.5" style={{ color:'var(--muted)' }}>{u.tip}</p>
                      <p className="text-xs mt-0.5 font-medium" style={{ color:'var(--primary-mid)' }}>{u.resell_suggestion}</p>
                    </div>
                  ))}
                </Section>
              )}

              {health.duplicate_colors?.length > 0 && (
                <Section icon={<Palette size={15} color="#e91e8c"/>} title="Duplicate Colors" color="#e91e8c">
                  {health.duplicate_colors.map((d,i) => (
                    <div key={i} className="flex items-start gap-3 py-2" style={{ borderBottom:'1px solid var(--card-border)' }}>
                      <div className="w-8 h-8 rounded-lg shrink-0 border-2" style={{ background: d.hex, borderColor:'rgba(0,0,0,0.1)' }}/>
                      <div className="flex-1">
                        <p className="text-sm font-semibold" style={{ color:'var(--foreground)' }}>{d.color} ({d.count} items)</p>
                        <p className="text-xs mt-0.5 leading-snug" style={{ color:'var(--muted)' }}>{d.items.join(' · ')}</p>
                      </div>
                    </div>
                  ))}
                </Section>
              )}

              {health.missing_essentials?.length > 0 && (
                <Section icon={<Star size={15} color="#22c55e"/>} title="Missing Essentials" color="#22c55e">
                  {health.missing_essentials.map((m,i) => (
                    <div key={i} className="flex items-center justify-between py-2" style={{ borderBottom:'1px solid var(--card-border)' }}>
                      <div>
                        <p className="text-sm font-semibold" style={{ color:'var(--foreground)' }}>{m.item}</p>
                        <p className="text-xs" style={{ color:'var(--muted)' }}>{m.reason}</p>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: m.priority==='high' ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', color: m.priority==='high' ? '#ef4444' : '#16a34a' }}>
                        {m.priority}
                      </span>
                    </div>
                  ))}
                </Section>
              )}

              {health.lifecycle?.length > 0 && (
                <div className="rounded-2xl overflow-hidden" style={{ background:'var(--card)', border:'1px solid var(--card-border)' }}>
                  <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom:'1px solid var(--card-border)', background:'linear-gradient(135deg,rgba(44,74,30,0.06),rgba(168,85,247,0.04))' }}>
                    <Zap size={15} style={{ color:'var(--accent)' }}/>
                    <p className="text-sm font-bold" style={{ color:'var(--foreground)' }}>Smart Clothing Lifecycle AI</p>
                  </div>
                  <div className="divide-y" style={{ borderColor:'var(--card-border)' }}>
                    {health.lifecycle.map((l,i) => (
                      <div key={i} className="px-4 py-3 flex items-start gap-3">
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 mt-0.5"
                          style={{ background:`${PREDICTION_COLOR[l.prediction]??'#94a3b8'}18`, color: PREDICTION_COLOR[l.prediction]??'#94a3b8' }}>
                          {PREDICTION_LABEL[l.prediction]??l.prediction}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color:'var(--foreground)' }}>{l.name}</p>
                          <p className="text-xs mt-0.5" style={{ color:'var(--muted)' }}>{l.demand_trend} · Resale: {l.resale_window}</p>
                          <p className="text-xs mt-0.5 font-medium" style={{ color:'var(--accent)' }}>{l.action}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {health.outfit_combos?.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-bold" style={{ color:'var(--foreground)' }}>AI Outfit Combinations</p>
                  {health.outfit_combos.map((combo,i) => (
                    <div key={i} className="rounded-2xl overflow-hidden" style={{ background:'var(--card)', border:'1px solid var(--card-border)' }}>
                      <div className="px-4 pt-4 pb-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-bold text-sm" style={{ color:'var(--foreground)' }}>{combo.outfit_name}</p>
                          <div className="flex gap-1.5">
                            <ScoreBadge label="Style" value={combo.confidence} color="#6366f1"/>
                            <ScoreBadge label="Comfort" value={combo.comfort} color="#22c55e"/>
                            <ScoreBadge label="Eco" value={combo.sustainability} color="#16a34a"/>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {combo.items.map((item,j) => (
                            <span key={j} className="text-xs px-2 py-0.5 rounded-full" style={{ background:'var(--muted-bg)', color:'var(--foreground)', border:'1px solid var(--card-border)' }}>{item}</span>
                          ))}
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          {combo.colors?.map((c,j) => (
                            <div key={j} className="flex items-center gap-1">
                              <div className="w-5 h-5 rounded-full border-2" style={{ background: c.hex, borderColor:'rgba(0,0,0,0.1)' }}/>
                              <span className="text-xs font-mono" style={{ color:'var(--muted)', fontSize:9 }}>{c.hex}</span>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs leading-relaxed" style={{ color:'var(--muted)' }}>
                          <Lightbulb size={10} style={{ display:'inline', marginRight:3, color:'var(--accent)' }}/>
                          {combo.style_reason}
                        </p>
                      </div>
                      <div className="px-4 py-2.5 flex items-center justify-between" style={{ borderTop:'1px solid var(--card-border)', background:'var(--muted-bg)' }}>
                        <span className="text-xs" style={{ color:'var(--muted)' }}>{combo.calendar_label}</span>
                        <a href={comboCalUrl(combo)} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
                          style={{ background:'rgba(44,74,30,0.08)', color:'var(--accent)' }}>
                          <Calendar size={12}/> Save to Calendar
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ══════ PLAN TAB ══════ */}
      {tab === 'plan' && (
        <div className="space-y-5">
          {/* Google Calendar sync */}
          <CalendarSection wardrobeItems={items}/>

          {/* Planner header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-base" style={{ color:'var(--foreground)' }}>Outfit Planner</p>
              <p className="text-xs" style={{ color:'var(--muted)' }}>Assign outfits to days on your calendar.</p>
            </div>
            <button onClick={autoFill}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
              style={{ background:'linear-gradient(135deg,#c9a84c,#e8c96a)', color:'#000' }}>
              <Sparkles size={13}/> AI Auto-fill
            </button>
          </div>

          {outfits.length === 0 ? (
            <div className="rounded-2xl p-10 flex flex-col items-center text-center" style={{ background:'var(--card)', border:'2px dashed var(--card-border)' }}>
              <Shirt size={32} className="mb-3" style={{ color:'var(--muted)' }}/>
              <p className="font-semibold text-sm mb-1" style={{ color:'var(--foreground)' }}>No saved outfits yet</p>
              <p className="text-xs mb-4" style={{ color:'var(--muted)' }}>Ask the Stylist for outfit suggestions to plan with.</p>
              <Link href="/stylist" className="px-4 py-2 rounded-xl text-xs font-semibold" style={{ background:'linear-gradient(135deg,#c9a84c,#e8c96a)', color:'#000' }}>
                Go to Stylist
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Calendar grid */}
              <div className="lg:col-span-2 rounded-2xl overflow-hidden" style={{ background:'var(--card)', border:'1px solid var(--card-border)' }}>
                <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom:'1px solid var(--card-border)' }}>
                  <button onClick={() => navMonth(-1)} className="p-1.5 rounded-lg" style={{ color:'var(--muted)' }}><ChevronLeft size={18}/></button>
                  <p className="font-semibold text-sm">{MONTHS[planMonth]} {planYear}</p>
                  <button onClick={() => navMonth(1)} className="p-1.5 rounded-lg" style={{ color:'var(--muted)' }}><ChevronRight size={18}/></button>
                </div>
                <div className="grid grid-cols-7 px-4 pt-3 pb-1">
                  {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d) => (
                    <div key={d} className="text-center text-xs font-semibold" style={{ color:'var(--muted)' }}>{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1 px-4 pb-4">
                  {Array.from({ length: firstDay(planYear, planMonth) }).map((_,i) => <div key={`e${i}`}/>)}
                  {Array.from({ length: daysInMonth(planYear, planMonth) }).map((_,i) => {
                    const day = i + 1;
                    const data = dayData[planKey(day)];
                    const isToday = planYear === today.getFullYear() && planMonth === today.getMonth() && day === today.getDate();
                    const isSel   = planDay === day;
                    return (
                      <button key={day} onClick={() => setPlanDay(day)}
                        className="aspect-square rounded-xl flex flex-col items-center justify-center transition-all"
                        style={{
                          background: isSel ? 'rgba(201,168,76,0.2)' : data ? `${EVENT_COLORS[data.eventType]}18` : 'transparent',
                          border: isSel ? '1.5px solid #c9a84c' : isToday ? '1.5px solid rgba(201,168,76,0.4)' : '1px solid transparent',
                        }}>
                        <span className="text-xs font-medium" style={{ color: isToday ? 'var(--accent)' : 'var(--foreground)' }}>{day}</span>
                        {data && <span className="w-1.5 h-1.5 rounded-full mt-0.5" style={{ background: EVENT_COLORS[data.eventType] }}/>}
                      </button>
                    );
                  })}
                </div>
                <div className="px-4 py-3 flex flex-wrap gap-3" style={{ borderTop:'1px solid var(--card-border)' }}>
                  {EVENT_TYPES.map((et) => (
                    <div key={et} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: EVENT_COLORS[et] }}/>
                      <span className="text-xs capitalize" style={{ color:'var(--muted)' }}>{et}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Side panel */}
              <div>
                {planDay ? (
                  <div className="rounded-2xl overflow-hidden" style={{ background:'var(--card)', border:'1px solid var(--card-border)' }}>
                    <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom:'1px solid var(--card-border)' }}>
                      <CalendarDays size={15} style={{ color:'var(--accent)' }}/>
                      <p className="font-semibold text-sm">{MONTHS[planMonth]} {planDay}, {planYear}</p>
                    </div>
                    <div className="p-4 flex flex-col gap-4">
                      <div>
                        <p className="text-xs font-semibold mb-2" style={{ color:'var(--muted)' }}>EVENT TYPE</p>
                        <div className="grid grid-cols-2 gap-1.5">
                          {EVENT_TYPES.map((et) => (
                            <button key={et} onClick={() => setAssignEvent(et)}
                              className="px-2 py-1.5 rounded-lg text-xs capitalize transition-all"
                              style={{
                                background: assignEvent === et ? `${EVENT_COLORS[et]}25` : 'var(--muted-bg)',
                                border: assignEvent === et ? `1px solid ${EVENT_COLORS[et]}` : '1px solid var(--card-border)',
                                color: assignEvent === et ? EVENT_COLORS[et] : 'var(--muted)',
                              }}>{et}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold mb-2" style={{ color:'var(--muted)' }}>SELECT OUTFIT</p>
                        <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                          {outfits.map((outfit, idx) => (
                            <button key={outfit.id} onClick={() => setAssignOutfitIdx(idx)}
                              className="flex items-center gap-3 p-2 rounded-xl transition-all"
                              style={{
                                background: assignOutfitIdx === idx ? 'var(--accent-muted)' : 'var(--muted-bg)',
                                border: assignOutfitIdx === idx ? '1px solid rgba(201,168,76,0.4)' : '1px solid transparent',
                              }}>
                              <div className="flex gap-1">
                                {(outfit.items ?? []).slice(0,3).map((item) => (
                                  <div key={item.id} className="relative w-8 h-8 rounded-lg overflow-hidden" style={{ background:'var(--card-border)' }}>
                                    <Image src={item.image_url} alt={item.name} fill className="object-cover" sizes="32px"/>
                                  </div>
                                ))}
                              </div>
                              <div className="text-left">
                                <p className="text-xs font-medium">{outfit.name}</p>
                                <p className="text-xs" style={{ color:'var(--muted)' }}>{occasionLabel(outfit.occasion)}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                      <button onClick={assignDay}
                        className="w-full py-2.5 rounded-xl text-sm font-semibold hover:opacity-90"
                        style={{ background:'linear-gradient(135deg,#c9a84c,#e8c96a)', color:'#000' }}>
                        Assign Outfit
                      </button>
                      {selPlanData && (
                        <div className="rounded-xl p-3" style={{ background:'var(--accent-muted)', border:'1px solid rgba(201,168,76,0.2)' }}>
                          <p className="text-xs font-semibold" style={{ color:'var(--accent)' }}>Planned: {selPlanData.eventType}</p>
                          {selPlanOutfit && <p className="text-xs mt-0.5" style={{ color:'var(--muted)' }}>{selPlanOutfit.name}</p>}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl p-8 text-center" style={{ background:'var(--card)', border:'1px solid var(--card-border)' }}>
                    <CalendarDays size={28} className="mx-auto mb-3" style={{ color:'var(--muted)' }}/>
                    <p className="text-sm" style={{ color:'var(--muted)' }}>Tap a day to assign an outfit.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ ADD ITEM MODAL ══ */}
      {showAdd && (
        <Modal title="Add Clothing Item" onClose={() => { setShowAdd(false); setPreview(''); }}>
          {!preview && (
            <div className="flex gap-3 mb-4">
              <button onClick={() => { setShowAdd(false); setShowCamera(true); }}
                className="flex-1 flex flex-col items-center gap-2 py-4 rounded-xl"
                style={{ background:'linear-gradient(135deg,#6366f1,#818cf8)', color:'#fff' }}>
                <Camera size={20}/><span className="text-xs font-semibold">Camera</span>
              </button>
              <div className="flex-1"><UploadZone onFile={handleFile}/></div>
            </div>
          )}
          {preview && (
            <div className="relative mb-4 rounded-xl overflow-hidden" style={{ height:160 }}>
              <Image src={preview} alt="preview" fill className="object-cover"/>
              {analyzing && (
                <div className="absolute inset-0 flex items-center justify-center" style={{ background:'rgba(0,0,0,0.4)' }}>
                  <Loader size={24} className="animate-spin text-white"/>
                </div>
              )}
            </div>
          )}
          <div className="space-y-3">
            <Field label="Name">
              <input className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={{ background:'var(--muted-bg)', color:'var(--foreground)', border:'1px solid var(--card-border)' }}
                value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="e.g. White Oxford Shirt"/>
            </Field>
            <Field label="Category">
              <select className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={{ background:'var(--muted-bg)', color:'var(--foreground)', border:'1px solid var(--card-border)' }}
                value={form.category} onChange={(e) => setForm({...form, category: e.target.value as ClothingCategory})}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{categoryLabel(c)}</option>)}
              </select>
            </Field>
            <div className="flex gap-2">
              <div className="flex-1">
                <Field label="Color">
                  <input type="color" className="w-full h-10 rounded-xl cursor-pointer border outline-none" style={{ border:'1px solid var(--card-border)' }}
                    value={form.color_hex} onChange={(e) => setForm({...form, color_hex: e.target.value})}/>
                </Field>
              </div>
              <div className="flex-1">
                <Field label="Color Name">
                  <input className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={{ background:'var(--muted-bg)', color:'var(--foreground)', border:'1px solid var(--card-border)' }}
                    value={form.color_name} onChange={(e) => setForm({...form, color_name: e.target.value})}/>
                </Field>
              </div>
            </div>
            <Field label="Occasions">
              <div className="flex flex-wrap gap-1.5">
                {OCCASIONS.map((o) => (
                  <button key={o} onClick={() => setForm({...form, tags: form.tags.includes(o) ? form.tags.filter((t) => t!==o) : [...form.tags, o]})}
                    className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                    style={form.tags.includes(o) ? { background:'var(--accent)', color:'#fff' } : { background:'var(--muted-bg)', color:'var(--muted)', border:'1px solid var(--card-border)' }}>
                    {o.replace(/_/g,' ')}
                  </button>
                ))}
              </div>
            </Field>
          </div>
          <button onClick={saveItem} className="w-full mt-4 py-3 rounded-xl text-sm font-semibold" style={{ background:'var(--accent)', color:'#fff' }}>
            Save to Wardrobe
          </button>
        </Modal>
      )}

      {showCamera && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background:'#000' }}>
          <CameraCapture onCapture={onCameraCapture} onClose={() => setShowCamera(false)}/>
        </div>
      )}

      {/* ══ SELL/RENT MODAL ══ */}
      {sellItem && (
        <Modal title={`${sellMode === 'sell' ? 'Sell' : 'Rent'} — ${sellItem.name}`} onClose={() => setSellItem(null)}>
          {(sellItem.times_worn === 0 || (sellItem.last_worn && Math.floor((Date.now()-new Date(sellItem.last_worn).getTime())/86400000) > 60)) && (
            <div className="mb-4 rounded-xl px-3 py-2.5 flex items-start gap-2" style={{ background:'rgba(44,74,30,0.06)', border:'1px solid rgba(44,74,30,0.18)' }}>
              <Lightbulb size={14} style={{ color:'var(--accent)', marginTop:2, flexShrink:0 }}/>
              <p className="text-xs leading-relaxed" style={{ color:'var(--foreground)' }}>
                <span className="font-semibold">AI Suggestion: </span>
                You haven&apos;t worn this in {sellItem.last_worn ? Math.floor((Date.now()-new Date(sellItem.last_worn).getTime())/86400000) : 'a long time'} days.
                {' '}{sellMode === 'sell' ? 'Selling could earn you cash and reduce waste.' : 'Renting keeps it in circulation sustainably.'}
              </p>
            </div>
          )}
          {listingLoading && <div className="flex items-center gap-2 mb-4 text-sm" style={{ color:'var(--muted)' }}><Loader size={14} className="animate-spin"/> Gemma 4 is writing your listing…</div>}
          {aiListing && (
            <div className="mb-4 rounded-xl px-3 py-2.5" style={{ background:'rgba(34,197,94,0.06)', border:'1px solid rgba(34,197,94,0.2)' }}>
              <p className="text-xs font-semibold mb-1" style={{ color:'#16a34a' }}>AI-generated preview</p>
              <p className="text-xs font-bold" style={{ color:'var(--foreground)' }}>{aiListing.title}</p>
              <p className="text-xs mt-1 leading-relaxed" style={{ color:'var(--muted)' }}>{aiListing.description}</p>
            </div>
          )}
          <div className="space-y-3">
            <Field label="Title"><input className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={{ background:'var(--muted-bg)', color:'var(--foreground)', border:'1px solid var(--card-border)' }} value={listForm.title} onChange={(e) => setListForm({...listForm, title: e.target.value})} placeholder="Listing title"/></Field>
            <div className="flex gap-2">
              <div className="flex-1"><Field label="Brand"><input className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={{ background:'var(--muted-bg)', color:'var(--foreground)', border:'1px solid var(--card-border)' }} value={listForm.brand} onChange={(e) => setListForm({...listForm, brand: e.target.value})} placeholder="Brand"/></Field></div>
              <div className="flex-1"><Field label="Size"><select className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={{ background:'var(--muted-bg)', color:'var(--foreground)', border:'1px solid var(--card-border)' }} value={listForm.size} onChange={(e) => setListForm({...listForm, size: e.target.value})}>{SIZES.map((s) => <option key={s}>{s}</option>)}</select></Field></div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1"><Field label="Condition"><select className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={{ background:'var(--muted-bg)', color:'var(--foreground)', border:'1px solid var(--card-border)' }} value={listForm.condition} onChange={(e) => setListForm({...listForm, condition: e.target.value as ListingCondition})}>{CONDITIONS.map((c) => <option key={c}>{c}</option>)}</select></Field></div>
              <div className="flex-1"><Field label={sellMode==='sell' ? 'Price (SGD)' : 'Sell Price (SGD)'}><input type="number" className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={{ background:'var(--muted-bg)', color:'var(--foreground)', border:'1px solid var(--card-border)' }} value={listForm.price} onChange={(e) => setListForm({...listForm, price: e.target.value})} placeholder="0"/></Field></div>
            </div>
            {sellMode === 'rent' && <Field label="Rent Price (SGD/day)"><input type="number" className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={{ background:'var(--muted-bg)', color:'var(--foreground)', border:'1px solid var(--card-border)' }} value={listForm.rent_price} onChange={(e) => setListForm({...listForm, rent_price: e.target.value})} placeholder="0"/></Field>}
            <Field label="Description"><textarea rows={3} className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none" style={{ background:'var(--muted-bg)', color:'var(--foreground)', border:'1px solid var(--card-border)' }} value={listForm.description} onChange={(e) => setListForm({...listForm, description: e.target.value})} placeholder="Describe the item…"/></Field>
            <Field label="Pickup Location"><input className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={{ background:'var(--muted-bg)', color:'var(--foreground)', border:'1px solid var(--card-border)' }} value={listForm.pickup_location} onChange={(e) => setListForm({...listForm, pickup_location: e.target.value})} placeholder="e.g. Bugis MRT, Tampines Hub"/></Field>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => setSellItem(null)} className="flex-1 py-3 rounded-xl text-sm font-semibold" style={{ background:'var(--muted-bg)', color:'var(--muted)', border:'1px solid var(--card-border)' }}>Cancel</button>
            <button onClick={publishListing} disabled={publishing} className="flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
              style={{ background: publishing ? 'var(--muted-bg)' : '#16a34a', color: publishing ? 'var(--muted)' : '#fff' }}>
              {publishing ? <Loader size={14} className="animate-spin"/> : <ExternalLink size={14}/>}
              {publishing ? 'Publishing…' : 'Publish Listing'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Shared UI helpers ──────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center"
      style={{ background:'rgba(0,0,0,0.40)', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)' }}>
      <div className="w-full md:max-w-md rounded-t-3xl md:rounded-3xl overflow-hidden overflow-y-auto slide-up"
        style={{ background:'var(--card)', maxHeight:'92vh', boxShadow:'0 -8px 40px rgba(0,0,0,0.18)' }}>
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background:'var(--card-border)' }}/>
        </div>
        <div className="flex items-center justify-between px-5 py-3.5 sticky top-0"
          style={{ background:'rgba(255,255,255,0.90)', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', borderBottom:'1px solid var(--card-border)' }}>
          <p className="font-bold text-base" style={{ color:'var(--foreground)' }}>{title}</p>
          <button onClick={onClose} className="btn-icon" style={{ width:34, height:34, borderRadius:'50%' }}>
            <X size={15} style={{ color:'var(--muted)' }}/>
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function Section({ icon, title, color, children }: { icon: React.ReactNode; title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background:'var(--card)', border:`1px solid ${color}30` }}>
      <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom:'1px solid var(--card-border)', background:`${color}08` }}>
        {icon}<p className="text-sm font-bold" style={{ color:'var(--foreground)' }}>{title}</p>
      </div>
      <div className="px-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold mb-1" style={{ color:'var(--muted)' }}>{label}</p>
      {children}
    </div>
  );
}

function ScoreBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center px-2 py-1 rounded-lg" style={{ background:`${color}10`, border:`1px solid ${color}25` }}>
      <span className="text-xs font-bold" style={{ color }}>{value}</span>
      <span style={{ fontSize:8, color, opacity:0.8 }}>{label}</span>
    </div>
  );
}
