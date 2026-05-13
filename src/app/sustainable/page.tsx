'use client';

import { useState } from 'react';
import { useWardrobeStore } from '@/store/wardrobe';
import { Leaf, Zap, ShoppingBag, RefreshCw, Award, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { OccasionIcon } from '@/components/icons/SgIcons';
import { EventIcon } from '@/components/icons/SgIcons';
import { getUpcomingEvents } from '@/lib/singapore-events';

const OCCASIONS = [
  'Casual', 'Office', 'Date Night', 'Weekend', 'Party',
  'Wedding', 'Festive', 'Travel', 'Gym', 'Beach / Pool',
];

interface OutfitSuggestion {
  outfit_name: string;
  items: string[];
  styling_note: string;
  eco_tip: string;
  carbon_saved_kg: number;
}

interface SustainResult {
  outfits: OutfitSuggestion[];
  wardrobe_score: string;
  score_breakdown: string;
  weekly_challenge: string;
  carbon_facts: string;
  backend?: string;
}

const CARBON_STATS = [
  { value: '10%', label: 'of global CO₂ from fashion' },
  { value: '92M', label: 'tonnes of textile waste/year' },
  { value: '3×', label: 'wear each item more = 30% less carbon' },
  { value: '70%', label: 'of wardrobe never worn after 1st time' },
];

const SECONDHAND_LINKS = [
  {
    name: 'Carousell SG',
    url: 'https://www.carousell.sg/categories/women-fashion-1/?sort_by=3',
    desc: 'Singapore\'s largest second-hand fashion marketplace',
    color: '#e8f5e9',
    textColor: '#2e7d32',
  },
  {
    name: 'Refash',
    url: 'https://www.refash.sg',
    desc: 'SG consignment store — earn cash from unwanted clothes',
    color: '#e3f2fd',
    textColor: '#1565c0',
  },
  {
    name: 'Style Theory',
    url: 'https://sg.styletheory.co',
    desc: 'Rent designer clothes in Singapore',
    color: '#f3e5f5',
    textColor: '#6a1b9a',
  },
];

export default function SustainablePage() {
  const { items } = useWardrobeStore();
  const [occasion, setOccasion] = useState('Casual');
  const [selectedEvent, setSelectedEvent] = useState('');
  const [result, setResult] = useState<SustainResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedOutfit, setExpandedOutfit] = useState<number | null>(0);

  const upcomingEvents = getUpcomingEvents(4);

  async function generate() {
    if (items.length === 0) {
      setError('Add clothes to your wardrobe first — then let AI style them sustainably.');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/sustainable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({
            name: i.name,
            category: i.category,
            color_name: i.color_name,
            tags: i.tags,
          })),
          occasion,
          event: selectedEvent || undefined,
        }),
      });
      const data = await res.json() as SustainResult & { error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? 'AI error');
      setResult(data);
      setExpandedOutfit(0);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  const totalCarbonSaved = result?.outfits?.reduce((sum, o) => sum + (o.carbon_saved_kg ?? 0), 0) ?? 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

      {/* Hero */}
      <div
        className="rounded-2xl p-5 text-white"
        style={{ background: 'linear-gradient(135deg, #1b5e20 0%, #2e7d32 50%, #388e3c 100%)' }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Leaf size={20} />
          <span className="text-sm font-semibold uppercase tracking-wider opacity-80">AI for Good</span>
        </div>
        <h1 className="text-2xl font-bold mb-1">Mindful Wardrobe</h1>
        <p className="text-sm opacity-80 leading-relaxed">
          Gemma 4 helps you rediscover the 80% of your wardrobe you never wear —
          reducing fast-fashion waste, one outfit at a time.
        </p>
        <div className="mt-3 flex items-center gap-2 text-xs opacity-70">
          <Zap size={12} />
          <span>Powered by Gemma 4 · Runs locally · Zero cloud cost · Fully private</span>
        </div>
      </div>

      {/* Impact Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {CARBON_STATS.map((s) => (
          <div
            key={s.label}
            className="rounded-xl p-3 text-center"
            style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
          >
            <p className="text-xl font-bold" style={{ color: '#2e7d32' }}>{s.value}</p>
            <p className="text-xs mt-0.5 leading-tight" style={{ color: 'var(--muted)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Wardrobe Status */}
      <div
        className="rounded-2xl p-4"
        style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-sm">Your Wardrobe</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
              {items.length === 0
                ? 'No items yet — add clothes in the Wardrobe tab'
                : `${items.length} item${items.length > 1 ? 's' : ''} ready to be restyled`}
            </p>
          </div>
          {items.length > 0 && (
            <div
              className="rounded-full px-3 py-1 text-xs font-semibold"
              style={{ background: '#e8f5e9', color: '#2e7d32' }}
            >
              {items.length} items
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {items.slice(0, 8).map((item) => (
              <span
                key={item.id}
                className="text-xs px-2 py-0.5 rounded-full border"
                style={{ borderColor: item.color_hex, color: 'var(--foreground)', background: `${item.color_hex}15` }}
              >
                {item.name}
              </span>
            ))}
            {items.length > 8 && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--card-border)', color: 'var(--muted)' }}>
                +{items.length - 8} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Occasion + Event Selector */}
      <div
        className="rounded-2xl p-4 space-y-4"
        style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
      >
        <div>
          <p className="text-sm font-semibold mb-2">Occasion</p>
          <div className="flex flex-wrap gap-2">
            {OCCASIONS.map((occ) => (
              <button
                key={occ}
                onClick={() => setOccasion(occ)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                style={
                  occasion === occ
                    ? { background: '#2e7d32', color: '#fff' }
                    : { background: 'var(--card-border)', color: 'var(--muted)' }
                }
              >
                <OccasionIcon label={occ} size={13} color={occasion === occ ? '#fff' : undefined} />
                {occ}
              </button>
            ))}
          </div>
        </div>

        {upcomingEvents.length > 0 && (
          <div>
            <p className="text-sm font-semibold mb-2">Upcoming Event (optional)</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedEvent('')}
                className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                style={
                  selectedEvent === ''
                    ? { background: '#2e7d32', color: '#fff' }
                    : { background: 'var(--card-border)', color: 'var(--muted)' }
                }
              >
                None
              </button>
              {upcomingEvents.map((ev) => (
                <button
                  key={ev.name}
                  onClick={() => setSelectedEvent(ev.name)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                  style={
                    selectedEvent === ev.name
                      ? { background: '#2e7d32', color: '#fff' }
                      : { background: 'var(--card-border)', color: 'var(--muted)' }
                  }
                >
                  <EventIcon name={ev.name} size={13} color={selectedEvent === ev.name ? '#fff' : undefined} />
                  {ev.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={generate}
          disabled={loading || items.length === 0}
          className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
          style={
            loading || items.length === 0
              ? { background: 'var(--card-border)', color: 'var(--muted)', cursor: 'not-allowed' }
              : { background: '#2e7d32', color: '#fff' }
          }
        >
          {loading ? (
            <>
              <RefreshCw size={15} className="animate-spin" />
              Gemma 4 is styling your wardrobe…
            </>
          ) : (
            <>
              <Leaf size={15} />
              Style from what I own
            </>
          )}
        </button>

        {error && (
          <p className="text-xs text-center" style={{ color: '#c62828' }}>{error}</p>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4">

          {/* Score + Challenge */}
          <div className="grid grid-cols-2 gap-3">
            <div
              className="rounded-2xl p-4"
              style={{ background: '#e8f5e9', border: '1px solid #a5d6a7' }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Award size={16} color="#2e7d32" />
                <span className="text-xs font-semibold" style={{ color: '#2e7d32' }}>Wardrobe Score</span>
              </div>
              <p className="text-lg font-bold" style={{ color: '#1b5e20' }}>{result.wardrobe_score}</p>
              <p className="text-xs mt-1 leading-snug" style={{ color: '#2e7d32' }}>{result.score_breakdown}</p>
            </div>
            <div
              className="rounded-2xl p-4"
              style={{ background: '#e3f2fd', border: '1px solid #90caf9' }}
            >
              <p className="text-xs font-semibold mb-1" style={{ color: '#1565c0' }}>Weekly Challenge</p>
              <p className="text-sm font-medium leading-snug" style={{ color: '#0d47a1' }}>{result.weekly_challenge}</p>
            </div>
          </div>

          {/* Carbon saved */}
          {totalCarbonSaved > 0 && (
            <div
              className="rounded-xl px-4 py-3 flex items-center gap-3"
              style={{ background: '#f1f8e9', border: '1px solid #c5e1a5' }}
            >
              <Leaf size={18} color="#558b2f" />
              <div>
                <p className="text-sm font-semibold" style={{ color: '#33691e' }}>
                  ~{totalCarbonSaved.toFixed(1)} kg CO₂ saved vs. buying new
                </p>
                <p className="text-xs" style={{ color: '#558b2f' }}>{result.carbon_facts}</p>
              </div>
            </div>
          )}

          {/* Outfit cards */}
          <div className="space-y-3">
            <p className="text-sm font-semibold">Your Sustainable Outfits</p>
            {result.outfits?.map((outfit, i) => (
              <div
                key={i}
                className="rounded-2xl overflow-hidden"
                style={{ border: '1px solid var(--card-border)' }}
              >
                <button
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                  style={{ background: 'var(--card)' }}
                  onClick={() => setExpandedOutfit(expandedOutfit === i ? null : i)}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ background: '#2e7d32' }}
                    >
                      {i + 1}
                    </div>
                    <span className="font-semibold text-sm">{outfit.outfit_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {outfit.carbon_saved_kg > 0 && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: '#e8f5e9', color: '#2e7d32' }}
                      >
                        -{outfit.carbon_saved_kg}kg CO₂
                      </span>
                    )}
                    {expandedOutfit === i ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </div>
                </button>

                {expandedOutfit === i && (
                  <div className="px-4 pb-4 space-y-3" style={{ background: 'var(--card)', borderTop: '1px solid var(--card-border)' }}>
                    <div className="flex flex-wrap gap-1.5 pt-3">
                      {outfit.items.map((item) => (
                        <span
                          key={item}
                          className="text-xs px-2.5 py-1 rounded-full font-medium"
                          style={{ background: 'var(--card-border)', color: 'var(--foreground)' }}
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                    <p className="text-sm" style={{ color: 'var(--muted)' }}>{outfit.styling_note}</p>
                    <div
                      className="rounded-xl px-3 py-2 flex items-start gap-2"
                      style={{ background: '#f1f8e9' }}
                    >
                      <Leaf size={13} color="#558b2f" className="mt-0.5 shrink-0" />
                      <p className="text-xs leading-snug" style={{ color: '#33691e' }}>{outfit.eco_tip}</p>
                    </div>
                    {/* Shop secondhand instead */}
                    <div>
                      <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--muted)' }}>
                        Missing an item? Shop second-hand first:
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        <a
                          href={`https://www.carousell.sg/search/${encodeURIComponent(outfit.items[0] ?? 'clothing')}/`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium"
                          style={{ background: '#e8f5e9', color: '#2e7d32' }}
                        >
                          <ExternalLink size={11} />
                          Carousell SG
                        </a>
                        <a
                          href="https://www.refash.sg"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium"
                          style={{ background: '#e3f2fd', color: '#1565c0' }}
                        >
                          <ExternalLink size={11} />
                          Refash
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Second-hand marketplace section */}
      <div
        className="rounded-2xl p-4"
        style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <ShoppingBag size={16} style={{ color: '#2e7d32' }} />
          <p className="text-sm font-semibold">Buy Second-Hand First</p>
        </div>
        <p className="text-xs mb-3" style={{ color: 'var(--muted)' }}>
          Before buying new, check these Singapore platforms. Second-hand fashion saves up to 70% carbon vs. new production.
        </p>
        <div className="space-y-2">
          {SECONDHAND_LINKS.map((link) => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 rounded-xl transition-all hover:opacity-90"
              style={{ background: link.color, border: `1px solid ${link.textColor}30` }}
            >
              <div>
                <p className="text-sm font-semibold" style={{ color: link.textColor }}>{link.name}</p>
                <p className="text-xs mt-0.5" style={{ color: link.textColor, opacity: 0.8 }}>{link.desc}</p>
              </div>
              <ExternalLink size={14} style={{ color: link.textColor }} />
            </a>
          ))}
        </div>
      </div>

      {/* Cultural Dress Education */}
      <div
        className="rounded-2xl p-4"
        style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
      >
        <p className="text-sm font-semibold mb-1">Cultural Dress Education</p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
          Singapore celebrates 12 major cultural festivals each year. Instead of buying new for each event,
          Wearly teaches you how to <strong>restyle existing pieces</strong> with the right colors and cultural context —
          preserving tradition while reducing waste.
        </p>
        <a
          href="/"
          className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold px-3 py-2 rounded-xl"
          style={{ background: '#f3e5f5', color: '#6a1b9a' }}
        >
          <Leaf size={12} />
          View Festival Calendar on Home
        </a>
      </div>

      {/* About Gemma 4 */}
      <div
        className="rounded-2xl p-4"
        style={{ background: 'linear-gradient(135deg, #1a237e10, #28359310)', border: '1px solid #3949ab30' }}
      >
        <p className="text-xs font-semibold mb-1" style={{ color: '#1a237e' }}>Powered by Gemma 4 (Local AI)</p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
          All outfit suggestions run on <strong>Gemma 4</strong> via Ollama — directly on your device.
          No data sent to the cloud. No subscription. Accessible to anyone with a laptop.
          This makes AI-powered sustainable fashion advice available to all, regardless of budget.
        </p>
      </div>

    </div>
  );
}
