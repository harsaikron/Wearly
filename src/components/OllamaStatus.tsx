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
      label: 'Gemma 3 · Local',
      color: '#a0c4a0',
      borderColor: 'rgba(160,196,160,0.4)',
    },
    groq: {
      icon: <Cloud size={13} />,
      label: 'Gemma 2 · Groq',
      color: '#7c9cbf',
      borderColor: 'rgba(124,156,191,0.4)',
    },
    none: {
      icon: <XCircle size={13} />,
      label: 'AI offline',
      color: '#d97b7b',
      borderColor: 'rgba(217,123,123,0.4)',
    },
  }[health.backend];

  return (
    <div
      className="fixed bottom-4 right-4 z-40 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium"
      style={{
        background: 'var(--card)',
        border: `1px solid ${config.borderColor}`,
        color: config.color,
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
