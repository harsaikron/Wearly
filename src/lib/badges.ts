/**
 * Colorful badge system — Alma-inspired vibrant tag colors
 * Each occasion / category / status gets its own unique color.
 * Import and use these inline styles or the CSS class names.
 */

// ── Occasion badge styles ────────────────────────────────────────
export const OCCASION_BADGE: Record<string, { bg: string; color: string; border: string }> = {
  office:       { bg: '#E8EDF5', color: '#2563EB', border: '#BFCFE8' },
  casual:       { bg: '#FEF3E8', color: '#C2570A', border: '#F8D5B0' },
  date_night:   { bg: '#FDE8F3', color: '#BE185D', border: '#F5BCD9' },
  weekend:      { bg: '#FFFBDE', color: '#A16207', border: '#EFE09A' },
  smart_casual: { bg: '#E8F5E9', color: '#2C4A1E', border: '#B6D9B5' },
  minimal:      { bg: '#F0ECFB', color: '#6D28D9', border: '#D5C8F6' },
  luxury:       { bg: '#FDF3E3', color: '#92400E', border: '#EDD5A3' },
  travel:       { bg: '#E0F7FA', color: '#0E7490', border: '#A5DCE8' },
  festive:      { bg: '#FEE8E8', color: '#B91C1C', border: '#FACACA' },
  gym:          { bg: '#ECFDE9', color: '#166534', border: '#A3D9A0' },
};

// ── Category badge styles ────────────────────────────────────────
export const CATEGORY_BADGE: Record<string, { bg: string; color: string; border: string }> = {
  shirt:        { bg: '#E8F0FE', color: '#1D4ED8', border: '#BFCEFC' },
  formal_shirt: { bg: '#1E3A5F', color: '#E2EEF9', border: '#2D5A8A' },
  tshirt:       { bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0' },
  pants:        { bg: '#FDF4E3', color: '#854D0E', border: '#EED5A3' },
  jeans:        { bg: '#E0E9F7', color: '#1560BD', border: '#A8BDE8' },
  shorts:       { bg: '#FFFDE7', color: '#B45309', border: '#FDE68A' },
  shoes:        { bg: '#F3EDE8', color: '#78350F', border: '#D9BEAB' },
  sneakers:     { bg: '#F5F5F5', color: '#374151', border: '#D1D5DB' },
  loafers:      { bg: '#FAF0E6', color: '#7C4A1E', border: '#E8C9A8' },
  jacket:       { bg: '#E8F3EE', color: '#2C4A1E', border: '#B0D4BC' },
  watch:        { bg: '#FEF9E7', color: '#92400E', border: '#EDCF7A' },
  belt:         { bg: '#F1EBE4', color: '#5C3D1E', border: '#D4BAA4' },
  accessory:    { bg: '#F5ECF9', color: '#6B21A8', border: '#DDB8F0' },
};

// ── Fallback for unknown keys ────────────────────────────────────
const FALLBACK = { bg: '#F2EDE6', color: '#4A4A45', border: '#D0C8BE' };

export function occasionBadgeStyle(occasion: string) {
  return OCCASION_BADGE[occasion] ?? FALLBACK;
}

export function categoryBadgeStyle(category: string) {
  return CATEGORY_BADGE[category] ?? FALLBACK;
}

/**
 * Returns React inline style object for a tag
 * Usage: <span style={badgeInlineStyle('office')}>office</span>
 */
export function badgeInlineStyle(key: string, type: 'occasion' | 'category' = 'occasion') {
  const s = type === 'category' ? categoryBadgeStyle(key) : occasionBadgeStyle(key);
  return {
    background: s.bg,
    color: s.color,
    border: `1.5px solid ${s.border}`,
    borderRadius: '999px',
    padding: '4px 12px',
    fontSize: '12px',
    fontWeight: 600 as const,
    display: 'inline-flex' as const,
    alignItems: 'center' as const,
    whiteSpace: 'nowrap' as const,
    letterSpacing: '0.01em',
  };
}

/**
 * Large badge variant
 */
export function badgeLgInlineStyle(key: string, type: 'occasion' | 'category' = 'occasion') {
  return {
    ...badgeInlineStyle(key, type),
    padding: '7px 18px',
    fontSize: '14px',
  };
}
