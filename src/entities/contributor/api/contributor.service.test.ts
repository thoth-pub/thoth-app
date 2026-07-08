import { faker } from '@faker-js/faker';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphqlService } from '@/src/shared/api/graphqlService';

import { ContributorDtoMapper } from '../model/contributor.mapper';
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
      lastContributionTitle: (dto.contributions?.[0]?.work?.title) ?? '',
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
