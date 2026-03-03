import { MarkupFormat, RelationType, WorkField } from '@/gql/graphql';
import { PublisherId } from '@/src/entities/publisher';
import { appConfig } from '@/src/shared/config';
import { type QueryToken } from '@/src/shared/interfaces';
import { BaseService } from '@/src/shared/interfaces/services';
import { Direction } from '@/src/shared/types';

import { WorkService } from '../../work/api/work.service';
import { WorkId } from '../../work/model/work.types';
import { SetDtoMapper } from '../model/set.mapper';
import {
  ADD_BOOK_TO_SET,
  CREATE_SET,
  DELETE_BOOK_FROM_SET,
  DELETE_SET,
  MOVE_BOOK_IN_SET,
  UPDATE_SET,
} from '../model/set.mutations';
import { GET_BOOK_SET_WORKS, GET_SET, GET_SETS, GET_SETS_COUNT } from '../model/set.schema';
import { SetDto, SetEntity, SetId, SetWorkDto, SetWorkEntity } from '../model/set.types';

type SetServiceDependencies = {
  token: QueryToken;
  workService: WorkService;
  mapper?: SetDtoMapper;
};

export class SetService extends BaseService<SetEntity, SetDto, SetDtoMapper> {
  private readonly workService: WorkService;

  constructor({ token, workService, mapper = new SetDtoMapper() }: Readonly<SetServiceDependencies>) {
    super(token, mapper);
    this.workService = workService;
  }

  async getSets({
    publishersIds,
    offset,
    limit,
    filter,
    direction,
    field,
    markupFormat,
  }: {
    publishersIds: PublisherId[];
    offset?: number;
    limit?: number;
    direction?: Direction;
    filter?: string;
    field?: WorkField;
    markupFormat?: MarkupFormat;
  }): Promise<SetEntity[]> {
    const { works = [] } = await this.graphqlService.query(GET_SETS, {
      publishers: publishersIds,
      offset,
      limit,
      direction,
      filter,
      field,
      markupFormat,
    });

    const res = works.map((work) => this.dtoMapper.toEntity(work as SetDto));

    return res;
  }

  async getSet(setId: SetId): Promise<SetEntity> {
    const { work } = await this.graphqlService.query(GET_SET, {
      workId: setId,
    });

    return this.dtoMapper.toEntity(work as SetDto);
  }

  async getSetsCount({ publishersIds, filter }: { publishersIds: PublisherId[]; filter?: string }): Promise<number> {
    const { workCount = 0 } = await this.graphqlService.query(GET_SETS_COUNT, {
      publishers: publishersIds,
      filter,
    });

    return workCount;
  }

  async getAllSets({
    publishersIds,
    limit = appConfig.data.itemsPerRequestLimit,
  }: {
    publishersIds: PublisherId[];
    limit?: number;
  }): Promise<SetEntity[]> {
    const maxSetsCount = await this.getSetsCount({ publishersIds });
    let offset = 0;
    const sets = [];

    do {
      const data = await this.getSets({ publishersIds, offset, limit });
      sets.push(...data);
      offset += limit;
    } while (offset < maxSetsCount);

    return sets;
  }

  async createSet(data: SetEntity): Promise<SetEntity> {
    const {
      workId: _workId,
      titles: _titles,
      updatedAt: _updatedAt,
      relations: _relations,
      ...dto
    } = this.dtoMapper.toDto(data);

    const response = await this.graphqlService.mutation(CREATE_SET, {
      data: dto as SetDto,
    });

    const work = this.dtoMapper.toEntity(response.createWork as SetDto);

    const promises = [];

    for (const title of data.titles) {
      promises.push(this.workService.createTitle(title, work.id));
    }

    const createdTitles = await Promise.all(promises);

    work.titles = createdTitles;

    return work;
  }

  async updateSet(data: SetEntity): Promise<SetEntity> {
    const { updatedAt: _updatedAt, titles: _titles, ...dto } = this.dtoMapper.toDto(data) as SetDto;

    const response = await this.graphqlService.mutation(UPDATE_SET, {
      data: dto,
    });

    const set = this.dtoMapper.toEntity(response.updateWork as SetDto);

    return set;
  }

  async deleteSet(setId: SetId): Promise<void> {
    await this.graphqlService.mutation(DELETE_SET, {
      workId: setId,
    });
  }

  async getBookSetWorks(setId: SetId): Promise<SetWorkEntity[]> {
    const { work } = await this.graphqlService.query(GET_BOOK_SET_WORKS, {
      setId,
    });

    return this.dtoMapper.toEntitySetWorks(work as SetWorkDto);
  }

  addBookToSet(setId: SetId, bookId: WorkId, ordinal: number) {
    return this.graphqlService.mutation(ADD_BOOK_TO_SET, {
      data: {
        relatorWorkId: bookId,
        relatedWorkId: setId,
        relationOrdinal: ordinal,
        relationType: RelationType.IsPartOf,
      },
    });
  }

  async deleteBookFromSet(relationId: string) {
    return this.graphqlService.mutation(DELETE_BOOK_FROM_SET, {
      workRelationId: relationId,
    });
  }

  moveBookInSet(relationId: string, newOrdinal: number) {
    return this.graphqlService.mutation(MOVE_BOOK_IN_SET, {
      workRelationId: relationId,
      newOrdinal,
    });
  }
}
