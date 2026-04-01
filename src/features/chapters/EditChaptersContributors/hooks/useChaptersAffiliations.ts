import { useMemo } from 'react';

import type { WorkEntity } from '@/src/entities/work/model/work.types';

export const useChaptersAffiliations = (chapters: WorkEntity[]) => {
  const affiliations = useMemo(() => {
    const contributions = chapters.flatMap((chapter) => chapter.contributions);
    const affiliations = contributions.flatMap((contribution) => contribution.affiliations);

    return affiliations;
  }, [chapters]);

  return {
    affiliations,
  };
};
