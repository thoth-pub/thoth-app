import { isBookChapter } from '@/src/shared';
import type { BaseMapper } from '@/src/shared/interfaces';

import type { WorkDto, WorkEntity } from './work.types';

export class WorkDtoMapper implements BaseMapper<WorkEntity, WorkDto> {
  toEntity(dto: WorkDto): WorkEntity {
    const {
      workId,
      title,
      fullTitle,
      workType,
      updatedAt,
      contributions = [],
      doi,
      imprint: {
        publisher: { publisherName = '' },
      },
      imprintId,
      workStatus,
      edition,
      license,
      copyrightHolder,
      landingPage,
      coverUrl,
    } = dto;

    return {
      id: workId,
      title,
      type: workType,
      updatedAt,
      contributorsNames: contributions.map((contribution) => contribution.fullName),
      doi,
      publisherName,
      imprintId,
      status: workStatus,
      edition,
      license: license ?? null,
      copyrightHolder,
      landingPage,
      coverUrl,
      fullTitle,
    };
  }

  toDto(entity: WorkEntity): Partial<WorkDto> {
    const { id, title, type, imprintId, status, edition, license, copyrightHolder, landingPage, coverUrl, fullTitle } =
      entity;
    const defaultEdition = edition ?? 1;

    return {
      workId: id,
      workStatus: status,
      title,
      fullTitle,
      imprintId,
      workType: type,
      edition: isBookChapter(type) ? null : defaultEdition,
      license: license ?? null,
      copyrightHolder: copyrightHolder ?? null,
      landingPage: landingPage ?? null,
      coverUrl: coverUrl ?? null,
    };
  }
}
