/**
 * POST /api/grooming
 *
 * Given the user's outfit, grooming/skincare items, and weather data,
 * returns an AI skincare routine, strap colour suggestion, and accessory tips.
 */
import { NextRequest, NextResponse } from 'next/server';
import { aiChat, safeParseJSON } from '@/lib/ai-client';

const SYSTEM = `You are Wearly's personal grooming & skincare AI, specialising in men's style and skincare.
You analyse an outfit, the weather, and the user's available grooming/skincare products, then output a
personalised routine and accessory suggestions.

Reply ONLY with valid JSON — no markdown fences, no extra text.`;

export async function POST(req: NextRequest) {
  try {
    const { outfit, groomingItems, watchStraps, weather } = await req.json() as {
      outfit: { name: string; category: string; color_name: string }[];
      groomingItems: { name: string; category: string; grooming_type?: string; spf?: number; color_name: string }[];
      watchStraps?: { color_name: string; color_hex: string; material: string }[];
      weather?: { temperature: number; condition: string; humidity: number; description: string };
    };

    const weatherDesc = weather
      ? `${weather.temperature}°C, ${weather.condition}, ${weather.description}, humidity ${weather.humidity}%`
      : 'unknown weather';

    const outfitDesc = outfit.map((i) => `${i.name} (${i.color_name})`).join(', ') || 'no outfit selected';

    const groomingDesc = groomingItems.length > 0
      ? groomingItems.map((i) => `${i.name}${i.grooming_type ? ` [${i.grooming_type}]` : ''}${i.spf ? ` SPF${i.spf}` : ''}`).join(', ')
      : 'no grooming items uploaded';

    const strapsDesc = watchStraps && watchStraps.length > 0
      ? watchStraps.map((s) => `${s.color_name} ${s.material}`).join(', ')
      : null;

    const userMessage = `Today's weather: ${weatherDesc}
Today's outfit: ${outfitDesc}
Available grooming/skincare products: ${groomingDesc}
${strapsDesc ? `Available watch straps: ${strapsDesc}` : ''}

Generate a personalised grooming & accessory suggestion. Return exactly this JSON structure:
{
  "skincare_routine": [
    {
      "step": "step name (e.g. Cleanse, Moisturise, SPF)",
      "product_name": "matched product from the user's items, or null",
      "recommendation": "what to use and why (mention SPF if hot/sunny weather)",
      "icon": "emoji"
    }
  ],
  ${strapsDesc ? `"strap_suggestion": {
    "strap_color": "recommended strap color name from available straps",
    "strap_hex": "hex of recommended strap",
    "reason": "why this strap complements the outfit"
  },` : ''}
  "accessory_tips": [
    {
      "type": "accessory type (e.g. sunglasses, chain, ring)",
      "tip": "specific style tip",
      "color_suggestion": "color that pairs well with the outfit"
    }
  ],
  "fragrance_note": "fragrance/scent family that suits the weather and occasion, or specific product from user's items",
  "weather_note": "one practical grooming tip based on today's weather (e.g. SPF, humidity, UV)"
}`;

    const { text } = await aiChat(SYSTEM, userMessage);
    const parsed = safeParseJSON(text);

    if (!parsed) {
      return NextResponse.json({ error: 'AI returned invalid JSON' }, { status: 500 });
    }

    return NextResponse.json(parsed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Grooming suggestion failed';
    console.error('[/api/grooming]', msg);
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
