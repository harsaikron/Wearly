'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import ClothingCard from '@/components/ClothingCard';
import { useWardrobeStore } from '@/store/wardrobe';
import { ClothingItem } from '@/types';
import { categoryLabel } from '@/lib/utils';
import { Sparkles, RefreshCw, RotateCcw, Shirt } from 'lucide-react';

const MODEL_IMAGE = 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=400&q=80';
type Slot = 'shirt' | 'pants' | 'shoes' | 'jacket' | 'watch';
const SLOTS: Slot[] = ['shirt', 'pants', 'shoes', 'jacket', 'watch'];
const SLOT_CATS: Record<Slot, string[]> = {
  shirt:  ['shirt','formal_shirt','tshirt'],
  pants:  ['pants','jeans','shorts'],
  shoes:  ['shoes','sneakers','loafers'],
  jacket: ['jacket'],
  watch:  ['watch'],
};

export default function VirtualTryOnPage() {
  const { items } = useWardrobeStore();
  const hasItems = items.length > 0;

  const [selected, setSelected] = useState<Partial<Record<Slot, ClothingItem>>>({});
  const [activeSlot, setActiveSlot] = useState<Slot>('shirt');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  function pickItem(item: ClothingItem) {
    setSelected((p) => ({ ...p, [activeSlot]: item }));
  }
  function clearSlot(slot: Slot) {
    setSelected((p) => { const n = { ...p }; delete n[slot]; return n; });
  }
  function reset() { setSelected({}); setGenerated(false); }
  function generate() {
    if (!Object.keys(selected).length) return;
    setGenerating(true);
    setTimeout(() => { setGenerating(false); setGenerated(true); }, 1800);
  }

  const slotItems = items.filter((i) => SLOT_CATS[activeSlot].includes(i.category));
  const palette = Object.values(selected).map((i) => i?.color_hex).filter(Boolean) as string[];

  if (!hasItems) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        <h1 className="text-3xl font-bold mb-2">Virtual Try-On</h1>
        <p className="text-sm mb-8" style={{ color: 'var(--muted)' }}>Build an outfit and preview it on a model.</p>
        <div className="rounded-2xl p-16 flex flex-col items-center text-center" style={{ background: 'var(--card)', border: '2px dashed var(--card-border)' }}>
          <Shirt size={40} className="mb-4" style={{ color: 'var(--muted)' }} />
          <p className="font-semibold mb-1">No wardrobe items yet</p>
          <p className="text-sm mb-5" style={{ color: 'var(--muted)' }}>Upload your clothes first, then come here to build and preview outfits.</p>
          <Link href="/wardrobe" className="px-5 py-2.5 rounded-xl font-semibold text-sm" style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c96a)', color: '#000' }}>
            Add Clothes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Virtual Try-On</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Pick items from your wardrobe and preview the combination.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Preview panel */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--card-border)' }}>
              <p className="text-sm font-semibold">Model Preview</p>
              <button onClick={reset} className="p-1.5 rounded-lg hover:bg-[var(--muted-bg)]" style={{ color: 'var(--muted)' }}>
                <RotateCcw size={14} />
              </button>
            </div>
            <div className="relative mx-4 my-4 rounded-xl overflow-hidden flex items-center justify-center" style={{ minHeight: 320, background: 'var(--muted-bg)' }}>
              {generating ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>Generating preview…</p>
                </div>
              ) : (
                <>
                  <Image src={MODEL_IMAGE} alt="Model" fill className="object-cover" sizes="400px" style={{ opacity: generated ? 1 : 0.35 }} />
                  {!generated && !Object.keys(selected).length && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-sm text-center px-6" style={{ color: 'var(--muted)' }}>Select items from your wardrobe to build an outfit</p>
                    </div>
                  )}
                  {generated && palette.length > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 px-3 py-2 flex gap-2" style={{ background: 'rgba(10,10,15,0.8)' }}>
                      {palette.map((hex, i) => <span key={i} className="w-5 h-5 rounded-full border" style={{ background: hex, borderColor: 'rgba(255,255,255,0.2)' }} />)}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="px-4 pb-4">
              <button onClick={generate} disabled={!Object.keys(selected).length || generating}
                className="w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c96a)', color: '#000' }}>
                {generating ? <RefreshCw size={15} className="animate-spin" /> : <Sparkles size={15} />}
                {generating ? 'Generating…' : 'Generate Preview'}
              </button>
            </div>
          </div>

          {/* Outfit builder */}
          <div className="rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}>
            <p className="text-xs font-semibold mb-3" style={{ color: 'var(--muted)' }}>OUTFIT BUILDER</p>
            {SLOTS.map((slot) => {
              const item = selected[slot];
              return (
                <div key={slot} onClick={() => setActiveSlot(slot)}
                  className="flex items-center justify-between p-2 rounded-xl cursor-pointer mb-1.5 transition-all"
                  style={{ background: activeSlot === slot ? 'var(--accent-muted)' : 'var(--muted-bg)', border: activeSlot === slot ? '1px solid rgba(201,168,76,0.3)' : '1px solid transparent' }}>
                  <div className="flex items-center gap-2">
                    {item ? (
                      <><div className="w-4 h-4 rounded-full border" style={{ background: item.color_hex, borderColor: 'rgba(255,255,255,0.2)' }} />
                      <span className="text-xs" style={{ color: 'var(--foreground)' }}>{item.name}</span></>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--muted)' }}>+ {categoryLabel(slot)}</span>
                    )}
                  </div>
                  {item && <button onClick={(e) => { e.stopPropagation(); clearSlot(slot); }} className="text-xs px-1.5 py-0.5 rounded" style={{ color: 'var(--muted)' }}>×</button>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Item picker */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex gap-2 flex-wrap">
            {SLOTS.map((slot) => (
              <button key={slot} onClick={() => setActiveSlot(slot)}
                className="px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all"
                style={{
                  background: activeSlot === slot ? 'var(--accent-muted)' : 'var(--card)',
                  border: activeSlot === slot ? '1px solid rgba(201,168,76,0.4)' : '1px solid var(--card-border)',
                  color: activeSlot === slot ? 'var(--accent)' : 'var(--muted)',
                }}>
                {categoryLabel(slot)}
                {selected[slot] && <span className="ml-1.5 w-2 h-2 rounded-full inline-block" style={{ background: selected[slot]!.color_hex }} />}
              </button>
            ))}
          </div>

          {slotItems.length === 0 ? (
            <div className="rounded-2xl p-10 text-center" style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}>
              <p style={{ color: 'var(--muted)' }}>No {categoryLabel(activeSlot)} items in your wardrobe yet.</p>
              <Link href="/wardrobe" className="text-sm mt-2 inline-block" style={{ color: 'var(--accent)' }}>Add one →</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {slotItems.map((item) => (
                <ClothingCard key={item.id} item={item} selected={selected[activeSlot]?.id === item.id} onClick={() => pickItem(item)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
