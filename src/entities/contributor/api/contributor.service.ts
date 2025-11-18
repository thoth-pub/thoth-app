import { BaseService } from '@/src/shared/interfaces/services';

import { ContributorEntity } from '../model/contributor.types';
import { GET_CONTRIBUTORS } from '../model/contributor.schema';
import { ContributorDtoMapper } from '../model/contributor.mapper';

export class ContributorService extends BaseService {
  async getContributors(filter: string): Promise<ContributorEntity[]> {
    const { data } = await this.queryClient({
      query: GET_CONTRIBUTORS,
      variables: { filter },
    });

    if (!data || !data.contributors) {
      return [];
    }

    const dtoMapper = new ContributorDtoMapper();
    const res = data.contributors.map(dtoMapper.toEntity);

    return res;
  }
}
