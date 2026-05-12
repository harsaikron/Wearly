'use client';

import { useEffect, useState } from 'react';
import { Cpu, CheckCircle, XCircle, Loader } from 'lucide-react';

interface Health {
  ollama: boolean;
  model: string;
  model_ready: boolean;
}

export default function OllamaStatus() {
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth({ ollama: false, model: 'gemma3:4b', model_ready: false }));
  }, []);

  if (!health) return null;

  const ok = health.ollama && health.model_ready;

  return (
    <div
      className="fixed bottom-4 right-4 z-40 flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
      style={{
        background: 'var(--card)',
        border: `1px solid ${ok ? 'rgba(160,196,160,0.4)' : 'rgba(217,123,123,0.4)'}`,
        color: ok ? '#a0c4a0' : '#d97b7b',
      }}
    >
      <Cpu size={13} />
      {health.ollama === false ? (
        <>
          <XCircle size={12} />
          <span>Ollama offline</span>
        </>
      ) : !health.model_ready ? (
        <>
          <Loader size={12} className="animate-spin" />
          <span>Pulling {health.model}…</span>
        </>
      ) : (
        <>
          <CheckCircle size={12} />
          <span>{health.model} ready</span>
        </>
      )}
    </div>
  );
}
