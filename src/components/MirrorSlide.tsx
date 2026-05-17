'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Volume2, VolumeX, RefreshCw, Play } from 'lucide-react';
import { useProfileStore } from '@/store/profile';
import { speak, stopSpeech } from '@/lib/speak';

interface MirrorResult {
  color_description: string;
  bottoms: { name: string; color: string; reason: string }[];
  accessories: { type: string; description: string; reason: string }[];
  full_script: string;
}

interface Props {
  isActive: boolean;
  weather?: { temperature?: number; description?: string; condition?: string; humidity?: number } | null;
}

const FALLBACK_WEATHER = { temperature: 31, description: 'Humid and sunny', condition: 'hot', humidity: 84 };

export default function MirrorSlide({ isActive, weather }: Props) {
  const userName = useProfileStore((s) => s.name);

  const videoRef    = useRef<HTMLVideoElement>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wakeLockRef = useRef<any>(null);

  const [result,      setResult]      = useState<MirrorResult | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [permDenied,  setPermDenied]  = useState(false);
  const [cameraReady, setCameraReady] = useState(false); // stream live
  const [muted,       setMuted]       = useState(false);
  const mutedRef = useRef(false);
  useEffect(() => { mutedRef.current = muted; }, [muted]);

  // Speak whenever result changes
  useEffect(() => {
    if (!result?.full_script || mutedRef.current) return;
    speak(result.full_script);
  }, [result]); // eslint-disable-line react-hooks/exhaustive-deps

  // Stop speech + camera when leaving mirror
  useEffect(() => {
    if (!isActive) { stopSpeech(); stopCamera(); }
  }, [isActive]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Wake lock ────────────────────────────────────────────────────────────
  async function acquireWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as Navigator & { wakeLock: { request: (t: string) => Promise<unknown> } }).wakeLock.request('screen');
      }
    } catch { /* not supported */ }
  }
  function releaseWakeLock() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (wakeLockRef.current as any)?.release?.();
    wakeLockRef.current = null;
  }

  // ── Capture & analyse ────────────────────────────────────────────────────
  const captureAndAnalyse = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;

    const canvas = document.createElement('canvas');
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64 = canvas.toDataURL('image/jpeg', 0.75).replace(/^data:[^;]+;base64,/, '');

    try {
      const res = await fetch('/api/mirror-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photo_base64: base64,
          userName: userName || 'Harsai',
          weather: weather ?? FALLBACK_WEATHER,
        }),
      });
      const data = await res.json() as MirrorResult & { error?: string };
      if (!data.error && data.full_script) setResult(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [weather, userName]);

  // ── Camera lifecycle ────────────────────────────────────────────────────
  // Called DIRECTLY from a user tap — iOS Safari requires getUserMedia
  // to happen within the same callstack as a user gesture.
  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {/* autoplay blocked, fine — muted video plays */});
      }
      setPermDenied(false);
      setCameraReady(true);
      setResult(null);
      await acquireWakeLock();

      if (!mutedRef.current) {
        const name = (userName || 'Harsai').split(' ')[0];
        speak(`Hi ${name}! Give me a moment to analyse your outfit.`);
      }

      setLoading(true);
      setTimeout(captureAndAnalyse, 2500);
      intervalRef.current = setInterval(captureAndAnalyse, 20000);
    } catch {
      setPermDenied(true);
      setCameraReady(false);
    }
  }

  function stopCamera() {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    stopSpeech();
    releaseWakeLock();
    setCameraReady(false);
    setResult(null);
    setLoading(false);
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    if (next) { stopSpeech(); }
    else if (result?.full_script) speak(result.full_script);
  }

  function refresh() {
    setLoading(true);
    captureAndAnalyse();
  }

  // ── Idle screen (not started yet) ───────────────────────────────────────
  if (!cameraReady && !permDenied) {
    return (
      <div style={{ width: '100%', height: '100%', background: '#080f06', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32, padding: 32 }}>
        {/* Ambient glow */}
        <div style={{ position: 'absolute', width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(90,146,64,0.28) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }} />

        <div style={{ textAlign: 'center', position: 'relative' }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>🪞</div>
          <p style={{ color: '#fff', fontWeight: 700, fontSize: 22, letterSpacing: '-0.02em', marginBottom: 6 }}>Smart Mirror</p>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, lineHeight: 1.6, maxWidth: 260 }}>
            AI will analyse your outfit and suggest matching bottoms and accessories.
          </p>
        </div>

        {/* Big tap target — easy to press on a mounted phone */}
        <button
          onClick={startCamera}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
            width: 160, height: 160, borderRadius: '50%',
            background: 'linear-gradient(158deg, rgba(168,208,96,0.30), rgba(60,106,32,0.70))',
            border: '2px solid rgba(168,208,96,0.50)',
            boxShadow: '0 0 60px rgba(90,146,64,0.40), 0 0 120px rgba(90,146,64,0.20)',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <Play size={38} color="#C8EC80" fill="#C8EC80" strokeWidth={1.5} style={{ marginLeft: 6 }} />
          <span style={{ color: '#C8EC80', fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Start</span>
        </button>

        <p style={{ color: 'rgba(255,255,255,0.22)', fontSize: 11, textAlign: 'center', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Tap to activate camera
        </p>
      </div>
    );
  }

  // ── Permission denied ───────────────────────────────────────────────────
  if (permDenied) {
    return (
      <div style={{ width: '100%', height: '100%', background: '#111', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 }}>
        <span style={{ fontSize: 44 }}>📷</span>
        <p style={{ color: '#fff', fontWeight: 700, fontSize: 18, textAlign: 'center' }}>Camera access denied</p>
        <p style={{ color: 'rgba(255,255,255,0.50)', fontSize: 13, textAlign: 'center', lineHeight: 1.65 }}>
          Allow camera in Safari Settings → Wearly → Camera, then tap below.
        </p>
        <button
          onClick={() => { setPermDenied(false); }}
          style={{ marginTop: 8, padding: '14px 32px', borderRadius: 16, background: 'rgba(168,208,96,0.18)', border: '1.5px solid rgba(168,208,96,0.40)', color: '#A8D060', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
        >
          Try again
        </button>
      </div>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000', overflow: 'hidden' }}>

      {/* ── Video ── */}
      <video
        ref={videoRef}
        autoPlay playsInline muted
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
      />

      {/* ── Vignette gradient ── */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 30%, transparent 45%, rgba(0,0,0,0.80) 100%)', pointerEvents: 'none', zIndex: 1 }} />

      {/* ── Top bar ── */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: 'calc(env(safe-area-inset-top) + 14px) 16px 14px', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 24, height: 3, borderRadius: 2, background: '#A8D060' }} />
          <span style={{ color: '#A8D060', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
            Smart Mirror
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {/* Stop camera */}
          <button
            onClick={stopCamera}
            aria-label="Stop mirror"
            style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,60,60,0.18)', border: '1px solid rgba(255,60,60,0.30)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <span style={{ fontSize: 14 }}>⏹</span>
          </button>

          {/* Refresh */}
          <button
            onClick={refresh}
            aria-label="Refresh outfit analysis"
            disabled={loading}
            style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <RefreshCw size={15} color={loading ? 'rgba(255,255,255,0.30)' : 'rgba(255,255,255,0.80)'} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
          </button>

          {/* Mute toggle */}
          <button
            onClick={toggleMute}
            aria-label={muted ? 'Unmute voice' : 'Mute voice'}
            style={{ width: 40, height: 40, borderRadius: 12, background: muted ? 'rgba(255,255,255,0.10)' : 'rgba(168,208,96,0.22)', border: muted ? '1px solid rgba(255,255,255,0.16)' : '1px solid rgba(168,208,96,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            {muted ? <VolumeX size={15} color="rgba(255,255,255,0.45)" /> : <Volume2 size={15} color="#A8D060" />}
          </button>
        </div>
      </div>

      {/* ── Scanning pill ── */}
      {loading && !result && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
          <div style={{ background: 'rgba(0,0,0,0.72)', borderRadius: 20, padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 10, border: '1px solid rgba(168,208,96,0.25)' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#A8D060', animation: 'pulse 1.2s ease-in-out infinite' }} />
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>Scanning your outfit…</span>
          </div>
        </div>
      )}

      {/* ── Result overlay ── */}
      {result && (
        <div
          role="status"
          aria-live="polite"
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10, padding: '0 12px 100px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10, paddingLeft: 2 }}>
            <Volume2 size={11} color={muted ? 'rgba(255,255,255,0.25)' : '#A8D060'} />
            <span style={{ fontSize: '0.52rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: muted ? 'rgba(255,255,255,0.25)' : '#A8D060' }}>
              {muted ? 'Voice off' : 'Speaking…'}
            </span>
            {loading && <span style={{ marginLeft: 6, fontSize: '0.52rem', color: 'rgba(255,255,255,0.40)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>· Updating</span>}
          </div>

          {/* Card: What you're wearing */}
          <div style={{ background: 'rgba(0,0,0,0.65)', borderRadius: 16, padding: '12px 14px', marginBottom: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
            <p style={{ fontSize: '0.54rem', fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: '#A8D060', marginBottom: 5 }}>
              👕 What you&apos;re wearing
            </p>
            <p style={{ color: '#fff', fontSize: 13, lineHeight: 1.6, fontWeight: 400 }}>
              {userName
                ? <><span style={{ color: '#A8D060', fontWeight: 700 }}>Hi {userName.split(' ')[0]}!</span>{' '}</>
                : null}
              {result.color_description}
            </p>
          </div>

          {/* Card: Matching bottoms */}
          {result.bottoms?.length > 0 && (
            <div style={{ background: 'rgba(0,0,0,0.65)', borderRadius: 16, padding: '12px 14px', marginBottom: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
              <p style={{ fontSize: '0.54rem', fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: '#7EC8E3', marginBottom: 8 }}>
                👖 Matching Bottoms
              </p>
              {result.bottoms.map((b, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: i < result.bottoms.length - 1 ? 7 : 0 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#7EC8E3', flexShrink: 0, marginTop: 5 }} />
                  <div>
                    <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{b.name}</span>
                    {b.reason ? <span style={{ color: 'rgba(255,255,255,0.50)', fontSize: 11 }}> — {b.reason}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Card: Accessories */}
          {result.accessories?.length > 0 && (
            <div style={{ background: 'rgba(0,0,0,0.65)', borderRadius: 16, padding: '12px 14px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p style={{ fontSize: '0.54rem', fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: '#F4A261', marginBottom: 8 }}>
                ✨ Accessories
              </p>
              {result.accessories.map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: i < result.accessories.length - 1 ? 7 : 0 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#F4A261', flexShrink: 0, marginTop: 5 }} />
                  <div>
                    <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{a.type} </span>
                    <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{a.description}</span>
                    {a.reason ? <span style={{ color: 'rgba(255,255,255,0.50)', fontSize: 11 }}> — {a.reason}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.8)} }
      `}</style>
    </div>
  );
}
