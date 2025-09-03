import { GET_CONTRIBUTORS } from '@/app/queries';
import type { ContributorEntity } from '@/interfaces';
import { BaseService } from '@/interfaces/services';

import { ContributorDtoMapper } from './mappers';

export class ContributorsService extends BaseService {
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
