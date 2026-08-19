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

// APP-01A read-only reads. Request only the fields this presentation needs; the
// configuration version token (updatedAt) is intentionally omitted as it is only
// used by the out-of-scope APP-01B replace mutation.
export const GET_PUBLISHER_SERVICE_CONFIGURATION = graphql(`
  query GetPublisherServiceConfiguration($publisherId: Uuid!) {
    publisherServiceConfiguration(publisherId: $publisherId) {
      subscriptionPackage
      effectiveCapabilities
      enabledDistributionPlatforms {
        platform
      }
    }
  }
`);

export const GET_DISTRIBUTION_PLATFORM_OPTIONS = graphql(`
  query GetDistributionPlatformOptions {
    distributionPlatformOptions {
      platform
      displayLabel
    }
  }
`);
