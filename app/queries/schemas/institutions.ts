import { graphql } from '@/gql';

export const GET_INSTITUTIONS = graphql(`
  query GetInstitutions($offset: Int!, $limit: Int) {
    institutions(offset: $offset, limit: $limit) {
      institutionId
      institutionName
      institutionDoi
      ror
      countryCode
      updatedAt
    }
  }
`);

export const GET_INSTITUTIONS_COUNT = graphql(`
  query GetInstitutionsCount {
    institutionCount
  }
`);
