'use client';

import { useEffect } from 'react';

const usePreventInteraction = (shouldPrevent: boolean) => {
  useEffect(() => {
    if (!shouldPrevent) return;

    document.body.style.pointerEvents = 'none';

    return () => {
      document.body.style.pointerEvents = '';
    };
  }, [shouldPrevent]);
};

export default usePreventInteraction;
