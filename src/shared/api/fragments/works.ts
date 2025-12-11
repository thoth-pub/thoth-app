import { graphql } from '@/gql';

export const WORK_FRAGMENT = graphql(`
  fragment WorkFragment on Work {
    doi
    lccn
    oclc
    workId
    title
    subtitle
    fullTitle
    bibliographyNote
    generalNote
    workType
    updatedAt
    publicationDate
    withdrawnDate
    shortAbstract
    longAbstract
    place
    imprint {
      publisher {
        publisherName
      }
    }
    reference
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
    firstPage
    lastPage
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
      journalTitle
      articleTitle
      seriesTitle
      volumeTitle
      unstructuredCitation
      url
    }
    subjects {
      subjectId
      subjectCode
      subjectType
      subjectOrdinal
    }
    issues {
      issueId
      issueOrdinal
      series {
        seriesId
        seriesName
      }
    }
  }
`);
