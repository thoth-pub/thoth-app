import type { PublisherDto, PublisherEntity, ToEntity } from '@/interfaces';

export class PublisherDtoMapper implements ToEntity<PublisherEntity, PublisherDto> {
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
