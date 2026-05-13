import { NextRequest, NextResponse } from 'next/server';
import { aiChat, safeParseJSON } from '@/lib/ai-client';

interface WardrobeItem {
  id: string;
  name: string;
  category: string;
  color_name: string;
  color_hex: string;
  tags: string[];
}

export async function POST(req: NextRequest) {
  const { item, wardrobe } = await req.json() as {
    item: WardrobeItem;
    wardrobe: WardrobeItem[];
  };

  const others = wardrobe.filter((w) => w.id !== item.id);
  const wardrobeList = others.length > 0
    ? others.map((i) => `- [ID:${i.id}] ${i.name} (${i.category}, ${i.color_name})`).join('\n')
    : '- Empty wardrobe';

  const system = `You are a personal fashion stylist AI powered by Gemma 4.
Given a clothing item, suggest the best outfit pairings.
Prioritise items the user already owns. Only suggest buying if wardrobe is missing a key piece.
Reply ONLY with valid JSON, no markdown fences.`;

  const userMessage = `Item to pair: ${item.name} (${item.category}, ${item.color_name}, ${item.color_hex})
Tags: ${item.tags.join(', ')}

User's wardrobe:
${wardrobeList}

Suggest 4-6 pairing combinations. For each pairing pick one wardrobe item (prefer owned items) or one item to buy.

Reply with JSON:
{
  "pairings": [
    {
      "role": "e.g. Bottoms / Shoes / Outerwear / Accessory",
      "item_name": "name of the pairing item",
      "reason": "why it works stylistically (15 words max)",
      "in_wardrobe": true or false,
      "item_id": "wardrobe ID if in_wardrobe is true, else null",
      "color_name": "color of suggested item",
      "color_hex": "#hex",
      "occasion": "casual | office | date_night | smart_casual | weekend",
      "buy_query": "search query for shopping (if not in wardrobe)"
    }
  ],
  "style_tip": "One overall styling tip for this item (25 words max)",
  "best_occasion": "The best single occasion for this item",
  "care_tip": "Quick care tip for longevity (20 words max)"
}`;

  try {
    const { text, backend } = await aiChat(system, userMessage, { temperature: 0.6, maxTokens: 1000 });
    const parsed = safeParseJSON(text);
    return NextResponse.json({ ...(parsed as object), backend });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
