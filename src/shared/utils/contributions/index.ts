import type { WorkContribution } from '@/src/entities/contribution/model/contribution.types';

export const isAllContributionRecommendationsFilled = (contribution: WorkContribution) => {
  return (
    contribution.biographies.length > 0 &&
    !!contribution.fullName &&
    !!contribution.lastName &&
    !!contribution.firstName &&
    contribution.affiliations.length > 0
  );
};
