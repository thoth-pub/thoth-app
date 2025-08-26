import type { ToEntity } from '@/interfaces';
import type { WorkDto, WorkEntity } from '@/interfaces/works';

export class WorksDtoMapper implements ToEntity<WorkEntity, WorkDto> {
  toEntity(dto: WorkDto): WorkEntity {
    return {
      id: dto.workId,
      title: dto.title,
      type: dto.workType,
      updatedAt: dto.updatedAt,
      contributorsNames: dto?.contributions.map((contribution) => contribution.fullName) ?? [],
      doi: dto.doi,
      publisherName: dto?.imprint?.publisher?.publisherName,
    };
  }
}
