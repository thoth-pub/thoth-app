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

export const CREATE_PUBLICATION = graphql(`
  mutation CreatePublication($data: NewPublication!) {
    createPublication(data: $data) {
      publicationId
    }
  }
`);

export const UPDATE_PUBLICATION = graphql(`
  mutation UpdatePublication($data: PatchPublication!) {
    updatePublication(data: $data) {
      publicationId
    }
  }
`);

export const DELETE_PUBLICATION = graphql(`
  mutation DeletePublication($publicationId: Uuid!) {
    deletePublication(publicationId: $publicationId) {
      publicationId
    }
  }
`);
