import { WorkContribution } from '@/src/entities/work/model/work.types';

export const isAllContributionRecommendationsFilled = (contribution: WorkContribution) => {
  return (
    !!contribution.biography &&
    !!contribution.fullName &&
    !!contribution.lastName &&
    !!contribution.firstName &&
    contribution.affiliations.length > 0
  );
};
