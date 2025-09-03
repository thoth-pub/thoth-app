import { GET_PUBLISHERS } from '@/app/queries';
import type { PublisherEntity, PublisherId } from '@/interfaces';
import { BaseService } from '@/interfaces/services';

import { PublisherDtoMapper } from './mappers';

export class PublishersService extends BaseService {
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
