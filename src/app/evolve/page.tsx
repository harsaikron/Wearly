'use client';

import { useState, useEffect } from 'react';
import { Sparkles, GitPullRequest, Loader, CheckCircle2, XCircle, FileCode, MessageSquare, ExternalLink, ChevronDown, ChevronUp, Zap } from 'lucide-react';

interface PRRecord {
  id: string;
  feedback: string;
  pr_title: string;
  pr_url: string;
  pr_number: number;
  files_changed: string[];
  review_comment: string;
  created_at: string;
  status: 'open' | 'merged' | 'error';
}

type Step = 'idle' | 'reading' | 'generating' | 'creating_pr' | 'reviewing' | 'done' | 'error';

const STEP_LABELS: Record<Step, string> = {
  idle:        '',
  reading:     'Reading current codebase…',
  generating:  'Gemma 4 is generating code changes…',
  creating_pr: 'Creating GitHub Pull Request…',
  reviewing:   'Gemma 4 is reviewing the PR…',
  done:        'Done!',
  error:       'Something went wrong',
};

const EXAMPLES = [
  'Add a dark mode toggle to the navbar',
  'Make the wardrobe grid show item colors more prominently',
  'Add a "most worn" badge to clothing cards',
  'Improve the stylist chat with typing indicators',
  'Add a greeting message with today\'s date to the home page',
  'Make quick prompt buttons wrap better on mobile',
];

export default function EvolvePage() {
  const [feedback, setFeedback]     = useState('');
  const [step, setStep]             = useState<Step>('idle');
  const [error, setError]           = useState('');
  const [latest, setLatest]         = useState<PRRecord | null>(null);
  const [history, setHistory]       = useState<PRRecord[]>([]);
  const [expanded, setExpanded]     = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('wearly-evolve-history');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  function saveHistory(records: PRRecord[]) {
    setHistory(records);
    localStorage.setItem('wearly-evolve-history', JSON.stringify(records));
  }

  async function handleSubmit() {
    if (!feedback.trim() || step !== 'idle') return;

    setError('');
    setLatest(null);

    setStep('reading');
    await delay(600);
    setStep('generating');

    let result: {
      pr_url: string; pr_number: number; pr_title: string;
      files_changed: string[]; review_comment: string;
    } | null = null;

    try {
      const res = await fetch('/api/evolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback }),
      });

      setStep('creating_pr');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Evolution failed');

      result = data;
      setStep('reviewing');
      await delay(400);

      const record: PRRecord = {
        id:             crypto.randomUUID(),
        feedback,
        pr_title:       result!.pr_title,
        pr_url:         result!.pr_url,
        pr_number:      result!.pr_number,
        files_changed:  result!.files_changed,
        review_comment: result!.review_comment,
        created_at:     new Date().toISOString(),
        status:         'open',
      };

      setLatest(record);
      saveHistory([record, ...history]);
      setStep('done');
      setFeedback('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
      setStep('error');
    }

    setTimeout(() => setStep('idle'), 3000);
  }

  const isRunning = !['idle', 'done', 'error'].includes(step);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 animate-fade-in">

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)' }}
          >
            <Zap size={20} style={{ color: '#fff' }} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>
              App Evolution
            </h1>
          </div>
        </div>
        <p className="text-sm leading-relaxed mt-2" style={{ color: 'var(--muted)', maxWidth: 520 }}>
          Describe what you&apos;d like to improve. <strong style={{ color: 'var(--foreground)' }}>Gemma 4</strong> reads
          the codebase, writes the code changes, opens a GitHub Pull Request, and then reviews its own work.
        </p>
      </div>

      {/* Feedback form */}
      <div
        className="rounded-2xl overflow-hidden mb-6"
        style={{ background: 'var(--card)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-sm)' }}
      >
        <div className="p-5">
          <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--muted)' }}>
            YOUR FEEDBACK
          </label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="e.g. Add a dark mode toggle, show last worn date more clearly, improve mobile layout…"
            rows={4}
            disabled={isRunning}
            className="w-full bg-transparent outline-none text-sm resize-none disabled:opacity-50"
            style={{ color: 'var(--foreground)', lineHeight: 1.6 }}
          />
        </div>

        {/* Examples */}
        <div className="px-5 pb-4">
          <p className="text-xs mb-2" style={{ color: 'var(--muted)' }}>Try an example:</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => setFeedback(ex)}
                disabled={isRunning}
                className="px-3 py-1 rounded-full text-xs font-medium transition-all hover:opacity-80 disabled:opacity-40"
                style={{
                  background: 'var(--muted-bg)',
                  border: '1px solid var(--card-border)',
                  color: 'var(--muted)',
                }}
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{ borderTop: '1px solid var(--card-border)' }}
        >
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Gemma 4 will create a GitHub PR you can review before merging.
          </p>
          <button
            onClick={handleSubmit}
            disabled={!feedback.trim() || isRunning}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm disabled:opacity-40 transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)', color: '#fff', boxShadow: '0 2px 8px rgba(99,102,241,0.3)' }}
          >
            {isRunning ? <Loader size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {isRunning ? 'Evolving…' : 'Evolve with AI'}
          </button>
        </div>
      </div>

      {/* Progress steps */}
      {step !== 'idle' && (
        <div
          className="rounded-2xl p-5 mb-6"
          style={{
            background: step === 'error' ? 'rgba(239,68,68,0.04)' : 'var(--accent-muted)',
            border: `1px solid ${step === 'error' ? 'rgba(239,68,68,0.2)' : 'rgba(99,102,241,0.2)'}`,
          }}
        >
          {step === 'done' ? (
            <div className="flex items-center gap-3">
              <CheckCircle2 size={20} style={{ color: '#16a34a' }} />
              <p className="font-semibold text-sm" style={{ color: '#16a34a' }}>
                Pull Request created — Gemma 4 reviewed it below!
              </p>
            </div>
          ) : step === 'error' ? (
            <div className="flex items-start gap-3">
              <XCircle size={20} className="shrink-0 mt-0.5" style={{ color: '#dc2626' }} />
              <div>
                <p className="font-semibold text-sm" style={{ color: '#dc2626' }}>Evolution failed</p>
                <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{error}</p>
                {error.includes('GITHUB_TOKEN') && (
                  <p className="text-xs mt-2 font-medium" style={{ color: '#6366f1' }}>
                    Add GITHUB_TOKEN to your .env.local file. Get it at github.com → Settings → Developer Settings → Personal Access Tokens.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {(['reading', 'generating', 'creating_pr', 'reviewing'] as Step[]).map((s, i) => {
                const steps: Step[] = ['reading', 'generating', 'creating_pr', 'reviewing'];
                const idx  = steps.indexOf(step);
                const thisIdx = i;
                const done = thisIdx < idx;
                const active = thisIdx === idx;
                return (
                  <div key={s} className="flex items-center gap-3">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        background: done ? '#16a34a' : active ? 'var(--accent)' : 'var(--card-border)',
                      }}
                    >
                      {done ? (
                        <CheckCircle2 size={14} style={{ color: '#fff' }} />
                      ) : active ? (
                        <Loader size={13} className="animate-spin" style={{ color: '#fff' }} />
                      ) : (
                        <span className="text-xs font-bold" style={{ color: 'var(--muted)' }}>{i + 1}</span>
                      )}
                    </div>
                    <p
                      className="text-sm"
                      style={{
                        color: done ? '#16a34a' : active ? 'var(--foreground)' : 'var(--muted)',
                        fontWeight: active ? 600 : 400,
                      }}
                    >
                      {STEP_LABELS[s]}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Latest PR result */}
      {latest && (
        <div
          className="rounded-2xl overflow-hidden mb-6"
          style={{ background: 'var(--card)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-sm)' }}
        >
          <div className="p-5">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <GitPullRequest size={16} style={{ color: 'var(--accent)' }} />
                  <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
                    PR #{latest.pr_number} opened
                  </span>
                </div>
                <h3 className="font-bold text-base" style={{ color: 'var(--foreground)' }}>
                  {latest.pr_title}
                </h3>
              </div>
              <a
                href={latest.pr_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)', color: '#fff' }}
              >
                View PR <ExternalLink size={11} />
              </a>
            </div>

            {/* Files changed */}
            <div className="mb-4">
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--muted)' }}>FILES CHANGED</p>
              <div className="flex flex-col gap-1">
                {latest.files_changed.map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <FileCode size={13} style={{ color: 'var(--accent)' }} />
                    <code className="text-xs" style={{ color: 'var(--foreground)' }}>{f}</code>
                  </div>
                ))}
              </div>
            </div>

            {/* AI review */}
            <div
              className="rounded-xl p-4"
              style={{ background: 'var(--muted-bg)', border: '1px solid var(--card-border)' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare size={13} style={{ color: 'var(--accent)' }} />
                <p className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
                  Gemma 4 Code Review
                </p>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--foreground)' }}>
                {latest.review_comment}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--foreground)' }}>
            Evolution History
          </h2>
          <div className="flex flex-col gap-3">
            {history.map((rec) => (
              <div
                key={rec.id}
                className="rounded-2xl overflow-hidden"
                style={{ background: 'var(--card)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-sm)' }}
              >
                <button
                  onClick={() => setExpanded(expanded === rec.id ? null : rec.id)}
                  className="w-full p-4 flex items-center justify-between text-left"
                >
                  <div className="flex items-start gap-3">
                    <GitPullRequest size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--accent)' }} />
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                        {rec.pr_title}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                        {new Date(rec.created_at).toLocaleDateString('en-SG', {
                          day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                        &nbsp;·&nbsp;PR #{rec.pr_number}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{
                        background: 'rgba(99,102,241,0.08)',
                        color: 'var(--accent)',
                        border: '1px solid rgba(99,102,241,0.2)',
                      }}
                    >
                      open
                    </span>
                    {expanded === rec.id ? <ChevronUp size={15} style={{ color: 'var(--muted)' }} /> : <ChevronDown size={15} style={{ color: 'var(--muted)' }} />}
                  </div>
                </button>

                {expanded === rec.id && (
                  <div
                    className="px-4 pb-4 flex flex-col gap-3"
                    style={{ borderTop: '1px solid var(--card-border)', paddingTop: 12 }}
                  >
                    <div>
                      <p className="text-xs font-semibold mb-1" style={{ color: 'var(--muted)' }}>YOUR FEEDBACK</p>
                      <p className="text-sm italic" style={{ color: 'var(--foreground)' }}>&ldquo;{rec.feedback}&rdquo;</p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold mb-1" style={{ color: 'var(--muted)' }}>FILES CHANGED</p>
                      {rec.files_changed.map((f) => (
                        <div key={f} className="flex items-center gap-2">
                          <FileCode size={12} style={{ color: 'var(--accent)' }} />
                          <code className="text-xs" style={{ color: 'var(--foreground)' }}>{f}</code>
                        </div>
                      ))}
                    </div>

                    <div
                      className="rounded-xl p-3"
                      style={{ background: 'var(--muted-bg)', border: '1px solid var(--card-border)' }}
                    >
                      <p className="text-xs font-semibold mb-1" style={{ color: 'var(--accent)' }}>Gemma 4 Review</p>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--foreground)' }}>
                        {rec.review_comment}
                      </p>
                    </div>

                    <a
                      href={rec.pr_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs font-semibold w-fit"
                      style={{ color: 'var(--accent)' }}
                    >
                      View on GitHub <ExternalLink size={11} />
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty history */}
      {history.length === 0 && step === 'idle' && (
        <div
          className="rounded-2xl p-10 flex flex-col items-center text-center mt-4"
          style={{ background: 'var(--card)', border: '2px dashed var(--card-border)' }}
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
            style={{ background: 'var(--accent-muted)' }}
          >
            <GitPullRequest size={24} style={{ color: 'var(--accent)' }} />
          </div>
          <p className="font-semibold text-sm mb-1" style={{ color: 'var(--foreground)' }}>
            No evolutions yet
          </p>
          <p className="text-xs" style={{ color: 'var(--muted)', maxWidth: 280 }}>
            Submit feedback above. Gemma 4 will write the code and open a PR — you review and merge it.
          </p>
        </div>
      )}
    </div>
  );
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
