import type { NewWorkFeaturedVideo, PatchWorkFeaturedVideo } from '@/gql/graphql';
import { GraphqlService } from '@/src/shared/api/graphqlService';
import { BaseService } from '@/src/shared/interfaces/services';
import type { FileStorage } from '@/src/shared/services';
import { TransactionContext } from '@/src/shared/services/TransactionsContext/TransactionsContext';

import type { WorkId } from '../../work/model/work.types';
import { FeaturedVideoDtoMapper } from '../model/featured-video.mapper';
import {
  CREATE_FEATURED_VIDEO,
  DELETE_FEATURED_VIDEO,
  UPDATE_FEATURED_VIDEO,
} from '../model/featured-video.schema';
import type { FeaturedVideoDto, FeaturedVideoEntity, FeaturedVideoId } from '../model/featured-video.types';

type FeaturedVideoServiceDependencies = {
  graphqlService: GraphqlService;
  fileStorage: FileStorage;
  mapper?: FeaturedVideoDtoMapper;
};

export class FeaturedVideoService extends BaseService<FeaturedVideoEntity, FeaturedVideoDto> {
  private readonly fileStorage: FileStorage;

  constructor({ graphqlService, fileStorage, mapper = new FeaturedVideoDtoMapper() }: FeaturedVideoServiceDependencies) {
    super(graphqlService, mapper);
    this.fileStorage = fileStorage;
  }

  async createFeaturedVideo(data: FeaturedVideoEntity, relatedWorkId: WorkId, file: File): Promise<FeaturedVideoEntity> {
    const { workFeaturedVideoId: _, workId: __, ...dto } = this.dtoMapper.toDto(data);

    const response = await this.graphqlService.mutation(CREATE_FEATURED_VIDEO, {
      data: { ...dto, workId: relatedWorkId } as NewWorkFeaturedVideo,
    });

    const featuredVideo = this.dtoMapper.toEntity(response.createWorkFeaturedVideo as FeaturedVideoDto);

    const transactions = new TransactionContext();
    transactions.onRollback(() => this.deleteFeaturedVideo(featuredVideo.id));

    try {
      const fileUrl = await this.uploadFile(featuredVideo.id, file);
      featuredVideo.fileUrl = fileUrl;
    } catch (error) {
      await transactions.rollback();
      throw error;
    }

    return featuredVideo;
  }

  async updateFeaturedVideo(data: FeaturedVideoEntity, relatedWorkId: WorkId): Promise<FeaturedVideoEntity> {
    const { workId: _, ...dto } = this.dtoMapper.toDto(data);

    const response = await this.graphqlService.mutation(UPDATE_FEATURED_VIDEO, {
      data: { ...dto, workId: relatedWorkId } as PatchWorkFeaturedVideo,
    });

    return this.dtoMapper.toEntity(response.updateWorkFeaturedVideo as FeaturedVideoDto);
  }

  async deleteFeaturedVideo(featuredVideoId: FeaturedVideoId) {
    await this.graphqlService.mutation(DELETE_FEATURED_VIDEO, {
      workFeaturedVideoId: featuredVideoId,
    });
  }

  async uploadFile(featuredVideoId: FeaturedVideoId, file: File): Promise<string> {
    const url = await this.fileStorage.uploadFeaturedVideoFile(featuredVideoId, file);

    return url;
  }
}
