'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Shirt, Sparkles, ShoppingBag, UserCircle2 } from 'lucide-react';
import dynamic from 'next/dynamic';

const LottieLogo = dynamic(() => import('./LottieLogo'), { ssr: false });

const NAV = [
  { href: '/',            label: 'Home',    icon: LayoutDashboard },
  { href: '/wardrobe',    label: 'Wardrobe', icon: Shirt          },
  { href: '/stylist',     label: 'Stylist',  icon: Sparkles       },
  { href: '/marketplace', label: 'Market',   icon: ShoppingBag    },
  { href: '/profile',     label: 'Me',       icon: UserCircle2    },
];

const N = NAV.length;

export default function Navbar() {
  const path = usePathname();
  const [mounted, setMounted] = useState(false);

  // Liquid pill state — left/width in percent of bar width
  const [pillLeft,  setPillLeft]  = useState(0);
  const [pillWidth, setPillWidth] = useState(100 / N);
  const [springOn,  setSpringOn]  = useState(false);
  const prevIdxRef = useRef<number>(-1);
  const stretchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => { setMounted(true); }, []);

  const activeIdx = (() => {
    const i = NAV.findIndex(({ href }) =>
      href === '/' ? path === '/' : path.startsWith(href),
    );
    return i >= 0 ? i : 0;
  })();

  // Seed pill position on mount
  useEffect(() => {
    if (!mounted) return;
    setPillLeft(activeIdx * (100 / N));
    setPillWidth(100 / N);
    prevIdxRef.current = activeIdx;
  }, [mounted]); // eslint-disable-line react-hooks/exhaustive-deps

  // Liquid stretch animation on tab change
  useEffect(() => {
    if (!mounted || prevIdxRef.current === -1) return;
    const prev = prevIdxRef.current;
    const curr = activeIdx;
    if (prev === curr) return;

    const unit = 100 / N;
    const lo = Math.min(prev, curr);
    const hi = Math.max(prev, curr);

    // Phase 1 — fast stretch to span old+new positions
    setSpringOn(false);
    setPillLeft(lo * unit);
    setPillWidth((hi - lo + 1) * unit);

    // Phase 2 — spring-contract to new position
    clearTimeout(stretchTimer.current);
    stretchTimer.current = setTimeout(() => {
      setSpringOn(true);
      setPillLeft(curr * unit);
      setPillWidth(unit);
    }, 140);

    prevIdxRef.current = curr;
  }, [activeIdx, mounted]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {/* ── Desktop top bar ─────────────────────────────────────── */}
      <nav
        className="hidden md:block sticky top-0 z-50 w-full"
        style={{
          background: 'rgba(242,237,230,0.92)',
          backdropFilter: 'blur(32px) saturate(200%)',
          WebkitBackdropFilter: 'blur(32px) saturate(200%)',
          borderBottom: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 1px 12px rgba(0,0,0,0.04)',
        }}
      >
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-1 shrink-0">
            {mounted ? <LottieLogo size={40} loop={false} /> : <div style={{ width: 40, height: 40 }} />}
            <span style={{
              fontFamily: 'var(--font-display), Georgia, serif',
              fontStyle: 'italic', fontWeight: 600,
              fontSize: '1.3rem', letterSpacing: '-0.02em',
              color: 'var(--foreground)', lineHeight: 1,
            }}>
              Wearly
            </span>
          </Link>
          <div className="flex items-center gap-0.5">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = href === '/' ? path === '/' : path.startsWith(href);
              return (
                <Link key={href} href={href}
                  className={cn('flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all',
                    active ? 'text-white' : 'hover:bg-black/5')}
                  style={active ? {
                    background: 'linear-gradient(to bottom, var(--primary-mid), var(--primary))',
                    boxShadow: 'var(--shadow-btn)', color: '#fff',
                  } : { color: 'var(--foreground-mid)' }}
                >
                  <Icon size={14} />{label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* ── Mobile liquid glass bottom nav ──────────────────────── */}
      {mounted && (
        <div
          className="md:hidden fixed"
          style={{
            /* bottom:0 + padding is more reliable on iOS than calc(env()) in bottom */
            bottom: 0, left: 0, right: 0,
            paddingLeft: 14, paddingRight: 14,
            paddingBottom: 'calc(14px + env(safe-area-inset-bottom))',
            zIndex: 9999,
            /* pointer-events:none on wrapper so transparent padding area never blocks taps */
            pointerEvents: 'none',
            WebkitTransform: 'translateZ(0)',
            transform: 'translateZ(0)',
          }}
        >
          <style>{`
            @keyframes lgShimmer {
              0%   { transform: translateX(-180%) skewX(-22deg); opacity: 0; }
              20%  { opacity: 1; }
              80%  { opacity: 1; }
              100% { transform: translateX(280%) skewX(-22deg); opacity: 0; }
            }
          `}</style>

          {/* Ambient outer glow */}
          <div aria-hidden="true" style={{
            position: 'absolute', bottom: 'calc(14px + env(safe-area-inset-bottom))',
            left: '25%', right: '25%', height: 18,
            background: 'radial-gradient(ellipse, rgba(90,146,64,0.40) 0%, transparent 70%)',
            filter: 'blur(12px)',
            pointerEvents: 'none',
            zIndex: 0,
          }} />

          {/* Bar — pointer-events:auto so taps land here, solid bg as backdrop-filter fallback */}
          <div style={{
            position: 'relative',
            height: 70,
            borderRadius: 34,
            background: 'rgba(10,16,8,0.97)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid rgba(255,255,255,0.09)',
            boxShadow: [
              'inset 0 1px 0 rgba(255,255,255,0.12)',
              'inset 0 -1px 0 rgba(0,0,0,0.35)',
              '0 10px 40px rgba(0,0,0,0.55)',
              '0 4px 14px rgba(0,0,0,0.35)',
            ].join(', '),
            overflow: 'hidden',
            zIndex: 1,
            pointerEvents: 'auto',
          }}>

            {/* ── Liquid glass active pill ───────────────────────── */}
            <div style={{
              position: 'absolute',
              top: 7,
              left: `calc(${pillLeft}% + 5px)`,
              width: `calc(${pillWidth}% - 10px)`,
              height: 56,
              borderRadius: 26,
              /* Liquid glass gradient — refractive green glass */
              background: [
                'linear-gradient(158deg,',
                '  rgba(168,220,100,0.38) 0%,',
                '  rgba(100,168,58,0.52) 30%,',
                '  rgba(60,106,32,0.72) 65%,',
                '  rgba(36,60,22,0.88) 100%)',
              ].join(''),
              backdropFilter: 'blur(16px) saturate(180%)',
              WebkitBackdropFilter: 'blur(16px) saturate(180%)',
              border: '1px solid rgba(168,208,96,0.32)',
              boxShadow: [
                'inset 0 1.5px 0 rgba(255,255,255,0.32)',
                'inset 0 -1px 0 rgba(0,0,0,0.25)',
                'inset 1px 0 0 rgba(255,255,255,0.08)',
                'inset -1px 0 0 rgba(255,255,255,0.08)',
                '0 0 28px rgba(90,146,64,0.50)',
                '0 0 60px rgba(90,146,64,0.20)',
                '0 6px 18px rgba(0,0,0,0.40)',
              ].join(', '),
              transition: springOn
                ? 'left 0.50s cubic-bezier(0.34,1.56,0.64,1), width 0.44s cubic-bezier(0.34,1.56,0.64,1)'
                : 'left 0.13s cubic-bezier(0.4,0,0.2,1), width 0.13s cubic-bezier(0.4,0,0.2,1)',
              overflow: 'hidden',
              zIndex: 1,
            }}>
              {/* Sweep shimmer */}
              <div aria-hidden="true" style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.26) 50%, transparent 80%)',
                animation: 'lgShimmer 3.2s ease-in-out infinite',
                pointerEvents: 'none',
              }} />
              {/* Top highlight bar */}
              <div aria-hidden="true" style={{
                position: 'absolute', top: 0, left: '8%', right: '8%', height: '1.5px',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.65), transparent)',
                borderRadius: 1,
              }} />
              {/* Inner radial lens */}
              <div aria-hidden="true" style={{
                position: 'absolute', inset: 0, borderRadius: 'inherit',
                background: 'radial-gradient(ellipse 80% 60% at 50% 10%, rgba(200,240,140,0.18) 0%, transparent 70%)',
              }} />
              {/* Bottom edge shadow */}
              <div aria-hidden="true" style={{
                position: 'absolute', bottom: 0, left: '5%', right: '5%', height: 1,
                background: 'rgba(0,0,0,0.30)',
                borderRadius: 1,
              }} />
            </div>

            {/* ── Nav items ─────────────────────────────────────── */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', zIndex: 2 }}>
              {NAV.map(({ href, label, icon: Icon }, i) => {
                const active = i === activeIdx;
                return (
                  <Link
                    key={href}
                    href={href}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      textDecoration: 'none',
                    }}
                  >
                    <Icon
                      size={18}
                      style={{
                        color: active ? '#ffffff' : 'rgba(255,255,255,0.28)',
                        strokeWidth: active ? 2.3 : 1.5,
                        transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
                        transform: active
                          ? 'scale(1.20) translateY(-1.5px)'
                          : 'scale(1) translateY(0)',
                        filter: active
                          ? 'drop-shadow(0 1px 8px rgba(168,208,96,0.65)) drop-shadow(0 0 3px rgba(255,255,255,0.40))'
                          : 'none',
                      }}
                    />
                    <span style={{
                      fontSize: 8,
                      fontWeight: active ? 900 : 400,
                      color: active ? '#C8EC80' : 'rgba(255,255,255,0.25)',
                      letterSpacing: active ? '0.08em' : '0.02em',
                      textTransform: 'uppercase',
                      lineHeight: 1,
                      transition: 'all 0.22s ease',
                    }}>
                      {label}
                    </span>
                  </Link>
                );
              })}
            </div>

            {/* Top edge highlight on bar */}
            <div aria-hidden="true" style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 1,
              background: 'linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.10) 30%, rgba(255,255,255,0.16) 50%, rgba(255,255,255,0.10) 70%, transparent 95%)',
              pointerEvents: 'none',
              zIndex: 3,
            }} />
          </div>
        </div>
      )}
    </>
  );
}
