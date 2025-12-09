import type { BaseMapper } from '@/src/shared/interfaces';

import type { ImprintDto, ImprintEntity } from '../model/imprint.types';

export class ImprintDtoMapper implements BaseMapper<ImprintEntity, ImprintDto> {
  toEntity(dto: ImprintDto): ImprintEntity {
    const {
      imprintId,
      imprintName,
      imprintUrl,
      updatedAt,
      publisher: { publisherName },
    } = dto;

    return {
      id: imprintId,
      name: imprintName,
      url: imprintUrl ?? '',
      updatedAt,
      publisherName,
    };
  }

  toDto(entity: ImprintEntity): ImprintDto {
    const { id, name, url, updatedAt, publisherName } = entity;

    return {
      imprintId: id,
      imprintName: name,
      imprintUrl: url,
      updatedAt,
      publisher: {
        publisherName,
      },
    };
  }
}
