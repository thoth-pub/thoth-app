import { appConfig, BaseMapper } from '..';
import { GraphqlService } from '../api/graphqlService';

export abstract class BaseService<
  EntityType,
  DtoType,
  MapperType extends BaseMapper<EntityType, DtoType> = BaseMapper<EntityType, DtoType>,
> {
  protected readonly graphqlService: GraphqlService;
  protected readonly dtoMapper: MapperType;
  protected readonly limit: number;

  constructor(mapper: MapperType, limit: number = appConfig.data.itemsPerRequestLimit) {
    this.graphqlService = new GraphqlService();
    this.dtoMapper = mapper;
    this.limit = limit;
  }
}
