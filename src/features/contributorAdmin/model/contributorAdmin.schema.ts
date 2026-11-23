import { graphql } from '@/gql';

// APP-ADM-CONTRIB-01: superuser contributor administration documents.
// Every document here is consumed only by the /admin/contributors page.

export const CONTRIBUTOR_ADMIN_LIST = graphql(`
  query ContributorAdminList($filter: String, $limit: Int!, $offset: Int!) {
    contributors(filter: $filter, limit: $limit, offset: $offset, order: { field: FULL_NAME, direction: ASC }) {
      contributorId
      fullName
      firstName
      lastName
      orcid
      website
    }
  }
`);

export const CONTRIBUTOR_ADMIN_COUNT = graphql(`
  query ContributorAdminCount($filter: String) {
    contributorCount(filter: $filter)
  }
`);

export const CONTRIBUTOR_ADMIN_CREDITS = graphql(`
  query ContributorAdminCredits($contributorId: Uuid!, $limit: Int!, $offset: Int!) {
    contributor(contributorId: $contributorId) {
      contributorId
      contributions(limit: $limit, offset: $offset, order: { field: CONTRIBUTION_ID, direction: ASC }) {
        contributionId
        contributorId
        workId
        contributionType
        mainContribution
        firstName
        lastName
        fullName
        contributionOrdinal
        work {
          titles {
            canonical
            title
          }
          imprint {
            publisher {
              publisherName
            }
          }
        }
      }
    }
  }
`);

export const CONTRIBUTOR_ADMIN_REPOINT_CREDIT = graphql(`
  mutation ContributorAdminRepointCredit($data: PatchContribution!) {
    updateContribution(data: $data) {
      contributionId
      contributorId
    }
  }
`);

export const CONTRIBUTOR_ADMIN_DELETE = graphql(`
  mutation ContributorAdminDelete($contributorId: Uuid!) {
    deleteContributor(contributorId: $contributorId) {
      contributorId
    }
  }
`);
