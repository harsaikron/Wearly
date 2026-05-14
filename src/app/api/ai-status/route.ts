/**
 * GET /api/ai-status
 * Returns live AI backend detection — which models are available in Ollama
 * and whether Groq fallback is configured.
 */
import { NextResponse } from 'next/server';
import { OLLAMA_HOST } from '@/lib/ai-client';

interface ModelStatus {
  available: boolean;
  version?: string;
}

interface AIStatus {
  backend: 'ollama' | 'groq' | 'none';
  ollamaReachable: boolean;
  groqConfigured: boolean;
  models: {
    base: ModelStatus;
    fashion: ModelStatus;
    outfit: ModelStatus;
    makeup: ModelStatus;
  };
  overallScore: number;
}

export async function GET() {
  let ollamaReachable = false;
  let ollamaModels: string[] = [];

  try {
    const res = await fetch(`${OLLAMA_HOST}/api/tags`, {
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) {
      const data = await res.json() as { models: { name: string }[] };
      ollamaModels = (data.models ?? []).map((m) => m.name);
      ollamaReachable = true;
    }
  } catch { /* Ollama offline */ }

  const groqConfigured = !!process.env.GROQ_API_KEY;

  const hasBase    = ollamaModels.some((m) => m.startsWith('gemma4') || m.startsWith('gemma3'));
  const hasFashion = ollamaModels.some((m) => m.startsWith('wearly-fashion'));
  const hasOutfit  = ollamaModels.some((m) => m.startsWith('wearly-outfit'));
  const hasMakeup  = ollamaModels.some((m) => m.startsWith('wearly-makeup'));

  let backend: AIStatus['backend'] = 'none';
  if (ollamaReachable && hasBase) backend = 'ollama';
  else if (groqConfigured) backend = 'groq';

  // Score: base infrastructure + fine-tuned model bonuses
  let overallScore = 0;
  if (backend === 'ollama') overallScore = 72;
  else if (backend === 'groq') overallScore = 65;
  if (hasFashion) overallScore = Math.min(overallScore + 10, 100);
  if (hasOutfit)  overallScore = Math.min(overallScore + 9,  100);
  if (hasMakeup)  overallScore = Math.min(overallScore + 9,  100);

  const status: AIStatus = {
    backend,
    ollamaReachable,
    groqConfigured,
    models: {
      base:    { available: hasBase    || groqConfigured, version: hasBase ? 'gemma4:e4b' : 'llama-3.3-70b (Groq)' },
      fashion: { available: hasFashion, version: hasFashion ? 'wearly-fashion-v1' : undefined },
      outfit:  { available: hasOutfit,  version: hasOutfit  ? 'wearly-outfit-v1'  : undefined },
      makeup:  { available: hasMakeup,  version: hasMakeup  ? 'wearly-makeup-v1'  : undefined },
    },
    overallScore,
  };

  return NextResponse.json(status);
}
