import type { ToEntity, WorkDto, WorkEntity } from '@/interfaces';

export class WorksDtoMapper implements ToEntity<WorkEntity, WorkDto> {
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
