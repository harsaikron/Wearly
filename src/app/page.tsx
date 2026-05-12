'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import OutfitBoard from '@/components/OutfitBoard';
import ClothingCard from '@/components/ClothingCard';
import WeatherWidget from '@/components/WeatherWidget';
import { useWardrobeStore } from '@/store/wardrobe';
import { WeatherData, OutfitSuggestion } from '@/types';
import { Shirt, CalendarDays, Sparkles, RefreshCw, Plus } from 'lucide-react';

const SINGAPORE_WEATHER: WeatherData = {
  temperature: 31, feels_like: 36, description: 'Humid and sunny',
  humidity: 84, wind_speed: 12, city: 'Singapore', icon: '01d', condition: 'hot',
};

export default function DashboardPage() {
  const { items, history } = useWardrobeStore();
  const [weather] = useState<WeatherData>(SINGAPORE_WEATHER);
  const [suggestion, setSuggestion] = useState<OutfitSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [today] = useState(
    new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  );

  const hasItems = items.length > 0;

  async function fetchSuggestion() {
    if (!hasItems) return;
    setLoading(true);
    try {
      const res = await fetch('/api/stylist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: "What's the best outfit for today?",
          wardrobe: items.map((i) => ({
            name: i.name, category: i.category,
            color_hex: i.color_hex, color_name: i.color_name, tags: i.tags,
          })),
          weather: {
            temperature: weather.temperature, description: weather.description,
            condition: weather.condition, city: weather.city,
          },
        }),
      });
      if (!res.ok) return;
      const data = await res.json();

      // Map AI response item names back to actual ClothingItem objects
      const findItem = (name: string | null) =>
        name ? items.find((i) => i.name.toLowerCase() === name.toLowerCase()) ?? items.find((i) => i.name.toLowerCase().includes(name.toLowerCase().split(' ')[0])) : undefined;

      const outfitItems = {
        shirt:  findItem(data.outfit?.shirt),
        pants:  findItem(data.outfit?.pants),
        shoes:  findItem(data.outfit?.shoes),
        jacket: findItem(data.outfit?.jacket),
        watch:  findItem(data.outfit?.watch),
      };

      // Only include slots that were resolved
      const resolvedOutfit = Object.fromEntries(
        Object.entries(outfitItems).filter(([, v]) => v)
      ) as OutfitSuggestion['outfit'];

      // Fallback: pick one from each main category if AI couldn't match
      if (!resolvedOutfit.shirt) {
        resolvedOutfit.shirt = items.find((i) => ['shirt','tshirt','formal_shirt'].includes(i.category));
      }
      if (!resolvedOutfit.pants) {
        resolvedOutfit.pants = items.find((i) => ['pants','jeans','shorts'].includes(i.category));
      }
      if (!resolvedOutfit.shoes) {
        resolvedOutfit.shoes = items.find((i) => ['shoes','sneakers','loafers'].includes(i.category));
      }

      setSuggestion({
        outfit: resolvedOutfit,
        color_pairs: data.color_pairs ?? [],
        occasion: data.occasion ?? 'casual',
        reason: data.message ?? '',
        style_tip: data.style_tip ?? '',
      });
    } catch {
      // Silently fail — user sees the empty state
    } finally {
      setLoading(false);
    }
  }

  // Auto-fetch suggestion when wardrobe has items
  useEffect(() => {
    if (hasItems && !suggestion) fetchSuggestion();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasItems]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <p className="text-sm" style={{ color: 'var(--muted)' }}>{today} · Singapore</p>
        <h1 className="text-3xl font-bold mt-1">
          Good morning <span className="gold-text">✨</span>
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          {hasItems
            ? "Here's your AI outfit suggestion for today."
            : 'Add clothes to your wardrobe to get personalised outfit suggestions.'}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Items in Wardrobe', value: items.length, icon: Shirt, color: '#c9a84c' },
          { label: 'Outfits This Month', value: history.filter((o) => o.worn_date?.startsWith(new Date().toISOString().slice(0, 7))).length, icon: CalendarDays, color: '#7c9cbf' },
          { label: 'AI Suggestions', value: suggestion ? 1 : 0, icon: Sparkles, color: '#a0c4a0' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${stat.color}20` }}>
              <stat.icon size={18} style={{ color: stat.color }} />
            </div>
            <div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Outfit suggestion */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Today&apos;s Outfit</h2>
              {hasItems && (
                <button
                  onClick={fetchSuggestion}
                  disabled={loading}
                  className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-all"
                  style={{ background: 'var(--accent-muted)', color: 'var(--accent)', border: '1px solid rgba(201,168,76,0.3)' }}
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                  Refresh
                </button>
              )}
            </div>

            {/* Empty state */}
            {!hasItems && (
              <div
                className="rounded-2xl p-10 flex flex-col items-center text-center"
                style={{ background: 'var(--card)', border: '2px dashed var(--card-border)' }}
              >
                <Shirt size={40} className="mb-4" style={{ color: 'var(--muted)' }} />
                <p className="font-semibold mb-1">No wardrobe yet</p>
                <p className="text-sm mb-5" style={{ color: 'var(--muted)' }}>
                  Upload your clothes and the AI will suggest what to wear each day.
                </p>
                <Link
                  href="/wardrobe"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm"
                  style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c96a)', color: '#000' }}
                >
                  <Plus size={15} /> Add Clothes
                </Link>
              </div>
            )}

            {/* Loading */}
            {hasItems && loading && !suggestion && (
              <div
                className="rounded-2xl p-10 flex flex-col items-center text-center"
                style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
              >
                <Sparkles size={32} className="mb-3" style={{ color: 'var(--accent)' }} />
                <p className="text-sm" style={{ color: 'var(--muted)' }}>AI is building your outfit…</p>
              </div>
            )}

            {/* Suggestion */}
            {suggestion && !loading && <OutfitBoard suggestion={suggestion} />}
          </div>

          {/* Recently added */}
          {items.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">Recently Added</h2>
                <Link href="/wardrobe" className="text-sm" style={{ color: 'var(--accent)' }}>View all →</Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {items.slice(0, 3).map((item) => (
                  <ClothingCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          <WeatherWidget weather={weather} />

          {/* Quick actions */}
          <div className="rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}>
            <p className="text-sm font-semibold mb-3">Quick Actions</p>
            <div className="flex flex-col gap-2">
              {[
                { href: '/wardrobe', label: 'Add clothing item', icon: Shirt },
                { href: '/stylist', label: 'Ask AI Stylist', icon: Sparkles },
                { href: '/planner', label: 'Plan this week', icon: CalendarDays },
              ].map(({ href, label, icon: Icon }) => (
                <Link
                  key={href} href={href}
                  className="flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-[var(--muted-bg)]"
                  style={{ color: 'var(--foreground)' }}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-muted)' }}>
                    <Icon size={15} style={{ color: 'var(--accent)' }} />
                  </div>
                  <span className="text-sm">{label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Singapore tip */}
          <div
            className="rounded-2xl p-4"
            style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.12), rgba(201,168,76,0.04))', border: '1px solid rgba(201,168,76,0.25)' }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--accent)' }}>Singapore Tip</p>
            <p className="text-sm" style={{ color: 'var(--foreground)' }}>
              Opt for lightweight fabrics like linen and cotton. Light colours reflect heat — great for humid days.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
