import { graphql } from '@/gql';

export const PUBLICATION_FRAGMENT = graphql(`
  fragment PublicationFragment on Publication {
    publicationId
    isbn
    publicationType
    updatedAt
    weightG: weight(units: G)
    weightOz: weight(units: OZ)
    widthMm: width(units: MM)
    widthIn: width(units: IN)
    heightMm: height(units: MM)
    heightIn: height(units: IN)
    depthMm: depth(units: MM)
    depthIn: depth(units: IN)
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
