import { graphql } from '@/gql';

export const GET_PUBLISHERS = graphql(`
  query GetPublishers($publishers: [Uuid!]!) {
    publishers(publishers: $publishers) {
      publisherId
      publisherName
      publisherShortname
      publisherUrl
      updatedAt
    }
  }
`);
