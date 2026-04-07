import { Suspense } from 'react';

import { Series } from '@/src/widgets';

export const dynamic = 'force-dynamic';

export default async function SeriesPage() {
  return (
    <Suspense>
      <Series />
    </Suspense>
  );
}
