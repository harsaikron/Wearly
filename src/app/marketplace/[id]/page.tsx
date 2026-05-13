'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useListingsStore } from '@/store/listings';
import { Listing } from '@/types';
import {
  ArrowLeft, MapPin, Leaf, ShoppingBag, MessageCircle,
  Star, Lightbulb, Calendar, User, ChevronRight,
} from 'lucide-react';

function getContrastHex(hex: string) {
  const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  return (r*299+g*587+b*114)/1000>=128?'#1f2937':'#ffffff';
}

const STYLING_IDEAS: Record<string, string[]> = {
  shirt:   ['Pair with slim chinos and white sneakers','Layer under a blazer for smart casual','Tuck into high-waisted trousers'],
  jacket:  ['Wear over a tee and jeans for weekend','Layer over a shirt for office smart casual','Pair with chinos for dinner dates'],
  pants:   ['Style with a tucked linen shirt','Pair with a clean white tee and sneakers','Add a blazer for elevated casual'],
  jeans:   ['Classic with white shirt and loafers','Dress up with a blazer and oxford shoes','Casual with oversized tee and sneakers'],
  shoes:   ['Ground any smart-casual look','Pair with slim trousers for a clean silhouette','Try with relaxed jeans for weekend ease'],
  sneakers:['White sneakers elevate any casual outfit','Pair with chinos for smart casual','Style with joggers for athleisure'],
  default: ['Style with complementary neutrals','Layer for season transitions','Dress up or down depending on accessories'],
};

export default function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { listings, seed } = useListingsStore();
  useEffect(() => { seed(); }, [seed]);

  const [listing, setListing] = useState<Listing | null>(null);
  const [action, setAction] = useState<'buy'|'rent'|null>(null);
  const [msgSent, setMsgSent] = useState(false);

  useEffect(() => {
    const found = listings.find((l) => l.id === id);
    setListing(found ?? null);
  }, [listings, id]);

  if (!listing) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-sm" style={{ color:'var(--muted)' }}>Listing not found.</p>
        <Link href="/marketplace" className="mt-3 inline-block text-xs font-semibold" style={{ color:'var(--accent)' }}>← Back to Marketplace</Link>
      </div>
    );
  }

  const stylingIdeas = STYLING_IDEAS[listing.category] ?? STYLING_IDEAS.default;
  const conditionColor = listing.condition === 'New' || listing.condition === 'Like New' ? '#22c55e' : listing.condition === 'Good' ? '#f59e0b' : '#94a3b8';
  const hasColor = listing.color_hex && listing.color_hex.startsWith('#');

  function calUrl() {
    const text = encodeURIComponent(`Try on: ${listing!.title}`);
    const detail = encodeURIComponent(`Pick up from ${listing!.pickup_location} · ${listing!.seller_distance_km} km away`);
    return `https://calendar.google.com/calendar/r/eventedit?text=${text}&details=${detail}`;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {/* Back */}
      <Link href="/marketplace" className="flex items-center gap-1.5 text-sm font-medium" style={{ color:'var(--muted)' }}>
        <ArrowLeft size={15}/> Marketplace
      </Link>

      {/* Hero image */}
      <div className="rounded-2xl overflow-hidden" style={{ height:260, background:'var(--muted-bg)', border:'1px solid var(--card-border)' }}>
        {listing.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={listing.image_url} alt={listing.title} className="w-full h-full object-cover"/>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3">
            {hasColor && (
              <div className="w-20 h-20 rounded-full border-4 border-white shadow-lg" style={{ background: listing.color_hex }}/>
            )}
            <ShoppingBag size={36} style={{ color:'var(--muted)' }}/>
            <p className="text-sm font-medium" style={{ color:'var(--muted)' }}>{listing.color_name ?? 'No image'}</p>
          </div>
        )}
      </div>

      {/* Title + badges */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-bold leading-tight" style={{ color:'var(--foreground)' }}>{listing.title}</h1>
          {listing.sustainability_badge && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full shrink-0" style={{ background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.25)' }}>
              <Leaf size={12} color="#16a34a"/>
              <span className="text-xs font-semibold" style={{ color:'#16a34a' }}>Eco</span>
            </div>
          )}
        </div>
        <p className="text-sm mt-0.5" style={{ color:'var(--muted)' }}>{listing.brand} · Size {listing.size}</p>
      </div>

      {/* Price card */}
      <div className="rounded-2xl p-4 flex items-center justify-between" style={{ background:'var(--card)', border:'1px solid var(--card-border)' }}>
        <div>
          <p className="text-2xl font-bold" style={{ color:'var(--accent)' }}>S${listing.price}</p>
          {listing.rent_price_day && (
            <p className="text-sm mt-0.5" style={{ color:'var(--muted)' }}>or S${listing.rent_price_day}/day to rent</p>
          )}
        </div>
        <div className="text-right">
          <span className="text-sm font-semibold px-3 py-1 rounded-full" style={{ background:`${conditionColor}15`, color: conditionColor, border:`1px solid ${conditionColor}30` }}>
            {listing.condition}
          </span>
          {hasColor && (
            <div className="flex items-center gap-1.5 mt-2 justify-end">
              <div className="w-5 h-5 rounded-full border-2" style={{ background: listing.color_hex, borderColor:'rgba(0,0,0,0.1)' }}/>
              <span className="text-xs font-mono" style={{ color:'var(--muted)' }}>{listing.color_hex}</span>
            </div>
          )}
        </div>
      </div>

      {/* Seller */}
      <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background:'var(--card)', border:'1px solid var(--card-border)' }}>
        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background:'rgba(99,102,241,0.1)' }}>
          <User size={18} style={{ color:'var(--accent)' }}/>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm" style={{ color:'var(--foreground)' }}>{listing.seller_name}</p>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="flex items-center gap-1 text-xs" style={{ color:'var(--muted)' }}>
              <MapPin size={10}/> {listing.seller_distance_km > 0 ? `${listing.seller_distance_km} km away` : 'Your listing'}
            </span>
            <span className="flex items-center gap-1 text-xs" style={{ color:'var(--muted)' }}>
              <MapPin size={10}/> {listing.pickup_location}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          {[1,2,3,4,5].map((s) => <Star key={s} size={11} fill={s<=4?'#f59e0b':'none'} color="#f59e0b"/>)}
        </div>
      </div>

      {/* Description */}
      {listing.description && (
        <div className="rounded-2xl p-4" style={{ background:'var(--card)', border:'1px solid var(--card-border)' }}>
          <p className="text-xs font-semibold mb-1" style={{ color:'var(--muted)' }}>DESCRIPTION</p>
          <p className="text-sm leading-relaxed" style={{ color:'var(--foreground)' }}>{listing.description}</p>
        </div>
      )}

      {/* AI Fit Suggestion */}
      <div className="rounded-2xl p-4" style={{ background:'rgba(99,102,241,0.05)', border:'1px solid rgba(99,102,241,0.15)' }}>
        <div className="flex items-center gap-2 mb-2">
          <Lightbulb size={14} style={{ color:'var(--accent)' }}/>
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color:'var(--accent)' }}>AI Fit Suggestion</p>
        </div>
        <p className="text-sm leading-relaxed" style={{ color:'var(--foreground)' }}>
          This {listing.category} in {listing.color_name ?? 'this colour'} is a versatile piece for Singapore&apos;s tropical climate.
          Size {listing.size} fits most builds well. The {listing.condition.toLowerCase()} condition means it&apos;s ready to wear immediately.
        </p>
      </div>

      {/* Styling ideas */}
      <div className="rounded-2xl p-4" style={{ background:'var(--card)', border:'1px solid var(--card-border)' }}>
        <p className="text-xs font-semibold mb-3" style={{ color:'var(--muted)' }}>STYLING IDEAS</p>
        <div className="space-y-2">
          {stylingIdeas.map((idea, i) => (
            <div key={i} className="flex items-center gap-2">
              <ChevronRight size={12} style={{ color:'var(--accent)', flexShrink:0 }}/>
              <p className="text-sm" style={{ color:'var(--foreground)' }}>{idea}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Save to calendar CTA */}
      <a href={calUrl()} target="_blank" rel="noopener noreferrer"
        className="flex items-center justify-between px-4 py-3 rounded-2xl transition-all hover:opacity-90"
        style={{ background:'linear-gradient(135deg,rgba(99,102,241,0.08),rgba(168,85,247,0.06))', border:'1px solid rgba(99,102,241,0.2)' }}>
        <div className="flex items-center gap-2">
          <Calendar size={15} style={{ color:'var(--accent)' }}/>
          <p className="text-sm font-semibold" style={{ color:'var(--foreground)' }}>Save pickup to Google Calendar</p>
        </div>
        <ChevronRight size={15} style={{ color:'var(--accent)' }}/>
      </a>

      {/* Action buttons */}
      <div className="flex flex-col gap-3 pb-6">
        {action === null && (
          <>
            {listing.mode !== 'rent' && (
              <button onClick={() => setAction('buy')}
                className="w-full py-4 rounded-2xl text-sm font-bold"
                style={{ background:'var(--accent)', color:'#fff' }}>
                Buy Now — S${listing.price}
              </button>
            )}
            {listing.rent_price_day && listing.mode !== 'sell' && (
              <button onClick={() => setAction('rent')}
                className="w-full py-4 rounded-2xl text-sm font-bold"
                style={{ background:'rgba(245,158,11,0.9)', color:'#fff' }}>
                Rent This — S${listing.rent_price_day}/day
              </button>
            )}
            <button onClick={() => setMsgSent(true)}
              className="w-full py-3.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2"
              style={{ background:'var(--card)', border:'1px solid var(--card-border)', color:'var(--foreground)' }}>
              <MessageCircle size={15}/>
              {msgSent ? 'Message sent ✓' : 'Message Seller'}
            </button>
          </>
        )}
        {action && (
          <div className="rounded-2xl p-4 text-center" style={{ background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.25)' }}>
            <p className="font-bold text-sm" style={{ color:'#16a34a' }}>
              {action === 'buy' ? '🛒 Purchase request sent!' : '📦 Rental request sent!'}
            </p>
            <p className="text-xs mt-1" style={{ color:'var(--muted)' }}>
              The seller will confirm within 24 hours. Check pickup at {listing.pickup_location}.
            </p>
            <button onClick={() => setAction(null)} className="mt-3 text-xs font-semibold" style={{ color:'var(--accent)' }}>Reset</button>
          </div>
        )}
      </div>
    </div>
  );
}
