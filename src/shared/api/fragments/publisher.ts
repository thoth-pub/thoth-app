import { graphql } from '@/gql';

export const PUBLISHER_FRAGMENT = graphql(`
  fragment PublisherFragment on Publisher {
    publisherId
    publisherName
    publisherShortname
    publisherUrl
    updatedAt
    contacts {
      contactId
      contactType
      email
    }
  }
`);
