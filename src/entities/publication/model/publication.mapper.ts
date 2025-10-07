import { convertGToOz, convertMmToIn, isDimensionsAvailable } from '@/src/shared';
import type { BaseMapper } from '@/src/shared/interfaces';

import type { PublicationDto, PublicationEntity } from './publication.types';

export class PublicationDtoMapper implements BaseMapper<PublicationEntity, PublicationDto> {
  toEntity(dto: PublicationDto): PublicationEntity {
    const {
      publicationId,
      publicationType,
      updatedAt,
      isbn = '',
      width,
      height,
      depth,
      weight,
      work: {
        title = '',
        doi = '',
        imprint: {
          publisher: { publisherName },
        },
      },
      prices = [],
      locations = [],
    } = dto;

    return {
      id: publicationId,
      title,
      type: publicationType,
      updatedAt,
      isbn,
      doi,
      publisherName,
      width: width ?? 0,
      height: height ?? 0,
      depth: depth ?? 0,
      weight: weight ?? 0,
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
    };
  }

  toDto(entity: Pick<PublicationEntity, 'id' | 'type' | 'isbn' | 'width' | 'height' | 'depth' | 'weight'>): Omit<
    PublicationDto,
    'weight' | 'height' | 'width' | 'depth' | 'updatedAt' | 'work' | 'prices' | 'locations'
  > & {
    widthMm: number | null;
    widthIn: number | null;
    heightMm: number | null;
    heightIn: number | null;
    depthMm: number | null;
    depthIn: number | null;
    weightG: number | null;
    weightOz: number | null;
  } {
    const { id, type, isbn, width, height, depth, weight } = entity;

    const isPhysical = isDimensionsAvailable(type);

    return {
      publicationId: id,
      publicationType: type,
      isbn: isbn && isbn.length > 0 ? isbn : null,
      widthMm: width && width > 0 && isPhysical ? +width : null,
      widthIn: width && width > 0 && isPhysical ? convertMmToIn(width) : null,
      heightMm: height && height > 0 && isPhysical ? +height : null,
      heightIn: height && height > 0 && isPhysical ? convertMmToIn(height) : null,
      depthMm: depth && depth > 0 && isPhysical ? +depth : null,
      depthIn: depth && depth > 0 && isPhysical ? convertMmToIn(depth) : null,
      weightG: weight && weight > 0 && isPhysical ? +weight : null,
      weightOz: weight && weight > 0 && isPhysical ? convertGToOz(weight) : null,
    };
  }
}
