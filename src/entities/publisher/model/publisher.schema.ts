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

// Superuser-only report read of one publisher's latest back-catalogue
// distribution job (APP-01C). The report filter is bound to exactly one
// publisher ID, and the summary's own publisher identity is requested solely so
// the result can be verified against the requested publisher. Only the bounded
// latest-job facts approved for staff presentation are selected: no attempt
// history, claim/lease internals or worker controls.
export const GET_PUBLISHER_BACK_CATALOGUE_JOB_REPORT = graphql(`
  query GetPublisherBackCatalogueJobReport($publisherId: Uuid!) {
    publisherServiceConfigurations(publishers: [$publisherId], limit: 1) {
      configuration {
        publisher {
          publisherId
        }
      }
      latestBackCatalogueJob {
        distributionJobId
        status
        attemptCount
        targets {
          platform
        }
        cancellationReason
        lastErrorCode
        lastErrorDetail
        createdAt
        updatedAt
        completedAt
      }
    }
  }
`);

// Superuser-only consolidated publisher administration report (APP-02A). One
// paginated read is the row authority for the whole staff index: no per-row
// protected configuration or job reads. Every semantic filter, the page bounds
// and the ordering are explicit non-null variables, so the request never leans
// on an implicit backend default. Only the bounded fields the index presents
// are selected: no attempt history, claim/lease internals or worker controls.
//
// APP-02B adds `configuration.updatedAt` - the backend's optimistic-concurrency
// version token - to this same selection so a staff edit session can snapshot
// the package, the enabled-platform set and the token that versions them from
// one internally consistent report row. It is deliberately taken from the row
// that is already being read rather than from an extra per-row or
// editor-open single-publisher configuration request.
export const GET_PUBLISHER_SERVICE_CONFIGURATION_REPORT = graphql(`
  query GetPublisherServiceConfigurationReport(
    $publishers: [Uuid!]!
    $packages: [ThothPackage!]!
    $enabledPlatforms: [DistributionPlatform!]!
    $jobStatuses: [DistributionJobStatus!]!
    $withoutBackCatalogueJob: Boolean
    $limit: Int!
    $offset: Int!
    $order: PublisherOrderBy!
  ) {
    publisherServiceConfigurations(
      publishers: $publishers
      packages: $packages
      enabledPlatforms: $enabledPlatforms
      jobStatuses: $jobStatuses
      withoutBackCatalogueJob: $withoutBackCatalogueJob
      limit: $limit
      offset: $offset
      order: $order
    ) {
      configuration {
        publisher {
          publisherId
          publisherName
        }
        subscriptionPackage
        enabledDistributionPlatforms {
          platform
        }
        updatedAt
      }
      lastChange {
        changedAt
      }
      latestBackCatalogueJob {
        distributionJobId
        status
        targets {
          platform
        }
        updatedAt
      }
    }
  }
`);

// Matching count for the APP-02A report. It takes exactly the report's semantic
// filter dimensions and nothing else - no pagination, no order - so the total
// always describes the same filtered population as the list above.
export const GET_PUBLISHER_SERVICE_CONFIGURATION_REPORT_COUNT = graphql(`
  query GetPublisherServiceConfigurationReportCount(
    $publishers: [Uuid!]!
    $packages: [ThothPackage!]!
    $enabledPlatforms: [DistributionPlatform!]!
    $jobStatuses: [DistributionJobStatus!]!
    $withoutBackCatalogueJob: Boolean
  ) {
    publisherServiceConfigurationCount(
      publishers: $publishers
      packages: $packages
      enabledPlatforms: $enabledPlatforms
      jobStatuses: $jobStatuses
      withoutBackCatalogueJob: $withoutBackCatalogueJob
    )
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
