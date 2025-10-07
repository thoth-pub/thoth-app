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
      isbn
      publicationType
      updatedAt
      weight(units: G)
      width(units: MM)
      height(units: MM)
      depth(units: MM)
      work {
        doi
        title
        imprint {
          publisher {
            publisherName
          }
        }
      }
      prices {
        unitPrice
        priceId
        currencyCode
      }
      locations {
        canonical
        fullTextUrl
        landingPage
        locationPlatform
        locationId
      }
    }
  }
`);
