'use client';

import { useState } from 'react';
import Image from 'next/image';
import { mockOutfitHistory } from '@/lib/mock-data';
import { Outfit } from '@/types';
import { occasionLabel, formatDate, daysAgo } from '@/lib/utils';
import { Clock, Repeat, Trash2, TrendingUp } from 'lucide-react';

export default function HistoryPage() {
  const [history, setHistory] = useState<Outfit[]>(mockOutfitHistory);
  const [selected, setSelected] = useState<Outfit | null>(null);

  function removeEntry(id: string) {
    setHistory((prev) => prev.filter((o) => o.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  const totalWears = history.length;
  const uniqueOccasions = [...new Set(history.map((o) => o.occasion))].length;
  const mostRecentDays = history[0]?.worn_date ? daysAgo(history[0].worn_date) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Outfit History</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          Track what you wore. Wearly avoids suggesting repeated outfits.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Outfits Worn', value: totalWears, icon: Clock, color: '#c9a84c' },
          { label: 'Occasions Covered', value: uniqueOccasions, icon: TrendingUp, color: '#7c9cbf' },
          { label: 'Days Since Last Wear', value: mostRecentDays, icon: Repeat, color: '#a0c4a0' },
        ].map((stat) => (
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* History list */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          {history.length === 0 ? (
            <div
              className="rounded-2xl p-12 text-center"
              style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
            >
              <Clock size={32} className="mx-auto mb-3" style={{ color: 'var(--muted)' }} />
              <p style={{ color: 'var(--muted)' }}>No outfit history yet. Start wearing outfits!</p>
            </div>
          ) : (
            history.map((outfit) => (
              <div
                key={outfit.id}
                onClick={() => setSelected(outfit)}
                className="hover-glow cursor-pointer rounded-2xl overflow-hidden transition-all"
                style={{
                  background: 'var(--card)',
                  border: selected?.id === outfit.id
                    ? '1.5px solid #c9a84c'
                    : '1px solid var(--card-border)',
                }}
              >
                <div className="flex items-center gap-4 p-4">
                  {/* Outfit thumbnails */}
                  <div className="flex -space-x-3">
                    {outfit.items.slice(0, 4).map((item, i) => (
                      <div
                        key={item.id}
                        className="relative w-12 h-14 rounded-lg overflow-hidden border-2"
                        style={{ borderColor: 'var(--background)', zIndex: outfit.items.length - i }}
                      >
                        <Image
                          src={item.image_url}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>
                        {outfit.name}
                      </p>
                      <span className="tag-pill">{occasionLabel(outfit.occasion)}</span>
                    </div>
                    {outfit.worn_date && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                        {formatDate(outfit.worn_date)} · {daysAgo(outfit.worn_date)} days ago
                      </p>
                    )}
                    {/* Colour palette */}
                    <div className="flex gap-1.5 mt-2">
                      {outfit.color_palette.map((c) => (
                        <div
                          key={c.hex}
                          className="w-4 h-4 rounded-full border"
                          style={{ background: c.hex, borderColor: 'rgba(255,255,255,0.15)' }}
                          title={`${c.name} ${c.hex}`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 items-end">
                    <button
                      onClick={(e) => { e.stopPropagation(); removeEntry(outfit.id); }}
                      className="p-1.5 rounded-lg transition-all hover:bg-red-500/10"
                      style={{ color: 'var(--muted)' }}
                      title="Remove from history"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* AI reason */}
                {outfit.ai_reason && (
                  <div
                    className="px-4 py-2 text-xs italic"
                    style={{
                      borderTop: '1px solid var(--card-border)',
                      color: 'var(--muted)',
                      background: 'var(--muted-bg)',
                    }}
                  >
                    &quot;{outfit.ai_reason}&quot;
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Side: detail + repeat avoidance */}
        <div className="flex flex-col gap-4">
          {selected ? (
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
            >
              <div
                className="px-4 py-3"
                style={{ borderBottom: '1px solid var(--card-border)' }}
              >
                <p className="font-semibold text-sm">Outfit Details</p>
              </div>
              <div className="p-4 flex flex-col gap-4">
                <div>
                  <p className="text-sm font-semibold">{selected.name}</p>
                  <span className="tag-pill mt-1 inline-block">{occasionLabel(selected.occasion)}</span>
                </div>

                {selected.worn_date && (
                  <div>
                    <p className="text-xs font-semibold mb-1" style={{ color: 'var(--muted)' }}>WORN ON</p>
                    <p className="text-sm">{formatDate(selected.worn_date)}</p>
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--muted)' }}>ITEMS</p>
                  <div className="flex flex-col gap-2">
                    {selected.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-3">
                        <div
                          className="relative w-10 h-10 rounded-lg overflow-hidden"
                          style={{ background: 'var(--muted-bg)' }}
                        >
                          <Image src={item.image_url} alt={item.name} fill className="object-cover" sizes="40px" />
                        </div>
                        <div>
                          <p className="text-xs font-medium">{item.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ background: item.color_hex }}
                            />
                            <span className="text-xs" style={{ color: 'var(--muted)' }}>{item.color_hex}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {selected.ai_reason && (
                  <div
                    className="rounded-xl p-3 text-xs italic"
                    style={{ background: 'var(--accent-muted)', color: 'var(--accent-light)' }}
                  >
                    &quot;{selected.ai_reason}&quot;
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div
              className="rounded-2xl p-6 text-center"
              style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
            >
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                Click an outfit to see details.
              </p>
            </div>
          )}

          {/* Repeat avoidance notice */}
          <div
            className="rounded-2xl p-4"
            style={{
              background: 'linear-gradient(135deg, rgba(201,168,76,0.1), rgba(201,168,76,0.03))',
              border: '1px solid rgba(201,168,76,0.2)',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Repeat size={14} style={{ color: 'var(--accent)' }} />
              <p className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>Repeat Protection</p>
            </div>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              Wearly automatically avoids suggesting outfits worn in the last 7 days. Your AI Stylist always picks something fresh.
            </p>
          </div>

          {/* Colour frequency */}
          <div
            className="rounded-2xl p-4"
            style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
          >
            <p className="text-xs font-semibold mb-3" style={{ color: 'var(--muted)' }}>
              COLOUR FREQUENCY
            </p>
            {[
              { hex: '#FFFFFF', name: 'White', count: 8 },
              { hex: '#1E2A38', name: 'Navy', count: 6 },
              { hex: '#2B2B2B', name: 'Black', count: 5 },
              { hex: '#D8C7A3', name: 'Beige', count: 3 },
            ].map((c) => (
              <div key={c.hex} className="flex items-center gap-3 mb-2">
                <div
                  className="w-5 h-5 rounded-full shrink-0 border"
                  style={{ background: c.hex, borderColor: 'rgba(255,255,255,0.15)' }}
                />
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-0.5">
                    <span style={{ color: 'var(--foreground)' }}>{c.name}</span>
                    <span style={{ color: 'var(--muted)' }}>{c.count}×</span>
                  </div>
                  <div
                    className="h-1 rounded-full"
                    style={{ background: 'var(--muted-bg)' }}
                  >
                    <div
                      className="h-1 rounded-full"
                      style={{ width: `${(c.count / 10) * 100}%`, background: 'var(--accent)' }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
