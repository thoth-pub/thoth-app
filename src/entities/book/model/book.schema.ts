import { graphql } from '@/gql';

export const GET_BOOKS = graphql(`
  query GetBooks(
    $offset: Int!
    $limit: Int
    $publishers: [Uuid!]!
    $direction: Direction = ASC
    $filter: String
    $workStatus: WorkStatus
    $field: WorkField = UPDATED_AT_WITH_RELATIONS
    $updatedAtWithRelations: TimeExpression
    $markupFormat: MarkupFormat = JATS_XML
  ) {
    books(
      offset: $offset
      limit: $limit
      publishers: $publishers
      order: { direction: $direction, field: $field }
      filter: $filter
      workStatus: $workStatus
      updatedAtWithRelations: $updatedAtWithRelations
    ) {
      ...WorkFragment
    }
  }
`);

export const GET_BOOKS_COUNT = graphql(`
  query GetBooksCount(
    $publishers: [Uuid!]!
    $filter: String
    $workStatus: WorkStatus
    $updatedAtWithRelations: TimeExpression
    $publicationDate: TimeExpression
    $workStatuses: [WorkStatus!]
  ) {
    bookCount(
      publishers: $publishers
      filter: $filter
      workStatus: $workStatus
      updatedAtWithRelations: $updatedAtWithRelations
      publicationDate: $publicationDate
      workStatuses: $workStatuses
    )
  }
`);

// One request for the home page monthly chart: 13 aliased counts replace 13 requests.
export const GET_BOOKS_COUNTS_BY_DATES = graphql(`
  query GetBooksCountsByDates(
    $publishers: [Uuid!]!
    $workStatuses: [WorkStatus!]
    $d0: TimeExpression,
    $d1: TimeExpression,
    $d2: TimeExpression,
    $d3: TimeExpression,
    $d4: TimeExpression,
    $d5: TimeExpression,
    $d6: TimeExpression,
    $d7: TimeExpression,
    $d8: TimeExpression,
    $d9: TimeExpression,
    $d10: TimeExpression,
    $d11: TimeExpression,
    $d12: TimeExpression
  ) {
    m0: bookCount(publishers: $publishers, workStatuses: $workStatuses, publicationDate: $d0)
    m1: bookCount(publishers: $publishers, workStatuses: $workStatuses, publicationDate: $d1)
    m2: bookCount(publishers: $publishers, workStatuses: $workStatuses, publicationDate: $d2)
    m3: bookCount(publishers: $publishers, workStatuses: $workStatuses, publicationDate: $d3)
    m4: bookCount(publishers: $publishers, workStatuses: $workStatuses, publicationDate: $d4)
    m5: bookCount(publishers: $publishers, workStatuses: $workStatuses, publicationDate: $d5)
    m6: bookCount(publishers: $publishers, workStatuses: $workStatuses, publicationDate: $d6)
    m7: bookCount(publishers: $publishers, workStatuses: $workStatuses, publicationDate: $d7)
    m8: bookCount(publishers: $publishers, workStatuses: $workStatuses, publicationDate: $d8)
    m9: bookCount(publishers: $publishers, workStatuses: $workStatuses, publicationDate: $d9)
    m10: bookCount(publishers: $publishers, workStatuses: $workStatuses, publicationDate: $d10)
    m11: bookCount(publishers: $publishers, workStatuses: $workStatuses, publicationDate: $d11)
    m12: bookCount(publishers: $publishers, workStatuses: $workStatuses, publicationDate: $d12)
  }
`);

// One request for the home page catalogue summary: 3 aliased counts replace 3 requests.
export const GET_BOOKS_STATUS_COUNTS = graphql(`
  query GetBooksStatusCounts($publishers: [Uuid!]!) {
    total: bookCount(publishers: $publishers)
    active: bookCount(publishers: $publishers, workStatus: ACTIVE)
    forthcoming: bookCount(publishers: $publishers, workStatus: FORTHCOMING)
  }
`);
