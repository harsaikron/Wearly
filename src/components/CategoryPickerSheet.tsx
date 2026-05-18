'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const isDesktop = mounted && window.innerWidth >= 768;

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => setVisible(true), 20);
      return () => clearTimeout(t);
    }
    setVisible(false);
  }, [open]);

  if (!mounted) return null;
  if (!open && !visible) return null;

  const content = (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: visible ? 'rgba(10,8,20,0.50)' : 'rgba(10,8,20,0)',
        backdropFilter: visible ? 'blur(16px)' : 'none',
        WebkitBackdropFilter: visible ? 'blur(16px)' : 'none',
        transition: 'background 0.3s ease, backdrop-filter 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
        alignItems: isDesktop ? 'center' : undefined,
        justifyContent: isDesktop ? 'center' : 'flex-end',
        padding: isDesktop ? 24 : 0,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: isDesktop ? 480 : undefined,
          borderRadius: isDesktop ? 24 : '28px 28px 0 0',
          background: 'var(--card)',
          paddingBottom: isDesktop ? 0 : 'env(safe-area-inset-bottom)',
          boxShadow: isDesktop
            ? '0 24px 64px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.06)'
            : '0 -8px 40px rgba(0,0,0,0.14)',
          transform: visible
            ? 'none'
            : isDesktop
              ? 'scale(0.95) translateY(8px)'
              : 'translateY(100%)',
          opacity: visible ? 1 : 0,
          transition: 'transform 0.3s cubic-bezier(0.32,0.72,0,1), opacity 0.25s ease',
        }}
      >
        {/* Mobile drag handle */}
        {!isDesktop && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4 }}>
            <div style={{ width: 44, height: 5, borderRadius: 3, background: 'rgba(0,0,0,0.13)' }} />
          </div>
        )}

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: isDesktop ? '20px 20px 16px' : '8px 18px 14px',
          borderBottom: '1px solid var(--card-border)',
        }}>
          <div>
            <div style={{ fontSize: isDesktop ? 18 : 17, fontWeight: 800, color: 'var(--foreground)', letterSpacing: '-0.02em' }}>
              What are you adding?
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              Choose a category to get started
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: 'var(--muted-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={15} style={{ color: 'var(--muted)' }} />
          </button>
        </div>

        {/* Category list */}
        <div style={{ padding: isDesktop ? '14px 20px 20px' : '12px 16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {CATEGORIES.map(({ id, emoji, label, desc, color }) => (
            <button
              key={id}
              onClick={() => { onPick(id); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '13px 16px', borderRadius: 16,
                border: '1.5px solid',
                borderColor: `${color}18`,
                background: `${color}07`,
                cursor: 'pointer', textAlign: 'left',
                transition: 'all 0.15s ease',
                width: '100%',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = `${color}12`;
                (e.currentTarget as HTMLButtonElement).style.borderColor = `${color}30`;
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = `${color}07`;
                (e.currentTarget as HTMLButtonElement).style.borderColor = `${color}18`;
                (e.currentTarget as HTMLButtonElement).style.transform = '';
              }}
            >
              {/* Icon */}
              <div style={{ width: 44, height: 44, borderRadius: 14, background: `${color}16`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 22 }}>{emoji}</span>
              </div>
              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>{label}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{desc}</div>
              </div>
              {/* Arrow */}
              <div style={{ width: 26, height: 26, borderRadius: 8, background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                  <path d="M4.5 2.5L8 6L4.5 9.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
