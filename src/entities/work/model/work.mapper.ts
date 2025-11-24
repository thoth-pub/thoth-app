import {
  appConfig,
  convertArabicToRoman,
  convertDateToFormattedDate,
  convertOrchidIdToText,
  convertRomanToArabic,
  isBookChapter,
  isDefaultId,
} from '@/src/shared';
import type { BaseMapper } from '@/src/shared/interfaces';

import { FundingDtoMapper } from '../../funding/model/funding.mapper';
import { ReferenceDtoMapper } from '../../reference/model/reference.mapper';
import { SubjectDtoMapper } from '../../subject/model/subject.mapper';
import type { WorkContribution, WorkContributionDto, WorkDto, WorkEntity } from './work.types';

const { pageBreakdownSeparator } = appConfig.dataApi;

const fundingMapper = new FundingDtoMapper();
const referenceMapper = new ReferenceDtoMapper();
const subjectMapper = new SubjectDtoMapper();

export class WorkDtoMapper implements BaseMapper<WorkEntity, WorkDto> {
  toEntity(dto: WorkDto): WorkEntity {
    const {
      workId,
      title,
      fullTitle,
      subtitle,
      workType,
      updatedAt,
      doi,
      lccn,
      oclc,
      bibliographyNote,
      generalNote,
      imprint,
      imprintId,
      workStatus,
      edition,
      license,
      copyrightHolder,
      landingPage,
      coverUrl,
      publicationDate,
      withdrawnDate,
      imageCount,
      tableCount,
      audioCount,
      videoCount,
      pageCount,
      pageBreakdown,
      reference,
      lastPage,
      firstPage,
      contributions = [],
      languages = [],
      fundings = [],
      publications = [],
      references = [],
      subjects = [],
      issues = [],
    } = dto;

    const frontmatterCount = pageBreakdown?.split(pageBreakdownSeparator)[0] ?? '';
    const backmatterCount = pageBreakdown?.split(pageBreakdownSeparator)[2] ?? '';
    const frontmatterValue = convertRomanToArabic(frontmatterCount);
    const backmatterValue = convertRomanToArabic(backmatterCount);

    return {
      id: workId,
      title,
      subtitle: subtitle ?? '',
      type: workType,
      updatedAt,
      contributorsNames: contributions.map((contribution) => contribution.fullName),
      doi,
      lccn: lccn ?? '',
      oclc: oclc ?? '',
      bibliographyNote: bibliographyNote ?? '',
      generalNote: generalNote ?? '',
      publisherName: imprint?.publisher?.publisherName ?? '',
      imprintId,
      status: workStatus,
      edition,
      license: license ?? null,
      reference: reference ?? null,
      copyrightHolder,
      landingPage,
      coverUrl,
      fullTitle,
      publicationDate: publicationDate ?? null,
      withdrawnDate: withdrawnDate ?? null,
      imageCount: imageCount ?? 0,
      tableCount: tableCount ?? 0,
      audioCount: audioCount ?? 0,
      videoCount: videoCount ?? 0,
      pageCount: pageCount ?? 0,
      frontmatterCount: frontmatterValue,
      backmatterCount: backmatterValue,
      firstPage: firstPage ?? '',
      lastPage: lastPage ?? '',
      fundings: fundings.map(fundingMapper.toEntity),
      references: references.map(referenceMapper.toEntity),
      subjects: subjects.map(subjectMapper.toEntity),
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
      publications: publications.map(
        ({
          publicationId,
          isbn,
          publicationType,
          updatedAt,
          widthMm,
          widthIn,
          heightMm,
          heightIn,
          depthMm,
          depthIn,
          weightG,
          weightOz,
          prices = [],
          locations = [],
        }) => ({
          id: publicationId,
          isbn: isbn ?? '',
          type: publicationType,
          updatedAt,
          doi: doi,
          publisherName: imprint?.publisher?.publisherName ?? '',
          title,
          width: widthMm ?? 0,
          widthIn: widthIn ?? 0,
          height: heightMm ?? 0,
          heightIn: heightIn ?? 0,
          depth: depthMm ?? 0,
          depthIn: depthIn ?? 0,
          weight: weightG ?? 0,
          weightOz: weightOz ?? 0,
          prices: prices.map(({ unitPrice, priceId, currencyCode }) => ({
            id: priceId,
            currencyCode,
            unitPrice,
          })),
          locations: locations.map(({ locationId, canonical, fullTextUrl, landingPage, locationPlatform }) => ({
            id: locationId,
            canonical,
            fullTextUrl: fullTextUrl ?? '',
            landingPage: landingPage ?? '',
            locationPlatform,
          })),
        }),
      ),
      issues: issues.map(({ issueId, issueOrdinal, series }) => ({
        id: issueId,
        ordinal: issueOrdinal,
        seriesId: series.seriesId,
        seriesName: series.seriesName,
      })),
    };
  }
  // TODO add utilities for conversions
  toDto(entity: WorkEntity): Partial<WorkDto> {
    const {
      id,
      title,
      subtitle,
      type,
      imprintId,
      status,
      doi,
      lccn,
      oclc,
      bibliographyNote,
      generalNote,
      edition,
      license,
      copyrightHolder,
      landingPage,
      coverUrl,
      fullTitle,
      publicationDate,
      withdrawnDate,
      imageCount,
      tableCount,
      audioCount,
      videoCount,
      pageCount,
      frontmatterCount,
      backmatterCount,
      firstPage,
      lastPage,
    } = entity;
    const defaultEdition = edition ?? 1;

    const appliedPublicationDate = publicationDate ? convertDateToFormattedDate(publicationDate) : null;
    const appliedWithdrawnDate = withdrawnDate ? convertDateToFormattedDate(withdrawnDate) : null;

    const frontmatterValue = convertArabicToRoman(frontmatterCount);
    const backmatterValue = convertArabicToRoman(backmatterCount);

    const pageBreakdownValue = `${frontmatterValue}${pageBreakdownSeparator}${pageCount}${backmatterValue && backmatterValue.length > 0 ? pageBreakdownSeparator + backmatterValue : ''}`;

    return {
      workId: id,
      workStatus: status,
      title,
      subtitle: subtitle && subtitle.length > 0 ? subtitle : null,
      fullTitle,
      imprintId,
      workType: type,
      edition: isBookChapter(type) ? null : defaultEdition,
      license: license && license.length > 0 ? license : null,
      copyrightHolder: copyrightHolder && copyrightHolder.length > 0 ? copyrightHolder : null,
      doi: doi && doi.length > 0 ? doi : null,
      lccn: lccn && lccn.length > 0 ? lccn : null,
      oclc: oclc && oclc.length > 0 ? oclc : null,
      bibliographyNote: bibliographyNote && bibliographyNote.length > 0 ? bibliographyNote : null,
      generalNote: generalNote && generalNote.length > 0 ? generalNote : null,
      landingPage: landingPage && landingPage.length > 0 ? landingPage : null,
      coverUrl: coverUrl && coverUrl.length > 0 ? coverUrl : null,
      publicationDate: appliedPublicationDate,
      withdrawnDate: appliedWithdrawnDate,
      imageCount: +imageCount > 0 ? +imageCount : null,
      tableCount: +tableCount > 0 ? +tableCount : null,
      audioCount: +audioCount > 0 ? +audioCount : null,
      videoCount: +videoCount > 0 ? +videoCount : null,
      pageCount: +pageCount > 0 ? +pageCount : null,
      firstPage: firstPage && firstPage.length > 0 ? firstPage : null,
      lastPage: lastPage && lastPage.length > 0 ? lastPage : null,
      pageBreakdown: pageBreakdownValue.length > 0 ? pageBreakdownValue : null,
    };
  }

  toDtoContribution(entity: WorkContribution): Omit<WorkContributionDto, 'workId'> {
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
