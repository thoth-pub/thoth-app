import { graphql } from '@/gql';

export const PUBLICATION_FRAGMENT = graphql(`
  fragment PublicationFragment on Publication {
    publicationId
    isbn
    publicationType
    updatedAt
    weight(units: G)
    width(units: MM)
    height(units: MM)
    depth(units: MM)
    work {
      doi
      title
      imprint {
        publisher {
          publisherName
        }
      }
    }
    file {
      cdnUrl
    }
  }
`);
