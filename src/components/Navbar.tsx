'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Shirt, Sparkles, Zap, Leaf, Menu, X } from 'lucide-react';

const NAV = [
  { href: '/',            label: 'Home',     icon: LayoutDashboard, desc: 'Dashboard & AI stylist' },
  { href: '/wardrobe',    label: 'Wardrobe', icon: Shirt,           desc: 'Manage your clothes' },
  { href: '/stylist',     label: 'Stylist',  icon: Sparkles,        desc: 'Get outfit suggestions' },
  { href: '/sustainable', label: 'Sustain',  icon: Leaf,            desc: 'Mindful fashion & eco tips' },
  { href: '/evolve',      label: 'Evolve',   icon: Zap,             desc: 'Request & build features' },
];

export default function Navbar() {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  // Close menu on route change
  useEffect(() => { setOpen(false); }, [path]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      <nav
        className="sticky top-0 z-50 w-full"
        style={{
          background: 'rgba(245,246,250,0.96)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--card-border)',
          boxShadow: '0 1px 0 rgba(15,23,42,0.04)',
        }}
      >
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">

          {/* Logo */}
          <Link href="/" className="flex items-center shrink-0" onClick={() => setOpen(false)}>
            <Image
              src="/logo.png"
              alt="Wearly"
              width={96}
              height={34}
              style={{ objectFit: 'contain', mixBlendMode: 'multiply' }}
              priority
            />
          </Link>

          {/* Desktop nav links — hidden on mobile */}
          <div className="hidden md:flex items-center gap-0.5">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = path === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all',
                    active
                      ? 'text-[#6366f1] bg-[rgba(99,102,241,0.1)]'
                      : 'text-[#8b93a7] hover:text-[#0f172a] hover:bg-[rgba(15,23,42,0.04)]'
                  )}
                >
                  <Icon size={15} />
                  {label}
                </Link>
              );
            })}
          </div>

          {/* Hamburger button — visible on mobile only */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl transition-all active:scale-95"
            style={{
              background: open ? 'rgba(99,102,241,0.1)' : 'transparent',
              border: open ? '1px solid rgba(99,102,241,0.2)' : '1px solid transparent',
            }}
            aria-label={open ? 'Close menu' : 'Open menu'}
          >
            {open
              ? <X size={19} style={{ color: '#6366f1' }} />
              : <Menu size={19} style={{ color: 'var(--foreground)' }} />
            }
          </button>
        </div>

        {/* Mobile dropdown menu */}
        <div
          className="md:hidden overflow-hidden transition-all duration-200"
          style={{
            maxHeight: open ? 420 : 0,
            opacity: open ? 1 : 0,
            borderTop: open ? '1px solid var(--card-border)' : 'none',
          }}
        >
          <div className="max-w-3xl mx-auto px-3 py-2 flex flex-col gap-1 pb-4">
            {NAV.map(({ href, label, icon: Icon, desc }) => {
              const active = path === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-3 rounded-2xl transition-all active:scale-[0.98]',
                    active ? 'bg-[rgba(99,102,241,0.08)]' : 'hover:bg-[rgba(15,23,42,0.04)]'
                  )}
                >
                  {/* Icon tile */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: active ? 'rgba(99,102,241,0.12)' : 'var(--muted-bg)',
                    }}
                  >
                    <Icon size={18} style={{ color: active ? '#6366f1' : 'var(--muted)' }} />
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-semibold"
                      style={{ color: active ? '#6366f1' : 'var(--foreground)' }}
                    >
                      {label}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>{desc}</p>
                  </div>

                  {/* Active dot */}
                  {active && (
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: '#6366f1' }} />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Backdrop — closes menu when tapped outside */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40"
          style={{ background: 'rgba(15,23,42,0.25)', backdropFilter: 'blur(2px)' }}
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}
