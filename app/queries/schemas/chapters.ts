import { graphql } from '@/gql';

export const GET_CHAPTERS = graphql(`
  query GetChapters($publishers: [Uuid!]!) {
    chapters(publishers: $publishers) {
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
