'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, X, RotateCcw, Check } from 'lucide-react';

interface Props {
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
}

export default function CameraCapture({ onCapture, onClose }: Props) {
  const videoRef   = useRef<HTMLVideoElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const streamRef  = useRef<MediaStream | null>(null);

  const [preview, setPreview]   = useState<string | null>(null);
  const [error, setError]       = useState('');
  const [facingMode, setFacing] = useState<'user' | 'environment'>('user');

  const startCamera = useCallback(async (mode: 'user' | 'environment' = 'user') => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
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
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [startCamera, facingMode]);

  function capture() {
    if (!videoRef.current || !canvasRef.current) return;
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    setPreview(canvas.toDataURL('image/jpeg', 0.85));
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }

  function retake() {
    setPreview(null);
    startCamera(facingMode);
  }

  function flipCamera() {
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacing(next);
  }

  function confirm() {
    if (preview) onCapture(preview);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.9)' }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ background: '#0a0a0f', border: '1px solid #1e1e2e' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #1e1e2e' }}>
          <p className="font-semibold text-sm" style={{ color: '#f0ede8' }}>
            {preview ? 'Use this photo?' : 'Take a Photo'}
          </p>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: '#6b6b7b' }}>
            <X size={18} />
          </button>
        </div>

        {/* Video / preview */}
        <div className="relative bg-black" style={{ aspectRatio: '4/3' }}>
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
              <p className="text-sm" style={{ color: '#d97b7b' }}>{error}</p>
            </div>
          ) : preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="captured" className="w-full h-full object-cover" />
          ) : (
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }} />
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-6 py-5">
          {preview ? (
            <>
              <button onClick={retake} className="flex flex-col items-center gap-1">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: '#1a1a24', border: '1px solid #1e1e2e' }}>
                  <RotateCcw size={20} style={{ color: '#6b6b7b' }} />
                </div>
                <span className="text-xs" style={{ color: '#6b6b7b' }}>Retake</span>
              </button>
              <button onClick={confirm} className="flex flex-col items-center gap-1">
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c96a)' }}>
                  <Check size={24} style={{ color: '#000' }} />
                </div>
                <span className="text-xs font-semibold" style={{ color: '#c9a84c' }}>Use Photo</span>
              </button>
            </>
          ) : (
            <>
              <button onClick={flipCamera} className="flex flex-col items-center gap-1">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: '#1a1a24', border: '1px solid #1e1e2e' }}>
                  <RotateCcw size={20} style={{ color: '#6b6b7b' }} />
                </div>
                <span className="text-xs" style={{ color: '#6b6b7b' }}>Flip</span>
              </button>
              <button onClick={capture} disabled={!!error} className="flex flex-col items-center gap-1">
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c96a)' }}>
                  <Camera size={28} style={{ color: '#000' }} />
                </div>
                <span className="text-xs font-semibold" style={{ color: '#c9a84c' }}>Capture</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
