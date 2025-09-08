import type { BaseMapper } from '@/src/shared/interfaces';

import type { SeriesDto, SeriesEntity } from './series.types';

export class SeriesDtoMapper implements BaseMapper<SeriesEntity, SeriesDto> {
  toEntity(dto: SeriesDto): SeriesEntity {
    const { seriesId, seriesName, seriesType, issnPrint, issnDigital, updatedAt } = dto;

    return {
      id: seriesId,
      name: seriesName,
      type: seriesType,
      issnPrint: issnPrint ?? '',
      issnDigital: issnDigital ?? '',
      updatedAt,
    };
  }
}
