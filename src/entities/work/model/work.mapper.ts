import type { BaseMapper } from '@/src/shared/interfaces';

import type { WorkDto, WorkEntity } from './work.types';

export class WorkDtoMapper implements BaseMapper<WorkEntity, WorkDto> {
  toEntity(dto: WorkDto): WorkEntity {
    const {
      workId,
      title,
      workType,
      updatedAt,
      contributions = [],
      doi,
      imprint: {
        publisher: { publisherName = '' },
      },
    } = dto;

    return {
      id: workId,
      title,
      type: workType,
      updatedAt,
      contributorsNames: contributions.map((contribution) => contribution.fullName),
      doi,
      publisherName,
    };
  }
}
