import { graphql } from '@/gql';

export const GET_PUBLISHERS = graphql(`
  query GetPublishers($publishers: [Uuid!]!, $offset: Int!, $limit: Int) {
    publishers(publishers: $publishers, offset: $offset, limit: $limit) {
      publisherId
      publisherName
      publisherShortname
      publisherUrl
      updatedAt
    }
  }
`);
