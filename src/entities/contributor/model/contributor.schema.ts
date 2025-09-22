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

export const GET_LINKED_PUBLISHERS = graphql(`
  query GetLinkedPublishers($contributorId: Uuid!, $offset: Int!, $limit: Int) {
    contributor(contributorId: $contributorId) {
      contributions(offset: $offset, limit: $limit) {
        work {
          imprint {
            publisherId
          }
        }
      }
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
