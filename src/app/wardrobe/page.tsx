'use client';

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import CameraCapture from '@/components/Camera';
import UploadZone from '@/components/UploadZone';
import { useWardrobeStore } from '@/store/wardrobe';
import { useListingsStore } from '@/store/listings';
import { ClothingItem, ClothingCategory, OccasionTag, Listing, ListingCondition } from '@/types';
import { categoryLabel } from '@/lib/utils';
import { compressImage, stripDataPrefix } from '@/lib/image-utils';
import {
  Plus, X, Search, Shirt, Loader, Sparkles, Trash2, Camera,
  Heart, BarChart2, ShoppingBag, RefreshCw, Lightbulb, Award,
  AlertTriangle, Package, Palette, Star, ImageIcon, ExternalLink,
  Calendar, ChevronRight, Zap, Leaf, Tag,
} from 'lucide-react';

const CATEGORIES: ClothingCategory[] = [
  'shirt','formal_shirt','tshirt','pants','jeans','shorts',
  'shoes','sneakers','loafers','jacket','watch','belt','accessory',
];
const OCCASIONS: OccasionTag[] = [
  'office','casual','date_night','weekend','smart_casual',
  'minimal','luxury','travel','festive','gym',
];
const CONDITIONS: ListingCondition[] = ['New', 'Like New', 'Good', 'Fair'];
const SIZES = ['XS','S','M','L','XL','XXL','28','30','32','34','36','38','40','42','UK6','UK7','UK8','UK9','UK10','UK11'];

type Tab = 'closet' | 'health';
type FilterCat = ClothingCategory | 'all';

// ── Health data types ──
interface HealthCombo {
  outfit_name: string;
  items: string[];
  colors: { name: string; hex: string }[];
  confidence: number;
  style_reason: string;
  comfort: number;
  sustainability: number;
  calendar_label: string;
}
interface LifecycleItem {
  name: string;
  prediction: string;
  resale_window: string;
  demand_trend: string;
  action: string;
}
interface HealthData {
  overall_score: number;
  grade: string;
  summary: string;
  overused: { name: string; times_worn: number; tip: string }[];
  unused: { name: string; days_since: number; tip: string; resell_suggestion: string }[];
  duplicate_colors: { color: string; hex: string; count: number; items: string[] }[];
  missing_essentials: { item: string; reason: string; priority: string }[];
  lifecycle: LifecycleItem[];
  outfit_combos: HealthCombo[];
  backend?: string;
}

function getContrastHex(hex: string) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return (r*299+g*587+b*114)/1000 >= 128 ? '#1f2937' : '#ffffff';
}

function ScoreRing({ score, grade }: { score: number; grade: string }) {
  const r = 40, circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';
  return (
    <div className="relative flex items-center justify-center" style={{ width: 100, height: 100 }}>
      <svg width={100} height={100} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={50} cy={50} r={r} fill="none" stroke="var(--card-border)" strokeWidth={8} />
        <circle cx={50} cy={50} r={r} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-xl font-bold" style={{ color }}>{score}</span>
        <span className="text-xs font-semibold" style={{ color }}>{grade}</span>
      </div>
    </div>
  );
}

const PREDICTION_COLOR: Record<string, string> = {
  high_usage: '#22c55e', low_usage: '#94a3b8', seasonal_peak: '#f59e0b',
  resale_ready: '#6366f1', donate: '#ef4444',
};
const PREDICTION_LABEL: Record<string, string> = {
  high_usage: 'Keep using', low_usage: 'Consider selling', seasonal_peak: 'Seasonal peak',
  resale_ready: 'Sell now', donate: 'Donate',
};

export default function WardrobePage() {
  const { items, addItem, removeItem } = useWardrobeStore();
  const { addListing, seed } = useListingsStore();

  useEffect(() => { seed(); }, [seed]);

  // Tabs
  const [tab, setTab] = useState<Tab>('closet');

  // Closet tab state
  const [filter, setFilter]       = useState<FilterCat>('all');
  const [search, setSearch]       = useState('');
  const [showAdd, setShowAdd]     = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [preview, setPreview]     = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [form, setForm] = useState({
    name: '', category: 'shirt' as ClothingCategory,
    color_hex: '#FFFFFF', color_name: 'White', tags: [] as OccasionTag[],
  });

  // Sell/Rent modal
  const [sellItem, setSellItem]   = useState<ClothingItem | null>(null);
  const [sellMode, setSellMode]   = useState<'sell'|'rent'>('sell');
  const [listForm, setListForm]   = useState({
    title:'', brand:'', size:'M', condition:'Good' as ListingCondition,
    price:'', rent_price:'', description:'', pickup_location:'',
  });
  const [aiListing, setAiListing] = useState<{ title:string; description:string; suggested_price?:number; suggested_rent?:number } | null>(null);
  const [listingLoading, setListingLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Health tab state
  const [health, setHealth]       = useState<HealthData | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState('');

  const filtered = items.filter((item) => {
    const matchCat    = filter === 'all' || item.category === filter;
    const matchSearch = !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.color_name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  // ── Add item flow ──
  async function analyzePhoto(dataUrl: string) {
    setPreview(dataUrl);
    setAnalyzing(true);
    try {
      const res = await fetch('/api/analyze-clothing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: stripDataPrefix(dataUrl) }),
      });
      if (res.ok) {
        const d = await res.json();
        setForm({ name: d.suggested_name??'', category: d.category??'shirt', color_hex: d.color_hex??'#FFFFFF', color_name: d.color_name??'White', tags: d.tags??[] });
      }
    } catch { /* keep blank */ } finally { setAnalyzing(false); }
  }

  function onCameraCapture(dataUrl: string) { setShowCamera(false); setShowAdd(true); analyzePhoto(dataUrl); }

  const handleFile = useCallback(async (file: File) => {
    const compressed = await compressImage(file);
    setShowAdd(true);
    analyzePhoto(compressed);
  }, []);

  function saveItem() {
    const item: ClothingItem = {
      id: crypto.randomUUID(), user_id: 'local',
      name: form.name || 'Unnamed Item',
      category: form.category, color_hex: form.color_hex, color_name: form.color_name,
      image_url: preview, brand: undefined, tags: form.tags,
      times_worn: 0, created_at: new Date().toISOString(),
    };
    addItem(item);
    setShowAdd(false); setPreview(''); setForm({ name:'', category:'shirt', color_hex:'#FFFFFF', color_name:'White', tags:[] });
  }

  // ── Sell/Rent flow ──
  async function openSell(item: ClothingItem, mode: 'sell'|'rent') {
    setSellItem(item); setSellMode(mode);
    setListForm({ title:'', brand: item.brand??'', size:'M', condition:'Good', price:'', rent_price:'', description:'', pickup_location:'' });
    setAiListing(null);
    setListingLoading(true);
    try {
      const res = await fetch('/api/ai-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: item.name, category: item.category, brand: item.brand, condition: 'Good', color_name: item.color_name, times_worn: item.times_worn, mode }),
      });
      if (res.ok) {
        const d = await res.json();
        setAiListing(d);
        setListForm((f) => ({
          ...f,
          title: d.title ?? '',
          description: d.description ?? '',
          price: d.suggested_price ? String(d.suggested_price) : '',
          rent_price: d.suggested_rent ? String(d.suggested_rent) : '',
        }));
      }
    } catch { /* use manual form */ } finally { setListingLoading(false); }
  }

  async function publishListing() {
    if (!sellItem) return;
    setPublishing(true);
    const listing: Listing = {
      id: crypto.randomUUID(),
      item_id: sellItem.id,
      title: listForm.title || sellItem.name,
      category: sellItem.category,
      brand: listForm.brand,
      size: listForm.size,
      condition: listForm.condition,
      price: parseFloat(listForm.price) || 0,
      rent_price_day: sellMode === 'rent' ? parseFloat(listForm.rent_price) || 0 : undefined,
      description: listForm.description,
      image_url: sellItem.image_url,
      color_hex: sellItem.color_hex,
      color_name: sellItem.color_name,
      seller_name: 'You',
      seller_distance_km: 0,
      pickup_location: listForm.pickup_location,
      availability: 'available',
      mode: sellMode === 'rent' ? 'rent' : 'sell',
      is_mine: true,
      sustainability_badge: true,
      created_at: new Date().toISOString(),
    };
    addListing(listing);
    setPublishing(false);
    setSellItem(null);
  }

  // ── Health score ──
  async function fetchHealth() {
    if (items.length === 0) return;
    setHealthLoading(true); setHealthError('');
    try {
      const res = await fetch('/api/closet-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: items.map((i) => ({ name:i.name, category:i.category, color_name:i.color_name, color_hex:i.color_hex, tags:i.tags, times_worn:i.times_worn, last_worn:i.last_worn, created_at:i.created_at })) }),
      });
      const d = await res.json();
      if (!res.ok || d.error) throw new Error(d.error);
      setHealth(d as HealthData);
    } catch (e) { setHealthError(String(e)); } finally { setHealthLoading(false); }
  }

  useEffect(() => { if (tab === 'health' && !health && !healthLoading) fetchHealth(); }, [tab]);

  function calendarUrl(combo: HealthCombo) {
    const text = encodeURIComponent(`Outfit: ${combo.outfit_name}`);
    const detail = encodeURIComponent(combo.items.join(' + ') + '\n' + combo.style_reason);
    return `https://calendar.google.com/calendar/r/eventedit?text=${text}&details=${detail}`;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">

      {/* Header + Tabs */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Wardrobe</h1>
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}>
          {(['closet','health'] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={tab === t ? { background: 'var(--accent)', color: '#fff' } : { color: 'var(--muted)' }}>
              {t === 'closet' ? <Shirt size={12}/> : <BarChart2 size={12}/>}
              {t === 'closet' ? 'My Closet' : 'Health Score'}
            </button>
          ))}
        </div>
      </div>

      {/* ══ CLOSET TAB ══ */}
      {tab === 'closet' && (
        <div className="space-y-4">
          {/* Search + Filter + Add */}
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 px-3 rounded-xl" style={{ background:'var(--card)', border:'1px solid var(--card-border)' }}>
              <Search size={14} style={{ color:'var(--muted)' }}/>
              <input className="flex-1 text-sm py-2.5 bg-transparent outline-none" placeholder="Search items…"
                style={{ color:'var(--foreground)' }} value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <button onClick={() => { setPreview(''); setShowAdd(true); }}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background:'var(--accent)', color:'#fff' }}>
              <Plus size={15}/> Add
            </button>
          </div>

          {/* Category pills */}
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth:'none' }}>
            {(['all', ...CATEGORIES] as (FilterCat)[]).map((c) => (
              <button key={c} onClick={() => setFilter(c)}
                className="shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all"
                style={filter === c ? { background:'var(--accent)', color:'#fff' } : { background:'var(--card)', color:'var(--muted)', border:'1px solid var(--card-border)' }}>
                {c === 'all' ? 'All' : categoryLabel(c)}
              </button>
            ))}
          </div>

          {/* Item grid */}
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <Shirt size={36} style={{ color:'var(--muted)', margin:'0 auto 12px' }}/>
              <p className="font-semibold text-sm" style={{ color:'var(--foreground)' }}>No items yet</p>
              <p className="text-xs mt-1" style={{ color:'var(--muted)' }}>Add clothes using the camera or gallery</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filtered.map((item) => {
                const daysSince = item.last_worn
                  ? Math.floor((Date.now() - new Date(item.last_worn).getTime()) / 86400000)
                  : null;
                const isUnused = !item.last_worn || (daysSince !== null && daysSince > 60);
                const isOverused = item.times_worn > 10;
                return (
                  <div key={item.id} className="rounded-2xl overflow-hidden flex flex-col"
                    style={{ background:'var(--card)', border:'1px solid var(--card-border)', boxShadow:'var(--shadow-sm)' }}>

                    {/* Image */}
                    <div className="relative w-full" style={{ height:160, background:'var(--muted-bg)' }}>
                      {item.image_url ? (
                        <Image src={item.image_url} alt={item.name} fill className="object-cover"/>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center flex-col gap-1">
                          <div className="w-10 h-10 rounded-full" style={{ background: item.color_hex }}/>
                          <Shirt size={20} style={{ color:'var(--muted)' }}/>
                        </div>
                      )}
                      {/* Status badges */}
                      <div className="absolute top-2 left-2 flex flex-col gap-1">
                        {isUnused && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                            style={{ background:'rgba(239,68,68,0.9)', color:'#fff', fontSize:9 }}>Unused</span>
                        )}
                        {isOverused && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                            style={{ background:'rgba(245,158,11,0.9)', color:'#fff', fontSize:9 }}>Overused</span>
                        )}
                      </div>
                      {/* Delete */}
                      <button onClick={() => removeItem(item.id)}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ background:'rgba(255,255,255,0.9)', border:'1px solid var(--card-border)' }}>
                        <Trash2 size={11} style={{ color:'#ef4444' }}/>
                      </button>
                    </div>

                    {/* Info */}
                    <div className="p-3 flex-1 flex flex-col gap-2">
                      <div>
                        <p className="font-semibold text-sm leading-tight truncate" style={{ color:'var(--foreground)' }}>{item.name}</p>
                        <p className="text-xs" style={{ color:'var(--muted)' }}>{categoryLabel(item.category)}</p>
                      </div>
                      {/* Color */}
                      <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded-full border" style={{ background: item.color_hex, borderColor:'rgba(0,0,0,0.1)' }}/>
                        <span className="text-xs font-mono" style={{ color:'var(--muted)', fontSize:10 }}>{item.color_hex}</span>
                        <span className="text-xs" style={{ color:'var(--muted)' }}>· {item.color_name}</span>
                      </div>
                      {/* Stats */}
                      <div className="flex items-center gap-3 text-xs" style={{ color:'var(--muted)' }}>
                        <span className="flex items-center gap-0.5">
                          <Heart size={10}/> {item.times_worn}×
                        </span>
                        {daysSince !== null ? (
                          <span>{daysSince}d ago</span>
                        ) : (
                          <span>Never worn</span>
                        )}
                      </div>
                      {/* Actions */}
                      <div className="flex gap-1.5 mt-auto">
                        <a href="/stylist"
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold"
                          style={{ background:'rgba(99,102,241,0.1)', color:'var(--accent)' }}>
                          <Sparkles size={11}/> Style
                        </a>
                        <button onClick={() => openSell(item, 'sell')}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold"
                          style={{ background:'rgba(34,197,94,0.1)', color:'#16a34a' }}>
                          <Tag size={11}/> Sell
                        </button>
                        <button onClick={() => openSell(item, 'rent')}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold"
                          style={{ background:'rgba(245,158,11,0.1)', color:'#d97706' }}>
                          <ShoppingBag size={11}/> Rent
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══ HEALTH TAB ══ */}
      {tab === 'health' && (
        <div className="space-y-5">
          {items.length === 0 && (
            <div className="text-center py-12">
              <BarChart2 size={32} style={{ color:'var(--muted)', margin:'0 auto 12px' }}/>
              <p className="text-sm font-semibold" style={{ color:'var(--foreground)' }}>Add items first</p>
              <p className="text-xs mt-1" style={{ color:'var(--muted)' }}>Your health score appears once you have wardrobe items.</p>
            </div>
          )}

          {healthLoading && (
            <div className="flex flex-col gap-4">
              <div className="shimmer rounded-2xl h-32"/>
              {[0,1,2,3].map((i) => <div key={i} className="shimmer rounded-2xl h-24"/>)}
            </div>
          )}

          {healthError && (
            <div className="rounded-xl px-4 py-3 text-sm" style={{ background:'rgba(239,68,68,0.06)', color:'#dc2626', border:'1px solid rgba(239,68,68,0.2)' }}>
              {healthError} — <button onClick={fetchHealth} className="underline">Retry</button>
            </div>
          )}

          {health && !healthLoading && (
            <>
              {/* Score card */}
              <div className="rounded-2xl p-5 flex items-center gap-5" style={{ background:'var(--card)', border:'1px solid var(--card-border)', boxShadow:'var(--shadow-sm)' }}>
                <ScoreRing score={health.overall_score} grade={health.grade}/>
                <div className="flex-1">
                  <p className="font-bold text-base" style={{ color:'var(--foreground)' }}>Closet Health Score</p>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color:'var(--muted)' }}>{health.summary}</p>
                  <button onClick={fetchHealth} className="flex items-center gap-1 mt-2 text-xs font-semibold" style={{ color:'var(--accent)' }}>
                    <RefreshCw size={11}/> Refresh
                  </button>
                </div>
              </div>

              {/* 4 sections */}
              {/* Overused */}
              {health.overused?.length > 0 && (
                <Section icon={<AlertTriangle size={15} color="#f59e0b"/>} title="Overused Items" color="#f59e0b">
                  {health.overused.map((o,i) => (
                    <div key={i} className="flex items-center justify-between py-2" style={{ borderBottom:'1px solid var(--card-border)' }}>
                      <div>
                        <p className="text-sm font-semibold" style={{ color:'var(--foreground)' }}>{o.name}</p>
                        <p className="text-xs" style={{ color:'var(--muted)' }}>Worn {o.times_worn}× — {o.tip}</p>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background:'rgba(245,158,11,0.1)', color:'#d97706' }}>
                        {o.times_worn}×
                      </span>
                    </div>
                  ))}
                </Section>
              )}

              {/* Unused */}
              {health.unused?.length > 0 && (
                <Section icon={<Package size={15} color="#6366f1"/>} title="Unused Items" color="#6366f1">
                  {health.unused.map((u,i) => (
                    <div key={i} className="py-2" style={{ borderBottom:'1px solid var(--card-border)' }}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold" style={{ color:'var(--foreground)' }}>{u.name}</p>
                        <span className="text-xs" style={{ color:'var(--muted)' }}>{u.days_since}d idle</span>
                      </div>
                      <p className="text-xs mt-0.5" style={{ color:'var(--muted)' }}>{u.tip}</p>
                      <p className="text-xs mt-0.5 font-medium" style={{ color:'#6366f1' }}>{u.resell_suggestion}</p>
                    </div>
                  ))}
                </Section>
              )}

              {/* Duplicate Colors */}
              {health.duplicate_colors?.length > 0 && (
                <Section icon={<Palette size={15} color="#e91e8c"/>} title="Duplicate Colors" color="#e91e8c">
                  {health.duplicate_colors.map((d,i) => (
                    <div key={i} className="flex items-start gap-3 py-2" style={{ borderBottom:'1px solid var(--card-border)' }}>
                      <div className="w-8 h-8 rounded-lg shrink-0 border-2" style={{ background: d.hex, borderColor:'rgba(0,0,0,0.1)' }}/>
                      <div className="flex-1">
                        <p className="text-sm font-semibold" style={{ color:'var(--foreground)' }}>{d.color} ({d.count} items)</p>
                        <p className="text-xs mt-0.5 leading-snug" style={{ color:'var(--muted)' }}>{d.items.join(' · ')}</p>
                      </div>
                    </div>
                  ))}
                </Section>
              )}

              {/* Missing Essentials */}
              {health.missing_essentials?.length > 0 && (
                <Section icon={<Star size={15} color="#22c55e"/>} title="Missing Essentials" color="#22c55e">
                  {health.missing_essentials.map((m,i) => (
                    <div key={i} className="flex items-center justify-between py-2" style={{ borderBottom:'1px solid var(--card-border)' }}>
                      <div>
                        <p className="text-sm font-semibold" style={{ color:'var(--foreground)' }}>{m.item}</p>
                        <p className="text-xs" style={{ color:'var(--muted)' }}>{m.reason}</p>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: m.priority==='high' ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', color: m.priority==='high' ? '#ef4444' : '#16a34a' }}>
                        {m.priority}
                      </span>
                    </div>
                  ))}
                </Section>
              )}

              {/* Lifecycle AI */}
              {health.lifecycle?.length > 0 && (
                <div className="rounded-2xl overflow-hidden" style={{ background:'var(--card)', border:'1px solid var(--card-border)' }}>
                  <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom:'1px solid var(--card-border)', background:'linear-gradient(135deg,rgba(99,102,241,0.06),rgba(168,85,247,0.04))' }}>
                    <Zap size={15} style={{ color:'var(--accent)' }}/>
                    <p className="text-sm font-bold" style={{ color:'var(--foreground)' }}>Smart Clothing Lifecycle AI</p>
                  </div>
                  <div className="divide-y" style={{ borderColor:'var(--card-border)' }}>
                    {health.lifecycle.map((l,i) => (
                      <div key={i} className="px-4 py-3 flex items-start gap-3">
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 mt-0.5"
                          style={{ background:`${PREDICTION_COLOR[l.prediction] ?? '#94a3b8'}18`, color: PREDICTION_COLOR[l.prediction] ?? '#94a3b8' }}>
                          {PREDICTION_LABEL[l.prediction] ?? l.prediction}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color:'var(--foreground)' }}>{l.name}</p>
                          <p className="text-xs mt-0.5" style={{ color:'var(--muted)' }}>{l.demand_trend} · Resale window: {l.resale_window}</p>
                          <p className="text-xs mt-0.5 font-medium" style={{ color:'var(--accent)' }}>{l.action}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Outfit Combos */}
              {health.outfit_combos?.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-bold" style={{ color:'var(--foreground)' }}>AI Outfit Combinations</p>
                  {health.outfit_combos.map((combo,i) => (
                    <div key={i} className="rounded-2xl overflow-hidden" style={{ background:'var(--card)', border:'1px solid var(--card-border)' }}>
                      <div className="px-4 pt-4 pb-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-bold text-sm" style={{ color:'var(--foreground)' }}>{combo.outfit_name}</p>
                          <div className="flex gap-1.5">
                            <ScoreBadge label="Style" value={combo.confidence} color="#6366f1"/>
                            <ScoreBadge label="Comfort" value={combo.comfort} color="#22c55e"/>
                            <ScoreBadge label="Eco" value={combo.sustainability} color="#16a34a"/>
                          </div>
                        </div>
                        {/* Items */}
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {combo.items.map((item,j) => (
                            <span key={j} className="text-xs px-2 py-0.5 rounded-full" style={{ background:'var(--muted-bg)', color:'var(--foreground)', border:'1px solid var(--card-border)' }}>
                              {item}
                            </span>
                          ))}
                        </div>
                        {/* Color palette */}
                        <div className="flex items-center gap-2 mb-2">
                          {combo.colors?.map((c,j) => (
                            <div key={j} className="flex items-center gap-1">
                              <div className="w-5 h-5 rounded-full border-2" style={{ background: c.hex, borderColor:'rgba(0,0,0,0.1)' }} title={c.name}/>
                              <span className="text-xs font-mono" style={{ color:'var(--muted)', fontSize:9 }}>{c.hex}</span>
                            </div>
                          ))}
                        </div>
                        {/* Style reason */}
                        <p className="text-xs leading-relaxed" style={{ color:'var(--muted)' }}>
                          <Lightbulb size={10} style={{ display:'inline', marginRight:3, color:'var(--accent)' }}/>
                          {combo.style_reason}
                        </p>
                      </div>
                      {/* CTA */}
                      <div className="px-4 py-2.5 flex items-center justify-between" style={{ borderTop:'1px solid var(--card-border)', background:'var(--muted-bg)' }}>
                        <span className="text-xs" style={{ color:'var(--muted)' }}>{combo.calendar_label}</span>
                        <a href={calendarUrl(combo)} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
                          style={{ background:'rgba(99,102,241,0.1)', color:'var(--accent)' }}>
                          <Calendar size={12}/> Save to Calendar
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ══ ADD ITEM MODAL ══ */}
      {showAdd && (
        <Modal title="Add Clothing Item" onClose={() => { setShowAdd(false); setPreview(''); }}>
          {/* Camera / Upload */}
          {!preview && (
            <div className="flex gap-3 mb-4">
              <button onClick={() => { setShowAdd(false); setShowCamera(true); }}
                className="flex-1 flex flex-col items-center gap-2 py-4 rounded-xl transition-all"
                style={{ background:'linear-gradient(135deg,#6366f1,#818cf8)', color:'#fff' }}>
                <Camera size={20}/> <span className="text-xs font-semibold">Camera</span>
              </button>
              <div className="flex-1">
                <UploadZone onFile={handleFile} />
              </div>
            </div>
          )}

          {preview && (
            <div className="relative mb-4 rounded-xl overflow-hidden" style={{ height:160 }}>
              <Image src={preview} alt="preview" fill className="object-cover"/>
              {analyzing && (
                <div className="absolute inset-0 flex items-center justify-center" style={{ background:'rgba(0,0,0,0.4)' }}>
                  <Loader size={24} className="animate-spin text-white"/>
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            <Field label="Name">
              <input className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={{ background:'var(--muted-bg)', color:'var(--foreground)', border:'1px solid var(--card-border)' }}
                value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="e.g. White Oxford Shirt"/>
            </Field>
            <Field label="Category">
              <select className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={{ background:'var(--muted-bg)', color:'var(--foreground)', border:'1px solid var(--card-border)' }}
                value={form.category} onChange={(e) => setForm({...form, category: e.target.value as ClothingCategory})}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{categoryLabel(c)}</option>)}
              </select>
            </Field>
            <div className="flex gap-2">
              <div className="flex-1">
                <Field label="Color">
                  <input type="color" className="w-full h-10 rounded-xl cursor-pointer border outline-none" style={{ border:'1px solid var(--card-border)' }}
                    value={form.color_hex} onChange={(e) => setForm({...form, color_hex: e.target.value})}/>
                </Field>
              </div>
              <div className="flex-1">
                <Field label="Color Name">
                  <input className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={{ background:'var(--muted-bg)', color:'var(--foreground)', border:'1px solid var(--card-border)' }}
                    value={form.color_name} onChange={(e) => setForm({...form, color_name: e.target.value})}/>
                </Field>
              </div>
            </div>
            <Field label="Occasions">
              <div className="flex flex-wrap gap-1.5">
                {OCCASIONS.map((o) => (
                  <button key={o} onClick={() => setForm({...form, tags: form.tags.includes(o) ? form.tags.filter((t) => t!==o) : [...form.tags, o]})}
                    className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                    style={form.tags.includes(o) ? { background:'var(--accent)', color:'#fff' } : { background:'var(--muted-bg)', color:'var(--muted)', border:'1px solid var(--card-border)' }}>
                    {o.replace(/_/g,' ')}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          <button onClick={saveItem}
            className="w-full mt-4 py-3 rounded-xl text-sm font-semibold"
            style={{ background:'var(--accent)', color:'#fff' }}>
            Save to Wardrobe
          </button>
        </Modal>
      )}

      {showCamera && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background:'#000' }}>
          <CameraCapture onCapture={onCameraCapture} onClose={() => setShowCamera(false)}/>
        </div>
      )}

      {/* ══ SELL/RENT MODAL ══ */}
      {sellItem && (
        <Modal title={`${sellMode === 'sell' ? 'Sell' : 'Rent'} — ${sellItem.name}`} onClose={() => setSellItem(null)}>
          {/* AI suggestion banner */}
          {sellItem.times_worn === 0 || (sellItem.last_worn && Math.floor((Date.now()-new Date(sellItem.last_worn).getTime())/86400000) > 60) ? (
            <div className="mb-4 rounded-xl px-3 py-2.5 flex items-start gap-2" style={{ background:'rgba(99,102,241,0.07)', border:'1px solid rgba(99,102,241,0.2)' }}>
              <Lightbulb size={14} style={{ color:'var(--accent)', marginTop:2, flexShrink:0 }}/>
              <p className="text-xs leading-relaxed" style={{ color:'var(--foreground)' }}>
                <span className="font-semibold">AI Suggestion: </span>
                You haven&apos;t worn this in {sellItem.last_worn ? Math.floor((Date.now()-new Date(sellItem.last_worn).getTime())/86400000) : 'a long time'} days.
                {' '}{sellMode === 'sell' ? 'Selling it could earn you cash and reduce waste.' : 'Renting it out keeps it in circulation sustainably.'}
              </p>
            </div>
          ) : null}

          {listingLoading && (
            <div className="flex items-center gap-2 mb-4 text-sm" style={{ color:'var(--muted)' }}>
              <Loader size={14} className="animate-spin"/>&nbsp;Gemma 4 is writing your listing…
            </div>
          )}

          {aiListing && (
            <div className="mb-4 rounded-xl px-3 py-2.5" style={{ background:'rgba(34,197,94,0.06)', border:'1px solid rgba(34,197,94,0.2)' }}>
              <p className="text-xs font-semibold mb-1" style={{ color:'#16a34a' }}>AI-generated preview</p>
              <p className="text-xs font-bold" style={{ color:'var(--foreground)' }}>{aiListing.title}</p>
              <p className="text-xs mt-1 leading-relaxed" style={{ color:'var(--muted)' }}>{aiListing.description}</p>
            </div>
          )}

          <div className="space-y-3">
            <Field label="Title">
              <input className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={{ background:'var(--muted-bg)', color:'var(--foreground)', border:'1px solid var(--card-border)' }}
                value={listForm.title} onChange={(e) => setListForm({...listForm, title: e.target.value})} placeholder="Listing title"/>
            </Field>
            <div className="flex gap-2">
              <div className="flex-1">
                <Field label="Brand">
                  <input className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={{ background:'var(--muted-bg)', color:'var(--foreground)', border:'1px solid var(--card-border)' }}
                    value={listForm.brand} onChange={(e) => setListForm({...listForm, brand: e.target.value})} placeholder="Brand"/>
                </Field>
              </div>
              <div className="flex-1">
                <Field label="Size">
                  <select className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={{ background:'var(--muted-bg)', color:'var(--foreground)', border:'1px solid var(--card-border)' }}
                    value={listForm.size} onChange={(e) => setListForm({...listForm, size: e.target.value})}>
                    {SIZES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </Field>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <Field label="Condition">
                  <select className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={{ background:'var(--muted-bg)', color:'var(--foreground)', border:'1px solid var(--card-border)' }}
                    value={listForm.condition} onChange={(e) => setListForm({...listForm, condition: e.target.value as ListingCondition})}>
                    {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </Field>
              </div>
              <div className="flex-1">
                <Field label={sellMode==='sell' ? 'Price (SGD)' : 'Sell Price (SGD)'}>
                  <input type="number" className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={{ background:'var(--muted-bg)', color:'var(--foreground)', border:'1px solid var(--card-border)' }}
                    value={listForm.price} onChange={(e) => setListForm({...listForm, price: e.target.value})} placeholder="0"/>
                </Field>
              </div>
            </div>
            {(sellMode === 'rent') && (
              <Field label="Rent Price (SGD/day)">
                <input type="number" className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={{ background:'var(--muted-bg)', color:'var(--foreground)', border:'1px solid var(--card-border)' }}
                  value={listForm.rent_price} onChange={(e) => setListForm({...listForm, rent_price: e.target.value})} placeholder="0"/>
              </Field>
            )}
            <Field label="Description">
              <textarea rows={3} className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none" style={{ background:'var(--muted-bg)', color:'var(--foreground)', border:'1px solid var(--card-border)' }}
                value={listForm.description} onChange={(e) => setListForm({...listForm, description: e.target.value})} placeholder="Describe the item…"/>
            </Field>
            <Field label="Pickup Location">
              <input className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={{ background:'var(--muted-bg)', color:'var(--foreground)', border:'1px solid var(--card-border)' }}
                value={listForm.pickup_location} onChange={(e) => setListForm({...listForm, pickup_location: e.target.value})} placeholder="e.g. Bugis MRT, Tampines Hub"/>
            </Field>
          </div>

          <div className="flex gap-2 mt-4">
            <button onClick={() => setSellItem(null)}
              className="flex-1 py-3 rounded-xl text-sm font-semibold"
              style={{ background:'var(--muted-bg)', color:'var(--muted)', border:'1px solid var(--card-border)' }}>
              Cancel
            </button>
            <button onClick={publishListing} disabled={publishing}
              className="flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
              style={{ background: publishing ? 'var(--muted-bg)' : '#16a34a', color: publishing ? 'var(--muted)' : '#fff' }}>
              {publishing ? <Loader size={14} className="animate-spin"/> : <ExternalLink size={14}/>}
              {publishing ? 'Publishing…' : 'Publish Listing'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Shared UI helpers ──

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center" style={{ background:'rgba(15,23,42,0.5)', backdropFilter:'blur(4px)' }}>
      <div className="w-full md:max-w-md rounded-t-3xl md:rounded-2xl overflow-hidden overflow-y-auto" style={{ background:'var(--card)', maxHeight:'90vh' }}>
        <div className="flex items-center justify-between px-5 py-4 sticky top-0" style={{ background:'var(--card)', borderBottom:'1px solid var(--card-border)' }}>
          <p className="font-bold text-sm" style={{ color:'var(--foreground)' }}>{title}</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background:'var(--muted-bg)' }}>
            <X size={15} style={{ color:'var(--muted)' }}/>
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function Section({ icon, title, color, children }: { icon: React.ReactNode; title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background:'var(--card)', border:`1px solid ${color}30` }}>
      <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom:'1px solid var(--card-border)', background:`${color}08` }}>
        {icon}
        <p className="text-sm font-bold" style={{ color:'var(--foreground)' }}>{title}</p>
      </div>
      <div className="px-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold mb-1" style={{ color:'var(--muted)' }}>{label}</p>
      {children}
    </div>
  );
}

function ScoreBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center px-2 py-1 rounded-lg" style={{ background:`${color}10`, border:`1px solid ${color}25` }}>
      <span className="text-xs font-bold" style={{ color }}>{value}</span>
      <span style={{ fontSize:8, color, opacity:0.8 }}>{label}</span>
    </div>
  );
}
