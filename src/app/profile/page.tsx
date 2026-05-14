'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useProfileStore, SkinTone, FashionStyle, Gender } from '@/store/profile';
import { useWishlistStore } from '@/store/wishlist';
import { useWardrobeStore } from '@/store/wardrobe';
import {
  User, Camera, Pencil, Check, X, ChevronRight,
  Bookmark, Shirt, Sparkles, Zap, Leaf, Bell,
  Cpu, Wifi, WifiOff, CloudLightning, AlertCircle,
  ToggleLeft, ToggleRight, Globe, DollarSign,
  ShieldCheck, Brain, Star, TrendingUp,
} from 'lucide-react';

// ── Constants ──────────────────────────────────────────────────────────────────

const SKIN_TONES: { id: SkinTone; label: string; hex: string }[] = [
  { id: 'fair',   label: 'Fair',   hex: '#FDDBB4' },
  { id: 'light',  label: 'Light',  hex: '#EDB98A' },
  { id: 'medium', label: 'Medium', hex: '#C68642' },
  { id: 'tan',    label: 'Tan',    hex: '#A0522D' },
  { id: 'deep',   label: 'Deep',   hex: '#6B3A2A' },
  { id: 'rich',   label: 'Rich',   hex: '#3D1C09' },
];

const FASHION_STYLES: { id: FashionStyle; label: string; emoji: string }[] = [
  { id: 'minimalist', label: 'Minimalist', emoji: '⬜' },
  { id: 'classic',    label: 'Classic',    emoji: '👔' },
  { id: 'streetwear', label: 'Streetwear', emoji: '🧢' },
  { id: 'bohemian',   label: 'Bohemian',   emoji: '🌿' },
  { id: 'sporty',     label: 'Sporty',     emoji: '🏃' },
  { id: 'elegant',    label: 'Elegant',    emoji: '✨' },
  { id: 'edgy',       label: 'Edgy',       emoji: '⚡' },
  { id: 'preppy',     label: 'Preppy',     emoji: '🎓' },
  { id: 'casual',     label: 'Casual',     emoji: '👕' },
  { id: 'luxury',     label: 'Luxury',     emoji: '💎' },
];

const GENDER_OPTIONS: { id: Gender; label: string }[] = [
  { id: 'male',        label: 'Male'       },
  { id: 'female',      label: 'Female'     },
  { id: 'non-binary',  label: 'Non-binary' },
  { id: 'prefer-not',  label: 'Prefer not to say' },
];

const CURRENCIES = ['SGD', 'USD', 'EUR', 'GBP', 'MYR', 'IDR', 'PHP', 'THB', 'AUD'];
const REGIONS = ['Singapore', 'Malaysia', 'Indonesia', 'Thailand', 'Philippines', 'Australia', 'United Kingdom', 'United States'];

const TOP_SIZES    = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const BOTTOM_SIZES = ['28', '30', '32', '34', '36', '38', '40'];
const SHOE_SIZES   = ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45'];

// ── AI Models metadata ────────────────────────────────────────────────────────

const AI_MODULES = [
  {
    id: 'fashion',
    label: 'Fashion Vision',
    modelKey: 'wearly-fashion-v1',
    desc: 'Clothing recognition · colour naming · occasion tagging',
    baseScore: 92,
    color: '#5A9240',
    colorMuted: 'rgba(90,146,64,0.12)',
    capabilities: [
      { name: 'Colour Theory',      score: 94 },
      { name: 'Category Detection', score: 96 },
      { name: 'Occasion Tagging',   score: 88 },
      { name: 'Style Reading',      score: 87 },
    ],
  },
  {
    id: 'outfit',
    label: 'Outfit Scorer',
    modelKey: 'wearly-outfit-v1',
    desc: 'Outfit compatibility · harmony scoring · weather fit',
    baseScore: 88,
    color: '#3b82f6',
    colorMuted: 'rgba(59,130,246,0.12)',
    capabilities: [
      { name: 'Colour Harmony', score: 90 },
      { name: 'Style Pairing',  score: 88 },
      { name: 'Weather Fit',    score: 85 },
      { name: 'Occasion Match', score: 87 },
    ],
  },
  {
    id: 'makeup',
    label: 'Beauty Stylist',
    modelKey: 'wearly-makeup-v1',
    desc: 'Lipstick matching · jewelry pairing · skin finish',
    baseScore: 88,
    color: '#ec4899',
    colorMuted: 'rgba(236,72,153,0.12)',
    capabilities: [
      { name: 'Lip Shade Match', score: 91 },
      { name: 'Jewelry Pairing', score: 86 },
      { name: 'Skin Tone Fit',   score: 89 },
      { name: 'Look Curation',   score: 84 },
    ],
  },
  {
    id: 'base',
    label: 'Gemma 4 Base',
    modelKey: 'gemma4:e4b',
    desc: 'General reasoning · trend context · fallback model',
    baseScore: 79,
    color: '#f59e0b',
    colorMuted: 'rgba(245,158,11,0.12)',
    capabilities: [
      { name: 'General Reasoning', score: 85 },
      { name: 'Fashion Knowledge', score: 72 },
      { name: 'Style Advice',      score: 78 },
      { name: 'Cultural Context',  score: 80 },
    ],
  },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{
        width: 48, height: 28, borderRadius: 14,
        background: on ? 'var(--primary)' : 'rgba(0,0,0,0.12)',
        border: 'none', cursor: 'pointer',
        position: 'relative', flexShrink: 0,
        transition: 'background 0.25s',
      }}
    >
      <span style={{
        position: 'absolute', top: 3,
        left: on ? 23 : 3,
        width: 22, height: 22, borderRadius: '50%',
        background: '#fff',
        boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
        transition: 'left 0.25s cubic-bezier(0.4,0,0.2,1)',
        display: 'block',
      }} />
    </button>
  );
}

function SectionCard({ title, icon: Icon, children, accent }: {
  title: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="card" style={{ padding: '20px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: accent ? `${accent}18` : 'var(--primary-muted)',
        }}>
          <Icon size={16} style={{ color: accent ?? 'var(--primary)' }} />
        </div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--foreground)', margin: 0 }}>
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

// ── Animated Intelligence Ring ────────────────────────────────────────────────

function ScoreRing({ score, size = 100, color = '#5A9240', label }: {
  score: number; size?: number; color?: string; label?: string;
}) {
  const [animated, setAnimated] = useState(false);
  const r = (size - 12) / 2;
  const circum = 2 * Math.PI * r;
  const dashOffset = circum * (1 - (animated ? score / 100 : 0));

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth={8} />
        <circle cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circum}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: size * 0.24, fontWeight: 800, color, lineHeight: 1 }}>
          {animated ? score : 0}
        </span>
        {label && (
          <span style={{ fontSize: size * 0.11, color: 'var(--muted)', fontWeight: 600, marginTop: 2 }}>
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Animated bar ───────────────────────────────────────────────────────────────

function CapabilityBar({ name, score, color, delay = 0 }: {
  name: string; score: number; color: string; delay?: number;
}) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(score), 300 + delay);
    return () => clearTimeout(t);
  }, [score, delay]);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: 'var(--foreground-mid)', fontWeight: 500 }}>{name}</span>
        <span style={{ fontSize: 12, color, fontWeight: 700 }}>{score}</span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: 'rgba(0,0,0,0.07)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 99,
          background: `linear-gradient(to right, ${color}aa, ${color})`,
          width: `${width}%`,
          transition: `width 0.9s cubic-bezier(0.4,0,0.2,1) ${delay}ms`,
        }} />
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

interface AIStatus {
  backend: 'ollama' | 'groq' | 'none';
  ollamaReachable: boolean;
  groqConfigured: boolean;
  models: {
    base:    { available: boolean; version?: string };
    fashion: { available: boolean; version?: string };
    outfit:  { available: boolean; version?: string };
    makeup:  { available: boolean; version?: string };
  };
  overallScore: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const profile   = useProfileStore();
  const wishlist  = useWishlistStore();
  const wardrobe  = useWardrobeStore();

  const [editingName, setEditingName] = useState(false);
  const [editingBio,  setEditingBio]  = useState(false);
  const [tempName,    setTempName]    = useState('');
  const [tempBio,     setTempBio]     = useState('');
  const [aiStatus,    setAiStatus]    = useState<AIStatus | null>(null);
  const [aiLoading,   setAiLoading]   = useState(true);
  const [expandedModel, setExpandedModel] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Load live AI status
  useEffect(() => {
    fetch('/api/ai-status')
      .then((r) => r.json())
      .then((d) => setAiStatus(d))
      .catch(() => {})
      .finally(() => setAiLoading(false));
  }, []);

  // Profile completeness (0–100)
  const completeness = (() => {
    let score = 0;
    if (profile.name)                        score += 20;
    if (profile.bio)                         score += 10;
    if (profile.skinTone)                    score += 15;
    if (profile.fashionStyles.length > 0)    score += 15;
    if (profile.sizes.top)                   score += 10;
    if (profile.gender !== 'prefer-not')     score += 10;
    if (profile.avatarDataUrl)               score += 20;
    return score;
  })();

  const handleAvatarUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => profile.setAvatar(ev.target?.result as string);
    reader.readAsDataURL(file);
  }, [profile]);

  const initials = profile.name
    ? profile.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  // Model availability map keyed by module id
  const modelAvail: Record<string, boolean> = {
    fashion: aiStatus?.models.fashion.available ?? false,
    outfit:  aiStatus?.models.outfit.available  ?? false,
    makeup:  aiStatus?.models.makeup.available  ?? false,
    base:    aiStatus?.models.base.available    ?? false,
  };

  const effectiveScore = aiStatus?.overallScore ?? 0;
  const scoreColor = effectiveScore >= 90 ? '#5A9240' : effectiveScore >= 75 ? '#f59e0b' : '#ef4444';

  return (
    <main style={{ minHeight: '100vh', paddingBottom: 100 }}>

      {/* ── Hero Header ──────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(160deg, var(--primary) 0%, var(--primary-mid) 60%, var(--accent) 100%)',
        padding: '48px 24px 80px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'absolute', bottom: -20, left: -30, width: 150, height: 150, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

        <div style={{ maxWidth: 480, margin: '0 auto', position: 'relative' }}>
          {/* Avatar */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, marginBottom: 20 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{
                width: 90, height: 90, borderRadius: 28,
                background: profile.avatarDataUrl ? 'transparent' : 'rgba(255,255,255,0.18)',
                border: '3px solid rgba(255,255,255,0.35)',
                overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }} onClick={() => fileRef.current?.click()}>
                {profile.avatarDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatarDataUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: 32, fontWeight: 800, color: 'rgba(255,255,255,0.9)' }}>{initials}</span>
                )}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                style={{
                  position: 'absolute', bottom: -6, right: -6,
                  width: 28, height: 28, borderRadius: 10,
                  background: 'rgba(255,255,255,0.95)',
                  border: '2px solid var(--primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                }}>
                <Camera size={12} style={{ color: 'var(--primary)' }} />
              </button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              {editingName ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    autoFocus
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    placeholder="Your name"
                    style={{
                      flex: 1, background: 'rgba(255,255,255,0.15)',
                      border: '1.5px solid rgba(255,255,255,0.4)',
                      borderRadius: 12, padding: '8px 12px',
                      color: '#fff', fontSize: 18, fontWeight: 700,
                      outline: 'none',
                    }}
                  />
                  <button onClick={() => { profile.setName(tempName); setEditingName(false); }}
                    style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Check size={16} style={{ color: '#fff' }} />
                  </button>
                  <button onClick={() => setEditingName(false)}
                    style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={16} style={{ color: '#fff' }} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setTempName(profile.name); setEditingName(true); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
                    {profile.name || 'Add your name'}
                  </h1>
                  <Pencil size={14} style={{ color: 'rgba(255,255,255,0.6)', flexShrink: 0 }} />
                </button>
              )}
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', margin: '4px 0 0', fontWeight: 500 }}>
                {profile.fashionStyles.length > 0
                  ? profile.fashionStyles.slice(0, 2).map((s) => FASHION_STYLES.find((f) => f.id === s)?.label).join(' · ')
                  : 'Fashion lover'}
              </p>
            </div>
          </div>

          {/* Completeness bar */}
          <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '12px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>Profile complete</span>
              <span style={{ fontSize: 14, color: '#fff', fontWeight: 800 }}>{completeness}%</span>
            </div>
            <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.18)' }}>
              <div style={{
                height: '100%', borderRadius: 99,
                background: 'linear-gradient(to right, rgba(255,255,255,0.7), #fff)',
                width: `${completeness}%`,
                transition: 'width 1s ease',
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* Content pulled up over hero */}
      <div style={{ maxWidth: 480, margin: '-32px auto 0', padding: '0 16px', position: 'relative' }}>

        {/* Quick stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Items', value: wardrobe.items.length, icon: Shirt,    color: 'var(--primary)' },
            { label: 'Wishlist', value: wishlist.items.length, icon: Bookmark, color: '#ec4899' },
            { label: 'AI Score', value: `${effectiveScore}`, icon: Brain,   color: scoreColor },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card" style={{ padding: '14px 12px', textAlign: 'center' }}>
              <Icon size={18} style={{ color, marginBottom: 4 }} />
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--foreground)', lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginTop: 3 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* ── About Me ─────────────────────────────────────────────── */}
        <SectionCard title="About Me" icon={User}>
          {/* Bio */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Bio</label>
            {editingBio ? (
              <div>
                <textarea
                  autoFocus
                  value={tempBio}
                  onChange={(e) => setTempBio(e.target.value)}
                  placeholder="Tell us about your style…"
                  rows={3}
                  style={{
                    width: '100%', borderRadius: 12, border: '1.5px solid rgba(44,74,30,0.3)',
                    padding: '10px 12px', fontSize: 14, resize: 'none', outline: 'none',
                    background: 'var(--muted-bg)', color: 'var(--foreground)', fontFamily: 'inherit',
                  }}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button onClick={() => { profile.setBio(tempBio); setEditingBio(false); }}
                    style={{ flex: 1, padding: '8px', borderRadius: 10, border: 'none', background: 'var(--primary)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    Save
                  </button>
                  <button onClick={() => setEditingBio(false)}
                    style={{ flex: 1, padding: '8px', borderRadius: 10, border: '1.5px solid rgba(0,0,0,0.1)', background: 'transparent', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: 'var(--muted)' }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => { setTempBio(profile.bio); setEditingBio(true); }}
                style={{ width: '100%', textAlign: 'left', background: 'var(--muted-bg)', borderRadius: 12, border: '1.5px dashed rgba(0,0,0,0.10)', padding: '10px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, color: profile.bio ? 'var(--foreground)' : 'var(--muted)' }}>
                  {profile.bio || 'Add a bio…'}
                </span>
                <Pencil size={13} style={{ color: 'var(--muted)', flexShrink: 0 }} />
              </button>
            )}
          </div>

          {/* Gender */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>Gender</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {GENDER_OPTIONS.map(({ id, label }) => (
                <button key={id} onClick={() => profile.setGender(id)}
                  style={{
                    padding: '7px 14px', borderRadius: 20,
                    border: profile.gender === id ? '2px solid var(--primary)' : '1.5px solid rgba(0,0,0,0.1)',
                    background: profile.gender === id ? 'var(--primary-muted)' : 'transparent',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    color: profile.gender === id ? 'var(--primary)' : 'var(--foreground-mid)',
                    transition: 'all 0.15s',
                  }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </SectionCard>

        {/* ── Style DNA ────────────────────────────────────────────── */}
        <SectionCard title="Style DNA" icon={Sparkles} accent="#ec4899">
          {/* Skin Tone */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 10 }}>Skin Tone</label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {SKIN_TONES.map(({ id, label, hex }) => (
                <button key={id} onClick={() => profile.setSkinTone(id)}
                  title={label}
                  style={{
                    width: 44, height: 44, borderRadius: 14,
                    background: hex,
                    border: profile.skinTone === id
                      ? '3px solid var(--primary)'
                      : '2.5px solid rgba(0,0,0,0.10)',
                    cursor: 'pointer',
                    boxShadow: profile.skinTone === id ? '0 0 0 2px rgba(44,74,30,0.2)' : 'none',
                    position: 'relative',
                    transition: 'transform 0.15s, box-shadow 0.15s',
                    transform: profile.skinTone === id ? 'scale(1.12)' : 'scale(1)',
                  }}>
                  {profile.skinTone === id && (
                    <Check size={14} style={{ color: '#fff', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))' }} />
                  )}
                </button>
              ))}
            </div>
            {profile.skinTone && (
              <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
                {SKIN_TONES.find((t) => t.id === profile.skinTone)?.label} · AI will personalise makeup for your skin
              </p>
            )}
          </div>

          {/* Fashion Styles */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 10 }}>Your Style (pick all that fit)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {FASHION_STYLES.map(({ id, label, emoji }) => {
                const on = profile.fashionStyles.includes(id);
                return (
                  <button key={id} onClick={() => profile.toggleFashionStyle(id)}
                    style={{
                      padding: '8px 14px', borderRadius: 20,
                      border: on ? '2px solid var(--primary)' : '1.5px solid rgba(0,0,0,0.1)',
                      background: on ? 'var(--primary-muted)' : 'transparent',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      color: on ? 'var(--primary)' : 'var(--foreground-mid)',
                      display: 'flex', alignItems: 'center', gap: 5,
                      transition: 'all 0.15s',
                    }}>
                    <span>{emoji}</span> {label}
                  </button>
                );
              })}
            </div>
          </div>
        </SectionCard>

        {/* ── My Sizes ─────────────────────────────────────────────── */}
        <SectionCard title="My Sizes" icon={Shirt} accent="#3b82f6">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {[
              { key: 'top'    as const, label: 'Top / Shirt', options: TOP_SIZES },
              { key: 'bottom' as const, label: 'Bottom',      options: BOTTOM_SIZES },
              { key: 'shoes'  as const, label: 'Shoes',       options: SHOE_SIZES },
            ].map(({ key, label, options }) => (
              <div key={key}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>{label}</label>
                <select
                  value={profile.sizes[key] ?? ''}
                  onChange={(e) => profile.setSizes({ [key]: e.target.value })}
                  style={{
                    width: '100%', padding: '9px 10px', borderRadius: 12,
                    border: '1.5px solid rgba(0,0,0,0.10)',
                    background: 'var(--muted-bg)', fontSize: 14, fontWeight: 600,
                    color: 'var(--foreground)', cursor: 'pointer', outline: 'none',
                  }}>
                  <option value="">—</option>
                  {options.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* ── Quick Links ──────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <Link href="/wishlist" style={{ textDecoration: 'none' }}>
            <div className="card" style={{
              padding: '18px 16px',
              background: 'linear-gradient(135deg, #fff5f9, #fff)',
              cursor: 'pointer', transition: 'transform 0.15s',
            }}>
              <Bookmark size={22} style={{ color: '#ec4899', marginBottom: 8 }} />
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--foreground)' }}>Wishlist</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{wishlist.items.length} items saved</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 10 }}>
                <span style={{ fontSize: 12, color: '#ec4899', fontWeight: 600 }}>View all</span>
                <ChevronRight size={12} style={{ color: '#ec4899' }} />
              </div>
            </div>
          </Link>
          <Link href="/wardrobe" style={{ textDecoration: 'none' }}>
            <div className="card" style={{
              padding: '18px 16px',
              background: 'linear-gradient(135deg, #f0f7eb, #fff)',
              cursor: 'pointer', transition: 'transform 0.15s',
            }}>
              <Shirt size={22} style={{ color: 'var(--primary)', marginBottom: 8 }} />
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--foreground)' }}>Wardrobe</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{wardrobe.items.length} items added</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 10 }}>
                <span style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>Manage</span>
                <ChevronRight size={12} style={{ color: 'var(--primary)' }} />
              </div>
            </div>
          </Link>
        </div>

        {/* ── AI Enhancements ──────────────────────────────────────── */}
        <SectionCard title="AI Enhancements" icon={Zap} accent="#f59e0b">
          {[
            {
              key: 'autoAnalyzePhotos' as const,
              label: 'Auto-analyse uploaded photos',
              desc: 'AI instantly classifies every wardrobe photo you upload',
            },
            {
              key: 'autoOOTD' as const,
              label: 'Auto Outfit of the Day',
              desc: 'AI picks your best outfit every morning based on weather',
            },
            {
              key: 'autoGroomingSuggest' as const,
              label: 'Grooming suggestions',
              desc: 'Daily skincare routine based on weather & wardrobe',
            },
            {
              key: 'autoMakeupSuggest' as const,
              label: 'Makeup & beauty suggestions',
              desc: 'Lip shades, eye looks, jewelry matched to your outfit',
            },
            {
              key: 'smartColorMatch' as const,
              label: 'Smart colour matching',
              desc: 'AI rates outfit colour harmony in real time',
            },
          ].map(({ key, label, desc }, i) => (
            <div key={key} style={{
              display: 'flex', alignItems: 'center', gap: 14, paddingBottom: 14,
              borderBottom: i < 4 ? '1px solid rgba(0,0,0,0.05)' : 'none',
              marginBottom: i < 4 ? 14 : 0,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>{label}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{desc}</div>
              </div>
              <Toggle on={(profile as unknown as Record<string, boolean>)[key]} onChange={(v) => profile.setEnhancement(key, v)} />
            </div>
          ))}
        </SectionCard>

        {/* ── App Settings ─────────────────────────────────────────── */}
        <SectionCard title="App Settings" icon={Globe} accent="#3b82f6">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Currency</label>
              <select value={profile.currency} onChange={(e) => profile.setCurrency(e.target.value)}
                style={{ width: '100%', padding: '9px 10px', borderRadius: 12, border: '1.5px solid rgba(0,0,0,0.10)', background: 'var(--muted-bg)', fontSize: 14, fontWeight: 600, color: 'var(--foreground)', cursor: 'pointer', outline: 'none' }}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Region</label>
              <select value={profile.region} onChange={(e) => profile.setRegion(e.target.value)}
                style={{ width: '100%', padding: '9px 10px', borderRadius: 12, border: '1.5px solid rgba(0,0,0,0.10)', background: 'var(--muted-bg)', fontSize: 14, fontWeight: 600, color: 'var(--foreground)', cursor: 'pointer', outline: 'none' }}>
                {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          {[
            { label: 'Notifications', desc: 'Daily outfit reminders & laundry alerts', value: profile.notificationsEnabled, onChange: profile.setNotifications, icon: Bell },
            { label: 'Eco Mode',       desc: 'Prioritise sustainable & low-impact items', value: profile.ecoMode, onChange: profile.setEcoMode, icon: Leaf },
          ].map(({ label, desc, value, onChange, icon: Icon }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              <Icon size={16} style={{ color: 'var(--muted)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>{label}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{desc}</div>
              </div>
              <Toggle on={value} onChange={onChange} />
            </div>
          ))}
        </SectionCard>

        {/* ── AI Intelligence ──────────────────────────────────────── */}
        <div className="card" style={{ padding: '24px 20px', marginBottom: 16 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 14, flexShrink: 0,
              background: 'linear-gradient(135deg, var(--primary-mid), var(--accent))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Brain size={20} style={{ color: '#fff' }} />
            </div>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--foreground)', margin: 0 }}>Wearly AI Intelligence</h2>
              <p style={{ fontSize: 12, color: 'var(--muted)', margin: '2px 0 0' }}>Local Gemma 4 · Fine-tuned modules · Groq cloud fallback</p>
            </div>
          </div>

          {/* Overall score + backend status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 24, padding: '16px', borderRadius: 16, background: 'var(--muted-bg)' }}>
            {aiLoading ? (
              <div style={{ width: 90, height: 90, borderRadius: '50%', background: 'rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Cpu size={24} style={{ color: 'var(--muted)' }} />
              </div>
            ) : (
              <ScoreRing score={effectiveScore} size={90} color={scoreColor} label="/ 100" />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)', marginBottom: 4 }}>
                {effectiveScore >= 90 ? '🏆 Expert AI' : effectiveScore >= 75 ? '⭐ Smart AI' : effectiveScore > 0 ? '🌱 Basic AI' : '🔌 Offline'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>Overall intelligence score</div>

              {/* Backend pill */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 20, background: aiStatus?.backend === 'ollama' ? 'rgba(90,146,64,0.12)' : aiStatus?.backend === 'groq' ? 'rgba(59,130,246,0.12)' : 'rgba(0,0,0,0.07)' }}>
                {aiStatus?.backend === 'ollama' ? (
                  <><Wifi size={12} style={{ color: '#5A9240' }} /><span style={{ fontSize: 12, fontWeight: 700, color: '#5A9240' }}>Ollama Local</span></>
                ) : aiStatus?.backend === 'groq' ? (
                  <><CloudLightning size={12} style={{ color: '#3b82f6' }} /><span style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6' }}>Groq Cloud</span></>
                ) : (
                  <><WifiOff size={12} style={{ color: 'var(--muted)' }} /><span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>AI Offline</span></>
                )}
              </div>
            </div>
          </div>

          {/* Model cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {AI_MODULES.map((mod, modIdx) => {
              const isAvail = modelAvail[mod.id];
              const isExpanded = expandedModel === mod.id;

              return (
                <div key={mod.id} style={{
                  borderRadius: 16,
                  border: `1.5px solid ${isAvail ? `${mod.color}30` : 'rgba(0,0,0,0.07)'}`,
                  background: isAvail ? mod.colorMuted : 'rgba(0,0,0,0.02)',
                  overflow: 'hidden',
                  transition: 'all 0.2s',
                }}>
                  {/* Model header row */}
                  <button
                    onClick={() => setExpandedModel(isExpanded ? null : mod.id)}
                    style={{
                      width: '100%', padding: '14px 16px',
                      display: 'flex', alignItems: 'center', gap: 12,
                      background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                    }}>
                    {/* Status dot */}
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                      background: isAvail ? mod.color : 'rgba(0,0,0,0.15)',
                      boxShadow: isAvail ? `0 0 0 3px ${mod.color}25` : 'none',
                    }} />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: isAvail ? 'var(--foreground)' : 'var(--muted)' }}>
                          {mod.label}
                        </span>
                        {isAvail ? (
                          <span style={{ fontSize: 10, fontWeight: 700, color: mod.color, background: `${mod.color}18`, padding: '2px 7px', borderRadius: 20 }}>
                            ACTIVE
                          </span>
                        ) : (
                          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', background: 'rgba(0,0,0,0.06)', padding: '2px 7px', borderRadius: 20 }}>
                            NOT TRAINED
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: 11, color: 'var(--muted)', margin: '2px 0 0', lineHeight: 1.3 }}>{mod.desc}</p>
                    </div>

                    {/* Score pill */}
                    <div style={{
                      fontSize: 15, fontWeight: 800,
                      color: isAvail ? mod.color : 'var(--muted)',
                      width: 38, textAlign: 'right',
                    }}>
                      {isAvail ? mod.baseScore : '—'}
                    </div>

                    <ChevronRight size={14} style={{
                      color: 'var(--muted)', flexShrink: 0,
                      transform: isExpanded ? 'rotate(90deg)' : 'none',
                      transition: 'transform 0.2s',
                    }} />
                  </button>

                  {/* Expanded capability bars */}
                  {isExpanded && (
                    <div style={{ padding: '4px 16px 16px' }}>
                      <div style={{ marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                        <code style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace' }}>
                          {mod.modelKey}
                        </code>
                      </div>
                      {mod.capabilities.map((cap, i) => (
                        <CapabilityBar
                          key={cap.name}
                          name={cap.name}
                          score={isAvail ? cap.score : Math.round(cap.score * 0.75)}
                          color={isAvail ? mod.color : 'rgba(0,0,0,0.25)'}
                          delay={i * 120}
                        />
                      ))}
                      {!isAvail && (
                        <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 12, background: 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                          <AlertCircle size={14} style={{ color: 'var(--muted)', flexShrink: 0, marginTop: 1 }} />
                          <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0, lineHeight: 1.4 }}>
                            Train this model in Google Colab using <code style={{ fontSize: 11 }}>training/notebooks/</code> then run <code style={{ fontSize: 11 }}>ollama create {mod.modelKey}</code> locally.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Version footer */}
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>
                Base: <strong>Gemma 4 (e4b)</strong> · Fine-tune: Unsloth LoRA
              </p>
              <p style={{ fontSize: 11, color: 'var(--muted)', margin: '2px 0 0' }}>
                Datasets: YouMakeup · FFHQ · BeautyBank · CPM · LADN · FLUX
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Star size={12} style={{ color: '#f59e0b' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b' }}>v1.0</span>
            </div>
          </div>
        </div>

        {/* ── Sign Out / Data ───────────────────────────────────────── */}
        <div className="card" style={{ padding: '16px 20px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShieldCheck size={16} style={{ color: 'var(--muted)' }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)', margin: 0 }}>Your data stays on your device</p>
              <p style={{ fontSize: 12, color: 'var(--muted)', margin: '2px 0 0' }}>Wearly stores everything locally — no account required</p>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
