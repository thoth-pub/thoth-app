import type { BaseMapper } from '@/src/shared/interfaces';

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
      authorName: authorName && authorName.length > 0 ? authorName : null,
      authorRole: authorRole && authorRole.length > 0 ? authorRole : null,
      authorInstitutionId: authorInstitutionId && authorInstitutionId.length > 0 ? authorInstitutionId : null,
      url: url && url.length > 0 ? url : null,
      text: text && text.length > 0 ? text : null,
      endorsementOrdinal: orderNumber,
    };
  }
}
