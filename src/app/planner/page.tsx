'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useWardrobeStore } from '@/store/wardrobe';
import { occasionLabel } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Sparkles, CalendarDays, Shirt, Plane, Loader, Lightbulb, ExternalLink, X, MapPin } from 'lucide-react';

// ── Google Calendar types ──
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

function detectTravel(event: GCalEvent): { isTravel: boolean; destination: string; durationDays: number } {
  const text = `${event.summary ?? ''} ${event.description ?? ''} ${event.location ?? ''}`.toLowerCase();
  const isTravel = TRAVEL_KEYWORDS.some((k) => text.includes(k));
  const dest = event.location ?? event.summary ?? 'Unknown';
  const start = new Date(event.start.dateTime ?? event.start.date ?? Date.now());
  const end = new Date(event.end.dateTime ?? event.end.date ?? Date.now());
  const durationDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
  return { isTravel, destination: dest, durationDays };
}

function CalendarSection() {
  const { items } = useWardrobeStore();
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<GCalEvent[]>([]);
  const [travelEvents, setTravelEvents] = useState<TravelEvent[]>([]);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [calError, setCalError] = useState('');
  const tokenRef = useRef<string>('');
  const scriptLoaded = useRef(false);

  useEffect(() => {
    if (scriptLoaded.current) return;
    scriptLoaded.current = true;
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    document.head.appendChild(s);
  }, []);

  async function fetchCalendarEvents(token: string) {
    setLoadingCalendar(true); setCalError('');
    try {
      const now = new Date().toISOString();
      const future = new Date(Date.now() + 90 * 86400000).toISOString();
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now}&timeMax=${future}&maxResults=50&singleEvents=true&orderBy=startTime`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error('Calendar API error');
      const data = await res.json();
      const items: GCalEvent[] = data.items ?? [];
      setEvents(items);
      const travels = items
        .map((ev) => { const d = detectTravel(ev); return d.isTravel ? { event: ev, ...d } : null; })
        .filter(Boolean) as TravelEvent[];
      setTravelEvents(travels);
    } catch (e) { setCalError(String(e)); } finally { setLoadingCalendar(false); }
  }

  async function generatePackingList(tv: TravelEvent, index: number) {
    setTravelEvents((prev) => prev.map((t, i) => i === index ? { ...t, loading: true } : t));
    const wardrobeList = items.slice(0, 10).map((i) => `${i.name} (${i.category}, ${i.color_name})`).join(', ');
    try {
      const res = await fetch('/api/sustainable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({ name:i.name, category:i.category, color_name:i.color_name, tags:i.tags })),
          occasion: 'Travel',
          event: `${tv.durationDays}-day trip to ${tv.destination}`,
        }),
      });
      const data = await res.json();
      const list: string[] = data.outfits?.flatMap((o: { items: string[] }) => o.items) ?? wardrobeList.split(', ');
      setTravelEvents((prev) => prev.map((t, i) => i === index ? { ...t, packingList: list, loading: false } : t));
    } catch { setTravelEvents((prev) => prev.map((t, i) => i === index ? { ...t, loading: false } : t)); }
  }

  function connectGoogle() {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId || !window.google) {
      // Demo mode — show mock travel events
      setConnected(true);
      const mockEvents: GCalEvent[] = [
        { id:'1', summary:'Trip to Thailand 🇹🇭', start:{ date:'2026-06-05' }, end:{ date:'2026-06-12' }, location:'Bangkok, Thailand', description:'7-day holiday' },
        { id:'2', summary:'Travel to Australia 🇦🇺', start:{ date:'2026-07-10' }, end:{ date:'2026-07-17' }, location:'Sydney, Australia', description:'Business trip' },
        { id:'3', summary:'Team Meeting', start:{ dateTime:'2026-05-20T10:00:00' }, end:{ dateTime:'2026-05-20T11:00:00' } },
      ];
      setEvents(mockEvents);
      const travels = mockEvents.map((ev) => { const d = detectTravel(ev); return d.isTravel ? { event: ev, ...d } : null; }).filter(Boolean) as TravelEvent[];
      setTravelEvents(travels);
      return;
    }
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/calendar.events.readonly',
      callback: (resp: { access_token?: string; error?: string }) => {
        if (resp.access_token) {
          tokenRef.current = resp.access_token;
          setConnected(true);
          fetchCalendarEvents(resp.access_token);
        } else { setCalError(resp.error ?? 'Auth failed'); }
      },
    });
    client.requestAccessToken();
  }

  const nonTravel = events.filter((ev) => !detectTravel(ev).isTravel);

  return (
    <div className="space-y-4 mb-6">
      <div className="rounded-2xl overflow-hidden" style={{ background:'var(--card)', border:'1px solid var(--card-border)' }}>
        <div className="px-4 py-3 flex items-center justify-between"
          style={{ background:'linear-gradient(135deg,rgba(99,102,241,0.07),rgba(59,130,246,0.05))', borderBottom:'1px solid var(--card-border)' }}>
          <div className="flex items-center gap-2">
            <CalendarDays size={15} style={{ color:'var(--accent)' }}/>
            <p className="text-sm font-bold" style={{ color:'var(--foreground)' }}>Google Calendar Sync</p>
          </div>
          {connected && (
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background:'rgba(34,197,94,0.1)', color:'#16a34a' }}>Connected</span>
          )}
        </div>
        <div className="px-4 py-4">
          {!connected ? (
            <div className="flex flex-col items-center gap-3 py-2">
              <p className="text-sm text-center" style={{ color:'var(--muted)' }}>
                Sync your Google Calendar to see upcoming trips and get AI-powered packing lists based on your wardrobe.
              </p>
              <button onClick={connectGoogle}
                className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold"
                style={{ background:'var(--accent)', color:'#fff' }}>
                <CalendarDays size={15}/> Connect Google Calendar
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {loadingCalendar && (
                <div className="flex items-center gap-2 text-sm" style={{ color:'var(--muted)' }}>
                  <Loader size={14} className="animate-spin"/> Fetching events…
                </div>
              )}
              {calError && <p className="text-xs" style={{ color:'#dc2626' }}>{calError}</p>}

              {/* Travel events */}
              {travelEvents.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wide" style={{ color:'var(--accent)' }}>Upcoming Trips</p>
                  {travelEvents.map((tv, i) => (
                    <div key={tv.event.id} className="rounded-xl overflow-hidden" style={{ border:'1px solid rgba(99,102,241,0.2)' }}>
                      <div className="px-3 py-3" style={{ background:'linear-gradient(135deg,rgba(99,102,241,0.06),rgba(59,130,246,0.04))' }}>
                        <div className="flex items-start gap-2">
                          <Plane size={14} style={{ color:'var(--accent)', marginTop:2, flexShrink:0 }}/>
                          <div className="flex-1">
                            <p className="text-sm font-bold" style={{ color:'var(--foreground)' }}>{tv.event.summary}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {tv.event.location && (
                                <span className="flex items-center gap-1 text-xs" style={{ color:'var(--muted)' }}>
                                  <MapPin size={9}/>{tv.event.location}
                                </span>
                              )}
                              <span className="text-xs" style={{ color:'var(--muted)' }}>{tv.durationDays} days</span>
                            </div>
                          </div>
                        </div>
                        {!tv.packingList && (
                          <button onClick={() => generatePackingList(tv, i)}
                            disabled={tv.loading}
                            className="mt-2 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
                            style={{ background:'var(--accent)', color:'#fff' }}>
                            {tv.loading ? <Loader size={11} className="animate-spin"/> : <Lightbulb size={11}/>}
                            {tv.loading ? 'Packing with AI…' : `AI Packing List for ${tv.durationDays} days`}
                          </button>
                        )}
                      </div>
                      {tv.packingList && (
                        <div className="px-3 py-3" style={{ background:'var(--card)' }}>
                          <p className="text-xs font-semibold mb-2" style={{ color:'var(--muted)' }}>PACK THESE FROM YOUR WARDROBE:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {tv.packingList.map((item, j) => (
                              <span key={j} className="text-xs px-2 py-1 rounded-full" style={{ background:'rgba(99,102,241,0.08)', color:'var(--accent)', border:'1px solid rgba(99,102,241,0.15)' }}>
                                {item}
                              </span>
                            ))}
                          </div>
                          <a href={`https://calendar.google.com/calendar/r/eventedit?text=Pack+for+${encodeURIComponent(tv.event.summary)}&details=${encodeURIComponent(tv.packingList.join(', '))}`}
                            target="_blank" rel="noopener noreferrer"
                            className="mt-2 flex items-center gap-1 text-xs font-semibold" style={{ color:'var(--accent)' }}>
                            <ExternalLink size={11}/> Save packing reminder to Calendar
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Other events preview */}
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
    </div>
  );
}

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

export default function PlannerPage() {
  const { outfits } = useWardrobeStore();
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [dayData, setDayData] = useState<Record<string, DayData>>({});
  const [assignEvent, setAssignEvent]   = useState<EventType>('workday');
  const [assignOutfitIdx, setAssignOutfitIdx] = useState(0);

  function navMonth(dir: -1|1) {
    const d = new Date(year, month + dir, 1);
    setYear(d.getFullYear()); setMonth(d.getMonth()); setSelectedDay(null);
  }
  function key(day: number) {
    return `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  }
  function assignDay() {
    if (!selectedDay) return;
    setDayData((p) => ({ ...p, [key(selectedDay)]: { eventType: assignEvent, outfitIndex: assignOutfitIdx } }));
  }
  function autoFill() {
    const next: Record<string, DayData> = {};
    for (let d = 1; d <= daysInMonth(year, month); d++) {
      const dow = new Date(year, month, d).getDay();
      next[key(d)] = {
        eventType: dow === 0 || dow === 6 ? 'weekend' : 'workday',
        outfitIndex: outfits.length ? d % outfits.length : 0,
      };
    }
    setDayData((p) => ({ ...p, ...next }));
  }

  const selData   = selectedDay ? dayData[key(selectedDay)] : null;
  const selOutfit = selData && outfits[selData.outfitIndex] ? outfits[selData.outfitIndex] : null;

  if (outfits.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 animate-fade-in">
        <CalendarSection />
        <h1 className="text-2xl font-bold mb-1">Outfit Planner</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>Plan your outfits for the month.</p>
        <div className="rounded-2xl p-12 flex flex-col items-center text-center" style={{ background: 'var(--card)', border: '2px dashed var(--card-border)' }}>
          <Shirt size={36} className="mb-4" style={{ color: 'var(--muted)' }} />
          <p className="font-semibold mb-1">No saved outfits yet</p>
          <p className="text-sm mb-5" style={{ color: 'var(--muted)' }}>
            Ask the AI Stylist for outfit suggestions. When you get one you love, it will appear here to plan with.
          </p>
          <Link href="/stylist" className="px-5 py-2.5 rounded-xl font-semibold text-sm" style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c96a)', color: '#000' }}>
            Ask AI Stylist
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 animate-fade-in">
      {/* Google Calendar Sync section */}
      <CalendarSection />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Outfit Planner</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Plan outfits for the month ahead.</p>
        </div>
        <button onClick={autoFill}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c96a)', color: '#000' }}>
          <Sparkles size={15} /> AI Auto-fill Month
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 rounded-2xl overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--card-border)' }}>
            <button onClick={() => navMonth(-1)} className="p-1.5 rounded-lg hover:bg-[var(--muted-bg)]" style={{ color: 'var(--muted)' }}><ChevronLeft size={18} /></button>
            <p className="font-semibold">{MONTHS[month]} {year}</p>
            <button onClick={() => navMonth(1)} className="p-1.5 rounded-lg hover:bg-[var(--muted-bg)]" style={{ color: 'var(--muted)' }}><ChevronRight size={18} /></button>
          </div>
          <div className="grid grid-cols-7 px-4 pt-3 pb-1">
            {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d) => (
              <div key={d} className="text-center text-xs font-semibold" style={{ color: 'var(--muted)' }}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 px-4 pb-4">
            {Array.from({ length: firstDay(year, month) }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth(year, month) }).map((_, i) => {
              const day = i + 1;
              const data = dayData[key(day)];
              const isToday = year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
              const isSel   = selectedDay === day;
              return (
                <button key={day} onClick={() => setSelectedDay(day)}
                  className="aspect-square rounded-xl flex flex-col items-center justify-center transition-all"
                  style={{
                    background: isSel ? 'rgba(201,168,76,0.2)' : data ? `${EVENT_COLORS[data.eventType]}18` : 'transparent',
                    border: isSel ? '1.5px solid #c9a84c' : isToday ? '1.5px solid rgba(201,168,76,0.4)' : '1px solid transparent',
                  }}>
                  <span className="text-xs font-medium" style={{ color: isToday ? 'var(--accent)' : 'var(--foreground)' }}>{day}</span>
                  {data && <span className="w-1.5 h-1.5 rounded-full mt-0.5" style={{ background: EVENT_COLORS[data.eventType] }} />}
                </button>
              );
            })}
          </div>
          {/* Legend */}
          <div className="px-5 py-3 flex flex-wrap gap-3" style={{ borderTop: '1px solid var(--card-border)' }}>
            {EVENT_TYPES.map((et) => (
              <div key={et} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: EVENT_COLORS[et] }} />
                <span className="text-xs capitalize" style={{ color: 'var(--muted)' }}>{et}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Side panel */}
        <div className="flex flex-col gap-4">
          {selectedDay ? (
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}>
              <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--card-border)' }}>
                <CalendarDays size={16} style={{ color: 'var(--accent)' }} />
                <p className="font-semibold text-sm">{MONTHS[month]} {selectedDay}, {year}</p>
              </div>
              <div className="p-4 flex flex-col gap-4">
                {/* Event type */}
                <div>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--muted)' }}>EVENT TYPE</p>
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

                {/* Outfit pick */}
                <div>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--muted)' }}>SELECT OUTFIT</p>
                  <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                    {outfits.map((outfit, idx) => (
                      <button key={outfit.id} onClick={() => setAssignOutfitIdx(idx)}
                        className="flex items-center gap-3 p-2 rounded-xl transition-all"
                        style={{
                          background: assignOutfitIdx === idx ? 'var(--accent-muted)' : 'var(--muted-bg)',
                          border: assignOutfitIdx === idx ? '1px solid rgba(201,168,76,0.4)' : '1px solid transparent',
                        }}>
                        <div className="flex gap-1">
                          {(outfit.items ?? []).slice(0, 3).map((item) => (
                            <div key={item.id} className="relative w-8 h-8 rounded-lg overflow-hidden" style={{ background: 'var(--card-border)' }}>
                              <Image src={item.image_url} alt={item.name} fill className="object-cover" sizes="32px" />
                            </div>
                          ))}
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-medium">{outfit.name}</p>
                          <p className="text-xs" style={{ color: 'var(--muted)' }}>{occasionLabel(outfit.occasion)}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={assignDay}
                  className="w-full py-2.5 rounded-xl font-semibold text-sm hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c96a)', color: '#000' }}>
                  Assign Outfit
                </button>

                {selData && (
                  <div className="rounded-xl p-3" style={{ background: 'var(--accent-muted)', border: '1px solid rgba(201,168,76,0.2)' }}>
                    <p className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>Planned: {selData.eventType}</p>
                    {selOutfit && <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{selOutfit.name}</p>}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl p-6 text-center" style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}>
              <CalendarDays size={32} className="mx-auto mb-3" style={{ color: 'var(--muted)' }} />
              <p className="text-sm" style={{ color: 'var(--muted)' }}>Click a day to assign an outfit.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
