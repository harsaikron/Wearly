/**
 * POST /api/analyze-clothing
 *
 * Model priority (auto-detected):
 *  1. wearly-fashion-v1  — Unsloth fine-tuned Gemma 4 (highest accuracy)
 *  2. gemma4:e4b          — base Gemma 4 via Ollama
 *  3. llama-4-scout       — Groq vision cloud fallback
 */
import { NextRequest, NextResponse } from 'next/server';
import { aiChatWithImage, safeParseJSON, detectFashionModel } from '@/lib/ai-client';

const SYSTEM = `You are Wearly's clothing classifier AI, fine-tuned to accurately identify fashion items.
Analyze the clothing image and reply ONLY with valid JSON — no markdown fences, no explanation.`;

const PROMPT = `Analyze this clothing item and return JSON with exactly these fields:
{
  "suggested_name": "concise item name (e.g. Navy Slim Chinos)",
  "category": "one of: shirt|formal_shirt|tshirt|pants|jeans|shorts|shoes|sneakers|loafers|jacket|watch|belt|accessory",
  "color_hex": "dominant color as hex (e.g. #1A237E)",
  "color_name": "plain color name (e.g. Navy Blue)",
  "tags": ["array of: office|casual|date_night|weekend|smart_casual|minimal|luxury|travel|festive|gym"]
}`;

export async function POST(request: NextRequest) {
  try {
    const { image_base64 } = await request.json() as { image_base64: string };

    if (!image_base64 || image_base64.length < 100) {
      return NextResponse.json({ error: 'Invalid or missing image_base64' }, { status: 400 });
    }

    const isFinetuned = await detectFashionModel();
    const { text, backend } = await aiChatWithImage(SYSTEM, PROMPT, image_base64);
    const parsed = safeParseJSON(text);

    return NextResponse.json({
      ...(parsed as object),
      _backend: backend,
      _model: isFinetuned ? 'wearly-fashion-v1 (fine-tuned)' : 'gemma4:e4b (base)',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Analysis failed';
    console.error('[analyze-clothing]', msg);
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
