import type { BaseMapper } from '@/src/shared/interfaces';
import { isDimensionsAvailable } from '@/src/shared/utils';
import { emptyToNull } from '@/src/shared/utils/strings';

import { TitleDtoMapper } from '../../title/model/title.mapper';
import type { PublicationDto, PublicationEntity } from './publication.types';

const titleMapper = new TitleDtoMapper();

export class PublicationDtoMapper implements BaseMapper<PublicationEntity, PublicationDto> {
  toEntity(dto: PublicationDto): PublicationEntity {
    const {
      publicationId,
      publicationType,
      updatedAt,
      isbn = '',
      widthMm,
      widthIn,
      heightMm,
      heightIn,
      depthMm,
      depthIn,
      weightG,
      weightOz,
      work: {
        titles,
        doi = '',
        imprint: {
          publisher: { publisherName },
        },
      },
      prices = [],
      locations = [],
      accessibilityReportUrl,
      accessibilityAdditionalStandard,
      accessibilityException,
      accessibilityStandard,
      file,
    } = dto;

    return {
      id: publicationId,
      titles: titles.map(titleMapper.toEntity),
      type: publicationType,
      updatedAt,
      isbn,
      doi,
      publisherName,
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
    };
  }

  toDto(
    entity: Pick<
      PublicationEntity,
      | 'id'
      | 'type'
      | 'isbn'
      | 'width'
      | 'height'
      | 'depth'
      | 'weight'
      | 'widthIn'
      | 'heightIn'
      | 'depthIn'
      | 'weightOz'
      | 'accessibilityReportUrl'
      | 'accessibilityAdditionalStandard'
      | 'accessibilityException'
      | 'accessibilityStandard'
    >,
  ): Omit<PublicationDto, 'widthMm' | 'widthIn' | 'heightMm' | 'heightIn' | 'depthMm' | 'depthIn' | 'weightG' | 'weightOz' | 'updatedAt' | 'work' | 'prices' | 'locations'> & {
    widthMm: number | null;
    widthIn: number | null;
    heightMm: number | null;
    heightIn: number | null;
    depthMm: number | null;
    depthIn: number | null;
    weightG: number | null;
    weightOz: number | null;
  } {
    const {
      id,
      type,
      isbn,
      width,
      height,
      depth,
      weight,
      widthIn,
      heightIn,
      depthIn,
      weightOz,
      accessibilityReportUrl,
      accessibilityAdditionalStandard,
      accessibilityException,
      accessibilityStandard,
    } = entity;

    const isPhysical = isDimensionsAvailable(type);

    return {
      publicationId: id,
      publicationType: type,
      isbn: emptyToNull(isbn),
      widthMm: width && width > 0 && isPhysical ? +width : null,
      widthIn: widthIn && widthIn > 0 && isPhysical ? widthIn : null,
      heightMm: height && height > 0 && isPhysical ? +height : null,
      heightIn: heightIn && heightIn > 0 && isPhysical ? heightIn : null,
      depthMm: depth && depth > 0 && isPhysical ? +depth : null,
      depthIn: depthIn && depthIn > 0 && isPhysical ? depthIn : null,
      weightG: weight && weight > 0 && isPhysical ? +weight : null,
      weightOz: weightOz && weightOz > 0 && isPhysical ? weightOz : null,
      accessibilityReportUrl: emptyToNull(accessibilityReportUrl),
      accessibilityAdditionalStandard: accessibilityAdditionalStandard ?? null,
      accessibilityException: accessibilityException ?? null,
      accessibilityStandard: accessibilityStandard ?? null,
    };
  }

}
