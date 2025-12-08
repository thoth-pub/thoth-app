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
      issues,
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
      issues: issues.map((issue) => ({
        id: issue.issueId,
        ordinal: issue.issueOrdinal,
        workId: issue.work.workId,
        title: issue.work.title,
        seriesId: seriesId,
      })),
    };
  }

  toDto(entity: SeriesEntity): Omit<SeriesDto, 'imprint' | 'issues'> {
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
