import { PublisherId } from '@/src/entities/publisher';
import { BaseService } from '@/src/shared/interfaces/services';

import { PublicationDtoMapper } from '../model/publication.mapper';
import { GET_PUBLICATIONS } from '../model/publication.schema';
import type { PublicationEntity } from '../model/publication.types';

export class PublicationService extends BaseService {
  async getPublications(publishersIds: PublisherId[]): Promise<PublicationEntity[]> {
    const { data } = await this.queryClient({
      query: GET_PUBLICATIONS,
      variables: { publishers: publishersIds },
    });

    if (!data || !data.publications) {
      return [];
    }

    const dtoMapper = new PublicationDtoMapper();
    const res = data.publications.map(dtoMapper.toEntity);

    return res;
  }
}
