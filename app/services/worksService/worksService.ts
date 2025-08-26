import { GET_BOOKS, GET_CHAPTERS, GET_WORKS } from '@/app/queries';
import type { WorkEntity } from '@/interfaces';
import { query } from '@/utils';

import { WorksDtoMapper } from './mappers';

export class WorksService {
  constructor(private readonly queryClient: typeof query) {}

  async getWorks(publishersIds: string[]): Promise<WorkEntity[]> {
    const { data } = await this.queryClient({
      query: GET_WORKS,
      variables: { publishers: publishersIds },
    });

    const dtoMapper = new WorksDtoMapper();
    const res = data?.works.map(dtoMapper.toEntity);

    return res ?? [];
  }

  async getBooks(publishersIds: string[]): Promise<WorkEntity[]> {
    const { data } = await this.queryClient({
      query: GET_BOOKS,
      variables: { publishers: publishersIds },
    });

    const dtoMapper = new WorksDtoMapper();
    const res = data?.books.map(dtoMapper.toEntity);

    return res ?? [];
  }

  async getChapters(publishersIds: string[]): Promise<WorkEntity[]> {
    const { data } = await this.queryClient({
      query: GET_CHAPTERS,
      variables: { publishers: publishersIds },
    });

    const dtoMapper = new WorksDtoMapper();
    const res = data?.chapters.map(dtoMapper.toEntity);

    return res ?? [];
  }
}
