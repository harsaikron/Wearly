/**
 * POST /api/evolve
 *
 * Self-evolving pipeline:
 *   1. User submits a feature idea (title + description + category)
 *   2. Gemma AI drafts a full implementation plan
 *   3. GitHub PR is created automatically with the plan as the PR body
 *      and a markdown spec file committed to features/
 *
 * Requires: GITHUB_TOKEN env var (fine-grained PAT with Contents + PRs write)
 * Repo:     harsaikron/Wearly
 */
import { NextRequest, NextResponse } from 'next/server';
import { aiChatText } from '@/lib/ai-client';

const REPO  = 'harsaikron/Wearly';
const GH    = 'https://api.github.com';
const TOKEN = process.env.GITHUB_TOKEN;

const PLAN_SYSTEM = `You are a senior Next.js / TypeScript / Tailwind CSS engineer working on "Wearly",
an AI-powered wardrobe & beauty styling app. A user has submitted a feature request.

Generate a detailed, actionable implementation plan that includes:
1. Feature summary (2-3 sentences)
2. Files to create or modify (with exact paths like src/app/profile/page.tsx)
3. Data model changes (TypeScript types, Zustand store fields if needed)
4. UI component breakdown (props, layout description, key interactions)
5. API route design if needed (endpoint path, request/response JSON shape)
6. AI prompt changes if this needs Gemma/Groq updates
7. Estimated complexity: Low / Medium / High and why
8. Acceptance criteria (bullet list of what done looks like)

Be specific about names. Do NOT write actual TypeScript/JSX code — write a clear plan.`;

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
}

function ghHeaders() {
  return {
    Authorization: `Bearer ${TOKEN}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  };
}

async function getMainSha(): Promise<string> {
  const res = await fetch(`${GH}/repos/${REPO}/git/ref/heads/main`, { headers: ghHeaders() });
  if (!res.ok) throw new Error(`GitHub: cannot get main SHA (HTTP ${res.status})`);
  const data = await res.json() as { object: { sha: string } };
  return data.object.sha;
}

async function createBranch(branchName: string, sha: string) {
  const res = await fetch(`${GH}/repos/${REPO}/git/refs`, {
    method: 'POST', headers: ghHeaders(),
    body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw new Error(`GitHub: cannot create branch — ${JSON.stringify(err)}`);
  }
}

async function commitFile(branch: string, path: string, content: string, msg: string) {
  const encoded = Buffer.from(content, 'utf-8').toString('base64');
  const res = await fetch(`${GH}/repos/${REPO}/contents/${path}`, {
    method: 'PUT', headers: ghHeaders(),
    body: JSON.stringify({ message: msg, content: encoded, branch }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw new Error(`GitHub: cannot commit file — ${JSON.stringify(err)}`);
  }
}

async function createPR(branch: string, title: string, body: string): Promise<{ url: string; number: number }> {
  const res = await fetch(`${GH}/repos/${REPO}/pulls`, {
    method: 'POST', headers: ghHeaders(),
    body: JSON.stringify({ title, body, head: branch, base: 'main', draft: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw new Error(`GitHub: cannot create PR — ${JSON.stringify(err)}`);
  }
  const data = await res.json() as { html_url: string; number: number };
  return { url: data.html_url, number: data.number };
}

export async function POST(req: NextRequest) {
  try {
    const { title, description, category, featureId } = await req.json() as {
      title: string; description: string; category: string; featureId: string;
    };

    if (!title?.trim() || !description?.trim()) {
      return NextResponse.json({ error: 'title and description are required' }, { status: 400 });
    }

    // ── 1. Gemma AI generates the implementation plan ─────────────
    const userMsg = `Feature Request — ${category}\n\nTitle: ${title}\n\nDescription:\n${description}\n\nPlease write the full implementation plan.`;
    const { text: aiPlan } = await aiChatText(PLAN_SYSTEM, userMsg, { temperature: 0.35, maxTokens: 1800 });

    // ── 2. Create GitHub PR (skip if token placeholder) ───────────
    const tokenReady = TOKEN && TOKEN !== 'your_github_token' && TOKEN.length > 10;
    if (!tokenReady) {
      return NextResponse.json({ aiPlan, prCreated: false, reason: 'GITHUB_TOKEN not configured — add your PAT to .env.local' });
    }

    const slug       = slugify(title);
    const ts         = Date.now();
    const branchName = `feature/user-${ts}-${slug}`;
    const filePath   = `features/${ts}-${slug}.md`;

    const fileContent = `# [User Request] ${title}

> **Category:** ${category}
> **Submitted:** ${new Date().toISOString()}
> **Feature ID:** ${featureId}

## What the user wants

${description}

---

## AI Implementation Plan

${aiPlan}

---

*Auto-generated by Wearly's self-evolving pipeline via /api/evolve*
`;

    const prBody = `## 🚀 User Feature Request

**Category:** \`${category}\`
**Submitted:** ${new Date().toLocaleDateString('en-SG')}

### User's description

> ${description.split('\n').join('\n> ')}

---

### 🤖 Gemma AI Implementation Plan

${aiPlan}

---

> Created automatically by Wearly's self-evolving pipeline.
> Spec: \`${filePath}\` on branch \`${branchName}\`

/cc @harsaikron`;

    const mainSha = await getMainSha();
    await createBranch(branchName, mainSha);
    await commitFile(branchName, filePath, fileContent, `feat: user request — ${title}`);
    const { url: prUrl, number: prNumber } = await createPR(
      branchName,
      `[User Request] ${title}`,
      prBody
    );

    return NextResponse.json({ aiPlan, prCreated: true, prUrl, prNumber, branchName });

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Evolve pipeline failed';
    console.error('[/api/evolve]', msg);
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
