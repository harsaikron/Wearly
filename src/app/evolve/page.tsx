'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Sparkles, GitPullRequest, Loader, CheckCircle2, XCircle,
  FileCode, ExternalLink, Zap, Send, ChevronDown, ChevronUp,
  Code2, MessageSquare,
} from 'lucide-react';

type Role = 'user' | 'assistant' | 'system';

interface ChatMessage {
  id: string;
  role: Role;
  text: string;
  ts: number;
  result?: PRResult;
  preview?: PreviewResult;
  loading?: boolean;
}

interface PRResult {
  pr_url: string;
  pr_number: number;
  pr_title: string;
  files_changed: string[];
  review_comment: string;
  branch: string;
}

interface PreviewResult {
  pr_title: string;
  files_changed: string[];
  review_comment: string;
  preview_changes: { file: string; summary: string }[];
}

const EXAMPLES = [
  'Add a dark mode toggle to the navbar',
  'Show last worn date on clothing cards',
  'Add typing indicator to the AI stylist chat',
  'Improve mobile layout of the wardrobe grid',
  'Add a greeting with today\'s date on the home page',
  'Make quick prompt buttons more colourful',
];

function uid() { return Math.random().toString(36).slice(2); }

function CodeCard({
  files,
  review,
  previews,
}: {
  files: string[];
  review: string;
  previews?: { file: string; summary: string }[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="rounded-xl overflow-hidden mt-2"
      style={{ background: 'var(--muted-bg)', border: '1px solid var(--card-border)' }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left"
      >
        <div className="flex items-center gap-2">
          <Code2 size={13} style={{ color: 'var(--accent)' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>
            {files.length} file{files.length !== 1 ? 's' : ''} to change
          </span>
        </div>
        {open ? <ChevronUp size={13} style={{ color: 'var(--muted)' }} /> : <ChevronDown size={13} style={{ color: 'var(--muted)' }} />}
      </button>

      {open && (
        <div className="px-3 pb-3 flex flex-col gap-2">
          {files.map((f) => (
            <div key={f} className="flex items-center gap-2">
              <FileCode size={12} style={{ color: 'var(--accent)' }} />
              <code className="text-xs" style={{ color: 'var(--foreground)' }}>{f}</code>
              {previews?.find((p) => p.file === f) && (
                <span className="text-xs ml-auto" style={{ color: 'var(--muted)' }}>
                  {previews.find((p) => p.file === f)?.summary}
                </span>
              )}
            </div>
          ))}
          <div className="mt-1 pt-2" style={{ borderTop: '1px solid var(--card-border)' }}>
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare size={11} style={{ color: 'var(--accent)' }} />
              <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>AI Review</span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--foreground)' }}>{review}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EvolvePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: uid(), role: 'system', ts: Date.now(),
      text: 'Hi! I\'m your **Wearly AI** — describe any feature, improvement, or fix you\'d like. I\'ll plan the code changes and create a GitHub PR for your review.\n\nYou can also try one of the examples below.',
    },
  ]);
  const [input, setInput]         = useState('');
  const [busy, setBusy]           = useState(false);
  const [hasToken, setHasToken]   = useState<boolean | null>(null);
  const bottomRef                 = useRef<HTMLDivElement>(null);
  const inputRef                  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch('/api/health').then((r) => r.json()).then((d) => {
      setHasToken(!!d.github_token);
    }).catch(() => setHasToken(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function addMsg(msg: Omit<ChatMessage, 'id' | 'ts'>) {
    const full: ChatMessage = { id: uid(), ts: Date.now(), ...msg };
    setMessages((prev) => [...prev, full]);
    return full.id;
  }

  function updateMsg(id: string, patch: Partial<ChatMessage>) {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }

  async function send(text?: string) {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    setInput('');
    setBusy(true);

    addMsg({ role: 'user', text: q });

    const thinkingId = addMsg({
      role: 'assistant',
      text: 'Analysing your request and reading the codebase…',
      loading: true,
    });

    try {
      const res = await fetch('/api/evolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback: q }),
      });

      const data = await res.json();

      if (!res.ok) {
        updateMsg(thinkingId, {
          loading: false,
          role: 'assistant',
          text: data.error ?? 'Something went wrong. Try rephrasing your request.',
        });
        return;
      }

      if (data.preview) {
        // Preview mode — no GitHub token
        const p = data as { preview: PreviewResult };
        updateMsg(thinkingId, {
          loading: false,
          text: `I've planned the changes for: **${p.preview.pr_title}**\n\nI'll modify ${p.preview.files_changed.length} file${p.preview.files_changed.length !== 1 ? 's' : ''}. To create a real GitHub PR, add **GITHUB_TOKEN** to your environment variables.\n\nHere's what I'd change:`,
          preview: p.preview,
        });
      } else {
        // Full PR created
        const pr = data as PRResult;
        updateMsg(thinkingId, {
          loading: false,
          text: `Done! I've created **PR #${pr.pr_number}: ${pr.pr_title}** — review and merge it on GitHub to ship the change.`,
          result: pr,
        });
      }
    } catch {
      updateMsg(thinkingId, {
        loading: false,
        text: 'Network error. Make sure the app is running and try again.',
      });
    } finally {
      setBusy(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  function renderText(text: string) {
    return text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
      part.startsWith('**') && part.endsWith('**')
        ? <strong key={i} style={{ color: 'var(--foreground)' }}>{part.slice(2, -2)}</strong>
        : <span key={i}>{part}</span>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 animate-fade-in flex flex-col" style={{ minHeight: 'calc(100vh - 64px)' }}>

      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)' }}
        >
          <Zap size={20} style={{ color: '#fff' }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>App Evolution</h1>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            {hasToken === true
              ? 'Connected to GitHub — will create real PRs'
              : hasToken === false
              ? 'Preview mode — add GITHUB_TOKEN to create real PRs'
              : 'Checking GitHub connection…'}
          </p>
        </div>
        {hasToken !== null && (
          <span
            className="ml-auto px-2.5 py-1 rounded-full text-xs font-semibold"
            style={hasToken
              ? { background: 'rgba(22,163,74,0.1)', color: '#16a34a', border: '1px solid rgba(22,163,74,0.25)' }
              : { background: 'rgba(245,158,11,0.1)', color: '#d97706', border: '1px solid rgba(245,158,11,0.25)' }}
          >
            {hasToken ? '● GitHub' : '◌ Preview'}
          </span>
        )}
      </div>

      {/* Chat window */}
      <div
        className="flex-1 rounded-2xl overflow-y-auto p-4 flex flex-col gap-4 mb-4"
        style={{ background: 'var(--card)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-sm)', minHeight: 360, maxHeight: '55vh' }}
      >
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className="max-w-[85%] rounded-2xl px-4 py-3"
              style={msg.role === 'user'
                ? { background: 'linear-gradient(135deg, #6366f1, #818cf8)', color: '#fff', borderBottomRightRadius: 6 }
                : { background: 'var(--muted-bg)', border: '1px solid var(--card-border)', borderBottomLeftRadius: 6 }
              }
            >
              {msg.loading ? (
                <div className="flex items-center gap-2">
                  <Loader size={13} className="animate-spin" style={{ color: 'var(--accent)' }} />
                  <span className="text-sm" style={{ color: 'var(--muted)' }}>{msg.text}</span>
                </div>
              ) : (
                <>
                  <p className="text-sm leading-relaxed" style={{ color: msg.role === 'user' ? '#fff' : 'var(--foreground)', whiteSpace: 'pre-line' }}>
                    {renderText(msg.text)}
                  </p>

                  {/* PR result */}
                  {msg.result && (
                    <div className="mt-3 flex flex-col gap-2">
                      <CodeCard
                        files={msg.result.files_changed}
                        review={msg.result.review_comment}
                      />
                      <a
                        href={msg.result.pr_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold justify-center transition-all hover:opacity-90"
                        style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)', color: '#fff' }}
                      >
                        <GitPullRequest size={13} />
                        View PR #{msg.result.pr_number} on GitHub
                        <ExternalLink size={11} />
                      </a>
                    </div>
                  )}

                  {/* Preview result */}
                  {msg.preview && (
                    <div className="mt-3">
                      <CodeCard
                        files={msg.preview.files_changed}
                        review={msg.preview.review_comment}
                        previews={msg.preview.preview_changes}
                      />
                      <div
                        className="mt-2 px-3 py-2 rounded-xl text-xs"
                        style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#d97706' }}
                      >
                        Add <code className="font-mono px-1 rounded" style={{ background: 'rgba(245,158,11,0.15)' }}>GITHUB_TOKEN</code> to create a real PR. Get it at GitHub → Settings → Developer Settings → Personal Access Tokens.
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}

        {/* Status icons for done/error */}
        {messages.length > 1 && !busy && (() => {
          const last = messages[messages.length - 1];
          if (last.result) return (
            <div className="flex items-center gap-2 justify-center">
              <CheckCircle2 size={16} style={{ color: '#16a34a' }} />
              <span className="text-xs font-semibold" style={{ color: '#16a34a' }}>PR created successfully</span>
            </div>
          );
          return null;
        })()}

        <div ref={bottomRef} />
      </div>

      {/* Examples */}
      {messages.length <= 1 && (
        <div className="mb-3">
          <p className="text-xs mb-2" style={{ color: 'var(--muted)' }}>Try an example:</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => send(ex)}
                disabled={busy}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:opacity-80 disabled:opacity-40 text-left"
                style={{ background: 'var(--card)', border: '1px solid var(--card-border)', color: 'var(--accent)', boxShadow: 'var(--shadow-sm)' }}
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div
        className="flex items-end gap-3 rounded-2xl px-4 py-3"
        style={{ background: 'var(--card)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-sm)' }}
      >
        <Sparkles size={16} className="mt-1 shrink-0" style={{ color: 'var(--accent)' }} />
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Describe what you'd like to add or improve… (Enter to send)"
          rows={2}
          disabled={busy}
          className="flex-1 bg-transparent outline-none text-sm resize-none disabled:opacity-50"
          style={{ color: 'var(--foreground)', lineHeight: 1.5, minHeight: 44, maxHeight: 120 }}
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || busy}
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 disabled:opacity-40 transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)' }}
        >
          {busy ? <Loader size={15} className="animate-spin" style={{ color: '#fff' }} /> : <Send size={15} style={{ color: '#fff' }} />}
        </button>
      </div>

      {/* No-GitHub hint */}
      {hasToken === false && (
        <div
          className="mt-3 px-4 py-3 rounded-xl flex items-start gap-2"
          style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}
        >
          <XCircle size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--accent)' }} />
          <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
            <strong style={{ color: 'var(--foreground)' }}>Preview mode:</strong> I can plan code changes but can&apos;t create GitHub PRs yet.
            Add <code className="px-1 rounded font-mono" style={{ background: 'var(--card-border)', fontSize: 10 }}>GITHUB_TOKEN</code> to{' '}
            <code className="px-1 rounded font-mono" style={{ background: 'var(--card-border)', fontSize: 10 }}>.env.local</code> or Vercel environment variables.
          </p>
        </div>
      )}
    </div>
  );
}
