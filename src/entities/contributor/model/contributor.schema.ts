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

export const CREATE_CONTRIBUTOR = graphql(`
  mutation CreateContributor($data: NewContributor!) {
    createContributor(data: $data) {
      ...ContributorFragment
    }
  }
`);

export const UPDATE_CONTRIBUTOR = graphql(`
  mutation UpdateContributor($data: PatchContributor!) {
    updateContributor(data: $data) {
      ...ContributorFragment
    }
  }
`);
