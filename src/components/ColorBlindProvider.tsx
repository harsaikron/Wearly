'use client';
import { useEffect } from 'react';
import { useProfileStore } from '@/store/profile';

/**
 * Reads colorBlindMode from the profile store and toggles
 * data-cbm="1" on <html> so global CSS can activate CBM rules.
 * Render this once inside the root layout.
 */
export default function ColorBlindProvider() {
  const enabled = useProfileStore((s) => s.colorBlindMode);

  useEffect(() => {
    const root = document.documentElement;
    if (enabled) {
      root.setAttribute('data-cbm', '1');
    } else {
      root.removeAttribute('data-cbm');
    }
  }, [enabled]);

  return null;
}
