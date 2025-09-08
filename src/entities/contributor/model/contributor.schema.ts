import { graphql } from '@/gql';

export const GET_CONTRIBUTORS = graphql(`
  query GetContributors {
    contributors {
      orcid
      fullName
      updatedAt
      contributorId
    }
  }
`);
