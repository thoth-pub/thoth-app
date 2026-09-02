import { graphql } from '@/gql';

export const GET_CONTRIBUTORS = graphql(`
  query GetContributors($filter: String) {
    contributors(filter: $filter) {
      orcid
      fullName
      firstName
      lastName
      website
      updatedAt
      contributorId
      contributions(order: { field: UPDATED_AT, direction: DESC }, limit: 1) {
        work {
          titles {
            canonical
            title
          }
        }
      }
    }
  }
`);

export const GET_CONTRIBUTORS_BY_ORCIDS = graphql(`
  query GetContributorsByOrcids($orcids: [Orcid!]!) {
    contributorsByOrcids(orcids: $orcids) {
      orcid
      fullName
      firstName
      lastName
      website
      updatedAt
      contributorId
      contributions(order: { field: UPDATED_AT, direction: DESC }, limit: 1) {
        work {
          titles {
            canonical
            title
          }
        }
      }
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

export const GET_CONTRIBUTOR = graphql(`
  query GetContributor($contributorId: Uuid!) {
    contributor(contributorId: $contributorId) {
      ...ContributorFragment
    }
  }
`);
