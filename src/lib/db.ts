/**
 * Typed Supabase query helpers for Wearly.
 * All functions require a browser-side Supabase client (createClient from @/lib/supabase).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ClothingItem, Outfit } from '@/types';

// ─── Clothing Items ───────────────────────────────────────────────────────────

export async function getClothingItems(
  supabase: SupabaseClient,
  userId: string
): Promise<ClothingItem[]> {
  const { data, error } = await supabase
    .from('clothing_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as ClothingItem[];
}

export async function insertClothingItem(
  supabase: SupabaseClient,
  item: Omit<ClothingItem, 'id' | 'created_at' | 'times_worn'>
): Promise<ClothingItem> {
  const { data, error } = await supabase
    .from('clothing_items')
    .insert({ ...item, times_worn: 0 })
    .select()
    .single();

  if (error) throw error;
  return data as ClothingItem;
}

export async function deleteClothingItem(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase.from('clothing_items').delete().eq('id', id);
  if (error) throw error;
}

// ─── Outfits ──────────────────────────────────────────────────────────────────

export async function getOutfits(
  supabase: SupabaseClient,
  userId: string
): Promise<Outfit[]> {
  const { data, error } = await supabase
    .from('outfits')
    .select('*')
    .eq('user_id', userId)
    .order('worn_date', { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as Outfit[];
}

export async function insertOutfit(
  supabase: SupabaseClient,
  outfit: {
    user_id: string;
    name: string;
    occasion: string;
    item_ids: string[];
    ai_reason?: string;
    worn_date?: string;
  }
): Promise<void> {
  const { error } = await supabase.from('outfits').insert(outfit);
  if (error) throw error;
}

export async function deleteOutfit(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase.from('outfits').delete().eq('id', id);
  if (error) throw error;
}

// ─── Calendar ─────────────────────────────────────────────────────────────────

export async function getCalendarEntries(
  supabase: SupabaseClient,
  userId: string,
  year: number,
  month: number
): Promise<{ date: string; event_type: string; outfit_id: string | null }[]> {
  const from = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const to   = `${year}-${String(month + 1).padStart(2, '0')}-31`;

  const { data, error } = await supabase
    .from('calendar_entries')
    .select('date, event_type, outfit_id')
    .eq('user_id', userId)
    .gte('date', from)
    .lte('date', to);

  if (error) throw error;
  return data ?? [];
}

export async function upsertCalendarEntry(
  supabase: SupabaseClient,
  userId: string,
  date: string,
  eventType: string,
  outfitId: string | null
): Promise<void> {
  const { error } = await supabase
    .from('calendar_entries')
    .upsert({ user_id: userId, date, event_type: eventType, outfit_id: outfitId });
  if (error) throw error;
}
