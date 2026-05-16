'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  isActive: boolean;
  weather?: { temperature?: number; description?: string; condition?: string; humidity?: number } | null;
}

const FALLBACK_WEATHER = { temperature: 31, description: 'Humid and sunny', condition: 'hot', city: 'Singapore', humidity: 84 };

export default function MirrorSlide({ isActive, weather }: Props) {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [narration, setNarration]       = useState('');
  const [loading, setLoading]           = useState(false);
  const [permDenied, setPermDenied]     = useState(false);

  async function captureAndAnalyse() {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;
    const canvas = document.createElement('canvas');
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64 = canvas.toDataURL('image/jpeg', 0.7).replace(/^data:[^;]+;base64,/, '');

    try {
      const res = await fetch('/api/stylist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: "I'm standing in front of a mirror. Look at what I'm wearing and do three things: 1) Identify the exact colours of my outfit pieces (top, dress, jacket, etc.) and describe the fabric/style briefly. 2) Suggest 2 specific matching bottom options (pants, skirts, shorts) that would pair well with the colours you see — include the colour and style. 3) Suggest 2-3 accessories (bag, shoes, jewellery, belt, etc.) with specific colours and styles that complete the look. Keep it warm, friendly and actionable.",
          photo_base64: base64,
          weather: weather
            ? { temperature: weather.temperature, description: weather.description, condition: weather.condition, humidity: weather.humidity, city: 'Singapore' }
            : FALLBACK_WEATHER,
          wardrobe: [],
        }),
      });
      const data = await res.json();
      if (data.message) setNarration(data.message);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setPermDenied(false);

      // First capture after 2 s
      setLoading(true);
      setTimeout(captureAndAnalyse, 2000);

      // Then every 8 s
      intervalRef.current = setInterval(captureAndAnalyse, 8000);
    } catch {
      setPermDenied(true);
    }
  }

  function stopCamera() {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  useEffect(() => {
    if (isActive) {
      startCamera();
    } else {
      stopCamera();
    }
    return stopCamera;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  if (permDenied) {
    return (
      <div style={{ width: '100%', height: '100%', background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 }}>
        <span style={{ fontSize: 40 }}>📷</span>
        <p style={{ color: '#fff', fontWeight: 700, fontSize: 18, textAlign: 'center' }}>Camera access denied</p>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, textAlign: 'center', lineHeight: 1.6 }}>
          To use Mirror Mode, allow camera access in your browser settings and reload the page.
        </p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000', overflow: 'hidden' }}>
      {/* Video */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
      />

      {/* Top label */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '48px 20px 12px', zIndex: 10, background: 'linear-gradient(to bottom, rgba(0,0,0,0.55), transparent)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 3, borderRadius: 2, background: '#A8D060' }} />
          <p style={{ color: '#A8D060', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
            Mirror Mode
          </p>
        </div>
      </div>

      {/* Analysing indicator (first load) */}
      {loading && !narration && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
          <div style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', borderRadius: 16, padding: '14px 22px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#A8D060', animation: 'pulse 1.2s ease-in-out infinite' }} />
            <p style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>Analysing your look…</p>
          </div>
        </div>
      )}

      {/* Bottom narration overlay */}
      {narration && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
          background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)',
          padding: '60px 20px 32px',
        }}>
          <p style={{ color: '#fff', fontSize: 14, lineHeight: 1.65, fontWeight: 400 }}>{narration}</p>
        </div>
      )}

      {/* Refresh button */}
      <button
        onClick={() => { setLoading(true); captureAndAnalyse(); }}
        style={{
          position: 'absolute', bottom: narration ? 'calc(100% - 88%)' : 28, right: 16,
          zIndex: 20, background: 'rgba(168,208,96,0.18)', border: '1px solid rgba(168,208,96,0.45)',
          borderRadius: 10, padding: '8px 14px', color: '#A8D060', fontSize: 12, fontWeight: 700,
          cursor: 'pointer', backdropFilter: 'blur(8px)',
        }}
      >
        {loading ? '…' : 'Refresh'}
      </button>
    </div>
  );
}
