'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Shirt, Sparkles, ShoppingBag, UserCircle2 } from 'lucide-react';
import dynamic from 'next/dynamic';

const LottieLogo = dynamic(() => import('./LottieLogo'), { ssr: false });

const NAV = [
  { href: '/',            label: 'Home',     icon: LayoutDashboard },
  { href: '/wardrobe',    label: 'Wardrobe', icon: Shirt           },
  { href: '/stylist',     label: 'Stylist',  icon: Sparkles        },
  { href: '/marketplace', label: 'Market',   icon: ShoppingBag     },
  { href: '/profile',     label: 'Me',       icon: UserCircle2     },
];

export default function Navbar() {
  const path = usePathname();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const activeIdx = (() => {
    const i = NAV.findIndex(({ href }) =>
      href === '/' ? path === '/' : path.startsWith(href)
    );
    return i >= 0 ? i : 0;
  })();

  return (
    <>
      {/* ── Desktop top bar ─────────────────────────────────────── */}
      <nav
        className="hidden md:block sticky top-0 z-50 w-full"
        style={{
          background: 'rgba(242,237,230,0.95)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
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
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all"
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

      {/* ── Mobile bottom tab bar ───────────────────────────────── */}
      {/* Rendered always (no mounted guard) so it shows even on slow devices.
          Solid opaque background — no backdrop-filter so it never fails to render.
          pointer-events:none on wrapper so only the bar itself catches touches. */}
      <div
        className="md:hidden"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          paddingBottom: 'env(safe-area-inset-bottom)',
          pointerEvents: 'none',
        }}
      >
        {/* The actual tab bar — solid, always visible */}
        <div
          style={{
            margin: '0 12px 10px',
            height: 64,
            borderRadius: 28,
            background: '#0d1a0a',
            border: '1px solid rgba(168,208,96,0.20)',
            boxShadow: '0 -2px 20px rgba(0,0,0,0.40), 0 8px 32px rgba(0,0,0,0.50)',
            display: 'flex',
            alignItems: 'stretch',
            overflow: 'hidden',
            pointerEvents: 'auto',
          }}
        >
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
                  gap: 3,
                  textDecoration: 'none',
                  background: active
                    ? 'linear-gradient(158deg, rgba(100,168,58,0.35) 0%, rgba(44,74,30,0.55) 100%)'
                    : 'transparent',
                  borderRadius: active ? 22 : 0,
                  margin: active ? 6 : 0,
                  transition: 'background 0.2s ease',
                  touchAction: 'manipulation',
                }}
              >
                <Icon
                  size={20}
                  color={active ? '#C8EC80' : 'rgba(255,255,255,0.35)'}
                  strokeWidth={active ? 2.2 : 1.6}
                />
                <span style={{
                  fontSize: 9,
                  fontWeight: active ? 800 : 400,
                  color: active ? '#A8D060' : 'rgba(255,255,255,0.30)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  lineHeight: 1,
                }}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
