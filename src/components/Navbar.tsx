'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Shirt, Sparkles, ShoppingBag, UserCircle2,
  ChevronRight,
} from 'lucide-react';
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
              const active = path === href || (href !== '/' && path.startsWith(href));
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

      {/* ── Mobile floating bottom nav ──────────────────────────── */}
      <div
        className="md:hidden fixed z-50"
        style={{
          bottom: 'calc(12px + env(safe-area-inset-bottom))',
          left: 16, right: 16,
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          background: 'rgba(20, 28, 16, 0.82)',
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          borderRadius: 28,
          padding: '10px 8px',
          border: '1px solid rgba(255,255,255,0.10)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.30), 0 2px 8px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.08)',
        }}>
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = path === href || (href !== '/' && path.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  flex: 1,
                  textDecoration: 'none',
                  padding: '2px 4px',
                }}
              >
                <div style={{
                  width: 46,
                  height: 34,
                  borderRadius: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: active
                    ? 'linear-gradient(135deg, #5A9240 0%, #3D6B28 50%, #2C4A1E 100%)'
                    : 'transparent',
                  boxShadow: active
                    ? '0 2px 12px rgba(90,146,64,0.45), inset 0 1px 0 rgba(255,255,255,0.18)'
                    : 'none',
                  transition: 'all 0.22s cubic-bezier(0.34,1.56,0.64,1)',
                }}>
                  <Icon
                    size={18}
                    style={{
                      color: active ? '#fff' : 'rgba(255,255,255,0.40)',
                      strokeWidth: active ? 2.2 : 1.6,
                      transition: 'all 0.2s ease',
                    }}
                  />
                </div>
                <span style={{
                  fontSize: 9,
                  fontWeight: active ? 800 : 400,
                  color: active ? '#A8D060' : 'rgba(255,255,255,0.35)',
                  letterSpacing: active ? '0.06em' : '0.02em',
                  textTransform: 'uppercase',
                  lineHeight: 1,
                  transition: 'all 0.2s ease',
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
