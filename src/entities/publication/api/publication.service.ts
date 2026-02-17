import { isDefaultId, type QueryToken } from '@/src/shared';
import { BaseService } from '@/src/shared/interfaces/services';

import { LocationService } from '../../locations/api/location.service';
import { PriceService } from '../../price/api/price.service';
import type { WorkId } from '../../work/model/work.types';
import { PublicationDtoMapper } from '../model/publication.mapper';
import { CREATE_PUBLICATION, DELETE_PUBLICATION, UPDATE_PUBLICATION } from '../model/publication.schema';
import type { PublicationDto, PublicationEntity, PublicationType } from '../model/publication.types';

export class PublicationService extends BaseService<PublicationEntity, PublicationDto> {
  private readonly locationService: LocationService;
  private readonly priceService: PriceService;

  constructor(
    token: QueryToken,
    mapper = new PublicationDtoMapper(),
    locationService = new LocationService(token),
    priceService = new PriceService(token),
  ) {
    super(token, mapper);
    this.locationService = locationService;
    this.priceService = priceService;
  }

  async createPublication(data: PublicationEntity, workId: WorkId): Promise<PublicationEntity> {
    const { publicationId: _, publicationType, ...dto } = this.dtoMapper.toDto(data);

    const response = await this.graphqlService.mutation(CREATE_PUBLICATION, {
      data: { ...dto, workId: workId, publicationType: publicationType as PublicationType },
    });

    const publication = this.dtoMapper.toEntity(response.createPublication as PublicationDto);

    const shouldCreatePrices = data.prices.length > 0;
    const shouldCreateLocations = data.locations.length > 0;

    if (shouldCreatePrices) {
      const pricesPromises = data.prices.map((price) => this.priceService.createPrice(price, publication.id));

      const createdPrices = await Promise.all(pricesPromises);

      publication.prices = createdPrices;
    }

    if (shouldCreateLocations) {
      const locationsPromises = data.locations.map((location) =>
        this.locationService.createLocation(location, publication.id),
      );

      const createdLocations = await Promise.all(locationsPromises);

      publication.locations = createdLocations;
    }

    return publication;
  }

  async updatePublication(data: PublicationEntity, workId: WorkId): Promise<PublicationEntity> {
    const { publicationId, publicationType, ...dto } = this.dtoMapper.toDto(data);

    await this.graphqlService.mutation(UPDATE_PUBLICATION, {
      data: {
        ...dto,
        workId: workId,
        publicationType: publicationType as PublicationType,
        publicationId: publicationId,
      },
    });

    const shouldUpdatePrices = data.prices.filter(({ id }) => isDefaultId(id)).length > 0;
    const shouldUpdateLocations = data.locations.filter(({ id }) => isDefaultId(id)).length > 0;

    if (shouldUpdatePrices) {
      const pricesPromises = data.prices.map((price) => this.priceService.updatePrice(price, publicationId));

      const updatedPrices = await Promise.all(pricesPromises);

      data.prices = updatedPrices;
    }

    if (shouldUpdateLocations) {
      const locationsPromises = data.locations.map((location) =>
        this.locationService.updateLocation(location, publicationId),
      );

      const updatedLocations = await Promise.all(locationsPromises);

      data.locations = updatedLocations;
    }

    const publicationWithoutDefaultPrices = data.prices.filter(({ id }) => !isDefaultId(id));

    data.prices = publicationWithoutDefaultPrices;

    const publicationWithoutDefaultLocations = data.locations.filter(({ id }) => !isDefaultId(id));

    data.locations = publicationWithoutDefaultLocations;

    return data;
  }

  async deletePublication(publicationId: string) {
    const response = await this.graphqlService.mutation(DELETE_PUBLICATION, {
      publicationId,
    });

    return response.deletePublication;
  }
}
