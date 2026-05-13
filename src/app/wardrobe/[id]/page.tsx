'use client';

import { use, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft, Heart, ShoppingBag, Trash2, Sparkles, Leaf,
  Calendar, CheckCircle, Clock, RefreshCw,
  ShoppingCart, ChevronDown, ChevronUp, Edit3,
  Sun, CloudRain, Award,
} from 'lucide-react';
import { useWardrobeStore } from '@/store/wardrobe';
import { ClothingItem } from '@/types';
import { badgeInlineStyle, categoryBadgeStyle } from '@/lib/badges';

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

// ─── Occasion colors (kept for legacy uses) ───────────────────────────────────
const OCC_COLOR: Record<string, string> = {
  office: '#2563EB', casual: '#C2570A', date_night: '#BE185D',
  weekend: '#A16207', smart_casual: '#2C4A1E', minimal: '#6D28D9',
  luxury: '#92400E', travel: '#0E7490', festive: '#B91C1C', gym: '#166534',
};

// ─── Shopping helpers ─────────────────────────────────────────────────────────
const shopeeUrl    = (q: string) => `https://shopee.sg/search?keyword=${encodeURIComponent(q)}`;
const sheinUrl     = (q: string) => `https://sg.shein.com/search?q=${encodeURIComponent(q)}`;
const zaloraUrl    = (q: string) => `https://www.zalora.com.sg/search/?q=${encodeURIComponent(q)}`;
const carousellUrl = (q: string) => `https://www.carousell.sg/search/${encodeURIComponent(q)}/`;

// ─── Internet image URL for pairing items ─────────────────────────────────────
// Uses Unsplash's topic search – returns a real fashion photo for the query
function pairingImageUrl(itemName: string, colorName: string): string {
  const seed = itemName.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 200;
  const query = encodeURIComponent(`${colorName} ${itemName} fashion clothing`);
  // Unsplash source (working for low-volume apps) with a deterministic lock seed
  return `https://loremflickr.com/120/120/${encodeURIComponent(itemName.toLowerCase().replace(/\s+/g, ','))},fashion,clothing?lock=${seed}`;
}

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
    <span
      className="text-xs font-semibold px-2.5 py-0.5 rounded-full tag-in"
      style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
    >
      {level}
    </span>
  );
}

// ─── Pairing image card ───────────────────────────────────────────────────────
function PairingImage({ p, itemFromWardrobe }: { p: Pairing; itemFromWardrobe?: ClothingItem }) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  // If item is in wardrobe and has an image, use that directly
  const src = (p.in_wardrobe && itemFromWardrobe?.image_url)
    ? itemFromWardrobe.image_url
    : errored
    ? null
    : pairingImageUrl(p.item_name, p.color_name);

  return (
    <div
      className="w-14 h-14 rounded-2xl shrink-0 overflow-hidden relative"
      style={{
        background: src ? 'var(--muted-bg)' : p.color_hex ?? '#e5e7eb',
        border: `2px solid ${p.in_wardrobe ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.7)'}`,
        boxShadow: p.in_wardrobe ? '0 0 0 3px rgba(16,185,129,0.12)' : '0 2px 8px rgba(15,23,42,0.1)',
      }}
    >
      {src && !errored ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={p.item_name}
          className={`w-full h-full object-cover transition-all duration-500 ${loaded ? 'img-reveal' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
        />
      ) : (
        // Fallback: colour swatch with initial
        <div className="w-full h-full flex items-center justify-center" style={{ background: p.color_hex ?? '#e5e7eb' }}>
          <span className="text-white text-xs font-bold drop-shadow">
            {p.item_name.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
      {/* Skeleton while loading */}
      {src && !loaded && !errored && (
        <div className="absolute inset-0 skeleton" />
      )}
      {/* In-wardrobe green check */}
      {p.in_wardrobe && (
        <div className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center success-pop" style={{ background: '#10b981' }}>
          <CheckCircle size={10} style={{ color: '#fff' }} />
        </div>
      )}
    </div>
  );
}

export default function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { items, removeItem, toggleFavorite, markWornOn, updateItem } = useWardrobeStore();
  const item = items.find((i) => i.id === id) as ClothingItem | undefined;

  const [pairings, setPairings]           = useState<PairingResult | null>(null);
  const [pairingLoading, setPairingLoading] = useState(false);
  const [pairingError, setPairingError]   = useState('');
  const [showPairings, setShowPairings]   = useState(false);
  const [outfitScore, setOutfitScore]     = useState<{ score: number; verdict: string; reasons: string[]; suggestions: string[]; _model: string } | null>(null);
  const [scoreLoading, setScoreLoading]   = useState(false);
  const [wearDate, setWearDate]           = useState<'today' | 'tomorrow' | null>(null);
  const [wornConfirmed, setWornConfirmed] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingNotes, setEditingNotes]   = useState(false);
  const [notes, setNotes]                 = useState('');
  const [favAnim, setFavAnim]             = useState(false);
  const [heroLoaded, setHeroLoaded]       = useState(false);
  const heartRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (item) setNotes(item.notes ?? '');
  }, [item]);

  if (!item) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center page-enter">
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Item not found.</p>
        <Link href="/wardrobe" className="mt-4 inline-block text-sm font-semibold" style={{ color: 'var(--accent)' }}>
          ← Back to Wardrobe
        </Link>
      </div>
    );
  }

  const carbon  = carbonForItem(item.category, item.times_worn);
  const today   = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  // ─── Pair suggestions + compatibility score ─────────────────────────────────
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
      const result = data as PairingResult;
      setPairings(result);

      // Fire outfit score for the top 3 pairings in background
      const topPairings = result.pairings.slice(0, 3);
      if (topPairings.length >= 1) {
        setScoreLoading(true);
        const scoreItems = [
          { name: item!.name, category: item!.category, color_name: item!.color_name, tags: item!.tags },
          ...topPairings.map((p) => ({ name: p.item_name, category: p.role.toLowerCase(), color_name: p.color_name, tags: [p.occasion] })),
        ];
        fetch('/api/outfit-score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: scoreItems, occasion: result.best_occasion ?? 'casual' }),
        })
          .then((r) => r.json())
          .then((s) => { if (!s.error) setOutfitScore(s); })
          .catch(() => null)
          .finally(() => setScoreLoading(false));
      }
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

  // ─── Favourite toggle with animation ────────────────────────────────────────
  function handleFav() {
    toggleFavorite(item!.id);
    setFavAnim(true);
    setTimeout(() => setFavAnim(false), 450);
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
    <div className="max-w-lg mx-auto px-4 pt-4 pb-10 page-enter">

      {/* ── Back + action bar ──────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4 section-reveal section-reveal-1">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm font-semibold btn-bounce"
          style={{ color: 'var(--muted)' }}
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex items-center gap-2">
          {/* Favourite */}
          <button
            ref={heartRef}
            onClick={handleFav}
            className={`w-9 h-9 rounded-xl flex items-center justify-center ripple-btn ${favAnim ? 'heart-pop' : ''}`}
            style={{
              background: item.favorite ? 'rgba(236,72,153,0.12)' : 'var(--card)',
              border: `1px solid ${item.favorite ? 'rgba(236,72,153,0.35)' : 'var(--card-border)'}`,
              transition: 'background 0.2s, border-color 0.2s',
            }}
            title={item.favorite ? 'Remove from favourites' : 'Add to favourites'}
          >
            <Heart
              size={16}
              fill={item.favorite ? '#ec4899' : 'none'}
              stroke={item.favorite ? '#ec4899' : 'var(--muted)'}
              style={{ transition: 'fill 0.2s, stroke 0.2s' }}
            />
          </button>
          {/* List to sell */}
          <Link
            href="/marketplace"
            className="w-9 h-9 rounded-xl flex items-center justify-center btn-bounce ripple-btn"
            style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
            title="Sell or rent this item"
          >
            <ShoppingBag size={16} style={{ color: 'var(--muted)' }} />
          </Link>
          {/* Delete */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-9 h-9 rounded-xl flex items-center justify-center btn-bounce ripple-btn"
            style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
            title="Remove from wardrobe"
          >
            <Trash2 size={16} style={{ color: '#dc2626' }} />
          </button>
        </div>
      </div>

      {/* ── Image hero ──────────────────────────────────────────────── */}
      <div
        className="w-full rounded-3xl overflow-hidden mb-5 relative card-lift section-reveal section-reveal-2"
        style={{
          background: `linear-gradient(135deg, ${categoryBadgeStyle(item.category).bg} 0%, #ffffff 100%)`,
          border: `1.5px solid ${categoryBadgeStyle(item.category).border}`,
          aspectRatio: '4/3',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {item.image_url ? (
          <>
            <Image
              src={item.image_url}
              alt={item.name}
              fill
              sizes="(max-width: 640px) 100vw, 512px"
              style={{ objectFit: 'contain', transition: 'opacity 0.5s ease', opacity: heroLoaded ? 1 : 0 }}
              priority
              onLoad={() => setHeroLoaded(true)}
            />
            {!heroLoaded && <div className="absolute inset-0 skeleton" />}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center flex-col gap-3" style={{ color: 'var(--muted)' }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: categoryBadgeStyle(item.category).bg }}>
              <ShoppingBag size={30} style={{ color: categoryBadgeStyle(item.category).color }} strokeWidth={1.5} />
            </div>
            <span className="text-sm font-medium" style={{ color: 'var(--muted)' }}>No photo yet</span>
          </div>
        )}
        {/* Glass bottom bar with item name */}
        {item.image_url && heroLoaded && (
          <div
            className="absolute bottom-0 left-0 right-0 px-4 py-3"
            style={{
              background: 'linear-gradient(transparent, rgba(0,0,0,0.55))',
              backdropFilter: 'blur(0px)',
            }}
          >
            <p className="text-white font-bold text-sm leading-tight drop-shadow">{item.name}</p>
          </div>
        )}
        {item.favorite && (
          <div
            className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center float badge-glass"
          >
            <Heart size={16} fill="#ec4899" stroke="#ec4899" />
          </div>
        )}
        {/* Category glass badge top-left */}
        <div
          className="absolute top-3 left-3 badge-glass capitalize"
          style={{ color: categoryBadgeStyle(item.category).color, fontSize: 11, fontWeight: 700 }}
        >
          {item.category.replace(/_/g, ' ')}
        </div>
      </div>

      {/* ── Identity ────────────────────────────────────────────────── */}
      <div className="mb-5 section-reveal section-reveal-3">
        <div className="flex items-start justify-between gap-3 mb-1.5">
          <h1 className="text-xl font-bold leading-tight" style={{ color: 'var(--foreground)' }}>
            {item.name}
          </h1>
          <WearBadge count={item.times_worn} />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: 'var(--muted)' }}>
          <span>{CATEGORY_LABEL[item.category] ?? item.category}</span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full inline-block" style={{ background: item.color_hex, boxShadow: '0 0 0 1.5px rgba(0,0,0,0.1)' }} />
            {item.color_name}
          </span>
          {item.brand && <><span>·</span><span>{item.brand}</span></>}
        </div>

        {/* Tags — colorful badge system */}
        <div className="flex flex-wrap gap-2 mt-3">
          {/* Category badge */}
          <span
            className="capitalize tag-in"
            style={{ ...badgeInlineStyle(item.category, 'category'), animationDelay: '0ms' }}
          >
            {item.category.replace(/_/g, ' ')}
          </span>
          {/* Occasion tags */}
          {item.tags.map((tag, i) => (
            <span
              key={tag}
              className="capitalize tag-in"
              style={{ ...badgeInlineStyle(tag, 'occasion'), animationDelay: `${(i + 1) * 55}ms` }}
            >
              {tag.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      </div>

      {/* ── Wear stats ──────────────────────────────────────────────── */}
      <div
        className="grid grid-cols-3 gap-3 p-4 rounded-2xl mb-5 section-reveal section-reveal-4"
        style={{ background: 'var(--card)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-sm)' }}
      >
        {[
          { value: item.times_worn, label: 'Times worn' },
          {
            value: item.last_worn
              ? new Date(item.last_worn).toLocaleDateString('en', { month: 'short', day: 'numeric' })
              : '—',
            label: 'Last worn',
          },
          {
            value: `${Math.floor((Date.now() - new Date(item.created_at).getTime()) / 86400000)}d`,
            label: 'In wardrobe',
          },
        ].map(({ value, label }) => (
          <div key={label} className="text-center">
            <p className="text-2xl font-bold num-flash" style={{ color: 'var(--foreground)' }}>{value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* ── Worn dates timeline ──────────────────────────────────────── */}
      {item.worn_dates && item.worn_dates.length > 0 && (
        <div
          className="p-4 rounded-2xl mb-5 section-reveal section-reveal-5"
          style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
        >
          <p className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: 'var(--muted)' }}>
            <Clock size={12} /> Wear history
          </p>
          <div className="flex flex-wrap gap-1.5">
            {[...item.worn_dates].reverse().slice(0, 12).map((d, i) => (
              <span
                key={d}
                className="text-xs px-2 py-0.5 rounded-full tag-in"
                style={{
                  background: '0',
                  color: 'var(--primary-mid)',
                  animationDelay: `${i * 40}ms`,
                }}
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

      {/* ── Mark as worn ────────────────────────────────────────────── */}
      <div
        className="p-4 rounded-2xl mb-5 section-reveal section-reveal-5"
        style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
      >
        <p className="text-sm font-semibold mb-3 flex items-center gap-1.5" style={{ color: 'var(--foreground)' }}>
          <Calendar size={14} /> Wearing this?
        </p>
        <div className="flex gap-2 mb-3">
          {(['today', 'tomorrow'] as const).map((d) => (
            <button
              key={d}
              onClick={() => setWearDate(wearDate === d ? null : d)}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold ripple-btn btn-bounce flex items-center justify-center gap-1.5"
              style={wearDate === d
                ? { background: 'var(--primary-mid)', color: '#fff', boxShadow: '0 4px 12px 0' }
                : { background: 'var(--muted-bg)', color: 'var(--foreground)', border: '1px solid var(--card-border)' }
              }
            >
              {d === 'today' ? <Sun size={13} /> : <CloudRain size={13} />}
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
        {wearDate && !wornConfirmed && (
          <button
            onClick={confirmWear}
            className="w-full py-2.5 rounded-xl text-sm font-semibold btn-bounce ripple-btn slide-up"
            style={{ background: '#10b981', color: '#fff', boxShadow: '0 4px 14px rgba(16,185,129,0.28)' }}
          >
            ✓ Mark as worn {wearDate}
          </button>
        )}
        {wornConfirmed && (
          <div
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-center flex items-center justify-center gap-2 success-pop"
            style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}
          >
            <CheckCircle size={15} /> Logged! Wear count updated.
          </div>
        )}
      </div>

      {/* ── Sustainability & Carbon ──────────────────────────────────── */}
      <div
        className="p-4 rounded-2xl mb-5 section-reveal section-reveal-6"
        style={{
          background: 'linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(6,182,212,0.06) 100%)',
          border: '1px solid rgba(16,185,129,0.18)',
        }}
      >
        <p className="text-sm font-semibold mb-3 flex items-center gap-1.5" style={{ color: '#065f46' }}>
          <Leaf size={14} style={{ color: '#10b981' }} /> Sustainability Footprint
        </p>

        <div className="grid grid-cols-3 gap-3 mb-3">
          {[
            { value: `${carbon.total}kg`, label: 'CO₂ to make', ok: true },
            { value: `${carbon.perWear}kg`, label: 'per wear', ok: item.times_worn > 0 },
            { value: `${carbon.saved}kg`, label: 'CO₂ saved', ok: true },
          ].map(({ value, label, ok }, i) => (
            <div
              key={label}
              className="rounded-xl p-3 text-center card-lift"
              style={{ background: 'rgba(255,255,255,0.65)', animationDelay: `${i * 60}ms` }}
            >
              <p className="text-lg font-bold" style={{ color: ok ? '#065f46' : '#dc2626' }}>{value}</p>
              <p className="text-xs" style={{ color: '#10b981' }}>{label}</p>
            </div>
          ))}
        </div>

        <div className="mb-2">
          <div className="flex justify-between text-xs mb-1" style={{ color: '#10b981' }}>
            <span>Wear goal progress</span>
            <span>{item.times_worn}/30 wears</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(16,185,129,0.18)' }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, (item.times_worn / 30) * 100)}%`,
                background: 'linear-gradient(90deg, #10b981, #06b6d4)',
                transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
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

      {/* ── AI Style Pairings ────────────────────────────────────────── */}
      <div
        className="rounded-2xl mb-5 overflow-hidden section-reveal section-reveal-7"
        style={{ border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-sm)' }}
      >
        <button
          onClick={loadPairings}
          className="w-full flex items-center justify-between p-4 transition-all ripple-btn"
          style={{ background: 'var(--card)' }}
        >
          <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
            <Sparkles size={15} style={{ color: 'var(--primary-mid)' }} />
            AI Style Pairings
            {pairings && (
              <span
                className="text-xs font-normal px-1.5 py-0.5 rounded-full tag-in pulse-ring"
                style={{ background: '0', color: 'var(--primary-mid)' }}
              >
                {pairings.pairings.length} matches
              </span>
            )}
          </span>
          <div className="transition-transform duration-300" style={{ transform: showPairings ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            <ChevronDown size={16} style={{ color: 'var(--muted)' }} />
          </div>
        </button>

        {showPairings && (
          <div className="p-4 pt-0 slide-up" style={{ background: 'var(--card)' }}>
            {pairingLoading && (
              <div className="py-6 text-center">
                <div className="inline-flex items-center gap-2 text-sm" style={{ color: 'var(--muted)' }}>
                  <RefreshCw size={14} className="animate-spin" /> Finding the best pairings…
                </div>
                {/* Skeleton cards */}
                <div className="flex flex-col gap-3 mt-4 text-left">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'var(--muted-bg)' }}>
                      <div className="skeleton w-14 h-14 rounded-2xl shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="skeleton h-3 rounded-full w-2/3" />
                        <div className="skeleton h-3 rounded-full w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {pairingError && (
              <p className="text-xs py-4 text-center" style={{ color: '#dc2626' }}>{pairingError}</p>
            )}
            {pairings && !pairingLoading && (
              <>
                {/* Style tip */}
                <div
                  className="mb-4 p-3 rounded-xl slide-up"
                  style={{ background: '0', border: '1px solid 0' }}
                >
                  <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--primary-mid)' }}>💡 Stylist tip</p>
                  <p className="text-xs" style={{ color: 'var(--foreground)' }}>{pairings.style_tip}</p>
                </div>

                {/* Outfit compatibility score (Module 2) */}
                {(scoreLoading || outfitScore) && (
                  <div
                    className="mb-4 p-3 rounded-xl slide-up"
                    style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.18)' }}
                  >
                    <p className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: '#065f46' }}>
                      <Sparkles size={11} style={{ color: '#10b981' }} /> Compatibility Score
                      {outfitScore && (
                        <span className="text-xs font-normal ml-auto" style={{ color: 'var(--muted)' }}>
                          {outfitScore._model?.includes('fine-tuned') ? '✦ fine-tuned' : ''}
                        </span>
                      )}
                    </p>
                    {scoreLoading && !outfitScore && (
                      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted)' }}>
                        <RefreshCw size={11} className="animate-spin" /> Scoring outfit…
                      </div>
                    )}
                    {outfitScore && (
                      <>
                        <div className="flex items-center gap-3 mb-2">
                          {/* Score ring */}
                          <div className="relative w-14 h-14 shrink-0">
                            <svg viewBox="0 0 56 56" className="w-14 h-14 -rotate-90">
                              <circle cx="28" cy="28" r="23" fill="none" stroke="rgba(16,185,129,0.15)" strokeWidth="5" />
                              <circle
                                cx="28" cy="28" r="23" fill="none"
                                stroke={outfitScore.score >= 80 ? '#10b981' : outfitScore.score >= 50 ? '#f59e0b' : '#ef4444'}
                                strokeWidth="5"
                                strokeLinecap="round"
                                strokeDasharray={`${(outfitScore.score / 100) * 144.5} 144.5`}
                                style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.16,1,0.3,1)' }}
                              />
                            </svg>
                            <span
                              className="absolute inset-0 flex items-center justify-center text-sm font-bold"
                              style={{ color: outfitScore.score >= 80 ? '#10b981' : outfitScore.score >= 50 ? '#f59e0b' : '#ef4444' }}
                            >
                              {outfitScore.score}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold leading-snug" style={{ color: 'var(--foreground)' }}>
                              {outfitScore.verdict}
                            </p>
                          </div>
                        </div>
                        {outfitScore.reasons.slice(0, 2).map((r, i) => (
                          <p key={i} className="text-xs mt-1 flex items-start gap-1" style={{ color: '#065f46' }}>
                            <span>·</span> {r}
                          </p>
                        ))}
                        {outfitScore.suggestions?.[0] && (
                          <p className="text-xs mt-2 italic" style={{ color: '#6b7280' }}>
                            💡 {outfitScore.suggestions[0]}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Pairing cards — stagger animation */}
                <div className="flex flex-col gap-3 stagger-grid">
                  {pairings.pairings.map((p, i) => {
                    const wardrobeMatch = p.in_wardrobe && p.item_id
                      ? items.find((it) => it.id === p.item_id)
                      : undefined;
                    return (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-3 rounded-2xl card-lift"
                        style={{
                          background: p.in_wardrobe ? 'rgba(16,185,129,0.05)' : 'var(--muted-bg)',
                          border: `1px solid ${p.in_wardrobe ? 'rgba(16,185,129,0.2)' : 'var(--card-border)'}`,
                        }}
                      >
                        {/* Real internet photo */}
                        <PairingImage p={p} itemFromWardrobe={wardrobeMatch} />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                            <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                              {p.item_name}
                            </span>
                            {p.in_wardrobe ? (
                              <span
                                className="text-xs px-1.5 py-0.5 rounded-full font-medium tag-in"
                                style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}
                              >
                                In wardrobe ✓
                              </span>
                            ) : (
                              <span
                                className="text-xs px-1.5 py-0.5 rounded-full font-medium tag-in"
                                style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.15)' }}
                              >
                                Need to buy
                              </span>
                            )}
                          </div>
                          <p className="text-xs mb-2" style={{ color: 'var(--muted)' }}>
                            <span className="font-medium" style={{ color: 'var(--foreground)' }}>{p.role}</span> · {p.reason}
                          </p>
                          {!p.in_wardrobe && p.buy_query && (
                            <div className="flex flex-wrap gap-1">
                              {[
                                { label: 'Shopee', url: shopeeUrl(p.buy_query), bg: '#ff6130' },
                                { label: 'Shein',  url: sheinUrl(p.buy_query),  bg: '#000' },
                                { label: 'Zalora', url: zaloraUrl(p.buy_query), bg: 'var(--primary-mid)' },
                                { label: '2nd hand', url: carousellUrl(p.buy_query), bg: '#10b981' },
                              ].map(({ label, url, bg }) => (
                                <a
                                  key={label}
                                  href={url}
                                  target="_blank"
                                  rel="noopener"
                                  className="text-xs px-2 py-0.5 rounded-full font-medium btn-bounce ripple-btn"
                                  style={{ background: bg, color: '#fff' }}
                                >
                                  {label}
                                </a>
                              ))}
                            </div>
                          )}
                          {p.in_wardrobe && p.item_id && (
                            <Link
                              href={`/wardrobe/${p.item_id}`}
                              className="text-xs font-semibold btn-bounce inline-flex items-center gap-0.5"
                              style={{ color: 'var(--primary-mid)' }}
                            >
                              View item →
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Care tip */}
                {pairings.care_tip && (
                  <div
                    className="mt-4 p-3 rounded-xl flex items-start gap-2 slide-up"
                    style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}
                  >
                    <Award size={13} style={{ color: '#f59e0b', marginTop: 1, flexShrink: 0 }} />
                    <p className="text-xs" style={{ color: '#92400e' }}>
                      <span className="font-semibold">Care tip:</span> {pairings.care_tip}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Sell / Rent CTA ──────────────────────────────────────────── */}
      <div
        className="p-4 rounded-2xl mb-5 section-reveal section-reveal-8"
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
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-center btn-bounce ripple-btn"
            style={{ background: '#10b981', color: '#fff', boxShadow: '0 4px 12px rgba(16,185,129,0.25)' }}
          >
            Sell
          </Link>
          <Link
            href="/marketplace"
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-center btn-bounce ripple-btn"
            style={{ background: '0', color: 'var(--primary-mid)', border: '1px solid 0' }}
          >
            Rent out
          </Link>
        </div>
      </div>

      {/* ── Notes ───────────────────────────────────────────────────── */}
      <div
        className="p-4 rounded-2xl mb-5 section-reveal section-reveal-8"
        style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
      >
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold flex items-center gap-1.5" style={{ color: 'var(--foreground)' }}>
            <Edit3 size={13} /> Notes
          </p>
          {!editingNotes && (
            <button onClick={() => setEditingNotes(true)} className="text-xs font-semibold btn-bounce" style={{ color: 'var(--primary-mid)' }}>
              Edit
            </button>
          )}
        </div>
        {editingNotes ? (
          <div className="slide-up">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="e.g. fits slim, dry clean only, gift from mum…"
              className="w-full text-xs p-2.5 rounded-xl resize-none outline-none"
              style={{
                background: 'var(--muted-bg)',
                border: '1px solid var(--card-border)',
                color: 'var(--foreground)',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--primary-mid)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--card-border)')}
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={saveNotes}
                className="flex-1 py-2 rounded-xl text-xs font-semibold btn-bounce ripple-btn"
                style={{ background: 'var(--primary-mid)', color: '#fff' }}
              >
                Save
              </button>
              <button
                onClick={() => { setEditingNotes(false); setNotes(item.notes ?? ''); }}
                className="flex-1 py-2 rounded-xl text-xs font-semibold btn-bounce"
                style={{ background: 'var(--muted-bg)', color: 'var(--muted)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-xs" style={{ color: item.notes ? 'var(--foreground)' : 'var(--muted)' }}>
            {item.notes || 'No notes yet. Tap Edit to add.'}
          </p>
        )}
      </div>

      {/* ── Meta ────────────────────────────────────────────────────── */}
      <div className="text-xs text-center mb-5 section-reveal section-reveal-8" style={{ color: 'var(--muted)' }}>
        Added {new Date(item.created_at).toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' })}
      </div>

      {/* ── Delete confirm modal ─────────────────────────────────────── */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
          style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(6px)' }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-5 slide-up"
            style={{ background: 'var(--background)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-md)' }}
          >
            <p className="font-semibold mb-1" style={{ color: 'var(--foreground)' }}>Remove from wardrobe?</p>
            <p className="text-sm mb-5" style={{ color: 'var(--muted)' }}>
              "{item.name}" will be deleted permanently.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                className="flex-1 py-3 rounded-xl text-sm font-semibold btn-bounce ripple-btn"
                style={{ background: '#dc2626', color: '#fff' }}
              >
                Yes, remove
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold btn-bounce"
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
