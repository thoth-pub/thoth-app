import { GraphqlService } from '@/src/shared/api/graphqlService';
import { BaseService } from '@/src/shared/interfaces/services';

import { PublicationId } from '../../publication/model/publication.types';
import { LocationDtoMapper } from '../model/location.mapper';
import { CREATE_LOCATION, DELETE_LOCATION, UPDATE_LOCATION } from '../model/location.schema';
import type { LocationDto, LocationEntity, LocationPlatform } from '../model/location.types';

export class LocationService extends BaseService<LocationEntity, LocationDto> {
  constructor(graphqlService: GraphqlService, mapper = new LocationDtoMapper()) {
    super(graphqlService, mapper);
  }

  async createLocation(data: LocationEntity, publicationId: PublicationId): Promise<LocationEntity> {
    const { locationId: _, ...dto } = this.dtoMapper.toDto(data);

    const response = await this.graphqlService.mutation(CREATE_LOCATION, {
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

  async updateLocation(data: LocationEntity, publicationId: PublicationId): Promise<LocationEntity> {
    const dto = this.dtoMapper.toDto(data);

    const response = await this.graphqlService.mutation(UPDATE_LOCATION, {
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

  async deleteLocation(locationId: string) {
    await this.graphqlService.mutation(DELETE_LOCATION, {
      locationId,
    });
  }
}
