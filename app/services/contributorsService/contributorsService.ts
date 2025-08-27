import { GET_CONTRIBUTORS } from '@/app/queries';
import type { ContributorEntity } from '@/interfaces';
import { BaseService } from '@/interfaces/services';

import { ContributorsDtoMapper } from './mappers';

export class ContributorsService extends BaseService {
  async getContributors(): Promise<ContributorEntity[]> {
    const { data } = await this.queryClient({
      query: GET_CONTRIBUTORS,
    });

    const dtoMapper = new ContributorsDtoMapper();
    const res = data?.contributors.map(dtoMapper.toEntity);

    return res ?? [];
  }
}
