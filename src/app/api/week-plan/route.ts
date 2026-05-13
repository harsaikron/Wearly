import { NextRequest, NextResponse } from 'next/server';
import { aiChat, safeParseJSON } from '@/lib/ai-client';

const SYSTEM_PROMPT = `You are Wearly's AI Week Planner for Singapore.
Given a user's wardrobe, create a complete 7-day outfit plan (Monday to Sunday) for the upcoming week.

Rules:
- Use ONLY items from the provided wardrobe. Never invent items.
- Vary the outfits — don't repeat the same top or bottom on consecutive days.
- Match to typical Singapore week: Mon-Fri = office/smart casual, Sat/Sun = casual/leisure.
- Always include: top, bottom, shoes. Add accessories if available.
- Be specific about which exact wardrobe item to wear.

Reply ONLY with this JSON — no markdown, no extra text:
{
  "week": [
    {
      "day": "Monday",
      "date_offset": 0,
      "occasion": "Office",
      "outfit": [
        { "piece": "exact item name from wardrobe", "role": "Top", "color_name": "color", "color_hex": "#hex", "note": "one styling tip" }
      ],
      "style_note": "One sentence about the overall look"
    }
  ]
}

Include all 7 days: Monday through Sunday. "date_offset" is 0=Monday, 1=Tuesday, ..., 6=Sunday.`;

export async function POST(req: NextRequest) {
  try {
    const { wardrobe } = await req.json() as {
      wardrobe: { name: string; category: string; color_name: string; color_hex: string; tags: string[] }[];
    };

    if (!wardrobe || wardrobe.length === 0) {
      return NextResponse.json({ error: 'No wardrobe items provided.' }, { status: 400 });
    }

    const wardrobeList = wardrobe
      .map((i) => `- ${i.name} (${i.category}, ${i.color_name}, tags: ${i.tags.join(', ')})`)
      .join('\n');

    const userMessage = `My wardrobe (${wardrobe.length} items):\n${wardrobeList}\n\nPlan a complete 7-day outfit week for me in Singapore. Mix and match these items creatively.`;

    const { text: raw } = await aiChat(SYSTEM_PROMPT, userMessage);

    const parsed = safeParseJSON(raw) as { week?: unknown[] } | null;
    if (!parsed || !Array.isArray(parsed.week)) {
      return NextResponse.json({ error: 'AI returned invalid format. Try again.' }, { status: 500 });
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error('[week-plan]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
