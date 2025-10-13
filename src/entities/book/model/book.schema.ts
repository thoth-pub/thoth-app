import { graphql } from '@/gql';

export const GET_BOOKS = graphql(`
  query GetBooks($offset: Int!, $limit: Int, $publishers: [Uuid!]!, $direction: Direction = ASC, $filter: String) {
    books(
      offset: $offset
      limit: $limit
      publishers: $publishers
      order: { direction: $direction, field: UPDATED_AT }
      filter: $filter
    ) {
      ...WorkFragment
    }
  }
`);

export const GET_BOOKS_COUNT = graphql(`
  query GetBooksCount($publishers: [Uuid!]!, $filter: String) {
    bookCount(publishers: $publishers, filter: $filter)
  }
`);
