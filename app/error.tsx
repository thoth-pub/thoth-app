'use client';

import { useEffect } from 'react';

import { Button, Typography } from '@/src/shared/ui';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4">
      <Typography variant="h1">Something went wrong!</Typography>
      <Button variant="contained" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}
