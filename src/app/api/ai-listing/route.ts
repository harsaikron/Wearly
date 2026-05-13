import { NextRequest, NextResponse } from 'next/server';
import { aiChat, safeParseJSON } from '@/lib/ai-client';

export async function POST(req: NextRequest) {
  const { name, category, brand, condition, color_name, times_worn, mode } = await req.json() as {
    name: string; category: string; brand?: string;
    condition: string; color_name: string; times_worn: number; mode: 'sell' | 'rent';
  };

  const system = `You are a resale listing copywriter for a Singapore sustainable fashion marketplace.
Write concise, honest, compelling listing titles and descriptions.
Reply ONLY with valid JSON, no markdown.`;

  const prompt = `Item: ${name}
Category: ${category}
Brand: ${brand ?? 'Unknown'}
Color: ${color_name}
Condition: ${condition}
Times worn: ${times_worn}
Listing type: ${mode === 'rent' ? 'For Rent' : 'For Sale'}

Reply with JSON:
{
  "title": "compelling listing title (max 60 chars)",
  "description": "honest 2-3 sentence description highlighting condition, style, and sustainability angle",
  "suggested_price": number (SGD, realistic second-hand price),
  "suggested_rent": number (SGD per day, only if mode=rent, else null)
}`;

  try {
    const { text } = await aiChat(system, prompt, { temperature: 0.6, maxTokens: 300 });
    const parsed = safeParseJSON(text);
    return NextResponse.json(parsed);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
