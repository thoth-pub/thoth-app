import { GraphqlService } from '../api/graphqlService';
import { appConfig } from '../config';
import { BaseMapper } from './mappers';

export abstract class BaseService<
  EntityType,
  DtoType,
  MapperType extends BaseMapper<EntityType, DtoType> = BaseMapper<EntityType, DtoType>,
> {
  protected readonly graphqlService: GraphqlService;
  protected readonly dtoMapper: MapperType;
  protected readonly limit: number;

  constructor(graphqlService: GraphqlService, mapper: MapperType, limit: number = appConfig.data.itemsPerRequestLimit) {
    this.graphqlService = graphqlService;
    this.dtoMapper = mapper;
    this.limit = limit;
  }
}
