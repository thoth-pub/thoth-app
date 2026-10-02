import { GraphqlService } from '@/src/shared/api/graphqlService';
import { BaseService } from '@/src/shared/interfaces/services';
import type { FileStorage } from '@/src/shared/services';
import { isDefaultId } from '@/src/shared/utils';

import { LocationService } from '../../locations/api/location.service';
import { PriceService } from '../../price/api/price.service';
import type { WorkId } from '../../work/model/work.types';
import { PublicationDtoMapper } from '../model/publication.mapper';
import { CREATE_PUBLICATION, DELETE_PUBLICATION, UPDATE_PUBLICATION } from '../model/publication.schema';
import type { PublicationDto, PublicationEntity, PublicationId, PublicationType } from '../model/publication.types';

type PublicationServiceDependencies = {
  graphqlService: GraphqlService;
  locationService: LocationService;
  priceService: PriceService;
  fileStorage: FileStorage;
  mapper?: PublicationDtoMapper;
};

export class PublicationService extends BaseService<PublicationEntity, PublicationDto> {
  private readonly locationService: LocationService;
  private readonly priceService: PriceService;
  private readonly fileStorage: FileStorage;

  constructor({
    graphqlService,
    locationService,
    priceService,
    fileStorage,
    mapper = new PublicationDtoMapper(),
  }: Readonly<PublicationServiceDependencies>) {
    super(graphqlService, mapper);
    this.locationService = locationService;
    this.priceService = priceService;
    this.fileStorage = fileStorage;
  }

  async createPublication(
    data: PublicationEntity,
    workId: WorkId,
    file?: File,
    onProgress?: (progress: number) => void,
  ): Promise<PublicationEntity> {
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

    if (file) {
      const fileUrl = await this.uploadPublicationFile(publication.id, file, onProgress);
      publication.fileUrl = fileUrl;
    }

    return publication;
  }

  /**
   * Creates one Publication of a bulk import exactly as its confirmed plan holds it (thoth-app#187), one write at a
   * time: the Publication, then its Prices in the plan's order, then its canonical Location, and only once that has
   * returned, every other Location in the plan's order. A failed write stops the sequence where it is, so no Location
   * is ever started before the canonical one it follows has been created.
   *
   * `onCreated` is told the Publication's id the moment it exists, before any of its children is written, so whoever
   * owns the attempt knows what to remove should a later write fail. A response that names no Publication is never
   * taken for one. Ordinary editor creation keeps {@link createPublication}, unchanged.
   */
  async createImportPublication(
    data: PublicationEntity,
    workId: WorkId,
    onCreated?: (publicationId: PublicationId) => void,
  ): Promise<PublicationEntity> {
    const { publicationId: _, publicationType, ...dto } = this.dtoMapper.toDto(data);

    const response = await this.graphqlService.mutation(CREATE_PUBLICATION, {
      data: { ...dto, workId: workId, publicationType: publicationType as PublicationType },
    });

    const publication = this.dtoMapper.toEntity(response.createPublication as PublicationDto);

    if (typeof publication.id !== 'string' || publication.id.length === 0) {
      throw new Error('Creating the Publication returned no Publication id, so whether it was created is not known');
    }

    onCreated?.(publication.id);

    const prices: PublicationEntity['prices'] = [];

    for (const price of data.prices) {
      prices.push(await this.priceService.createPrice(price, publication.id));
    }

    // The canonical Location first, then the rest, each in the plan's order: the backend refuses a non-canonical
    // Location that arrives before the canonical one.
    const ordered = [
      ...data.locations.filter(({ canonical }) => canonical),
      ...data.locations.filter(({ canonical }) => !canonical),
    ];
    const locations: PublicationEntity['locations'] = [];

    for (const location of ordered) {
      locations.push(await this.locationService.createLocation(location, publication.id));
    }

    publication.prices = prices;
    publication.locations = locations;

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

  async uploadPublicationFile(
    publicationId: PublicationId,
    file: File,
    onProgress?: (progress: number) => void,
  ): Promise<string> {
    const url = await this.fileStorage.uploadPublicationFile(publicationId, file, onProgress);

    return url;
  }
}
