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
        titles {
          canonical
          fullTitle
          localeCode
          subtitle
          title
          titleId
        }
        imprint {
          publisher {
            publisherName
          }
        }
      }
      prices {
        unitPrice
        priceId
        currencyCode
      }
      locations {
        canonical
        fullTextUrl
        landingPage
        locationPlatform
        locationId
      }
    }
  }
`);

export const CREATE_PUBLICATION = graphql(`
  mutation CreatePublication($data: NewPublication!) {
    createPublication(data: $data) {
      publicationId
      work {
        doi
        titles {
          canonical
          fullTitle
          localeCode
          subtitle
          title
          titleId
        }
        imprint {
          publisher {
            publisherName
          }
        }
      }
      prices {
        unitPrice
        priceId
        currencyCode
      }
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
