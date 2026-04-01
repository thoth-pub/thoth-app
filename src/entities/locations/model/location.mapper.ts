import { BaseMapper } from '@/src/shared/interfaces';
import { emptyToNull } from '@/src/shared/utils/strings';

import type { LocationDto, LocationEntity } from './location.types';

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
      fullTextUrl: emptyToNull(fullTextUrl),
      landingPage: emptyToNull(landingPage),
      locationPlatform,
    };
  }
}
