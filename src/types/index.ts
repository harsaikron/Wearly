export type ClothingCategory =
  | 'shirt'
  | 'pants'
  | 'jeans'
  | 'shoes'
  | 'watch'
  | 'belt'
  | 'jacket'
  | 'tshirt'
  | 'shorts'
  | 'formal_shirt'
  | 'sneakers'
  | 'loafers'
  | 'accessory';

export type OccasionTag =
  | 'office'
  | 'casual'
  | 'date_night'
  | 'weekend'
  | 'smart_casual'
  | 'minimal'
  | 'luxury'
  | 'travel'
  | 'festive'
  | 'gym';

export interface ClothingItem {
  id: string;
  user_id: string;
  name: string;
  category: ClothingCategory;
  color_hex: string;
  color_name: string;
  image_url: string;
  image_bg_removed_url?: string;
  brand?: string;
  tags: OccasionTag[];
  times_worn: number;
  last_worn?: string;
  created_at: string;
}

export interface Outfit {
  id: string;
  user_id: string;
  name: string;
  items: ClothingItem[];
  occasion: OccasionTag;
  color_palette: { hex: string; name: string }[];
  ai_reason?: string;
  worn_date?: string;
  created_at: string;
}

export interface WeatherData {
  temperature: number;
  feels_like: number;
  description: string;
  humidity: number;
  wind_speed: number;
  city: string;
  icon: string;
  condition: 'hot' | 'warm' | 'mild' | 'cool' | 'cold' | 'rainy' | 'windy' | 'cloudy';
}

export interface OutfitSuggestion {
  outfit: {
    shirt?: ClothingItem;
    pants?: ClothingItem;
    shoes?: ClothingItem;
    jacket?: ClothingItem;
    watch?: ClothingItem;
    belt?: ClothingItem;
  };
  color_pairs: { item1: string; hex1: string; item2: string; hex2: string }[];
  occasion: OccasionTag;
  reason: string;
  style_tip: string;
}

export interface CalendarEntry {
  date: string;
  outfit_id?: string;
  outfit?: Outfit;
  event_type?: 'workday' | 'weekend' | 'event' | 'birthday' | 'dinner' | 'travel' | 'casual';
}

export interface UserProfile {
  id: string;
  full_name: string;
  avatar_url?: string;
  city?: string;
  style_preferences: OccasionTag[];
  created_at: string;
}
