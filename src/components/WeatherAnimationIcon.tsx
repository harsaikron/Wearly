'use client';

import React from 'react';

/* ─────────────────────────────────────────────────────────────────
   Animated weather icons — iOS-style SVG animations
   All icons are white for use on dark backgrounds.
   Pass `color` to override (default white).
   ───────────────────────────────────────────────────────────────── */

const uid = (id: string) => `wx-${id}`;

// ── Keyframe injection (once per icon type) ───────────────────────
const STYLES = `
@keyframes wx-rain-drop { 0%{transform:translateY(-6px);opacity:0} 30%{opacity:1} 100%{transform:translateY(14px);opacity:0} }
@keyframes wx-sun-rot   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
@keyframes wx-sun-pulse { 0%,100%{r:4.5px} 50%{r:5.5px} }
@keyframes wx-cloud-bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-2px)} }
@keyframes wx-lightning { 0%,100%{opacity:1} 45%{opacity:1} 50%{opacity:0} 55%{opacity:0} 60%{opacity:1} }
@keyframes wx-snow      { 0%{transform:translateY(-4px) rotate(0deg);opacity:0} 30%{opacity:1} 100%{transform:translateY(14px) rotate(180deg);opacity:0} }
@keyframes wx-mist-wave { 0%,100%{opacity:0.35;transform:translateX(0)} 50%{opacity:0.7;transform:translateX(3px)} }
@keyframes wx-wind-move { 0%{transform:translateX(0);opacity:0.6} 50%{transform:translateX(3px);opacity:1} 100%{transform:translateX(0);opacity:0.6} }
`;

function injectStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('wx-anim-styles')) return;
  const s = document.createElement('style');
  s.id = 'wx-anim-styles';
  s.textContent = STYLES;
  document.head.appendChild(s);
}

// ── Rainy ──────────────────────────────────────────────────────────
function RainIcon({ c }: { c: string }) {
  injectStyles();
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Cloud */}
      <path
        d="M12 22 a9 9 0 1 1 9-9 a7 7 0 0 1 0 14Z"
        stroke={c} strokeWidth="1.8" fill="none" strokeLinecap="round"
        style={{ animation: 'wx-cloud-bob 3s ease-in-out infinite' }}
      />
      <path
        d="M20 27 h14 a8 8 0 0 0 0-16 a8 8 0 0 0-14-4 a9 9 0 0 0-3 17Z"
        stroke={c} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"
        style={{ animation: 'wx-cloud-bob 3s ease-in-out infinite' }}
      />
      {/* Rain drops */}
      {[
        { x: 18, delay: '0s' },
        { x: 25, delay: '0.35s' },
        { x: 32, delay: '0.7s' },
        { x: 21, delay: '0.55s' },
        { x: 28, delay: '0.2s' },
      ].map((d, i) => (
        <line
          key={i}
          x1={d.x} y1="30" x2={d.x - 2} y2="40"
          stroke={c} strokeWidth="1.6" strokeLinecap="round"
          style={{ animation: `wx-rain-drop 1.1s ease-in infinite ${d.delay}` }}
        />
      ))}
    </svg>
  );
}

// ── Thunderstorm ───────────────────────────────────────────────────
function ThunderIcon({ c }: { c: string }) {
  injectStyles();
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M20 27 h14 a8 8 0 0 0 0-16 a8 8 0 0 0-14-4 a9 9 0 0 0-3 17Z"
        stroke={c} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"
        style={{ animation: 'wx-cloud-bob 3s ease-in-out infinite' }}
      />
      {/* Lightning bolt */}
      <polyline
        points="28,28 23,37 27,37 22,47"
        stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        style={{ animation: 'wx-lightning 2.4s ease-in-out infinite' }}
      />
      {/* Side rain */}
      {[{ x: 17, delay: '0s' }, { x: 36, delay: '0.5s' }].map((d, i) => (
        <line key={i} x1={d.x} y1="30" x2={d.x - 2} y2="40"
          stroke={c} strokeWidth="1.4" strokeLinecap="round"
          style={{ animation: `wx-rain-drop 1.2s ease-in infinite ${d.delay}` }}
        />
      ))}
    </svg>
  );
}

// ── Sunny ──────────────────────────────────────────────────────────
function SunIcon({ c }: { c: string }) {
  injectStyles();
  const cx = 26, cy = 26, r = 8;
  const rays = Array.from({ length: 8 }, (_, i) => {
    const a = (i * 45 * Math.PI) / 180;
    const inner = r + 4, outer = r + 9;
    return {
      x1: cx + inner * Math.cos(a),
      y1: cy + inner * Math.sin(a),
      x2: cx + outer * Math.cos(a),
      y2: cy + outer * Math.sin(a),
    };
  });
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
      <g style={{ transformOrigin: '26px 26px', animation: 'wx-sun-rot 12s linear infinite' }}>
        {rays.map((ray, i) => (
          <line key={i} x1={ray.x1} y1={ray.y1} x2={ray.x2} y2={ray.y2}
            stroke={c} strokeWidth="2" strokeLinecap="round" />
        ))}
      </g>
      <circle cx={cx} cy={cy} r={r} fill={c}
        style={{ animation: 'wx-sun-pulse 3s ease-in-out infinite' }} />
    </svg>
  );
}

// ── Partly Cloudy ──────────────────────────────────────────────────
function PartlyCloudyIcon({ c }: { c: string }) {
  injectStyles();
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
      {/* Sun behind */}
      <circle cx="20" cy="20" r="7" fill={c} opacity="0.6" />
      <g style={{ transformOrigin: '20px 20px', animation: 'wx-sun-rot 14s linear infinite' }}>
        {Array.from({ length: 6 }, (_, i) => {
          const a = (i * 60 * Math.PI) / 180;
          return <line key={i} x1={20 + 10 * Math.cos(a)} y1={20 + 10 * Math.sin(a)}
            x2={20 + 13 * Math.cos(a)} y2={20 + 13 * Math.sin(a)}
            stroke={c} strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />;
        })}
      </g>
      {/* Cloud in front */}
      <path
        d="M24 32 h13 a7 7 0 0 0 0-14 a7 7 0 0 0-12-3 a8 8 0 0 0-4 14Z"
        stroke={c} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"
        style={{ animation: 'wx-cloud-bob 3.5s ease-in-out infinite' }}
      />
    </svg>
  );
}

// ── Cloudy ─────────────────────────────────────────────────────────
function CloudyIcon({ c }: { c: string }) {
  injectStyles();
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
      {/* Back cloud */}
      <path
        d="M14 28 h12 a6 6 0 0 0 0-12 a6 6 0 0 0-10-2 a7 7 0 0 0-4 12Z"
        stroke={c} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"
        opacity="0.45"
        style={{ animation: 'wx-cloud-bob 4s ease-in-out infinite 0.5s' }}
      />
      {/* Front cloud */}
      <path
        d="M22 33 h14 a8 8 0 0 0 0-16 a8 8 0 0 0-14-3 a9 9 0 0 0-3 16Z"
        stroke={c} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"
        style={{ animation: 'wx-cloud-bob 3s ease-in-out infinite' }}
      />
    </svg>
  );
}

// ── Drizzle ────────────────────────────────────────────────────────
function DrizzleIcon({ c }: { c: string }) {
  injectStyles();
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
      <path
        d="M20 27 h14 a8 8 0 0 0 0-16 a8 8 0 0 0-14-4 a9 9 0 0 0-3 17Z"
        stroke={c} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"
        style={{ animation: 'wx-cloud-bob 3s ease-in-out infinite' }}
      />
      {[{ x: 20, delay: '0s' }, { x: 28, delay: '0.6s' }, { x: 36, delay: '0.3s' }].map((d, i) => (
        <line key={i} x1={d.x} y1="31" x2={d.x - 1.5} y2="39"
          stroke={c} strokeWidth="1.4" strokeLinecap="round" opacity="0.8"
          style={{ animation: `wx-rain-drop 1.6s ease-in infinite ${d.delay}` }}
        />
      ))}
    </svg>
  );
}

// ── Snow ───────────────────────────────────────────────────────────
function SnowIcon({ c }: { c: string }) {
  injectStyles();
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
      <path
        d="M20 27 h14 a8 8 0 0 0 0-16 a8 8 0 0 0-14-4 a9 9 0 0 0-3 17Z"
        stroke={c} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"
        style={{ animation: 'wx-cloud-bob 3s ease-in-out infinite' }}
      />
      {[{ x: 20, delay: '0s' }, { x: 28, delay: '0.5s' }, { x: 35, delay: '0.25s' }].map((d, i) => (
        <g key={i} style={{ animation: `wx-snow 1.8s ease-in infinite ${d.delay}` }}>
          <circle cx={d.x} cy={33} r="1.8" fill={c} />
        </g>
      ))}
    </svg>
  );
}

// ── Mist / Fog ─────────────────────────────────────────────────────
function MistIcon({ c }: { c: string }) {
  injectStyles();
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
      {[
        { y: 22, w: 28, x: 12, delay: '0s' },
        { y: 28, w: 22, x: 15, delay: '0.4s' },
        { y: 34, w: 26, x: 13, delay: '0.8s' },
        { y: 40, w: 18, x: 17, delay: '0.2s' },
      ].map((line, i) => (
        <line key={i}
          x1={line.x} y1={line.y} x2={line.x + line.w} y2={line.y}
          stroke={c} strokeWidth="2.2" strokeLinecap="round"
          style={{ animation: `wx-mist-wave 2.5s ease-in-out infinite ${line.delay}` }}
        />
      ))}
    </svg>
  );
}

// ── Windy ─────────────────────────────────────────────────────────
function WindyIcon({ c }: { c: string }) {
  injectStyles();
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
      {[
        { y: 20, x1: 10, x2: 34, delay: '0s' },
        { y: 27, x1: 10, x2: 40, delay: '0.3s' },
        { y: 34, x1: 10, x2: 30, delay: '0.6s' },
      ].map((line, i) => (
        <path key={i}
          d={`M${line.x1} ${line.y} Q${(line.x1 + line.x2) / 2} ${line.y - 4} ${line.x2} ${line.y}`}
          stroke={c} strokeWidth="2" fill="none" strokeLinecap="round"
          style={{ animation: `wx-wind-move 1.8s ease-in-out infinite ${line.delay}` }}
        />
      ))}
    </svg>
  );
}

// ── Main export ────────────────────────────────────────────────────
interface Props {
  condition: string;
  temperature?: number;
  size?: number;
  color?: string;
}

export default function WeatherAnimationIcon({ condition, temperature, size = 52, color = '#ffffff' }: Props) {
  const c = color;
  const cond = condition?.toLowerCase() ?? '';

  const scale = size / 52;
  const icon = (() => {
    if (cond.includes('thunder') || cond.includes('storm')) return <ThunderIcon c={c} />;
    if (cond.includes('snow') || cond.includes('sleet') || cond.includes('hail')) return <SnowIcon c={c} />;
    if (cond.includes('drizzle') || cond.includes('shower')) return <DrizzleIcon c={c} />;
    if (cond.includes('rain') || cond === 'rainy') return <RainIcon c={c} />;
    if (cond.includes('mist') || cond.includes('fog') || cond.includes('haze')) return <MistIcon c={c} />;
    if (cond.includes('wind')) return <WindyIcon c={c} />;
    if (cond.includes('cloud') || cond === 'cloudy' || cond === 'cool' || cond === 'cold') {
      // Partly cloudy if temperature suggests some sun
      if (temperature !== undefined && temperature >= 25) return <PartlyCloudyIcon c={c} />;
      return <CloudyIcon c={c} />;
    }
    if (cond.includes('partly') || cond.includes('partial')) return <PartlyCloudyIcon c={c} />;
    // Default: sunny
    return <SunIcon c={c} />;
  })();

  return (
    <div style={{
      width: size, height: size,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transform: scale !== 1 ? `scale(${scale})` : undefined,
      transformOrigin: 'center center',
      flexShrink: 0,
    }}>
      {icon}
    </div>
  );
}
