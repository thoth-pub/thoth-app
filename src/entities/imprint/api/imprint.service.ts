import { PublisherId } from '@/src/entities/publisher';
import { appConfig } from '@/src/shared/config';
import { BaseService } from '@/src/shared/interfaces/services';

import { ImprintDtoMapper } from '../model/imprint.mapper';
import { GET_IMPRINTS, GET_IMPRINTS_COUNT } from '../model/imprint.schema';
import type { ImprintDto, ImprintEntity } from '../model/imprint.types';

const { itemsPerRequestLimit, maxItemsPerRequestLimit } = appConfig.data;

type GetImprintsProps = {
  publishersIds: PublisherId[];
  offset?: number;
  limit?: number;
};

export class ImprintService extends BaseService<ImprintEntity, ImprintDto> {
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
