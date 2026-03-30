'use client';
import { useEffect } from 'react';

const useEscapeKey = (onEscape: (() => void) | undefined, enabled = true) => {
  useEffect(() => {
    if (!enabled || !onEscape) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onEscape();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onEscape]);
};

export default useEscapeKey;
