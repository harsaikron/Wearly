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
          ? 'border-[#c9a84c] bg-[rgba(201,168,76,0.08)]'
          : 'border-[var(--card-border)] hover:border-[rgba(201,168,76,0.5)] hover:bg-[var(--muted-bg)]'
      )}
      style={{ minHeight: 200 }}
    >
      <input {...getInputProps()} />
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="preview" className="max-h-48 rounded-xl object-contain" />
      ) : (
        <>
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
            style={{ background: 'var(--accent-muted)' }}
          >
            {isDragging ? (
              <ImageIcon size={24} style={{ color: 'var(--accent)' }} />
            ) : (
              <Upload size={24} style={{ color: 'var(--accent)' }} />
            )}
          </div>
          <p className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>
            {label}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
            PNG, JPG, WEBP up to 10MB
          </p>
        </>
      )}
    </div>
  );
}
