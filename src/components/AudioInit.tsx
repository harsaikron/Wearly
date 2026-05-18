'use client';
import { useEffect } from 'react';
import { initAudio } from '@/lib/speak';

export default function AudioInit() {
  useEffect(() => { initAudio(); }, []);
  return null;
}
