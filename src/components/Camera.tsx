'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, X, RotateCcw, Check } from 'lucide-react';

interface Props {
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
}

export default function CameraCapture({ onCapture, onClose }: Props) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [preview, setPreview]   = useState<string | null>(null);
  const [error, setError]       = useState('');
  const [facingMode, setFacing] = useState<'user' | 'environment'>('user');

  const startCamera = useCallback(async (mode: 'user' | 'environment' = 'user') => {
    try {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setError('');
    } catch {
      setError('Camera not accessible. Allow camera permission or use file upload.');
    }
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    return () => { streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, [startCamera, facingMode]);

  // Lock body scroll + scroll to top when camera opens
  useEffect(() => {
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    window.scrollTo(0, 0);
    return () => {
      document.documentElement.style.overflow = prev;
      document.body.style.overflow = '';
    };
  }, []);

  function capture() {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current;
    const c = canvasRef.current;
    c.width  = v.videoWidth  || 640;
    c.height = v.videoHeight || 480;
    c.getContext('2d')!.drawImage(v, 0, 0);
    setPreview(c.toDataURL('image/jpeg', 0.85));
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
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{
        background: 'rgba(10,15,30,0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 9999,
        padding: '0',
      }}
    >
      <div
        className="w-full max-w-md rounded-3xl overflow-hidden mx-4"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--card-border)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid var(--card-border)' }}
        >
          <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>
            {preview ? 'Use this photo?' : 'Take a Photo'}
          </p>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--muted-bg)]"
            style={{ color: 'var(--muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Video / preview */}
        <div className="relative" style={{ aspectRatio: '4/3', background: 'var(--muted-bg)' }}>
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
              <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
            </div>
          ) : preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="captured" className="w-full h-full object-cover" />
          ) : (
            <video
              ref={videoRef} autoPlay playsInline muted
              className="w-full h-full object-cover"
              style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
            />
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Controls */}
        <div
          className="flex items-center justify-center gap-6 py-5"
          style={{ borderTop: '1px solid var(--card-border)' }}
        >
          {preview ? (
            <>
              <button onClick={retake} className="flex flex-col items-center gap-1">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--muted-bg)', border: '1px solid var(--card-border)' }}
                >
                  <RotateCcw size={20} style={{ color: 'var(--muted)' }} />
                </div>
                <span className="text-xs" style={{ color: 'var(--muted)' }}>Retake</span>
              </button>
              <button onClick={confirm} className="flex flex-col items-center gap-1">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)' }}
                >
                  <Check size={24} style={{ color: '#fff' }} />
                </div>
                <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>Use Photo</span>
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setFacing((m) => m === 'user' ? 'environment' : 'user')} className="flex flex-col items-center gap-1">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--muted-bg)', border: '1px solid var(--card-border)' }}
                >
                  <RotateCcw size={20} style={{ color: 'var(--muted)' }} />
                </div>
                <span className="text-xs" style={{ color: 'var(--muted)' }}>Flip</span>
              </button>
              <button onClick={capture} disabled={!!error} className="flex flex-col items-center gap-1">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)' }}
                >
                  <Camera size={28} style={{ color: '#fff' }} />
                </div>
                <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>Capture</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
