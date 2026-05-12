'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useWardrobeStore } from '@/store/wardrobe';
import { occasionLabel, formatDate, daysAgo } from '@/lib/utils';
import { Clock, Repeat, Trash2, TrendingUp, Shirt } from 'lucide-react';

export default function HistoryPage() {
  const { history, removeFromHistory } = useWardrobeStore();

  const totalWears     = history.length;
  const uniqueOccasions = [...new Set(history.map((o) => o.occasion))].length;
  const mostRecentDays = history[0]?.worn_date ? daysAgo(history[0].worn_date) : 0;

  // Colour frequency across all history outfits
  const colourMap: Record<string, { name: string; count: number }> = {};
  history.forEach((o) => {
    o.color_palette?.forEach((c) => {
      colourMap[c.hex] = { name: c.name, count: (colourMap[c.hex]?.count ?? 0) + 1 };
    });
    o.items?.forEach((i) => {
      colourMap[i.color_hex] = { name: i.color_name, count: (colourMap[i.color_hex]?.count ?? 0) + 1 };
    });
  });
  const topColours = Object.entries(colourMap)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 4);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Outfit History</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          {history.length === 0 ? 'No outfits logged yet. Mark outfits as worn from the AI Stylist or Planner.' : 'Your wear log. Wearly avoids repeating outfits automatically.'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Outfits Worn', value: totalWears, icon: Clock, color: '#c9a84c' },
          { label: 'Occasions Covered', value: uniqueOccasions, icon: TrendingUp, color: '#7c9cbf' },
          { label: 'Days Since Last Wear', value: mostRecentDays, icon: Repeat, color: '#a0c4a0' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl p-4 flex items-center gap-3" style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}>
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
        {/* History list */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          {history.length === 0 ? (
            <div className="rounded-2xl p-14 flex flex-col items-center text-center" style={{ background: 'var(--card)', border: '2px dashed var(--card-border)' }}>
              <Shirt size={40} className="mb-4" style={{ color: 'var(--muted)' }} />
              <p className="font-semibold mb-1">No wear history yet</p>
              <p className="text-sm mb-5" style={{ color: 'var(--muted)' }}>
                When the AI Stylist suggests an outfit, mark it as worn and it will appear here.
              </p>
              <Link href="/stylist" className="px-5 py-2.5 rounded-xl font-semibold text-sm" style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c96a)', color: '#000' }}>
                Ask AI Stylist
              </Link>
            </div>
          ) : (
            history.map((outfit) => (
              <div key={outfit.id} className="hover-glow rounded-2xl overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}>
                <div className="flex items-center gap-4 p-4">
                  {/* Thumbnails */}
                  <div className="flex -space-x-3">
                    {(outfit.items ?? []).slice(0, 4).map((item, i) => (
                      <div key={item.id} className="relative w-12 h-14 rounded-lg overflow-hidden border-2" style={{ borderColor: 'var(--background)', zIndex: 4 - i }}>
                        <Image src={item.image_url} alt={item.name} fill className="object-cover" sizes="48px" />
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{outfit.name}</p>
                      <span className="tag-pill">{occasionLabel(outfit.occasion)}</span>
                    </div>
                    {outfit.worn_date && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                        {formatDate(outfit.worn_date)} · {daysAgo(outfit.worn_date)}d ago
                      </p>
                    )}
                    <div className="flex gap-1.5 mt-2">
                      {(outfit.items ?? []).map((i) => (
                        <div key={i.id} className="w-4 h-4 rounded-full border" style={{ background: i.color_hex, borderColor: 'rgba(255,255,255,0.15)' }} title={i.color_name} />
                      ))}
                    </div>
                  </div>
                  <button onClick={() => removeFromHistory(outfit.id)} className="p-1.5 rounded-lg hover:bg-red-500/10" style={{ color: 'var(--muted)' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
                {outfit.ai_reason && (
                  <div className="px-4 py-2 text-xs italic" style={{ borderTop: '1px solid var(--card-border)', color: 'var(--muted)', background: 'var(--muted-bg)' }}>
                    &quot;{outfit.ai_reason}&quot;
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Right: repeat notice + colour frequency */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.1), rgba(201,168,76,0.03))', border: '1px solid rgba(201,168,76,0.2)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Repeat size={14} style={{ color: 'var(--accent)' }} />
              <p className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>Repeat Protection</p>
            </div>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              Wearly automatically avoids suggesting outfits worn in the last 7 days. Your AI Stylist always picks something fresh.
            </p>
          </div>

          {topColours.length > 0 && (
            <div className="rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}>
              <p className="text-xs font-semibold mb-3" style={{ color: 'var(--muted)' }}>COLOUR FREQUENCY</p>
              {topColours.map(([hex, { name, count }]) => (
                <div key={hex} className="flex items-center gap-3 mb-2">
                  <div className="w-5 h-5 rounded-full shrink-0 border" style={{ background: hex, borderColor: 'rgba(255,255,255,0.15)' }} />
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-0.5">
                      <span>{name}</span>
                      <span style={{ color: 'var(--muted)' }}>{count}×</span>
                    </div>
                    <div className="h-1 rounded-full" style={{ background: 'var(--muted-bg)' }}>
                      <div className="h-1 rounded-full" style={{ width: `${Math.min(100, count * 20)}%`, background: 'var(--accent)' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
