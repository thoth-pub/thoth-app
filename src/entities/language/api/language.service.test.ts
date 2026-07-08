import { faker } from '@faker-js/faker';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphqlService } from '@/src/shared/api/graphqlService';

import { LanguageDtoMapper } from '../model/language.mapper';
import type { LanguageDto, LanguageEntity } from '../model/language.types';
import { LanguageService } from './language.service';

describe('LanguageService', () => {
  let service: LanguageService;
  let mockGraphqlService: GraphqlService;
  let mockMapper: LanguageDtoMapper;

  const createEntity = (overrides?: Partial<LanguageEntity>): LanguageEntity => ({
    id: faker.string.uuid(),
    code: 'ENG' as LanguageEntity['code'],
    relation: 'ORIGINAL' as LanguageEntity['relation'],
    ...overrides,
  });

  beforeEach(() => {
    mockGraphqlService = {
      query: vi.fn(),
      mutation: vi.fn(),
    } as unknown as GraphqlService;

    mockMapper = new LanguageDtoMapper();
    vi.spyOn(mockMapper, 'toDto').mockImplementation((entity: LanguageEntity) => ({
      languageId: entity.id,
      languageCode: entity.code,
      languageRelation: entity.relation,
    }));

    vi.spyOn(mockMapper, 'toEntity').mockImplementation((dto: LanguageDto) => ({
      id: dto.languageId,
      code: dto.languageCode,
      relation: dto.languageRelation,
    }));

    service = new LanguageService(mockGraphqlService, mockMapper);
  });

  describe('createLanguage', () => {
    it('should call mutation with correct variables and return mapped entity', async () => {
      const entity = createEntity();
      const workId = faker.string.uuid();
      const createdId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createLanguage: {
          languageId: createdId,
          languageCode: entity.code,
          languageRelation: entity.relation,
        },
      });

      const result = await service.createLanguage(entity, workId);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({
            workId,
            languageCode: entity.code,
            languageRelation: entity.relation,
          }),
        }),
      );
      expect(result.id).toBe(createdId);
    });

    it('should call toDto with the entity', async () => {
      const entity = createEntity();
      const workId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createLanguage: { languageId: faker.string.uuid() },
      });

      await service.createLanguage(entity, workId);

      expect(mockMapper.toDto).toHaveBeenCalledWith(entity);
    });
  });

  describe('updateLanguage', () => {
    it('should include languageId in mutation variables', async () => {
      const entity = createEntity();
      const workId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        updateLanguage: {
          languageId: entity.id,
          languageCode: entity.code,
          languageRelation: entity.relation,
        },
      });

      const result = await service.updateLanguage(entity, workId);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({
            languageId: entity.id,
            workId,
          }),
        }),
      );
      expect(result).toEqual(entity);
    });
  });

  describe('deleteLanguage', () => {
    it('should call mutation with languageId', async () => {
      const languageId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        deleteLanguage: { languageId },
      });

      await service.deleteLanguage(languageId);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ languageId }),
      );
    });

    it('should throw when mutation fails', async () => {
      const languageId = faker.string.uuid();
      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Delete failed'));

      const promise = service.deleteLanguage(languageId);

      await expect(promise).rejects.toThrow('Delete failed');
    });
  });
});
