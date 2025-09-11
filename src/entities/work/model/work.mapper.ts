import { convertDateToFormattedDate, isBookChapter, isPublicationDateAvailable } from '@/src/shared';
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
      publicationDate,
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
      publicationDate: publicationDate ?? null,
    };
  }
  // TODO add logic for publication date for Active, Superseded, Withdrawn statuses
  toDto(entity: WorkEntity): Partial<WorkDto> {
    const {
      id,
      title,
      type,
      imprintId,
      status,
      edition,
      license,
      copyrightHolder,
      landingPage,
      coverUrl,
      fullTitle,
      publicationDate,
    } = entity;
    const defaultEdition = edition ?? 1;

    const appliedPublicationDate =
      isPublicationDateAvailable(status) && publicationDate ? convertDateToFormattedDate(publicationDate) : null;

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
      publicationDate: appliedPublicationDate,
    };
  }
}
