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
  const hasColor = listing.color_hex && listing.color_hex !== '';
  return (
    <Link href={`/marketplace/${listing.id}`} className="block">
      <div className="rounded-2xl overflow-hidden transition-all hover:shadow-md"
        style={{ background:'var(--card)', border:'1px solid var(--card-border)', boxShadow:'var(--shadow-sm)' }}>
        {/* Image / Color placeholder */}
        <div className="relative" style={{ height:160, background:'var(--muted-bg)' }}>
          {listing.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={listing.image_url} alt={listing.title} className="w-full h-full object-cover"/>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
              {hasColor && <div className="w-12 h-12 rounded-full border-4 border-white shadow-sm" style={{ background: listing.color_hex }}/>}
              <ShoppingBag size={22} style={{ color:'var(--muted)' }}/>
            </div>
          )}
          {/* Eco badge */}
          {listing.sustainability_badge && (
            <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{ background:'rgba(34,197,94,0.9)', color:'#fff' }}>
              <Leaf size={10}/> Eco
            </div>
          )}
          {/* Condition */}
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ background:'rgba(0,0,0,0.6)', color:'#fff' }}>
            {listing.condition}
          </div>
          {listing.is_mine && (
            <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{ background:'0', color:'#fff' }}>
              My listing
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3">
          <p className="font-semibold text-sm leading-tight truncate" style={{ color:'var(--foreground)' }}>{listing.title}</p>
          <p className="text-xs mt-0.5" style={{ color:'var(--muted)' }}>{listing.brand} · {listing.size}</p>

          {/* Price row */}
          <div className="flex items-center gap-2 mt-2">
            <span className="font-bold text-base" style={{ color:'var(--accent)' }}>S${listing.price}</span>
            {listing.rent_price_day && (
              <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background:'rgba(245,158,11,0.1)', color:'#d97706' }}>
                S${listing.rent_price_day}/day
              </span>
            )}
          </div>

          {/* Distance + color */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1 text-xs" style={{ color:'var(--muted)' }}>
              <MapPin size={10}/> {listing.seller_distance_km > 0 ? `${listing.seller_distance_km} km` : 'Yours'}
            </div>
            {hasColor && (
              <div className="w-4 h-4 rounded-full border" style={{ background: listing.color_hex, borderColor:'rgba(0,0,0,0.1)' }} title={listing.color_name}/>
            )}
          </div>
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
      <div>
        <h1 className="text-xl font-bold" style={{ color:'var(--foreground)' }}>Circular Marketplace</h1>
        <p className="text-xs mt-0.5" style={{ color:'var(--muted)' }}>Buy, rent, or sell pre-loved fashion nearby</p>
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
