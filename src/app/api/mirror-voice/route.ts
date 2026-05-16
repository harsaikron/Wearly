import { NextRequest, NextResponse } from 'next/server';
import { aiChatWithImage, safeParseJSON } from '@/lib/ai-client';
import { FASHION_KNOWLEDGE_COMPACT } from '@/lib/fashion-knowledge';

const SYSTEM = `You are Wearly's Smart Mirror voice assistant — a friendly, warm personal stylist who speaks naturally.

${FASHION_KNOWLEDGE_COMPACT}

YOUR JOB: Look at the photo and generate a complete, detailed outfit analysis for voice output.
Never cut sentences short. Always complete ALL three sections fully.

Return ONLY valid JSON (no markdown fences) with EXACTLY these fields:
{
  "color_description": "One complete sentence: exact color name + garment type + brief style note. Example: 'You're wearing a sage green relaxed-fit cotton polo shirt — a great casual choice.'",
  "bottoms": [
    { "name": "Navy Slim Chinos", "color": "Navy Blue", "reason": "classic contrast that keeps the look smart casual" },
    { "name": "Cream Linen Wide-Leg Trousers", "color": "Cream", "reason": "light and breathable for Singapore heat" }
  ],
  "accessories": [
    { "type": "Shoes", "description": "White low-top canvas sneakers", "reason": "clean and minimal, balances the relaxed top" },
    { "type": "Belt", "description": "Tan leather belt with a silver buckle", "reason": "grounds the outfit with a warm neutral" },
    { "type": "Jewellery", "description": "Simple silver chain necklace", "reason": "adds a subtle detail without overpowering" }
  ],
  "full_script": "Complete natural spoken script — minimum 4 sentences covering all 3 parts. Example: 'Hi Harsai! You are wearing a sage green cotton polo shirt — a great relaxed look. For your bottoms, I would suggest navy slim chinos for a smart casual feel, or cream linen wide-leg trousers to stay cool in Singapore's heat. To complete the look, pair it with white canvas sneakers, a tan leather belt, and a simple silver chain. You look amazing today — enjoy your day!'"
}

RULES:
- full_script MUST cover: outfit description + 2 bottom options + 2-3 accessories + closing encouragement
- full_script must be a single string, naturally spoken, minimum 4 complete sentences
- bottoms array must always have exactly 2 items
- accessories array must always have exactly 3 items
- Use exact color names from the color reference chart
- If image is unclear, make a reasonable assumption and describe what you see`;

export async function POST(req: NextRequest) {
  try {
    const { photo_base64, weather, userName } = await req.json() as {
      photo_base64: string;
      weather?: { temperature?: number; description?: string; condition?: string; humidity?: number };
      userName?: string;
    };

    const greeting = userName ? `Hi ${userName.split(' ')[0]}! ` : 'Hello! ';
    const weatherNote = weather
      ? `Current weather: ${weather.temperature ?? 31}°C, ${weather.description ?? 'humid'}, humidity ${weather.humidity ?? 84}%.`
      : 'Current weather: Singapore, 31°C, humid and sunny.';

    const userMessage = `${weatherNote}
The person's name is: ${userName || 'the user'}.
Start the full_script with: "${greeting}"

Analyse the outfit in the photo. Return the complete JSON with all three sections fully filled.
Do NOT truncate any section. The full_script must cover outfit + 2 bottoms + 3 accessories + a closing line.`;

    const { text } = await aiChatWithImage(SYSTEM, userMessage, photo_base64);
    const parsed = safeParseJSON(text) as Record<string, unknown> | null;

    if (!parsed) {
      return NextResponse.json({ error: 'AI returned invalid response' }, { status: 500 });
    }

    return NextResponse.json(parsed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Mirror voice failed';
    console.error('[/api/mirror-voice]', msg);
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
