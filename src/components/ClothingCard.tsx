'use client';

import Image from 'next/image';
import { ClothingItem } from '@/types';
import { categoryLabel, occasionLabel, daysAgo } from '@/lib/utils';
import { getContrastColor } from '@/lib/utils';

interface Props {
  item: ClothingItem;
  onClick?: () => void;
  selected?: boolean;
}

export default function ClothingCard({ item, onClick, selected }: Props) {
  const contrast = getContrastColor(item.color_hex);

  return (
    <div
      onClick={onClick}
      className="hover-glow cursor-pointer rounded-2xl overflow-hidden transition-all duration-200"
      style={{
        background: 'var(--card)',
        border: selected ? '2px solid var(--accent)' : '1px solid var(--card-border)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Image */}
      <div className="relative w-full h-48" style={{ background: 'var(--muted-bg)' }}>
        <Image
          src={item.image_url}
          alt={item.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 50vw, 25vw"
        />
        {/* Color badge */}
        <div
          className="absolute top-2 right-2 w-5 h-5 rounded-full border-2"
          style={{ background: item.color_hex, borderColor: 'rgba(255,255,255,0.8)' }}
          title={item.color_name}
        />
        {selected && (
          <div
            className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            Selected
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-sm leading-snug" style={{ color: 'var(--foreground)' }}>
              {item.name}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
              {categoryLabel(item.category)}
            </p>
          </div>
          <span
            className="text-xs px-1.5 py-0.5 rounded-lg font-mono shrink-0"
            style={{ background: item.color_hex, color: contrast, fontSize: 10 }}
          >
            {item.color_hex}
          </span>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mt-2">
          {item.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="tag-pill">{occasionLabel(tag)}</span>
          ))}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between mt-2 text-xs" style={{ color: 'var(--muted)' }}>
          <span>Worn {item.times_worn}×</span>
          {item.last_worn && <span>{daysAgo(item.last_worn)}d ago</span>}
        </div>
      </div>
    </div>
  );
}
