import { graphql } from '@/gql';

export const WORK_FRAGMENT = graphql(`
  fragment WorkFragment on Work {
    doi
    lccn
    oclc
    workId
    titles(markupFormat: $markupFormat) {
      canonical
      fullTitle
      localeCode
      subtitle
      title
      titleId
    }
    abstracts(markupFormat: $markupFormat) {
      abstractId
      abstractType
      canonical
      content
      localeCode
    }
    bibliographyNote
    generalNote
    workType
    updatedAt
    publicationDate
    withdrawnDate
    place
    imprint {
      imprintName
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
      biographies(markupFormat: $markupFormat) {
        biographyId
        canonical
        content
        localeCode
        contributionId
      }
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
      languageId
    }
    fundings {
      fundingId
      grantNumber
      institutionId
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
      accessibilityAdditionalStandard
      accessibilityException
      accessibilityReportUrl
      accessibilityStandard
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
      file {
        cdnUrl
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
    awards {
      awardId
      workId
      title
      url
      category
      role
      prizeStatement
      awardOrdinal
    }
    additionalResources {
      workResourceId
      workId
      title
      description
      attribution
      resourceType
      doi
      handle
      url
      resourceOrdinal
    }
    bookReviews {
      bookReviewId
      workId
      title
      authorName
      url
      doi
      reviewDate
      journalName
      journalVolume
      journalNumber
      journalIssn
      text
      reviewOrdinal
    }
    endorsements {
      endorsementId
      workId
      authorName
      authorRole
      url
      text
      endorsementOrdinal
    }
    featuredVideo {
      workFeaturedVideoId
      workId
      title
      url
      width
      height
      file {
        cdnUrl
      }
    }
  }
`);
