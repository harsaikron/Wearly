import { NextRequest, NextResponse } from 'next/server';
import { chat, isOllamaRunning } from '@/lib/ollama-client';

const SYSTEM_PROMPT = `You are Wearly's AI Stylist — a sharp, concise fashion advisor for men.
You have access to the user's wardrobe. Suggest specific outfits with colour codes.
You must reply ONLY with valid JSON in this exact shape, nothing else:
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
  const running = await isOllamaRunning();
  if (!running) {
    return NextResponse.json(
      { error: 'Ollama is not running. Start it with: brew services start ollama' },
      { status: 503 }
    );
  }

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
      : '';

    const userMessage = `${weatherNote}

User wardrobe:
${wardrobeList}

User query: ${query}

Reply with JSON only.`;

    const raw = await chat(SYSTEM_PROMPT, userMessage, 'json');

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Gemma sometimes wraps JSON in markdown — strip fences
      const cleaned = raw.replace(/```json\n?|```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error('Stylist route error:', err);
    return NextResponse.json({ error: 'AI Stylist failed. Is Ollama running with gemma3:4b?' }, { status: 500 });
  }
}
