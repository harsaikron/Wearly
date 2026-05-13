'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Shirt, Sparkles, ShoppingBag, Zap,
  Bell, Menu, X, ChevronRight,
} from 'lucide-react';

const NAV = [
  { href: '/',           label: 'Home',     icon: LayoutDashboard, desc: 'Dashboard · weather · AI outfit' },
  { href: '/wardrobe',   label: 'Wardrobe', icon: Shirt,           desc: 'Closet · health score · eco tips' },
  { href: '/stylist',    label: 'Stylist',  icon: Sparkles,        desc: 'AI outfits · planner · events' },
  { href: '/marketplace',label: 'Market',   icon: ShoppingBag,     desc: 'Buy · rent · sell fashion' },
  { href: '/evolve',     label: 'Evolve',   icon: Zap,             desc: 'Request & build new features' },
];

// Greeting based on time
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Navbar() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const isHome = path === '/';

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
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 1px 0 rgba(0,0,0,0.03)',
        }}
      >
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between gap-3">

          {/* Left: Avatar + greeting (home) or Logo */}
          <Link href="/" className="flex items-center gap-3 shrink-0" onClick={() => setOpen(false)}>
            {/* Profile avatar — always visible, doubles as home link */}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 relative"
              style={{
                background: 'linear-gradient(135deg, #3D6B28, #5A9240)',
                boxShadow: '0 2px 10px rgba(44,74,30,0.30), inset 0 1px 0 rgba(255,255,255,0.20)',
              }}
            >
              <span className="text-white font-bold text-sm select-none">W</span>
            </div>

            {/* Greeting text — only on home */}
            {isHome && (
              <div className="hidden sm:block">
                <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>{getGreeting()}</p>
                <p className="text-sm font-bold leading-tight" style={{ color: 'var(--foreground)', letterSpacing: '-0.02em' }}>
                  Your Wardrobe
                </p>
              </div>
            )}

            {/* Logo on non-home */}
            {!isHome && (
              <Image
                src="/logo.png"
                alt="Wearly"
                width={46}
                height={17}
                style={{ objectFit: 'contain', mixBlendMode: 'multiply' }}
                priority
              />
            )}
          </Link>

          {/* Right: notification + hamburger */}
          <div className="flex items-center gap-2">
            {/* Notification bell */}
            <button
              className="relative w-10 h-10 rounded-full flex items-center justify-center btn-icon"
              aria-label="Notifications"
              style={{ borderRadius: '50%' }}
            >
              <Bell size={18} style={{ color: 'var(--foreground-mid)' }} strokeWidth={1.8} />
            </button>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-0.5 ml-1">
              {NAV.map(({ href, label, icon: Icon }) => {
                const active = path === href || (href !== '/' && path.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all',
                      active
                        ? 'text-white'
                        : 'hover:bg-black/5'
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

            {/* Mobile hamburger */}
            <button
              onClick={() => setOpen((v) => !v)}
              className="md:hidden btn-icon"
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
                  className="flex items-center gap-3 px-3 py-3 rounded-2xl transition-all active:scale-[0.98]"
                  style={{
                    background: active
                      ? 'rgba(44,74,30,0.07)'
                      : 'transparent',
                    border: active
                      ? '1px solid rgba(44,74,30,0.14)'
                      : '1px solid transparent',
                  }}
                >
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                    style={{
                      background: active
                        ? 'linear-gradient(to bottom, var(--primary-mid), var(--primary))'
                        : 'rgba(0,0,0,0.05)',
                      boxShadow: active ? 'var(--shadow-btn)' : 'none',
                    }}
                  >
                    <Icon size={18} style={{ color: active ? '#fff' : 'var(--muted)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: active ? 'var(--primary)' : 'var(--foreground)' }}>
                      {label}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>{desc}</p>
                  </div>
                  <ChevronRight size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />
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
