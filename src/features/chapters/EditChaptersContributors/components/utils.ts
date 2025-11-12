import type { ContributionId } from '@/src/entities/contributor/model/contributor.types';
import { WorkContribution, WorkEntity } from '@/src/entities/work/model/work.types';

export const findAllSameContributions = (
  id: ContributionId,
  chapters: WorkEntity[],
  uniqueContributors: WorkContribution[],
) => {
  const currentContribution = uniqueContributors.find((contribution) => contribution.id === id);

  const sameContributions: WorkContribution[] = [];

  if (!currentContribution) return sameContributions;

  chapters.forEach(({ contributions }) => {
    contributions.forEach((contribution) => {
      const isSameAffiliations = contribution.affiliations.every(
        ({ institutionId, orderNumber }, index) =>
          currentContribution.affiliations[index]?.institutionId === institutionId &&
          currentContribution.affiliations[index]?.orderNumber === orderNumber,
      );

      const isSameAffiliationsCount = contribution.affiliations.length === currentContribution.affiliations.length;

      if (!isSameAffiliations || !isSameAffiliationsCount) return;

      if (
        contribution.fullName === currentContribution.fullName &&
        contribution.lastName === currentContribution.lastName &&
        contribution.firstName === currentContribution.firstName &&
        contribution.type === currentContribution.type &&
        contribution.isMain === currentContribution.isMain &&
        contribution.biography === currentContribution.biography &&
        contribution.orcidId === currentContribution.orcidId &&
        contribution.website === currentContribution.website
      ) {
        sameContributions.push(contribution);
      }
    });
  });

  return sameContributions;
};
