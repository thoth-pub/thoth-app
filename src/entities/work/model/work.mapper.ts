import {
  appConfig,
  convertArabicToRoman,
  convertDateToFormattedDate,
  convertOrchidIdToText,
  convertRomanToArabic,
  isBookChapter,
  isDefaultId,
  isPublicationDateAvailable,
} from '@/src/shared';
import type { BaseMapper } from '@/src/shared/interfaces';

import type { WorkContribution, WorkContributionDto, WorkDto, WorkEntity } from './work.types';

const { pageBreakdownSeparator } = appConfig.dataApi;

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
      imageCount,
      tableCount,
      audioCount,
      videoCount,
      pageCount,
      pageBreakdown,
      contributions = [],
      languages = [],
    } = dto;

    const frontmatterCount = pageBreakdown?.split(pageBreakdownSeparator)[0] ?? '';
    const backmatterCount = pageBreakdown?.split(pageBreakdownSeparator)[2] ?? '';
    const frontmatterValue = convertRomanToArabic(frontmatterCount);
    const backmatterValue = convertRomanToArabic(backmatterCount);

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
      imageCount: imageCount ?? 0,
      tableCount: tableCount ?? 0,
      audioCount: audioCount ?? 0,
      videoCount: videoCount ?? 0,
      pageCount: pageCount ?? 0,
      frontmatterCount: frontmatterValue,
      backmatterCount: backmatterValue,
      languages: languages.map(({ languageCode, languageRelation, mainLanguage, languageId }) => ({
        code: languageCode,
        relation: languageRelation,
        isMain: mainLanguage,
        id: languageId,
      })),
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
  // TODO add utilities for conversions
  toDto(entity: WorkEntity): Partial<WorkDto> {
    const {
      id,
      title,
      type,
      imprintId,
      status,
      doi,
      edition,
      license,
      copyrightHolder,
      landingPage,
      coverUrl,
      fullTitle,
      publicationDate,
      imageCount,
      tableCount,
      audioCount,
      videoCount,
      pageCount,
      frontmatterCount,
      backmatterCount,
    } = entity;
    const defaultEdition = edition ?? 1;

    const appliedPublicationDate =
      isPublicationDateAvailable(status) && publicationDate ? convertDateToFormattedDate(publicationDate) : null;

    const frontmatterValue = convertArabicToRoman(frontmatterCount);
    const backmatterValue = convertArabicToRoman(backmatterCount);

    const pageBreakdownValue = `${frontmatterValue}${pageBreakdownSeparator}${pageCount}${backmatterValue && backmatterValue.length > 0 ? pageBreakdownSeparator + backmatterValue : ''}`;

    return {
      workId: id,
      workStatus: status,
      title,
      fullTitle,
      imprintId,
      workType: type,
      edition: isBookChapter(type) ? null : defaultEdition,
      license: license ?? null,
      copyrightHolder: copyrightHolder && copyrightHolder.length > 0 ? copyrightHolder : null,
      doi: doi && doi.length > 0 ? doi : null,
      landingPage: landingPage && landingPage.length > 0 ? landingPage : null,
      coverUrl: coverUrl && coverUrl.length > 0 ? coverUrl : null,
      publicationDate: appliedPublicationDate,
      imageCount: +imageCount > 0 ? +imageCount : null,
      tableCount: +tableCount > 0 ? +tableCount : null,
      audioCount: +audioCount > 0 ? +audioCount : null,
      videoCount: +videoCount > 0 ? +videoCount : null,
      pageCount: +pageCount > 0 ? +pageCount : null,
      pageBreakdown: pageBreakdownValue.length > 0 ? pageBreakdownValue : null,
    };
  }

  toDtoContribution(entity: WorkContribution): WorkContributionDto {
    const { fullName, lastName, id, contributorId, type, isMain, orderNumber, firstName, biography } = entity;

    return {
      fullName,
      lastName,
      firstName: firstName && firstName.length > 0 ? firstName : null,
      contributionId: id && !isDefaultId(id) ? id : undefined,
      contributorId,
      contributionType: type,
      mainContribution: isMain,
      contributionOrdinal: orderNumber,
      biography: biography && biography.length > 0 ? biography : null,
    };
  }
}
