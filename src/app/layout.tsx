import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import ColorBlindProvider from '@/components/ColorBlindProvider';

const geist = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Wearly — AI Wardrobe Stylist',
  description:
    'Local-first AI wardrobe stylist powered by Gemma 4 via Ollama. Smart outfit suggestions, wardrobe health, trip planner, and sustainable fashion — running privately on your own machine.',
  keywords: ['wardrobe', 'AI stylist', 'Gemma 4', 'Ollama', 'sustainable fashion', 'outfit planner'],
  openGraph: {
    title: 'Wearly — AI Wardrobe Stylist',
    description: 'Local-first AI wardrobe stylist powered by Gemma 4 via Ollama.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body
        className="min-h-full flex flex-col"
        style={{ background: 'var(--background)', color: 'var(--foreground)' }}
      >
        <ColorBlindProvider />
        {/* Floating CBM indicator — only visible when data-cbm="1" */}
        <div className="cbm-indicator" aria-hidden="true">👁 Color Blind Mode</div>
        <Navbar />
        <main className="flex-1 pb-[calc(70px+env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </main>
      </body>
    </html>
  );
}
