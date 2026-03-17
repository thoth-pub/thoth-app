import type { BaseMapper } from '@/src/shared/interfaces';

import { FeaturedVideoDto, FeaturedVideoEntity } from './featured-video.types';

export class FeaturedVideoDtoMapper implements BaseMapper<FeaturedVideoEntity, FeaturedVideoDto> {
  toEntity(dto: FeaturedVideoDto): FeaturedVideoEntity {
    const { workFeaturedVideoId, workId, title, url, width, height, file } = dto;

    return {
      id: workFeaturedVideoId,
      workId,
      title: title ?? '',
      url: url ?? '',
      width,
      height,
      fileUrl: file?.cdnUrl ?? '',
    };
  }

  toDto(entity: FeaturedVideoEntity): FeaturedVideoDto {
    const { id, workId, title, url, width, height } = entity;

    return {
      workFeaturedVideoId: id,
      workId,
      title: title && title.length > 0 ? title : null,
      url: url && url.length > 0 ? url : null,
      width,
      height,
    };
  }
}
