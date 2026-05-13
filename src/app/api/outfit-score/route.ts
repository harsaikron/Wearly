/**
 * POST /api/outfit-score
 *
 * Scores how well a set of clothing items work together (0–100).
 * Uses wearly-outfit-v1 fine-tuned model when available in Ollama,
 * otherwise falls back to base gemma4:e4b or Groq.
 *
 * Body: { items: ClothingItem[], occasion?: string }
 * Response: { score, verdict, reasons, suggestions, _model, _backend }
 */
import { NextRequest, NextResponse } from 'next/server';
import { aiChatOutfit, safeParseJSON } from '@/lib/ai-client';

interface ItemInput {
  name: string;
  category: string;
  color_name: string;
  tags?: string[];
}

const SYSTEM = `You are Wearly's outfit compatibility expert, fine-tuned to score how well clothing items work together.

For every outfit, return ONLY valid JSON — no markdown fences, no explanation:
{
  "score": <integer 0-100>,
  "verdict": "<one sentence summary>",
  "reasons": ["<reason 1>", "<reason 2>", "<reason 3>"],
  "suggestions": ["<improvement 1>", "<improvement 2>"]
}

Score guide: 0-34 poor match, 35-49 needs work, 50-64 decent, 65-79 good, 80-100 excellent.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { items: ItemInput[]; occasion?: string };
    const { items, occasion = 'casual' } = body;

    if (!items || items.length < 2) {
      return NextResponse.json({ error: 'At least 2 items required to score an outfit' }, { status: 400 });
    }

    const itemsBlock = items
      .map((it, i) => {
        const cat  = it.category.replace(/_/g, ' ');
        const tags = it.tags?.join(', ') ?? '';
        return `${i + 1}. ${it.color_name} ${cat}${tags ? ` [${tags}]` : ''}`;
      })
      .join('\n');

    const userMessage = `Rate this outfit for the '${occasion.replace(/_/g, ' ')}' occasion:\n\n${itemsBlock}\n\nReturn ONLY valid JSON.`;

    const { text, backend, modelUsed } = await aiChatOutfit(SYSTEM, userMessage);
    const parsed = safeParseJSON(text);

    return NextResponse.json({
      ...(parsed as object),
      _backend: backend,
      _model:   modelUsed,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Scoring failed';
    console.error('[outfit-score]', msg);
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
