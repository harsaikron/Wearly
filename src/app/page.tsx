'use client';

import { useState } from 'react';
import WeatherWidget from '@/components/WeatherWidget';
import OutfitBoard from '@/components/OutfitBoard';
import ClothingCard from '@/components/ClothingCard';
import { mockWeather, mockTodaySuggestion, mockClothingItems } from '@/lib/mock-data';
import { getCurrentSeason } from '@/lib/utils';
import { CalendarDays, Shirt, Sparkles, RefreshCw } from 'lucide-react';
import Link from 'next/link';

const today = new Date().toLocaleDateString('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
});

const quickStats = [
  { label: 'Items in Wardrobe', value: '24', icon: Shirt, color: '#c9a84c' },
  { label: 'Outfits This Month', value: '12', icon: CalendarDays, color: '#7c9cbf' },
  { label: 'AI Suggestions Used', value: '8', icon: Sparkles, color: '#a0c4a0' },
];

export default function DashboardPage() {
  const [suggestion, setSuggestion] = useState(mockTodaySuggestion);
  const [refreshing, setRefreshing] = useState(false);

  function refreshOutfit() {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Hero header */}
      <div className="mb-8">
        <p className="text-sm" style={{ color: 'var(--muted)' }}>{today} · {getCurrentSeason()}</p>
        <h1 className="text-3xl font-bold mt-1">
          Good morning <span className="gold-text">✨</span>
        </h1>
        <p className="text-base mt-1" style={{ color: 'var(--muted)' }}>
          Here&apos;s your personalised outfit for today.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {quickStats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${stat.color}20` }}
            >
              <stat.icon size={18} style={{ color: stat.color }} />
            </div>
            <div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Today's outfit */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Today&apos;s Outfit</h2>
              <button
                onClick={refreshOutfit}
                disabled={refreshing}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-all"
                style={{
                  background: 'var(--accent-muted)',
                  color: 'var(--accent)',
                  border: '1px solid rgba(201,168,76,0.3)',
                }}
              >
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
            <OutfitBoard suggestion={suggestion} />
          </div>

          {/* Recently added items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Recently Added</h2>
              <Link
                href="/wardrobe"
                className="text-sm"
                style={{ color: 'var(--accent)' }}
              >
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {mockClothingItems.slice(0, 3).map((item) => (
                <ClothingCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          <WeatherWidget weather={mockWeather} />

          {/* Quick actions */}
          <div
            className="rounded-2xl p-4"
            style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
          >
            <p className="text-sm font-semibold mb-3">Quick Actions</p>
            <div className="flex flex-col gap-2">
              {[
                { href: '/wardrobe', label: 'Add clothing item', icon: Shirt },
                { href: '/stylist', label: 'Ask AI Stylist', icon: Sparkles },
                { href: '/planner', label: 'Plan this week', icon: CalendarDays },
              ].map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-[var(--muted-bg)]"
                  style={{ color: 'var(--foreground)' }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: 'var(--accent-muted)' }}
                  >
                    <Icon size={15} style={{ color: 'var(--accent)' }} />
                  </div>
                  <span className="text-sm">{label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Season tip */}
          <div
            className="rounded-2xl p-4"
            style={{
              background: 'linear-gradient(135deg, rgba(201,168,76,0.12), rgba(201,168,76,0.04))',
              border: '1px solid rgba(201,168,76,0.25)',
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--accent)' }}>
              Singapore Tip
            </p>
            <p className="text-sm" style={{ color: 'var(--foreground)' }}>
              Singapore&apos;s heat calls for lightweight fabrics — linen, cotton, and moisture-wicking blends. Light colours reflect heat; avoid heavy layering.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
