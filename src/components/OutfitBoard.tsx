'use client';

import Image from 'next/image';
import { OutfitSuggestion } from '@/types';
import { occasionLabel } from '@/lib/utils';
import { Sparkles } from 'lucide-react';

interface Props {
  suggestion: OutfitSuggestion;
}

export default function OutfitBoard({ suggestion }: Props) {
  const items = Object.entries(suggestion.outfit).filter(([, v]) => v);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 flex items-center gap-3"
        style={{ borderBottom: '1px solid var(--card-border)' }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'var(--accent-muted)' }}
        >
          <Sparkles size={16} style={{ color: 'var(--accent)' }} />
        </div>
        <div>
          <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>
            Today&apos;s Outfit
          </p>
          <span className="tag-pill">{occasionLabel(suggestion.occasion)}</span>
        </div>
      </div>

      {/* Outfit items grid */}
      <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {items.map(([slot, item]) => (
          <div key={slot} className="flex flex-col items-center gap-2">
            <div
              className="relative w-full aspect-square rounded-xl overflow-hidden"
              style={{ background: 'var(--muted-bg)' }}
            >
              {item && (
                <Image
                  src={item.image_url}
                  alt={item.name}
                  fill
                  className="object-cover"
                  sizes="200px"
                />
              )}
            </div>
            <div className="text-center">
              <p className="text-xs font-medium capitalize" style={{ color: 'var(--foreground)' }}>
                {slot}
              </p>
              {item && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                  {item.name}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Color pairs */}
      <div
        className="px-4 py-3"
        style={{ borderTop: '1px solid var(--card-border)' }}
      >
        <p className="text-xs font-semibold mb-2" style={{ color: 'var(--muted)' }}>
          COLOR PAIRING
        </p>
        <div className="flex flex-wrap gap-3">
          {suggestion.color_pairs.map((pair, i) => (
            <div key={i} className="flex items-center gap-2">
              <span
                className="w-5 h-5 rounded-full border border-white/10"
                style={{ background: pair.hex1 }}
                title={pair.item1}
              />
              <span className="text-xs" style={{ color: 'var(--muted)' }}>+</span>
              <span
                className="w-5 h-5 rounded-full border border-white/10"
                style={{ background: pair.hex2 }}
                title={pair.item2}
              />
              <span className="text-xs" style={{ color: 'var(--muted)' }}>
                {pair.item1} × {pair.item2}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* AI reason */}
      <div
        className="px-4 py-3"
        style={{ borderTop: '1px solid var(--card-border)', background: 'var(--accent-muted)' }}
      >
        <p className="text-xs italic" style={{ color: 'var(--accent-light)' }}>
          &quot;{suggestion.reason}&quot;
        </p>
        {suggestion.style_tip && (
          <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
            Tip: {suggestion.style_tip}
          </p>
        )}
      </div>
    </div>
  );
}
