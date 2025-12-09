import { Direction, Expression, WorkField } from '@/gql/graphql';
import { BaseService } from '@/src/shared/interfaces/services';

import { PublisherId } from '../../publisher';
import { WorkDtoMapper } from '../../work/model/work.mapper';
import { WorkDto, WorkEntity, WorkStatus } from '../../work/model/work.types';
import { GET_BOOKS, GET_BOOKS_COUNT } from '../model/book.schema';

export class BookService extends BaseService<WorkEntity, WorkDto> {
  constructor(mapper = new WorkDtoMapper()) {
    super(mapper);
  }

  async getBooks({
    publishersIds,
    offset = 0,
    limit,
    direction,
    filter,
    workStatus,
    startedAt,
    expression,
    field,
  }: {
    publishersIds: PublisherId[];
    offset?: number;
    limit?: number;
    direction?: Direction;
    filter?: string;
    workStatus?: WorkStatus;
    startedAt?: string;
    expression?: Expression;
    field?: WorkField;
  }): Promise<WorkEntity[]> {
    const { books = [] } = await this.graphqlService.query(GET_BOOKS, {
      publishers: publishersIds,
      offset,
      limit,
      direction,
      filter,
      workStatus,
      field,
      ...(startedAt && expression ? { startedAt, expression } : {}),
    });

    const data = books.map((book) => this.dtoMapper.toEntity(book as WorkDto));

    return data;
  }

  async getBooksCount({
    publishersIds,
    filter,
    expression,
    publishedAt,
    workStatus,
  }: {
    publishersIds: PublisherId[];
    filter?: string;
    expression?: Expression;
    publishedAt?: string;
    workStatus?: WorkStatus;
  }): Promise<number> {
    const { bookCount = 0 } = await this.graphqlService.query(GET_BOOKS_COUNT, {
      publishers: publishersIds,
      filter,
      workStatus,
      ...(publishedAt && expression ? { publicationDate: { timestamp: publishedAt, expression } } : {}),
    });

    return bookCount;
  }
}
