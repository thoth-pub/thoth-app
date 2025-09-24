import { appConfig } from '@/src/shared';
import { BaseService } from '@/src/shared/interfaces/services';

import { PublisherDtoMapper } from '../model/publisher.mapper';
import { GET_PUBLISHERS } from '../model/publisher.schema';
import type { PublisherEntity, PublisherId } from '../model/publisher.types';

const { itemsPerRequestLimit, maxItemsPerRequestLimit } = appConfig.data;

type GetPublishersProps = {
  publishersIds: PublisherId[];
  offset?: number;
  limit?: number;
};

export class PublisherService extends BaseService {
  async getPublishers({
    publishersIds,
    offset = 0,
    limit = itemsPerRequestLimit,
  }: GetPublishersProps): Promise<PublisherEntity[]> {
    const { data } = await this.queryClient({
      query: GET_PUBLISHERS,
      variables: { publishers: publishersIds, offset, limit },
    });

    if (!data || !data.publishers) {
      return [];
    }

    const dtoMapper = new PublisherDtoMapper();
    const res = data.publishers.map(dtoMapper.toEntity);

    return res;
  }

  async getAllPublishers({
    publishersIds,
    limit = maxItemsPerRequestLimit,
  }: GetPublishersProps): Promise<PublisherEntity[]> {
    const maxImprintsCount = publishersIds.length;
    let offset = 0;
    const imprints = [];

    do {
      const data = await this.getPublishers({ publishersIds, offset, limit });
      imprints.push(...data);
      offset += limit;
    } while (offset < maxImprintsCount);

    return imprints;
  }
}
