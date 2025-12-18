import { graphql } from '@/gql';

export const GET_CONTRIBUTION_BIOGRAPHIES = graphql(`
  query GetContributionBiographies($contributionId: Uuid!) {
    contribution(contributionId: $contributionId) {
      biographies {
        ...BiographyFragment
        contributionId
        work {
          workId
        }
      }
    }
  }
`);
