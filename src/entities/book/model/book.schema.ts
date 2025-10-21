import { graphql } from '@/gql';

export const GET_BOOKS = graphql(`
  query GetBooks(
    $offset: Int!
    $limit: Int
    $publishers: [Uuid!]!
    $direction: Direction = ASC
    $filter: String
    $workStatus: WorkStatus
    $field: WorkField = UPDATED_AT
    $updatedAtWithRelations: TimeExpression
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
  ) {
    bookCount(
      publishers: $publishers
      filter: $filter
      workStatus: $workStatus
      updatedAtWithRelations: $updatedAtWithRelations
    )
  }
`);
