'use client';
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export type AddCategory = 'makeup' | 'fragrance' | 'grooming' | 'clothing' | 'accessories';

const CATEGORIES: { id: AddCategory; emoji: string; label: string; desc: string; color: string }[] = [
  { id: 'clothing',    emoji: '👕', label: 'Clothing',     desc: 'Shirts · Pants · Dresses · Shoes',  color: '#2C4A1E' },
  { id: 'accessories', emoji: '💍', label: 'Accessories',  desc: 'Watches · Bags · Jewellery',         color: '#b45309' },
  { id: 'makeup',      emoji: '💄', label: 'Makeup',       desc: 'Lipstick · Foundation · Eyeshadow',  color: '#C42830' },
  { id: 'fragrance',   emoji: '🌸', label: 'Fragrance',    desc: 'Eau de Parfum · Cologne · Mist',     color: '#d97706' },
  { id: 'grooming',    emoji: '🧴', label: 'Grooming',     desc: 'Skincare · Haircare · Body',         color: '#10b981' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (cat: AddCategory) => void;
}

export default function CategoryPickerSheet({ open, onClose, onPick }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    } else {
      setVisible(false);
      const t = setTimeout(() => { document.body.style.overflow = ''; }, 380);
      return () => clearTimeout(t);
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open && !visible) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: visible ? 'rgba(10,8,20,0.55)' : 'rgba(10,8,20,0)',
        backdropFilter: visible ? 'blur(5px)' : 'none',
        WebkitBackdropFilter: visible ? 'blur(5px)' : 'none',
        transition: 'background 0.35s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          borderRadius: '28px 28px 0 0',
          background: '#fff',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.38s cubic-bezier(0.32,0.72,0,1)',
          overflow: 'hidden',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <div style={{ width: 44, height: 5, borderRadius: 3, background: 'rgba(0,0,0,0.13)' }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 18px 14px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--foreground)', letterSpacing: '-0.02em' }}>What are you adding?</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Choose a category to get started</div>
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 12, border: 'none', background: 'rgba(0,0,0,0.05)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} style={{ color: 'var(--muted)' }} />
          </button>
        </div>

        {/* Category list */}
        <div style={{ padding: '12px 16px 20px', display: 'flex', flexDirection: 'column', gap: 9 }}>
          {CATEGORIES.map(({ id, emoji, label, desc, color }) => (
            <button
              key={id}
              onClick={() => { onPick(id); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px', borderRadius: 18,
                border: '1.5px solid rgba(0,0,0,0.07)',
                background: `${color}07`,
                cursor: 'pointer', textAlign: 'left',
                transition: 'all 0.15s cubic-bezier(0.34,1.56,0.64,1)',
              }}
              onTouchStart={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)'; }}
              onTouchEnd={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; }}
            >
              {/* Icon circle */}
              <div style={{ width: 48, height: 48, borderRadius: 16, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 24 }}>{emoji}</span>
              </div>
              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)' }}>{label}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{desc}</div>
              </div>
              {/* Arrow */}
              <div style={{ width: 28, height: 28, borderRadius: 9, background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M4.5 2.5L8 6L4.5 9.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
