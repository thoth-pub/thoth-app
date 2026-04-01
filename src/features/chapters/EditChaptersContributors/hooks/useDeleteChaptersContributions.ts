import useContributionsBulkDelete from '@/src/entities/contribution/api/hooks/useContributionsBulkDelete';
import type { WorkContribution } from '@/src/entities/contribution/model/contribution.types';
import { ContributionId } from '@/src/entities/contributor/model/contributor.types';
import type { WorkEntity } from '@/src/entities/work/model/work.types';

import { findAllSameContributions } from '../components/utils';

export const useDeleteChaptersContributions = () => {
  const { deleteContributions, loading: deleteLoading } = useContributionsBulkDelete();

  const deleteChaptersContributions = async ({
    id,
    chapters,
    uniqueContributors,
  }: {
    id: ContributionId;
    chapters: WorkEntity[];
    uniqueContributors: WorkContribution[];
  }) => {
    const sameContributions = findAllSameContributions(id, chapters, uniqueContributors);

    if (sameContributions.length === 0) return [];

    const contributionIds = sameContributions.map((contribution) => contribution.id);

    const updatedUniqueContributors = uniqueContributors.filter((contribution) => contribution.id !== id);

    await deleteContributions(contributionIds);

    return updatedUniqueContributors;
  };

  return {
    deleteLoading,
    deleteChaptersContributions,
  };
};
