'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useProfileStore, SkinTone, FashionStyle, Gender } from '@/store/profile';
import { useWishlistStore } from '@/store/wishlist';
import { useWardrobeStore } from '@/store/wardrobe';
import {
  Camera, Pencil, Check, X, ChevronRight, Settings,
  Sparkles, Zap, Leaf, Bell,
  Cpu, Wifi, WifiOff, CloudLightning, AlertCircle,
  Globe, Brain, Star, Heart, Ruler, ChevronDown, ChevronUp,
  Droplets, Sun, RefreshCw, Send, GitPullRequest, ExternalLink, Trash2, Loader,
} from 'lucide-react';
import { useEvolveStore, FeatureCategory } from '@/store/evolve';

// ─── Shade data ───────────────────────────────────────────────────────────────

const LIP_SHADES = [
  { name: 'Nude Beige',  hex: '#D4A87A' },
  { name: 'Dusty Rose',  hex: '#C8857A' },
  { name: 'Coral Punch', hex: '#E87050' },
  { name: 'Berry Rush',  hex: '#8B3A62' },
  { name: 'Classic Red', hex: '#C42830' },
  { name: 'Terracotta',  hex: '#C4572A' },
  { name: 'Mauve Mist',  hex: '#A0688A' },
  { name: 'Deep Plum',   hex: '#6B2A5A' },
  { name: 'Baby Pink',   hex: '#E890A8' },
  { name: 'Warm Nude',   hex: '#C89870' },
];

const EYE_SHADES = [
  { name: 'Warm Taupe',   hex: '#C8B090' },
  { name: 'Smoky Slate',  hex: '#4A5060' },
  { name: 'Bronze Glow',  hex: '#B87040' },
  { name: 'Amethyst',     hex: '#7B52A8' },
  { name: 'Forest',       hex: '#3A7840' },
  { name: 'Midnight',     hex: '#2A3A78' },
  { name: 'Rose Gold',    hex: '#C87890' },
  { name: 'Champagne',    hex: '#E8D4A0' },
];

const BLUSH_SHADES = [
  { name: 'Peach Bloom',  hex: '#F4A878' },
  { name: 'Rose Flush',   hex: '#E87A8A' },
  { name: 'Sun Bronze',   hex: '#C8804A' },
  { name: 'Berry Blush',  hex: '#D46888' },
  { name: 'Peachy Pink',  hex: '#F4907A' },
  { name: 'Natural Glow', hex: '#D4986A' },
];

const SKIN_FINISHES = [
  { id: 'dewy',    label: 'Dewy',    desc: 'Glass skin luminosity', icon: Droplets, color: '#3b82f6' },
  { id: 'matte',   label: 'Matte',   desc: 'Long-wear, shine-free', icon: Sun,       color: '#8b5cf6' },
  { id: 'satin',   label: 'Satin',   desc: 'Soft & semi-luminous', icon: Sparkles,  color: '#ec4899' },
  { id: 'natural', label: 'Natural', desc: 'Bare skin perfected',   icon: Leaf,      color: '#5A9240' },
] as const;

// AI picks per skin tone
const AI_LIP_PICKS: Record<SkinTone, string[]> = {
  fair:   ['#C8857A', '#8B3A62', '#E890A8'],
  light:  ['#E87050', '#D4A87A', '#E890A8'],
  medium: ['#C4572A', '#8B3A62', '#E87050'],
  tan:    ['#C42830', '#C4572A', '#A0688A'],
  deep:   ['#8B3A62', '#6B2A5A', '#C42830'],
  rich:   ['#6B2A5A', '#8B3A62', '#C42830'],
};

// ─── Constants ────────────────────────────────────────────────────────────────

const SKIN_TONES: { id: SkinTone; label: string; hex: string; undertone: string }[] = [
  { id: 'fair',   label: 'Fair',   hex: '#FDDBB4', undertone: 'Cool / Pink' },
  { id: 'light',  label: 'Light',  hex: '#EDB98A', undertone: 'Neutral' },
  { id: 'medium', label: 'Medium', hex: '#C68642', undertone: 'Warm / Olive' },
  { id: 'tan',    label: 'Tan',    hex: '#A0522D', undertone: 'Warm / Golden' },
  { id: 'deep',   label: 'Deep',   hex: '#6B3A2A', undertone: 'Warm / Neutral' },
  { id: 'rich',   label: 'Rich',   hex: '#3D1C09', undertone: 'Cool / Deep' },
];

const FASHION_STYLES: { id: FashionStyle; label: string; emoji: string; color: string }[] = [
  { id: 'minimalist', label: 'Minimalist', emoji: '⬜', color: '#6B7280' },
  { id: 'classic',    label: 'Classic',    emoji: '👔', color: '#1D4ED8' },
  { id: 'streetwear', label: 'Streetwear', emoji: '🧢', color: '#374151' },
  { id: 'bohemian',   label: 'Bohemian',   emoji: '🌿', color: '#5A9240' },
  { id: 'sporty',     label: 'Sporty',     emoji: '🏃', color: '#0891b2' },
  { id: 'elegant',    label: 'Elegant',    emoji: '✨', color: '#9333ea' },
  { id: 'edgy',       label: 'Edgy',       emoji: '⚡', color: '#374151' },
  { id: 'preppy',     label: 'Preppy',     emoji: '🎓', color: '#1D4ED8' },
  { id: 'casual',     label: 'Casual',     emoji: '👕', color: '#d97706' },
  { id: 'luxury',     label: 'Luxury',     emoji: '💎', color: '#b45309' },
];

const GENDER_OPTIONS: { id: Gender; label: string }[] = [
  { id: 'male', label: 'Male' },
  { id: 'female', label: 'Female' },
  { id: 'non-binary', label: 'Non-binary' },
  { id: 'prefer-not', label: 'Prefer not to say' },
];

const CURRENCIES = ['SGD', 'USD', 'EUR', 'GBP', 'MYR', 'IDR', 'PHP', 'THB', 'AUD'];
const REGIONS = ['Singapore', 'Malaysia', 'Indonesia', 'Thailand', 'Philippines', 'Australia', 'United Kingdom', 'United States'];
const TOP_SIZES    = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const BOTTOM_SIZES = ['28', '30', '32', '34', '36', '38', '40'];
const SHOE_SIZES   = ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45'];

const AI_MODULES = [
  { id: 'fashion', label: 'Fashion Vision',  desc: 'Clothing · colour · occasion',   baseScore: 92, color: '#5A9240', capabilities: [{ name: 'Colour Theory', score: 94 }, { name: 'Category Detection', score: 96 }, { name: 'Occasion Tagging', score: 88 }, { name: 'Style Reading', score: 87 }] },
  { id: 'outfit',  label: 'Outfit Scorer',   desc: 'Harmony · weather · pairing',    baseScore: 88, color: '#3b82f6', capabilities: [{ name: 'Colour Harmony', score: 90 }, { name: 'Style Pairing', score: 88 }, { name: 'Weather Fit', score: 85 }, { name: 'Occasion Match', score: 87 }] },
  { id: 'makeup',  label: 'Beauty Stylist',  desc: 'Lipstick · jewelry · skin',      baseScore: 88, color: '#ec4899', capabilities: [{ name: 'Lip Shade Match', score: 91 }, { name: 'Jewelry Pairing', score: 86 }, { name: 'Skin Tone Fit', score: 89 }, { name: 'Look Curation', score: 84 }] },
  { id: 'base',    label: 'Gemma 4 Base',    desc: 'Reasoning · trends · fallback',  baseScore: 79, color: '#f59e0b', capabilities: [{ name: 'General Reasoning', score: 85 }, { name: 'Fashion Knowledge', score: 72 }, { name: 'Style Advice', score: 78 }, { name: 'Cultural Context', score: 80 }] },
];

// ─── Small components ─────────────────────────────────────────────────────────

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      style={{
        /* track */
        display: 'inline-block',
        position: 'relative',
        width: 52,
        height: 30,
        borderRadius: 999,
        flexShrink: 0,
        cursor: 'pointer',
        border: 'none',
        padding: 0,
        outline: 'none',
        background: on ? '#2C4A1E' : '#D1D5DB',
        transition: 'background 0.2s ease',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* thumb */}
      <span style={{
        position: 'absolute',
        top: 3,
        left: on ? 25 : 3,
        width: 24,
        height: 24,
        borderRadius: '50%',
        background: '#ffffff',
        boxShadow: '0 1px 4px rgba(0,0,0,0.25), 0 2px 6px rgba(0,0,0,0.15)',
        transition: 'left 0.2s cubic-bezier(0.4,0,0.2,1)',
        display: 'block',
        pointerEvents: 'none',
      }} />
    </button>
  );
}

function ScoreRing({ score, size = 88, color = '#5A9240' }: { score: number; size?: number; color?: string }) {
  const [animated, setAnimated] = useState(false);
  const r = (size - 14) / 2;
  const circ = 2 * Math.PI * r;
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 150); return () => clearTimeout(t); }, []);
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth={10} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={10}
          strokeLinecap="round" strokeDasharray={circ}
          strokeDashoffset={circ * (1 - (animated ? score / 100 : 0))}
          style={{ transition: 'stroke-dashoffset 1.3s cubic-bezier(0.4,0,0.2,1)' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size * 0.26, fontWeight: 800, color, lineHeight: 1 }}>{animated ? score : 0}</span>
        <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600 }}>/ 100</span>
      </div>
    </div>
  );
}

function CapBar({ name, score, color, delay = 0 }: { name: string; score: number; color: string; delay?: number }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(score), 300 + delay); return () => clearTimeout(t); }, [score, delay]);
  return (
    <div style={{ marginBottom: 9 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: 'var(--foreground-mid)', fontWeight: 500 }}>{name}</span>
        <span style={{ fontSize: 12, color, fontWeight: 700 }}>{score}</span>
      </div>
      <div style={{ height: 5, borderRadius: 99, background: 'rgba(0,0,0,0.07)', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 99, background: `linear-gradient(to right, ${color}90, ${color})`, width: `${w}%`, transition: `width 0.9s cubic-bezier(0.4,0,0.2,1) ${delay}ms` }} />
      </div>
    </div>
  );
}

// Expandable section card
function Section({ title, subtitle, icon: Icon, accent = 'var(--primary)', children, defaultOpen = false }: {
  title: string; subtitle?: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  accent?: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: '#fff', borderRadius: 20, border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: 14, overflow: 'hidden' }}>
      <button onClick={() => setOpen((v) => !v)} style={{
        width: '100%', background: 'none', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', textAlign: 'left',
      }}>
        <div style={{ width: 40, height: 40, borderRadius: 13, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${accent}18` }}>
          <Icon size={18} style={{ color: accent }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)' }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{subtitle}</div>}
        </div>
        {open ? <ChevronUp size={16} style={{ color: 'var(--muted)', flexShrink: 0 }} /> : <ChevronDown size={16} style={{ color: 'var(--muted)', flexShrink: 0 }} />}
      </button>
      {open && <div style={{ padding: '0 18px 18px' }}>{children}</div>}
    </div>
  );
}

// ─── AI status type ───────────────────────────────────────────────────────────

interface AIStatus {
  backend: 'ollama' | 'groq' | 'none';
  ollamaReachable: boolean;
  groqConfigured: boolean;
  models: { base: { available: boolean }; fashion: { available: boolean }; outfit: { available: boolean }; makeup: { available: boolean } };
  overallScore: number;
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const profile  = useProfileStore();
  const wishlist = useWishlistStore();
  const wardrobe = useWardrobeStore();

  const evolve = useEvolveStore();

  const [editingName, setEditingName] = useState(false);
  const [editingBio,  setEditingBio]  = useState(false);
  const [tempName,    setTempName]    = useState('');
  const [tempBio,     setTempBio]     = useState('');
  const [aiStatus,    setAiStatus]    = useState<AIStatus | null>(null);
  const [aiLoading,   setAiLoading]   = useState(true);
  const [paletteTab,  setPaletteTab]  = useState<'lips' | 'eyes' | 'cheeks' | 'skin'>('lips');
  const [hoverShade,  setHoverShade]  = useState<{ name: string; hex: string } | null>(null);
  const [expandedModel, setExpandedModel] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Self-evolve state
  const [evolveTitle,    setEvolveTitle]    = useState('');
  const [evolveDesc,     setEvolveDesc]     = useState('');
  const [evolveCategory, setEvolveCategory] = useState<FeatureCategory>('UI / Design');
  const [evolveLoading,  setEvolveLoading]  = useState(false);
  const [evolveResult,   setEvolveResult]   = useState<{ prUrl?: string; prNumber?: number; aiPlan?: string; prCreated?: boolean } | null>(null);
  const [evolveError,    setEvolveError]    = useState('');

  useEffect(() => {
    fetch('/api/ai-status').then((r) => r.json()).then(setAiStatus).catch(() => {}).finally(() => setAiLoading(false));
  }, []);

  const submitEvolve = useCallback(async () => {
    if (!evolveTitle.trim() || !evolveDesc.trim()) return;
    setEvolveLoading(true);
    setEvolveError('');
    setEvolveResult(null);
    const featureId = `feat-${Date.now()}`;
    try {
      const res = await fetch('/api/evolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: evolveTitle, description: evolveDesc, category: evolveCategory, featureId }),
      });
      const data = await res.json() as { aiPlan?: string; prUrl?: string; prNumber?: number; prCreated?: boolean; error?: string };
      if (data.error) throw new Error(data.error);
      setEvolveResult(data);
      evolve.addFeature({
        id: featureId,
        title: evolveTitle,
        description: evolveDesc,
        category: evolveCategory,
        status: data.prCreated ? 'pr_created' : 'submitted',
        prUrl: data.prUrl,
        prNumber: data.prNumber,
        aiPlan: data.aiPlan,
        submittedAt: new Date().toISOString(),
      });
      setEvolveTitle('');
      setEvolveDesc('');
    } catch (e) {
      setEvolveError(e instanceof Error ? e.message : 'Submission failed');
    } finally {
      setEvolveLoading(false);
    }
  }, [evolveTitle, evolveDesc, evolveCategory, evolve]);

  const handleAvatarUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => profile.setAvatar(ev.target?.result as string);
    reader.readAsDataURL(file);
  }, [profile]);

  // Profile completeness
  const fields = [profile.name, profile.bio, profile.skinTone, profile.fashionStyles.length > 0, profile.sizes.top, profile.gender !== 'prefer-not', profile.avatarDataUrl];
  const completeness = Math.round((fields.filter(Boolean).length / fields.length) * 100);

  const initials = profile.name ? profile.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() : '?';
  const scoreColor = (aiStatus?.overallScore ?? 0) >= 90 ? '#5A9240' : (aiStatus?.overallScore ?? 0) >= 70 ? '#f59e0b' : '#ef4444';
  const modelAvail = { fashion: aiStatus?.models.fashion.available ?? false, outfit: aiStatus?.models.outfit.available ?? false, makeup: aiStatus?.models.makeup.available ?? false, base: aiStatus?.models.base.available ?? false };

  // Current AI lip picks for selected skin tone
  const aiLipPicks = profile.skinTone ? AI_LIP_PICKS[profile.skinTone] : [];

  // Active palette data
  const paletteShades = paletteTab === 'lips' ? LIP_SHADES : paletteTab === 'eyes' ? EYE_SHADES : paletteTab === 'cheeks' ? BLUSH_SHADES : [];
  const activeFaves   = paletteTab === 'lips' ? profile.favoriteLipShades : paletteTab === 'eyes' ? profile.favoriteEyeShades : paletteTab === 'cheeks' ? profile.favoriteBlushShades : [];
  const toggleFave    = paletteTab === 'lips' ? profile.toggleLipShade : paletteTab === 'eyes' ? profile.toggleEyeShade : paletteTab === 'cheeks' ? profile.toggleBlushShade : () => {};

  return (
    <main style={{ minHeight: '100vh', background: 'var(--background)', paddingBottom: 110 }}>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(150deg, #1A3A12 0%, #2C4A1E 45%, #3D6B28 75%, #5A9240 100%)',
        padding: '20px 20px 56px', position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative blobs */}
        <div style={{ position: 'absolute', top: -60, right: -60, width: 240, height: 240, borderRadius: '50%', background: 'rgba(122,182,72,0.12)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -30, left: -50, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />

        {/* Top bar: settings icon */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
          <button style={{ width: 40, height: 40, borderRadius: 13, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Settings size={18} style={{ color: 'rgba(255,255,255,0.9)' }} />
          </button>
        </div>

        {/* Avatar + name row */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18, maxWidth: 640, margin: '0 auto' }}>
          {/* Avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div onClick={() => fileRef.current?.click()} style={{
              width: 80, height: 80, borderRadius: 26,
              background: profile.avatarDataUrl ? 'transparent' : 'rgba(255,255,255,0.15)',
              border: '2.5px solid rgba(255,255,255,0.40)',
              overflow: 'hidden', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {profile.avatarDataUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={profile.avatarDataUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: 28, fontWeight: 800, color: 'rgba(255,255,255,0.9)' }}>{initials}</span>}
            </div>
            <button onClick={() => fileRef.current?.click()} style={{
              position: 'absolute', bottom: -6, right: -6, width: 26, height: 26, borderRadius: 9,
              background: '#fff', border: '2px solid #2C4A1E',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}>
              <Camera size={11} style={{ color: '#2C4A1E' }} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
          </div>

          {/* Name + bio */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {editingName ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input autoFocus value={tempName} onChange={(e) => setTempName(e.target.value)} placeholder="Your name"
                  onKeyDown={(e) => { if (e.key === 'Enter') { profile.setName(tempName); setEditingName(false); } }}
                  style={{ flex: 1, background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.4)', borderRadius: 11, padding: '8px 12px', color: '#fff', fontSize: 20, fontWeight: 800, outline: 'none', letterSpacing: '-0.02em' }} />
                <button onClick={() => { profile.setName(tempName); setEditingName(false); }} style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={16} style={{ color: '#fff' }} />
                </button>
                <button onClick={() => setEditingName(false)} style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={16} style={{ color: 'rgba(255,255,255,0.7)' }} />
                </button>
              </div>
            ) : (
              <button onClick={() => { setTempName(profile.name); setEditingName(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                <h1 style={{ fontSize: 28, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.03em', lineHeight: 1 }}>
                  {profile.name || 'Add your name'}
                </h1>
                <Pencil size={14} style={{ color: 'rgba(255,255,255,0.55)', flexShrink: 0 }} />
              </button>
            )}
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.60)', margin: '5px 0 0', fontWeight: 500 }}>
              {profile.fashionStyles.slice(0, 2).map((s) => FASHION_STYLES.find((f) => f.id === s)?.label).filter(Boolean).join(' · ') || 'Wearly member'}
            </p>
          </div>
        </div>

        {/* Completeness */}
        <div style={{ maxWidth: 640, margin: '20px auto 0', background: 'rgba(255,255,255,0.10)', borderRadius: 14, padding: '12px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.70)', fontWeight: 600 }}>Profile complete</span>
            <span style={{ fontSize: 13, color: '#fff', fontWeight: 800 }}>{completeness}%</span>
          </div>
          <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.15)' }}>
            <div style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(to right, rgba(255,255,255,0.7), #fff)', width: `${completeness}%`, transition: 'width 1s ease' }} />
          </div>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 740, margin: '-28px auto 0', padding: '0 14px', position: 'relative' }}>

        {/* Quick stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 18 }}>
          {[
            { label: 'Wardrobe', value: wardrobe.items.length, color: '#2C4A1E', bg: '#f0f7eb', href: '/wardrobe' },
            { label: 'Wishlist',  value: wishlist.items.length,  color: '#be185d', bg: '#fff0f7', href: '/wishlist' },
            { label: 'AI Score',  value: aiLoading ? '…' : (aiStatus?.overallScore ?? 0), color: scoreColor, bg: '#fff' },
          ].map(({ label, value, color, bg, href }) => {
            const el = (
              <div style={{ background: bg, borderRadius: 18, border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 4px 18px rgba(0,0,0,0.07)', padding: '16px 12px', textAlign: 'center', cursor: href ? 'pointer' : 'default' }}>
                <div style={{ fontSize: 26, fontWeight: 900, color, letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
              </div>
            );
            return href ? <Link key={label} href={href} style={{ textDecoration: 'none' }}>{el}</Link> : <div key={label}>{el}</div>;
          })}
        </div>

        {/* Desktop: two columns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 0, alignItems: 'start' }}>
          {/* ── LEFT COLUMN ───────────────────────────────── */}
          <div style={{ minWidth: 0 }}>

            {/* About Me */}
            <Section title="My Profile" subtitle="Name · bio · gender" icon={Pencil} defaultOpen>
              {/* Bio */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 7 }}>Bio</label>
                {editingBio ? (
                  <div>
                    <textarea autoFocus value={tempBio} onChange={(e) => setTempBio(e.target.value)} placeholder="Your style story…" rows={3}
                      style={{ width: '100%', borderRadius: 13, border: '1.5px solid rgba(44,74,30,0.3)', padding: '10px 13px', fontSize: 14, resize: 'none', outline: 'none', background: 'var(--muted-bg)', color: 'var(--foreground)', fontFamily: 'inherit' }} />
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <button onClick={() => { profile.setBio(tempBio); setEditingBio(false); }} style={{ flex: 1, padding: '9px', borderRadius: 11, border: 'none', background: 'var(--primary)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Save</button>
                      <button onClick={() => setEditingBio(false)} style={{ flex: 1, padding: '9px', borderRadius: 11, border: '1.5px solid rgba(0,0,0,0.1)', background: 'transparent', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: 'var(--muted)' }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => { setTempBio(profile.bio); setEditingBio(true); }} style={{ width: '100%', textAlign: 'left', background: 'var(--muted-bg)', borderRadius: 13, border: '1.5px dashed rgba(0,0,0,0.11)', padding: '11px 13px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, color: profile.bio ? 'var(--foreground)' : 'var(--muted)' }}>{profile.bio || 'Add a bio…'}</span>
                    <Pencil size={12} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                  </button>
                )}
              </div>
              {/* Gender */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 8 }}>Gender</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {GENDER_OPTIONS.map(({ id, label }) => (
                    <button key={id} onClick={() => profile.setGender(id)} style={{
                      padding: '7px 14px', borderRadius: 20,
                      border: profile.gender === id ? '2px solid var(--primary)' : '1.5px solid rgba(0,0,0,0.10)',
                      background: profile.gender === id ? 'var(--primary-muted)' : 'transparent',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      color: profile.gender === id ? 'var(--primary)' : 'var(--foreground-mid)',
                      transition: 'all 0.15s',
                    }}>{label}</button>
                  ))}
                </div>
              </div>
            </Section>

            {/* Style DNA */}
            <Section title="Style DNA" subtitle="Skin tone · fashion style" icon={Sparkles} accent="#ec4899" defaultOpen>
              {/* Skin tone */}
              <div style={{ marginBottom: 22 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Skin Tone</label>
                  {profile.skinTone && (
                    <span style={{ fontSize: 12, color: '#ec4899', fontWeight: 600 }}>
                      {SKIN_TONES.find((t) => t.id === profile.skinTone)?.undertone}
                    </span>
                  )}
                </div>
                {/* Big Pinterest-style swatch row */}
                <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6, scrollbarWidth: 'none' }}>
                  {SKIN_TONES.map(({ id, label, hex }) => {
                    const active = profile.skinTone === id;
                    return (
                      <button key={id} onClick={() => profile.setSkinTone(id)} title={label}
                        style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                        <div style={{
                          width: 56, height: 56, borderRadius: '50%', background: hex,
                          border: active ? '3px solid var(--primary)' : '2.5px solid rgba(0,0,0,0.08)',
                          boxShadow: active ? `0 0 0 3px rgba(44,74,30,0.18), 0 4px 14px ${hex}60` : `0 2px 8px ${hex}50`,
                          transform: active ? 'scale(1.15)' : 'scale(1)',
                          transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          position: 'relative',
                        }}>
                          {active && (
                            <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Check size={10} style={{ color: '#fff' }} />
                            </div>
                          )}
                        </div>
                        <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, color: active ? 'var(--primary)' : 'var(--muted)', letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Fashion styles */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 10 }}>Your Style</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {FASHION_STYLES.map(({ id, label, emoji, color }) => {
                    const on = profile.fashionStyles.includes(id);
                    return (
                      <button key={id} onClick={() => profile.toggleFashionStyle(id)} style={{
                        padding: '8px 15px', borderRadius: 22,
                        border: on ? `2px solid ${color}` : '1.5px solid rgba(0,0,0,0.10)',
                        background: on ? `${color}14` : 'rgba(0,0,0,0.02)',
                        fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        color: on ? color : 'var(--foreground-mid)',
                        display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s',
                        boxShadow: on ? `0 2px 10px ${color}22` : 'none',
                      }}>
                        <span>{emoji}</span> {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </Section>

            {/* My Sizes */}
            <Section title="My Sizes" subtitle="Top · bottom · shoes" icon={Ruler} accent="#3b82f6">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                {([['top', 'Top', TOP_SIZES], ['bottom', 'Bottom', BOTTOM_SIZES], ['shoes', 'Shoes', SHOE_SIZES]] as const).map(([key, label, options]) => (
                  <div key={key}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 7 }}>{label}</label>
                    <select value={profile.sizes[key] ?? ''} onChange={(e) => profile.setSizes({ [key]: e.target.value })}
                      style={{ width: '100%', padding: '10px 10px', borderRadius: 13, border: '1.5px solid rgba(0,0,0,0.10)', background: 'var(--muted-bg)', fontSize: 14, fontWeight: 700, color: 'var(--foreground)', cursor: 'pointer', outline: 'none' }}>
                      <option value="">—</option>
                      {options.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </Section>
          </div>

          {/* ── RIGHT COLUMN ──────────────────────────────── */}
          <div style={{ minWidth: 0 }}>

            {/* Shades & Palette — the star section */}
            <Section title="Shades & Palette" subtitle="Lip · eye · cheek · skin finish" icon={Heart} accent="#ec4899" defaultOpen>

              {/* Tab bar */}
              <div style={{ display: 'flex', gap: 0, background: 'rgba(0,0,0,0.05)', borderRadius: 14, padding: 3, marginBottom: 20 }}>
                {(['lips', 'eyes', 'cheeks', 'skin'] as const).map((tab) => (
                  <button key={tab} onClick={() => setPaletteTab(tab)} style={{
                    flex: 1, padding: '8px 4px', borderRadius: 11,
                    border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                    background: paletteTab === tab ? '#fff' : 'transparent',
                    color: paletteTab === tab ? 'var(--foreground)' : 'var(--muted)',
                    boxShadow: paletteTab === tab ? '0 2px 8px rgba(0,0,0,0.10)' : 'none',
                    transition: 'all 0.18s', textTransform: 'capitalize', letterSpacing: '0.01em',
                  }}>
                    {tab === 'lips' ? '💄' : tab === 'eyes' ? '👁' : tab === 'cheeks' ? '🌸' : '✨'} {tab}
                  </button>
                ))}
              </div>

              {/* Skin finish grid */}
              {paletteTab === 'skin' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {SKIN_FINISHES.map(({ id, label, desc, icon: Icon, color }) => {
                    const active = profile.skinFinish === id;
                    return (
                      <button key={id} onClick={() => profile.setSkinFinish(active ? null : id)} style={{
                        padding: '14px 14px', borderRadius: 16, textAlign: 'left', cursor: 'pointer',
                        border: active ? `2px solid ${color}` : '1.5px solid rgba(0,0,0,0.08)',
                        background: active ? `${color}12` : 'rgba(0,0,0,0.02)',
                        transition: 'all 0.18s', boxShadow: active ? `0 4px 16px ${color}22` : 'none',
                      }}>
                        <Icon size={20} style={{ color: active ? color : 'var(--muted)', marginBottom: 8 }} />
                        <div style={{ fontSize: 14, fontWeight: 700, color: active ? color : 'var(--foreground)', marginBottom: 2 }}>{label}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.3 }}>{desc}</div>
                        {active && (
                          <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 20, background: `${color}18` }}>
                            <Check size={10} style={{ color }} />
                            <span style={{ fontSize: 11, fontWeight: 700, color }}>Selected</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <>
                  {/* AI picks banner */}
                  {profile.skinTone && paletteTab === 'lips' && aiLipPicks.length > 0 && (
                    <div style={{ marginBottom: 16, padding: '10px 13px', borderRadius: 13, background: 'linear-gradient(135deg, rgba(236,72,153,0.08), rgba(139,58,98,0.06))', border: '1px solid rgba(236,72,153,0.15)', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 16 }}>✨</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: '#be185d', margin: 0 }}>AI picks for your {SKIN_TONES.find((t) => t.id === profile.skinTone)?.label} skin</p>
                        <p style={{ fontSize: 11, color: 'var(--muted)', margin: '2px 0 0' }}>Marked with ✦ below</p>
                      </div>
                      <div style={{ display: 'flex', gap: -4 }}>
                        {aiLipPicks.map((h) => (
                          <div key={h} style={{ width: 18, height: 18, borderRadius: '50%', background: h, border: '2px solid #fff', marginLeft: -5, boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Hover shade name */}
                  {hoverShade ? (
                    <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px', borderRadius: 13, background: 'rgba(0,0,0,0.04)' }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: hoverShade.hex, flexShrink: 0, boxShadow: `0 2px 10px ${hoverShade.hex}60` }} />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>{hoverShade.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'monospace' }}>{hoverShade.hex.toUpperCase()}</div>
                      </div>
                    </div>
                  ) : (
                    <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12, marginTop: 0 }}>Tap a shade to favourite it · hover to preview</p>
                  )}

                  {/* Swatch circles — Pinterest style */}
                  <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }}>
                    {paletteShades.map(({ name, hex }) => {
                      const faved  = activeFaves.includes(hex);
                      const aiPick = paletteTab === 'lips' && aiLipPicks.includes(hex);
                      return (
                        <button key={hex}
                          onMouseEnter={() => setHoverShade({ name, hex })}
                          onMouseLeave={() => setHoverShade(null)}
                          onTouchStart={() => setHoverShade({ name, hex })}
                          onClick={() => toggleFave(hex)}
                          title={name}
                          style={{ flexShrink: 0, position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                          <div style={{
                            width: 52, height: 52, borderRadius: '50%', background: hex,
                            border: faved ? '3px solid var(--foreground)' : '2.5px solid rgba(255,255,255,0.9)',
                            boxShadow: faved ? `0 0 0 2px rgba(0,0,0,0.15), 0 4px 16px ${hex}60` : `0 3px 12px ${hex}50`,
                            transform: faved ? 'scale(1.18)' : 'scale(1)',
                            transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {faved && <Check size={14} style={{ color: '#fff', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }} />}
                          </div>
                          {aiPick && (
                            <div style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: '50%', background: '#fff', border: '1.5px solid #ec4899', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, lineHeight: 1, color: '#ec4899', fontWeight: 900, boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }}>
                              ✦
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Rainbow gradient picker strip — Sephora style */}
                  <div style={{ marginTop: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Spectrum</span>
                      <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>
                        {activeFaves.length} saved
                      </span>
                    </div>
                    <div style={{ height: 10, borderRadius: 99, background: paletteTab === 'lips' ? 'linear-gradient(to right, #F5DDD5, #E890A8, #C42830, #8B3A62, #6B2A5A, #C4572A, #D4A87A)' : paletteTab === 'eyes' ? 'linear-gradient(to right, #E8D4A0, #C8B090, #B87040, #7B52A8, #3A7840, #2A3A78, #4A5060)' : 'linear-gradient(to right, #F4907A, #E87A8A, #F4A878, #D46888, #C8804A, #D4986A)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }} />
                  </div>

                  {/* Saved swatches row */}
                  {activeFaves.length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <p style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Your Favourites</p>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {activeFaves.map((hex) => {
                          const shade = paletteShades.find((s) => s.hex === hex);
                          return (
                            <div key={hex} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 11px 5px 6px', borderRadius: 20, background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.07)' }}>
                              <div style={{ width: 20, height: 20, borderRadius: '50%', background: hex, boxShadow: `0 2px 6px ${hex}50` }} />
                              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground-mid)' }}>{shade?.name ?? hex}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </Section>

            {/* AI Enhancements */}
            <Section title="AI Enhancements" subtitle="Automation · smart features" icon={Zap} accent="#f59e0b">
              {[
                { key: 'autoAnalyzePhotos' as const, label: 'Auto-analyse photos', desc: 'Instant AI classification on upload' },
                { key: 'autoOOTD'           as const, label: 'Outfit of the Day',   desc: 'Morning AI pick based on weather' },
                { key: 'autoGroomingSuggest'as const, label: 'Grooming tips',        desc: 'Daily skincare from climate' },
                { key: 'autoMakeupSuggest'  as const, label: 'Makeup suggestions',   desc: 'Shades matched to outfit & tone' },
                { key: 'smartColorMatch'    as const, label: 'Smart colour match',    desc: 'Real-time harmony scoring' },
              ].map(({ key, label, desc }, i, arr) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 14, paddingBottom: i < arr.length - 1 ? 13 : 0, borderBottom: i < arr.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none', marginBottom: i < arr.length - 1 ? 13 : 0 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>{label}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{desc}</div>
                  </div>
                  <Toggle on={(profile as unknown as Record<string, boolean>)[key]} onChange={(v) => profile.setEnhancement(key, v)} />
                </div>
              ))}
            </Section>

            {/* App Settings */}
            <Section title="App Settings" subtitle="Currency · region · preferences" icon={Globe} accent="#3b82f6">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                {([['Currency', 'currency', CURRENCIES, profile.currency, profile.setCurrency], ['Region', 'region', REGIONS, profile.region, profile.setRegion]] as const).map(([lbl, , opts, val, fn]) => (
                  <div key={lbl}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 7 }}>{lbl}</label>
                    <select value={val} onChange={(e) => fn(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: 13, border: '1.5px solid rgba(0,0,0,0.10)', background: 'var(--muted-bg)', fontSize: 13, fontWeight: 700, color: 'var(--foreground)', cursor: 'pointer', outline: 'none' }}>
                      {(opts as readonly string[]).map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              {[
                { label: 'Notifications', desc: 'Daily outfit reminders', v: profile.notificationsEnabled, fn: profile.setNotifications, icon: Bell },
                { label: 'Eco Mode',       desc: 'Prefer sustainable items', v: profile.ecoMode, fn: profile.setEcoMode, icon: Leaf },
              ].map(({ label, desc, v, fn, icon: Icon }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <Icon size={15} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>{label}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{desc}</div>
                  </div>
                  <Toggle on={v} onChange={fn} />
                </div>
              ))}
            </Section>

            {/* AI Intelligence */}
            <div style={{ background: '#fff', borderRadius: 20, border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: 14, overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ padding: '18px 18px 16px', display: 'flex', alignItems: 'center', gap: 13 }}>
                <div style={{ width: 44, height: 44, borderRadius: 15, background: 'linear-gradient(135deg, #2C4A1E, #5A9240)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Brain size={22} style={{ color: '#fff' }} />
                </div>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--foreground)', margin: 0 }}>Wearly AI Brain</h2>
                  <p style={{ fontSize: 12, color: 'var(--muted)', margin: '2px 0 0' }}>Gemma 4 · Unsloth LoRA · Groq fallback</p>
                </div>
              </div>

              <div style={{ padding: '0 18px 18px' }}>
                {/* Score + backend */}
                <div style={{ display: 'flex', gap: 20, alignItems: 'center', padding: '14px 16px', borderRadius: 16, background: 'var(--muted-bg)', marginBottom: 16 }}>
                  {aiLoading
                    ? <div style={{ width: 88, height: 88, borderRadius: '50%', background: 'rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Cpu size={24} style={{ color: 'var(--muted)' }} /></div>
                    : <ScoreRing score={aiStatus?.overallScore ?? 0} color={scoreColor} />
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--foreground)', marginBottom: 3 }}>
                      {(aiStatus?.overallScore ?? 0) >= 90 ? '🏆 Expert' : (aiStatus?.overallScore ?? 0) >= 70 ? '⭐ Smart' : (aiStatus?.overallScore ?? 0) > 0 ? '🌱 Basic' : '🔌 Offline'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>Overall AI intelligence</div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 11px', borderRadius: 20, background: aiStatus?.backend === 'ollama' ? 'rgba(90,146,64,0.13)' : aiStatus?.backend === 'groq' ? 'rgba(59,130,246,0.13)' : 'rgba(0,0,0,0.07)' }}>
                      {aiStatus?.backend === 'ollama' ? <><Wifi size={12} style={{ color: '#5A9240' }} /><span style={{ fontSize: 12, fontWeight: 700, color: '#5A9240' }}>Ollama Local</span></>
                        : aiStatus?.backend === 'groq' ? <><CloudLightning size={12} style={{ color: '#3b82f6' }} /><span style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6' }}>Groq Cloud</span></>
                        : <><WifiOff size={12} style={{ color: 'var(--muted)' }} /><span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Offline</span></>}
                    </div>
                  </div>
                </div>

                {/* Model cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {AI_MODULES.map((mod) => {
                    const avail = modelAvail[mod.id as keyof typeof modelAvail];
                    const expanded = expandedModel === mod.id;
                    return (
                      <div key={mod.id} style={{ borderRadius: 14, border: `1.5px solid ${avail ? `${mod.color}30` : 'rgba(0,0,0,0.07)'}`, background: avail ? `${mod.color}0C` : 'rgba(0,0,0,0.02)', overflow: 'hidden', transition: 'all 0.2s' }}>
                        <button onClick={() => setExpandedModel(expanded ? null : mod.id)}
                          style={{ width: '100%', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 11, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                          <div style={{ width: 9, height: 9, borderRadius: '50%', flexShrink: 0, background: avail ? mod.color : 'rgba(0,0,0,0.15)', boxShadow: avail ? `0 0 0 3px ${mod.color}25` : 'none' }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: avail ? 'var(--foreground)' : 'var(--muted)' }}>{mod.label}</span>
                              <span style={{ fontSize: 10, fontWeight: 700, color: avail ? mod.color : 'var(--muted)', background: avail ? `${mod.color}18` : 'rgba(0,0,0,0.06)', padding: '2px 7px', borderRadius: 20 }}>
                                {avail ? 'ACTIVE' : 'UNTRAINED'}
                              </span>
                            </div>
                            <p style={{ fontSize: 11, color: 'var(--muted)', margin: '1px 0 0' }}>{mod.desc}</p>
                          </div>
                          <span style={{ fontSize: 15, fontWeight: 800, color: avail ? mod.color : 'var(--muted)', width: 34, textAlign: 'right' }}>{avail ? mod.baseScore : '—'}</span>
                          <ChevronRight size={13} style={{ color: 'var(--muted)', flexShrink: 0, transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                        </button>
                        {expanded && (
                          <div style={{ padding: '2px 14px 14px' }}>
                            <div style={{ padding: '7px 0 10px', borderBottom: '1px solid rgba(0,0,0,0.05)', marginBottom: 10 }}>
                              <code style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace' }}>Model: {mod.id === 'base' ? 'gemma4:e4b' : `wearly-${mod.id}-v1`}</code>
                            </div>
                            {mod.capabilities.map((c, i) => <CapBar key={c.name} name={c.name} score={avail ? c.score : Math.round(c.score * 0.75)} color={avail ? mod.color : 'rgba(0,0,0,0.22)'} delay={i * 110} />)}
                            {!avail && (
                              <div style={{ marginTop: 10, padding: '9px 12px', borderRadius: 11, background: 'rgba(0,0,0,0.04)', display: 'flex', gap: 8 }}>
                                <AlertCircle size={13} style={{ color: 'var(--muted)', flexShrink: 0, marginTop: 1 }} />
                                <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
                                  Run <code style={{ fontSize: 10 }}>training/notebooks/wearly_{mod.id}_finetune.ipynb</code> on Colab, then <code style={{ fontSize: 10 }}>ollama create wearly-{mod.id}-v1</code>
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Footer */}
                <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>Gemma 4 · Unsloth LoRA r=32 · Q4_K_M GGUF</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Star size={11} style={{ color: '#f59e0b' }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b' }}>v1.0</span>
                  </div>
                </div>
              </div>
            </div>

          </div>{/* end right col */}
        </div>{/* end grid */}

        {/* ── Self-Evolving App ─────────────────────────────────────── */}
        <div style={{
          background: '#fff',
          borderRadius: 24,
          border: '1px solid rgba(0,0,0,0.07)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
          marginBottom: 14,
          overflow: 'hidden',
        }}>
          {/* Card header */}
          <div style={{
            background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 50%, #0F3460 100%)',
            padding: '24px 22px 20px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Stars decoration */}
            {['10%,20%','70%,60%','40%,80%','90%,30%','55%,10%'].map((pos, i) => (
              <div key={i} style={{ position:'absolute', left: pos.split(',')[0], top: pos.split(',')[1], width: 3, height: 3, borderRadius:'50%', background:'rgba(255,255,255,0.6)', pointerEvents:'none' }} />
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative' }}>
              <div style={{ width: 48, height: 48, borderRadius: 16, background: 'linear-gradient(135deg, #7C3AED, #4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 20px rgba(124,58,237,0.45)' }}>
                <RefreshCw size={22} style={{ color: '#fff' }} />
              </div>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>Self-Evolving App</h2>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.60)', margin: '3px 0 0', lineHeight: 1.3 }}>
                  Describe an idea → Gemma AI plans it → GitHub PR opens automatically
                </p>
              </div>
            </div>
          </div>

          <div style={{ padding: '22px 22px 24px' }}>
            {/* Category chips */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Category</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {(['UI / Design', 'AI Feature', 'Performance', 'Bug Fix', 'New Section', 'Other'] as FeatureCategory[]).map((cat) => {
                  const active = evolveCategory === cat;
                  const colors: Record<string, string> = { 'UI / Design': '#3b82f6', 'AI Feature': '#7C3AED', Performance: '#10b981', 'Bug Fix': '#ef4444', 'New Section': '#f59e0b', Other: '#6B7280' };
                  const c = colors[cat] ?? '#6B7280';
                  return (
                    <button key={cat} onClick={() => setEvolveCategory(cat)} style={{
                      padding: '7px 14px', borderRadius: 20, cursor: 'pointer',
                      border: active ? `2px solid ${c}` : '1.5px solid rgba(0,0,0,0.10)',
                      background: active ? `${c}12` : 'transparent',
                      fontSize: 12, fontWeight: 600,
                      color: active ? c : 'var(--foreground-mid)',
                      transition: 'all 0.15s',
                    }}>{cat}</button>
                  );
                })}
              </div>
            </div>

            {/* Title input */}
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 7 }}>Feature title</p>
              <input
                value={evolveTitle}
                onChange={(e) => setEvolveTitle(e.target.value)}
                placeholder="e.g. Dark mode, Voice commands, Size recommendations…"
                style={{
                  width: '100%', borderRadius: 14, border: '1.5px solid rgba(0,0,0,0.12)',
                  padding: '12px 14px', fontSize: 14, fontWeight: 500,
                  background: 'var(--muted-bg)', color: 'var(--foreground)',
                  outline: 'none', fontFamily: 'inherit',
                  transition: 'border-color 0.15s',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#7C3AED')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(0,0,0,0.12)')}
              />
            </div>

            {/* Description textarea */}
            <div style={{ marginBottom: 18 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 7 }}>Describe the feature</p>
              <textarea
                value={evolveDesc}
                onChange={(e) => setEvolveDesc(e.target.value)}
                placeholder="What should it do? How should it feel? Any edge cases or references?"
                rows={4}
                style={{
                  width: '100%', borderRadius: 14, border: '1.5px solid rgba(0,0,0,0.12)',
                  padding: '12px 14px', fontSize: 14, resize: 'vertical',
                  background: 'var(--muted-bg)', color: 'var(--foreground)',
                  outline: 'none', fontFamily: 'inherit', lineHeight: 1.5,
                  transition: 'border-color 0.15s',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#7C3AED')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(0,0,0,0.12)')}
              />
            </div>

            {/* Submit */}
            <button
              onClick={submitEvolve}
              disabled={evolveLoading || !evolveTitle.trim() || !evolveDesc.trim()}
              style={{
                width: '100%', padding: '14px', borderRadius: 16, border: 'none',
                background: evolveLoading || !evolveTitle.trim() || !evolveDesc.trim()
                  ? 'rgba(0,0,0,0.10)'
                  : 'linear-gradient(135deg, #7C3AED, #4F46E5)',
                color: evolveLoading || !evolveTitle.trim() || !evolveDesc.trim() ? 'var(--muted)' : '#fff',
                fontSize: 15, fontWeight: 700, cursor: evolveLoading || !evolveTitle.trim() || !evolveDesc.trim() ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                boxShadow: evolveLoading || !evolveTitle.trim() ? 'none' : '0 4px 20px rgba(124,58,237,0.35)',
                transition: 'all 0.2s',
              }}
            >
              {evolveLoading
                ? <><Loader size={17} style={{ animation: 'spin 1s linear infinite' }} /> Gemma AI is planning…</>
                : <><Send size={17} /> Submit · Gemma AI will plan &amp; open a GitHub PR</>
              }
            </button>

            {/* Error */}
            {evolveError && (
              <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 13, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <AlertCircle size={14} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 13, color: '#ef4444', margin: 0 }}>{evolveError}</p>
              </div>
            )}

            {/* Success result */}
            {evolveResult && (
              <div style={{ marginTop: 16, padding: '16px', borderRadius: 16, background: 'linear-gradient(135deg, rgba(124,58,237,0.06), rgba(79,70,229,0.04))', border: '1px solid rgba(124,58,237,0.15)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: evolveResult.prCreated ? 'rgba(16,185,129,0.15)' : 'rgba(124,58,237,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {evolveResult.prCreated ? <GitPullRequest size={15} style={{ color: '#10b981' }} /> : <Brain size={15} style={{ color: '#7C3AED' }} />}
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)', margin: 0 }}>
                      {evolveResult.prCreated ? `✅ PR #${evolveResult.prNumber} created!` : '✅ AI plan generated'}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--muted)', margin: '1px 0 0' }}>
                      {evolveResult.prCreated ? 'Draft PR opened on GitHub — ready for review' : 'Add GITHUB_TOKEN to .env.local to auto-open PRs'}
                    </p>
                  </div>
                </div>
                {evolveResult.prUrl && (
                  <a href={evolveResult.prUrl} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 12, background: 'rgba(124,58,237,0.12)', color: '#7C3AED', fontSize: 13, fontWeight: 700, textDecoration: 'none', marginBottom: 12 }}>
                    <ExternalLink size={13} /> View PR on GitHub
                  </a>
                )}
                {evolveResult.aiPlan && (
                  <details style={{ marginTop: 4 }}>
                    <summary style={{ fontSize: 12, fontWeight: 600, color: '#7C3AED', cursor: 'pointer', marginBottom: 8 }}>View Gemma AI plan ▾</summary>
                    <div style={{ fontSize: 12, color: 'var(--foreground-mid)', lineHeight: 1.7, whiteSpace: 'pre-wrap', background: 'rgba(0,0,0,0.03)', borderRadius: 10, padding: '10px 12px', maxHeight: 300, overflowY: 'auto', fontFamily: 'monospace' }}>
                      {evolveResult.aiPlan}
                    </div>
                  </details>
                )}
              </div>
            )}

            {/* Previous submissions */}
            {evolve.features.length > 0 && (
              <div style={{ marginTop: 22 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Your contributions ({evolve.features.length})</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {evolve.features.map((f) => {
                    const statusColor = f.status === 'pr_created' || f.status === 'merged' ? '#10b981' : f.status === 'closed' ? '#ef4444' : '#7C3AED';
                    const statusLabel = f.status === 'pr_created' ? 'PR Open' : f.status === 'merged' ? 'Merged ✓' : f.status === 'closed' ? 'Closed' : 'Submitted';
                    return (
                      <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 14, background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.title}</p>
                          <p style={{ fontSize: 11, color: 'var(--muted)', margin: '2px 0 0' }}>
                            {f.category} · {new Date(f.submittedAt).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: statusColor, background: `${statusColor}14`, padding: '3px 9px', borderRadius: 20 }}>{statusLabel}</span>
                          {f.prUrl && (
                            <a href={f.prUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, background: 'rgba(0,0,0,0.05)', color: 'var(--muted)', textDecoration: 'none' }}>
                              <ExternalLink size={12} />
                            </a>
                          )}
                          <button onClick={() => evolve.removeFeature(f.id)} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Trash2 size={12} style={{ color: '#ef4444' }} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Spin animation for loader */}
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      </div>{/* end content */}
    </main>
  );
}
