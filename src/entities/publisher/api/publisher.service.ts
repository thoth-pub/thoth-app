import { BaseService } from '@/src/shared/interfaces/services';

import { PublisherDtoMapper } from '../model/publisher.mapper';
import { GET_PUBLISHERS } from '../model/publisher.schema';
import type { PublisherDto, PublisherEntity, PublisherId } from '../model/publisher.types';

export class PublisherService extends BaseService<PublisherEntity, PublisherDto> {
  constructor(mapper = new PublisherDtoMapper()) {
    super(mapper);
  }

  async getPublishers(publisherIds: PublisherId[]): Promise<PublisherEntity[]> {
    const { publishers = [] } = await this.graphqlService.query(GET_PUBLISHERS, {
      publishers: publisherIds,
      offset: 0,
    });

    const data = publishers.map(this.dtoMapper.toEntity);

    return data;
  }
}
