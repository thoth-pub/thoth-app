import { GET_BOOKS, GET_CHAPTERS, GET_WORKS } from '@/app/queries';
import type { PublisherId, WorkEntity } from '@/interfaces';
import { BaseService } from '@/interfaces/services';

import { WorkDtoMapper } from './mappers';

export class WorksService extends BaseService {
  async getWorks(publishersIds: PublisherId[]): Promise<WorkEntity[]> {
    const { data } = await this.queryClient({
      query: GET_WORKS,
      variables: { publishers: publishersIds },
    });

    const dtoMapper = new WorkDtoMapper();
    const res = data?.works.map(dtoMapper.toEntity);

    return res ?? [];
  }

  async getBooks(publishersIds: PublisherId[]): Promise<WorkEntity[]> {
    const { data } = await this.queryClient({
      query: GET_BOOKS,
      variables: { publishers: publishersIds },
    });

    const dtoMapper = new WorkDtoMapper();
    const res = data?.books.map(dtoMapper.toEntity);

    return res ?? [];
  }

  async getChapters(publishersIds: PublisherId[]): Promise<WorkEntity[]> {
    const { data } = await this.queryClient({
      query: GET_CHAPTERS,
      variables: { publishers: publishersIds },
    });

    const dtoMapper = new WorkDtoMapper();
    const res = data?.chapters.map(dtoMapper.toEntity);

    return res ?? [];
  }
}
