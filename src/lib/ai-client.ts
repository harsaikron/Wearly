/**
 * Smart AI client — Gemma 4 locally via Ollama, falls back to Groq cloud.
 *
 * Model priority:
 *   1. wearly-fashion-v1  (fine-tuned Gemma 4 via Unsloth — clothing vision only)
 *   2. gemma4:e4b          (base Gemma 4 via Ollama — all other tasks)
 *   3. llama-3.3-70b       (Groq cloud fallback — when Ollama unavailable)
 */
import { Ollama } from 'ollama';
import Groq from 'groq-sdk';

const OLLAMA_MODEL        = 'gemma4:e4b';
const OLLAMA_FASHION_MODEL = 'wearly-fashion-v1'; // fine-tuned clothing classifier
const GROQ_TEXT_MODEL     = 'llama-3.3-70b-versatile';
const GROQ_VISION_MODEL   = 'meta-llama/llama-4-scout-17b-16e-instruct';

export const OLLAMA_HOST = process.env.OLLAMA_HOST ?? 'http://localhost:11434';

// ─── Fine-tuned model detection ───────────────────────────────────────────────
// Checks if the Unsloth-exported wearly-fashion-v1 model is available in Ollama.
// Falls back silently to the base gemma4:e4b if not found.

let _fashionModelAvailable: boolean | null = null;

export async function detectFashionModel(): Promise<boolean> {
  if (_fashionModelAvailable !== null) return _fashionModelAvailable;
  try {
    const res  = await fetch(`${OLLAMA_HOST}/api/tags`, { signal: AbortSignal.timeout(1500) });
    if (!res.ok) { _fashionModelAvailable = false; return false; }
    const data = await res.json() as { models: { name: string }[] };
    _fashionModelAvailable = data.models?.some((m) => m.name.startsWith('wearly-fashion'));
  } catch {
    _fashionModelAvailable = false;
  }
  return _fashionModelAvailable ?? false;
}

// ─── Backend detection ────────────────────────────────────────────────────────

export type AIBackend = 'ollama' | 'groq' | 'none';

export async function detectBackend(): Promise<AIBackend> {
  try {
    const res = await fetch(`${OLLAMA_HOST}/api/tags`, {
      signal: AbortSignal.timeout(1500),
    });
    if (res.ok) {
      const data = await res.json() as { models: { name: string }[] };
      const hasModel = data.models?.some(
        (m) => m.name.startsWith('gemma4') || m.name.startsWith('gemma3')
      );
      if (hasModel) return 'ollama';
    }
  } catch { /* Ollama not reachable */ }

  if (process.env.GROQ_API_KEY) return 'groq';
  return 'none';
}

// ─── Text chat ────────────────────────────────────────────────────────────────

export async function aiChat(
  system: string,
  userMessage: string,
  options?: { temperature?: number; maxTokens?: number }
): Promise<{ text: string; backend: AIBackend }> {
  const backend = await detectBackend();

  if (backend === 'ollama') {
    const ollama = new Ollama({ host: OLLAMA_HOST });
    const res = await ollama.chat({
      model: OLLAMA_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user',   content: userMessage },
      ],
      format: 'json',
      options: { temperature: options?.temperature ?? 0.7 },
    });
    return { text: res.message.content, backend };
  }

  if (backend === 'groq') {
    try {
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const res = await groq.chat.completions.create({
        model: GROQ_TEXT_MODEL,
        messages: [
          { role: 'system', content: system + '\n\nIMPORTANT: Reply with valid JSON only, no markdown fences.' },
          { role: 'user',   content: userMessage },
        ],
        temperature: options?.temperature ?? 0.7,
        max_tokens:  options?.maxTokens  ?? 1200,
        response_format: { type: 'json_object' },
      });
      return { text: res.choices[0].message.content ?? '{}', backend };
    } catch (e: unknown) {
      const status = (e as { status?: number }).status;
      if (status === 401) throw new Error('GROQ_API_KEY is invalid or not set. Add it in Vercel → Project Settings → Environment Variables.');
      if (status === 429) throw new Error('Groq rate limit reached. Try again in a moment.');
      throw e;
    }
  }

  throw new Error('AI offline. Add GROQ_API_KEY to Vercel environment variables, or run Ollama locally.');
}

// ─── Long-form text (no JSON constraint) ─────────────────────────────────────

export async function aiChatText(
  system: string,
  userMessage: string,
  options?: { temperature?: number; maxTokens?: number }
): Promise<{ text: string; backend: AIBackend }> {
  const backend = await detectBackend();

  if (backend === 'ollama') {
    const ollama = new Ollama({ host: OLLAMA_HOST });
    const res = await ollama.chat({
      model: OLLAMA_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user',   content: userMessage },
      ],
      options: { temperature: options?.temperature ?? 0.6 },
    });
    return { text: res.message.content, backend };
  }

  if (backend === 'groq') {
    try {
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const res = await groq.chat.completions.create({
        model: GROQ_TEXT_MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user',   content: userMessage },
        ],
        temperature: options?.temperature ?? 0.6,
        max_tokens:  options?.maxTokens  ?? 2000,
      });
      return { text: res.choices[0].message.content ?? '', backend };
    } catch (e: unknown) {
      const status = (e as { status?: number }).status;
      if (status === 401) throw new Error('GROQ_API_KEY is invalid or not set. Add it in Vercel → Project Settings → Environment Variables.');
      if (status === 429) throw new Error('Groq rate limit reached. Try again in a moment.');
      throw e;
    }
  }

  throw new Error('AI offline. Add GROQ_API_KEY to Vercel environment variables, or run Ollama locally.');
}

// ─── Vision (image) chat ──────────────────────────────────────────────────────
// When the fine-tuned wearly-fashion-v1 model is available in Ollama, it is
// used instead of the base model for clothing image analysis — giving higher
// accuracy on category classification, colour naming, and occasion tagging.

export async function aiChatWithImage(
  system: string,
  userMessage: string,
  imageBase64: string
): Promise<{ text: string; backend: AIBackend }> {
  const backend = await detectBackend();

  if (backend === 'ollama') {
    const ollama = new Ollama({ host: OLLAMA_HOST });

    // Prefer fine-tuned clothing model if available
    const useFashionModel = await detectFashionModel();
    const model = useFashionModel ? OLLAMA_FASHION_MODEL : OLLAMA_MODEL;

    const res = await ollama.chat({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userMessage, images: [imageBase64] },
      ],
      format: 'json',
      options: { temperature: 0.1 }, // lower temp for fine-tuned classifier
    });
    return {
      text: res.message.content,
      backend: useFashionModel ? ('ollama-finetuned' as AIBackend) : backend,
    };
  }

  if (backend === 'groq') {
    try {
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const res = await groq.chat.completions.create({
        model: GROQ_VISION_MODEL,
        messages: [
          { role: 'system', content: system + '\n\nIMPORTANT: Reply with valid JSON only, no markdown fences.' },
          {
            role: 'user',
            content: [
              { type: 'text', text: userMessage },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
            ],
          },
        ],
        temperature: 0.3,
        max_tokens: 400,
      });
      return { text: res.choices[0].message.content ?? '{}', backend };
    } catch (e: unknown) {
      const status = (e as { status?: number }).status;
      if (status === 401) throw new Error('GROQ_API_KEY is invalid or not set. Add it in Vercel → Project Settings → Environment Variables.');
      if (status === 429) throw new Error('Groq rate limit reached. Try again in a moment.');
      throw e;
    }
  }

  throw new Error('AI offline. Add GROQ_API_KEY to Vercel environment variables, or run Ollama locally.');
}

// ─── JSON parse helper ────────────────────────────────────────────────────────

export function safeParseJSON(raw: string): unknown {
  const cleaned = raw
    .replace(/^```(?:json)?\n?/m, '')
    .replace(/\n?```$/m, '')
    .trim();
  try { return JSON.parse(cleaned); }
  catch { return JSON.parse(raw); }
}
