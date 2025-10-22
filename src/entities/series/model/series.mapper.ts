import type { BaseMapper } from '@/src/shared/interfaces';

import type { SeriesDto, SeriesEntity } from './series.types';

export class SeriesDtoMapper implements BaseMapper<SeriesEntity, SeriesDto> {
  toEntity(dto: SeriesDto): SeriesEntity {
    const {
      seriesId,
      seriesName,
      seriesType,
      issnPrint,
      issnDigital,
      updatedAt,
      imprintId,
      imprint: { imprintName = '' },
      seriesUrl,
      seriesDescription,
    } = dto;

    return {
      id: seriesId,
      name: seriesName,
      type: seriesType,
      issnPrint: issnPrint ?? '',
      issnDigital: issnDigital ?? '',
      updatedAt,
      imprintId,
      imprintName,
      url: seriesUrl ?? '',
      description: seriesDescription ?? '',
    };
  }

  toDto(entity: SeriesEntity): Omit<SeriesDto, 'imprint'> {
    const { id, name, type, issnPrint, issnDigital, updatedAt, imprintId, url, description } = entity;

    return {
      seriesId: id,
      seriesName: name,
      seriesType: type,
      issnPrint: issnPrint && issnPrint.length > 0 ? issnPrint : null,
      issnDigital: issnDigital && issnDigital.length > 0 ? issnDigital : null,
      updatedAt,
      imprintId,
      seriesUrl: url && url.length > 0 ? url : null,
      seriesDescription: description && description.length > 0 ? description : null,
    };
  }
}
