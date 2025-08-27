import type { ImprintDto, ImprintEntity, ToEntity } from '@/interfaces';

export class ImprintDtoMapper implements ToEntity<ImprintEntity, ImprintDto> {
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
}
