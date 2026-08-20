import { faker } from '@faker-js/faker';
import { print } from 'graphql';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  Direction,
  DistributionJobStatus,
  DistributionPlatform,
  PublisherField,
  type ReplacePublisherServiceConfigurationInput,
  ThothPackage,
} from '@/gql/graphql';
import { GraphqlService } from '@/src/shared/api/graphqlService';

import { PublisherDtoMapper } from '../model/publisher.mapper';
import {
  GET_PUBLISHER_BACK_CATALOGUE_JOB_REPORT,
  GET_PUBLISHER_SERVICE_CONFIGURATION_REPORT,
  GET_PUBLISHER_SERVICE_CONFIGURATION_REPORT_COUNT,
} from '../model/publisher.schema';
import type { ContactEntity, PublisherEntity } from '../model/publisher.types';
import { PublisherService, type PublisherServiceConfigurationReportFilters } from './publisher.service';

describe('PublisherService', () => {
  let service: PublisherService;
  let mockGraphqlService: GraphqlService;
  let mockMapper: PublisherDtoMapper;

  const createPublisherEntity = (overrides?: Partial<PublisherEntity>): PublisherEntity => ({
    id: faker.string.uuid(),
    name: 'Test Publisher',
    shortName: 'TP',
    url: 'https://example.com',
    zitadelId: 'zitadel-123',
    updatedAt: '2024-01-01T00:00:00Z',
    accessibilityReportUrl: 'https://example.com/report',
    accessibilityStatement: 'https://example.com/statement',
    contacts: [],
    ...overrides,
  });

  const createContactEntity = (overrides?: Partial<ContactEntity>): ContactEntity => ({
    id: faker.string.uuid(),
    type: 'PUBLISHER' as ContactEntity['type'],
    email: 'contact@example.com',
    ...overrides,
  });

  beforeEach(() => {
    mockGraphqlService = {
      query: vi.fn(),
      mutation: vi.fn(),
    } as unknown as GraphqlService;

    mockMapper = new PublisherDtoMapper();
    vi.spyOn(mockMapper, 'toEntity').mockImplementation((dto: any) => ({
      id: dto.publisherId,
      name: dto.publisherName,
      shortName: dto.publisherShortname ?? '',
      url: dto.publisherUrl ?? '',
      zitadelId: dto.zitadelId ?? '',
      updatedAt: dto.updatedAt,
      accessibilityReportUrl: dto.accessibilityReportUrl ?? '',
      accessibilityStatement: dto.accessibilityStatement ?? '',
      contacts: (dto.contacts ?? []).map((c: any) => ({
        id: c.contactId,
        type: c.contactType,
        email: c.email,
      })),
    }));

    vi.spyOn(mockMapper, 'toDto').mockImplementation((entity: PublisherEntity, isSuperuser?: boolean) => ({
      publisherId: entity.id,
      publisherName: entity.name,
      publisherShortname: entity.shortName,
      publisherUrl: entity.url,
      ...(isSuperuser ? { zitadelId: entity.zitadelId } : {}),
      accessibilityReportUrl: entity.accessibilityReportUrl,
      accessibilityStatement: entity.accessibilityStatement,
    }));

    vi.spyOn(mockMapper, 'toEntityContact').mockImplementation((dto: any) => ({
      id: dto.contactId,
      type: dto.contactType,
      email: dto.email,
    }));

    vi.spyOn(mockMapper, 'toDtoContact').mockImplementation((entity: ContactEntity) => ({
      contactId: entity.id,
      contactType: entity.type,
      email: entity.email,
    }));

    service = new PublisherService(mockGraphqlService, mockMapper);
  });

  describe('getPublishers', () => {
    it('should call query with publisherIds', async () => {
      const publisherIds = [faker.string.uuid()];

      (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        publishers: [],
      });

      await service.getPublishers(publisherIds);

      expect(mockGraphqlService.query).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ publishers: publisherIds, offset: 0 }),
      );
    });

    it('should map publishers to entities', async () => {
      const publisherIds = [faker.string.uuid()];
      const publisherDtos = [
        { publisherId: faker.string.uuid(), publisherName: 'P1', contacts: [] },
        { publisherId: faker.string.uuid(), publisherName: 'P2', contacts: [] },
      ];

      (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        publishers: publisherDtos,
      });

      const result = await service.getPublishers(publisherIds);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(publisherDtos[0].publisherId);
    });
  });

  describe('getPublisher', () => {
    it('should use GET_PUBLISHER for non-superuser', async () => {
      const publisherId = faker.string.uuid();

      (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        publisher: { publisherId, publisherName: 'Test', contacts: [] },
      });

      const result = await service.getPublisher(publisherId, false);

      expect(result.id).toBe(publisherId);
    });

    it('should use GET_PUBLISHER_ADMIN for superuser', async () => {
      const publisherId = faker.string.uuid();

      (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        publisher: { publisherId, publisherName: 'Test', contacts: [], zitadelId: 'zid' },
      });

      const result = await service.getPublisher(publisherId, true);

      expect(result.id).toBe(publisherId);
    });
  });

  describe('updatePublisher', () => {
    it('should call mutation with dto and return mapped entity', async () => {
      const entity = createPublisherEntity();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        updatePublisher: { publisherId: entity.id, publisherName: entity.name, contacts: [] },
      });

      const result = await service.updatePublisher(entity, false);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ data: expect.objectContaining({ publisherId: entity.id }) }),
      );
      expect(result.id).toBe(entity.id);
    });
  });

  describe('createPublisher', () => {
    it('should call mutation with publisherName and return the id', async () => {
      const publisherName = 'New Publisher';

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createPublisher: { publisherId: 'new-id' },
      });

      const result = await service.createPublisher(publisherName);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ data: { publisherName } }),
      );
      expect(result).toBe('new-id');
    });

    it('should return empty string when createPublisher is undefined', async () => {
      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createPublisher: undefined,
      });

      const result = await service.createPublisher('Test');

      expect(result).toBe('');
    });
  });

  describe('createContact', () => {
    it('should call mutation with contact data and publisherId', async () => {
      const contact = createContactEntity();
      const publisherId = faker.string.uuid();
      const createdId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createContact: { contactId: createdId, contactType: contact.type, email: contact.email },
      });

      const result = await service.createContact(contact, publisherId);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({ publisherId, email: contact.email }),
        }),
      );
      expect(result.id).toBe(createdId);
    });
  });

  describe('updateContact', () => {
    it('should call mutation with contact data and return mapped entity', async () => {
      const contact = createContactEntity();
      const publisherId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        updateContact: { contactId: contact.id, contactType: contact.type, email: contact.email },
      });

      const result = await service.updateContact(contact, publisherId);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({ contactId: contact.id, publisherId }),
        }),
      );
      expect(result.id).toBe(contact.id);
    });
  });

  describe('deleteContact', () => {
    it('should call mutation with contactId', async () => {
      const contactId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        deleteContact: { contactId },
      });

      await service.deleteContact(contactId);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ contactId }),
      );
    });
  });

  describe('getPublisherServiceConfiguration', () => {
    it('should query the protected configuration for the given publisher id', async () => {
      const publisherId = faker.string.uuid();

      (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        publisherServiceConfiguration: {
          subscriptionPackage: 'SPHINX',
          effectiveCapabilities: ['OAI_PMH'],
          enabledDistributionPlatforms: [{ platform: 'OAPEN' }],
          updatedAt: '2026-08-01T10:00:00Z',
        },
      });

      await service.getPublisherServiceConfiguration(publisherId);

      expect(mockGraphqlService.query).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ publisherId }),
      );
    });

    it('should return the API-provided package, capabilities and enabled platforms unchanged', async () => {
      const publisherId = faker.string.uuid();
      const configuration = {
        subscriptionPackage: 'PYRAMID',
        effectiveCapabilities: ['OAI_PMH', 'METRICS_COLLECT'],
        enabledDistributionPlatforms: [{ platform: 'OAPEN' }, { platform: 'INTERNET_ARCHIVE' }],
        updatedAt: '2026-08-01T10:00:00Z',
      };

      (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        publisherServiceConfiguration: configuration,
      });

      const result = await service.getPublisherServiceConfiguration(publisherId);

      expect(result).toEqual(configuration);
    });
  });

  describe('getDistributionPlatformOptions', () => {
    it('should query and return the platform option metadata', async () => {
      const options = [
        {
          platform: 'OAPEN',
          displayLabel: 'OAPEN',
          assignable: true,
          linkedGroup: 'OAPEN_DOAB',
          backCatalogueBehaviour: 'AUTOMATIC_PUSH',
        },
        {
          platform: 'INTERNET_ARCHIVE',
          displayLabel: 'Internet Archive',
          assignable: true,
          linkedGroup: null,
          backCatalogueBehaviour: 'AUTOMATIC_PUSH',
        },
      ];

      (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        distributionPlatformOptions: options,
      });

      const result = await service.getDistributionPlatformOptions();

      expect(mockGraphqlService.query).toHaveBeenCalled();
      expect(result).toEqual(options);
    });

    it('should return backend assignability and linkage metadata unchanged', async () => {
      const options = [
        {
          platform: 'JISC_NBK',
          displayLabel: 'Jisc NBK',
          assignable: false,
          linkedGroup: null,
          backCatalogueBehaviour: 'MANUAL',
        },
      ];

      (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        distributionPlatformOptions: options,
      });

      const result = await service.getDistributionPlatformOptions();

      expect(result).toBe(options);
    });
  });

  describe('getPublisherBackCatalogueJobReport', () => {
    const createJob = () => ({
      distributionJobId: faker.string.uuid(),
      status: 'FAILED',
      attemptCount: 3,
      targets: [{ platform: 'OAPEN' }],
      cancellationReason: null,
      lastErrorCode: 'TRANSPORT',
      lastErrorDetail: 'connection reset',
      createdAt: '2026-08-10T10:00:00Z',
      updatedAt: '2026-08-11T10:00:00Z',
      completedAt: null,
    });

    const createSummary = (publisherId: string, latestBackCatalogueJob: ReturnType<typeof createJob> | null) => ({
      configuration: { publisher: { publisherId } },
      latestBackCatalogueJob,
    });

    it('should request the report bound to exactly the requested publisher', async () => {
      const publisherId = faker.string.uuid();

      (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        publisherServiceConfigurations: [],
      });

      await service.getPublisherBackCatalogueJobReport(publisherId);

      expect(mockGraphqlService.query).toHaveBeenCalledWith(GET_PUBLISHER_BACK_CATALOGUE_JOB_REPORT, { publisherId });
    });

    it('should use a report document whose publisher filter is the single requested publisher variable', () => {
      const document = print(GET_PUBLISHER_BACK_CATALOGUE_JOB_REPORT);

      expect(document).toContain('publishers: [$publisherId]');
      expect(document).toContain('latestBackCatalogueJob');
      // Bounded to the approved latest-job facts: no attempt history and no
      // worker claim/lease internals are requested.
      expect(document).not.toContain('attempts {');
      expect(document).not.toContain('claimedAt');
      expect(document).not.toContain('leaseExpiresAt');
    });

    it('should return the matching summary unchanged, preserving a null job as null', async () => {
      const publisherId = faker.string.uuid();
      const summary = createSummary(publisherId, null);

      (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        publisherServiceConfigurations: [summary],
      });

      const result = await service.getPublisherBackCatalogueJobReport(publisherId);

      expect(result).toBe(summary);
      expect(result?.latestBackCatalogueJob).toBeNull();
    });

    it('should return the API-provided job facts unchanged when a job exists', async () => {
      const publisherId = faker.string.uuid();
      const summary = createSummary(publisherId, createJob());

      (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        publisherServiceConfigurations: [summary],
      });

      const result = await service.getPublisherBackCatalogueJobReport(publisherId);

      expect(result?.latestBackCatalogueJob).toBe(summary.latestBackCatalogueJob);
    });

    it('should return null (no summary) when the report contains no summaries', async () => {
      (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        publisherServiceConfigurations: [],
      });

      const result = await service.getPublisherBackCatalogueJobReport(faker.string.uuid());

      expect(result).toBeNull();
    });

    it("should return null rather than another publisher's summary or a fabricated null job on mismatch", async () => {
      const mismatched = createSummary(faker.string.uuid(), createJob());

      (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        publisherServiceConfigurations: [mismatched],
      });

      const result = await service.getPublisherBackCatalogueJobReport(faker.string.uuid());

      expect(result).toBeNull();
    });

    it('should propagate report request failures instead of converting them into a no-job state', async () => {
      const failure = new Error('FORBIDDEN');

      (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockRejectedValue(failure);

      await expect(service.getPublisherBackCatalogueJobReport(faker.string.uuid())).rejects.toBe(failure);
    });
  });

  describe('publisher service-configuration report (APP-02A)', () => {
    const createFilters = (
      overrides?: Partial<PublisherServiceConfigurationReportFilters>,
    ): PublisherServiceConfigurationReportFilters => ({
      publishers: [faker.string.uuid(), faker.string.uuid()],
      packages: [ThothPackage.Sphinx],
      enabledPlatforms: [DistributionPlatform.Oapen, DistributionPlatform.Doab],
      jobStatuses: [DistributionJobStatus.Failed, DistributionJobStatus.Cancelled],
      withoutBackCatalogueJob: null,
      ...overrides,
    });

    const order = { field: PublisherField.PublisherName, direction: Direction.Asc };

    describe('getPublisherServiceConfigurationReport', () => {
      it('should request one paginated report page with every semantic filter, explicit bounds and explicit order', async () => {
        const filters = createFilters({ withoutBackCatalogueJob: true });

        (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockResolvedValue({
          publisherServiceConfigurations: [],
        });

        await service.getPublisherServiceConfigurationReport({ filters, limit: 20, offset: 40, order });

        expect(mockGraphqlService.query).toHaveBeenCalledWith(GET_PUBLISHER_SERVICE_CONFIGURATION_REPORT, {
          publishers: filters.publishers,
          packages: filters.packages,
          enabledPlatforms: filters.enabledPlatforms,
          jobStatuses: filters.jobStatuses,
          withoutBackCatalogueJob: true,
          limit: 20,
          offset: 40,
          order,
        });
      });

      it('should pass the tri-state job-presence value through unchanged', async () => {
        (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockResolvedValue({
          publisherServiceConfigurations: [],
        });

        for (const withoutBackCatalogueJob of [null, true, false]) {
          await service.getPublisherServiceConfigurationReport({
            filters: createFilters({ withoutBackCatalogueJob }),
            limit: 20,
            offset: 0,
            order,
          });

          expect(mockGraphqlService.query).toHaveBeenLastCalledWith(
            GET_PUBLISHER_SERVICE_CONFIGURATION_REPORT,
            expect.objectContaining({ withoutBackCatalogueJob }),
          );
        }
      });

      it('should use the consolidated report document, not per-publisher protected reads', () => {
        const document = print(GET_PUBLISHER_SERVICE_CONFIGURATION_REPORT);

        expect(document).toContain('publisherServiceConfigurations(');
        // Not the single-publisher protected configuration read.
        expect(document).not.toContain('publisherServiceConfiguration(');
        // Every semantic filter, both page bounds and the order are explicit
        // non-null variables - nothing leans on an implicit backend default.
        expect(document).toContain('$publishers: [Uuid!]!');
        expect(document).toContain('$packages: [ThothPackage!]!');
        expect(document).toContain('$enabledPlatforms: [DistributionPlatform!]!');
        expect(document).toContain('$jobStatuses: [DistributionJobStatus!]!');
        expect(document).toContain('$withoutBackCatalogueJob: Boolean');
        expect(document).toContain('$limit: Int!');
        expect(document).toContain('$offset: Int!');
        expect(document).toContain('$order: PublisherOrderBy!');
      });

      it('should request only the bounded index fields: no attempt history, claim/lease internals or worker controls', () => {
        const document = print(GET_PUBLISHER_SERVICE_CONFIGURATION_REPORT);

        expect(document).toContain('latestBackCatalogueJob');
        expect(document).toContain('lastChange');
        expect(document).not.toContain('attempts {');
        expect(document).not.toContain('attemptCount');
        expect(document).not.toContain('claimedAt');
        expect(document).not.toContain('leaseExpiresAt');
        expect(document).not.toContain('availableAt');
        expect(document).not.toContain('lastErrorCode');
        expect(document).not.toContain('lastErrorDetail');
      });

      it('should return the report rows unchanged, preserving null jobs and null last changes as null', async () => {
        const summaries = [
          {
            configuration: {
              publisher: { publisherId: faker.string.uuid(), publisherName: 'Publisher A' },
              subscriptionPackage: 'OASIS',
              enabledDistributionPlatforms: [],
            },
            lastChange: null,
            latestBackCatalogueJob: null,
          },
        ];

        (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockResolvedValue({
          publisherServiceConfigurations: summaries,
        });

        const result = await service.getPublisherServiceConfigurationReport({
          filters: createFilters(),
          limit: 20,
          offset: 0,
          order,
        });

        expect(result).toBe(summaries);
        expect(result[0].latestBackCatalogueJob).toBeNull();
        expect(result[0].lastChange).toBeNull();
      });

      it('should propagate report request failures instead of converting them into an empty page', async () => {
        const failure = new Error('FORBIDDEN');

        (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockRejectedValue(failure);

        await expect(
          service.getPublisherServiceConfigurationReport({ filters: createFilters(), limit: 20, offset: 0, order }),
        ).rejects.toBe(failure);
      });
    });

    describe('getPublisherServiceConfigurationReportCount', () => {
      it('should request the count with exactly the semantic filters and nothing else', async () => {
        const filters = createFilters({ withoutBackCatalogueJob: false });

        (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockResolvedValue({
          publisherServiceConfigurationCount: 12,
        });

        await service.getPublisherServiceConfigurationReportCount(filters);

        expect(mockGraphqlService.query).toHaveBeenCalledWith(GET_PUBLISHER_SERVICE_CONFIGURATION_REPORT_COUNT, {
          publishers: filters.publishers,
          packages: filters.packages,
          enabledPlatforms: filters.enabledPlatforms,
          jobStatuses: filters.jobStatuses,
          withoutBackCatalogueJob: false,
        });
      });

      it('should use a count document without pagination or order variables', () => {
        const document = print(GET_PUBLISHER_SERVICE_CONFIGURATION_REPORT_COUNT);

        expect(document).toContain('publisherServiceConfigurationCount(');
        expect(document).not.toContain('$limit');
        expect(document).not.toContain('$offset');
        expect(document).not.toContain('$order');
      });

      it('should send the identical semantic filter variables as the list for the same filter model', async () => {
        const filters = createFilters({ withoutBackCatalogueJob: true });

        (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockResolvedValue({
          publisherServiceConfigurations: [],
          publisherServiceConfigurationCount: 0,
        });

        await service.getPublisherServiceConfigurationReport({ filters, limit: 20, offset: 20, order });
        await service.getPublisherServiceConfigurationReportCount(filters);

        const [, listVariables] = (mockGraphqlService.query as ReturnType<typeof vi.fn>).mock.calls.at(-2) as [
          unknown,
          Record<string, unknown>,
        ];
        const [, countVariables] = (mockGraphqlService.query as ReturnType<typeof vi.fn>).mock.calls.at(-1) as [
          unknown,
          Record<string, unknown>,
        ];
        const { limit: _limit, offset: _offset, order: _order, ...listSemanticVariables } = listVariables;

        expect(countVariables).toEqual(listSemanticVariables);
      });

      it('should return the API-provided total unchanged and propagate failures', async () => {
        (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockResolvedValue({
          publisherServiceConfigurationCount: 57,
        });

        await expect(service.getPublisherServiceConfigurationReportCount(createFilters())).resolves.toBe(57);

        const failure = new Error('FORBIDDEN');
        (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockRejectedValue(failure);

        await expect(service.getPublisherServiceConfigurationReportCount(createFilters())).rejects.toBe(failure);
      });
    });
  });

  describe('replacePublisherServiceConfiguration', () => {
    const createInput = (
      overrides?: Partial<ReplacePublisherServiceConfigurationInput>,
    ): ReplacePublisherServiceConfigurationInput => ({
      publisherId: faker.string.uuid(),
      subscriptionPackage: ThothPackage.Sphinx,
      enabledDistributionPlatforms: [DistributionPlatform.Oapen, DistributionPlatform.InternetArchive],
      expectedUpdatedAt: '2026-08-01T10:00:00Z',
      ...overrides,
    });

    it('should send the exact replace input, including expectedUpdatedAt, unchanged', async () => {
      const input = createInput();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        replacePublisherServiceConfiguration: {
          subscriptionPackage: 'SPHINX',
          effectiveCapabilities: ['OAI_PMH'],
          enabledDistributionPlatforms: [{ platform: 'OAPEN' }],
          updatedAt: '2026-08-01T11:00:00Z',
        },
      });

      await service.replacePublisherServiceConfiguration(input);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(expect.anything(), { data: input });
      expect((mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mock.calls[0][1].data.expectedUpdatedAt).toBe(
        input.expectedUpdatedAt,
      );
    });

    it('should not add, drop or reorder any part of the desired platform set', async () => {
      const input = createInput({ enabledDistributionPlatforms: [DistributionPlatform.Oapen] });

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        replacePublisherServiceConfiguration: { enabledDistributionPlatforms: [] },
      });

      await service.replacePublisherServiceConfiguration(input);

      const sentData = (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mock.calls[0][1].data;

      expect(sentData.enabledDistributionPlatforms).toEqual([DistributionPlatform.Oapen]);
    });

    it('should return the server-normalized configuration unchanged', async () => {
      // The server may normalize the desired set (for example by adding a linked
      // platform). The service returns exactly what it was given.
      const serverConfiguration = {
        subscriptionPackage: 'PYRAMID',
        effectiveCapabilities: ['OAI_PMH', 'METRICS_COLLECT'],
        enabledDistributionPlatforms: [{ platform: 'OAPEN' }, { platform: 'DOAB' }],
        updatedAt: '2026-08-01T11:00:00Z',
      };

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        replacePublisherServiceConfiguration: serverConfiguration,
      });

      const result = await service.replacePublisherServiceConfiguration(
        createInput({ enabledDistributionPlatforms: [DistributionPlatform.Oapen] }),
      );

      expect(result).toBe(serverConfiguration);
    });

    it('should propagate mutation failures instead of reporting a save', async () => {
      const failure = new Error('Configuration changed');

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockRejectedValue(failure);

      await expect(service.replacePublisherServiceConfiguration(createInput())).rejects.toBe(failure);
    });
  });
});
