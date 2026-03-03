import { appConfig } from '@/src/shared/config';
import type { BaseMapper } from '@/src/shared/interfaces';
import { TitleDto, TitleEntity } from '@/src/shared/types';
import { convertOrchidIdToText, convertRomanToArabic } from '@/src/shared/utils';

import type { BookDto, BookEntity } from './book.types';

const { pageBreakdownSeparator } = appConfig.dataApi;

export class BookDtoMapper implements BaseMapper<BookEntity, BookDto> {
  toEntity(dto: BookDto): BookEntity {
    const {
      workId,
      titles,
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
      reference,
      contributions = [],
      languages = [],
      publications = [],
      issues = [],
    } = dto;

    const frontmatterCount = pageBreakdown?.split(pageBreakdownSeparator)[0] ?? '';
    const backmatterCount = pageBreakdown?.split(pageBreakdownSeparator)[2] ?? '';
    const frontmatterValue = convertRomanToArabic(frontmatterCount);
    const backmatterValue = convertRomanToArabic(backmatterCount);

    return {
      id: workId,
      titles: titles.map(this.toEntityTitle),
      type: workType,
      updatedAt,
      doi,
      publisherName,
      imprintId,
      status: workStatus,
      edition,
      license: license ?? null,
      reference: reference ?? null,
      copyrightHolder,
      landingPage,
      coverUrl,
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
            biographies,
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
            biographies: biographies.map((bio) => ({
              id: bio.biographyId,
              canonical: bio.canonical,
              content: bio.content,
              localeCode: bio.localeCode,
              contributionId: bio.contributionId,
            })),
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
          accessibilityAdditionalStandard,
          accessibilityException,
          accessibilityReportUrl,
          accessibilityStandard,
          file,
        }) => ({
          id: publicationId,
          isbn: isbn ?? '',
          type: publicationType,
          updatedAt,
          doi: doi,
          publisherName: publisherName,
          titles: titles.map(this.toEntityTitle),
          width: widthMm ?? 0,
          widthIn: widthIn ?? 0,
          height: heightMm ?? 0,
          heightIn: heightIn ?? 0,
          depth: depthMm ?? 0,
          depthIn: depthIn ?? 0,
          weight: weightG ?? 0,
          weightOz: weightOz ?? 0,
          accessibilityReportUrl: accessibilityReportUrl ?? '',
          accessibilityAdditionalStandard: accessibilityAdditionalStandard ?? null,
          accessibilityException: accessibilityException ?? null,
          accessibilityStandard: accessibilityStandard ?? null,
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
          fileUrl: file?.cdnUrl ?? null,
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

  toDto(entity: BookEntity): Partial<BookDto> {
    const {
      id,
      titles,
      type,
      imprintId,
      status,
      doi,
      license,
      copyrightHolder,
      landingPage,
      coverUrl,
      imageCount,
      tableCount,
      audioCount,
      videoCount,
      pageCount,
    } = entity;

    return {
      workId: id,
      workStatus: status,
      titles: titles.map(this.toDtoTitle),
      imprintId,
      workType: type,
      license: license && license.length > 0 ? license : null,
      copyrightHolder: copyrightHolder && copyrightHolder.length > 0 ? copyrightHolder : null,
      doi: doi && doi.length > 0 ? doi : null,
      landingPage: landingPage && landingPage.length > 0 ? landingPage : null,
      coverUrl: coverUrl && coverUrl.length > 0 ? coverUrl : null,
      imageCount: +imageCount > 0 ? +imageCount : null,
      tableCount: +tableCount > 0 ? +tableCount : null,
      audioCount: +audioCount > 0 ? +audioCount : null,
      videoCount: +videoCount > 0 ? +videoCount : null,
      pageCount: +pageCount > 0 ? +pageCount : null,
    };
  }

  toEntityTitle(dto: TitleDto): TitleEntity {
    const { titleId, canonical, fullTitle, localeCode, subtitle, title } = dto;

    return {
      id: titleId,
      canonical,
      fullTitle,
      localeCode,
      subtitle: subtitle ?? '',
      title,
    };
  }

  toDtoTitle(entity: TitleEntity): TitleDto {
    const { id, canonical, fullTitle, localeCode, subtitle, title } = entity;

    return {
      titleId: id,
      canonical,
      fullTitle,
      localeCode,
      subtitle,
      title,
    };
  }
}
