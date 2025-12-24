import type { ContributionType, ContributorId } from '@/src/entities/contributor/model/contributor.types';
import type { WorkEntity } from '@/src/entities/work/model/work.types';

export const isContributorsRolesEqual = (chapters: WorkEntity[]) => {
  const contributorsRoles: Record<ContributorId, ContributionType[]> = {};

  chapters.forEach(({ contributions }) => {
    contributions.forEach((contribution) => {
      contributorsRoles[contribution.contributorId] = [
        ...(contributorsRoles[contribution.contributorId] || []),
        contribution.type,
      ];
    });
  });

  const totalContributors = Object.keys(contributorsRoles).length;

  const isContributorsRolesSame = chapters.every((chapter) => {
    const chapterContributorsRoles: Record<ContributorId, ContributionType[]> = {};

    chapter.contributions.forEach(({ contributorId, type }) => {
      chapterContributorsRoles[contributorId] = [...(chapterContributorsRoles[contributorId] || []), type];
    });

    const chapterTotalContributors = Object.keys(chapterContributorsRoles).length;

    if (chapterTotalContributors !== totalContributors) return false;

    return Object.entries(chapterContributorsRoles).every(([contributorId, roles]) =>
      contributorsRoles[contributorId].every((role) => roles.includes(role)),
    );
  });

  return isContributorsRolesSame;
};
