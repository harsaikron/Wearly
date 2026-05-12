'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Shirt, Sparkles, Zap } from 'lucide-react';

const NAV = [
  { href: '/',         label: 'Home',     icon: LayoutDashboard },
  { href: '/wardrobe', label: 'Wardrobe', icon: Shirt },
  { href: '/stylist',  label: 'Stylist',  icon: Sparkles },
  { href: '/evolve',   label: 'Evolve',   icon: Zap },
];

function WearlyLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="9" fill="#6366f1"/>
      <path d="M6 9L11.5 23L16 13.5L20.5 23L26 9" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default function Navbar() {
  const path = usePathname();
  return (
    <nav
      className="sticky top-0 z-50 w-full"
      style={{
        background: 'rgba(245,246,250,0.92)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--card-border)',
        boxShadow: '0 1px 0 rgba(15,23,42,0.04)',
      }}
    >
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <WearlyLogo size={30} />
          <span className="font-bold text-base tracking-tight" style={{ color: 'var(--foreground)' }}>
            wearly
          </span>
        </Link>

        {/* Nav */}
        <div className="flex items-center gap-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = path === href;
            return (
              <Link key={href} href={href}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all',
                  active
                    ? 'text-[#6366f1] bg-[rgba(99,102,241,0.1)]'
                    : 'text-[#8b93a7] hover:text-[#0f172a] hover:bg-[rgba(15,23,42,0.04)]'
                )}
              >
                <Icon size={15} />{label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
