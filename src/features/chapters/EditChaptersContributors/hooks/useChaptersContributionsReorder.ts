import { useQueryClient } from '@tanstack/react-query';

import { useMoveContribution } from '@/src/entities/contribution';
import type { WorkContribution } from '@/src/entities/contribution/model/contribution.types';
import { WorkEntity } from '@/src/entities/work/model/work.types';
import { QueryKeys } from '@/src/shared/constants';

export const useChaptersContributionsReorder = () => {
  const { moveContribution } = useMoveContribution({ workId: '' });
  const queryClient = useQueryClient();

  const reorderChaptersContributions = async ({
    data,
    chapters,
    uniqueContributors,
  }: {
    data: WorkContribution[];
    chapters: WorkEntity[];
    uniqueContributors: WorkContribution[];
  }) => {
    const reorderedContributions = data.map((contribution, index) => ({
      ...contribution,
      orderNumber: index + 1,
    }));

    const firstChangedContribution = reorderedContributions.find(
      (contribution, index) => contribution.id !== uniqueContributors[index]?.id,
    );

    if (!firstChangedContribution) return;

    const dateForUpdate = chapters
      .map((chapter) => {
        return chapter.contributions.find(
          (contribution) =>
            contribution.type === firstChangedContribution.type &&
            contribution.contributorId === firstChangedContribution.contributorId,
        );
      })
      .filter((contribution) => !!contribution);

    const promises = dateForUpdate.map((contribution) => {
      return moveContribution({
        contributionId: contribution.id,
        newOrdinal: firstChangedContribution.orderNumber,
      });
    });

    await Promise.all(promises);
    await queryClient.invalidateQueries({ queryKey: [QueryKeys.work] });
    await queryClient.invalidateQueries({ queryKey: [QueryKeys.workChapters] });
  };
  return {
    reorderChaptersContributions,
  };
};
