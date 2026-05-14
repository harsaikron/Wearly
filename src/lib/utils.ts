import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : null;
}

export function getContrastColor(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#000000';
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function getSeasonFromMonth(month: number): string {
  if (month >= 3 && month <= 5) return 'Spring';
  if (month >= 6 && month <= 8) return 'Summer';
  if (month >= 9 && month <= 11) return 'Autumn';
  return 'Winter';
}

export function getCurrentSeason(): string {
  return getSeasonFromMonth(new Date().getMonth() + 1);
}

export function getWeatherConditionLabel(condition: string): string {
  const map: Record<string, string> = {
    hot: 'Hot & Sunny',
    warm: 'Warm',
    mild: 'Mild',
    cool: 'Cool',
    cold: 'Cold',
    rainy: 'Rainy',
    windy: 'Windy',
    cloudy: 'Cloudy',
  };
  return map[condition] ?? condition;
}

export function occasionLabel(occasion: string): string {
  const map: Record<string, string> = {
    office: 'Office',
    casual: 'Casual',
    date_night: 'Date Night',
    weekend: 'Weekend',
    smart_casual: 'Smart Casual',
    minimal: 'Minimal',
    luxury: 'Luxury',
    travel: 'Travel',
    festive: 'Festive',
    gym: 'Gym',
  };
  return map[occasion] ?? occasion;
}

export function categoryLabel(cat: string): string {
  const map: Record<string, string> = {
    shirt: 'Shirt',
    pants: 'Pants',
    jeans: 'Jeans',
    shoes: 'Shoes',
    watch: 'Watch',
    belt: 'Belt',
    jacket: 'Jacket',
    tshirt: 'T-Shirt',
    shorts: 'Shorts',
    formal_shirt: 'Formal Shirt',
    sneakers: 'Sneakers',
    loafers: 'Loafers',
    accessory: 'Accessory',
    // accessories
    chain: 'Chain / Necklace',
    bracelet: 'Bracelet',
    earring: 'Earring',
    sunglasses: 'Sunglasses',
    ring: 'Ring',
    bag: 'Bag',
    // grooming
    skincare: 'Skincare',
    fragrance: 'Fragrance',
    grooming: 'Grooming',
    makeup: 'Makeup',
  };
  return map[cat] ?? cat;
}

export function isGroomingCategory(cat: string): boolean {
  return ['skincare', 'fragrance', 'grooming', 'makeup'].includes(cat);
}

export function isAccessoryCategory(cat: string): boolean {
  return ['watch', 'belt', 'chain', 'bracelet', 'earring', 'sunglasses', 'ring', 'bag', 'accessory'].includes(cat);
}

export function isClothingCategory(cat: string): boolean {
  return ['shirt', 'pants', 'jeans', 'shoes', 'jacket', 'tshirt', 'shorts', 'formal_shirt', 'sneakers', 'loafers'].includes(cat);
}

export function daysAgo(dateStr: string): number {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}
