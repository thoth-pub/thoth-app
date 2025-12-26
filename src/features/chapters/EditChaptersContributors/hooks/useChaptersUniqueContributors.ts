import { useMemo } from 'react';

import { WorkContribution } from '@/src/entities/contribution/model/contribution.types';
import { WorkEntity } from '@/src/entities/work/model/work.types';

export const useChaptersUniqueContributors = (chapters: WorkEntity[]) => {
  const uniqueContributors = useMemo(() => {
    const uniqueContributors: WorkContribution[] = [];

    chapters.forEach(({ contributions }) => {
      contributions.forEach((contribution) => {
        const existingContributor = uniqueContributors.find(
          (contributor) =>
            contributor.contributorId === contribution.contributorId &&
            contributor.fullName === contribution.fullName &&
            contributor.lastName === contribution.lastName &&
            contributor.firstName === contribution.firstName &&
            contributor.type === contribution.type &&
            contributor.isMain === contribution.isMain &&
            contributor.website === contribution.website &&
            contributor.biographies.every((biography) =>
              contribution.biographies.some(
                (contributionBiography) =>
                  contributionBiography.content === biography.content &&
                  contributionBiography.localeCode === biography.localeCode,
              ),
            ),
        );

        if (existingContributor) return;

        uniqueContributors.push(contribution);
      });
    });

    return uniqueContributors;
  }, [chapters]);

  return {
    uniqueContributors,
  };
};
