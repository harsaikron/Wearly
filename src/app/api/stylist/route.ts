import { NextRequest, NextResponse } from 'next/server';
import { aiChat, safeParseJSON } from '@/lib/ai-client';

const SYSTEM_PROMPT = `You are Wearly's AI Stylist — a sharp, concise fashion advisor for men in Singapore.
You have access to the user's wardrobe. Suggest specific outfits with colour codes.
Reply ONLY with valid JSON in this exact shape, nothing else:
{
  "message": "conversational reply with outfit suggestion",
  "outfit": {
    "shirt": "item name or null",
    "pants": "item name or null",
    "shoes": "item name or null",
    "jacket": "item name or null",
    "watch": "item name or null"
  },
  "color_pairs": [
    { "item1": "Shirt", "hex1": "#FFFFFF", "item2": "Pants", "hex2": "#1E2A38" }
  ],
  "occasion": "office",
  "style_tip": "one short actionable tip"
}
Valid occasion values: office, casual, date_night, weekend, smart_casual, minimal, luxury, travel, festive, gym.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, wardrobe, weather } = body as {
      query: string;
      wardrobe: { name: string; category: string; color_hex: string; color_name: string; tags: string[] }[];
      weather?: { temperature: number; description: string; condition: string; city: string };
    };

    const wardrobeList = wardrobe
      .map((item) => `- ${item.name} (${item.category}, ${item.color_name} ${item.color_hex}, tags: ${item.tags.join(', ')})`)
      .join('\n');

    const weatherNote = weather
      ? `Current weather in ${weather.city}: ${weather.temperature}°C, ${weather.description} (${weather.condition}).`
      : 'Weather: warm and humid, Singapore.';

    const userMessage = `${weatherNote}\n\nUser wardrobe:\n${wardrobeList}\n\nUser query: ${query}\n\nReply with JSON only.`;

    const { text, backend } = await aiChat(SYSTEM_PROMPT, userMessage);
    const parsed = safeParseJSON(text);

    return NextResponse.json({ ...parsed as object, _backend: backend });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI failed';
    console.error('Stylist error:', msg);
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
