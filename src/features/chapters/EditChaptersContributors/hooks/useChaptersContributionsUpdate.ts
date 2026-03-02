import useContributionsBulkUpdate from '@/src/entities/contribution/api/hooks/useContributionsBulkUpdate';
import type { WorkContribution } from '@/src/entities/contribution/model/contribution.types';
import type { ContributionId } from '@/src/entities/contributor/model/contributor.types';
import type { WorkEntity, WorkId } from '@/src/entities/work/model/work.types';

import { findAllSameContributions } from '../components/utils';

export const useChaptersContributionsUpdate = () => {
  const { updateContributions } = useContributionsBulkUpdate();

  const updateChaptersContributions = async ({
    id,
    chapters,
    uniqueContributors,
    updatedData,
  }: {
    id: ContributionId;
    chapters: WorkEntity[];
    uniqueContributors: WorkContribution[];
    updatedData?: Partial<WorkContribution>;
  }) => {
    if (!updatedData) return uniqueContributors;

    const sameContributions = findAllSameContributions(id, chapters, uniqueContributors);

    const ids = sameContributions.map((contribution) => contribution.id);

    if (sameContributions.length === 0) return uniqueContributors;

    const updatedContributions: { id: WorkId; contribution: WorkContribution }[] = [];

    chapters.forEach(({ contributions, id }) => {
      const chapterContributions = contributions.filter((contribution) => ids.includes(contribution.id));

      if (chapterContributions.length === 0) return;

      chapterContributions.forEach((contribution) => {
        updatedContributions.push({
          id,
          contribution: { ...contribution, ...updatedData },
        });
      });
    });

    if (updatedContributions.length === 0) return uniqueContributors;

    const updatedUniqueContributions = uniqueContributors.map((contribution) => {
      if (contribution.id !== id) return contribution;

      return { ...contribution, ...updatedData };
    });

    await updateContributions(updatedContributions);

    return updatedUniqueContributions;
  };

  return {
    updateChaptersContributions,
  };
};
