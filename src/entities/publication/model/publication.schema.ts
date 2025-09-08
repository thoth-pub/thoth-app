import { graphql } from '@/gql';

export const GET_PUBLICATIONS = graphql(`
  query GetPublications($publishers: [Uuid!]!) {
    publications(publishers: $publishers) {
      isbn
      publicationId
      publicationType
      updatedAt
      work {
        doi
        title
        imprint {
          publisher {
            publisherName
          }
        }
      }
    }
  }
`);
