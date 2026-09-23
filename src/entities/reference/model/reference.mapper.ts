import type { BaseMapper } from '@/src/shared/interfaces';
import { emptyToNull } from '@/src/shared/utils/strings';

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
      isbn,
      issn,
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
      isbn: isbn ?? '',
      issn: issn ?? '',
    };
  }

  toDto(entity: ReferenceEntity): ReferenceDto {
    const {
      id,
      doi,
      journalTitle,
      articleTitle,
      seriesTitle,
      volumeTitle,
      url,
      orderNumber,
      unstructuredCitation,
      isbn,
      issn,
    } = entity;

    return {
      referenceId: id,
      doi: emptyToNull(doi),
      journalTitle: emptyToNull(journalTitle),
      articleTitle: emptyToNull(articleTitle),
      seriesTitle: emptyToNull(seriesTitle),
      volumeTitle: emptyToNull(volumeTitle),
      url: emptyToNull(url),
      unstructuredCitation: emptyToNull(unstructuredCitation),
      referenceOrdinal: orderNumber,
      // Sent only where the entity holds them, so a Reference edited without them is written as it always was.
      ...(isbn === undefined ? {} : { isbn: emptyToNull(isbn) }),
      ...(issn === undefined ? {} : { issn: emptyToNull(issn) }),
    };
  }
}
