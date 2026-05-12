'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Shirt, Sparkles } from 'lucide-react';

const NAV = [
  { href: '/',         label: 'Home',     icon: LayoutDashboard },
  { href: '/wardrobe', label: 'Wardrobe', icon: Shirt },
  { href: '/stylist',  label: 'Stylist',  icon: Sparkles },
];

export default function Navbar() {
  const path = usePathname();
  return (
    <nav
      className="sticky top-0 z-50 w-full"
      style={{ background: 'rgba(10,10,15,0.9)', backdropFilter: 'blur(16px)', borderBottom: '1px solid #1e1e2e' }}
    >
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs" style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c96a)', color: '#000' }}>W</div>
          <span className="font-semibold text-base gold-text">Wearly</span>
        </Link>

        {/* Nav */}
        <div className="flex items-center gap-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = path === href;
            return (
              <Link key={href} href={href}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all',
                  active ? 'text-[#c9a84c] bg-[rgba(201,168,76,0.12)]' : 'text-[#6b6b7b] hover:text-[#f0ede8] hover:bg-[rgba(255,255,255,0.05)]'
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
