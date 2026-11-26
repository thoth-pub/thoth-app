import { Direction, Expression, type GetBooksCountsByDatesQueryVariables, WorkField } from '@/gql/graphql';
import { GraphqlService } from '@/src/shared/api/graphqlService';
import { BaseService } from '@/src/shared/interfaces/services';

import { PublisherId } from '../../publisher';
import { WorkDtoMapper } from '../../work/model/work.mapper';
import { WorkDto, WorkEntity, WorkStatus } from '../../work/model/work.types';
import { GET_BOOKS, GET_BOOKS_COUNT, GET_BOOKS_COUNTS_BY_DATES, GET_BOOKS_STATUS_COUNTS } from '../model/book.schema';

// Matches the aliased fields (m0..m12) and variables (d0..d12) of GetBooksCountsByDates.
export const BOOKS_COUNTS_BY_DATES_MAX = 13;

export class BookService extends BaseService<WorkEntity, WorkDto> {
  constructor(graphqlService: GraphqlService, mapper = new WorkDtoMapper()) {
    super(graphqlService, mapper);
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
    workStatuses,
  }: {
    publishersIds: PublisherId[];
    filter?: string;
    expression?: Expression;
    publishedAt?: string;
    workStatus?: WorkStatus;
    workStatuses?: WorkStatus[];
  }): Promise<number> {
    const { bookCount = 0 } = await this.graphqlService.query(GET_BOOKS_COUNT, {
      publishers: publishersIds,
      filter,
      workStatus,
      workStatuses,
      ...(publishedAt && expression ? { publicationDate: { timestamp: publishedAt, expression } } : {}),
    });

    return bookCount;
  }

  /**
   * Counts of books published after each date, in one request. `dates` holds 1 to
   * BOOKS_COUNTS_BY_DATES_MAX entries; the result has one count per date, in order.
   */
  async getBooksCountsByDates({
    publishersIds,
    dates,
    workStatuses,
  }: {
    publishersIds: PublisherId[];
    dates: string[];
    workStatuses?: WorkStatus[];
  }): Promise<number[]> {
    if (dates.length === 0 || dates.length > BOOKS_COUNTS_BY_DATES_MAX) {
      throw new RangeError(`dates must hold 1 to ${BOOKS_COUNTS_BY_DATES_MAX} entries`);
    }

    const variables: Record<string, unknown> = { publishers: publishersIds, workStatuses };
    dates.forEach((timestamp, index) => {
      variables[`d${index}`] = { timestamp, expression: Expression.GreaterThan };
    });

    // The aliases m0..m12 are fixed by the document; index them by name to follow the dates.
    const data = (await this.graphqlService.query(
      GET_BOOKS_COUNTS_BY_DATES,
      variables as GetBooksCountsByDatesQueryVariables,
    )) as unknown as Record<string, number | undefined>;

    return dates.map((_, index) => data[`m${index}`] ?? 0);
  }

  /** Total, active and forthcoming book counts in one request. */
  async getBooksStatusCounts({
    publishersIds,
  }: {
    publishersIds: PublisherId[];
  }): Promise<{ total: number; active: number; forthcoming: number }> {
    const { total = 0, active = 0, forthcoming = 0 } = await this.graphqlService.query(GET_BOOKS_STATUS_COUNTS, {
      publishers: publishersIds,
    });

    return { total, active, forthcoming };
  }
}
