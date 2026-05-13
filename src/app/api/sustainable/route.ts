import { NextRequest, NextResponse } from 'next/server';
import { aiChat, safeParseJSON } from '@/lib/ai-client';

interface ItemInput {
  name: string;
  category: string;
  color_name: string;
  tags: string[];
}

export async function POST(req: NextRequest) {
  const { items, occasion, event } = await req.json() as {
    items: ItemInput[];
    occasion: string;
    event?: string;
  };

  if (!items || items.length === 0) {
    return NextResponse.json({ error: 'Add some items to your wardrobe first.' }, { status: 400 });
  }

  const wardrobeList = items
    .map((i) => `- ${i.name} (${i.category}, ${i.color_name}${i.tags.length ? ', ' + i.tags.join('/') : ''})`)
    .join('\n');

  const system = `You are a sustainable fashion AI stylist powered by Gemma 4.
Mission: help users create stylish outfits from clothes they ALREADY OWN — reducing fast fashion waste.
The average person wears only 20% of their wardrobe. Help rediscover the other 80%.
Fashion produces ~10% of global CO₂ emissions. Every re-worn outfit matters.
Reply ONLY with valid JSON, no markdown fences.`;

  const userMessage = `My wardrobe items:
${wardrobeList}

Occasion: ${occasion}${event ? `\nEvent/Festival: ${event}` : ''}

Create 2-3 outfit combinations using ONLY my existing wardrobe items above.

Reply with JSON:
{
  "outfits": [
    {
      "outfit_name": "string",
      "items": ["exact item names from wardrobe"],
      "styling_note": "how to wear/style it",
      "eco_tip": "specific sustainability tip",
      "carbon_saved_kg": number
    }
  ],
  "wardrobe_score": "X/100 — short label",
  "score_breakdown": "brief explanation of the score",
  "weekly_challenge": "a specific re-wearing challenge",
  "carbon_facts": "one surprising fashion carbon fact"
}`;

  try {
    const { text, backend } = await aiChat(system, userMessage, { temperature: 0.7, maxTokens: 1200 });
    const parsed = safeParseJSON(text);
    return NextResponse.json({ ...(parsed as object), backend });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
