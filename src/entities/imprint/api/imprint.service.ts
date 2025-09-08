import { PublisherId } from '@/src/entities/publisher';
import { config } from '@/src/shared/config';
import { BaseService } from '@/src/shared/interfaces/services';

import { ImprintDtoMapper } from '../model/imprint.mapper';
import { GET_IMPRINTS, GET_IMPRINTS_COUNT } from '../model/imprint.schema';
import type { ImprintEntity } from '../model/imprint.types';

const { itemsPerRequestLimit, maxItemsPerRequestLimit } = config.data;

type GetImprintsProps = {
  publishersIds: PublisherId[];
  offset?: number;
  limit?: number;
};

export class ImprintService extends BaseService {
  async getImprintsCount(publishersIds: PublisherId[]): Promise<number> {
    const { data } = await this.queryClient({
      query: GET_IMPRINTS_COUNT,
      variables: { publishers: publishersIds },
    });

    if (!data || !data.imprintCount) {
      return 0;
    }

    return data.imprintCount;
  }

  async getImprints({
    publishersIds,
    offset = 0,
    limit = itemsPerRequestLimit,
  }: GetImprintsProps): Promise<ImprintEntity[]> {
    const { data } = await this.queryClient({
      query: GET_IMPRINTS,
      variables: { offset, limit, publishers: publishersIds },
    });

    if (!data || !data.imprints) {
      return [];
    }

    const dtoMapper = new ImprintDtoMapper();
    const res = data.imprints.map(dtoMapper.toEntity);

    return res;
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
}
