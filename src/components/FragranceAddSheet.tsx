'use client';
import { useState, useEffect } from 'react';
import { X, ChevronLeft, Check } from 'lucide-react';
import type { OccasionTag } from '@/types';

const SCENT_FAMILIES = [
  { id: 'floral',    emoji: '🌸', label: 'Floral',    desc: 'Rose · Jasmine · Peony',     color: '#e879a0' },
  { id: 'woody',     emoji: '🌲', label: 'Woody',     desc: 'Sandalwood · Cedar · Oud',   color: '#8B5E3C' },
  { id: 'fresh',     emoji: '🍃', label: 'Fresh',     desc: 'Green · Aquatic · Ozonic',   color: '#22c55e' },
  { id: 'oriental',  emoji: '🌙', label: 'Oriental',  desc: 'Amber · Vanilla · Spice',    color: '#d97706' },
  { id: 'citrus',    emoji: '🍊', label: 'Citrus',    desc: 'Bergamot · Lemon · Neroli',  color: '#f59e0b' },
  { id: 'aquatic',   emoji: '🌊', label: 'Aquatic',   desc: 'Sea Salt · Driftwood',       color: '#3b82f6' },
  { id: 'gourmand',  emoji: '🍬', label: 'Gourmand',  desc: 'Caramel · Chocolate · Musk', color: '#ec4899' },
  { id: 'fougere',   emoji: '🌿', label: 'Fougère',   desc: 'Lavender · Oakmoss',         color: '#16a34a' },
];

const CONCENTRATIONS = [
  { id: 'edp',         label: 'Eau de Parfum',  desc: '15–20% · 6–8 hrs',  badge: 'EDP' },
  { id: 'edt',         label: 'Eau de Toilette', desc: '5–15% · 3–5 hrs',  badge: 'EDT' },
  { id: 'cologne',     label: 'Cologne',          desc: '2–5% · 2–3 hrs',   badge: 'EDC' },
  { id: 'body_mist',   label: 'Body Mist',        desc: '1–3% · 1–2 hrs',   badge: 'Mist'},
  { id: 'extrait',     label: 'Extrait',           desc: '20–40% · 12+ hrs', badge: 'Ext' },
];

const SEASONS = [
  { id: 'spring', emoji: '🌸', label: 'Spring' },
  { id: 'summer', emoji: '☀️', label: 'Summer' },
  { id: 'autumn', emoji: '🍂', label: 'Autumn' },
  { id: 'winter', emoji: '❄️', label: 'Winter' },
];

const OCCASIONS: { id: OccasionTag; emoji: string; label: string }[] = [
  { id: 'casual',     emoji: '😊', label: 'Casual'     },
  { id: 'date_night', emoji: '🌙', label: 'Date Night' },
  { id: 'office',     emoji: '💼', label: 'Office'     },
  { id: 'festive',    emoji: '🎉', label: 'Festive'    },
  { id: 'weekend',    emoji: '☀️', label: 'Weekend'    },
  { id: 'travel',     emoji: '✈️', label: 'Travel'     },
];

export interface FragranceSaveData {
  name: string;
  category: 'fragrance';
  grooming_type: string;
  color_hex: string;
  color_name: string;
  tags: OccasionTag[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: FragranceSaveData) => void;
}

export default function FragranceAddSheet({ open, onClose, onSave }: Props) {
  const [visible,       setVisible]       = useState(false);
  const [step,          setStep]          = useState(0);
  const [selScent,      setSelScent]      = useState<typeof SCENT_FAMILIES[0] | null>(null);
  const [selConc,       setSelConc]       = useState<typeof CONCENTRATIONS[0] | null>(null);
  const [selSeasons,    setSelSeasons]    = useState<string[]>([]);
  const [productName,   setProductName]   = useState('');
  const [tags,          setTags]          = useState<OccasionTag[]>([]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    } else {
      setVisible(false);
      const t = setTimeout(() => {
        setStep(0); setSelScent(null); setSelConc(null);
        setSelSeasons([]); setProductName(''); setTags([]);
      }, 380);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!open && !visible) return null;

  function handleSave() {
    if (!selScent || !selConc) return;
    onSave({
      name:          productName.trim() || `${selConc.badge} — ${selScent.label}`,
      category:      'fragrance',
      grooming_type: selConc.id,
      color_hex:     '#F5E6C8',
      color_name:    `${selScent.label} ${selConc.badge}`,
      tags,
    });
  }

  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, zIndex:300,
      background: visible ? 'rgba(10,8,20,0.55)' : 'rgba(10,8,20,0)',
      backdropFilter: visible ? 'blur(5px)' : 'none',
      WebkitBackdropFilter: visible ? 'blur(5px)' : 'none',
      transition:'background 0.35s ease',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        position:'absolute', bottom:0, left:0, right:0,
        borderRadius:'28px 28px 0 0', background:'#fff',
        transform: visible ? 'translateY(0)' : 'translateY(100%)',
        transition:'transform 0.38s cubic-bezier(0.32,0.72,0,1)',
        maxHeight:'92dvh', display:'flex', flexDirection:'column',
        paddingBottom:'env(safe-area-inset-bottom)',
      }}>
        {/* Handle */}
        <div style={{ display:'flex', justifyContent:'center', paddingTop:12, paddingBottom:4, flexShrink:0 }}>
          <div style={{ width:44, height:5, borderRadius:3, background:'rgba(0,0,0,0.13)' }} />
        </div>

        {/* Top bar */}
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 18px 12px', flexShrink:0, borderBottom:'1px solid rgba(0,0,0,0.06)' }}>
          <button onClick={() => step === 0 ? onClose() : setStep(s => s-1)}
            style={{ width:38, height:38, borderRadius:13, border:'none', background:'rgba(0,0,0,0.05)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <ChevronLeft size={18} style={{ color:'var(--foreground)' }} />
          </button>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:16, fontWeight:800, color:'var(--foreground)', letterSpacing:'-0.02em' }}>
              {step === 0 ? '🌸 Add Fragrance' : '🧴 Concentration & Details'}
            </div>
            <div style={{ display:'flex', gap:5, marginTop:5 }}>
              {['Scent Family','Details'].map((lbl,i) => (
                <div key={lbl} style={{ width: step===i ? 18 : 6, height:6, borderRadius:3, background: step>=i ? '#d97706' : 'rgba(0,0,0,0.12)', transition:'all 0.3s ease' }} />
              ))}
            </div>
          </div>
          <button onClick={onClose} style={{ width:38, height:38, borderRadius:13, border:'none', background:'rgba(0,0,0,0.05)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <X size={16} style={{ color:'var(--muted)' }} />
          </button>
        </div>

        {/* Step 0: Scent family */}
        {step === 0 && (
          <div style={{ flex:1, minHeight:0, overflowY:'auto', WebkitOverflowScrolling:'touch', padding:'0 18px 24px' }}>
            <p style={{ fontSize:13, color:'var(--muted)', marginBottom:14 }}>What scent family does it belong to?</p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {SCENT_FAMILIES.map(s => {
                const active = selScent?.id === s.id;
                return (
                  <button key={s.id} onClick={() => setSelScent(s)}
                    style={{
                      display:'flex', alignItems:'center', gap:12, padding:'14px 14px',
                      borderRadius:18, border: active ? `2px solid ${s.color}` : '1.5px solid rgba(0,0,0,0.08)',
                      background: active ? `${s.color}10` : 'rgba(0,0,0,0.02)',
                      cursor:'pointer', textAlign:'left', transition:'all 0.2s',
                    }}>
                    <span style={{ fontSize:26 }}>{s.emoji}</span>
                    <div>
                      <div style={{ fontSize:13, fontWeight:800, color: active ? s.color : 'var(--foreground)' }}>{s.label}</div>
                      <div style={{ fontSize:10, color:'var(--muted)', lineHeight:1.3 }}>{s.desc}</div>
                    </div>
                    {active && <Check size={14} style={{ color:s.color, marginLeft:'auto', flexShrink:0 }} strokeWidth={3} />}
                  </button>
                );
              })}
            </div>
            <button onClick={() => selScent && setStep(1)} disabled={!selScent}
              style={{ width:'100%', marginTop:20, padding:'16px', borderRadius:18, background: selScent ? 'linear-gradient(135deg, #d97706, #b45309)' : 'rgba(0,0,0,0.08)', color: selScent ? '#fff' : 'var(--muted)', fontSize:15, fontWeight:800, border:'none', cursor: selScent ? 'pointer' : 'default', letterSpacing:'-0.01em' }}>
              Next — Concentration →
            </button>
          </div>
        )}

        {/* Step 1: Concentration + details */}
        {step === 1 && (
          <div style={{ flex:1, minHeight:0, overflowY:'auto', WebkitOverflowScrolling:'touch', padding:'0 18px 24px' }}>
            {/* Scent preview chip */}
            {selScent && (
              <div style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'6px 12px', borderRadius:20, background:`${selScent.color}12`, border:`1px solid ${selScent.color}30`, marginBottom:16 }}>
                <span>{selScent.emoji}</span>
                <span style={{ fontSize:12, fontWeight:700, color:selScent.color }}>{selScent.label}</span>
                <button onClick={() => setStep(0)} style={{ fontSize:10, color:'var(--muted)', background:'none', border:'none', cursor:'pointer', padding:0 }}>Change</button>
              </div>
            )}

            {/* Concentration pills */}
            <label style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:9 }}>Concentration</label>
            <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:18 }}>
              {CONCENTRATIONS.map(c => {
                const active = selConc?.id === c.id;
                return (
                  <button key={c.id} onClick={() => setSelConc(c)}
                    style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderRadius:15, border: active ? '2px solid #d97706' : '1.5px solid rgba(0,0,0,0.08)', background: active ? 'rgba(217,119,6,0.08)' : 'transparent', cursor:'pointer', textAlign:'left', transition:'all 0.15s' }}>
                    <div style={{ width:38, height:38, borderRadius:12, background: active ? '#d97706' : 'rgba(0,0,0,0.06)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.15s' }}>
                      <span style={{ fontSize:11, fontWeight:800, color: active ? '#fff' : 'var(--muted)' }}>{c.badge}</span>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:700, color: active ? '#d97706' : 'var(--foreground)' }}>{c.label}</div>
                      <div style={{ fontSize:11, color:'var(--muted)' }}>{c.desc}</div>
                    </div>
                    {active && <Check size={14} style={{ color:'#d97706', flexShrink:0 }} strokeWidth={3} />}
                  </button>
                );
              })}
            </div>

            {/* Season chips */}
            <label style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:9 }}>Best season</label>
            <div style={{ display:'flex', gap:8, marginBottom:16 }}>
              {SEASONS.map(s => {
                const on = selSeasons.includes(s.id);
                return (
                  <button key={s.id} onClick={() => setSelSeasons(ss => on ? ss.filter(x => x !== s.id) : [...ss, s.id])}
                    style={{ flex:1, padding:'10px 4px', borderRadius:13, border: on ? '1.5px solid #d97706' : '1.5px solid rgba(0,0,0,0.08)', background: on ? 'rgba(217,119,6,0.09)' : 'transparent', cursor:'pointer', fontSize:11, fontWeight:700, color: on ? '#d97706' : 'var(--muted)', display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                    <span style={{ fontSize:18 }}>{s.emoji}</span>{s.label}
                  </button>
                );
              })}
            </div>

            {/* Product name */}
            <label style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:6 }}>Name (optional)</label>
            <input value={productName} onChange={e => setProductName(e.target.value)}
              placeholder="e.g. Chanel No.5 EDP 100ml"
              style={{ width:'100%', padding:'13px 14px', borderRadius:14, border:'1.5px solid rgba(0,0,0,0.10)', background:'var(--muted-bg)', fontSize:14, color:'var(--foreground)', outline:'none', fontFamily:'inherit', boxSizing:'border-box', marginBottom:14 }}
              onFocus={e => (e.target.style.borderColor = '#d97706')}
              onBlur={e => (e.target.style.borderColor = 'rgba(0,0,0,0.10)')}
            />

            {/* Occasions */}
            <label style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:9 }}>Occasions</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:20 }}>
              {OCCASIONS.map(({ id, emoji, label }) => {
                const on = tags.includes(id);
                return (
                  <button key={id} onClick={() => setTags(ts => on ? ts.filter(t => t!==id) : [...ts, id])}
                    style={{ display:'flex', alignItems:'center', gap:5, padding:'8px 12px', borderRadius:20, border: on ? '1.5px solid #d97706' : '1.5px solid rgba(0,0,0,0.10)', background: on ? 'rgba(217,119,6,0.09)' : 'var(--muted-bg)', color: on ? '#d97706' : 'var(--foreground)', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                    <span>{emoji}</span><span>{label}</span>
                  </button>
                );
              })}
            </div>

            <button onClick={handleSave} disabled={!selConc}
              style={{ width:'100%', padding:'17px', borderRadius:20, background: selConc ? 'linear-gradient(135deg, #d97706, #b45309)' : 'rgba(0,0,0,0.08)', color: selConc ? '#fff' : 'var(--muted)', fontSize:16, fontWeight:800, border:'none', cursor: selConc ? 'pointer' : 'default', boxShadow: selConc ? '0 6px 24px rgba(217,119,6,0.35)' : 'none', letterSpacing:'-0.02em' }}>
              ✓ Add to Wardrobe
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
