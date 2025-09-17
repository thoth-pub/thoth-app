import { graphql } from '@/gql';

export const WORK_FRAGMENT = graphql(`
  fragment WorkFragment on Work {
    doi
    workId
    title
    fullTitle
    workType
    updatedAt
    publicationDate
    contributions {
      fullName
    }
    imprint {
      publisher {
        publisherName
      }
    }
    imprintId
    workStatus
    edition
    license
    copyrightHolder
    landingPage
    coverUrl
    contributions {
      fullName
      lastName
      contributorId
      contributionType
      mainContribution
      contributionOrdinal
      biography
      contributor {
        orcid
      }
      affiliations {
        institution {
          ror
          institutionName
        }
      }
    }
  }
`);
