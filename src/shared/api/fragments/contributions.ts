import { graphql } from '@/gql';

export const CONTRIBUTION_FRAGMENT = graphql(`
  fragment ContributionFragment on Contribution {
    workId
    contributionId
    mainContribution
    fullName
    lastName
    firstName
    contributionType
    contributionOrdinal
    biographies {
      ...BiographyFragment
    }
    contributor {
      ...ContributorFragment
    }
    contributorId
    affiliations {
      ...AffiliationFragment
    }
  }
`);
