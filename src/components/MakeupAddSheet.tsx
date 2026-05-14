'use client';
import { useState, useEffect } from 'react';
import { X, ChevronLeft, Check } from 'lucide-react';
import type { OccasionTag } from '@/types';

// ─── Product types ────────────────────────────────────────────────────────────

type ShadeGroup = 'lips' | 'eyes' | 'cheeks' | 'skin' | 'none';

interface MakeupType {
  id: string; label: string; emoji: string; group: string; shadeGroup: ShadeGroup;
}

const MAKEUP_TYPES: MakeupType[] = [
  { id: 'lipstick',      label: 'Lipstick',       emoji: '💄', group: 'Lip',  shadeGroup: 'lips'  },
  { id: 'lip_gloss',     label: 'Lip Gloss',      emoji: '💋', group: 'Lip',  shadeGroup: 'lips'  },
  { id: 'lip_liner',     label: 'Lip Liner',      emoji: '✏️', group: 'Lip',  shadeGroup: 'lips'  },
  { id: 'lip_tint',      label: 'Lip Tint',       emoji: '🫦', group: 'Lip',  shadeGroup: 'lips'  },
  { id: 'foundation',    label: 'Foundation',     emoji: '🫧', group: 'Face', shadeGroup: 'skin'  },
  { id: 'concealer',     label: 'Concealer',      emoji: '🔆', group: 'Face', shadeGroup: 'skin'  },
  { id: 'blush',         label: 'Blush',          emoji: '🌸', group: 'Face', shadeGroup: 'cheeks'},
  { id: 'bronzer',       label: 'Bronzer',        emoji: '☀️', group: 'Face', shadeGroup: 'cheeks'},
  { id: 'highlighter',   label: 'Highlighter',    emoji: '✨', group: 'Face', shadeGroup: 'none'  },
  { id: 'primer',        label: 'Primer',         emoji: '🫥', group: 'Face', shadeGroup: 'none'  },
  { id: 'setting_spray', label: 'Setting Spray',  emoji: '💦', group: 'Face', shadeGroup: 'none'  },
  { id: 'eyeshadow',     label: 'Eyeshadow',      emoji: '👁️', group: 'Eye',  shadeGroup: 'eyes'  },
  { id: 'eyeliner',      label: 'Eyeliner',       emoji: '🖊️', group: 'Eye',  shadeGroup: 'eyes'  },
  { id: 'mascara',       label: 'Mascara',        emoji: '🪄', group: 'Eye',  shadeGroup: 'none'  },
  { id: 'brow_gel',      label: 'Brow Gel',       emoji: '🤌', group: 'Eye',  shadeGroup: 'none'  },
];

const GROUPS = ['Lip', 'Face', 'Eye'];

// ─── Shade palettes ───────────────────────────────────────────────────────────

const PALETTES: Record<Exclude<ShadeGroup, 'none'>, { hex: string; name: string }[]> = {
  lips: [
    { hex: '#D4A87A', name: 'Nude Beige'  }, { hex: '#C8857A', name: 'Dusty Rose'   },
    { hex: '#E87050', name: 'Coral Punch' }, { hex: '#8B3A62', name: 'Berry Rush'   },
    { hex: '#C42830', name: 'Classic Red' }, { hex: '#C4572A', name: 'Terracotta'   },
    { hex: '#A0688A', name: 'Mauve Mist'  }, { hex: '#6B2A5A', name: 'Deep Plum'   },
    { hex: '#E890A8', name: 'Baby Pink'   }, { hex: '#C89870', name: 'Warm Nude'    },
    { hex: '#722039', name: 'Wine Red'    }, { hex: '#C87890', name: 'Rose Gold'    },
    { hex: '#FF5A8A', name: 'Hot Pink'    }, { hex: '#D94060', name: 'Cherry Red'   },
    { hex: '#F0A0B0', name: 'Bubblegum'   }, { hex: '#7B2050', name: 'Dark Mulberry'},
  ],
  eyes: [
    { hex: '#C8B090', name: 'Warm Taupe'  }, { hex: '#4A5060', name: 'Smoky Slate'  },
    { hex: '#B87040', name: 'Bronze Glow' }, { hex: '#7B52A8', name: 'Amethyst'     },
    { hex: '#3A7840', name: 'Forest'      }, { hex: '#2A3A78', name: 'Midnight'     },
    { hex: '#C87890', name: 'Rose Gold'   }, { hex: '#E8D4A0', name: 'Champagne'    },
    { hex: '#B86040', name: 'Copper'      }, { hex: '#6B2A4A', name: 'Burgundy'     },
    { hex: '#1A2A6B', name: 'Navy'        }, { hex: '#1A1A1A', name: 'Matte Black'  },
    { hex: '#8B6040', name: 'Caramel'     }, { hex: '#D4A060', name: 'Golden'       },
    { hex: '#9080C0', name: 'Lavender'    }, { hex: '#50A060', name: 'Jade'         },
  ],
  cheeks: [
    { hex: '#F4A878', name: 'Peach Bloom' }, { hex: '#E87A8A', name: 'Rose Flush'   },
    { hex: '#C8804A', name: 'Sun Bronze'  }, { hex: '#D46888', name: 'Berry Blush'  },
    { hex: '#F4907A', name: 'Peachy Pink' }, { hex: '#D4986A', name: 'Natural Glow' },
    { hex: '#E8704A', name: 'Coral'       }, { hex: '#D4788A', name: 'Dusty Pink'   },
    { hex: '#F0C0A0', name: 'Apricot'     }, { hex: '#E89898', name: 'Strawberry'   },
    { hex: '#C06050', name: 'Terracotta'  }, { hex: '#F0B0C0', name: 'Soft Pink'    },
  ],
  skin: [
    { hex: '#F8E8D8', name: 'Porcelain'   }, { hex: '#F0D8C0', name: 'Ivory'        },
    { hex: '#E0C098', name: 'Natural'     }, { hex: '#D0A878', name: 'Sand'         },
    { hex: '#C09060', name: 'Warm Beige'  }, { hex: '#B07840', name: 'Honey'        },
    { hex: '#986030', name: 'Caramel'     }, { hex: '#784828', name: 'Cocoa'        },
    { hex: '#583018', name: 'Espresso'    }, { hex: '#481808', name: 'Mahogany'     },
    { hex: '#D8B090', name: 'Golden Sand' }, { hex: '#C8A070', name: 'Warm Tan'     },
  ],
};

const OCCASIONS: { id: OccasionTag; emoji: string; label: string }[] = [
  { id: 'casual',      emoji: '😊', label: 'Casual'      },
  { id: 'date_night',  emoji: '🌙', label: 'Date Night'  },
  { id: 'office',      emoji: '💼', label: 'Office'      },
  { id: 'festive',     emoji: '🎉', label: 'Festive'     },
  { id: 'weekend',     emoji: '☀️', label: 'Weekend'     },
  { id: 'travel',      emoji: '✈️', label: 'Travel'      },
  { id: 'gym',         emoji: '🏃', label: 'Gym'         },
];

// ─── Props ────────────────────────────────────────────────────────────────────

export interface MakeupSaveData {
  name: string;
  category: 'makeup';
  grooming_type: string;
  color_hex: string;
  color_name: string;
  tags: OccasionTag[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: MakeupSaveData) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MakeupAddSheet({ open, onClose, onSave }: Props) {
  const [visible,      setVisible]      = useState(false);
  const [step,         setStep]         = useState(0);
  const [selType,      setSelType]      = useState<MakeupType | null>(null);
  const [selHex,       setSelHex]       = useState('');
  const [shadeName,    setShadeName]    = useState('');
  const [customHex,    setCustomHex]    = useState('#C42830');
  const [useCustom,    setUseCustom]    = useState(false);
  const [productName,  setProductName]  = useState('');
  const [tags,         setTags]         = useState<OccasionTag[]>([]);

  // Open / close animation
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    } else {
      setVisible(false);
      const t = setTimeout(() => {
        document.body.style.overflow = '';
        setStep(0); setSelType(null); setSelHex(''); setShadeName('');
        setProductName(''); setTags([]); setUseCustom(false);
      }, 380);
      return () => clearTimeout(t);
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open && !visible) return null;

  // ── Helpers ────────────────────────────────────────────────────────────────

  const shadeGroup = selType?.shadeGroup;
  const palette    = shadeGroup && shadeGroup !== 'none' ? PALETTES[shadeGroup] : null;
  const needsShade = palette !== null;
  const totalSteps = needsShade ? 3 : 2;

  function pickType(t: MakeupType) {
    setSelType(t);
    // Pre-set first shade
    const pal = t.shadeGroup !== 'none' ? PALETTES[t.shadeGroup as Exclude<ShadeGroup,'none'>] : null;
    if (pal) { setSelHex(pal[0].hex); setShadeName(pal[0].name); }
    setStep(1);
  }

  function pickShade(hex: string, name: string) {
    setSelHex(hex); setShadeName(name); setUseCustom(false);
  }

  function handleSave() {
    if (!selType) return;
    const finalHex  = useCustom ? customHex : selHex;
    const finalName = useCustom ? 'Custom Shade' : shadeName;
    onSave({
      name:         productName.trim() || `${selType.label} — ${finalName || 'New'}`,
      category:     'makeup',
      grooming_type: selType.id,
      color_hex:    finalHex || '#C42830',
      color_name:   finalName || selType.label,
      tags,
    });
  }

  function back() {
    if (step === 0) { onClose(); return; }
    setStep(s => s - 1);
  }

  function next() {
    if (step === 1 && !needsShade) { setStep(2); return; }
    setStep(s => s + 1);
  }

  // ── Step labels ─────────────────────────────────────────────────────────────
  const stepLabels = needsShade
    ? ['Choose Type', 'Pick Shade', 'Details']
    : ['Choose Type', 'Details'];
  const displayStep = needsShade ? step : step === 2 ? 1 : step;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: visible ? 'rgba(10,8,20,0.55)' : 'rgba(10,8,20,0)',
        backdropFilter: visible ? 'blur(5px)' : 'none',
        WebkitBackdropFilter: visible ? 'blur(5px)' : 'none',
        transition: 'background 0.35s ease, backdrop-filter 0.35s ease',
      }}
    >
      {/* Sheet */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          borderRadius: '28px 28px 0 0',
          background: '#fff',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.38s cubic-bezier(0.32,0.72,0,1)',
          maxHeight: '92dvh',
          display: 'flex',
          flexDirection: 'column',
          paddingBottom: 'env(safe-area-inset-bottom)',
          overflow: 'hidden',
        }}
      >
        {/* Drag handle */}
        <div style={{ display:'flex', justifyContent:'center', paddingTop: 12, paddingBottom: 4, flexShrink: 0 }}>
          <div style={{ width: 44, height: 5, borderRadius: 3, background: 'rgba(0,0,0,0.13)' }} />
        </div>

        {/* Top bar */}
        <div style={{ display:'flex', alignItems:'center', gap: 10, padding: '8px 18px 12px', flexShrink: 0, borderBottom:'1px solid rgba(0,0,0,0.06)' }}>
          <button onClick={back} style={{ width:38, height:38, borderRadius:13, border:'none', background:'rgba(0,0,0,0.05)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <ChevronLeft size={18} style={{ color:'var(--foreground)' }} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--foreground)', letterSpacing: '-0.02em' }}>
              {step === 0 ? '💄 Add Makeup' : step === 1 && needsShade ? `Pick ${selType?.label} Shade` : `${selType?.emoji} ${selType?.label} Details`}
            </div>
            {/* Step dots */}
            <div style={{ display:'flex', gap: 5, marginTop: 5 }}>
              {stepLabels.map((lbl, i) => (
                <div key={lbl} style={{ display:'flex', alignItems:'center', gap: 4 }}>
                  <div style={{
                    width: displayStep === i ? 18 : 6, height: 6, borderRadius: 3,
                    background: displayStep >= i ? '#C42830' : 'rgba(0,0,0,0.12)',
                    transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
                  }} />
                </div>
              ))}
            </div>
          </div>
          <button onClick={onClose} style={{ width:38, height:38, borderRadius:13, border:'none', background:'rgba(0,0,0,0.05)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <X size={16} style={{ color:'var(--muted)' }} />
          </button>
        </div>

        {/* ── STEP 0: Product type ─────────────────────────────────────────────── */}
        {step === 0 && (
          <div style={{ flex:1, minHeight:0, overflowY:'auto', WebkitOverflowScrolling:'touch', padding:'0 18px 24px' }}>
            {GROUPS.map(group => {
              const types = MAKEUP_TYPES.filter(t => t.group === group);
              const groupColors: Record<string, string> = { Lip: '#C42830', Face: '#ec4899', Eye: '#7B52A8' };
              const gc = groupColors[group] ?? '#C42830';
              return (
                <div key={group} style={{ marginBottom: 22 }}>
                  <div style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 11 }}>
                    <div style={{ width: 3, height: 16, borderRadius: 2, background: gc }} />
                    <span style={{ fontSize: 12, fontWeight: 800, color: gc, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{group}</span>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 9 }}>
                    {types.map(t => (
                      <button key={t.id} onClick={() => pickType(t)} style={{
                        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap: 5,
                        padding:'12px 6px', borderRadius: 18, border:'1.5px solid rgba(0,0,0,0.08)',
                        background:'rgba(0,0,0,0.02)', cursor:'pointer',
                        transition:'all 0.18s cubic-bezier(0.34,1.56,0.64,1)',
                      }}
                        onTouchStart={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.93)'; }}
                        onTouchEnd={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; }}
                      >
                        <span style={{ fontSize: 26 }}>{t.emoji}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color:'var(--foreground)', textAlign:'center', lineHeight: 1.2 }}>{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── STEP 1: Shade picker ─────────────────────────────────────────────── */}
        {step === 1 && needsShade && palette && (
          <div style={{ flex:1, minHeight:0, overflowY:'auto', WebkitOverflowScrolling:'touch', padding:'0 18px 24px' }}>
            {/* Selected preview */}
            <div style={{ display:'flex', alignItems:'center', gap: 14, padding:'14px 16px', borderRadius: 20, background:'rgba(0,0,0,0.03)', marginBottom: 18, border:'1px solid rgba(0,0,0,0.06)' }}>
              <div style={{ width: 56, height: 56, borderRadius: 18, background: useCustom ? customHex : selHex, flexShrink: 0, boxShadow:'0 4px 16px rgba(0,0,0,0.20)' }} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color:'var(--foreground)' }}>{useCustom ? 'Custom Shade' : shadeName}</div>
                <div style={{ fontSize: 13, color:'var(--muted)', fontFamily:'monospace', marginTop: 2 }}>{useCustom ? customHex : selHex}</div>
              </div>
            </div>

            {/* Swatch grid */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(6, 1fr)', gap: 10, marginBottom: 18 }}>
              {palette.map(({ hex, name }) => {
                const active = !useCustom && selHex === hex;
                return (
                  <button key={hex} onClick={() => pickShade(hex, name)}
                    className="cbm-swatch" data-cn={name}
                    style={{
                      width:'100%', aspectRatio:'1', borderRadius:'50%',
                      background: hex, border:'none', cursor:'pointer',
                      position:'relative',
                      outline: active ? `3px solid ${hex}` : 'none',
                      outlineOffset: active ? 3 : 0,
                      transform: active ? 'scale(1.15)' : 'scale(1)',
                      transition:'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                      boxShadow: active ? `0 4px 16px ${hex}60` : '0 2px 6px rgba(0,0,0,0.18)',
                    }}>
                    {active && (
                      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <Check size={13} style={{ color: parseInt(hex.slice(1,3),16) > 180 ? '#333' : '#fff', strokeWidth: 3 }} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Custom colour */}
            <div style={{ padding:'12px 14px', borderRadius: 16, border:'1.5px dashed rgba(0,0,0,0.13)', display:'flex', alignItems:'center', gap: 12 }}>
              <input type="color" value={customHex}
                onChange={e => { setCustomHex(e.target.value); setUseCustom(true); }}
                style={{ width: 44, height: 44, borderRadius: 12, border:'none', padding: 3, cursor:'pointer', flexShrink:0, background:'none' }}
              />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color:'var(--foreground)' }}>Custom colour</div>
                <div style={{ fontSize: 11, color:'var(--muted)' }}>Tap the swatch to pick any shade</div>
              </div>
              <button onClick={() => setUseCustom(true)}
                style={{ padding:'6px 12px', borderRadius:10, border:`1.5px solid ${useCustom ? customHex : 'rgba(0,0,0,0.12)'}`, background: useCustom ? `${customHex}18` : 'transparent', fontSize:12, fontWeight:700, color: useCustom ? customHex : 'var(--muted)', cursor:'pointer' }}>
                {useCustom ? '✓ Using' : 'Use'}
              </button>
            </div>

            {/* Shade name input */}
            <div style={{ marginTop: 14 }}>
              <label style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:6 }}>Shade name</label>
              <input
                value={shadeName}
                onChange={e => setShadeName(e.target.value)}
                placeholder={`e.g. ${palette[0]?.name ?? 'Classic Red'}`}
                style={{ width:'100%', padding:'12px 14px', borderRadius:14, border:'1.5px solid rgba(0,0,0,0.10)', background:'var(--muted-bg)', fontSize:14, color:'var(--foreground)', outline:'none', fontFamily:'inherit', boxSizing:'border-box' }}
              />
            </div>

            {/* Next */}
            <button onClick={next}
              style={{ width:'100%', marginTop:18, padding:'16px', borderRadius:18, background:'linear-gradient(135deg, #C42830, #8B2040)', color:'#fff', fontSize:15, fontWeight:800, border:'none', cursor:'pointer', letterSpacing:'-0.01em' }}>
              Next — Details →
            </button>
          </div>
        )}

        {/* ── STEP 1 (no shade) / STEP 2: Details ──────────────────────────────── */}
        {((step === 1 && !needsShade) || step === 2) && (
          <div style={{ flex:1, minHeight:0, overflowY:'auto', WebkitOverflowScrolling:'touch', padding:'0 18px 24px' }}>
            {/* Selected shade preview (if has shade) */}
            {needsShade && selHex && (
              <div style={{ display:'flex', alignItems:'center', gap: 12, padding:'10px 14px', borderRadius:16, background:'rgba(0,0,0,0.03)', marginBottom:16, border:'1px solid rgba(0,0,0,0.06)' }}>
                <div style={{ width:36, height:36, borderRadius:12, background: useCustom ? customHex : selHex, flexShrink:0, boxShadow:'0 2px 8px rgba(0,0,0,0.18)' }} />
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--foreground)' }}>{shadeName || 'Custom Shade'}</div>
                  <button onClick={() => setStep(1)} style={{ fontSize:11, color:'#C42830', fontWeight:600, background:'none', border:'none', cursor:'pointer', padding:0 }}>Change shade</button>
                </div>
              </div>
            )}

            {/* Product name */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:6 }}>Product name</label>
              <input
                value={productName}
                onChange={e => setProductName(e.target.value)}
                placeholder={`e.g. MAC ${selType?.label ?? 'Lipstick'} in ${shadeName || 'Ruby Woo'}`}
                style={{ width:'100%', padding:'13px 14px', borderRadius:14, border:'1.5px solid rgba(0,0,0,0.10)', background:'var(--muted-bg)', fontSize:14, color:'var(--foreground)', outline:'none', fontFamily:'inherit', boxSizing:'border-box' }}
                onFocus={e => (e.target.style.borderColor = '#C42830')}
                onBlur={e => (e.target.style.borderColor = 'rgba(0,0,0,0.10)')}
              />
            </div>

            {/* Occasions */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:9 }}>Occasions</label>
              <div style={{ display:'flex', flexWrap:'wrap', gap: 8 }}>
                {OCCASIONS.map(({ id, emoji, label }) => {
                  const on = tags.includes(id);
                  return (
                    <button key={id} onClick={() => setTags(ts => on ? ts.filter(t => t !== id) : [...ts, id])}
                      style={{
                        display:'flex', alignItems:'center', gap: 6, padding:'9px 14px', borderRadius:20,
                        border: on ? '1.5px solid #C42830' : '1.5px solid rgba(0,0,0,0.10)',
                        background: on ? 'rgba(196,40,48,0.09)' : 'var(--muted-bg)',
                        color: on ? '#C42830' : 'var(--foreground)',
                        fontSize: 13, fontWeight: 600, cursor:'pointer', transition:'all 0.15s',
                      }}>
                      <span>{emoji}</span><span>{label}</span>
                      {on && <Check size={11} strokeWidth={3} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Save */}
            <button onClick={handleSave}
              style={{
                width:'100%', padding:'17px', borderRadius:20,
                background:'linear-gradient(135deg, #C42830 0%, #8B2040 100%)',
                color:'#fff', fontSize:16, fontWeight:800, border:'none', cursor:'pointer',
                boxShadow:'0 6px 24px rgba(196,40,48,0.38), inset 0 1px 0 rgba(255,255,255,0.15)',
                letterSpacing:'-0.02em',
              }}>
              ✓ Add to Wardrobe
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
