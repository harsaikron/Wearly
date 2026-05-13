'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft, Heart, ShoppingBag, Trash2, Sparkles, Leaf,
  Calendar, CheckCircle, Clock, Tag, Zap, RefreshCw,
  ShoppingCart, Star, Info, ChevronDown, ChevronUp, Edit3,
  Sun, CloudRain, Award,
} from 'lucide-react';
import { useWardrobeStore } from '@/store/wardrobe';
import { ClothingItem } from '@/types';

// ─── Carbon estimates (kg CO2e to produce) ───────────────────────────────────
const CARBON_KG: Record<string, number> = {
  tshirt: 5, shirt: 7, formal_shirt: 8, pants: 15, jeans: 33,
  shorts: 8, jacket: 20, shoes: 14, sneakers: 12, loafers: 13,
  watch: 10, belt: 4, accessory: 3,
};
function carbonForItem(category: string, timesWorn: number) {
  const total = CARBON_KG[category] ?? 8;
  const perWear = timesWorn > 0 ? (total / timesWorn).toFixed(2) : total.toFixed(2);
  const saved = timesWorn > 1 ? ((total - total / timesWorn) * 0.9).toFixed(1) : '0';
  return { total, perWear: Number(perWear), saved: Number(saved) };
}

// ─── Category display helpers ─────────────────────────────────────────────────
const CATEGORY_LABEL: Record<string, string> = {
  tshirt: 'T-Shirt', shirt: 'Shirt', formal_shirt: 'Formal Shirt',
  pants: 'Pants', jeans: 'Jeans', shorts: 'Shorts', jacket: 'Jacket',
  shoes: 'Shoes', sneakers: 'Sneakers', loafers: 'Loafers',
  watch: 'Watch', belt: 'Belt', accessory: 'Accessory',
};

// ─── Occasion colors ──────────────────────────────────────────────────────────
const OCC_COLOR: Record<string, string> = {
  office: '#6366f1', casual: '#10b981', date_night: '#ec4899',
  weekend: '#f59e0b', smart_casual: '#3b82f6', minimal: '#8b5cf6',
  luxury: '#b45309', travel: '#0ea5e9', festive: '#ef4444', gym: '#84cc16',
};

// ─── Shopping helpers ─────────────────────────────────────────────────────────
const shopeeUrl = (q: string) => `https://shopee.sg/search?keyword=${encodeURIComponent(q)}`;
const sheinUrl  = (q: string) => `https://sg.shein.com/search?q=${encodeURIComponent(q)}`;
const zaloraUrl = (q: string) => `https://www.zalora.com.sg/search/?q=${encodeURIComponent(q)}`;
const carousellUrl = (q: string) => `https://www.carousell.sg/search/${encodeURIComponent(q)}/`;

// ─── Pairing types ────────────────────────────────────────────────────────────
interface Pairing {
  role: string;
  item_name: string;
  reason: string;
  in_wardrobe: boolean;
  item_id: string | null;
  color_name: string;
  color_hex: string;
  occasion: string;
  buy_query: string;
}
interface PairingResult {
  pairings: Pairing[];
  style_tip: string;
  best_occasion: string;
  care_tip: string;
}

// ─── Wear badge ───────────────────────────────────────────────────────────────
function WearBadge({ count }: { count: number }) {
  const level = count === 0 ? 'Unused' : count < 5 ? 'Rarely worn' : count < 15 ? 'Regular' : 'Well-loved';
  const color = count === 0 ? '#dc2626' : count < 5 ? '#f59e0b' : count < 15 ? '#3b82f6' : '#10b981';
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: `${color}15`, color }}>
      {level}
    </span>
  );
}

export default function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { items, removeItem, toggleFavorite, markWornOn, updateItem } = useWardrobeStore();
  const item = items.find((i) => i.id === id) as ClothingItem | undefined;

  const [pairings, setPairings] = useState<PairingResult | null>(null);
  const [pairingLoading, setPairingLoading] = useState(false);
  const [pairingError, setPairingError] = useState('');
  const [showPairings, setShowPairings] = useState(false);
  const [wearDate, setWearDate] = useState<'today' | 'tomorrow' | null>(null);
  const [wornConfirmed, setWornConfirmed] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (item) setNotes(item.notes ?? '');
  }, [item]);

  if (!item) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Item not found.</p>
        <Link href="/wardrobe" className="mt-4 inline-block text-sm font-semibold" style={{ color: 'var(--accent)' }}>
          ← Back to Wardrobe
        </Link>
      </div>
    );
  }

  const carbon = carbonForItem(item.category, item.times_worn);
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  // ─── Pair suggestions ───────────────────────────────────────────────────────
  async function loadPairings() {
    if (pairings) { setShowPairings((v) => !v); return; }
    setPairingLoading(true);
    setPairingError('');
    setShowPairings(true);
    try {
      const res = await fetch('/api/pair-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item: { id: item!.id, name: item!.name, category: item!.category, color_name: item!.color_name, color_hex: item!.color_hex, tags: item!.tags },
          wardrobe: items.map((i) => ({ id: i.id, name: i.name, category: i.category, color_name: i.color_name, color_hex: i.color_hex, tags: i.tags })),
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPairings(data as PairingResult);
    } catch (e) {
      setPairingError(String(e));
    } finally {
      setPairingLoading(false);
    }
  }

  // ─── Mark worn ──────────────────────────────────────────────────────────────
  function confirmWear() {
    if (!wearDate) return;
    const date = wearDate === 'today' ? today : tomorrow;
    markWornOn(item!.id, date);
    setWornConfirmed(true);
    setTimeout(() => setWornConfirmed(false), 2500);
  }

  // ─── Save notes ─────────────────────────────────────────────────────────────
  function saveNotes() {
    updateItem(item!.id, { notes });
    setEditingNotes(false);
  }

  // ─── Delete ─────────────────────────────────────────────────────────────────
  function handleDelete() {
    removeItem(item!.id);
    router.push('/wardrobe');
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-10">

      {/* ── Back + action bar ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm font-semibold transition-opacity hover:opacity-70"
          style={{ color: 'var(--muted)' }}
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex items-center gap-2">
          {/* Favourite */}
          <button
            onClick={() => toggleFavorite(item.id)}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95"
            style={{
              background: item.favorite ? 'rgba(236,72,153,0.1)' : 'var(--card)',
              border: `1px solid ${item.favorite ? 'rgba(236,72,153,0.3)' : 'var(--card-border)'}`,
            }}
            title={item.favorite ? 'Remove from favourites' : 'Add to favourites'}
          >
            <Heart size={16} fill={item.favorite ? '#ec4899' : 'none'} stroke={item.favorite ? '#ec4899' : 'var(--muted)'} />
          </button>
          {/* List to sell */}
          <Link
            href="/marketplace"
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95"
            style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
            title="Sell or rent this item"
          >
            <ShoppingBag size={16} style={{ color: 'var(--muted)' }} />
          </Link>
          {/* Delete */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95"
            style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
            title="Remove from wardrobe"
          >
            <Trash2 size={16} style={{ color: '#dc2626' }} />
          </button>
        </div>
      </div>

      {/* ── Image hero ────────────────────────────────────────────────── */}
      <div
        className="w-full rounded-2xl overflow-hidden mb-5 relative"
        style={{ background: 'var(--card)', border: '1px solid var(--card-border)', aspectRatio: '4/3' }}
      >
        {item.image_url ? (
          <Image
            src={item.image_url}
            alt={item.name}
            fill
            sizes="(max-width: 640px) 100vw, 512px"
            style={{ objectFit: 'contain' }}
            priority
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ color: 'var(--muted)' }}>
            <ShoppingBag size={48} strokeWidth={1} />
          </div>
        )}
        {item.favorite && (
          <div className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(236,72,153,0.15)' }}>
            <Heart size={15} fill="#ec4899" stroke="#ec4899" />
          </div>
        )}
      </div>

      {/* ── Identity ──────────────────────────────────────────────────── */}
      <div className="mb-5">
        <div className="flex items-start justify-between gap-3 mb-1">
          <h1 className="text-xl font-bold leading-tight" style={{ color: 'var(--foreground)' }}>
            {item.name}
          </h1>
          <WearBadge count={item.times_worn} />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: 'var(--muted)' }}>
          <span>{CATEGORY_LABEL[item.category] ?? item.category}</span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full inline-block border border-white/30" style={{ background: item.color_hex }} />
            {item.color_name}
          </span>
          {item.brand && <><span>·</span><span>{item.brand}</span></>}
        </div>

        {/* Tags */}
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs font-medium px-2 py-0.5 rounded-full capitalize"
                style={{ background: `${OCC_COLOR[tag] ?? '#6366f1'}15`, color: OCC_COLOR[tag] ?? '#6366f1' }}
              >
                {tag.replace('_', ' ')}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Wear stats ────────────────────────────────────────────────── */}
      <div
        className="grid grid-cols-3 gap-3 p-4 rounded-2xl mb-5"
        style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
      >
        <div className="text-center">
          <p className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>{item.times_worn}</p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>Times worn</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
            {item.last_worn ? new Date(item.last_worn).toLocaleDateString('en', { month: 'short', day: 'numeric' }) : '—'}
          </p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>Last worn</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
            {Math.floor((Date.now() - new Date(item.created_at).getTime()) / 86400000)}d
          </p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>In wardrobe</p>
        </div>
      </div>

      {/* ── Worn dates timeline ───────────────────────────────────────── */}
      {item.worn_dates && item.worn_dates.length > 0 && (
        <div
          className="p-4 rounded-2xl mb-5"
          style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
        >
          <p className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: 'var(--muted)' }}>
            <Clock size={12} /> Wear history
          </p>
          <div className="flex flex-wrap gap-1.5">
            {[...item.worn_dates].reverse().slice(0, 12).map((d) => (
              <span
                key={d}
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(99,102,241,0.08)', color: '#6366f1' }}
              >
                {new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
              </span>
            ))}
            {item.worn_dates.length > 12 && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--muted-bg)', color: 'var(--muted)' }}>
                +{item.worn_dates.length - 12} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Mark as worn ──────────────────────────────────────────────── */}
      <div
        className="p-4 rounded-2xl mb-5"
        style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
      >
        <p className="text-sm font-semibold mb-3 flex items-center gap-1.5" style={{ color: 'var(--foreground)' }}>
          <Calendar size={14} /> Wearing this?
        </p>
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setWearDate(wearDate === 'today' ? null : 'today')}
            className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 flex items-center justify-center gap-1.5"
            style={wearDate === 'today'
              ? { background: '#6366f1', color: '#fff' }
              : { background: 'var(--muted-bg)', color: 'var(--foreground)', border: '1px solid var(--card-border)' }
            }
          >
            <Sun size={13} /> Today
          </button>
          <button
            onClick={() => setWearDate(wearDate === 'tomorrow' ? null : 'tomorrow')}
            className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 flex items-center justify-center gap-1.5"
            style={wearDate === 'tomorrow'
              ? { background: '#6366f1', color: '#fff' }
              : { background: 'var(--muted-bg)', color: 'var(--foreground)', border: '1px solid var(--card-border)' }
            }
          >
            <CloudRain size={13} /> Tomorrow
          </button>
        </div>
        {wearDate && !wornConfirmed && (
          <button
            onClick={confirmWear}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
            style={{ background: '#10b981', color: '#fff' }}
          >
            ✓ Mark as worn {wearDate}
          </button>
        )}
        {wornConfirmed && (
          <div className="w-full py-2.5 rounded-xl text-sm font-semibold text-center flex items-center justify-center gap-2" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
            <CheckCircle size={15} /> Logged! Wear count updated.
          </div>
        )}
      </div>

      {/* ── Sustainability & Carbon ────────────────────────────────────── */}
      <div
        className="p-4 rounded-2xl mb-5"
        style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(6,182,212,0.06) 100%)', border: '1px solid rgba(16,185,129,0.15)' }}
      >
        <p className="text-sm font-semibold mb-3 flex items-center gap-1.5" style={{ color: '#065f46' }}>
          <Leaf size={14} style={{ color: '#10b981' }} /> Sustainability Footprint
        </p>

        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.6)' }}>
            <p className="text-lg font-bold" style={{ color: '#065f46' }}>{carbon.total}kg</p>
            <p className="text-xs" style={{ color: '#10b981' }}>CO₂ to make</p>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.6)' }}>
            <p className="text-lg font-bold" style={{ color: item.times_worn > 0 ? '#065f46' : '#dc2626' }}>
              {carbon.perWear}kg
            </p>
            <p className="text-xs" style={{ color: '#10b981' }}>per wear</p>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.6)' }}>
            <p className="text-lg font-bold" style={{ color: '#065f46' }}>{carbon.saved}kg</p>
            <p className="text-xs" style={{ color: '#10b981' }}>CO₂ saved</p>
          </div>
        </div>

        {/* Progress bar: wear target 30 wears = excellent */}
        <div className="mb-2">
          <div className="flex justify-between text-xs mb-1" style={{ color: '#10b981' }}>
            <span>Wear goal progress</span>
            <span>{item.times_worn}/30 wears</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(16,185,129,0.2)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, (item.times_worn / 30) * 100)}%`, background: '#10b981' }}
            />
          </div>
        </div>

        <p className="text-xs" style={{ color: '#059669' }}>
          {item.times_worn === 0
            ? '⚠️ Wear this item to reduce its per-wear carbon impact.'
            : item.times_worn < 10
            ? `💡 ${30 - item.times_worn} more wears to reach the sustainable threshold.`
            : item.times_worn < 30
            ? '🌿 Great progress! Keep wearing to lower your footprint.'
            : '🏆 Excellent! This item is well-utilised — great for the planet.'}
        </p>
      </div>

      {/* ── AI Style Pairings ──────────────────────────────────────────── */}
      <div
        className="rounded-2xl mb-5 overflow-hidden"
        style={{ border: '1px solid var(--card-border)' }}
      >
        <button
          onClick={loadPairings}
          className="w-full flex items-center justify-between p-4 transition-all"
          style={{ background: 'var(--card)' }}
        >
          <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
            <Sparkles size={15} style={{ color: '#6366f1' }} />
            AI Style Pairings
            {pairings && <span className="text-xs font-normal px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>{pairings.pairings.length} matches</span>}
          </span>
          {showPairings ? <ChevronUp size={16} style={{ color: 'var(--muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--muted)' }} />}
        </button>

        {showPairings && (
          <div className="p-4 pt-0" style={{ background: 'var(--card)' }}>
            {pairingLoading && (
              <div className="py-6 text-center">
                <div className="inline-flex items-center gap-2 text-sm" style={{ color: 'var(--muted)' }}>
                  <RefreshCw size={14} className="animate-spin" /> Finding the best pairings…
                </div>
              </div>
            )}
            {pairingError && <p className="text-xs py-4 text-center" style={{ color: '#dc2626' }}>{pairingError}</p>}
            {pairings && !pairingLoading && (
              <>
                {/* Style tip */}
                <div className="mb-4 p-3 rounded-xl" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)' }}>
                  <p className="text-xs font-semibold mb-0.5" style={{ color: '#6366f1' }}>💡 Stylist tip</p>
                  <p className="text-xs" style={{ color: 'var(--foreground)' }}>{pairings.style_tip}</p>
                </div>

                {/* Pairing cards */}
                <div className="flex flex-col gap-3">
                  {pairings.pairings.map((p, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3 rounded-xl"
                      style={{
                        background: p.in_wardrobe ? 'rgba(16,185,129,0.05)' : 'var(--muted-bg)',
                        border: `1px solid ${p.in_wardrobe ? 'rgba(16,185,129,0.2)' : 'var(--card-border)'}`,
                      }}
                    >
                      {/* Color swatch */}
                      <div
                        className="w-10 h-10 rounded-xl shrink-0 mt-0.5 flex items-center justify-center"
                        style={{ background: p.color_hex ?? '#e5e7eb', border: '2px solid rgba(255,255,255,0.6)' }}
                      >
                        {p.in_wardrobe && <CheckCircle size={14} style={{ color: '#fff' }} />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                          <span className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>
                            {p.item_name}
                          </span>
                          {p.in_wardrobe
                            ? <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>In wardrobe ✓</span>
                            : <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}>Need to buy</span>
                          }
                        </div>
                        <p className="text-xs mb-1.5" style={{ color: 'var(--muted)' }}>
                          <span className="font-medium">{p.role}</span> · {p.reason}
                        </p>
                        {!p.in_wardrobe && p.buy_query && (
                          <div className="flex flex-wrap gap-1">
                            <a href={shopeeUrl(p.buy_query)} target="_blank" rel="noopener" className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#ff6130', color: '#fff' }}>Shopee</a>
                            <a href={sheinUrl(p.buy_query)}  target="_blank" rel="noopener" className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#000', color: '#fff' }}>Shein</a>
                            <a href={zaloraUrl(p.buy_query)} target="_blank" rel="noopener" className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#6366f1', color: '#fff' }}>Zalora</a>
                            <a href={carousellUrl(p.buy_query)} target="_blank" rel="noopener" className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#10b981', color: '#fff' }}>Secondhand</a>
                          </div>
                        )}
                        {p.in_wardrobe && p.item_id && (
                          <Link
                            href={`/wardrobe/${p.item_id}`}
                            className="text-xs font-medium"
                            style={{ color: '#6366f1' }}
                          >
                            View item →
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Care tip */}
                {pairings.care_tip && (
                  <div className="mt-4 p-3 rounded-xl flex items-start gap-2" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
                    <Award size={13} style={{ color: '#f59e0b', marginTop: 1, flexShrink: 0 }} />
                    <p className="text-xs" style={{ color: '#92400e' }}><span className="font-semibold">Care tip:</span> {pairings.care_tip}</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Sell / Rent CTA ───────────────────────────────────────────── */}
      <div
        className="p-4 rounded-2xl mb-5"
        style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
      >
        <p className="text-sm font-semibold mb-1 flex items-center gap-1.5" style={{ color: 'var(--foreground)' }}>
          <ShoppingCart size={14} /> Earn from this item
        </p>
        <p className="text-xs mb-3" style={{ color: 'var(--muted)' }}>
          {item.times_worn === 0
            ? "You haven't worn this yet. Consider selling it."
            : 'List it to sell or rent out to others nearby.'}
        </p>
        <div className="flex gap-2">
          <Link
            href="/marketplace"
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-center transition-all active:scale-95"
            style={{ background: '#10b981', color: '#fff' }}
          >
            Sell
          </Link>
          <Link
            href="/marketplace"
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-center transition-all active:scale-95"
            style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.2)' }}
          >
            Rent out
          </Link>
        </div>
      </div>

      {/* ── Notes ─────────────────────────────────────────────────────── */}
      <div
        className="p-4 rounded-2xl mb-5"
        style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
      >
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold flex items-center gap-1.5" style={{ color: 'var(--foreground)' }}>
            <Edit3 size={13} /> Notes
          </p>
          {!editingNotes && (
            <button onClick={() => setEditingNotes(true)} className="text-xs" style={{ color: '#6366f1' }}>
              Edit
            </button>
          )}
        </div>
        {editingNotes ? (
          <>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="e.g. fits slim, dry clean only, gift from mum…"
              className="w-full text-xs p-2 rounded-xl resize-none outline-none"
              style={{ background: 'var(--muted-bg)', border: '1px solid var(--card-border)', color: 'var(--foreground)' }}
            />
            <div className="flex gap-2 mt-2">
              <button onClick={saveNotes} className="flex-1 py-2 rounded-xl text-xs font-semibold" style={{ background: '#6366f1', color: '#fff' }}>Save</button>
              <button onClick={() => { setEditingNotes(false); setNotes(item.notes ?? ''); }} className="flex-1 py-2 rounded-xl text-xs font-semibold" style={{ background: 'var(--muted-bg)', color: 'var(--muted)' }}>Cancel</button>
            </div>
          </>
        ) : (
          <p className="text-xs" style={{ color: item.notes ? 'var(--foreground)' : 'var(--muted)' }}>
            {item.notes || 'No notes yet. Tap Edit to add.'}
          </p>
        )}
      </div>

      {/* ── Meta ──────────────────────────────────────────────────────── */}
      <div className="text-xs text-center mb-5" style={{ color: 'var(--muted)' }}>
        Added {new Date(item.created_at).toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' })}
      </div>

      {/* ── Delete confirm ────────────────────────────────────────────── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-2xl p-5" style={{ background: 'var(--background)', border: '1px solid var(--card-border)' }}>
            <p className="font-semibold mb-1" style={{ color: 'var(--foreground)' }}>Remove from wardrobe?</p>
            <p className="text-sm mb-5" style={{ color: 'var(--muted)' }}>
              "{item.name}" will be deleted permanently.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                className="flex-1 py-3 rounded-xl text-sm font-semibold"
                style={{ background: '#dc2626', color: '#fff' }}
              >
                Yes, remove
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold"
                style={{ background: 'var(--muted-bg)', color: 'var(--foreground)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
