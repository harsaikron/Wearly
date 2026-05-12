'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  onFile: (file: File, preview: string) => void;
  preview?: string;
  label?: string;
}

export default function UploadZone({ onFile, preview, label = 'Drop a clothing photo here' }: Props) {
  const [isDragging, setIsDragging] = useState(false);

  const onDrop = useCallback(
    (accepted: File[]) => {
      if (!accepted[0]) return;
      const url = URL.createObjectURL(accepted[0]);
      onFile(accepted[0], url);
      setIsDragging(false);
    },
    [onFile]
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxFiles: 1,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        'cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center p-8 text-center',
        isDragging
          ? 'border-[#6366f1] bg-[rgba(99,102,241,0.06)]'
          : 'border-[var(--card-border)] hover:border-[rgba(99,102,241,0.4)] hover:bg-[var(--muted-bg)]'
      )}
      style={{ minHeight: 180 }}
    >
      <input {...getInputProps()} />
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="preview" className="max-h-44 rounded-xl object-contain" />
      ) : (
        <>
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
            style={{ background: 'var(--accent-muted)' }}
          >
            {isDragging ? (
              <ImageIcon size={22} style={{ color: 'var(--accent)' }} />
            ) : (
              <Upload size={22} style={{ color: 'var(--accent)' }} />
            )}
          </div>
          <p className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>
            {label}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
            PNG, JPG, WEBP up to 10 MB
          </p>
        </>
      )}
    </div>
  );
}
