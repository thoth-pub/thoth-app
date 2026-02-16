import { PublisherId } from '@/src/entities/publisher';
import { QueryToken } from '@/src/shared';
import { appConfig } from '@/src/shared/config';
import { BaseService } from '@/src/shared/interfaces/services';

import { ImprintDtoMapper } from '../model/imprint.mapper';
import { CREATE_IMPRINT, DELETE_IMPRINT, UPDATE_IMPRINT } from '../model/imprint.mutations';
import { GET_IMPRINTS, GET_IMPRINTS_COUNT } from '../model/imprint.schema';
import type { ImprintDto, ImprintEntity, ImprintId } from '../model/imprint.types';

const { itemsPerRequestLimit, maxItemsPerRequestLimit, maxImprintsPerRequestLimit } = appConfig.data;

type GetImprintsProps = {
  publishersIds: PublisherId[];
  offset?: number;
  limit?: number;
};

export class ImprintService extends BaseService<ImprintEntity, ImprintDto, ImprintDtoMapper> {
  constructor(mapper = new ImprintDtoMapper()) {
    super(mapper);
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
  }: GetImprintsProps): Promise<ImprintEntity[]> {
    const { imprints = [] } = await this.graphqlService.query(GET_IMPRINTS, {
      offset,
      limit,
      publishers: publishersIds,
    });

    const res = imprints.map(this.dtoMapper.toEntity);

    return res;
  }

  async getPublisherImprints(publisherId: PublisherId): Promise<ImprintEntity[]> {
    const result = await this.getImprints({
      publishersIds: [publisherId],
      offset: 0,
      limit: maxImprintsPerRequestLimit,
    });

    return result;
  }

  async getAllImprints({ publishersIds, limit = maxItemsPerRequestLimit }: GetImprintsProps): Promise<ImprintEntity[]> {
    const maxImprintsCount = await this.getImprintsCount(publishersIds);
    let offset = 0;
    const imprints = [];

    do {
      const data = await this.getImprints({ publishersIds, offset, limit });
      imprints.push(...data);
      offset += limit;
    } while (offset < maxImprintsCount);

    return imprints;
  }

  async createImprint(token: QueryToken, data: { publisherId: PublisherId; imprintName: string }) {
    await this.graphqlService.mutation(token, CREATE_IMPRINT, { data });
  }

  async updateImprint(token: QueryToken, data: { name: string; id: ImprintId }, publisherId: PublisherId) {
    const result = await this.graphqlService.mutation(token, UPDATE_IMPRINT, {
      data: { imprintName: data.name, imprintId: data.id, publisherId },
    });

    const imprint = this.dtoMapper.toEntity(result.updateImprint as ImprintDto);

    return imprint;
  }

  async deleteImprint(token: QueryToken, imprintId: ImprintId) {
    await this.graphqlService.mutation(token, DELETE_IMPRINT, { imprintId });
  }
}
