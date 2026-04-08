import { Suspense } from 'react';

import AllWorks from '@/src/widgets/AllWorks/AllWorks';

export default async function WorksPage() {
  return (
    <Suspense>
      <AllWorks />
    </Suspense>
  );
}
