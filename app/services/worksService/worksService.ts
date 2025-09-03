import { GET_BOOKS, GET_CHAPTERS, GET_WORKS } from '@/app/queries';
import type { PublisherId, WorkDto, WorkEntity } from '@/interfaces';
import { BaseService } from '@/interfaces/services';

import { WorkDtoMapper } from './mappers';

export class WorksService extends BaseService {
  async getWorks(publishersIds: PublisherId[]): Promise<WorkEntity[]> {
    const { data } = await this.queryClient<{ works: WorkDto[] }>({
      query: GET_WORKS,
      variables: { publishers: publishersIds },
    });

    if (!data || !data.works) {
      return [];
    }

    const dtoMapper = new WorkDtoMapper();
    const res = data.works.map((work) => dtoMapper.toEntity(work));

    return res;
  }

  async getBooks(publishersIds: PublisherId[]): Promise<WorkEntity[]> {
    const { data } = await this.queryClient({
      query: GET_BOOKS,
      variables: { publishers: publishersIds },
    });

    if (!data || !data.books) {
      return [];
    }

    const dtoMapper = new WorkDtoMapper();
    const res = data.books.map(dtoMapper.toEntity);

    return res;
  }

  async getChapters(publishersIds: PublisherId[]): Promise<WorkEntity[]> {
    const { data } = await this.queryClient({
      query: GET_CHAPTERS,
      variables: { publishers: publishersIds },
    });

    if (!data || !data.chapters) {
      return [];
    }

    const dtoMapper = new WorkDtoMapper();
    const res = data.chapters.map(dtoMapper.toEntity);

    return res;
  }
}
