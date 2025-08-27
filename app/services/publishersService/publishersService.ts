import { GET_PUBLISHERS } from '@/app/queries';
import type { PublisherEntity } from '@/interfaces';
import { BaseService } from '@/interfaces/services';

import { PublisherDtoMapper } from './mappers';

export class PublishersService extends BaseService {
  async getPublishers(publishersIds: string[]): Promise<PublisherEntity[]> {
    const { data } = await this.queryClient({
      query: GET_PUBLISHERS,
      variables: { publishers: publishersIds },
    });

    const dtoMapper = new PublisherDtoMapper();
    const res = data?.publishers.map(dtoMapper.toEntity);

    return res ?? [];
  }
}
