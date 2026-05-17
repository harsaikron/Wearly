'use client';
import { useState, useEffect } from 'react';
import { X, ChevronLeft, Check } from 'lucide-react';
import type { OccasionTag } from '@/types';

const GROOMING_TYPES = [
  { id: 'face_wash',    emoji: '🧖', label: 'Face Wash',      group: 'Face', color: '#3b82f6' },
  { id: 'moisturiser',  emoji: '💧', label: 'Moisturiser',    group: 'Face', color: '#3b82f6' },
  { id: 'sunscreen',    emoji: '☀️', label: 'Sunscreen / SPF', group: 'Face', color: '#3b82f6' },
  { id: 'serum',        emoji: '💎', label: 'Serum',           group: 'Face', color: '#3b82f6' },
  { id: 'toner',        emoji: '🫧', label: 'Toner',           group: 'Face', color: '#3b82f6' },
  { id: 'eye_cream',    emoji: '👁️', label: 'Eye Cream',       group: 'Face', color: '#3b82f6' },
  { id: 'hair_gel',     emoji: '💇', label: 'Hair Wax / Gel',  group: 'Hair', color: '#8b5cf6' },
  { id: 'hair_serum',   emoji: '✨', label: 'Hair Serum',      group: 'Hair', color: '#8b5cf6' },
  { id: 'dry_shampoo',  emoji: '🌬️', label: 'Dry Shampoo',    group: 'Hair', color: '#8b5cf6' },
  { id: 'shaving',      emoji: '🪒', label: 'Shaving Product', group: 'Body', color: '#10b981' },
  { id: 'deodorant',    emoji: '🌿', label: 'Deodorant',       group: 'Body', color: '#10b981' },
  { id: 'body_lotion',  emoji: '🛁', label: 'Body Lotion',     group: 'Body', color: '#10b981' },
  { id: 'body_wash',    emoji: '🚿', label: 'Body Wash',       group: 'Body', color: '#10b981' },
  { id: 'lip_balm',     emoji: '💋', label: 'Lip Balm',        group: 'Body', color: '#10b981' },
];

const GROUPS = ['Face', 'Hair', 'Body'];

const OCCASIONS: { id: OccasionTag; emoji: string; label: string }[] = [
  { id: 'casual',     emoji: '😊', label: 'Daily'      },
  { id: 'gym',        emoji: '🏃', label: 'Gym'        },
  { id: 'travel',     emoji: '✈️', label: 'Travel'     },
  { id: 'weekend',    emoji: '☀️', label: 'Weekend'    },
  { id: 'office',     emoji: '💼', label: 'Office'     },
];

export interface GroomingSaveData {
  name: string;
  category: 'grooming' | 'skincare';
  grooming_type: string;
  color_hex: string;
  color_name: string;
  tags: OccasionTag[];
  spf?: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: GroomingSaveData) => void;
}

export default function GroomingAddSheet({ open, onClose, onSave }: Props) {
  const [visible,      setVisible]      = useState(false);
  const [step,         setStep]         = useState(0);
  const [selType,      setSelType]      = useState<typeof GROOMING_TYPES[0] | null>(null);
  const [productName,  setProductName]  = useState('');
  const [spf,          setSpf]          = useState('');
  const [tags,         setTags]         = useState<OccasionTag[]>([]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    } else {
      setVisible(false);
      const t = setTimeout(() => {
        setStep(0); setSelType(null); setProductName(''); setSpf(''); setTags([]);
      }, 380);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!open && !visible) return null;

  function handleSave() {
    if (!selType) return;
    const data: GroomingSaveData = {
      name:          productName.trim() || selType.label,
      category:      ['face_wash','moisturiser','sunscreen','serum','toner','eye_cream'].includes(selType.id) ? 'skincare' : 'grooming',
      grooming_type: selType.id,
      color_hex:     '#E8F4F0',
      color_name:    selType.label,
      tags,
    };
    if (selType.id === 'sunscreen' && spf) data.spf = parseInt(spf, 10);
    onSave(data);
  }

  const groupColor: Record<string, string> = { Face: '#3b82f6', Hair: '#8b5cf6', Body: '#10b981' };

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
              {step === 0 ? '🧴 Add Grooming' : `${selType?.emoji} ${selType?.label}`}
            </div>
            <div style={{ display:'flex', gap:5, marginTop:5 }}>
              {['Product Type','Details'].map((lbl,i) => (
                <div key={lbl} style={{ width: step===i ? 18 : 6, height:6, borderRadius:3, background: step>=i ? '#10b981' : 'rgba(0,0,0,0.12)', transition:'all 0.3s ease' }} />
              ))}
            </div>
          </div>
          <button onClick={onClose} style={{ width:38, height:38, borderRadius:13, border:'none', background:'rgba(0,0,0,0.05)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <X size={16} style={{ color:'var(--muted)' }} />
          </button>
        </div>

        {/* Step 0: Product type */}
        {step === 0 && (
          <div style={{ flex:1, minHeight:0, overflowY:'auto', WebkitOverflowScrolling:'touch', padding:'0 18px 24px' }}>
            {GROUPS.map(group => {
              const gc = groupColor[group] ?? '#10b981';
              return (
                <div key={group} style={{ marginBottom:20 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                    <div style={{ width:3, height:16, borderRadius:2, background:gc }} />
                    <span style={{ fontSize:11, fontWeight:800, color:gc, textTransform:'uppercase', letterSpacing:'0.07em' }}>{group}</span>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {GROOMING_TYPES.filter(t => t.group === group).map(t => {
                      const active = selType?.id === t.id;
                      return (
                        <button key={t.id} onClick={() => { setSelType(t); setStep(1); }}
                          style={{ display:'flex', alignItems:'center', gap:13, padding:'13px 14px', borderRadius:16, border: active ? `2px solid ${gc}` : '1.5px solid rgba(0,0,0,0.08)', background: active ? `${gc}10` : 'rgba(0,0,0,0.02)', cursor:'pointer', textAlign:'left', transition:'all 0.18s' }}>
                          <span style={{ fontSize:22 }}>{t.emoji}</span>
                          <span style={{ fontSize:14, fontWeight:700, color: active ? gc : 'var(--foreground)', flex:1 }}>{t.label}</span>
                          <div style={{ width:8, height:8, borderRadius:'50%', background: active ? gc : 'rgba(0,0,0,0.12)', transition:'all 0.2s' }} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Step 1: Details */}
        {step === 1 && selType && (
          <div style={{ flex:1, minHeight:0, overflowY:'auto', WebkitOverflowScrolling:'touch', padding:'0 18px 24px' }}>
            {/* Selected type badge */}
            <div style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'6px 12px', borderRadius:20, background:`${selType.color}12`, border:`1px solid ${selType.color}30`, marginBottom:16 }}>
              <span>{selType.emoji}</span>
              <span style={{ fontSize:12, fontWeight:700, color:selType.color }}>{selType.label}</span>
              <button onClick={() => setStep(0)} style={{ fontSize:10, color:'var(--muted)', background:'none', border:'none', cursor:'pointer', padding:0 }}>Change</button>
            </div>

            {/* SPF field for sunscreen */}
            {selType.id === 'sunscreen' && (
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:6 }}>SPF Value</label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:8 }}>
                  {['15','30','50','50+'].map(v => (
                    <button key={v} onClick={() => setSpf(v)}
                      style={{ padding:'10px 18px', borderRadius:13, border: spf===v ? `2px solid ${selType.color}` : '1.5px solid rgba(0,0,0,0.10)', background: spf===v ? `${selType.color}12` : 'var(--muted-bg)', fontSize:14, fontWeight:700, color: spf===v ? selType.color : 'var(--foreground)', cursor:'pointer' }}>
                      SPF {v}
                    </button>
                  ))}
                </div>
                <input type="number" value={spf} onChange={e => setSpf(e.target.value)} placeholder="Custom SPF value"
                  style={{ width:'100%', padding:'12px 14px', borderRadius:14, border:'1.5px solid rgba(0,0,0,0.10)', background:'var(--muted-bg)', fontSize:14, color:'var(--foreground)', outline:'none', fontFamily:'inherit', boxSizing:'border-box' }}
                  onFocus={e => (e.target.style.borderColor = selType.color)}
                  onBlur={e => (e.target.style.borderColor = 'rgba(0,0,0,0.10)')}
                />
              </div>
            )}

            {/* Product name */}
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:6 }}>Product name</label>
              <input value={productName} onChange={e => setProductName(e.target.value)}
                placeholder={`e.g. CeraVe ${selType.label}`}
                style={{ width:'100%', padding:'13px 14px', borderRadius:14, border:'1.5px solid rgba(0,0,0,0.10)', background:'var(--muted-bg)', fontSize:14, color:'var(--foreground)', outline:'none', fontFamily:'inherit', boxSizing:'border-box' }}
                onFocus={e => (e.target.style.borderColor = selType.color)}
                onBlur={e => (e.target.style.borderColor = 'rgba(0,0,0,0.10)')}
              />
            </div>

            {/* Occasions */}
            <label style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:9 }}>When do you use it?</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:22 }}>
              {OCCASIONS.map(({ id, emoji, label }) => {
                const on = tags.includes(id);
                return (
                  <button key={id} onClick={() => setTags(ts => on ? ts.filter(t => t!==id) : [...ts, id])}
                    style={{ display:'flex', alignItems:'center', gap:5, padding:'9px 13px', borderRadius:20, border: on ? `1.5px solid ${selType.color}` : '1.5px solid rgba(0,0,0,0.10)', background: on ? `${selType.color}10` : 'var(--muted-bg)', color: on ? selType.color : 'var(--foreground)', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                    <span>{emoji}</span><span>{label}</span>
                    {on && <Check size={10} strokeWidth={3} />}
                  </button>
                );
              })}
            </div>

            <button onClick={handleSave}
              style={{ width:'100%', padding:'17px', borderRadius:20, background:`linear-gradient(135deg, ${selType.color}, ${selType.color}CC)`, color:'#fff', fontSize:16, fontWeight:800, border:'none', cursor:'pointer', boxShadow:`0 6px 24px ${selType.color}40`, letterSpacing:'-0.02em' }}>
              ✓ Add to Wardrobe
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
