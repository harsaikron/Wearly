/**
 * Smart AI client — tries Ollama locally first, falls back to Groq cloud.
 * Local:  gemma3:4b  via Ollama  (no API key, 100% private)
 * Cloud:  gemma2-9b  via Groq    (free tier, needs GROQ_API_KEY)
 */
import { Ollama } from 'ollama';
import Groq from 'groq-sdk';

const OLLAMA_MODEL  = 'gemma3:4b';
const GROQ_TEXT_MODEL   = 'gemma2-9b-it';
const GROQ_VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct'; // Groq vision model

export const OLLAMA_HOST = process.env.OLLAMA_HOST ?? 'http://localhost:11434';

// ─── Backend detection ────────────────────────────────────────────────────────

export type AIBackend = 'ollama' | 'groq' | 'none';

export async function detectBackend(): Promise<AIBackend> {
  // Try Ollama first
  try {
    const res = await fetch(`${OLLAMA_HOST}/api/tags`, {
      signal: AbortSignal.timeout(1500),
    });
    if (res.ok) {
      const data = await res.json() as { models: { name: string }[] };
      const hasModel = data.models?.some((m) => m.name.startsWith('gemma3'));
      if (hasModel) return 'ollama';
    }
  } catch {
    // Ollama not reachable
  }

  // Fall back to Groq
  if (process.env.GROQ_API_KEY) return 'groq';

  return 'none';
}

// ─── Text chat ────────────────────────────────────────────────────────────────

export async function aiChat(
  system: string,
  userMessage: string
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
      options: { temperature: 0.7 },
    });
    return { text: res.message.content, backend };
  }

  if (backend === 'groq') {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const res = await groq.chat.completions.create({
      model: GROQ_TEXT_MODEL,
      messages: [
        { role: 'system', content: system + '\n\nIMPORTANT: Reply with valid JSON only, no markdown fences.' },
        { role: 'user',   content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 800,
      response_format: { type: 'json_object' },
    });
    return { text: res.choices[0].message.content ?? '{}', backend };
  }

  throw new Error('No AI backend available. Run Ollama locally or set GROQ_API_KEY.');
}

// ─── Vision (image) chat ──────────────────────────────────────────────────────

export async function aiChatWithImage(
  system: string,
  userMessage: string,
  imageBase64: string
): Promise<{ text: string; backend: AIBackend }> {
  const backend = await detectBackend();

  if (backend === 'ollama') {
    const ollama = new Ollama({ host: OLLAMA_HOST });
    const res = await ollama.chat({
      model: OLLAMA_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user',   content: userMessage, images: [imageBase64] },
      ],
      format: 'json',
      options: { temperature: 0.3 },
    });
    return { text: res.message.content, backend };
  }

  if (backend === 'groq') {
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
      max_tokens: 300,
    });
    return { text: res.choices[0].message.content ?? '{}', backend };
  }

  throw new Error('No AI backend available. Run Ollama locally or set GROQ_API_KEY.');
}

// ─── JSON parse helper ────────────────────────────────────────────────────────

export function safeParseJSON(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    const cleaned = raw.replace(/```json\n?|```\n?/g, '').trim();
    return JSON.parse(cleaned);
  }
}
