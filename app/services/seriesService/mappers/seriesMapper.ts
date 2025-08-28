import type { BaseMapper, SeriesDto, SeriesEntity } from '@/interfaces';

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
