import { appConfig, BaseMapper } from '..';
import { GraphqlService } from '../api/graphqlService';

export abstract class BaseService<EntityType, DtoType> {
  protected readonly graphqlService: GraphqlService;
  protected readonly dtoMapper: BaseMapper<EntityType, DtoType>;
  protected readonly limit: number;

  constructor(mapper: BaseMapper<EntityType, DtoType>, limit: number = appConfig.data.itemsPerRequestLimit) {
    this.graphqlService = new GraphqlService();
    this.dtoMapper = mapper;
    this.limit = limit;
  }
}
