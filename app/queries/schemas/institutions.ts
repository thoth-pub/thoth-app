import { graphql } from '@/gql';

export const GET_INSTITUTIONS = graphql(`
  query GetInstitutions($offset: Int!, $limit: Int, $filter: String) {
    institutions(offset: $offset, limit: $limit, filter: $filter) {
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
  query GetInstitutionsCount($filter: String) {
    institutionCount(filter: $filter)
  }
`);
