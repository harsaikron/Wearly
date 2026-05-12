'use client';

import { useState } from 'react';
import { mockOutfitHistory, mockClothingItems } from '@/lib/mock-data';
import { occasionLabel } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Sparkles, CalendarDays } from 'lucide-react';
import Image from 'next/image';

const EVENT_TYPES = ['workday', 'weekend', 'event', 'birthday', 'dinner', 'travel', 'casual'] as const;
type EventType = typeof EVENT_TYPES[number];

const EVENT_COLORS: Record<EventType, string> = {
  workday:  '#4a90d9',
  weekend:  '#7ec97e',
  event:    '#c9a84c',
  birthday: '#d97b7b',
  dinner:   '#b07cc9',
  travel:   '#7bbbc9',
  casual:   '#6b6b7b',
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

interface DayData {
  eventType?: EventType;
  outfitIndex?: number;
}

export default function PlannerPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [dayData, setDayData] = useState<Record<string, DayData>>({});
  const [assignEvent, setAssignEvent] = useState<EventType>('workday');
  const [assignOutfit, setAssignOutfit] = useState<number>(0);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  function navMonth(dir: -1 | 1) {
    const d = new Date(year, month + dir, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
    setSelectedDay(null);
  }

  function key(day: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  function assignDay() {
    if (!selectedDay) return;
    setDayData((prev) => ({
      ...prev,
      [key(selectedDay)]: { eventType: assignEvent, outfitIndex: assignOutfit },
    }));
  }

  function aiAutoFill() {
    const newData: Record<string, DayData> = {};
    for (let d = 1; d <= daysInMonth; d++) {
      const dow = new Date(year, month, d).getDay();
      const isWeekend = dow === 0 || dow === 6;
      newData[key(d)] = {
        eventType: isWeekend ? 'weekend' : 'workday',
        outfitIndex: d % mockOutfitHistory.length,
      };
    }
    setDayData((prev) => ({ ...prev, ...newData }));
  }

  const selectedKey = selectedDay ? key(selectedDay) : null;
  const selectedData = selectedKey ? dayData[selectedKey] : null;
  const selectedOutfit = selectedData?.outfitIndex !== undefined
    ? mockOutfitHistory[selectedData.outfitIndex]
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Calendar Planner</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            Plan your outfits for the month ahead.
          </p>
        </div>
        <button
          onClick={aiAutoFill}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c96a)', color: '#000' }}
        >
          <Sparkles size={15} />
          AI Auto-fill Month
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div
          className="lg:col-span-2 rounded-2xl overflow-hidden"
          style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
        >
          {/* Month nav */}
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid var(--card-border)' }}
          >
            <button
              onClick={() => navMonth(-1)}
              className="p-1.5 rounded-lg transition-all hover:bg-[var(--muted-bg)]"
              style={{ color: 'var(--muted)' }}
            >
              <ChevronLeft size={18} />
            </button>
            <p className="font-semibold">
              {MONTH_NAMES[month]} {year}
            </p>
            <button
              onClick={() => navMonth(1)}
              className="p-1.5 rounded-lg transition-all hover:bg-[var(--muted-bg)]"
              style={{ color: 'var(--muted)' }}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 px-4 pt-3 pb-1">
            {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d) => (
              <div key={d} className="text-center text-xs font-semibold" style={{ color: 'var(--muted)' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-1 px-4 pb-4">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const k = key(day);
              const data = dayData[k];
              const isToday = year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
              const isSelected = selectedDay === day;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className="relative aspect-square rounded-xl flex flex-col items-center justify-center transition-all"
                  style={{
                    background: isSelected
                      ? 'rgba(201,168,76,0.2)'
                      : data
                      ? `${EVENT_COLORS[data.eventType!]}18`
                      : 'transparent',
                    border: isSelected
                      ? '1.5px solid #c9a84c'
                      : isToday
                      ? '1.5px solid rgba(201,168,76,0.4)'
                      : '1px solid transparent',
                  }}
                >
                  <span
                    className="text-xs font-medium"
                    style={{ color: isToday ? 'var(--accent)' : 'var(--foreground)' }}
                  >
                    {day}
                  </span>
                  {data?.eventType && (
                    <span
                      className="w-1.5 h-1.5 rounded-full mt-0.5"
                      style={{ background: EVENT_COLORS[data.eventType] }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div
            className="px-5 py-3 flex flex-wrap gap-3"
            style={{ borderTop: '1px solid var(--card-border)' }}
          >
            {EVENT_TYPES.map((et) => (
              <div key={et} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: EVENT_COLORS[et] }}
                />
                <span className="text-xs capitalize" style={{ color: 'var(--muted)' }}>{et}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Side panel */}
        <div className="flex flex-col gap-4">
          {selectedDay ? (
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
            >
              <div
                className="px-4 py-3 flex items-center gap-2"
                style={{ borderBottom: '1px solid var(--card-border)' }}
              >
                <CalendarDays size={16} style={{ color: 'var(--accent)' }} />
                <p className="font-semibold text-sm">
                  {MONTH_NAMES[month]} {selectedDay}, {year}
                </p>
              </div>

              <div className="p-4 flex flex-col gap-4">
                {/* Event type */}
                <div>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--muted)' }}>EVENT TYPE</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {EVENT_TYPES.map((et) => (
                      <button
                        key={et}
                        onClick={() => setAssignEvent(et)}
                        className="px-2 py-1.5 rounded-lg text-xs capitalize transition-all"
                        style={{
                          background: assignEvent === et ? `${EVENT_COLORS[et]}25` : 'var(--muted-bg)',
                          border: assignEvent === et ? `1px solid ${EVENT_COLORS[et]}` : '1px solid var(--card-border)',
                          color: assignEvent === et ? EVENT_COLORS[et] : 'var(--muted)',
                        }}
                      >
                        {et}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Outfit pick */}
                <div>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--muted)' }}>SELECT OUTFIT</p>
                  <div className="flex flex-col gap-2">
                    {mockOutfitHistory.map((outfit, idx) => (
                      <button
                        key={outfit.id}
                        onClick={() => setAssignOutfit(idx)}
                        className="flex items-center gap-3 p-2 rounded-xl transition-all"
                        style={{
                          background: assignOutfit === idx ? 'var(--accent-muted)' : 'var(--muted-bg)',
                          border: assignOutfit === idx ? '1px solid rgba(201,168,76,0.4)' : '1px solid transparent',
                        }}
                      >
                        <div className="flex gap-1">
                          {outfit.items.slice(0, 3).map((item) => (
                            <div
                              key={item.id}
                              className="relative w-8 h-8 rounded-lg overflow-hidden"
                              style={{ background: 'var(--card-border)' }}
                            >
                              <Image src={item.image_url} alt={item.name} fill className="object-cover" sizes="32px" />
                            </div>
                          ))}
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>
                            {outfit.name}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--muted)' }}>
                            {occasionLabel(outfit.occasion)}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={assignDay}
                  className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c96a)', color: '#000' }}
                >
                  Assign Outfit
                </button>

                {/* Show assigned */}
                {selectedData && (
                  <div
                    className="rounded-xl p-3"
                    style={{ background: 'var(--accent-muted)', border: '1px solid rgba(201,168,76,0.2)' }}
                  >
                    <p className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
                      Planned: {selectedData.eventType}
                    </p>
                    {selectedOutfit && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                        {selectedOutfit.name}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div
              className="rounded-2xl p-6 text-center"
              style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
            >
              <CalendarDays size={32} className="mx-auto mb-3" style={{ color: 'var(--muted)' }} />
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                Click a day to assign an outfit or event type.
              </p>
            </div>
          )}

          {/* Tips */}
          <div
            className="rounded-2xl p-4"
            style={{
              background: 'linear-gradient(135deg, rgba(201,168,76,0.1), rgba(201,168,76,0.03))',
              border: '1px solid rgba(201,168,76,0.2)',
            }}
          >
            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--accent)' }}>Pro tip</p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              Use AI Auto-fill to instantly plan your whole month based on weekdays, events, and weather patterns.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
