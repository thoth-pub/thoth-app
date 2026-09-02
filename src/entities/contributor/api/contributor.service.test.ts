import { faker } from '@faker-js/faker';
import type { DocumentNode } from 'graphql';
import { print } from 'graphql';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphqlService } from '@/src/shared/api/graphqlService';

import { ContributorDtoMapper } from '../model/contributor.mapper';
import { GET_CONTRIBUTORS } from '../model/contributor.schema';
import type { ContributorDto, ContributorEntity } from '../model/contributor.types';
import { ContributorService } from './contributor.service';

describe('ContributorService', () => {
  let service: ContributorService;
  let mockGraphqlService: GraphqlService;
  let mockMapper: ContributorDtoMapper;

  const createEntity = (overrides?: Partial<ContributorEntity>): ContributorEntity => ({
    id: faker.string.uuid(),
    name: 'John Doe',
    orcid: '0000-0001-2345-6789',
    updatedAt: '2024-01-01T00:00:00Z',
    lastName: 'Doe',
    fullName: 'John Doe',
    firstName: 'John',
    website: 'https://example.com',
    lastContributionTitle: 'Test Work',
    ...overrides,
  });

  beforeEach(() => {
    mockGraphqlService = {
      query: vi.fn(),
      mutation: vi.fn(),
    } as unknown as GraphqlService;

    mockMapper = new ContributorDtoMapper();
    vi.spyOn(mockMapper, 'toDto').mockImplementation((entity: any) => ({
      contributorId: entity.id,
      fullName: entity.fullName,
      lastName: entity.lastName,
      firstName: entity.firstName ?? null,
      orcid: entity.orcid,
      website: entity.website ?? null,
    }));

    vi.spyOn(mockMapper, 'toEntity').mockImplementation((dto: ContributorDto) => ({
      id: dto.contributorId,
      name: dto.fullName,
      orcid: dto.orcid ?? '',
      updatedAt: dto.updatedAt ?? '',
      lastName: dto.lastName ?? '',
      fullName: dto.fullName,
      firstName: dto.firstName ?? '',
      website: dto.website ?? '',
      lastContributionTitle: (dto.contributions?.[0]?.work?.titles ?? []).find((title) => title.canonical)?.title ?? '',
    }));

    service = new ContributorService(mockGraphqlService, mockMapper);
  });

  describe('getContributors', () => {
    it('should call query with filter', async () => {
      const filter = 'John';

      (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        contributors: [],
      });

      await service.getContributors(filter);

      expect(mockGraphqlService.query).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ filter }),
      );
    });

    it('should map contributors to entities', async () => {
      const dtos = [
        { contributorId: faker.string.uuid(), fullName: 'A', contributions: [] },
        { contributorId: faker.string.uuid(), fullName: 'B', contributions: [] },
      ];

      (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        contributors: dtos,
      });

      const result = await service.getContributors('');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(dtos[0].contributorId);
    });

    /**
     * Issue #107: the deprecated `work { title }` projection let a latest work without a
     * canonical title reject the whole identity lookup with EntityNotFound. These tests run the
     * real mapper to prove the lookup itself now survives every optional-title data state.
     */
    describe('optional latest-contribution title metadata', () => {
      const identity = {
        fullName: 'Jane Doe',
        lastName: 'Doe',
        firstName: 'Jane',
        orcid: null,
        website: null,
        updatedAt: '2024-01-01T00:00:00Z',
      };

      it('still returns identity when the latest related work has no usable title', async () => {
        const serviceWithRealMapper = new ContributorService(mockGraphqlService);

        (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockResolvedValue({
          contributors: [
            { ...identity, contributorId: 'no-titles', contributions: [{ work: { titles: [] } }] },
            {
              ...identity,
              contributorId: 'no-canonical',
              contributions: [{ work: { titles: [{ canonical: false, title: 'Uma Tradução' }] } }],
            },
            {
              ...identity,
              contributorId: 'with-canonical',
              contributions: [{ work: { titles: [{ canonical: true, title: 'An Earlier Book' }] } }],
            },
          ],
        });

        const result = await serviceWithRealMapper.getContributors('Jane Doe');

        expect(result.map(({ id, lastContributionTitle }) => [id, lastContributionTitle])).toEqual([
          ['no-titles', ''],
          ['no-canonical', ''],
          ['with-canonical', 'An Earlier Book'],
        ]);
        expect(result.every(({ fullName }) => fullName === 'Jane Doe')).toBe(true);
      });

      it('propagates a genuine GetContributors rejection instead of returning no matches', async () => {
        const serviceWithRealMapper = new ContributorService(mockGraphqlService);
        const failure = new Error('401 Unauthorized');

        (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockRejectedValue(failure);

        await expect(serviceWithRealMapper.getContributors('Jane Doe')).rejects.toBe(failure);
      });

      it('no longer projects the deprecated Work.title scalar', () => {
        const printed = print(GET_CONTRIBUTORS as unknown as DocumentNode);

        // The fragile shape: a scalar `title` selected directly on the contribution's work.
        expect(printed).not.toMatch(/work\s*\{\s*title\s*\}/);
        // The safe shape: the titles list, whose absence is an empty array rather than an error.
        expect(printed).toMatch(/titles\s*\{\s*canonical\s+title\s*\}/);
      });
    });

    /**
     * Issue #144: the exact-ORCID reuse path (issue #135) builds the planned contribution from
     * the looked-up contributor's firstName and website, but GET_CONTRIBUTORS never projected
     * either field, so the mapper's '' defaults silently replaced the stored values. Parser tests
     * mock fully hydrated entities and cannot see this, so the document projection is asserted
     * here, against the query that actually runs.
     */
    describe('existing-contributor hydration (issue #144)', () => {
      it('projects the identity fields the ORCID-reuse path consumes', () => {
        const printed = print(GET_CONTRIBUTORS as unknown as DocumentNode);

        expect(printed).toMatch(/\bfirstName\b/);
        expect(printed).toMatch(/\bwebsite\b/);
      });

      it('returns backend-provided firstName and website through the real mapper', async () => {
        const serviceWithRealMapper = new ContributorService(mockGraphqlService);

        (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockResolvedValue({
          contributors: [
            {
              contributorId: 'stored-contributor',
              fullName: 'Jane Doe',
              lastName: 'Doe',
              firstName: 'Jane',
              website: 'https://stored.example',
              orcid: null,
              updatedAt: '2024-01-01T00:00:00Z',
              contributions: [],
            },
          ],
        });

        const [entity] = await serviceWithRealMapper.getContributors('Jane Doe');

        expect(entity.firstName).toBe('Jane');
        expect(entity.website).toBe('https://stored.example');
      });
    });
  });

  describe('getContributorsByOrcids', () => {
    const batchService = () =>
      service as ContributorService & {
        getContributorsByOrcids: (orcids: string[]) => Promise<ContributorEntity[]>;
      };

    it('sends the exact canonical ORCID list and maps every returned contributor', async () => {
      const orcids = [
        'https://orcid.org/0000-0002-1825-0097',
        'https://orcid.org/0000-0001-2345-6789',
      ];
      const dtos = [
        { contributorId: 'first', fullName: 'First Contributor', contributions: [] },
        { contributorId: 'second', fullName: 'Second Contributor', contributions: [] },
      ];
      vi.mocked(mockGraphqlService.query).mockResolvedValue({ contributorsByOrcids: dtos } as never);

      const result = await batchService().getContributorsByOrcids(orcids);

      expect(mockGraphqlService.query).toHaveBeenCalledWith(expect.anything(), { orcids });
      expect(result.map(({ id }) => id)).toEqual(['first', 'second']);
    });

    it('propagates a batch GraphQL rejection instead of returning no matches', async () => {
      const failure = new Error('503 Service Unavailable');
      vi.mocked(mockGraphqlService.query).mockRejectedValue(failure);

      await expect(
        batchService().getContributorsByOrcids(['https://orcid.org/0000-0002-1825-0097']),
      ).rejects.toBe(failure);
    });
  });

  describe('getContributor', () => {
    it('should call query with contributorId', async () => {
      const contributorId = faker.string.uuid();

      (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        contributor: { contributorId, fullName: 'John', contributions: [] },
      });

      const result = await service.getContributor(contributorId);

      expect(mockGraphqlService.query).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ contributorId }),
      );
      expect(result.id).toBe(contributorId);
    });
  });

  describe('createContributor', () => {
    it('should call mutation with data and return mapped entity', async () => {
      const entity = createEntity();
      const createdId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createContributor: { contributorId: createdId, fullName: entity.fullName, contributions: [] },
      });

      const result = await service.createContributor(entity);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({
            fullName: entity.fullName,
            lastName: entity.lastName,
          }),
        }),
      );
      expect(result.id).toBe(createdId);
    });

    it('should pass null for empty firstName', async () => {
      const entity = createEntity({ firstName: '' });

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createContributor: { contributorId: faker.string.uuid(), fullName: entity.fullName, contributions: [] },
      });

      await service.createContributor(entity);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({ firstName: null }),
        }),
      );
    });

    it('should pass null for empty website', async () => {
      const entity = createEntity({ website: '' });

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createContributor: { contributorId: faker.string.uuid(), fullName: entity.fullName, contributions: [] },
      });

      await service.createContributor(entity);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({ website: null }),
        }),
      );
    });
  });

  describe('updateContributor', () => {
    it('should call mutation with contributorId', async () => {
      const entity = createEntity();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        updateContributor: { contributorId: entity.id, fullName: entity.fullName, contributions: [] },
      });

      const result = await service.updateContributor(entity);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({ contributorId: entity.id }),
        }),
      );
      expect(result.id).toBe(entity.id);
    });
  });

  describe('getLinkedPublishers', () => {
    it('should paginate through contributions until empty', async () => {
      const contributorId = faker.string.uuid();
      const publisherId1 = faker.string.uuid();
      const publisherId2 = faker.string.uuid();

      (mockGraphqlService.query as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          contributor: {
            contributions: [
              { work: { imprint: { publisherId: publisherId1 } } },
              { work: { imprint: { publisherId: publisherId2 } } },
            ],
          },
        })
        .mockResolvedValueOnce({
          contributor: {
            contributions: [
              { work: { imprint: { publisherId: faker.string.uuid() } } },
            ],
          },
        })
        .mockResolvedValueOnce({
          contributor: {
            contributions: [],
          },
        });

      const result = await service.getLinkedPublishers(contributorId);

      expect(result).toHaveLength(3);
      expect(result[0]).toBe(publisherId1);
      expect(result[1]).toBe(publisherId2);
      expect(mockGraphqlService.query).toHaveBeenCalledTimes(3);
    });

    it('should stop immediately when first page is empty', async () => {
      const contributorId = faker.string.uuid();

      (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        contributor: { contributions: [] },
      });

      const result = await service.getLinkedPublishers(contributorId);

      expect(result).toEqual([]);
      expect(mockGraphqlService.query).toHaveBeenCalledTimes(1);
    });
  });
});
