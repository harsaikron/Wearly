'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Shirt,
  CalendarDays,
  Sparkles,
  PersonStanding,
  Clock,
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/wardrobe', label: 'Wardrobe', icon: Shirt },
  { href: '/planner', label: 'Planner', icon: CalendarDays },
  { href: '/stylist', label: 'AI Stylist', icon: Sparkles },
  { href: '/virtual-tryon', label: 'Try-On', icon: PersonStanding },
  { href: '/history', label: 'History', icon: Clock },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav
      className="sticky top-0 z-50 w-full"
      style={{
        background: 'rgba(10,10,15,0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--card-border)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
              style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c96a)' }}
            >
              W
            </div>
            <span className="font-semibold text-lg tracking-tight gold-text">Wearly</span>
          </Link>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                    active
                      ? 'text-[#c9a84c] bg-[rgba(201,168,76,0.12)]'
                      : 'text-[#6b6b7b] hover:text-[#f0ede8] hover:bg-[rgba(255,255,255,0.05)]'
                  )}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              );
            })}
          </div>

          {/* Mobile nav */}
          <div className="flex md:hidden items-center gap-1">
            {navItems.map(({ href, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'p-2 rounded-lg transition-all',
                    active
                      ? 'text-[#c9a84c] bg-[rgba(201,168,76,0.12)]'
                      : 'text-[#6b6b7b] hover:text-[#f0ede8]'
                  )}
                >
                  <Icon size={18} />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
