import { GET_PUBLICATIONS } from '@/app/queries';
import type { PublicationEntity, PublisherId } from '@/interfaces';
import { BaseService } from '@/interfaces/services';

import { PublicationDtoMapper } from './mappers';

export class PublicationsService extends BaseService {
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
