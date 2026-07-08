import { faker } from '@faker-js/faker';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphqlService } from '@/src/shared/api/graphqlService';

import { FundingDtoMapper } from '../model/funding.mapper';
import type { FundingDto, FundingEntity } from '../model/funding.types';
import { FundingService } from './funding.service';

describe('FundingService', () => {
  let service: FundingService;
  let mockGraphqlService: GraphqlService;
  let mockMapper: FundingDtoMapper;

  const createEntity = (overrides?: Partial<FundingEntity>): FundingEntity => ({
    id: faker.string.uuid(),
    grantNumber: 'GRANT-001',
    institutionId: faker.string.uuid(),
    program: 'Test Program',
    projectName: 'Test Project',
    projectShortname: 'TP',
    institutionName: 'Test Institution',
    institutionRor: 'https://ror.org/test',
    ...overrides,
  });

  beforeEach(() => {
    mockGraphqlService = {
      query: vi.fn(),
      mutation: vi.fn(),
    } as unknown as GraphqlService;

    mockMapper = new FundingDtoMapper();
    vi.spyOn(mockMapper, 'toDto').mockImplementation((entity: FundingEntity) => ({
      fundingId: entity.id,
      grantNumber: entity.grantNumber,
      institutionId: entity.institutionId,
      program: entity.program,
      projectName: entity.projectName,
      projectShortname: entity.projectShortname,
    }));

    vi.spyOn(mockMapper, 'toEntity').mockImplementation((dto: FundingDto) => ({
      id: dto.fundingId,
      grantNumber: dto.grantNumber ?? '',
      institutionId: dto.institutionId,
      program: dto.program ?? '',
      projectName: dto.projectName ?? '',
      projectShortname: dto.projectShortname ?? '',
      institutionName: dto.institution?.institutionName ?? '',
      institutionRor: dto.institution?.ror ?? '',
    }));

    service = new FundingService(mockGraphqlService, mockMapper);
  });

  describe('createFunding', () => {
    it('should call mutation with correct variables and return mapped entity', async () => {
      const entity = createEntity();
      const relatedWorkId = faker.string.uuid();
      const createdId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createFunding: {
          fundingId: createdId,
          grantNumber: entity.grantNumber,
          institutionId: entity.institutionId,
          program: entity.program,
          projectName: entity.projectName,
          projectShortname: entity.projectShortname,
          institution: { institutionName: entity.institutionName, ror: entity.institutionRor },
        },
      });

      const result = await service.createFunding({ data: entity, relatedWorkId });

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({
            workId: relatedWorkId,
            institutionId: entity.institutionId,
          }),
        }),
      );
      expect(result.id).toBe(createdId);
    });

    it('should call toDto with modified entity (id, institutionName, institutionRor cleared)', async () => {
      const entity = createEntity();
      const relatedWorkId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createFunding: { fundingId: faker.string.uuid() },
      });

      await service.createFunding({ data: entity, relatedWorkId });

      expect(mockMapper.toDto).toHaveBeenCalledWith({
        ...entity,
        id: '',
        institutionName: '',
        institutionRor: '',
      });
    });
  });

  describe('updateFunding', () => {
    it('should include fundingId in mutation variables', async () => {
      const entity = createEntity();
      const relatedWorkId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        updateFunding: {
          fundingId: entity.id,
          grantNumber: entity.grantNumber,
          institutionId: entity.institutionId,
          program: entity.program,
          projectName: entity.projectName,
          projectShortname: entity.projectShortname,
          institution: { institutionName: entity.institutionName, ror: entity.institutionRor },
        },
      });

      const result = await service.updateFunding({ data: entity, relatedWorkId });

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({
            fundingId: entity.id,
            workId: relatedWorkId,
          }),
        }),
      );
      expect(result.id).toBe(entity.id);
    });
  });

  describe('deleteFunding', () => {
    it('should call mutation with fundingId', async () => {
      const fundingId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        deleteFunding: { fundingId },
      });

      await service.deleteFunding({ fundingId });

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ fundingId }),
      );
    });

    it('should throw when mutation fails', async () => {
      const fundingId = faker.string.uuid();
      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Delete failed'));

      const promise = service.deleteFunding({ fundingId });

      await expect(promise).rejects.toThrow('Delete failed');
    });
  });
});
