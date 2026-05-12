import { NextResponse } from 'next/server';
import { detectBackend, OLLAMA_HOST } from '@/lib/ai-client';

export async function GET() {
  const backend = await detectBackend();

  let modelReady = false;
  let modelName  = 'none';

  if (backend === 'ollama') {
    try {
      const res  = await fetch(`${OLLAMA_HOST}/api/tags`);
      const data = await res.json() as { models: { name: string }[] };
      const model = data.models?.find((m) => m.name.startsWith('gemma4') || m.name.startsWith('gemma3'));
      modelReady = !!model;
      modelName  = model?.name ?? 'gemma4:e4b (local)';
    } catch {
      modelReady = false;
    }
  } else if (backend === 'groq') {
    modelReady = true;
    modelName  = 'llama-3.3-70b (Groq cloud)';
  }

  return NextResponse.json({
    backend,
    model: modelName,
    model_ready: modelReady,
    city: process.env.NEXT_PUBLIC_DEFAULT_CITY ?? 'Singapore',
    github_token: !!process.env.GITHUB_TOKEN,
  });
}
