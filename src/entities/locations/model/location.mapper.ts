import { BaseMapper } from '@/src/shared/interfaces';

import type { LocationDto, LocationEntity } from './location.type';

export class LocationDtoMapper implements BaseMapper<LocationEntity, LocationDto> {
  toEntity(dto: LocationDto): LocationEntity {
    const { locationId, canonical, fullTextUrl, landingPage, locationPlatform } = dto;

    return {
      id: locationId,
      canonical,
      fullTextUrl: fullTextUrl ?? '',
      landingPage: landingPage ?? '',
      locationPlatform,
    };
  }

  toDto(entity: LocationEntity): LocationDto {
    const { id, canonical, fullTextUrl, landingPage, locationPlatform } = entity;

    return {
      locationId: id,
      canonical,
      fullTextUrl: fullTextUrl && fullTextUrl.length > 0 ? fullTextUrl : null,
      landingPage: landingPage && landingPage.length > 0 ? landingPage : null,
      locationPlatform,
    };
  }
}
