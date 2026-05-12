// All app icons — no emoji. Custom SVGs for Singapore-specific symbols,
// Lucide for everything else.

import React from 'react';
import {
  Gift, Heart, Moon, Wrench, Flag, TreePine, Flame, Sparkles,
  Star, Briefcase, Coffee, Umbrella, PartyPopper, Plane, Dumbbell,
  Waves, Sun, CloudRain, Cloud, Lightbulb, Camera, Leaf,
  type LucideProps,
} from 'lucide-react';

// ── Shared prop type ──────────────────────────────────────────────────────────

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

// ── Custom SVG icons ──────────────────────────────────────────────────────────

export function DharmaWheelIcon({ size = 24, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.5" strokeLinecap="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="2.5" />
      {/* 8 spokes */}
      <line x1="12" y1="2"    x2="12"    y2="9.5"  />
      <line x1="12" y1="14.5" x2="12"    y2="22"   />
      <line x1="2"  y1="12"   x2="9.5"   y2="12"   />
      <line x1="14.5" y1="12" x2="22"    y2="12"   />
      <line x1="5.76" y1="5.76"   x2="9.95"  y2="9.95"  />
      <line x1="14.05" y1="14.05" x2="18.24" y2="18.24" />
      <line x1="18.24" y1="5.76"  x2="14.05" y2="9.95"  />
      <line x1="9.95"  y1="14.05" x2="5.76"  y2="18.24" />
    </svg>
  );
}

export function CrescentStarIcon({ size = 24, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Crescent */}
      <path d="M20 13.5A8.5 8.5 0 1 1 10.5 4a6.5 6.5 0 0 0 9.5 9.5z" />
      {/* Small 4-point star */}
      <path d="M19 4l.6 1.8H21.5l-1.5 1.1.6 1.8-1.6-1.1-1.6 1.1.6-1.8-1.5-1.1H18.4z" />
    </svg>
  );
}

export function CrossIcon({ size = 24, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" className={className}>
      <line x1="12" y1="2"  x2="12" y2="22" />
      <line x1="5"  y1="8"  x2="19" y2="8"  />
    </svg>
  );
}

export function FireworksIcon({ size = 24, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.5" strokeLinecap="round" className={className}>
      <circle cx="12" cy="9" r="1.5" />
      <line x1="12" y1="2"    x2="12" y2="5.5"   />
      <line x1="12" y1="12.5" x2="12" y2="16"    />
      <line x1="4.5" y1="9"   x2="8"  y2="9"     />
      <line x1="16"  y1="9"   x2="19.5" y2="9"   />
      <line x1="6.4" y1="3.4" x2="8.8" y2="5.8"  />
      <line x1="15.2" y1="12.2" x2="17.6" y2="14.6" />
      <line x1="17.6" y1="3.4" x2="15.2" y2="5.8" />
      <line x1="8.8"  y1="12.2" x2="6.4" y2="14.6" />
      {/* Burst lines for NYE */}
      <line x1="4" y1="19" x2="7"  y2="16" />
      <line x1="20" y1="19" x2="17" y2="16" />
      <line x1="12" y1="22" x2="12" y2="19" />
    </svg>
  );
}

export function LanternIcon({ size = 24, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="12" y1="2" x2="12" y2="5" />
      <rect x="7" y="5" width="10" height="14" rx="5" />
      <line x1="7" y1="9"  x2="17" y2="9"  />
      <line x1="7" y1="15" x2="17" y2="15" />
      <line x1="10" y1="19" x2="10" y2="22" />
      <line x1="14" y1="19" x2="14" y2="22" />
      <line x1="10" y1="22" x2="14" y2="22" />
    </svg>
  );
}

export function DiyaIcon({ size = 24, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Flame */}
      <path d="M12 3c0 4-3 5-3 8a3 3 0 0 0 6 0c0-3-3-4-3-8z" />
      {/* Wick */}
      <line x1="12" y1="14" x2="12" y2="16" />
      {/* Bowl */}
      <path d="M7 17 Q8 20 12 20 Q16 20 17 17" />
      <line x1="7" y1="17" x2="17" y2="17" />
    </svg>
  );
}

export function MooncakeIcon({ size = 24, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Full moon */}
      <circle cx="12" cy="12" r="9" />
      {/* Decorative cross pattern (mooncake stamp) */}
      <line x1="12" y1="4"  x2="12" y2="20" />
      <line x1="4"  y1="12" x2="20" y2="12" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  );
}

export function HongbaoIcon({ size = 24, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Envelope body */}
      <rect x="3" y="5" width="18" height="15" rx="2" />
      {/* Fold lines */}
      <path d="M3 7l9 6 9-6" />
      {/* Decorative circle (coin symbol) */}
      <circle cx="12" cy="14" r="3" />
      <line x1="12" y1="11" x2="12" y2="17" />
      <line x1="9"  y1="14" x2="15" y2="14" />
    </svg>
  );
}

// ── Event Icon — maps event name → SVG icon ───────────────────────────────────

type IconRenderer = (p: IconProps) => React.ReactElement;

const EVENT_MAP: Record<string, IconRenderer> = {
  'Chinese New Year':        (p) => <HongbaoIcon {...p} />,
  "Valentine's Day":         (p) => <Heart size={p.size} color={p.color} className={p.className} />,
  'Hari Raya Puasa':         (p) => <CrescentStarIcon {...p} />,
  'Good Friday':             (p) => <CrossIcon {...p} />,
  'Labour Day':              (p) => <Wrench size={p.size} color={p.color} className={p.className} />,
  'Vesak Day':               (p) => <DharmaWheelIcon {...p} />,
  'Hari Raya Haji':          (p) => <CrescentStarIcon {...p} />,
  'Singapore National Day':  (p) => <Flag size={p.size} color={p.color} className={p.className} />,
  'Mid-Autumn Festival':     (p) => <MooncakeIcon {...p} />,
  'Deepavali':               (p) => <DiyaIcon {...p} />,
  'Christmas':               (p) => <TreePine size={p.size} color={p.color} className={p.className} />,
  "New Year's Eve":          (p) => <FireworksIcon {...p} />,
};

export function EventIcon({ name, size = 22, color = 'currentColor', className }: IconProps & { name: string }) {
  const render = EVENT_MAP[name];
  if (render) return render({ size, color, className });
  return <Star size={size} color={color} className={className} />;
}

// ── Occasion Icon — maps occasion label → Lucide icon ────────────────────────

type LucideIcon = React.FC<LucideProps>;

const OCCASION_MAP: Record<string, LucideIcon> = {
  'Date Night':   Moon,
  'Office':       Briefcase,
  'Casual':       Coffee,
  'Weekend':      Umbrella,
  'Party':        PartyPopper,
  'Wedding':      Heart,
  'Festive':      Star,
  'Travel':       Plane,
  'Gym':          Dumbbell,
  'Beach / Pool': Waves,
};

export function OccasionIcon({ label, size = 22, color = 'currentColor' }: { label: string; size?: number; color?: string }) {
  const Icon = OCCASION_MAP[label] ?? Star;
  return <Icon size={size} color={color} />;
}

// ── Season Icon — maps season name → Lucide icon ──────────────────────────────

export function SeasonIcon({ season, size = 20, color = 'currentColor' }: { season: string; size?: number; color?: string }) {
  if (season.includes('National')) return <Flag size={size} color={color} />;
  if (season.includes('Festive') && season.includes('Q4')) return <LanternIcon size={size} color={color} />;
  if (season.includes('Festive')) return <FireworksIcon size={size} color={color} />;
  if (season.includes('Q4') || season.includes('Festival')) return <DiyaIcon size={size} color={color} />;
  return <Leaf size={size} color={color} />;
}

// ── Weather Condition Icon ────────────────────────────────────────────────────

export function WeatherConditionIcon({ condition, size = 22, color = 'currentColor' }: { condition: string; size?: number; color?: string }) {
  if (condition === 'rainy') return <CloudRain size={size} color={color} />;
  if (condition === 'cloudy') return <Cloud size={size} color={color} />;
  if (condition === 'cool' || condition === 'cold') return <Cloud size={size} color={color} />;
  return <Sun size={size} color={color} />;
}

// Re-export Lucide icons used across the app for convenience
export {
  Lightbulb, Camera, Star, Leaf, Sparkles, Gift, Flame,
  Moon, Flag, TreePine, Heart, PartyPopper, Plane, Dumbbell, Waves, Sun,
};
