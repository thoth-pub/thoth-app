'use client';

import { useCallback, useState } from 'react';

const useProgress = () => {
  const [progress, setProgress] = useState<number | null>(null);

  const startProgress = useCallback(() => {
    setProgress(0);
  }, []);

  const resetProgress = useCallback(() => {
    setProgress(null);
  }, []);

  return { progress, setProgress, startProgress, resetProgress };
};

export default useProgress;
