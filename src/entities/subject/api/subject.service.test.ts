import { faker } from '@faker-js/faker';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SubjectType } from '@/gql/graphql';
import { GraphqlService } from '@/src/shared/api/graphqlService';

import { SubjectDtoMapper } from '../model/subject.mapper';
import type { SubjectDto, SubjectEntity } from '../model/subject.types';
import { SubjectService } from './subject.service';

describe('SubjectService', () => {
  let service: SubjectService;
  let mockGraphqlService: GraphqlService;
  let mockMapper: SubjectDtoMapper;

  const createEntity = (overrides?: Partial<SubjectEntity>): SubjectEntity => ({
    id: faker.string.uuid(),
    code: 'JAN',
    type: SubjectType.Thema,
    ordinal: 1,
    ...overrides,
  });

  beforeEach(() => {
    mockGraphqlService = {
      query: vi.fn(),
      mutation: vi.fn(),
    } as unknown as GraphqlService;

    mockMapper = new SubjectDtoMapper();
    vi.spyOn(mockMapper, 'toDto').mockImplementation((entity: SubjectEntity) => ({
      subjectId: entity.id,
      subjectCode: entity.code,
      subjectType: entity.type,
      subjectOrdinal: entity.ordinal,
    }));

    vi.spyOn(mockMapper, 'toEntity').mockImplementation((dto: SubjectDto) => ({
      id: dto.subjectId ?? '',
      code: dto.subjectCode ?? '',
      type: dto.subjectType ?? (SubjectType.Custom as SubjectEntity['type']),
      ordinal: dto.subjectOrdinal ?? 1,
    }));

    service = new SubjectService(mockGraphqlService, mockMapper);
  });

  describe('createSubject', () => {
    it('should call mutation with all fields from the entity', async () => {
      const entity = createEntity();
      const workId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createSubject: { subjectId: faker.string.uuid(), subjectCode: entity.code, subjectType: entity.type, subjectOrdinal: entity.ordinal },
      });

      await service.createSubject(entity, workId);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({
            subjectCode: entity.code,
            subjectType: entity.type,
            subjectOrdinal: entity.ordinal,
            workId,
          }),
        }),
      );
    });

    it('should fall back to defaults when fields are null or undefined', async () => {
      const entity = createEntity({ code: undefined as unknown as string, type: undefined as unknown as SubjectEntity['type'], ordinal: undefined as unknown as number });
      const workId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createSubject: { subjectId: faker.string.uuid() },
      });

      await service.createSubject(entity, workId);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({
            subjectCode: '',
            subjectType: SubjectType.Custom,
            subjectOrdinal: 1,
          }),
        }),
      );
    });

    it('should pass { ...data, id: \"\" } to toDto', async () => {
      const entity = createEntity();
      const workId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createSubject: { subjectId: faker.string.uuid() },
      });

      await service.createSubject(entity, workId);

      expect(mockMapper.toDto).toHaveBeenCalledWith(expect.objectContaining({ id: '' }));
    });
  });

  describe('updateSubject', () => {
    it('should include subjectId in mutation variables', async () => {
      const entity = createEntity();
      const workId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        updateSubject: { subjectId: entity.id },
      });

      await service.updateSubject(entity, workId);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({
            subjectId: entity.id,
            workId,
          }),
        }),
      );
    });
  });

  describe('deleteSubject', () => {
    it('should call mutation with subjectId', async () => {
      const subjectId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        deleteSubject: { subjectId },
      });

      await service.deleteSubject(subjectId);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ subjectId }),
      );
    });

    it('should throw when mutation fails', async () => {
      const subjectId = faker.string.uuid();
      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Delete failed'));

      const promise = service.deleteSubject(subjectId);

      await expect(promise).rejects.toThrow('Delete failed');
    });
  });

  describe('moveSubject', () => {
    it('should call mutation with subjectId and newOrdinal', async () => {
      const subjectId = faker.string.uuid();
      const newOrdinal = 5;

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        moveSubject: { subjectId },
      });

      await service.moveSubject(subjectId, newOrdinal);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ subjectId, newOrdinal }),
      );
    });
  });
});
