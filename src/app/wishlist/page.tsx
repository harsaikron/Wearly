'use client';

import Link from 'next/link';
import { useWishlistStore } from '@/store/wishlist';
import { Bookmark, ShoppingBag, Trash2, ExternalLink } from 'lucide-react';

const shopeeUrl    = (q: string) => `https://shopee.sg/search?keyword=${encodeURIComponent(q)}`;
const sheinUrl     = (q: string) => `https://sg.shein.com/search?q=${encodeURIComponent(q)}`;
const zaloraUrl    = (q: string) => `https://www.zalora.com.sg/search/?q=${encodeURIComponent(q)}`;
const carousellUrl = (q: string) => `https://www.carousell.sg/search/${encodeURIComponent(q)}/`;

export default function WishlistPage() {
  const { items, removeItem, clear } = useWishlistStore();

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 page-enter">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Wishlist</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Items AI suggested you buy to complete your look</p>
        </div>
        {items.length > 0 && (
          <button onClick={clear} className="text-xs font-semibold px-3 py-1.5 rounded-xl"
            style={{ background: 'rgba(220,38,38,0.06)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.15)' }}>
            Clear all
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20 flex flex-col items-center gap-3">
          <Bookmark size={36} style={{ color: 'var(--muted)' }} />
          <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>Nothing saved yet</p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>Open any wardrobe item and tap "Complete the Look" to find things to buy.</p>
          <Link href="/wardrobe" className="mt-2 text-sm font-semibold px-4 py-2 rounded-xl"
            style={{ background: 'var(--accent)', color: '#fff' }}>
            Go to Wardrobe →
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--card)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-sm)' }}>
              <div className="flex items-center gap-3 px-4 py-3">
                {/* Color swatch */}
                <div className="w-12 h-12 rounded-xl shrink-0 border-2"
                  style={{ background: item.color_hex || '#e5e7eb', borderColor: 'rgba(0,0,0,0.07)' }}/>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>{item.name}</p>
                  <p className="text-xs mt-0.5 capitalize" style={{ color: 'var(--muted)' }}>
                    {item.category} · {item.color_name}
                    {item.price_estimate && <span style={{ color: 'var(--accent)' }}> · {item.price_estimate}</span>}
                  </p>
                  {item.reason && (
                    <p className="text-xs mt-1 leading-snug" style={{ color: 'var(--muted)', fontStyle: 'italic' }}>"{item.reason}"</p>
                  )}
                </div>
                <button onClick={() => removeItem(item.id)}
                  style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(220,38,38,0.08)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                  <Trash2 size={13} style={{ color: '#dc2626' }}/>
                </button>
              </div>

              {/* Shop links */}
              <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                {[
                  { label: 'Shopee',    url: shopeeUrl(item.buy_query),    bg: '#ff6130' },
                  { label: 'Shein',     url: sheinUrl(item.buy_query),     bg: '#222' },
                  { label: 'Zalora',    url: zaloraUrl(item.buy_query),    bg: 'var(--primary-mid)' },
                  { label: '2nd hand',  url: carousellUrl(item.buy_query), bg: '#10b981' },
                ].map(({ label, url, bg }) => (
                  <a key={label} href={url} target="_blank" rel="noopener"
                    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full font-semibold btn-bounce"
                    style={{ background: bg, color: '#fff' }}>
                    <ExternalLink size={9}/> {label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
