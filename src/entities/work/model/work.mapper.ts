import {
  convertDateToFormattedDate,
  convertOrchidIdToText,
  isBookChapter,
  isPublicationDateAvailable,
} from '@/src/shared';
import type { BaseMapper } from '@/src/shared/interfaces';

import type { WorkContribution, WorkContributionDto, WorkDto, WorkEntity } from './work.types';

export class WorkDtoMapper implements BaseMapper<WorkEntity, WorkDto> {
  toEntity(dto: WorkDto): WorkEntity {
    const {
      workId,
      title,
      fullTitle,
      workType,
      updatedAt,
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
      contributions = [],
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
      contributions: contributions
        .map(
          ({
            fullName,
            lastName,
            firstName,
            contributionId,
            contributorId,
            contributionType,
            mainContribution,
            contributionOrdinal,
            biography,
            contributor: { orcid, website = '' },
            affiliations = [],
          }) => ({
            fullName,
            lastName,
            firstName: firstName ?? '',
            id: contributionId,
            contributionId,
            contributorId,
            type: contributionType,
            isMain: mainContribution,
            orderNumber: contributionOrdinal,
            biography: biography ?? '',
            orcidId: orcid ? convertOrchidIdToText(orcid) : '',
            website: website ?? '',
            affiliations: affiliations.map(
              ({
                institution: { institutionName, institutionId, ror = '' },
                position = '',
                affiliationId,
                affiliationOrdinal,
              }) => ({
                contributionId,
                id: affiliationId,
                institutionName: institutionName,
                institutionId: institutionId,
                rorId: ror,
                position: position ?? '',
                orderNumber: affiliationOrdinal,
              }),
            ),
          }),
        )
        .sort((a, b) => a.orderNumber - b.orderNumber),
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

  toDtoContribution(entity: WorkContribution): WorkContributionDto {
    const { fullName, lastName, id, contributorId, type, isMain, orderNumber, firstName, biography } = entity;

    return {
      fullName,
      lastName,
      firstName: firstName && firstName.length > 0 ? firstName : null,
      contributionId: id,
      contributorId,
      contributionType: type,
      mainContribution: isMain,
      contributionOrdinal: orderNumber,
      biography: biography && biography.length > 0 ? biography : null,
    };
  }
}
