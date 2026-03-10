import { faker } from '@faker-js/faker';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WorkStatus, WorkType } from '@/gql/graphql';
import { GraphqlService } from '@/src/shared/api/graphqlService';
import { getDefaultTitle } from '@/src/shared/utils/work';

import { TitleService } from '../../title/api/title.service';
import { SetDtoMapper } from '../model/set.mapper';
import type { SetDto, SetEntity } from '../model/set.types';
import { SetService } from './set.service';

describe('createSet', () => {
  let setService: SetService;
  let mockGraphqlService: GraphqlService;
  let mockTitleService: TitleService;
  let mockMapper: SetDtoMapper;

  const createSetEntity = (overrides?: Partial<SetEntity>): SetEntity => ({
    id: faker.string.uuid(),
    titles: [],
    type: WorkType.BookSet,
    updatedAt: '',
    imprintId: faker.string.uuid(),
    status: WorkStatus.Active,
    edition: 1,
    volumesCount: 0,
    covers: [],
    ...overrides,
  });

  beforeEach(() => {
    mockGraphqlService = {
      query: vi.fn(),
      mutation: vi.fn(),
    } as unknown as GraphqlService;

    mockTitleService = {
      createTitle: vi.fn(),
      createTitles: vi.fn(),
      deleteTitle: vi.fn(),
    } as unknown as TitleService;

    mockMapper = new SetDtoMapper();

    vi.spyOn(mockMapper, 'toDto').mockImplementation((entity: SetEntity) => ({
      workId: entity.id,
      workType: entity.type,
      titles: [],
      updatedAt: entity.updatedAt,
      imprintId: entity.imprintId,
      workStatus: entity.status,
      edition: entity.edition,
      relations: [],
    }));

    vi.spyOn(mockMapper, 'toEntity').mockImplementation((dto: SetDto) => ({
      id: dto.workId,
      type: dto.workType,
      titles: [],
      updatedAt: dto.updatedAt,
      imprintId: dto.imprintId,
      status: dto.workStatus,
      edition: dto.edition ?? 1,
      volumesCount: 0,
      covers: [],
    }));

    setService = new SetService({
      graphqlService: mockGraphqlService,
      titleService: mockTitleService,
      mapper: mockMapper,
    });
  });

  it('should create a set with titles successfully', async () => {
    const title = getDefaultTitle({ id: faker.string.uuid(), title: 'Test Set' });
    const setEntity = createSetEntity({ titles: [title] });
    const createdSetId = faker.string.uuid();
    const createdTitleId = faker.string.uuid();

    (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
      createWork: {
        workId: createdSetId,
        workType: setEntity.type,
        titles: [],
        updatedAt: '',
        imprintId: setEntity.imprintId,
        workStatus: setEntity.status,
        edition: setEntity.edition,
        relations: [],
      },
    });

    const createdTitle = { ...title, id: createdTitleId };
    (mockTitleService.createTitles as ReturnType<typeof vi.fn>).mockResolvedValue([createdTitle]);

    const result = await setService.createSet(setEntity);

    expect(result.id).toBe(createdSetId);
    expect(result.titles).toHaveLength(1);
    expect(result.titles[0].id).toBe(createdTitleId);
  });

  it('should rollback (delete set) when title creation fails', async () => {
    const title = getDefaultTitle({ id: faker.string.uuid(), title: 'Failing Title' });
    const setEntity = createSetEntity({ titles: [title] });
    const createdSetId = faker.string.uuid();

    (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
      createWork: {
        workId: createdSetId,
        workType: setEntity.type,
        titles: [],
        updatedAt: '',
        imprintId: setEntity.imprintId,
        workStatus: setEntity.status,
        edition: setEntity.edition,
        relations: [],
      },
    });

    const titleError = new Error('Title creation failed');
    (mockTitleService.createTitles as ReturnType<typeof vi.fn>).mockImplementation(
      async (_titles: unknown, _workId: unknown, transactions: { rollback: () => Promise<void> }) => {
        await transactions.rollback();
        throw titleError;
      },
    );

    const promise = setService.createSet(setEntity);

    await expect(promise).rejects.toThrow('Title creation failed');
    expect(mockGraphqlService.mutation).toHaveBeenCalledTimes(2);
    expect(mockGraphqlService.mutation).toHaveBeenLastCalledWith(expect.anything(), { workId: createdSetId });
  });

  it('should return set with only successful titles when some title creations fail', async () => {
    const title1 = getDefaultTitle({ id: faker.string.uuid(), title: 'Title 1' });
    const title2 = getDefaultTitle({ id: faker.string.uuid(), title: 'Title 2' });
    const setEntity = createSetEntity({ titles: [title1, title2] });
    const createdSetId = faker.string.uuid();
    const createdTitle1Id = faker.string.uuid();

    (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
      createWork: {
        workId: createdSetId,
        workType: setEntity.type,
        titles: [],
        updatedAt: '',
        imprintId: setEntity.imprintId,
        workStatus: setEntity.status,
        edition: setEntity.edition,
        relations: [],
      },
    });

    (mockTitleService.createTitles as ReturnType<typeof vi.fn>).mockResolvedValue([{ ...title1, id: createdTitle1Id }]);

    const result = await setService.createSet(setEntity);

    expect(result.id).toBe(createdSetId);
    expect(result.titles).toHaveLength(1);
    expect(result.titles[0].id).toBe(createdTitle1Id);
    expect(mockGraphqlService.mutation).toHaveBeenCalledTimes(1);
  });

  it('should still throw original error even if rollback fails', async () => {
    const title = getDefaultTitle({ id: faker.string.uuid(), title: 'Title' });
    const setEntity = createSetEntity({ titles: [title] });
    const createdSetId = faker.string.uuid();

    (mockGraphqlService.mutation as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        createWork: {
          workId: createdSetId,
          workType: setEntity.type,
          titles: [],
          updatedAt: '',
          imprintId: setEntity.imprintId,
          workStatus: setEntity.status,
          edition: setEntity.edition,
          relations: [],
        },
      })
      .mockRejectedValueOnce(new Error('Delete set failed'));

    (mockTitleService.createTitles as ReturnType<typeof vi.fn>).mockImplementation(
      async (_titles: unknown, _workId: unknown, transactions: { rollback: () => Promise<void> }) => {
        await transactions.rollback();
        throw new Error('Title creation failed');
      },
    );

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const promise = setService.createSet(setEntity);

    await expect(promise).rejects.toThrow('Title creation failed');
    consoleSpy.mockRestore();
  });
});
