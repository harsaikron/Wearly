'use client';

import { useEffect, useState } from 'react';
import { Cpu, CheckCircle, XCircle, Cloud, Loader } from 'lucide-react';

interface Health {
  backend: 'ollama' | 'groq' | 'none';
  model: string;
  model_ready: boolean;
}

export default function AIStatus() {
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth({ backend: 'none', model: 'unavailable', model_ready: false }));
  }, []);

  if (!health) return null;

  const config = {
    ollama: {
      icon: <Cpu size={13} />,
      label: 'Gemma 4 · Local',
      color: '#16a34a',
      bg: 'rgba(22,163,74,0.08)',
      border: 'rgba(22,163,74,0.2)',
    },
    groq: {
      icon: <Cloud size={13} />,
      label: 'Gemma 4 · Groq',
      color: '#0369a1',
      bg: 'rgba(3,105,161,0.08)',
      border: 'rgba(3,105,161,0.2)',
    },
    none: {
      icon: <XCircle size={13} />,
      label: 'AI offline',
      color: '#dc2626',
      bg: 'rgba(220,38,38,0.06)',
      border: 'rgba(220,38,38,0.2)',
    },
  }[health.backend];

  return (
    <div
      className="fixed bottom-[calc(60px+env(safe-area-inset-bottom)+8px)] md:bottom-4 right-4 z-40 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium float"
      style={{
        background: config.bg,
        border: `1px solid ${config.border}`,
        color: config.color,
        boxShadow: 'var(--shadow-sm)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {config.icon}
      {!health.model_ready && health.backend !== 'none' ? (
        <><Loader size={12} className="animate-spin" /><span>Loading model…</span></>
      ) : (
        <>
          {health.model_ready ? <CheckCircle size={12} /> : null}
          <span>{config.label}</span>
        </>
      )}
    </div>
  );
}
