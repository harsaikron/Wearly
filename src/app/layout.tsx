import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import OllamaStatus from '@/components/OllamaStatus';

const geist = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Wearly — Your AI Wardrobe Stylist',
  description: 'Smart outfit suggestions powered by Gemma AI, weather, and your personal wardrobe.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
        <Navbar />
        <main className="flex-1 pb-[calc(60px+env(safe-area-inset-bottom))] md:pb-0">{children}</main>
        <OllamaStatus />
      </body>
    </html>
  );
}
