import { faker } from '@faker-js/faker';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphqlService } from '@/src/shared/api/graphqlService';
import type { FileStorage } from '@/src/shared/services';

import { FeaturedVideoDtoMapper } from '../model/featured-video.mapper';
import type { FeaturedVideoDto, FeaturedVideoEntity } from '../model/featured-video.types';
import { FeaturedVideoService } from './featured-video.service';

describe('FeaturedVideoService', () => {
  let service: FeaturedVideoService;
  let mockGraphqlService: GraphqlService;
  let mockFileStorage: FileStorage;
  let mockMapper: FeaturedVideoDtoMapper;

  const createEntity = (overrides?: Partial<FeaturedVideoEntity>): FeaturedVideoEntity => ({
    id: faker.string.uuid(),
    workId: faker.string.uuid(),
    title: 'Featured Video',
    url: 'https://example.com/video',
    width: 1920,
    height: 1080,
    fileUrl: '',
    ...overrides,
  });

  beforeEach(() => {
    mockGraphqlService = {
      query: vi.fn(),
      mutation: vi.fn(),
    } as unknown as GraphqlService;

    mockFileStorage = {
      uploadFeaturedVideoFile: vi.fn(),
      uploadAdditionalResourceFile: vi.fn(),
    } as unknown as FileStorage;

    mockMapper = new FeaturedVideoDtoMapper();
    vi.spyOn(mockMapper, 'toDto').mockImplementation((entity: FeaturedVideoEntity) => ({
      workFeaturedVideoId: entity.id,
      workId: entity.workId,
      title: entity.title,
      url: entity.url,
      width: entity.width,
      height: entity.height,
    }));

    vi.spyOn(mockMapper, 'toEntity').mockImplementation((dto: FeaturedVideoDto) => ({
      id: dto.workFeaturedVideoId,
      workId: dto.workId,
      title: dto.title ?? '',
      url: dto.url ?? '',
      width: dto.width,
      height: dto.height,
      fileUrl: dto.file?.cdnUrl ?? '',
    }));

    service = new FeaturedVideoService({
      graphqlService: mockGraphqlService,
      fileStorage: mockFileStorage,
      mapper: mockMapper,
    });
  });

  describe('createFeaturedVideo', () => {
    it('should call mutation and upload file', async () => {
      const entity = createEntity();
      const workId = faker.string.uuid();
      const createdId = faker.string.uuid();
      const file = new File(['test'], 'video.mp4', { type: 'video/mp4' });
      const fileUrl = 'https://cdn.example.com/video.mp4';

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createWorkFeaturedVideo: {
          workFeaturedVideoId: createdId,
          title: entity.title,
          url: entity.url,
          width: entity.width,
          height: entity.height,
        },
      });

      (mockFileStorage.uploadFeaturedVideoFile as ReturnType<typeof vi.fn>).mockResolvedValue(fileUrl);

      const result = await service.createFeaturedVideo(entity, workId, file);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({ workId }),
        }),
      );
      expect(mockFileStorage.uploadFeaturedVideoFile).toHaveBeenCalledWith(createdId, file, undefined);
      expect(result.fileUrl).toBe(fileUrl);
    });

    it('should rollback (delete featured video) when file upload fails', async () => {
      const entity = createEntity();
      const workId = faker.string.uuid();
      const createdId = faker.string.uuid();
      const file = new File(['test'], 'video.mp4', { type: 'video/mp4' });

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createWorkFeaturedVideo: {
          workFeaturedVideoId: createdId,
          title: entity.title,
          url: entity.url,
          width: entity.width,
          height: entity.height,
        },
      });

      (mockFileStorage.uploadFeaturedVideoFile as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Upload failed'),
      );

      const promise = service.createFeaturedVideo(entity, workId, file);

      await expect(promise).rejects.toThrow('Upload failed');
      expect(mockGraphqlService.mutation).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.objectContaining({ workFeaturedVideoId: createdId }),
      );
    });
  });

  describe('updateFeaturedVideo', () => {
    it('should call mutation with workId and return mapped entity', async () => {
      const entity = createEntity();
      const workId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        updateWorkFeaturedVideo: {
          workFeaturedVideoId: entity.id,
          title: entity.title,
          url: entity.url,
          width: entity.width,
          height: entity.height,
        },
      });

      const result = await service.updateFeaturedVideo(entity, workId);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({
            workId,
            workFeaturedVideoId: entity.id,
          }),
        }),
      );
      expect(result.id).toBe(entity.id);
    });
  });

  describe('deleteFeaturedVideo', () => {
    it('should call mutation with workFeaturedVideoId', async () => {
      const id = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        deleteWorkFeaturedVideo: { workFeaturedVideoId: id },
      });

      await service.deleteFeaturedVideo(id);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ workFeaturedVideoId: id }),
      );
    });
  });

  describe('uploadFile', () => {
    it('should delegate to fileStorage.uploadFeaturedVideoFile', async () => {
      const videoId = faker.string.uuid();
      const file = new File(['test'], 'video.mp4', { type: 'video/mp4' });
      const url = 'https://cdn.example.com/video.mp4';

      (mockFileStorage.uploadFeaturedVideoFile as ReturnType<typeof vi.fn>).mockResolvedValue(url);

      const result = await service.uploadFile(videoId, file);

      expect(mockFileStorage.uploadFeaturedVideoFile).toHaveBeenCalledWith(videoId, file, undefined);
      expect(result).toBe(url);
    });
  });
});
