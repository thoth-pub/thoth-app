import { graphql } from '@/gql';

export const GET_BOOKS = graphql(`
  query GetBooks($publishers: [Uuid!]!) {
    books(publishers: $publishers) {
      doi
      workId
      title
      fullTitle
      workType
      updatedAt
      imprint {
        publisher {
          publisherName
        }
      }
      imprintId
      workStatus
      edition
      contributions {
        fullName
        lastName
        contributionId
        contributorId
        contributionType
        mainContribution
        contributionOrdinal
        biography
        contributor {
          orcid
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
        languageId
        languageCode
        languageRelation
        mainLanguage
      }
      publications {
        publicationId
        isbn
        publicationType
        updatedAt
        weightG: weight(units: G)
        weightOz: weight(units: OZ)
        widthMm: width(units: MM)
        widthIn: width(units: IN)
        heightMm: height(units: MM)
        heightIn: height(units: IN)
        depthMm: depth(units: MM)
        depthIn: depth(units: IN)
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
  }
`);

export const GET_CHAPTERS = graphql(`
  query GetChapters($publishers: [Uuid!]!) {
    chapters(publishers: $publishers) {
      doi
      workId
      title
      fullTitle
      workType
      updatedAt
      imprint {
        publisher {
          publisherName
        }
      }
      imprintId
      workStatus
      edition
      contributions {
        fullName
        lastName
        contributionId
        contributorId
        contributionType
        mainContribution
        contributionOrdinal
        biography
        contributor {
          orcid
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
        languageId
        languageCode
        languageRelation
        mainLanguage
      }
      publications {
        publicationId
        isbn
        publicationType
        updatedAt
        weightG: weight(units: G)
        weightOz: weight(units: OZ)
        widthMm: width(units: MM)
        widthIn: width(units: IN)
        heightMm: height(units: MM)
        heightIn: height(units: IN)
        depthMm: depth(units: MM)
        depthIn: depth(units: IN)
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
  }
`);

export const GET_WORKS = graphql(`
  query GetWorks($publishers: [Uuid!]!) {
    works(publishers: $publishers) {
      ...WorkFragment
    }
  }
`);

export const GET_WORK = graphql(`
  query GetWork($workId: Uuid!) {
    work(workId: $workId) {
      ...WorkFragment
    }
  }
`);

export const UPDATE_WORK = graphql(`
  mutation UpdateWork($data: PatchWork!) {
    updateWork(data: $data) {
      ...WorkFragment
    }
  }
`);

export const DELETE_WORK = graphql(`
  mutation DeleteWork($workId: Uuid!) {
    deleteWork(workId: $workId) {
      workId
    }
  }
`);
