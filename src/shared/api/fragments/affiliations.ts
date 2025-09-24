import { graphql } from '@/gql';

export const AFFILIATION_FRAGMENT = graphql(`
  fragment AffiliationFragment on Affiliation {
    contributionId
    affiliationId
    institutionId
    affiliationOrdinal
    position
  }
`);
