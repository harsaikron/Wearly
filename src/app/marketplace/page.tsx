'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useListingsStore } from '@/store/listings';
import { Listing } from '@/types';
import {
  Search, SlidersHorizontal, MapPin, Leaf, ShoppingBag,
  Tag, RefreshCw, X, ChevronDown,
} from 'lucide-react';

type MarketTab = 'buy' | 'rent' | 'mine';

const CATEGORIES = ['All','shirt','tshirt','pants','jeans','jacket','shoes','sneakers','accessory'];
const CONDITIONS = ['All','New','Like New','Good','Fair'];

function ListingCard({ listing }: { listing: Listing }) {
  const bg = listing.color_hex && listing.color_hex !== '' ? listing.color_hex : '#c8c8c8';
  const initial = (listing.brand || listing.title || '?')[0].toUpperCase();
  return (
    <Link href={`/marketplace/${listing.id}`} className="block">
      <div className="rounded-2xl overflow-hidden card-lift"
        style={{ position:'relative', aspectRatio:'3/4', background: bg, boxShadow:'var(--shadow-md)', border:'1.5px solid rgba(0,0,0,0.06)' }}>

        {/* Full-bleed image or colour fill */}
        {listing.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={listing.image_url} alt={listing.title}
            style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }}/>
        ) : (
          /* Gradient colour fill + big initial letter */
          <div className="cbm-card-bg" data-cn={listing.color_name || 'Colour'} style={{
            position:'absolute', inset:0,
            background: `linear-gradient(145deg, ${bg}dd 0%, ${bg}88 100%)`,
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12,
          }}>
            <span style={{ fontSize:52, fontWeight:800, color:'rgba(255,255,255,0.35)', lineHeight:1, userSelect:'none' }}>
              {initial}
            </span>
            <ShoppingBag size={28} style={{ color:'rgba(255,255,255,0.4)' }}/>
          </div>
        )}

        {/* ── Top badges ── */}
        <div style={{ position:'absolute', top:8, left:8, right:8, display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:4 }}>
          {listing.sustainability_badge ? (
            <span style={{ display:'flex', alignItems:'center', gap:3, background:'rgba(22,163,74,0.88)', backdropFilter:'blur(6px)', color:'#fff', fontSize:9, fontWeight:700, padding:'3px 7px', borderRadius:99 }}>
              <Leaf size={9}/> Eco
            </span>
          ) : <span/>}
          <span style={{ background:'rgba(0,0,0,0.55)', backdropFilter:'blur(6px)', color:'#fff', fontSize:9, fontWeight:700, padding:'3px 8px', borderRadius:99 }}>
            {listing.condition}
          </span>
        </div>

        {/* ── Bottom glass strip ── */}
        <div style={{
          position:'absolute', bottom:0, left:0, right:0,
          padding:'32px 10px 10px',
          background:'linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)',
        }}>
          {/* Title */}
          <p style={{ color:'#fff', fontWeight:700, fontSize:12, lineHeight:1.25, marginBottom:5,
            overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
            {listing.title}
          </p>
          {/* Brand · Size */}
          <p style={{ color:'rgba(255,255,255,0.65)', fontSize:10, marginBottom:6 }}>
            {listing.brand}{listing.brand && listing.size ? ' · ' : ''}{listing.size}
          </p>
          {/* Price row */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:4 }}>
            <div style={{ display:'flex', alignItems:'center', gap:5 }}>
              <span style={{ color:'#fff', fontWeight:800, fontSize:14 }}>S${listing.price}</span>
              {listing.rent_price_day && (
                <span style={{ background:'rgba(245,158,11,0.85)', color:'#fff', fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:99 }}>
                  S${listing.rent_price_day}/day
                </span>
              )}
            </div>
            {/* Distance */}
            <span style={{ display:'flex', alignItems:'center', gap:3, color:'rgba(255,255,255,0.65)', fontSize:10 }}>
              <MapPin size={9}/>{listing.seller_distance_km > 0 ? `${listing.seller_distance_km} km` : 'Yours'}
            </span>
          </div>
          {/* "My listing" tag */}
          {listing.is_mine && (
            <span style={{ display:'inline-block', marginTop:5, background:'rgba(255,255,255,0.18)', color:'#fff', fontSize:9, fontWeight:600, padding:'2px 7px', borderRadius:99 }}>
              My listing
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function MarketplacePage() {
  const { listings, seed } = useListingsStore();
  useEffect(() => { seed(); }, [seed]);

  const [tab, setTab]               = useState<MarketTab>('buy');
  const [search, setSearch]         = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [catFilter, setCatFilter]   = useState('All');
  const [condFilter, setCondFilter] = useState('All');
  const [maxPrice, setMaxPrice]     = useState(500);
  const [maxDist, setMaxDist]       = useState(10);

  const filtered = listings.filter((l) => {
    if (tab === 'mine' && !l.is_mine) return false;
    if (tab === 'rent' && !l.rent_price_day) return false;
    if (tab === 'buy' && l.mode === 'rent') return false;
    if (catFilter !== 'All' && l.category !== catFilter) return false;
    if (condFilter !== 'All' && l.condition !== condFilter) return false;
    if (l.price > maxPrice) return false;
    if (l.seller_distance_km > maxDist && !l.is_mine) return false;
    if (search && !l.title.toLowerCase().includes(search.toLowerCase()) &&
        !l.brand.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4 page-enter">
      {/* Header */}
      <div style={{ paddingBottom: 2 }}>
        <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>
          Pre-loved · Sustainable Fashion
        </p>
        <h1 style={{
          fontFamily: 'var(--font-display), Georgia, serif',
          fontSize: 'clamp(2rem, 8vw, 2.8rem)',
          fontWeight: 600,
          fontStyle: 'italic',
          letterSpacing: '-0.02em',
          lineHeight: 1.0,
          color: 'var(--foreground)',
          margin: 0,
        }}>
          Circular{' '}
          <span style={{
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>Market</span>
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background:'var(--card)', border:'1px solid var(--card-border)' }}>
        {([['buy','Buy'],['rent','Rent'],['mine','My Listings']] as [MarketTab,string][]).map(([t,label]) => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
            style={tab===t ? { background:'var(--accent)', color:'#fff' } : { color:'var(--muted)' }}>
            {label}
          </button>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 px-3 rounded-xl" style={{ background:'var(--card)', border:'1px solid var(--card-border)' }}>
          <Search size={14} style={{ color:'var(--muted)' }}/>
          <input className="flex-1 text-sm py-2.5 bg-transparent outline-none" placeholder="Search items, brands…"
            style={{ color:'var(--foreground)' }} value={search} onChange={(e) => setSearch(e.target.value)}/>
          {search && <button onClick={() => setSearch('')}><X size={12} style={{ color:'var(--muted)' }}/></button>}
        </div>
        <button onClick={() => setShowFilter(!showFilter)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all"
          style={showFilter ? { background:'var(--accent)', color:'#fff' } : { background:'var(--card)', border:'1px solid var(--card-border)', color:'var(--muted)' }}>
          <SlidersHorizontal size={14}/>
          <ChevronDown size={12}/>
        </button>
      </div>

      {/* Filter panel */}
      {showFilter && (
        <div className="rounded-2xl p-4 space-y-4" style={{ background:'var(--card)', border:'1px solid var(--card-border)' }}>
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color:'var(--muted)' }}>Category</p>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <button key={c} onClick={() => setCatFilter(c)}
                  className="px-2.5 py-1 rounded-full text-xs font-medium"
                  style={catFilter===c ? { background:'var(--accent)', color:'#fff' } : { background:'var(--muted-bg)', color:'var(--muted)', border:'1px solid var(--card-border)' }}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color:'var(--muted)' }}>Condition</p>
            <div className="flex gap-1.5 flex-wrap">
              {CONDITIONS.map((c) => (
                <button key={c} onClick={() => setCondFilter(c)}
                  className="px-2.5 py-1 rounded-full text-xs font-medium"
                  style={condFilter===c ? { background:'var(--accent)', color:'#fff' } : { background:'var(--muted-bg)', color:'var(--muted)', border:'1px solid var(--card-border)' }}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold mb-1" style={{ color:'var(--muted)' }}>Max Price: S${maxPrice}</p>
            <input type="range" min={0} max={500} step={5} value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} className="w-full"/>
          </div>
          <div>
            <p className="text-xs font-semibold mb-1" style={{ color:'var(--muted)' }}>Max Distance: {maxDist} km</p>
            <input type="range" min={1} max={20} step={1} value={maxDist} onChange={(e) => setMaxDist(Number(e.target.value))} className="w-full"/>
          </div>
          <button onClick={() => { setCatFilter('All'); setCondFilter('All'); setMaxPrice(500); setMaxDist(10); }}
            className="flex items-center gap-1 text-xs font-semibold" style={{ color:'var(--accent)' }}>
            <RefreshCw size={11}/> Reset filters
          </button>
        </div>
      )}

      {/* Results count */}
      <p className="text-xs" style={{ color:'var(--muted)' }}>
        {filtered.length} listing{filtered.length !== 1 ? 's' : ''} {tab === 'mine' ? 'from you' : 'nearby'}
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-14">
          <ShoppingBag size={32} style={{ color:'var(--muted)', margin:'0 auto 12px' }}/>
          <p className="font-semibold text-sm" style={{ color:'var(--foreground)' }}>
            {tab === 'mine' ? 'No listings yet' : 'No results found'}
          </p>
          <p className="text-xs mt-1" style={{ color:'var(--muted)' }}>
            {tab === 'mine' ? 'Sell or rent items from your Wardrobe tab.' : 'Try adjusting your filters.'}
          </p>
          {tab === 'mine' && (
            <Link href="/wardrobe" className="inline-flex items-center gap-1 mt-3 text-xs font-semibold px-3 py-1.5 rounded-xl"
              style={{ background:'0', color:'var(--accent)' }}>
              <Tag size={12}/> Go to Wardrobe →
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((l) => <ListingCard key={l.id} listing={l}/>)}
        </div>
      )}
    </div>
  );
}
