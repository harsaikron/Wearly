'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { RotateCcw, Check, X, Camera as CameraIcon } from 'lucide-react';

interface Props {
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
}

function CameraUI({ onCapture, onClose }: Props) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [preview,    setPreview]  = useState<string | null>(null);
  const [error,      setError]    = useState('');
  const [facingMode, setFacing]   = useState<'user' | 'environment'>('environment');
  const [ready,      setReady]    = useState(false);
  // iOS requires getUserMedia to be called from a direct user tap, not from useEffect.
  // We start in "idle" state and only call startCamera when the user taps the big button.
  const [started,    setStarted]  = useState(false);

  const startCamera = useCallback(async (mode: 'user' | 'environment') => {
    setReady(false);
    setError('');
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: mode }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => null);
        setReady(true);
      }
    } catch (err: unknown) {
      const name = (err as { name?: string }).name;
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setError('Camera permission denied. Please allow camera access in your browser settings, then try again.');
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setError('No camera found on this device.');
      } else {
        setError('Camera could not start. Please use file upload instead.');
      }
    }
  }, []);

  // On desktop (≥640px) auto-start — no iOS gesture restriction on wide screens.
  // On mobile, wait for user tap so iOS grants camera permission correctly.
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 640) {
      setStarted(true);
      startCamera(facingMode);
    }
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleStartTap() {
    setStarted(true);
    startCamera(facingMode);
  }

  function flipCamera() {
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacing(next);
    startCamera(next);
    setPreview(null);
  }

  function capture() {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current;
    const c = canvasRef.current;
    c.width  = v.videoWidth  || 1280;
    c.height = v.videoHeight || 720;
    c.getContext('2d')!.drawImage(v, 0, 0);
    setPreview(c.toDataURL('image/jpeg', 0.88));
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }

  function retake() {
    setPreview(null);
    startCamera(facingMode);
  }

  function confirm() {
    if (preview) onCapture(preview);
  }

  // ── Mobile fullscreen ──────────────────────────────────────────────────────
  return (
    <>
      <div className="sm:hidden" style={{ position: 'fixed', inset: 0, zIndex: 99999, background: '#000' }}>

        {/* Pre-start tap screen — shown until user taps (required for iOS getUserMedia) */}
        {!started && !error && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 24, background: '#0d1a0a',
          }}>
            <button
              onClick={handleStartTap}
              style={{
                width: 140, height: 140, borderRadius: '50%',
                background: 'linear-gradient(158deg, rgba(100,168,58,0.35) 0%, rgba(44,74,30,0.55) 100%)',
                border: '2px solid rgba(168,208,96,0.4)',
                boxShadow: '0 0 40px rgba(100,168,58,0.25)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 10, cursor: 'pointer',
                touchAction: 'manipulation',
              }}
              aria-label="Start camera"
            >
              <CameraIcon size={40} color="#C8EC80" strokeWidth={1.5} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#A8D060', letterSpacing: '0.04em' }}>TAP TO START</span>
            </button>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', textAlign: 'center', maxWidth: 220 }}>
              Tap the button to open your camera
            </p>
            <button onClick={onClose} style={{
              position: 'absolute', top: 'max(env(safe-area-inset-top, 0px) + 12px, 20px)', right: 16,
              width: 44, height: 44, borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              touchAction: 'manipulation',
            }}>
              <X size={20} color="#fff" />
            </button>
          </div>
        )}

        {/* Video / preview — shown after tap */}
        {started && !error && (
          <>
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Captured"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <video ref={videoRef} autoPlay playsInline muted
                style={{
                  position: 'absolute', inset: 0,
                  width: '100%', height: '100%', objectFit: 'cover',
                  transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                }} />
            )}
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* Top bar */}
            {!preview && (
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0,
                paddingTop: 'max(env(safe-area-inset-top), 16px)',
                paddingBottom: 12,
                background: 'linear-gradient(rgba(0,0,0,0.6), transparent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>Take a Photo</p>
              </div>
            )}

            {/* Close */}
            <button onClick={onClose} aria-label="Close camera"
              style={{
                position: 'absolute', top: 'max(env(safe-area-inset-top, 0px) + 12px, 16px)',
                right: 16, zIndex: 10,
                width: 44, height: 44, borderRadius: '50%',
                background: 'rgba(0,0,0,0.55)',
                border: '1px solid rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', touchAction: 'manipulation',
              }}>
              <X size={20} color="#fff" />
            </button>

            {/* Loading */}
            {!ready && !preview && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', border: '4px solid rgba(255,255,255,0.25)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite' }} />
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>Starting camera…</p>
                </div>
              </div>
            )}

            {/* Controls */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              paddingBottom: 'max(env(safe-area-inset-bottom), 32px)',
              paddingTop: 24, paddingLeft: 32, paddingRight: 32,
              background: 'linear-gradient(transparent, rgba(0,0,0,0.75))',
              display: 'flex', alignItems: 'center', justifyContent: 'space-around',
            }}>
              {preview ? (
                <>
                  <button onClick={retake} aria-label="Retake" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', touchAction: 'manipulation' }}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.18)', border: '2px solid rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <RotateCcw size={22} color="#fff" />
                    </div>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>Retake</span>
                  </button>
                  <button onClick={confirm} aria-label="Use this photo" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', touchAction: 'manipulation' }}>
                    <div style={{ width: 76, height: 76, borderRadius: '50%', background: 'linear-gradient(to bottom, var(--primary-mid,#3D6B28), var(--primary,#2C4A1E))', boxShadow: '0 0 0 4px rgba(255,255,255,0.3)', border: '3px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={32} color="#fff" strokeWidth={2.5} />
                    </div>
                    <span style={{ fontSize: 12, color: '#fff', fontWeight: 700 }}>Use Photo</span>
                  </button>
                  <div style={{ width: 56 }} />
                </>
              ) : (
                <>
                  <button onClick={flipCamera} aria-label="Flip camera" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', touchAction: 'manipulation' }}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.18)', border: '2px solid rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <RotateCcw size={22} color="#fff" />
                    </div>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>Flip</span>
                  </button>
                  <button onClick={capture} disabled={!ready} aria-label="Take photo"
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: ready ? 'pointer' : 'not-allowed', touchAction: 'manipulation' }}>
                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#fff', boxShadow: '0 0 0 5px rgba(255,255,255,0.35)', border: '4px solid rgba(255,255,255,0.6)', opacity: ready ? 1 : 0.45, transition: 'opacity 0.2s' }} />
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>Capture</span>
                  </button>
                  <div style={{ width: 56 }} />
                </>
              )}
            </div>
          </>
        )}

        {/* Error state */}
        {error && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 16, padding: '0 32px', textAlign: 'center', background: 'rgba(0,0,0,0.92)',
          }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239,68,68,0.15)', border: '1.5px solid rgba(239,68,68,0.4)' }}>
              <X size={28} color="#ef4444" />
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#fff', lineHeight: 1.6 }}>{error}</p>
            <button
              onClick={() => { setError(''); setStarted(false); }}
              style={{ padding: '12px 24px', borderRadius: 16, fontSize: 14, fontWeight: 700, color: '#fff', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', cursor: 'pointer', touchAction: 'manipulation' }}
            >
              Try Again
            </button>
            <button onClick={onClose}
              style={{ padding: '12px 24px', borderRadius: 16, fontSize: 14, fontWeight: 700, color: '#fff', background: 'linear-gradient(to bottom, var(--primary-mid,#3D6B28), var(--primary,#2C4A1E))', border: 'none', cursor: 'pointer', touchAction: 'manipulation' }}
            >
              Use File Upload Instead
            </button>
          </div>
        )}
      </div>

      {/* ── Desktop: centered modal ──────────────────────────────────────────── */}
      <div className="hidden sm:flex"
        style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
          alignItems: 'center', justifyContent: 'center',
        }}
        onClick={onClose}
      >
        <div onClick={(e) => e.stopPropagation()}
          style={{
            width: 480, maxWidth: '90vw', borderRadius: 24, overflow: 'hidden',
            background: '#111', boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
            display: 'flex', flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CameraIcon size={16} color="rgba(255,255,255,0.7)" />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Take a Photo</span>
            </div>
            <button onClick={onClose} aria-label="Close"
              style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X size={15} color="#fff" />
            </button>
          </div>

          {/* Video area */}
          <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', background: '#000' }}>
            {/* Desktop: tap-to-start screen */}
            {!started && !error && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 16, background: '#0d1a0a', cursor: 'pointer',
              }} onClick={handleStartTap}>
                <div style={{
                  width: 80, height: 80, borderRadius: '50%',
                  background: 'rgba(100,168,58,0.2)', border: '1.5px solid rgba(168,208,96,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <CameraIcon size={32} color="#A8D060" strokeWidth={1.5} />
                </div>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Click to start camera</p>
              </div>
            )}

            {started && !error && (
              <>
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="Captured"
                    style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                ) : (
                  <video ref={videoRef} autoPlay playsInline muted
                    style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }} />
                )}
                <canvas ref={canvasRef} style={{ display: 'none' }} />

                {!ready && !preview && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'rgba(0,0,0,0.6)' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.25)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite' }} />
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>Starting camera…</p>
                  </div>
                )}
              </>
            )}

            {error && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '0 24px', textAlign: 'center', background: 'rgba(0,0,0,0.85)' }}>
                <p style={{ fontSize: 13, color: '#fff', lineHeight: 1.5 }}>{error}</p>
                <button onClick={() => { setError(''); setStarted(false); }}
                  style={{ padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 600, color: '#fff', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer' }}>
                  Try Again
                </button>
                <button onClick={onClose}
                  style={{ padding: '10px 20px', borderRadius: 12, fontSize: 13, fontWeight: 700, color: '#fff', background: 'linear-gradient(to bottom, var(--primary-mid,#3D6B28), var(--primary,#2C4A1E))', border: 'none', cursor: 'pointer' }}>
                  Use File Upload Instead
                </button>
              </div>
            )}
          </div>

          {/* Desktop controls */}
          {started && !error && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: '#1a1a1a' }}>
              {preview ? (
                <>
                  <button onClick={retake} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 12, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                    <RotateCcw size={16} /> Retake
                  </button>
                  <button onClick={confirm} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 12, background: 'linear-gradient(to bottom, var(--primary-mid,#3D6B28), var(--primary,#2C4A1E))', border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                    <Check size={16} /> Use Photo
                  </button>
                </>
              ) : (
                <>
                  <button onClick={flipCamera} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                    <RotateCcw size={16} /> Flip
                  </button>
                  <button onClick={capture} disabled={!ready}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 32px', borderRadius: 12, background: ready ? '#fff' : 'rgba(255,255,255,0.4)', border: 'none', color: '#111', fontSize: 14, fontWeight: 700, cursor: ready ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}>
                    <CameraIcon size={16} /> Capture
                  </button>
                  <div style={{ width: 80 }} />
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

export default function CameraCapture({ onCapture, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return createPortal(<CameraUI onCapture={onCapture} onClose={onClose} />, document.body);
}
