/**
 * POST /api/makeup
 *
 * Given outfit, weather, gender and the user's uploaded makeup/jewelry items,
 * returns:
 *   - makeup suggestions (lips, eyes, skin, cheeks, jewelry)
 *   - two accessory/jewelry sections:
 *       from_wardrobe: items the user already owns
 *       buy_suggestions: items to buy (with wishlist support)
 */
import { NextRequest, NextResponse } from 'next/server';
import { aiChatMakeup, safeParseJSON } from '@/lib/ai-client';
import { FASHION_KNOWLEDGE } from '@/lib/fashion-knowledge';

const SYSTEM = `You are Wearly's AI beauty and accessories stylist — a world-class expert in makeup colour theory, skincare, jewellery pairing, grooming, and fashion coordination for all genders. You have deep knowledge of 2024-2025 makeup trends, skin tone matching, contouring, and accessory rules.

${FASHION_KNOWLEDGE}


You receive an outfit, weather data, gender, and the user's uploaded makeup and jewelry items.
You return personalised makeup + accessory suggestions in two sections:
  1. from_wardrobe — items the user already owns (match by name from their uploads)
  2. buy_suggestions — items they should buy to complete the look

Reply ONLY with valid JSON. No markdown fences.`;

export async function POST(req: NextRequest) {
  try {
    const { outfit, makeupItems, jewelryItems, weather, gender } = await req.json() as {
      outfit: { name: string; category: string; color_name: string; color_hex: string }[];
      makeupItems: { name: string; grooming_type?: string; color_name: string; color_hex: string }[];
      jewelryItems: { name: string; category: string; color_name: string; color_hex: string }[];
      weather?: { temperature: number; condition: string; humidity: number; description: string };
      gender: 'male' | 'female';
    };

    const weatherDesc = weather
      ? `${weather.temperature}°C, ${weather.condition}, ${weather.description}, humidity ${weather.humidity}%`
      : 'warm tropical weather';

    const outfitDesc = outfit.map((i) => `${i.name} (${i.color_name})`).join(', ') || 'no outfit';

    const makeupDesc = makeupItems.length > 0
      ? makeupItems.map((i) => `${i.name} [${i.grooming_type ?? 'makeup'}] ${i.color_name}`).join(', ')
      : 'none uploaded';

    const jewelryDesc = jewelryItems.length > 0
      ? jewelryItems.map((i) => `${i.name} (${i.category}, ${i.color_name})`).join(', ')
      : 'none uploaded';

    const isMale = gender === 'male';

    const userMessage = `Gender: ${gender}
Weather: ${weatherDesc}
Today's outfit: ${outfitDesc}
Uploaded makeup items: ${makeupDesc}
Uploaded jewelry/accessories: ${jewelryDesc}

Suggest a complete beauty + accessories look. Return exactly this JSON:
{
  "makeup": {
    ${isMale ? `"grooming_look": "simple grooming look (e.g. clean matte skin, shaped brows, SPF tint)",` : ''}
    ${!isMale ? `"lips": { "shade": "colour name", "hex": "#xxxxxx", "product_name": "matched from user's items or null", "why": "reason" },` : ''}
    ${!isMale ? `"eyes": { "look": "look name (e.g. Soft Glam, No-Makeup Makeup)", "shades": ["shade1","shade2"], "product_name": "matched or null", "why": "reason" },` : ''}
    "skin": { "finish": "dewy/matte/satin/natural", "spf_needed": true/false, "product_name": "matched or null", "why": "reason" }${!isMale ? ',' : ''}
    ${!isMale ? `"cheeks": { "blush_shade": "colour name", "hex": "#xxxxxx", "product_name": "matched or null", "why": "reason" }` : ''}
  },
  "jewelry": [
    { "type": "ring/chain/bracelet/earring/watch/sunglasses", "metal": "gold/silver/rose gold/none", "style": "minimal/bold/classic", "from_wardrobe": "item name if user has it or null", "why": "reason" }
  ],
  "overall_vibe": "one-line vibe (e.g. 'Sun-kissed minimal')",
  "from_wardrobe": [
    { "name": "exact item name from user's jewelry/makeup items", "category": "category", "color_name": "colour", "color_hex": "#xxxxxx", "why": "why it works today" }
  ],
  "buy_suggestions": [
    { "name": "product name to buy", "category": "ring/chain/lipstick/etc", "color_name": "colour", "color_hex": "#xxxxxx", "buy_query": "short search term for shopping", "price_estimate": "S$10–30", "why": "why it would complete the look" }
  ]
}`;

    const { text } = await aiChatMakeup(SYSTEM, userMessage);
    const parsed = safeParseJSON(text);

    if (!parsed) {
      return NextResponse.json({ error: 'AI returned invalid JSON' }, { status: 500 });
    }

    // Fire-and-forget: log to training data
    fetch('/api/learn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'makeup_suggestion',
        input: `${gender} outfit: ${outfitDesc}. Weather: ${weatherDesc}`,
        output: parsed,
      }),
    }).catch(() => {});

    return NextResponse.json(parsed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Makeup suggestion failed';
    console.error('[/api/makeup]', msg);
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
