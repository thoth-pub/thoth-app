import { faker } from '@faker-js/faker';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MarkdownFormats } from '@/src/shared/constants/markdown';
import { GraphqlService } from '@/src/shared/api/graphqlService';

import { EndorsementDtoMapper } from '../model/endorsement.mapper';
import type { EndorsementDto, EndorsementEntity } from '../model/endorsement.types';
import { EndorsementService } from './endorsement.service';

describe('EndorsementService', () => {
  let service: EndorsementService;
  let mockGraphqlService: GraphqlService;
  let mockMapper: EndorsementDtoMapper;

  const createEntity = (overrides?: Partial<EndorsementEntity>): EndorsementEntity => ({
    id: faker.string.uuid(),
    workId: faker.string.uuid(),
    authorName: 'John Doe',
    authorOrcid: 'https://orcid.org/0000-0001-2345-6789',
    authorRole: 'Reviewer',
    authorInstitutionId: faker.string.uuid(),
    authorInstitutionName: 'Test University',
    authorInstitutionRor: 'https://ror.org/123456',
    url: 'https://example.com/endorsement',
    text: 'Great work!',
    orderNumber: 1,
    ...overrides,
  });

  beforeEach(() => {
    mockGraphqlService = {
      query: vi.fn(),
      mutation: vi.fn(),
    } as unknown as GraphqlService;

    mockMapper = new EndorsementDtoMapper();
    vi.spyOn(mockMapper, 'toDto').mockImplementation((entity: EndorsementEntity) => ({
      endorsementId: entity.id,
      authorName: entity.authorName,
      authorOrcid: entity.authorOrcid,
      authorRole: entity.authorRole,
      authorInstitutionId: entity.authorInstitutionId,
      authorInstitutionName: entity.authorInstitutionName,
      url: entity.url,
      text: entity.text,
      orderNumber: entity.orderNumber,
    }));

    vi.spyOn(mockMapper, 'toEntity').mockImplementation((dto: EndorsementDto) => ({
      id: dto.endorsementId,
      workId: '',
      authorName: dto.authorName ?? '',
      authorOrcid: dto.authorOrcid ?? '',
      authorRole: dto.authorRole ?? '',
      authorInstitutionId: dto.authorInstitutionId ?? '',
      authorInstitutionName: dto.authorInstitutionName ?? '',
      authorInstitutionRor: '',
      url: dto.url ?? '',
      text: dto.text ?? '',
      orderNumber: dto.endorsementOrdinal ?? dto.orderNumber ?? 1,
    }));

    service = new EndorsementService(mockGraphqlService, mockMapper);
  });

  describe('createEndorsement', () => {
    it('should set PLAIN_TEXT markup when both text and authorRole are plain', async () => {
      const entity = createEntity({ text: 'Plain text', authorRole: 'Editor' });
      const workId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createEndorsement: { endorsementId: faker.string.uuid() },
      });

      await service.createEndorsement(entity, workId);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ markupFormat: MarkdownFormats.enum.PLAIN_TEXT }),
      );
    });

    it('should set JATS_XML markup when text contains JATS tags', async () => {
      const entity = createEntity({ text: '<italic>Great</italic> work', authorRole: 'Reviewer' });
      const workId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createEndorsement: { endorsementId: faker.string.uuid() },
      });

      await service.createEndorsement(entity, workId);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ markupFormat: MarkdownFormats.enum.JATS_XML }),
      );
    });

    it('should set JATS_XML markup when authorRole contains JATS tags', async () => {
      const entity = createEntity({ text: 'Plain text', authorRole: '<bold>Reviewer</bold>' });
      const workId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createEndorsement: { endorsementId: faker.string.uuid() },
      });

      await service.createEndorsement(entity, workId);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ markupFormat: MarkdownFormats.enum.JATS_XML }),
      );
    });

    it('should default endorsementOrdinal to 1 when orderNumber is undefined', async () => {
      const entity = createEntity({ orderNumber: undefined as unknown as number });
      const workId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createEndorsement: { endorsementId: faker.string.uuid() },
      });

      await service.createEndorsement(entity, workId);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({ endorsementOrdinal: 1 }),
        }),
      );
    });

    it('should call toDto with the entity', async () => {
      const entity = createEntity();
      const workId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createEndorsement: { endorsementId: faker.string.uuid() },
      });

      await service.createEndorsement(entity, workId);

      expect(mockMapper.toDto).toHaveBeenCalledWith(entity);
    });
  });

  describe('updateEndorsement', () => {
    it('should include endorsementId and markup format in mutation variables', async () => {
      const entity = createEntity();
      const workId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        updateEndorsement: { endorsementId: entity.id },
      });

      await service.updateEndorsement(entity, workId);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({
            endorsementId: entity.id,
            workId,
          }),
          markupFormat: MarkdownFormats.enum.PLAIN_TEXT,
        }),
      );
    });

    it('should detect JATS markup in text on update', async () => {
      const entity = createEntity({ text: '<underline>Underlined</underline> endorsement text' });
      const workId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        updateEndorsement: { endorsementId: entity.id },
      });

      await service.updateEndorsement(entity, workId);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ markupFormat: MarkdownFormats.enum.JATS_XML }),
      );
    });
  });

  describe('deleteEndorsement', () => {
    it('should call mutation with endorsementId', async () => {
      const endorsementId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        deleteEndorsement: { endorsementId },
      });

      await service.deleteEndorsement(endorsementId);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ endorsementId }),
      );
    });

    it('should throw when mutation fails', async () => {
      const endorsementId = faker.string.uuid();
      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Delete failed'));

      const promise = service.deleteEndorsement(endorsementId);

      await expect(promise).rejects.toThrow('Delete failed');
    });
  });

  describe('moveEndorsement', () => {
    it('should call mutation with endorsementId and newOrdinal', async () => {
      const endorsementId = faker.string.uuid();
      const newOrdinal = 4;

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        moveEndorsement: { endorsementId, endorsementOrdinal: newOrdinal },
      });

      const result = await service.moveEndorsement(endorsementId, newOrdinal);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ endorsementId, newOrdinal }),
      );
      expect(result.id).toBe(endorsementId);
    });
  });
});
