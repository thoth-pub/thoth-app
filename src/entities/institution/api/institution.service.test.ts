import { faker } from '@faker-js/faker';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphqlService } from '@/src/shared/api/graphqlService';

import { InstitutionDtoMapper } from '../model/institution.mapper';
import type { InstitutionDto, InstitutionEntity } from '../model/institution.types';
import { InstitutionService } from './institution.service';

describe('InstitutionService', () => {
  let service: InstitutionService;
  let mockGraphqlService: GraphqlService;
  let mockMapper: InstitutionDtoMapper;

  const createEntity = (overrides?: Partial<InstitutionEntity>): InstitutionEntity => ({
    id: faker.string.uuid(),
    name: 'Test University',
    doi: '10.1234/test',
    ror: 'https://ror.org/test',
    countryCode: 'GB',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  });

  beforeEach(() => {
    mockGraphqlService = {
      query: vi.fn(),
      mutation: vi.fn(),
    } as unknown as GraphqlService;

    mockMapper = new InstitutionDtoMapper();
    vi.spyOn(mockMapper, 'toDto').mockImplementation((entity: InstitutionEntity) => ({
      institutionId: entity.id,
      institutionName: entity.name,
      institutionDoi: entity.doi,
      ror: entity.ror,
      countryCode: entity.countryCode as InstitutionDto['countryCode'],
      updatedAt: entity.updatedAt,
    }));

    vi.spyOn(mockMapper, 'toEntity').mockImplementation((dto: InstitutionDto) => ({
      id: dto.institutionId,
      name: dto.institutionName,
      doi: dto.institutionDoi,
      ror: dto.ror ?? '',
      countryCode: dto.countryCode ?? '',
      updatedAt: dto.updatedAt,
    }));

    service = new InstitutionService(mockGraphqlService, mockMapper);
  });

  describe('getInstitutionsCount', () => {
    it('should call query and return count', async () => {
      const count = 42;

      (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        institutionCount: count,
      });

      const result = await service.getInstitutionsCount();

      expect(mockGraphqlService.query).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ filter: '' }),
      );
      expect(result).toBe(count);
    });

    it('should pass filter argument', async () => {
      const filter = 'test';

      (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        institutionCount: 0,
      });

      await service.getInstitutionsCount(filter);

      expect(mockGraphqlService.query).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ filter }),
      );
    });

    it('should return 0 when response is undefined', async () => {
      (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockResolvedValue({});

      const result = await service.getInstitutionsCount();

      expect(result).toBe(0);
    });
  });

  describe('getInstitutions', () => {
    it('should call query with default offset and limit', async () => {
      const entities = [createEntity(), createEntity()];

      (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        institutions: entities.map((e) => ({
          institutionId: e.id,
          institutionName: e.name,
          institutionDoi: e.doi,
          ror: e.ror,
          countryCode: e.countryCode,
          updatedAt: e.updatedAt,
        })),
      });

      const result = await service.getInstitutions();

      expect(mockGraphqlService.query).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ offset: 0 }),
      );
      expect(result).toHaveLength(2);
    });

    it('should pass offset, limit, and filter', async () => {
      (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        institutions: [],
      });

      await service.getInstitutions(10, 5, 'test');

      expect(mockGraphqlService.query).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ offset: 10, limit: 5, filter: 'test' }),
      );
    });

    it('should use mapper to convert each dto', async () => {
      const dto: InstitutionDto = {
        institutionId: faker.string.uuid(),
        institutionName: 'Test',
        institutionDoi: '',
        ror: '',
        countryCode: null as unknown as InstitutionDto['countryCode'],
        updatedAt: '',
      };

      (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        institutions: [dto],
      });

      const spy = vi.spyOn(mockMapper, 'toEntity');

      await service.getInstitutions();

      expect(spy).toHaveBeenCalledWith(dto, expect.anything(), expect.anything());
    });
  });
});
