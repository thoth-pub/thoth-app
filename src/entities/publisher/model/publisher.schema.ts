import { graphql } from '@/gql';

export const GET_PUBLISHERS = graphql(`
  query GetPublishers($publishers: [Uuid!]!, $offset: Int!, $limit: Int) {
    publishers(publishers: $publishers, offset: $offset, limit: $limit) {
      ...PublisherFragment
    }
  }
`);

export const GET_PUBLISHER = graphql(`
  query GetPublisher($publisherId: Uuid!) {
    publisher(publisherId: $publisherId) {
      ...PublisherFragment
    }
  }
`);

export const GET_PUBLISHER_ADMIN = graphql(`
  query GetPublisherAdmin($publisherId: Uuid!) {
    publisher(publisherId: $publisherId) {
      ...PublisherFragment
      zitadelId
    }
  }
`);

export const UPDATE_PUBLISHER = graphql(`
  mutation UpdatePublisher($data: PatchPublisher!) {
    updatePublisher(data: $data) {
      ...PublisherFragment
    }
  }
`);
