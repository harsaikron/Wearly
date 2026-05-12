import { NextResponse } from 'next/server';
import { detectBackend, OLLAMA_HOST } from '@/lib/ai-client';

export async function GET() {
  const backend = await detectBackend();

  let modelReady = false;
  if (backend === 'ollama') {
    try {
      const res = await fetch(`${OLLAMA_HOST}/api/tags`);
      const data = await res.json() as { models: { name: string }[] };
      modelReady = data.models?.some((m) => m.name.startsWith('gemma3')) ?? false;
    } catch {
      modelReady = false;
    }
  } else if (backend === 'groq') {
    modelReady = true;
  }

  return NextResponse.json({
    backend,
    model: backend === 'ollama' ? 'gemma3:4b (local)' : backend === 'groq' ? 'gemma2-9b (Groq cloud)' : 'none',
    model_ready: modelReady,
    supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    city: process.env.NEXT_PUBLIC_DEFAULT_CITY ?? 'Singapore',
  });
}
