import { Ollama } from 'ollama';

export const MODEL       = 'gemma4:e4b';
export const OLLAMA_HOST = process.env.OLLAMA_HOST ?? 'http://localhost:11434';

export const ollama = new Ollama({ host: OLLAMA_HOST });

export async function isOllamaRunning(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_HOST}/api/tags`, { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function chat(
  system: string,
  userMessage: string,
  format: 'json' | 'text' = 'json'
): Promise<string> {
  const response = await ollama.chat({
    model: MODEL,
    messages: [
      { role: 'system', content: system },
      { role: 'user',   content: userMessage },
    ],
    ...(format === 'json' ? { format: 'json' } : {}),
    options: { temperature: 0.7 },
  });
  return response.message.content;
}

export async function chatWithImage(
  system: string,
  userMessage: string,
  imageBase64: string
): Promise<string> {
  const response = await ollama.chat({
    model: MODEL,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: userMessage, images: [imageBase64] },
    ],
    format: 'json',
    options: { temperature: 0.3 },
  });
  return response.message.content;
}
