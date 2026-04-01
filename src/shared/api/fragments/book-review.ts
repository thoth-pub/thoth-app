import { graphql } from '@/gql';

export const BOOK_REVIEW_FRAGMENT = graphql(`
  fragment BookReviewFragment on BookReview {
    bookReviewId
    workId
    title
    authorName
    reviewerOrcid
    reviewerInstitutionId
    reviewerInstitution {
      institutionId
      institutionName
      ror
    }
    url
    doi
    reviewDate
    journalName
    journalVolume
    journalNumber
    journalIssn
    pageRange
    text
    reviewOrdinal
  }
`);
