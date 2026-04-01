import type { BaseMapper } from '@/src/shared/interfaces';
import { emptyToNull } from '@/src/shared/utils/strings';

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
        coverUrl: issue.work.coverUrl ?? '',
      })),
    };
  }

  toDto(entity: SeriesEntity): Omit<SeriesDto, 'imprint' | 'issues'> {
    const { id, name, type, issnPrint, issnDigital, updatedAt, imprintId, url, description } = entity;

    return {
      seriesId: id,
      seriesName: name,
      seriesType: type,
      issnPrint: emptyToNull(issnPrint),
      issnDigital: emptyToNull(issnDigital),
      updatedAt,
      imprintId,
      seriesUrl: emptyToNull(url),
      seriesDescription: emptyToNull(description),
    };
  }
}
