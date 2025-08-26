import { graphql } from '@/gql';

export const GET_WORKS = graphql(`
  query GetWorks($publishers: [Uuid!]!) {
    works(publishers: $publishers) {
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
