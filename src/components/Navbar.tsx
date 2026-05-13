'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Shirt, Sparkles, ShoppingBag, Zap,
  Menu, X, ChevronRight,
} from 'lucide-react';
import dynamic from 'next/dynamic';

// Lottie loads only on client
const LottieLogo = dynamic(() => import('./LottieLogo'), { ssr: false });

const NAV = [
  { href: '/',            label: 'Home',     icon: LayoutDashboard, desc: 'Dashboard · weather · AI outfit' },
  { href: '/wardrobe',    label: 'Wardrobe', icon: Shirt,           desc: 'Closet · health score · eco tips' },
  { href: '/stylist',     label: 'Stylist',  icon: Sparkles,        desc: 'AI outfits · planner · events' },
  { href: '/marketplace', label: 'Market',   icon: ShoppingBag,     desc: 'Buy · rent · sell fashion' },
  { href: '/evolve',      label: 'Evolve',   icon: Zap,             desc: 'Request & build new features' },
];

export default function Navbar() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <nav
        className="sticky top-0 z-50 w-full"
        style={{
          background: 'rgba(242,237,230,0.95)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 1px 0 rgba(0,0,0,0.03)',
        }}
      >
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between gap-3">

          {/* Left: Lottie logo */}
          <Link href="/" className="flex items-center gap-0.5 shrink-0" onClick={() => setOpen(false)}>
            {mounted ? (
              <LottieLogo size={44} loop={false} />
            ) : (
              /* SSR placeholder — same size, no flash */
              <div style={{ width: 44, height: 44 }} />
            )}
            <span
              className="hidden sm:block font-bold text-base tracking-tight select-none"
              style={{ color: 'var(--foreground)', letterSpacing: '-0.03em' }}
            >
              wearly
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-0.5">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = path === href || (href !== '/' && path.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all',
                    active ? 'text-white' : 'hover:bg-black/5'
                  )}
                  style={active ? {
                    background: 'linear-gradient(to bottom, var(--primary-mid), var(--primary))',
                    boxShadow: 'var(--shadow-btn)',
                    color: '#fff',
                  } : { color: 'var(--foreground-mid)' }}
                >
                  <Icon size={14} />
                  {label}
                </Link>
              );
            })}
          </div>

          {/* Mobile hamburger only — wrapped in div so md:hidden isn't overridden by btn-icon's display:flex */}
          <div className="md:hidden">
            <button
              onClick={() => setOpen((v) => !v)}
              className="btn-icon"
              style={{ borderRadius: '12px' }}
              aria-label={open ? 'Close menu' : 'Open menu'}
            >
              {open
                ? <X size={18} style={{ color: 'var(--primary)' }} />
                : <Menu size={18} style={{ color: 'var(--foreground-mid)' }} />
              }
            </button>
          </div>
        </div>

        {/* Mobile slide-down sheet */}
        <div
          className="md:hidden overflow-hidden transition-all duration-250"
          style={{
            maxHeight: open ? 520 : 0,
            opacity: open ? 1 : 0,
            borderTop: open ? '1px solid rgba(0,0,0,0.06)' : 'none',
          }}
        >
          <div className="max-w-3xl mx-auto px-3 py-3 flex flex-col gap-1.5 pb-5">
            {NAV.map(({ href, label, icon: Icon, desc }) => {
              const active = path === href || (href !== '/' && path.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '12px 14px',
                    borderRadius: 18,
                    textDecoration: 'none',
                    transition: 'background 0.15s, transform 0.1s',
                    background: active ? 'rgba(44,74,30,0.07)' : 'transparent',
                    border: active ? '1px solid rgba(44,74,30,0.14)' : '1px solid transparent',
                  }}
                >
                  <div
                    style={{
                      width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: active
                        ? 'linear-gradient(to bottom, var(--primary-mid), var(--primary))'
                        : 'rgba(0,0,0,0.06)',
                      boxShadow: active ? 'var(--shadow-btn)' : 'none',
                    }}
                  >
                    <Icon size={22} style={{ color: active ? '#fff' : 'var(--muted)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.2, color: active ? 'var(--primary)' : 'var(--foreground)', margin: 0 }}>
                      {label}
                    </p>
                    <p style={{ fontSize: 13, color: 'var(--muted)', margin: '2px 0 0', lineHeight: 1.3 }}>{desc}</p>
                  </div>
                  <ChevronRight size={16} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Backdrop */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40"
          style={{ background: 'rgba(0,0,0,0.20)', backdropFilter: 'blur(2px)' }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Mobile Bottom Tab Bar ────────────────────────────────── */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-50"
        style={{
          background: 'rgba(242,237,230,0.97)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          borderTop: '1px solid rgba(0,0,0,0.07)',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.08)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="flex items-center justify-around px-2 py-2">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = path === href || (href !== '/' && path.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className="bottom-nav-item"
                data-active={active ? 'true' : 'false'}
                style={{ textDecoration: 'none' }}
              >
                <div className="bottom-nav-icon-wrap">
                  <Icon
                    size={19}
                    style={{
                      color: active ? '#fff' : 'var(--muted)',
                      strokeWidth: active ? 2.2 : 1.7,
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: active ? 700 : 500,
                    color: active ? 'var(--primary)' : 'var(--muted)',
                    letterSpacing: active ? '0.01em' : '0',
                    lineHeight: 1,
                  }}
                >
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
