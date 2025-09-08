import type { BaseMapper } from '@/src/shared/interfaces';

import type { PublicationDto, PublicationEntity } from './publication.types';

export class PublicationDtoMapper implements BaseMapper<PublicationEntity, PublicationDto> {
  toEntity(dto: PublicationDto): PublicationEntity {
    const {
      publicationId,
      publicationType,
      updatedAt,
      isbn = '',
      work: {
        title,
        doi,
        imprint: {
          publisher: { publisherName },
        },
      },
    } = dto;

    return {
      id: publicationId,
      title,
      type: publicationType,
      updatedAt,
      isbn,
      doi,
      publisherName,
    };
  }
}
