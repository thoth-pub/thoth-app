import { graphql } from '@/gql';

export const BOOK_REVIEW_FRAGMENT = graphql(`
  fragment BookReviewFragment on BookReview {
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
`);
