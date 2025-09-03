import { GET_BOOKS, GET_CHAPTERS, GET_WORK, GET_WORKS } from '@/app/queries';
import type { PublisherId, WorkDto, WorkEntity, WorkId } from '@/interfaces';
import { BaseService } from '@/interfaces/services';

import { WorkDtoMapper } from './mappers';

const dtoMapper = new WorkDtoMapper();

export class WorksService extends BaseService {
  async getWorks(publishersIds: PublisherId[]): Promise<WorkEntity[]> {
    const { data } = await this.queryClient<{ works: WorkDto[] }>({
      query: GET_WORKS,
      variables: { publishers: publishersIds },
    });

    if (!data || !data.works) {
      return [];
    }

    const res = data.works.map((work) => dtoMapper.toEntity(work));

    return res;
  }

  async getWork(workId: WorkId): Promise<WorkEntity | null> {
    const { data } = await this.queryClient<{ work: WorkDto }>({
      query: GET_WORK,
      variables: { workId },
    });

    if (!data || !data.work) {
      return null;
    }

    const res = dtoMapper.toEntity(data.work);

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

    const res = data.chapters.map(dtoMapper.toEntity);

    return res;
  }
}
