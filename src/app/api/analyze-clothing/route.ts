import { NextRequest, NextResponse } from 'next/server';
import { aiChatWithImage, safeParseJSON } from '@/lib/ai-client';

const SYSTEM = `You are a clothing analysis AI. Analyze the clothing image and reply ONLY with valid JSON, nothing else.`;

const PROMPT = `Analyze this clothing item and return JSON with exactly these fields:
{
  "category": "one of: shirt|formal_shirt|tshirt|pants|jeans|shorts|shoes|sneakers|loafers|jacket|watch|belt|accessory",
  "color_hex": "dominant color hex (e.g. #FFFFFF)",
  "color_name": "plain color name (e.g. White)",
  "suggested_name": "concise item name (e.g. White Oxford Shirt)",
  "tags": ["array of: office|casual|date_night|weekend|smart_casual|minimal|luxury|travel|festive|gym"]
}`;

export async function POST(request: NextRequest) {
  try {
    const { image_base64 } = await request.json() as { image_base64: string };
    const { text, backend } = await aiChatWithImage(SYSTEM, PROMPT, image_base64);
    const parsed = safeParseJSON(text);
    return NextResponse.json({ ...parsed as object, _backend: backend });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Analysis failed';
    console.error('Analyze clothing error:', msg);
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
