import { faker } from '@faker-js/faker';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphqlService } from '@/src/shared/api/graphqlService';
import { MarkdownFormats } from '@/src/shared/constants/markdown';
import type { FileStorage } from '@/src/shared/services';

import { AdditionalResourceDtoMapper } from '../model/additional-resource.mapper';
import type { AdditionalResourceDto, AdditionalResourceEntity } from '../model/additional-resource.types';
import { AdditionalResourceService } from './additional-resource.service';

describe('AdditionalResourceService', () => {
  let service: AdditionalResourceService;
  let mockGraphqlService: GraphqlService;
  let mockFileStorage: FileStorage;
  let mockMapper: AdditionalResourceDtoMapper;

  const createEntity = (overrides?: Partial<AdditionalResourceEntity>): AdditionalResourceEntity => ({
    id: faker.string.uuid(),
    workId: faker.string.uuid(),
    title: 'Resource Title',
    description: 'Resource description.',
    attribution: 'Author',
    resourceType: 'IMAGE',
    doi: '10.1234/resource',
    handle: '12345',
    url: 'https://example.com/resource',
    fileUrl: '',
    orderNumber: 1,
    ...overrides,
  });

  beforeEach(() => {
    mockGraphqlService = {
      query: vi.fn(),
      mutation: vi.fn(),
    } as unknown as GraphqlService;

    mockFileStorage = {
      uploadAdditionalResourceFile: vi.fn(),
      uploadFeaturedVideoFile: vi.fn(),
    } as unknown as FileStorage;

    mockMapper = new AdditionalResourceDtoMapper();
    vi.spyOn(mockMapper, 'toDto').mockImplementation((entity: AdditionalResourceEntity) => ({
      workResourceId: entity.id,
      workId: entity.workId,
      title: entity.title,
      description: entity.description,
      attribution: entity.attribution,
      resourceType: entity.resourceType,
      doi: entity.doi,
      handle: entity.handle,
      url: entity.url,
      file: entity.fileUrl ? { cdnUrl: entity.fileUrl } : null,
      resourceOrdinal: entity.orderNumber,
    }));

    vi.spyOn(mockMapper, 'toEntity').mockImplementation((dto: AdditionalResourceDto) => ({
      id: dto.workResourceId,
      workId: dto.workId,
      title: dto.title,
      description: dto.description ?? '',
      attribution: dto.attribution ?? '',
      resourceType: dto.resourceType,
      doi: dto.doi ?? '',
      handle: dto.handle ?? '',
      url: dto.url ?? '',
      fileUrl: dto.file?.cdnUrl ?? '',
      orderNumber: dto.resourceOrdinal,
    }));

    service = new AdditionalResourceService({
      graphqlService: mockGraphqlService,
      fileStorage: mockFileStorage,
      mapper: mockMapper,
    });
  });

  describe('createAdditionalResource', () => {
    it('should call mutation with PLAIN_TEXT markupFormat for plain text', async () => {
      const entity = createEntity();
      const workId = faker.string.uuid();
      const createdId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createAdditionalResource: {
          workResourceId: createdId,
          title: entity.title,
          resourceType: entity.resourceType,
          resourceOrdinal: entity.orderNumber,
        },
      });

      const result = await service.createAdditionalResource(entity, workId);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          markupFormat: MarkdownFormats.enum.PLAIN_TEXT,
          data: expect.objectContaining({ workId, resourceOrdinal: entity.orderNumber }),
        }),
      );
      expect(result.id).toBe(createdId);
    });

    it('should call mutation with JATS_XML markupFormat when content has markdown tags', async () => {
      const entity = createEntity({ description: '<p>HTML description</p>' });
      const workId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createAdditionalResource: { workResourceId: faker.string.uuid() },
      });

      await service.createAdditionalResource(entity, workId);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          markupFormat: MarkdownFormats.enum.JATS_XML,
        }),
      );
    });

    it('should default resourceOrdinal to 1 when orderNumber is undefined', async () => {
      const entity = createEntity({ orderNumber: undefined as unknown as number });
      const workId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createAdditionalResource: { workResourceId: faker.string.uuid() },
      });

      await service.createAdditionalResource(entity, workId);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({ resourceOrdinal: 1 }),
        }),
      );
    });

    it('should upload file when provided and set fileUrl', async () => {
      const entity = createEntity();
      const workId = faker.string.uuid();
      const createdId = faker.string.uuid();
      const file = new File(['test'], 'test.png', { type: 'image/png' });
      const fileUrl = 'https://cdn.example.com/file.png';

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createAdditionalResource: {
          workResourceId: createdId,
          title: entity.title,
          resourceType: entity.resourceType,
          resourceOrdinal: entity.orderNumber,
        },
      });

      (mockFileStorage.uploadAdditionalResourceFile as ReturnType<typeof vi.fn>).mockResolvedValue(fileUrl);

      const result = await service.createAdditionalResource(entity, workId, file);

      expect(mockFileStorage.uploadAdditionalResourceFile).toHaveBeenCalledWith(createdId, file, undefined);
      expect(result.fileUrl).toBe(fileUrl);
    });

    it('should rollback (delete resource) when file upload fails', async () => {
      const entity = createEntity();
      const workId = faker.string.uuid();
      const createdId = faker.string.uuid();
      const file = new File(['test'], 'test.png', { type: 'image/png' });

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createAdditionalResource: {
          workResourceId: createdId,
          title: entity.title,
          resourceType: entity.resourceType,
          resourceOrdinal: entity.orderNumber,
        },
      });

      (mockFileStorage.uploadAdditionalResourceFile as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Upload failed'),
      );

      const promise = service.createAdditionalResource(entity, workId, file);

      await expect(promise).rejects.toThrow('Upload failed');
      expect(mockGraphqlService.mutation).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.objectContaining({ additionalResourceId: createdId }),
      );
    });
  });

  describe('updateAdditionalResource', () => {
    it('should include workResourceId in mutation data', async () => {
      const entity = createEntity();
      const workId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        updateAdditionalResource: { workResourceId: entity.id },
      });

      const result = await service.updateAdditionalResource(entity, workId);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({
            additionalResourceId: entity.id,
            workId,
            resourceOrdinal: entity.orderNumber,
          }),
        }),
      );
      expect(result.id).toBe(entity.id);
    });
  });

  describe('deleteAdditionalResource', () => {
    it('should call mutation with additionalResourceId', async () => {
      const id = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        deleteAdditionalResource: { workResourceId: id },
      });

      await service.deleteAdditionalResource(id);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ additionalResourceId: id }),
      );
    });
  });

  describe('uploadFile', () => {
    it('should delegate to fileStorage.uploadAdditionalResourceFile', async () => {
      const resourceId = faker.string.uuid();
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const url = 'https://cdn.example.com/file.pdf';

      (mockFileStorage.uploadAdditionalResourceFile as ReturnType<typeof vi.fn>).mockResolvedValue(url);

      const result = await service.uploadFile(resourceId, file);

      expect(mockFileStorage.uploadAdditionalResourceFile).toHaveBeenCalledWith(resourceId, file, undefined);
      expect(result).toBe(url);
    });
  });

  describe('moveAdditionalResource', () => {
    it('should call mutation and return mapped entity', async () => {
      const resourceId = faker.string.uuid();
      const newOrdinal = 3;

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        moveAdditionalResource: { workResourceId: resourceId, resourceOrdinal: newOrdinal },
      });

      const result = await service.moveAdditionalResource(resourceId, newOrdinal);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ additionalResourceId: resourceId, newOrdinal }),
      );
      expect(result.id).toBe(resourceId);
    });
  });
});
