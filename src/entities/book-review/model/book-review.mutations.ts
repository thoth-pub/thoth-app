import { graphql } from '@/gql';

export const CREATE_BOOK_REVIEW = graphql(`
  mutation CreateBookReview($data: NewBookReview!, $markupFormat: MarkupFormat) {
    createBookReview(data: $data, markupFormat: $markupFormat) {
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
  }
`);

export const UPDATE_BOOK_REVIEW = graphql(`
  mutation UpdateBookReview($data: PatchBookReview!, $markupFormat: MarkupFormat) {
    updateBookReview(data: $data, markupFormat: $markupFormat) {
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
  }
`);

export const DELETE_BOOK_REVIEW = graphql(`
  mutation DeleteBookReview($bookReviewId: Uuid!) {
    deleteBookReview(bookReviewId: $bookReviewId) {
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
  }
`);

export const MOVE_BOOK_REVIEW = graphql(`
  mutation MoveBookReview($bookReviewId: Uuid!, $newOrdinal: Int!) {
    moveBookReview(bookReviewId: $bookReviewId, newOrdinal: $newOrdinal) {
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
  }
`);
