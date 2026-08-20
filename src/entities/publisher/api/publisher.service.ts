import type {
  DistributionJobStatus,
  DistributionPlatform,
  PublisherOrderBy,
  ReplacePublisherServiceConfigurationInput,
  ThothPackage,
} from '@/gql/graphql';
import { GraphqlService } from '@/src/shared/api/graphqlService';
import { BaseService } from '@/src/shared/interfaces/services';

import { PublisherDtoMapper } from '../model/publisher.mapper';
import {
  CREATE_CONTACT,
  CREATE_PUBLISHER,
  DELETE_CONTACT,
  REPLACE_PUBLISHER_SERVICE_CONFIGURATION,
  UPDATE_CONTACT,
} from '../model/publisher.mutations';
import {
  GET_DISTRIBUTION_PLATFORM_OPTIONS,
  GET_PUBLISHER,
  GET_PUBLISHER_ADMIN,
  GET_PUBLISHER_BACK_CATALOGUE_JOB_REPORT,
  GET_PUBLISHER_SERVICE_CONFIGURATION,
  GET_PUBLISHER_SERVICE_CONFIGURATION_REPORT,
  GET_PUBLISHER_SERVICE_CONFIGURATION_REPORT_COUNT,
  GET_PUBLISHERS,
  UPDATE_PUBLISHER,
} from '../model/publisher.schema';
import type { ContactEntity, ContactId, PublisherDto, PublisherEntity, PublisherId } from '../model/publisher.types';

// APP-02A: the one semantic filter model shared by the staff report list and its
// count. Every dimension is passed through to the backend contract unchanged:
// `publishers`/`packages` select exact values, `enabledPlatforms` is conjunctive
// (every requested platform must be enabled), `jobStatuses` is disjunctive (the
// latest job may match any requested status), and `withoutBackCatalogueJob` is
// tri-state (null means unfiltered job presence). Empty arrays mean the
// dimension is unfiltered, matching the contract defaults.
export type PublisherServiceConfigurationReportFilters = {
  publishers: PublisherId[];
  packages: ThothPackage[];
  enabledPlatforms: DistributionPlatform[];
  jobStatuses: DistributionJobStatus[];
  withoutBackCatalogueJob: boolean | null;
};

export type PublisherServiceConfigurationReportPage = {
  filters: PublisherServiceConfigurationReportFilters;
  limit: number;
  offset: number;
  order: PublisherOrderBy;
};

// Single mapping from the shared filter model to report variables. Both report
// reads below build their variables through this function, so the list and the
// count cannot silently drift onto different filter semantics.
const toReportFilterVariables = (filters: PublisherServiceConfigurationReportFilters) => ({
  publishers: filters.publishers,
  packages: filters.packages,
  enabledPlatforms: filters.enabledPlatforms,
  jobStatuses: filters.jobStatuses,
  withoutBackCatalogueJob: filters.withoutBackCatalogueJob,
});

export class PublisherService extends BaseService<PublisherEntity, PublisherDto, PublisherDtoMapper> {
  constructor(graphqlService: GraphqlService, mapper = new PublisherDtoMapper()) {
    super(graphqlService, mapper);
  }

  async getPublishers(publisherIds: PublisherId[]): Promise<PublisherEntity[]> {
    const { publishers = [] } = await this.graphqlService.query(GET_PUBLISHERS, {
      publishers: publisherIds,
      offset: 0,
    });

    const data = publishers.map((publisher) => this.dtoMapper.toEntity(publisher as PublisherDto));

    return data;
  }

  async getPublisher(publisherId: PublisherId, isSuperuser = false): Promise<PublisherEntity> {
    const query = isSuperuser ? GET_PUBLISHER_ADMIN : GET_PUBLISHER;
    const { publisher } = await this.graphqlService.query(query, {
      publisherId,
    });

    const data = this.dtoMapper.toEntity(publisher as PublisherDto);

    return data;
  }

  async updatePublisher(data: PublisherEntity, isSuperuser = false): Promise<PublisherEntity> {
    const dto = this.dtoMapper.toDto(data, isSuperuser);

    const { updatePublisher } = await this.graphqlService.mutation(UPDATE_PUBLISHER, {
      data: dto,
    });

    const publisher = this.dtoMapper.toEntity(updatePublisher as PublisherDto);

    return publisher;
  }

  async createContact(data: ContactEntity, publisherId: PublisherId): Promise<ContactEntity> {
    const { contactId: _, ...dto } = this.dtoMapper.toDtoContact(data);

    const { createContact } = await this.graphqlService.mutation(CREATE_CONTACT, {
      data: {
        ...dto,
        publisherId,
      },
    });

    const contact = this.dtoMapper.toEntityContact(createContact);

    return contact;
  }

  async createPublisher(publisherName: string): Promise<string> {
    const { createPublisher } = await this.graphqlService.mutation(CREATE_PUBLISHER, {
      data: {
        publisherName,
      },
    });

    return createPublisher?.publisherId ?? '';
  }

  async updateContact(data: ContactEntity, publisherId: PublisherId): Promise<ContactEntity> {
    const dto = this.dtoMapper.toDtoContact(data);

    const { updateContact } = await this.graphqlService.mutation(UPDATE_CONTACT, {
      data: {
        ...dto,
        publisherId,
      },
    });

    const contact = this.dtoMapper.toEntityContact(updateContact);

    return contact;
  }

  async deleteContact(contactId: ContactId): Promise<void> {
    await this.graphqlService.mutation(DELETE_CONTACT, {
      contactId,
    });
  }

  // APP-01A: read-only. Reads the protected desired service configuration for a
  // single publisher. The backend authorizes the read; this returns exactly what
  // the API provides and never synthesises a configuration.
  async getPublisherServiceConfiguration(publisherId: PublisherId) {
    const { publisherServiceConfiguration } = await this.graphqlService.query(GET_PUBLISHER_SERVICE_CONFIGURATION, {
      publisherId,
    });

    return publisherServiceConfiguration;
  }

  // APP-01A: read-only. The distribution-platform option list is code-owned and
  // identical for every publisher; it supplies backend display labels for the
  // enabled platforms rather than any frontend label/policy table.
  async getDistributionPlatformOptions() {
    const { distributionPlatformOptions } = await this.graphqlService.query(GET_DISTRIBUTION_PLATFORM_OPTIONS, {});

    return distributionPlatformOptions;
  }

  // APP-01C: read-only, superuser-only report read of one publisher's latest
  // back-catalogue distribution job. The report is requested for exactly the
  // given publisher and the returned summary is verified to belong to it. The
  // matched summary is returned unchanged, so a valid summary whose
  // `latestBackCatalogueJob` is null stays null (meaning only: no job is
  // recorded). A response with no summary for the requested publisher returns
  // null instead, so the caller can tell "no/mismatched summary" apart from
  // "valid summary with no recorded job"; nothing is ever fabricated, and a
  // request error propagates as an error.
  async getPublisherBackCatalogueJobReport(publisherId: PublisherId) {
    const { publisherServiceConfigurations } = await this.graphqlService.query(
      GET_PUBLISHER_BACK_CATALOGUE_JOB_REPORT,
      { publisherId },
    );

    const summary = publisherServiceConfigurations.find(
      (candidate) => candidate.configuration.publisher.publisherId === publisherId,
    );

    return summary ?? null;
  }

  // APP-02A: read-only, superuser-only consolidated report read. One bounded
  // page of publisher service-configuration summaries is the row authority for
  // the staff index; rows are returned exactly as the API provides them, so a
  // summary whose `latestBackCatalogueJob` is null stays null (meaning only: no
  // back-catalogue job is recorded) and a request error propagates as an error.
  async getPublisherServiceConfigurationReport(page: PublisherServiceConfigurationReportPage) {
    const { publisherServiceConfigurations } = await this.graphqlService.query(
      GET_PUBLISHER_SERVICE_CONFIGURATION_REPORT,
      {
        ...toReportFilterVariables(page.filters),
        limit: page.limit,
        offset: page.offset,
        order: page.order,
      },
    );

    return publisherServiceConfigurations;
  }

  // APP-02A: matching total for the report above, computed by the backend from
  // exactly the same semantic filters (never from pagination or ordering).
  async getPublisherServiceConfigurationReportCount(filters: PublisherServiceConfigurationReportFilters) {
    const { publisherServiceConfigurationCount } = await this.graphqlService.query(
      GET_PUBLISHER_SERVICE_CONFIGURATION_REPORT_COUNT,
      toReportFilterVariables(filters),
    );

    return publisherServiceConfigurationCount;
  }

  // APP-01B: replaces the publisher's complete desired service configuration. The
  // caller's input - including the edit session's exact `expectedUpdatedAt` token -
  // is passed through unchanged, and the server-normalized result is returned
  // unchanged. Authorization, normalization and concurrency remain backend-owned.
  async replacePublisherServiceConfiguration(input: ReplacePublisherServiceConfigurationInput) {
    const { replacePublisherServiceConfiguration } = await this.graphqlService.mutation(
      REPLACE_PUBLISHER_SERVICE_CONFIGURATION,
      { data: input },
    );

    return replacePublisherServiceConfiguration;
  }
}
