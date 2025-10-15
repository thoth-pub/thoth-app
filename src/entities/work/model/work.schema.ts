import { graphql } from '@/gql';

export const GET_CHAPTERS = graphql(`
  query GetChapters($publishers: [Uuid!]!) {
    chapters(publishers: $publishers) {
      doi
      workId
      title
      fullTitle
      workType
      updatedAt
      publicationDate
      withdrawnDate
      imprint {
        publisher {
          publisherName
        }
      }
      imprintId
      workStatus
      edition
      reference
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
      fundings {
        fundingId
        grantNumber
        institutionId
        jurisdiction
        program
        projectName
        projectShortname
        institution {
          institutionName
          ror
        }
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
      references {
        doi
        referenceId
        referenceOrdinal
        unstructuredCitation
        journalTitle
        articleTitle
        seriesTitle
        volumeTitle
        url
      }
    }
  }
`);

export const GET_WORKS = graphql(`
  query GetWorks($offset: Int!, $limit: Int, $publishers: [Uuid!]!) {
    works(offset: $offset, limit: $limit, publishers: $publishers) {
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

export const GET_WORKS_COUNT = graphql(`
  query GetWorksCount($publishers: [Uuid!]!) {
    workCount(publishers: $publishers)
  }
`);
