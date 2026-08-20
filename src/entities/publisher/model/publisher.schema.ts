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

// Protected read of the publisher's desired service configuration. `updatedAt` is
// the backend's optimistic-concurrency version token: APP-01B sends the exact
// value loaded for an edit session back as `expectedUpdatedAt`.
export const GET_PUBLISHER_SERVICE_CONFIGURATION = graphql(`
  query GetPublisherServiceConfiguration($publisherId: Uuid!) {
    publisherServiceConfiguration(publisherId: $publisherId) {
      subscriptionPackage
      effectiveCapabilities
      enabledDistributionPlatforms {
        platform
      }
      updatedAt
    }
  }
`);

// Code-owned platform metadata. `assignable`, `linkedGroup` and
// `backCatalogueBehaviour` are backend descriptors consumed as-is by the APP-01B
// editor; the client holds no platform-policy table of its own.
export const GET_DISTRIBUTION_PLATFORM_OPTIONS = graphql(`
  query GetDistributionPlatformOptions {
    distributionPlatformOptions {
      platform
      displayLabel
      assignable
      linkedGroup
      backCatalogueBehaviour
    }
  }
`);
