'use client';

import { useState } from 'react';
import Image from 'next/image';
import ClothingCard from '@/components/ClothingCard';
import { mockClothingItems } from '@/lib/mock-data';
import { ClothingItem } from '@/types';
import { categoryLabel, getContrastColor } from '@/lib/utils';
import { Sparkles, RefreshCw, Download, RotateCcw } from 'lucide-react';

const MODEL_IMAGE = 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=400&q=80';

type Slot = 'shirt' | 'pants' | 'shoes' | 'jacket' | 'watch';

const SLOT_ORDER: Slot[] = ['shirt', 'pants', 'shoes', 'jacket', 'watch'];

const SLOT_CATEGORIES: Record<Slot, string[]> = {
  shirt: ['shirt', 'formal_shirt', 'tshirt'],
  pants: ['pants', 'jeans', 'shorts'],
  shoes: ['shoes', 'sneakers', 'loafers'],
  jacket: ['jacket'],
  watch: ['watch'],
};

export default function VirtualTryOnPage() {
  const [selected, setSelected] = useState<Partial<Record<Slot, ClothingItem>>>({});
  const [activeSlot, setActiveSlot] = useState<Slot>('shirt');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  function pickItem(item: ClothingItem) {
    setSelected((prev) => ({ ...prev, [activeSlot]: item }));
  }

  function clearSlot(slot: Slot) {
    setSelected((prev) => {
      const next = { ...prev };
      delete next[slot];
      return next;
    });
  }

  function generatePreview() {
    if (Object.keys(selected).length === 0) return;
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      setGenerated(true);
    }, 2000);
  }

  function reset() {
    setSelected({});
    setGenerated(false);
    setActiveSlot('shirt');
  }

  const slotItems = mockClothingItems.filter((item) =>
    SLOT_CATEGORIES[activeSlot].includes(item.category)
  );

  const palette = Object.values(selected).map((item) => item?.color_hex).filter(Boolean) as string[];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Virtual Try-On</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          Build an outfit and preview it on a model before wearing it.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Model preview */}
        <div className="flex flex-col gap-4">
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
          >
            <div
              className="px-4 py-3 flex items-center justify-between"
              style={{ borderBottom: '1px solid var(--card-border)' }}
            >
              <p className="text-sm font-semibold">Model Preview</p>
              <div className="flex gap-2">
                <button
                  onClick={reset}
                  className="p-1.5 rounded-lg transition-all hover:bg-[var(--muted-bg)]"
                  style={{ color: 'var(--muted)' }}
                  title="Reset"
                >
                  <RotateCcw size={14} />
                </button>
                {generated && (
                  <button
                    className="p-1.5 rounded-lg transition-all hover:bg-[var(--muted-bg)]"
                    style={{ color: 'var(--muted)' }}
                    title="Download"
                  >
                    <Download size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Model */}
            <div
              className="relative mx-4 my-4 rounded-xl overflow-hidden flex items-center justify-center"
              style={{ minHeight: 320, background: 'var(--muted-bg)' }}
            >
              {generating ? (
                <div className="flex flex-col items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin"
                    style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
                  />
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>
                    Generating preview…
                  </p>
                </div>
              ) : (
                <>
                  <Image
                    src={MODEL_IMAGE}
                    alt="Model"
                    fill
                    className="object-cover"
                    sizes="400px"
                    style={{ opacity: generated ? 1 : 0.4 }}
                  />
                  {!generated && Object.keys(selected).length === 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-sm text-center px-6" style={{ color: 'var(--muted)' }}>
                        Select clothing items and tap &quot;Generate Preview&quot;
                      </p>
                    </div>
                  )}
                  {generated && (
                    <div
                      className="absolute bottom-0 left-0 right-0 px-3 py-2"
                      style={{ background: 'rgba(10,10,15,0.8)' }}
                    >
                      <div className="flex gap-2">
                        {palette.map((hex, i) => (
                          <span
                            key={i}
                            className="w-5 h-5 rounded-full border"
                            style={{ background: hex, borderColor: 'rgba(255,255,255,0.2)' }}
                            title={hex}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="px-4 pb-4">
              <button
                onClick={generatePreview}
                disabled={Object.keys(selected).length === 0 || generating}
                className="w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c96a)', color: '#000' }}
              >
                {generating ? (
                  <RefreshCw size={15} className="animate-spin" />
                ) : (
                  <Sparkles size={15} />
                )}
                {generating ? 'Generating…' : 'Generate Preview'}
              </button>
            </div>
          </div>

          {/* Selected outfit summary */}
          <div
            className="rounded-2xl p-4"
            style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
          >
            <p className="text-xs font-semibold mb-3" style={{ color: 'var(--muted)' }}>
              OUTFIT BUILDER
            </p>
            <div className="flex flex-col gap-2">
              {SLOT_ORDER.map((slot) => {
                const item = selected[slot];
                return (
                  <div
                    key={slot}
                    className="flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer"
                    style={{
                      background: activeSlot === slot ? 'var(--accent-muted)' : 'var(--muted-bg)',
                      border: activeSlot === slot ? '1px solid rgba(201,168,76,0.3)' : '1px solid transparent',
                    }}
                    onClick={() => setActiveSlot(slot)}
                  >
                    <div className="flex items-center gap-2">
                      {item ? (
                        <>
                          <div
                            className="w-4 h-4 rounded-full border"
                            style={{ background: item.color_hex, borderColor: 'rgba(255,255,255,0.2)' }}
                          />
                          <span className="text-xs" style={{ color: 'var(--foreground)' }}>
                            {item.name}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--muted)' }}>
                          + {categoryLabel(slot)}
                        </span>
                      )}
                    </div>
                    {item && (
                      <button
                        onClick={(e) => { e.stopPropagation(); clearSlot(slot); }}
                        className="text-xs px-1.5 py-0.5 rounded-md transition-all hover:bg-red-500/20"
                        style={{ color: 'var(--muted)' }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Color pair display */}
          {Object.keys(selected).length >= 2 && (
            <div
              className="rounded-2xl p-4"
              style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
            >
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--muted)' }}>
                COLOUR PALETTE
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(selected).map(([slot, item]) => item && (
                  <div key={slot} className="flex flex-col items-center gap-1">
                    <div
                      className="w-8 h-8 rounded-full border-2"
                      style={{ background: item.color_hex, borderColor: 'rgba(255,255,255,0.1)' }}
                    />
                    <span
                      className="text-xs font-mono"
                      style={{ color: 'var(--muted)', fontSize: 9 }}
                    >
                      {item.color_hex}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: slot selector + item grid */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Slot tabs */}
          <div className="flex gap-2 flex-wrap">
            {SLOT_ORDER.map((slot) => (
              <button
                key={slot}
                onClick={() => setActiveSlot(slot)}
                className="px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all"
                style={{
                  background: activeSlot === slot ? 'var(--accent-muted)' : 'var(--card)',
                  border: activeSlot === slot ? '1px solid rgba(201,168,76,0.4)' : '1px solid var(--card-border)',
                  color: activeSlot === slot ? 'var(--accent)' : 'var(--muted)',
                }}
              >
                {categoryLabel(slot)}
                {selected[slot] && (
                  <span
                    className="ml-1.5 w-2 h-2 rounded-full inline-block"
                    style={{ background: selected[slot]!.color_hex }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Items for active slot */}
          {slotItems.length === 0 ? (
            <div
              className="rounded-2xl p-8 text-center"
              style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
            >
              <p style={{ color: 'var(--muted)' }}>
                No {categoryLabel(activeSlot)} items in your wardrobe yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {slotItems.map((item) => (
                <ClothingCard
                  key={item.id}
                  item={item}
                  selected={selected[activeSlot]?.id === item.id}
                  onClick={() => pickItem(item)}
                />
              ))}
            </div>
          )}

          {/* AI tips */}
          {Object.keys(selected).length >= 2 && !generated && (
            <div
              className="rounded-2xl p-4"
              style={{
                background: 'linear-gradient(135deg, rgba(201,168,76,0.1), rgba(201,168,76,0.03))',
                border: '1px solid rgba(201,168,76,0.2)',
              }}
            >
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--accent)' }}>
                <Sparkles size={12} className="inline mr-1" />
                AI Colour Analysis
              </p>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                {selected.shirt && selected.pants
                  ? `${selected.shirt.color_name} + ${selected.pants.color_name} — ${
                      selected.shirt.color_hex === '#FFFFFF' && selected.pants.color_hex === '#1E2A38'
                        ? 'a classic, always-powerful combination.'
                        : 'a stylish pairing that works across multiple occasions.'
                    }`
                  : 'Your current selection creates a well-balanced colour palette.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
