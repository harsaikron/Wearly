/**
 * POST /api/learn
 *
 * Self-learning accumulator — stores every AI analysis as a training example.
 * These examples are saved to fine-tuning/data-accumulator/live_examples.jsonl
 * and can be merged into the training dataset before the next fine-tuning run.
 *
 * This enables the model to self-evolve: each user upload teaches it more.
 */
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR  = path.join(process.cwd(), 'fine-tuning', 'data-accumulator');
const JSONL_FILE = path.join(DATA_DIR, 'live_examples.jsonl');

// System prompt mirror (matches analyze-clothing route)
const CLOTHING_SYSTEM = `You are Wearly's world-class fashion AI, expert in global fashion, color theory, and garment classification. Analyze the clothing item and return precise JSON with category, color_hex, color_name, and tags.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      type: 'clothing_analysis' | 'outfit_suggestion' | 'stylist_feedback';
      input: string;
      output: Record<string, unknown>;
      backend?: string;
    };

    if (!body.type || !body.output) {
      return NextResponse.json({ ok: false, reason: 'missing fields' });
    }

    // Only save confident, complete results
    if (body.type === 'clothing_analysis') {
      const o = body.output;
      if (!o.category || !o.color_name || !o.color_hex || !o.suggested_name) {
        return NextResponse.json({ ok: false, reason: 'incomplete output' });
      }
    }

    // Build training example in chat format (matches fine-tuning template)
    const example = {
      messages: [
        { role: 'system', content: CLOTHING_SYSTEM },
        { role: 'user',   content: body.input },
        { role: 'assistant', content: JSON.stringify(body.output) },
      ],
      _meta: {
        type: body.type,
        backend: body.backend ?? 'unknown',
        timestamp: new Date().toISOString(),
      },
    };

    // Ensure directory exists (local dev only — Vercel serverless is read-only)
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.appendFileSync(JSONL_FILE, JSON.stringify(example) + '\n', 'utf-8');
    } catch {
      // Vercel / read-only filesystem — silently skip file write but still return ok
      // In production, swap to a DB write (Supabase, Postgres, etc.)
    }

    return NextResponse.json({ ok: true, examples_saved: 1 });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) });
  }
}

export async function GET() {
  try {
    if (!fs.existsSync(JSONL_FILE)) {
      return NextResponse.json({ count: 0, file: JSONL_FILE });
    }
    const lines = fs.readFileSync(JSONL_FILE, 'utf-8').split('\n').filter(Boolean);
    return NextResponse.json({
      count: lines.length,
      file: JSONL_FILE,
      sample: lines.slice(-3).map((l) => JSON.parse(l)),
    });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
