import { graphql } from '@/gql';

export const GET_BOOKS = graphql(`
  query GetBooks($publishers: [Uuid!]!) {
    books(publishers: $publishers) {
      doi
      workId
      title
      workType
      updatedAt
      contributions {
        fullName
      }
      imprint {
        publisher {
          publisherName
        }
      }
    }
  }
`);
