import { graphql } from '@/gql';

export const GET_CONTRIBUTORS = graphql(`
  query GetContributors($filter: String) {
    contributors(filter: $filter) {
      orcid
      fullName
      lastName
      updatedAt
      contributorId
    }
  }
`);
