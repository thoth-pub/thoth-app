import { PublisherId } from '@/src/entities/publisher';
import { GraphqlService } from '@/src/shared/api/graphqlService';
import { appConfig } from '@/src/shared/config';
import { BaseService } from '@/src/shared/interfaces/services';

import { ImprintDtoMapper } from '../model/imprint.mapper';
import { CREATE_IMPRINT, DELETE_IMPRINT, UPDATE_IMPRINT, UPDATE_IMPRINT_ADMIN } from '../model/imprint.mutations';
import { GET_IMPRINTS, GET_IMPRINTS_ADMIN, GET_IMPRINTS_COUNT } from '../model/imprint.schema';
import type { ImprintBaseDto, ImprintDto, ImprintEntity, ImprintId } from '../model/imprint.types';

const { itemsPerRequestLimit, maxImprintsPerRequestLimit } = appConfig.data;

type GetImprintsProps = {
  publishersIds: PublisherId[];
  offset?: number;
  limit?: number;
  isSuperuser?: boolean;
};

export class ImprintService extends BaseService<ImprintEntity, ImprintDto, ImprintDtoMapper> {
  constructor(graphqlService: GraphqlService, mapper = new ImprintDtoMapper()) {
    super(graphqlService, mapper);
  }

  async getImprintsCount(publishersIds: PublisherId[]): Promise<number> {
    const { imprintCount = 0 } = await this.graphqlService.query(GET_IMPRINTS_COUNT, {
      publishers: publishersIds,
    });

    return imprintCount;
  }

  async getImprints({
    publishersIds,
    offset = 0,
    limit = itemsPerRequestLimit,
    isSuperuser = false,
  }: GetImprintsProps): Promise<ImprintEntity[]> {
    const query = isSuperuser ? GET_IMPRINTS_ADMIN : GET_IMPRINTS;
    const { imprints = [] } = await this.graphqlService.query(query, {
      offset,
      limit,
      publishers: publishersIds,
    });

    const res = imprints.map(this.dtoMapper.toEntity);

    return res;
  }

  async getPublisherImprints(publisherId: PublisherId, isSuperuser = false): Promise<ImprintEntity[]> {
    const result = await this.getImprints({
      publishersIds: [publisherId],
      offset: 0,
      limit: maxImprintsPerRequestLimit,
      isSuperuser,
    });

    return result;
  }

  async createImprint(data: { publisherId: PublisherId; imprintName: string }) {
    await this.graphqlService.mutation(CREATE_IMPRINT, { data });
  }

  async updateImprint(entity: ImprintEntity, publisherId: PublisherId, isSuperuser = false) {
    const { imprintId, imprintName, publisher: _publisher, updatedAt: _updatedAt, ...fields } = this.dtoMapper.toDto(entity, isSuperuser);
    const data = { imprintId, imprintName, publisherId, ...fields };

    if (isSuperuser) {
      const result = await this.graphqlService.mutation(UPDATE_IMPRINT_ADMIN, { data });

      return this.dtoMapper.toEntity(result.updateImprint as ImprintDto);
    }

    const result = await this.graphqlService.mutation(UPDATE_IMPRINT, { data });
    return this.dtoMapper.toEntity(result.updateImprint as ImprintBaseDto);
  }

  async deleteImprint(imprintId: ImprintId) {
    await this.graphqlService.mutation(DELETE_IMPRINT, { imprintId });
  }
}
