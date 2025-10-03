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
    pageCount
    pageBreakdown
    imageCount
    tableCount
    audioCount
    videoCount
    contributions {
      fullName
      lastName
      firstName
      contributionId
      contributorId
      contributionType
      mainContribution
      contributionOrdinal
      biography
      contributor {
        orcid
        website
      }
      affiliations {
        position
        affiliationId
        affiliationOrdinal
        institution {
          ror
          institutionName
          institutionId
        }
      }
    }
    languages {
      languageCode
      languageRelation
      mainLanguage
      languageId
    }
    publications {
      publicationId
      publicationType
      isbn
      weight(units: G)
      width(units: MM)
      height(units: MM)
      updatedAt
    }
  }
`);
