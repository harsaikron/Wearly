import { NextRequest, NextResponse } from 'next/server';
import { aiChat, safeParseJSON } from '@/lib/ai-client';

interface ItemInput {
  name: string;
  category: string;
  color_name: string;
  color_hex: string;
  tags: string[];
  times_worn: number;
  last_worn?: string;
  created_at: string;
}

export async function POST(req: NextRequest) {
  const { items } = await req.json() as { items: ItemInput[] };

  if (!items || items.length === 0) {
    return NextResponse.json({ error: 'No items in wardrobe.' }, { status: 400 });
  }

  const today = new Date().toISOString().split('T')[0];
  const list = items.map((i) => {
    const daysSince = i.last_worn
      ? Math.floor((Date.now() - new Date(i.last_worn).getTime()) / 86400000)
      : Math.floor((Date.now() - new Date(i.created_at).getTime()) / 86400000);
    return `- ${i.name} | ${i.category} | ${i.color_name} | worn:${i.times_worn}x | last_worn:${daysSince}d ago`;
  }).join('\n');

  const system = `You are an AI wardrobe analyst. Analyse the wardrobe and return a JSON health report.
Today: ${today}. Singapore tropical climate. Be specific with item names from the list.
Reply ONLY with valid JSON, no markdown fences.`;

  const prompt = `Wardrobe items:
${list}

Return a closet health report as JSON:
{
  "overall_score": number 0-100,
  "grade": "A/B+/B/C+/C/D",
  "summary": "1-sentence overall assessment",
  "overused": [{ "name": string, "times_worn": number, "tip": string }],
  "unused": [{ "name": string, "days_since": number, "tip": string, "resell_suggestion": string }],
  "duplicate_colors": [{ "color": string, "hex": string, "count": number, "items": string[] }],
  "missing_essentials": [{ "item": string, "reason": string, "priority": "high|medium|low" }],
  "lifecycle": [
    { "name": string, "prediction": "high_usage|low_usage|seasonal_peak|resale_ready|donate", "resale_window": string, "demand_trend": string, "action": string }
  ],
  "outfit_combos": [
    {
      "outfit_name": string,
      "items": [string],
      "colors": [{ "name": string, "hex": string }],
      "confidence": number,
      "style_reason": string,
      "comfort": number,
      "sustainability": number,
      "calendar_label": string
    }
  ]
}
Rules:
- overused: worn more than 10 times
- unused: not worn in 60+ days
- duplicate_colors: 3+ items in same colour family
- missing_essentials: key basics not in wardrobe
- lifecycle: predict for every item
- outfit_combos: 2-3 combos from actual wardrobe items`;

  try {
    const { text, backend } = await aiChat(system, prompt, { temperature: 0.5, maxTokens: 1800 });
    const parsed = safeParseJSON(text);
    return NextResponse.json({ ...(parsed as object), backend });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
