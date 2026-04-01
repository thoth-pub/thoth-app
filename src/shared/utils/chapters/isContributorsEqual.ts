import type { WorkEntity } from '@/src/entities/work/model/work.types';

export const isContributorsEqual = (chapters: WorkEntity[]) => {
  const contributorsIds = chapters.flatMap((chapter) =>
    chapter.contributions.map((contribution) => contribution.contributorId),
  );

  const uniqueContributorsIds = [...new Set(contributorsIds)];

  const isSameContributors = chapters.every((chapter) => {
    const chapterContributorsIds = chapter.contributions.map((contribution) => contribution.contributorId);

    const isIdsSame = uniqueContributorsIds.every((contributorId) => chapterContributorsIds.includes(contributorId));

    return isIdsSame;
  });

  return isSameContributors;
};
