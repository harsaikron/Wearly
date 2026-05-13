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
  favorite?: boolean;
  worn_dates?: string[]; // ISO date strings of individual wear events
  notes?: string;
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

export type ListingCondition = 'New' | 'Like New' | 'Good' | 'Fair';
export type ListingMode = 'sell' | 'rent' | 'both';

export interface Listing {
  id: string;
  item_id?: string;
  title: string;
  category: string;
  brand: string;
  size: string;
  condition: ListingCondition;
  price: number;
  rent_price_day?: number;
  description: string;
  image_url?: string;
  color_hex?: string;
  color_name?: string;
  seller_name: string;
  seller_distance_km: number;
  pickup_location: string;
  availability: 'available' | 'sold' | 'rented';
  mode: ListingMode;
  is_mine: boolean;
  sustainability_badge: boolean;
  created_at: string;
}
