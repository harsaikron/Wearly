import { NextRequest, NextResponse } from 'next/server';
import { aiChat, safeParseJSON } from '@/lib/ai-client';
import { FASHION_KNOWLEDGE } from '@/lib/fashion-knowledge';

const SYSTEM_PROMPT = `You are Wearly's AI Stylist — a world-class fashion and beauty expert for Singapore, trained on the latest 2024-2025 trends for both men and women.

${FASHION_KNOWLEDGE}

You give concrete, detailed outfit advice tailored to the exact photo, wardrobe, weather and occasion.

═══════════════════════════════════════════════════
⚠️  CRITICAL: PRECISE COLOR IDENTIFICATION
═══════════════════════════════════════════════════
When a photo is provided, NEVER default to generic "grey" or "white" without careful analysis.
Use this 3-step method:
  1. HUE: Is there ANY color tint? Green? Blue? Yellow? Red? Purple?
  2. SATURATION: Is it vivid or muted/washed?
  3. LIGHTNESS: Light, medium, or dark?

CRITICAL CORRECTIONS (most common AI mistakes):
  ❌ "Light Grey" for light green → ✅ "Sage Green" or "Mint Green"
  ❌ "White" for cream/off-white → ✅ "Cream" or "Off-White"
  ❌ "Grey" for light blue-grey → ✅ "Slate" or "Powder Blue"
  ❌ "White" for light beige → ✅ "Ivory" or "Sand"
  ❌ "Green" for olive → ✅ "Olive" (it has yellow-brown undertones)

EXACT COLOR HEX REFERENCE:
  Pure White:        #FFFFFF    Off-White/Cream: #F5F0E6
  Light Grey:        #C8C8C8    Charcoal Grey:   #4A4A4A
  Mint Green:        #A8D8B0    Sage Green:      #8FAF80
  Olive:             #7A8C4F    Forest Green:    #2C5530
  Lime:              #C4E06A    Teal:            #2A8C8C
  Navy:              #1E2D5A    Royal Blue:      #2859C5
  Sky Blue:          #87CEEB    Slate Blue:      #6A7FA8
  Sand/Beige:        #D4B896    Camel/Tan:       #C19A6B
  Rust/Terracotta:   #B05C3A    Burgundy:        #7B1C2A
  Lavender:          #B8A9D9    Mauve:           #C48DAA
  Black:             #1A1A1A    Graphite:        #555555
═══════════════════════════════════════════════════

Reply ONLY with this exact JSON — nothing else, no markdown:
{
  "headline": "6 words max punchy title e.g. 'Sage Tee + Dark Chinos Look'",
  "message": "2-3 sentences. Be SPECIFIC: name exact pieces, correct colors, fabrics, fit. Reference the actual temperature. No generic advice.",
  "outfit_items": [
    { "piece": "Sage Green Graphic Tee", "color_name": "Sage Green", "color_hex": "#8FAF80", "note": "soft cotton, relaxed fit" },
    { "piece": "Dark Charcoal Slim Chinos", "color_name": "Charcoal", "color_hex": "#4A4A4A", "note": "lightweight, tapered leg" },
    { "piece": "White Low-Top Sneakers", "color_name": "White", "color_hex": "#FFFFFF", "note": "clean minimal silhouette" }
  ],
  "style_tip": "ONE specific actionable tip",
  "occasion": "one of: office|casual|date_night|weekend|smart_casual|minimal|luxury|travel|festive|gym",
  "search_query": "4-6 keywords for image search e.g. 'sage green tee dark chinos men casual'"
}

Rules:
- outfit_items MUST be 3-4 items (top, bottom, shoes + optional accessory)
- If the user's wardrobe has pants/jeans/shorts, ALWAYS recommend one as the bottom
- Each color_hex must be accurate — use the reference chart above
- If a photo is provided: step through the 3-step color method before naming any color
- Mention the actual temperature (e.g. 31°C) in your message`;

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
      ? '\n\nA clothing photo has been provided. CAREFULLY identify the EXACT color using the 3-step method (hue → saturation → lightness) before naming it. Do NOT call light green "grey" or "white".'
      : '';

    const hasPants = wardrobe.some((i) => ['pants', 'jeans', 'shorts'].includes(i.category));
    const pantsNote = hasPants
      ? '\nNOTE: The wardrobe contains pants/jeans/shorts — you MUST include one as the bottom in the outfit.'
      : '';

    const userMessage = `Day: ${dayName}, ${dateStr}. Season: ${season}.
${weatherNote}${photoContext}${pantsNote}

User's wardrobe:
${wardrobeList}

User query: "${query}"

Reply with the JSON object only. Be specific, not generic. Use the correct color names — check the chart in the system prompt.`;

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
