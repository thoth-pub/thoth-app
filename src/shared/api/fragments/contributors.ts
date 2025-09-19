import { graphql } from '@/gql';

export const CONTRIBUTOR_FRAGMENT = graphql(`
  fragment ContributorFragment on Contributor {
    contributorId
    firstName
    fullName
    lastName
    updatedAt
    orcid
    website
  }
`);
