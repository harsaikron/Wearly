import { NextRequest, NextResponse } from 'next/server';
import { aiChat, safeParseJSON } from '@/lib/ai-client';

const SYSTEM_PROMPT = `You are Wearly's AI Stylist — a sharp, specific fashion advisor for men in Singapore.
You give concrete, detailed outfit advice tailored to the exact photo, wardrobe, weather and occasion.

Reply ONLY with this exact JSON — nothing else, no markdown:
{
  "headline": "6 words max punchy outfit title e.g. 'Crisp White Tee + Slate Chinos'",
  "message": "2-3 sentences. Be SPECIFIC: name exact pieces, colors, fabrics, fit. Reference the weather temperature and condition directly. No generic advice.",
  "outfit_items": [
    { "piece": "exact item name e.g. White Cotton Crew-Neck Tee", "color_name": "White", "color_hex": "#F5F5F5", "note": "short fit/fabric tip" },
    { "piece": "Slim Stone Chinos", "color_name": "Stone", "color_hex": "#C8B49A", "note": "lightweight, tapered leg" },
    { "piece": "White Low-Top Sneakers", "color_name": "White", "color_hex": "#FFFFFF", "note": "clean minimal silhouette" }
  ],
  "style_tip": "ONE specific actionable tip — e.g. 'Tuck in loosely at the front for a smart-casual finish'",
  "occasion": "one of: office|casual|date_night|weekend|smart_casual|minimal|luxury|travel|festive|gym",
  "search_query": "4-6 keywords for outfit image search e.g. 'white tee stone chinos men casual Singapore'"
}

Rules:
- outfit_items must be 3-4 specific items (top, bottom, shoes + optional layer/accessory)
- Each color_hex must be the actual garment color in proper hex
- If a photo is provided, analyze the EXACT garment shown (color, style, fit) before suggesting
- Mention the actual temperature (e.g. 31°C) in message
- search_query should help find Pinterest/Google inspiration images for this exact outfit`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, wardrobe, weather, photo_base64 } = body as {
      query: string;
      wardrobe: { name: string; category: string; color_hex: string; color_name: string; tags: string[] }[];
      weather?: { temperature: number; feels_like?: number; description: string; condition: string; city: string; humidity?: number };
      photo_base64?: string;
    };

    const wardrobeList = wardrobe.length > 0
      ? wardrobe.map((i) => `  • ${i.name} (${i.category}, ${i.color_name} ${i.color_hex}, occasions: ${i.tags.join(', ')})`).join('\n')
      : '  (no wardrobe items uploaded yet)';

    const weatherNote = weather
      ? `Current weather in ${weather.city}: ${weather.temperature}°C (feels ${weather.feels_like ?? weather.temperature + 4}°C), ${weather.description}, humidity ${weather.humidity ?? 85}%.`
      : 'Current weather: Singapore, 31°C, humid and sunny.';

    const today = new Date();
    const dayName = today.toLocaleDateString('en-SG', { weekday: 'long', timeZone: 'Asia/Singapore' });
    const dateStr = today.toLocaleDateString('en-SG', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Singapore' });
    const season = 'year-round tropical heat (no seasons in Singapore)';

    const photoContext = photo_base64
      ? '\n\nA clothing photo has been provided — analyse the exact garment (color, fabric texture, fit, style) before making suggestions.'
      : '';

    const userMessage = `Day: ${dayName}, ${dateStr}. Season: ${season}.
${weatherNote}${photoContext}

User's wardrobe:
${wardrobeList}

User query: "${query}"

Reply with the JSON object only. Be specific, not generic.`;

    // Use vision if photo provided
    let text: string;
    let backend: string;

    if (photo_base64) {
      const { aiChatWithImage } = await import('@/lib/ai-client');
      const result = await aiChatWithImage(SYSTEM_PROMPT, userMessage, photo_base64);
      text = result.text;
      backend = result.backend;
    } else {
      const result = await aiChat(SYSTEM_PROMPT, userMessage);
      text = result.text;
      backend = result.backend;
    }

    const parsed = safeParseJSON(text) as Record<string, unknown>;
    return NextResponse.json({ ...parsed, _backend: backend });

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI failed';
    console.error('Stylist error:', msg);
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
