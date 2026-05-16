import { NextRequest, NextResponse } from 'next/server';
import { aiChat, safeParseJSON } from '@/lib/ai-client';
import { FASHION_KNOWLEDGE } from '@/lib/fashion-knowledge';

interface WardrobeItem {
  name: string;
  category: string;
  color_name: string;
  color_hex: string;
  tags: string[];
  times_worn?: number;
  last_worn?: string;
}

interface WeatherInput {
  temperature: number;
  feels_like: number;
  description: string;
  condition: string;
  humidity: number;
}

export async function POST(req: NextRequest) {
  const { wardrobe, weather, day, event, gender } = await req.json() as {
    wardrobe: WardrobeItem[];
    weather: WeatherInput;
    day: string;
    event?: string;
    gender?: 'male' | 'female';
  };

  if (!wardrobe || wardrobe.length === 0) {
    return NextResponse.json({ error: 'Add clothes to your wardrobe first.' }, { status: 400 });
  }

  const wardrobeList = wardrobe
    .map((i) => `- ${i.name} | ${i.category} | ${i.color_name} (${i.color_hex}) | occasions: ${i.tags.join(', ')}${i.times_worn !== undefined ? ` | worn ${i.times_worn}×` : ''}`)
    .join('\n');

  const genderLabel = gender === 'female' ? 'female / women' : 'male / men';
  const system = `You are a world-class personal AI stylist with expert knowledge of 2024-2025 fashion trends, color theory, body-type styling, Singapore climate, and cultural occasions for both men and women.

${FASHION_KNOWLEDGE}

Select the BEST outfit for today for a ${genderLabel} user from their actual wardrobe.
Be specific — use the EXACT item names from the wardrobe list.
For every item you select, give a clear, personal reason why you chose it today (weather, day of week, event, style logic).
If pants/jeans/shorts exist in the wardrobe, always include one as the bottom.
Reply ONLY with valid JSON, no markdown.`;

  const userMessage = `Today is ${day} in Singapore.
Weather: ${weather.temperature}°C (feels like ${weather.feels_like}°C), ${weather.description}, humidity ${weather.humidity}%${event ? `\nUpcoming event: ${event}` : ''}

My wardrobe:
${wardrobeList}

Pick today's complete outfit (top, bottom, shoes, and optionally 1–2 accessories if available in my wardrobe).

Reply with JSON:
{
  "outfit_name": "catchy outfit title",
  "overall_reason": "1–2 sentences explaining the overall outfit choice for today",
  "items": [
    {
      "name": "exact item name from wardrobe",
      "category": "category",
      "color_name": "color name",
      "color_hex": "#hex",
      "why": "specific reason this item was picked for today — mention weather/day/event/style"
    }
  ],
  "style_tip": "one actionable styling tip to elevate this look",
  "mood": "one word mood/vibe (e.g. Sharp, Relaxed, Bold, Minimal)"
}`;

  try {
    const { text, backend } = await aiChat(system, userMessage, { temperature: 0.6, maxTokens: 900 });
    const parsed = safeParseJSON(text);
    return NextResponse.json({ ...(parsed as object), backend });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
