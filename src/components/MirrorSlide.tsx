'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useProfileStore } from '@/store/profile';

interface Props {
  isActive: boolean;
  weather?: { temperature?: number; description?: string; condition?: string; humidity?: number } | null;
}

const FALLBACK_WEATHER = { temperature: 31, description: 'Humid and sunny', condition: 'hot', city: 'Singapore', humidity: 84 };

// ── Speech synthesis helper ───────────────────────────────────────────────────
function speak(text: string, lang = 'en-SG') {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = lang;
  utt.rate = 0.95;
  utt.pitch = 1.05;
  utt.volume = 1;

  // Prefer a female English voice when available
  const voices = window.speechSynthesis.getVoices();
  const preferred =
    voices.find((v) => v.lang.startsWith('en') && v.name.toLowerCase().includes('female')) ||
    voices.find((v) => v.lang.startsWith('en-SG')) ||
    voices.find((v) => v.lang.startsWith('en-GB')) ||
    voices.find((v) => v.lang.startsWith('en'));
  if (preferred) utt.voice = preferred;

  window.speechSynthesis.speak(utt);
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function MirrorSlide({ isActive, weather }: Props) {
  const userName = useProfileStore((s) => s.name);

  const videoRef    = useRef<HTMLVideoElement>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [narration,   setNarration]   = useState('');
  const [loading,     setLoading]     = useState(false);
  const [permDenied,  setPermDenied]  = useState(false);
  const [muted,       setMuted]       = useState(false);
  const [spokenOnce,  setSpokenOnce]  = useState(false);
  const mutedRef = useRef(false);

  // Keep ref in sync so the interval closure always reads the latest value
  useEffect(() => { mutedRef.current = muted; }, [muted]);

  // ── Speak narration whenever it changes ───────────────────────────────────
  useEffect(() => {
    if (!narration || mutedRef.current) return;

    const greeting = !spokenOnce && userName
      ? `Hi ${userName.split(' ')[0]}! `
      : '';

    speak(greeting + narration);
    if (!spokenOnce) setSpokenOnce(true);
  }, [narration]); // eslint-disable-line react-hooks/exhaustive-deps

  // Stop speech when mirror is deactivated
  useEffect(() => {
    if (!isActive && typeof window !== 'undefined') {
      window.speechSynthesis?.cancel();
    }
  }, [isActive]);

  // ── Capture & analyse ─────────────────────────────────────────────────────
  const captureAndAnalyse = useCallback(async () => {
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
  }, [weather]);

  // ── Camera ────────────────────────────────────────────────────────────────
  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setPermDenied(false);
      setSpokenOnce(false);

      // Greet immediately, first analysis after 2 s
      if (!mutedRef.current && userName) {
        speak(`Hi ${userName.split(' ')[0]}! Let me analyse your outfit for you.`);
      }
      setLoading(true);
      setTimeout(captureAndAnalyse, 2000);

      // Re-analyse every 12 s
      intervalRef.current = setInterval(captureAndAnalyse, 12000);
    } catch {
      setPermDenied(true);
    }
  }

  function stopCamera() {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    window.speechSynthesis?.cancel();
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

  // ── Toggle mute ───────────────────────────────────────────────────────────
  function toggleMute() {
    const next = !muted;
    setMuted(next);
    if (next) {
      window.speechSynthesis?.cancel();
    } else if (narration) {
      // Replay current narration
      const greeting = userName ? `Hi ${userName.split(' ')[0]}! ` : '';
      speak(greeting + narration);
    }
  }

  // ── Manual refresh ────────────────────────────────────────────────────────
  function refresh() {
    setLoading(true);
    captureAndAnalyse();
  }

  // ── Permission denied ─────────────────────────────────────────────────────
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

      {/* Video feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
      />

      {/* Top bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '48px 16px 12px', zIndex: 10, background: 'linear-gradient(to bottom, rgba(0,0,0,0.65), transparent)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 3, borderRadius: 2, background: '#A8D060' }} />
          <p style={{ color: '#A8D060', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
            Mirror Mode
          </p>
        </div>

        {/* Accessibility: mute / unmute voice */}
        <button
          onClick={toggleMute}
          aria-label={muted ? 'Unmute voice feedback' : 'Mute voice feedback'}
          style={{
            width: 36, height: 36, borderRadius: 12,
            background: muted ? 'rgba(255,255,255,0.12)' : 'rgba(168,208,96,0.20)',
            border: muted ? '1px solid rgba(255,255,255,0.18)' : '1px solid rgba(168,208,96,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', backdropFilter: 'blur(8px)',
          }}
        >
          {muted
            ? <VolumeX size={16} color="rgba(255,255,255,0.55)" />
            : <Volume2 size={16} color="#A8D060" />
          }
        </button>
      </div>

      {/* Analysing indicator */}
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
          background: 'linear-gradient(to top, rgba(0,0,0,0.90) 0%, rgba(0,0,0,0.50) 70%, transparent 100%)',
          padding: '60px 18px 90px',
        }}>
          {/* Accessibility label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Volume2 size={12} color={muted ? 'rgba(255,255,255,0.30)' : '#A8D060'} />
            <span style={{ fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: muted ? 'rgba(255,255,255,0.30)' : '#A8D060' }}>
              {muted ? 'Voice off' : 'Voice guidance'}
            </span>
          </div>
          <p
            role="status"
            aria-live="polite"
            style={{ color: '#fff', fontSize: 14, lineHeight: 1.7, fontWeight: 400 }}
          >
            {userName ? <><span style={{ color: '#A8D060', fontWeight: 700 }}>Hi {userName.split(' ')[0]}!</span>{' '}</> : null}
            {narration}
          </p>
        </div>
      )}

      {/* Refresh button */}
      <button
        onClick={refresh}
        aria-label="Refresh outfit analysis"
        style={{
          position: 'absolute',
          bottom: 28,
          right: 16,
          zIndex: 20,
          background: 'rgba(168,208,96,0.18)',
          border: '1px solid rgba(168,208,96,0.45)',
          borderRadius: 10, padding: '8px 14px',
          color: '#A8D060', fontSize: 12, fontWeight: 700,
          cursor: 'pointer', backdropFilter: 'blur(8px)',
        }}
      >
        {loading ? '…' : 'Refresh'}
      </button>
    </div>
  );
}
