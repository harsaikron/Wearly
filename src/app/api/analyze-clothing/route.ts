import { NextRequest, NextResponse } from 'next/server';
import { chatWithImage, isOllamaRunning } from '@/lib/ollama-client';

const SYSTEM_PROMPT = `You are a clothing analysis AI. Analyze the clothing image and reply ONLY with valid JSON, nothing else.`;

const USER_PROMPT = `Analyze this clothing item image and return JSON with exactly these fields:
{
  "category": "one of: shirt|formal_shirt|tshirt|pants|jeans|shorts|shoes|sneakers|loafers|jacket|watch|belt|accessory",
  "color_hex": "dominant color as hex (e.g. #FFFFFF)",
  "color_name": "plain color name (e.g. White)",
  "suggested_name": "concise item name (e.g. White Oxford Shirt)",
  "tags": ["array of: office|casual|date_night|weekend|smart_casual|minimal|luxury|travel|festive|gym"]
}`;

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
    const { image_base64 } = body as { image_base64: string };

    const raw = await chatWithImage(SYSTEM_PROMPT, USER_PROMPT, image_base64);

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const cleaned = raw.replace(/```json\n?|```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error('Clothing analysis error:', err);
    return NextResponse.json({ error: 'Analysis failed. Is Ollama running with gemma3:4b?' }, { status: 500 });
  }
}
