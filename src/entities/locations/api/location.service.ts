import type { QueryToken } from '@/src/shared';
import { BaseService } from '@/src/shared/interfaces/services';

import { PublicationId } from '../../publication/model/publication.types';
import { LocationDtoMapper } from '../model/location.mapper';
import { CREATE_LOCATION, DELETE_LOCATION, UPDATE_LOCATION } from '../model/location.schema';
import type { LocationEntity, LocationPlatform } from '../model/location.types';
import type { LocationDto } from '../model/location.types';

export class LocationService extends BaseService<LocationEntity, LocationDto> {
  constructor(mapper = new LocationDtoMapper()) {
    super(mapper);
  }

  async createLocation(token: QueryToken, data: LocationEntity, publicationId: PublicationId): Promise<LocationEntity> {
    const { locationId: _, ...dto } = this.dtoMapper.toDto(data);

    const response = await this.graphqlService.mutation(token, CREATE_LOCATION, {
      data: {
        ...dto,
        publicationId,
        canonical: dto.canonical as boolean,
        locationPlatform: dto.locationPlatform as LocationPlatform,
      },
    });

    const location = this.dtoMapper.toEntity(response.createLocation as LocationDto);

    return location;
  }

  async updateLocation(token: QueryToken, data: LocationEntity, publicationId: PublicationId): Promise<LocationEntity> {
    const dto = this.dtoMapper.toDto(data);

    const response = await this.graphqlService.mutation(token, UPDATE_LOCATION, {
      data: {
        locationId: dto.locationId ?? '',
        publicationId,
        canonical: dto.canonical as boolean,
        locationPlatform: dto.locationPlatform as LocationPlatform,
        fullTextUrl: dto.fullTextUrl ?? null,
        landingPage: dto.landingPage ?? null,
      },
    });

    const location = this.dtoMapper.toEntity(response.updateLocation as LocationDto);

    return location;
  }

  async deleteLocation(token: QueryToken, locationId: string) {
    await this.graphqlService.mutation(token, DELETE_LOCATION, {
      locationId,
    });
  }
}
