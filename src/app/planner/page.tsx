'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useWardrobeStore } from '@/store/wardrobe';
import { PlannedOutfit } from '@/types';
import {
  ChevronLeft, ChevronRight, Sparkles, CalendarDays, Shirt,
  Loader, X, Plus, Check, Trash2, RefreshCw, Wand2,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WDAYS  = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function firstDayOfMonth(y: number, m: number) { return new Date(y, m, 1).getDay(); }
function uid() { return Math.random().toString(36).slice(2); }
function toKey(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-SG', { weekday: 'short', month: 'short', day: 'numeric' });
}

// ── Occasion badge colours ─────────────────────────────────────────────────────
const OCC_COLORS: Record<string, string> = {
  Office:'#2563EB', Casual:'#C2570A', 'Date Night':'#BE185D',
  Weekend:'#A16207', Party:'#7C3AED', Wedding:'#DB2777',
  Travel:'#0E7490', Gym:'#166534', Beach:'#0891B2',
  Manual:'#6B7280',
};
function occColor(occ?: string) { return OCC_COLORS[occ ?? ''] ?? 'var(--accent)'; }

// ── Day Detail Drawer ─────────────────────────────────────────────────────────
function DayDrawer({
  dateKey,
  planned,
  wardrobeItems,
  onClose,
  onRemove,
  onAddManual,
}: {
  dateKey: string;
  planned: PlannedOutfit[];
  wardrobeItems: { id: string; name: string; image_url: string; color_hex: string; category: string }[];
  onClose: () => void;
  onRemove: (id: string) => void;
  onAddManual: (item: { id: string; name: string; image_url: string; color_hex: string }) => void;
}) {
  const [mode, setMode] = useState<'view' | 'pick'>('view');
  const nice = fmtDate(dateKey);

  return (
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center"
      style={{ zIndex: 9000, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl flex flex-col overflow-hidden"
        style={{ background: 'var(--card)', border: '1px solid var(--card-border)', maxHeight: '85vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--card-border)' }}>
          <div className="flex items-center gap-2">
            <CalendarDays size={16} style={{ color: 'var(--accent)' }} />
            <p className="font-bold" style={{ color: 'var(--foreground)' }}>{nice}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full" style={{ background: 'var(--muted-bg)' }}>
            <X size={14} style={{ color: 'var(--muted)' }} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-3">
          {/* Planned outfits for this day */}
          {planned.length > 0 ? (
            planned.map((p) => (
              <div key={p.id} className="rounded-xl p-3 flex flex-col gap-2"
                style={{ background: 'var(--muted-bg)', border: '1px solid var(--card-border)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>{p.title}</p>
                    {p.occasion && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 inline-block"
                        style={{ background: `${occColor(p.occasion)}18`, color: occColor(p.occasion) }}>
                        {p.occasion}
                      </span>
                    )}
                  </div>
                  <button onClick={() => onRemove(p.id)} className="p-1.5 rounded-full" style={{ background: 'rgba(220,38,38,0.08)' }}>
                    <Trash2 size={12} style={{ color: '#dc2626' }} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {p.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
                      style={{ background: `${item.color_hex}1A`, border: `1px solid ${item.color_hex}33` }}>
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.color_hex }} />
                      <span className="text-xs" style={{ color: 'var(--foreground)' }}>{item.piece}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs capitalize" style={{ color: 'var(--muted)' }}>
                  via {p.source === 'stylist' ? 'AI Stylist' : p.source === 'ai' ? 'Week Plan' : 'Manual'}
                </p>
              </div>
            ))
          ) : (
            <div className="text-center py-4">
              <p className="text-sm" style={{ color: 'var(--muted)' }}>No outfit planned yet.</p>
            </div>
          )}

          {/* Add from wardrobe */}
          <div>
            <button
              onClick={() => setMode(mode === 'pick' ? 'view' : 'pick')}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'var(--accent-muted)', color: 'var(--accent)', border: '1.5px dashed rgba(44,74,30,0.3)' }}
            >
              <Plus size={14} /> Add from Wardrobe
            </button>

            {mode === 'pick' && wardrobeItems.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {wardrobeItems.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => { onAddManual(w); setMode('view'); }}
                    className="rounded-xl overflow-hidden flex flex-col items-center gap-1 p-1.5 transition-all hover:opacity-80"
                    style={{ background: 'var(--muted-bg)', border: '1px solid var(--card-border)' }}
                  >
                    <div className="w-full aspect-square rounded-lg overflow-hidden relative" style={{ background: `${w.color_hex}22` }}>
                      {w.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={w.image_url} alt={w.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Shirt size={20} style={{ color: w.color_hex }} />
                        </div>
                      )}
                    </div>
                    <p className="text-xs font-medium text-center leading-tight line-clamp-2" style={{ color: 'var(--foreground)' }}>{w.name}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Week Plan Day Card ─────────────────────────────────────────────────────────
interface WeekDayPlan {
  day: string;
  date_offset: number;
  occasion: string;
  outfit: { piece: string; role: string; color_name: string; color_hex: string; note: string }[];
  style_note: string;
}

function WeekDayCard({ plan, dateStr, onSave, saved }: {
  plan: WeekDayPlan;
  dateStr: string;
  onSave: () => void;
  saved: boolean;
}) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-sm)' }}>
      {/* Day header */}
      <div className="px-4 py-3 flex items-center justify-between" style={{ background: 'var(--muted-bg)', borderBottom: '1px solid var(--card-border)' }}>
        <div>
          <p className="font-bold text-sm" style={{ color: 'var(--foreground)' }}>{plan.day}</p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>{fmtDate(dateStr)}</p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
          style={{ background: `${occColor(plan.occasion)}15`, color: occColor(plan.occasion) }}>
          {plan.occasion}
        </span>
      </div>

      {/* Outfit items */}
      <div className="px-4 py-3 flex flex-col gap-2">
        {plan.outfit.map((item, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl shrink-0" style={{ background: item.color_hex, border: '1px solid rgba(0,0,0,0.06)' }} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>{item.piece}</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>{item.role} · {item.color_name}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Style note + save */}
      {plan.style_note && (
        <div className="px-4 pb-2">
          <p className="text-xs italic" style={{ color: 'var(--muted)' }}>{plan.style_note}</p>
        </div>
      )}
      <div className="px-4 pb-4 pt-1">
        {saved ? (
          <div className="flex items-center gap-1.5 justify-center py-2 rounded-xl text-xs font-semibold"
            style={{ background: 'rgba(22,163,74,0.08)', color: '#16a34a' }}>
            <Check size={12} /> Saved to calendar
          </div>
        ) : (
          <button onClick={onSave}
            className="w-full py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all hover:opacity-90"
            style={{ background: 'var(--accent-muted)', color: 'var(--accent)', border: '1px solid rgba(44,74,30,0.2)' }}>
            <CalendarDays size={12} /> Save to Calendar
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
type Mode = 'calendar' | 'ai-week';

export default function PlannerPage() {
  const { items, plannedOutfits, addPlannedOutfit, removePlannedOutfit } = useWardrobeStore();
  const today = new Date();

  const [mode, setMode]         = useState<Mode>('calendar');
  const [year, setYear]         = useState(today.getFullYear());
  const [month, setMonth]       = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // AI week plan
  const [weekPlan,    setWeekPlan]    = useState<WeekDayPlan[] | null>(null);
  const [weekLoading, setWeekLoading] = useState(false);
  const [weekError,   setWeekError]   = useState('');
  const [savedDays,   setSavedDays]   = useState<Set<number>>(new Set());

  function navMonth(dir: -1 | 1) {
    const d = new Date(year, month + dir, 1);
    setYear(d.getFullYear()); setMonth(d.getMonth()); setSelectedDay(null);
  }

  const selectedKey = selectedDay ? toKey(year, month, selectedDay) : null;
  const plannedOnDay = selectedKey
    ? plannedOutfits.filter((p) => p.date === selectedKey)
    : [];

  // Which calendar days have planned outfits
  const plannedDates = new Set(plannedOutfits.map((p) => p.date));

  // ── AI Week Plan ──
  async function generateWeekPlan() {
    if (items.length === 0) { setWeekError('Add clothes to your wardrobe first.'); return; }
    setWeekLoading(true); setWeekError(''); setWeekPlan(null); setSavedDays(new Set());
    try {
      const res = await fetch('/api/week-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wardrobe: items.map((i) => ({ name: i.name, category: i.category, color_name: i.color_name, color_hex: i.color_hex, tags: i.tags })),
        }),
      });
      const data = await res.json() as { week?: WeekDayPlan[]; error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? 'AI error');
      setWeekPlan(data.week ?? []);
    } catch (e) { setWeekError(String(e)); } finally { setWeekLoading(false); }
  }

  // ── Get date string for a week-plan day (next Mon = offset 0) ──
  function weekDayDate(offset: number) {
    const now = new Date();
    const day = now.getDay(); // 0=Sun
    const toMon = day === 0 ? 1 : 8 - day; // days until next Monday
    const target = new Date(now);
    target.setDate(now.getDate() + toMon + offset);
    return target.toISOString().split('T')[0];
  }

  function saveWeekDay(plan: WeekDayPlan, offset: number) {
    const dateStr = weekDayDate(offset);
    const planned: PlannedOutfit = {
      id: uid(),
      date: dateStr,
      title: `${plan.day} – ${plan.occasion}`,
      items: plan.outfit.map((i) => ({ piece: i.piece, color_name: i.color_name, color_hex: i.color_hex, note: i.note })),
      occasion: plan.occasion,
      source: 'ai',
      created_at: new Date().toISOString(),
    };
    addPlannedOutfit(planned);
    setSavedDays((prev) => new Set([...prev, offset]));
  }

  function saveAllWeek() {
    if (!weekPlan) return;
    weekPlan.forEach((plan) => saveWeekDay(plan, plan.date_offset));
  }

  // ── Manual add from wardrobe ──
  function addManualToDay(dateKey: string, item: { id: string; name: string; image_url: string; color_hex: string }) {
    const wardrobeItem = items.find((w) => w.id === item.id);
    const planned: PlannedOutfit = {
      id: uid(),
      date: dateKey,
      title: item.name,
      items: [{ piece: item.name, color_name: wardrobeItem?.color_name ?? '', color_hex: item.color_hex }],
      occasion: wardrobeItem?.tags[0] ?? 'Casual',
      source: 'manual',
      created_at: new Date().toISOString(),
    };
    addPlannedOutfit(planned);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 animate-fade-in">

      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Outfit Planner</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Plan your wardrobe for every day of the week</p>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}>
        <button
          onClick={() => setMode('calendar')}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-all"
          style={mode === 'calendar' ? { background: 'var(--accent)', color: '#fff' } : { color: 'var(--muted)' }}
        >
          <CalendarDays size={13} /> My Calendar
        </button>
        <button
          onClick={() => setMode('ai-week')}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-all"
          style={mode === 'ai-week' ? { background: 'linear-gradient(to bottom, var(--primary-mid), var(--primary))', color: '#fff' } : { color: 'var(--muted)' }}
        >
          <Wand2 size={13} /> AI Week Plan
        </button>
      </div>

      {/* ══ CALENDAR MODE ══════════════════════════════════════════════════════ */}
      {mode === 'calendar' && (
        <>
          {/* Empty state */}
          {items.length === 0 && (
            <div className="rounded-2xl p-10 flex flex-col items-center text-center mb-6" style={{ background: 'var(--card)', border: '2px dashed var(--card-border)' }}>
              <Shirt size={36} className="mb-3" style={{ color: 'var(--muted)' }} />
              <p className="font-semibold mb-1" style={{ color: 'var(--foreground)' }}>No wardrobe items yet</p>
              <p className="text-sm mb-5" style={{ color: 'var(--muted)' }}>Add clothes first, then plan your outfits here.</p>
              <Link href="/wardrobe" className="px-5 py-2.5 rounded-xl font-semibold text-sm text-white"
                style={{ background: 'linear-gradient(to bottom, var(--primary-mid), var(--primary))' }}>
                Go to Wardrobe
              </Link>
            </div>
          )}

          {/* Calendar */}
          <div className="rounded-2xl overflow-hidden mb-5" style={{ background: 'var(--card)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-sm)' }}>
            {/* Month nav */}
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--card-border)' }}>
              <button onClick={() => navMonth(-1)} className="p-1.5 rounded-lg transition-all hover:opacity-70" style={{ color: 'var(--muted)' }}>
                <ChevronLeft size={18} />
              </button>
              <p className="font-bold" style={{ color: 'var(--foreground)' }}>{MONTHS[month]} {year}</p>
              <button onClick={() => navMonth(1)} className="p-1.5 rounded-lg transition-all hover:opacity-70" style={{ color: 'var(--muted)' }}>
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Day-of-week header */}
            <div className="grid grid-cols-7 px-4 pt-3 pb-1">
              {WDAYS.map((d) => (
                <div key={d} className="text-center text-xs font-semibold" style={{ color: 'var(--muted)' }}>{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1 px-4 pb-4">
              {Array.from({ length: firstDayOfMonth(year, month) }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: daysInMonth(year, month) }).map((_, i) => {
                const day    = i + 1;
                const key    = toKey(year, month, day);
                const isToday = year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
                const isSel  = selectedDay === day;
                const hasOutfit = plannedDates.has(key);
                const dayPlanned = plannedOutfits.filter((p) => p.date === key);
                const dotColor = dayPlanned[0] ? occColor(dayPlanned[0].occasion) : 'var(--accent)';

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(isSel ? null : day)}
                    className="aspect-square rounded-xl flex flex-col items-center justify-center transition-all relative"
                    style={{
                      background: isSel
                        ? 'linear-gradient(to bottom, var(--primary-mid), var(--primary))'
                        : hasOutfit
                        ? `${dotColor}14`
                        : 'transparent',
                      border: isSel
                        ? '1.5px solid transparent'
                        : isToday
                        ? '1.5px solid var(--accent)'
                        : '1px solid transparent',
                    }}
                  >
                    <span className="text-xs font-medium" style={{ color: isSel ? '#fff' : isToday ? 'var(--accent)' : 'var(--foreground)' }}>
                      {day}
                    </span>
                    {hasOutfit && (
                      <span
                        className="w-1.5 h-1.5 rounded-full mt-0.5"
                        style={{ background: isSel ? 'rgba(255,255,255,0.7)' : dotColor }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Planned outfits list for this month */}
          {plannedOutfits.filter((p) => p.date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)).length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--muted)' }}>
                Planned this month
              </p>
              <div className="flex flex-col gap-2">
                {plannedOutfits
                  .filter((p) => p.date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`))
                  .map((plan) => (
                    <div key={plan.id} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                      style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}>
                      {/* Date bubble */}
                      <div className="w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 text-white text-xs font-bold"
                        style={{ background: `linear-gradient(to bottom, ${occColor(plan.occasion)}, ${occColor(plan.occasion)}cc)` }}>
                        <span style={{ fontSize: 14, lineHeight: 1 }}>{plan.date.split('-')[2]}</span>
                        <span style={{ fontSize: 9, opacity: 0.9 }}>{MONTHS[parseInt(plan.date.split('-')[1]) - 1].slice(0, 3)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>{plan.title}</p>
                        <p className="text-xs" style={{ color: 'var(--muted)' }}>
                          {plan.items.slice(0, 3).map((i) => i.piece).join(' · ')}
                        </p>
                      </div>
                      <button onClick={() => removePlannedOutfit(plan.id)} className="p-1.5 rounded-full shrink-0" style={{ background: 'rgba(220,38,38,0.08)' }}>
                        <Trash2 size={12} style={{ color: '#dc2626' }} />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Tip when nothing planned */}
          {plannedOutfits.filter((p) => p.date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)).length === 0 && items.length > 0 && (
            <div className="rounded-2xl p-5 text-center" style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}>
              <CalendarDays size={28} className="mx-auto mb-3" style={{ color: 'var(--muted)' }} />
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--foreground)' }}>Nothing planned yet</p>
              <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>
                Tap any day to add an outfit, use AI Week Plan to auto-fill, or plan from each clothing item in your wardrobe.
              </p>
              <button onClick={() => setMode('ai-week')}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white flex items-center gap-2 mx-auto"
                style={{ background: 'linear-gradient(to bottom, var(--primary-mid), var(--primary))' }}>
                <Wand2 size={14} /> Try AI Week Plan
              </button>
            </div>
          )}
        </>
      )}

      {/* ══ AI WEEK PLAN MODE ══════════════════════════════════════════════════ */}
      {mode === 'ai-week' && (
        <div className="flex flex-col gap-5">
          {/* Hero CTA */}
          <div className="rounded-2xl p-5 text-white" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-mid) 100%)' }}>
            <div className="flex items-center gap-2 mb-1">
              <Wand2 size={18} /><span className="text-sm font-semibold uppercase tracking-wider opacity-80">AI Powered</span>
            </div>
            <h2 className="text-xl font-bold mb-1">Plan My Week</h2>
            <p className="text-sm opacity-80 leading-relaxed mb-4">
              Let AI pick complete outfits from your wardrobe for the entire week — Mon to Sun. Mix and match creatively.
            </p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={generateWeekPlan}
                disabled={weekLoading || items.length === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: 'rgba(255,255,255,0.95)', color: 'var(--primary)' }}
              >
                {weekLoading ? <Loader size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {weekLoading ? 'Planning your week…' : weekPlan ? 'Regenerate Week' : 'Plan My Week'}
              </button>
              {weekPlan && (
                <button
                  onClick={saveAllWeek}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90"
                  style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)' }}
                >
                  <CalendarDays size={14} /> Save All to Calendar
                </button>
              )}
            </div>
          </div>

          {/* Error */}
          {weekError && (
            <div className="px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(220,38,38,0.08)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}>
              {weekError}
            </div>
          )}

          {/* Wardrobe needed */}
          {items.length === 0 && !weekLoading && (
            <div className="rounded-2xl p-8 flex flex-col items-center text-center" style={{ background: 'var(--card)', border: '2px dashed var(--card-border)' }}>
              <Shirt size={36} className="mb-3" style={{ color: 'var(--muted)' }} />
              <p className="font-semibold mb-1" style={{ color: 'var(--foreground)' }}>Your wardrobe is empty</p>
              <p className="text-sm mb-5" style={{ color: 'var(--muted)' }}>Add clothes to your wardrobe so AI can plan outfits for you.</p>
              <Link href="/wardrobe" className="px-5 py-2.5 rounded-xl font-semibold text-sm text-white"
                style={{ background: 'linear-gradient(to bottom, var(--primary-mid), var(--primary))' }}>
                Add Clothes
              </Link>
            </div>
          )}

          {/* Loading skeleton */}
          {weekLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="rounded-2xl overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}>
                  <div className="px-4 py-3 skeleton" style={{ height: 52 }} />
                  <div className="px-4 py-3 flex flex-col gap-2">
                    {[1, 2, 3].map((j) => (
                      <div key={j} className="skeleton rounded-lg" style={{ height: 36 }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Week plan result */}
          {weekPlan && !weekLoading && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
                  Next week — {fmtDate(weekDayDate(0))} to {fmtDate(weekDayDate(6))}
                </p>
                <button onClick={generateWeekPlan} className="flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--accent)' }}>
                  <RefreshCw size={11} /> Regenerate
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {weekPlan.map((plan) => (
                  <WeekDayCard
                    key={plan.day}
                    plan={plan}
                    dateStr={weekDayDate(plan.date_offset)}
                    saved={savedDays.has(plan.date_offset)}
                    onSave={() => saveWeekDay(plan, plan.date_offset)}
                  />
                ))}
              </div>
            </>
          )}

          {/* Prompt to try */}
          {!weekPlan && !weekLoading && items.length > 0 && (
            <div className="rounded-2xl p-6 text-center" style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}>
              <Sparkles size={28} className="mx-auto mb-3" style={{ color: 'var(--accent)' }} />
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                Click <strong style={{ color: 'var(--foreground)' }}>Plan My Week</strong> above to let AI create a full 7-day outfit schedule from your {items.length} wardrobe items.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Day drawer ─────────────────────────────────────────────────────── */}
      {selectedDay && selectedKey && mode === 'calendar' && (
        <DayDrawer
          dateKey={selectedKey}
          planned={plannedOnDay}
          wardrobeItems={items.map((i) => ({ id: i.id, name: i.name, image_url: i.image_url, color_hex: i.color_hex, category: i.category }))}
          onClose={() => setSelectedDay(null)}
          onRemove={(id) => removePlannedOutfit(id)}
          onAddManual={(item) => {
            addManualToDay(selectedKey, item);
          }}
        />
      )}
    </div>
  );
}
