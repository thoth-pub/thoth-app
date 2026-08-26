import type { BaseMapper } from '@/src/shared/interfaces';
import { emptyToNull } from '@/src/shared/utils/strings';

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
      title: emptyToNull(title) ?? '',
      url: emptyToNull(url),
      width,
      height,
    };
  }
}
