import { Suspense } from 'react';

import { Sets } from '@/src/widgets';

export const dynamic = 'force-dynamic';

export default async function SetsPage() {
  return (
    <Suspense>
      <Sets />
    </Suspense>
  );
}
