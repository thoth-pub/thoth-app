import type { BaseMapper } from '@/src/shared/interfaces';

import { ReferenceDto, ReferenceEntity } from './reference.types';

export class ReferenceDtoMapper implements BaseMapper<ReferenceEntity, ReferenceDto> {
  toEntity(dto: ReferenceDto): ReferenceEntity {
    const {
      referenceId,
      doi,
      journalTitle,
      articleTitle,
      seriesTitle,
      volumeTitle,
      url,
      referenceOrdinal,
      unstructuredCitation,
    } = dto;

    return {
      id: referenceId,
      doi,
      journalTitle: journalTitle ?? '',
      articleTitle: articleTitle ?? '',
      seriesTitle: seriesTitle ?? '',
      volumeTitle: volumeTitle ?? '',
      url: url ?? '',
      orderNumber: referenceOrdinal,
      unstructuredCitation: unstructuredCitation ?? '',
    };
  }

  toDto(entity: ReferenceEntity): ReferenceDto {
    const { id, doi, journalTitle, articleTitle, seriesTitle, volumeTitle, url, orderNumber, unstructuredCitation } =
      entity;

    return {
      referenceId: id,
      doi: doi && doi.length > 0 ? doi : null,
      journalTitle: journalTitle && journalTitle.length > 0 ? journalTitle : null,
      articleTitle: articleTitle && articleTitle.length > 0 ? articleTitle : null,
      seriesTitle: seriesTitle && seriesTitle.length > 0 ? seriesTitle : null,
      volumeTitle: volumeTitle && volumeTitle.length > 0 ? volumeTitle : null,
      url: url && url.length > 0 ? url : null,
      unstructuredCitation: unstructuredCitation && unstructuredCitation.length > 0 ? unstructuredCitation : null,
      referenceOrdinal: orderNumber,
    };
  }
}
