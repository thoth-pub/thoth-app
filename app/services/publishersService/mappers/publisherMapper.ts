import type { BaseMapper, PublisherDto, PublisherEntity } from '@/interfaces';

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
