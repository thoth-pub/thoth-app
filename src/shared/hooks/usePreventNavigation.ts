'use client';

import { useEffect } from 'react';

const usePreventNavigation = (shouldPrevent: boolean) => {
  useEffect(() => {
    if (!shouldPrevent) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener('beforeunload', handler);

    return () => window.removeEventListener('beforeunload', handler);
  }, [shouldPrevent]);
};

export default usePreventNavigation;
