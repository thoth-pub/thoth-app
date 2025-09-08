import { BaseService } from '@/src/shared/interfaces/services';

import { ContributorDtoMapper } from '../model/contributor.mapper';
import { GET_CONTRIBUTORS } from '../model/contributor.schema';
import type { ContributorEntity } from '../model/contributor.types';

export class ContributorService extends BaseService {
  async getContributors(): Promise<ContributorEntity[]> {
    const { data } = await this.queryClient({
      query: GET_CONTRIBUTORS,
    });

    if (!data || !data.contributors) {
      return [];
    }

    const dtoMapper = new ContributorDtoMapper();
    const res = data.contributors.map(dtoMapper.toEntity);

    return res;
  }
}
