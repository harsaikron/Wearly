import { NextResponse } from 'next/server';
import { isOllamaRunning, MODEL, OLLAMA_HOST } from '@/lib/ollama-client';

export async function GET() {
  const ollamaUp = await isOllamaRunning();

  let modelReady = false;
  if (ollamaUp) {
    try {
      const res = await fetch(`${OLLAMA_HOST}/api/tags`);
      const data = await res.json() as { models: { name: string }[] };
      modelReady = data.models?.some((m) => m.name.startsWith(MODEL.split(':')[0])) ?? false;
    } catch {
      modelReady = false;
    }
  }

  return NextResponse.json({
    ollama: ollamaUp,
    model: MODEL,
    model_ready: modelReady,
    supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    city: process.env.NEXT_PUBLIC_DEFAULT_CITY ?? 'Singapore',
  });
}
