import type { BaseMapper } from '@/src/shared/interfaces';
import { emptyToNull } from '@/src/shared/utils/strings';

import { EndorsementDto, EndorsementEntity } from './endorsement.types';

export class EndorsementDtoMapper implements BaseMapper<EndorsementEntity, EndorsementDto> {
  toEntity(dto: EndorsementDto): EndorsementEntity {
    const { endorsementId, workId, authorName, authorRole, authorInstitutionId, authorInstitution, url, text, endorsementOrdinal } = dto;

    return {
      id: endorsementId,
      workId,
      authorName: authorName ?? '',
      authorRole: authorRole ?? '',
      authorInstitutionId: authorInstitutionId ?? '',
      authorInstitutionName: authorInstitution?.institutionName ?? '',
      authorInstitutionRor: authorInstitution?.ror ?? '',
      url: url ?? '',
      text: text ?? '',
      orderNumber: endorsementOrdinal,
    };
  }

  toDto(entity: EndorsementEntity): EndorsementDto {
    const { id, workId, authorName, authorRole, authorInstitutionId, url, text, orderNumber } = entity;

    return {
      endorsementId: id,
      workId,
      authorName: emptyToNull(authorName),
      authorRole: emptyToNull(authorRole),
      authorInstitutionId: emptyToNull(authorInstitutionId),
      url: emptyToNull(url),
      text: emptyToNull(text),
      endorsementOrdinal: orderNumber,
    };
  }
}
