import type { BaseMapper } from '@/src/shared/interfaces';

import type { PublisherDto, PublisherEntity } from './publisher.types';

export class PublisherDtoMapper implements BaseMapper<PublisherEntity, PublisherDto> {
  toEntity(dto: PublisherDto): PublisherEntity {
    const { publisherId, publisherName, publisherShortname, publisherUrl, updatedAt } = dto;

    return {
      id: publisherId,
      name: publisherName,
      shortName: publisherShortname ?? '',
      url: publisherUrl ?? '',
      updatedAt,
    };
  }
}
