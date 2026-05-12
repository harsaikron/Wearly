export interface SGEvent {
  name: string;
  emoji: string;
  date: string;           // YYYY-MM-DD
  type: 'holiday' | 'festive' | 'cultural' | 'national' | 'social';
  outfit_tip: string;
  colors: string[];       // hex codes
  color_names: string[];
  dress_code: string;
}

// Singapore 2026 public holidays + major cultural/social events
export const SG_EVENTS_2026: SGEvent[] = [
  {
    name: 'Chinese New Year', emoji: '🧧',
    date: '2026-02-17',
    type: 'festive',
    outfit_tip: 'Wear red, gold or auspicious colours. Avoid black and white. Traditional Mandarin collars are on-trend.',
    colors: ['#D72638', '#C9A84C', '#F4D03F'],
    color_names: ['Crimson Red', 'Gold', 'Imperial Yellow'],
    dress_code: 'Smart casual to traditional',
  },
  {
    name: 'Valentine\'s Day', emoji: '❤️',
    date: '2026-02-14',
    type: 'social',
    outfit_tip: 'Classic date-night look: navy blazer, white shirt, slim trousers. Add a burgundy pocket square.',
    colors: ['#722F37', '#1B3A6B', '#FFFFFF'],
    color_names: ['Burgundy', 'Navy', 'White'],
    dress_code: 'Smart casual to formal',
  },
  {
    name: 'Hari Raya Puasa', emoji: '🌙',
    date: '2026-03-20',
    type: 'festive',
    outfit_tip: 'Baju Melayu in earth tones or pastels. Songket fabric adds a luxurious touch for visiting.',
    colors: ['#8B9B6A', '#C4A882', '#E8D5B7'],
    color_names: ['Sage Green', 'Warm Taupe', 'Sand'],
    dress_code: 'Traditional Malay or smart casual',
  },
  {
    name: 'Good Friday', emoji: '✝️',
    date: '2026-04-03',
    type: 'holiday',
    outfit_tip: 'Understated, modest dressing. Muted tones and minimal accessories.',
    colors: ['#5D6D7E', '#7F8C8D', '#BDC3C7'],
    color_names: ['Slate', 'Warm Grey', 'Silver'],
    dress_code: 'Smart casual, modest',
  },
  {
    name: 'Labour Day', emoji: '⚒️',
    date: '2026-05-01',
    type: 'holiday',
    outfit_tip: 'Casual Friday energy all day. Chinos and a relaxed linen shirt work perfectly.',
    colors: ['#2196F3', '#FFFFFF', '#F5F5F5'],
    color_names: ['Cool Blue', 'White', 'Off-White'],
    dress_code: 'Casual',
  },
  {
    name: 'Vesak Day', emoji: '☸️',
    date: '2026-05-12',
    type: 'cultural',
    outfit_tip: 'Muted, respectful tones. White is considered auspicious. Avoid overly flashy attire.',
    colors: ['#FFFFFF', '#F5CBA7', '#FDEBD0'],
    color_names: ['White', 'Saffron', 'Cream'],
    dress_code: 'Modest and respectful',
  },
  {
    name: 'Hari Raya Haji', emoji: '🐑',
    date: '2026-05-27',
    type: 'festive',
    outfit_tip: 'Similar to Hari Raya Puasa — Baju Melayu with kopiah. Deep greens and whites are traditional.',
    colors: ['#1A5276', '#145A32', '#FFFFFF'],
    color_names: ['Deep Blue', 'Forest Green', 'White'],
    dress_code: 'Traditional Malay or smart casual',
  },
  {
    name: 'Singapore National Day', emoji: '🇸🇬',
    date: '2026-08-09',
    type: 'national',
    outfit_tip: 'Red and white — Singapore\'s colours. Wear a red polo, white chinos or traditional dress.',
    colors: ['#EF3340', '#FFFFFF'],
    color_names: ['Singapore Red', 'White'],
    dress_code: 'Patriotic — red and/or white',
  },
  {
    name: 'Mid-Autumn Festival', emoji: '🥮',
    date: '2026-09-25',
    type: 'cultural',
    outfit_tip: 'Soft autumn tones — warm orange, jade green, cream. Light layers for the cooler evening.',
    colors: ['#E67E22', '#1ABC9C', '#F9E4B7'],
    color_names: ['Harvest Orange', 'Jade Green', 'Moonlight Cream'],
    dress_code: 'Smart casual, festive colours',
  },
  {
    name: 'Deepavali', emoji: '🪔',
    date: '2026-10-28',
    type: 'festive',
    outfit_tip: 'Vibrant jewel tones — royal purple, sapphire blue, emerald green. Gold accessories welcome.',
    colors: ['#6C3483', '#1A5276', '#1E8449'],
    color_names: ['Royal Purple', 'Sapphire', 'Emerald'],
    dress_code: 'Traditional Indian or smart casual with jewel tones',
  },
  {
    name: 'Christmas', emoji: '🎄',
    date: '2026-12-25',
    type: 'festive',
    outfit_tip: 'Classic Christmas palette — burgundy, forest green, navy. Light layers for Orchard Road lights.',
    colors: ['#922B21', '#1E8449', '#1B2631'],
    color_names: ['Christmas Red', 'Forest Green', 'Midnight Navy'],
    dress_code: 'Smart casual to festive',
  },
  {
    name: 'New Year\'s Eve', emoji: '🎆',
    date: '2026-12-31',
    type: 'social',
    outfit_tip: 'Dress to impress — metallic accents, deep navy or black with a statement piece. Rooftop bar ready.',
    colors: ['#212F3D', '#C0392B', '#D4AC0D'],
    color_names: ['Midnight Black', 'Deep Red', 'Champagne Gold'],
    dress_code: 'Smart to formal, festive',
  },
];

export function getUpcomingEvents(count = 3): (SGEvent & { daysAway: number })[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return SG_EVENTS_2026
    .map((e) => {
      const d = new Date(e.date);
      const diff = Math.ceil((d.getTime() - today.getTime()) / 86400000);
      return { ...e, daysAway: diff };
    })
    .filter((e) => e.daysAway >= 0)
    .sort((a, b) => a.daysAway - b.daysAway)
    .slice(0, count);
}

export function getCurrentSeasonContext(): { season: string; tip: string; trending: string[] } {
  const month = new Date().getMonth() + 1;
  // Singapore is tropical year-round but has cultural seasons
  if (month === 12 || month <= 2) {
    return {
      season: 'Festive Season',
      tip: 'Year-end celebrations and CNY prep. Rich jewel tones and festive colours are trending.',
      trending: ['Mandarin collar shirts', 'Rich burgundy tones', 'Statement gold accessories', 'Slim-fit cheongsam-inspired cuts'],
    };
  }
  if (month >= 3 && month <= 5) {
    return {
      season: 'Mid-Year Transition',
      tip: 'Multiple festivities — Hari Raya, Vesak, Labour Day. Versatile smart-casual dominates.',
      trending: ['Linen shirts in earth tones', 'Slim Baju Melayu cuts', 'White sneakers', 'Oversized blazers'],
    };
  }
  if (month >= 6 && month <= 8) {
    return {
      season: 'National Day Season',
      tip: 'Summer energy and national pride. Comfortable, breathable fabrics in bold colours.',
      trending: ['Red polo shirts', 'White linen trousers', 'Batik-inspired prints', 'Lightweight co-ords'],
    };
  }
  return {
    season: 'Q4 Festival Season',
    tip: 'Mid-Autumn to Deepavali and Christmas prep. Rich cultural colours with modern silhouettes.',
    trending: ['Jewel-tone shirts', 'Wide-leg trousers', 'Embroidered details', 'Smart kurtas'],
  };
}

export function getSocialTrends(): string[] {
  const month = new Date().getMonth() + 1;
  // Rotate social media trends by quarter
  const base = [
    'Quiet luxury / old money aesthetic',
    'Oversized linen co-ords',
    'Minimalist monochrome outfits',
    'Clean-fit sneakers with tailored trousers',
  ];
  const seasonal: Record<number, string[]> = {
    1: ['CNY red fits', 'Mandarin collar revival'],
    2: ['Date night navy', 'Valentine burgundy'],
    3: ['Hari Raya earth tones', 'Flowy linen'],
    4: ['Spring pastels', 'Lightweight layers'],
    5: ['Linen season starts', 'Workwear refresh'],
    6: ['Breathable co-ords', 'Vacation-ready whites'],
    7: ['Resort wear', 'Tropical prints'],
    8: ['National Day red/white', 'Singapore streetwear'],
    9: ['Mid-Autumn warm tones', 'Smart-casual evening'],
    10: ['Deepavali jewel tones', 'Festive kurtas'],
    11: ['Year-end smart dressing', 'Dark sophisticated tones'],
    12: ['Christmas party fits', 'NYE metallic accents'],
  };
  return [...base, ...(seasonal[month] ?? [])].slice(0, 6);
}
