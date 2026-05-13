'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { RotateCcw, Check, X, ImageIcon } from 'lucide-react';

interface Props {
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
}

export default function CameraCapture({ onCapture, onClose }: Props) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [preview, setPreview]     = useState<string | null>(null);
  const [error, setError]         = useState('');
  const [facingMode, setFacing]   = useState<'user' | 'environment'>('environment');
  const [ready, setReady]         = useState(false);

  const startCamera = useCallback(async (mode: 'user' | 'environment') => {
    try {
      setReady(false);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width:  { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => setReady(true)).catch(() => setReady(true));
        };
      }
      setError('');
    } catch {
      setError('Camera not accessible. Please allow camera permission or use file upload.');
    }
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lock body scroll on mount
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
      document.documentElement.style.overflow = '';
    };
  }, []);

  function flipCamera() {
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacing(next);
    startCamera(next);
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

  return (
    /* Full-screen native camera overlay */
    <div
      className="fixed inset-0"
      style={{ zIndex: 9999, background: '#000', touchAction: 'none' }}
    >
      {/* ── Close button ── */}
      <button
        onClick={onClose}
        aria-label="Close camera"
        className="absolute top-4 right-4 z-10 flex items-center justify-center rounded-full"
        style={{
          width: 44, height: 44,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.2)',
        }}
      >
        <X size={20} color="#fff" />
      </button>

      {/* ── Video / Preview fills full screen ── */}
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt="Captured photo"
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
          }}
        />
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
          }}
        />
      )}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* ── Error state ── */}
      {error && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center"
          style={{ background: 'rgba(0,0,0,0.85)' }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(239,68,68,0.15)', border: '1.5px solid rgba(239,68,68,0.4)' }}
          >
            <X size={28} color="#ef4444" />
          </div>
          <p className="text-sm font-semibold text-white">{error}</p>
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-2xl text-sm font-bold text-white"
            style={{ background: 'linear-gradient(to bottom, var(--primary-mid), var(--primary))' }}
          >
            Use File Upload Instead
          </button>
        </div>
      )}

      {/* ── Loading indicator ── */}
      {!error && !ready && !preview && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full border-4 border-white/30 border-t-white animate-spin" />
            <p className="text-xs text-white font-medium">Starting camera…</p>
          </div>
        </div>
      )}

      {/* ── Bottom controls panel ── */}
      {!error && (
        <div
          className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-8"
          style={{
            paddingBottom: 'max(env(safe-area-inset-bottom), 32px)',
            paddingTop: 24,
            background: 'linear-gradient(transparent, rgba(0,0,0,0.70))',
          }}
        >
          {preview ? (
            /* Retake / Use controls */
            <>
              <button
                onClick={retake}
                className="flex flex-col items-center gap-1.5"
                aria-label="Retake photo"
              >
                <div
                  className="flex items-center justify-center rounded-full"
                  style={{
                    width: 56, height: 56,
                    background: 'rgba(255,255,255,0.18)',
                    border: '2px solid rgba(255,255,255,0.5)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <RotateCcw size={22} color="#fff" />
                </div>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>Retake</span>
              </button>

              {/* Use Photo — large green button */}
              <button
                onClick={confirm}
                className="flex flex-col items-center gap-1.5"
                aria-label="Use this photo"
              >
                <div
                  className="flex items-center justify-center rounded-full"
                  style={{
                    width: 76, height: 76,
                    background: 'linear-gradient(to bottom, var(--primary-mid, #3D6B28), var(--primary, #2C4A1E))',
                    boxShadow: '0 0 0 4px rgba(255,255,255,0.3)',
                    border: '3px solid #fff',
                  }}
                >
                  <Check size={32} color="#fff" strokeWidth={2.5} />
                </div>
                <span style={{ fontSize: 12, color: '#fff', fontWeight: 700 }}>Use Photo</span>
              </button>

              {/* Spacer */}
              <div style={{ width: 56 }} />
            </>
          ) : (
            /* Flip / Capture / Gallery controls */
            <>
              {/* Flip camera */}
              <button
                onClick={flipCamera}
                className="flex flex-col items-center gap-1.5"
                aria-label="Flip camera"
              >
                <div
                  className="flex items-center justify-center rounded-full"
                  style={{
                    width: 56, height: 56,
                    background: 'rgba(255,255,255,0.18)',
                    border: '2px solid rgba(255,255,255,0.5)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <RotateCcw size={22} color="#fff" />
                </div>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>Flip</span>
              </button>

              {/* Capture — large white shutter button */}
              <button
                onClick={capture}
                disabled={!!error || !ready}
                className="flex flex-col items-center gap-1.5"
                aria-label="Take photo"
              >
                <div
                  style={{
                    width: 80, height: 80,
                    borderRadius: '50%',
                    background: '#fff',
                    boxShadow: '0 0 0 5px rgba(255,255,255,0.35)',
                    border: '4px solid rgba(255,255,255,0.6)',
                    opacity: (!ready) ? 0.5 : 1,
                    transition: 'opacity 0.2s',
                  }}
                />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>Capture</span>
              </button>

              {/* Gallery placeholder (spacer matches flip button) */}
              <div style={{ width: 56, height: 56 }} />
            </>
          )}
        </div>
      )}

      {/* ── Top label ── */}
      {!error && !preview && (
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-center"
          style={{
            paddingTop: 'max(env(safe-area-inset-top), 16px)',
            paddingBottom: 12,
            background: 'linear-gradient(rgba(0,0,0,0.55), transparent)',
          }}
        >
          <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>
            Take a Photo
          </p>
        </div>
      )}
    </div>
  );
}
