import { BaseService } from '@/src/shared/interfaces/services';

import { PublisherDtoMapper } from '../model/publisher.mapper';
import { GET_PUBLISHERS } from '../model/publisher.schema';
import type { PublisherEntity, PublisherId } from '../model/publisher.types';

export class PublisherService extends BaseService {
  async getPublishers(publishersIds: PublisherId[]): Promise<PublisherEntity[]> {
    const { data } = await this.queryClient({
      query: GET_PUBLISHERS,
      variables: { publishers: publishersIds },
    });

    if (!data || !data.publishers) {
      return [];
    }

    const dtoMapper = new PublisherDtoMapper();
    const res = data.publishers.map(dtoMapper.toEntity);

    return res;
  }
}
