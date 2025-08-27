import { graphql } from '@/gql';

export const GET_INSTITUTIONS = graphql(`
  query GetInstitutions {
    institutions {
      institutionId
      institutionName
      institutionDoi
      ror
      countryCode
      updatedAt
    }
  }
`);
