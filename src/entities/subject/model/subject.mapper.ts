import type { BaseMapper } from '@/src/shared/interfaces';

import { SubjectDto, SubjectEntity } from './subject.types';

export class SubjectDtoMapper implements BaseMapper<SubjectEntity, SubjectDto> {
  toEntity(dto: SubjectDto): SubjectEntity {
    const { subjectId, subjectCode, subjectType, subjectOrdinal } = dto;

    return {
      id: subjectId,
      code: subjectCode,
      type: subjectType,
      ordinal: subjectOrdinal,
    };
  }

  toDto(entity: SubjectEntity): SubjectDto {
    const { id, code, type, ordinal } = entity;

    return {
      subjectId: id,
      subjectCode: code,
      subjectType: type,
      subjectOrdinal: ordinal,
    };
  }
}
