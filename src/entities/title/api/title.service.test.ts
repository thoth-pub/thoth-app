import { faker } from '@faker-js/faker';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphqlService } from '@/src/shared/api/graphqlService';
import { TransactionContext } from '@/src/shared/services';
import { getDefaultTitle } from '@/src/shared/utils/work';

import { TitleService } from './title.service';

describe('createTitles', () => {
  let titleService: TitleService;
  let mockGraphqlService: GraphqlService;
  let transactions: TransactionContext;

  beforeEach(() => {
    mockGraphqlService = {
      query: vi.fn(),
      mutation: vi.fn(),
    } as unknown as GraphqlService;

    titleService = new TitleService(mockGraphqlService);
    transactions = new TransactionContext();
  });

  it('should throw error when called with empty titles array', async () => {
    const workId = faker.string.uuid();

    const promise = titleService.createTitles([], workId, transactions);

    await expect(promise).rejects.toThrow('Must have at least one title');
    expect(mockGraphqlService.mutation).not.toHaveBeenCalled();
  });

  it('should create a single title successfully', async () => {
    const title = getDefaultTitle({ id: faker.string.uuid(), title: 'Test Title' });
    const workId = faker.string.uuid();
    const createdTitleId = faker.string.uuid();

    (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
      createTitle: {
        titleId: createdTitleId,
        titleType: title.canonical ? 'MAIN' : 'ALTERNATIVE',
        title: title.title,
        subtitle: title.subtitle,
        fullTitle: title.fullTitle,
        languageCode: title.localeCode,
      },
    });

    const result = await titleService.createTitles([title], workId, transactions);

    expect(result).toHaveLength(1);
    expect(mockGraphqlService.mutation).toHaveBeenCalledTimes(1);
  });

  it('should create multiple titles successfully', async () => {
    const title1 = getDefaultTitle({ id: faker.string.uuid(), title: 'Title 1' });
    const title2 = getDefaultTitle({ id: faker.string.uuid(), title: 'Title 2' });
    const workId = faker.string.uuid();

    (mockGraphqlService.mutation as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        createTitle: {
          titleId: faker.string.uuid(),
          titleType: 'ALTERNATIVE',
          title: title1.title,
          subtitle: title1.subtitle,
          fullTitle: title1.fullTitle,
          languageCode: title1.localeCode,
        },
      })
      .mockResolvedValueOnce({
        createTitle: {
          titleId: faker.string.uuid(),
          titleType: 'ALTERNATIVE',
          title: title2.title,
          subtitle: title2.subtitle,
          fullTitle: title2.fullTitle,
          languageCode: title2.localeCode,
        },
      });

    const result = await titleService.createTitles([title1, title2], workId, transactions);

    expect(result).toHaveLength(2);
    expect(mockGraphqlService.mutation).toHaveBeenCalledTimes(2);
  });

  it('should rollback and throw error when all title creations fail', async () => {
    const title = getDefaultTitle({ id: faker.string.uuid(), title: 'Failing Title' });
    const workId = faker.string.uuid();
    const rollbackSpy = vi.fn().mockResolvedValue(undefined);
    transactions.onRollback(rollbackSpy);

    const titleError = new Error('Title creation failed');
    (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockRejectedValue(titleError);

    const promise = titleService.createTitles([title], workId, transactions);

    await expect(promise).rejects.toThrow('Title creation failed');
    expect(rollbackSpy).toHaveBeenCalledOnce();
  });

  it('should return only successful titles when some fail', async () => {
    const title1 = getDefaultTitle({ id: faker.string.uuid(), title: 'Title 1' });
    const title2 = getDefaultTitle({ id: faker.string.uuid(), title: 'Title 2' });
    const workId = faker.string.uuid();
    const createdTitleId = faker.string.uuid();

    (mockGraphqlService.mutation as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        createTitle: {
          titleId: createdTitleId,
          titleType: 'ALTERNATIVE',
          title: title1.title,
          subtitle: title1.subtitle,
          fullTitle: title1.fullTitle,
          languageCode: title1.localeCode,
        },
      })
      .mockRejectedValueOnce(new Error('Second title failed'));

    const rollbackSpy = vi.fn().mockResolvedValue(undefined);
    transactions.onRollback(rollbackSpy);

    const result = await titleService.createTitles([title1, title2], workId, transactions);

    expect(result).toHaveLength(1);
    expect(rollbackSpy).not.toHaveBeenCalled();
  });

  it('should rollback when all titles in a batch fail', async () => {
    const title1 = getDefaultTitle({ id: faker.string.uuid(), title: 'Title 1' });
    const title2 = getDefaultTitle({ id: faker.string.uuid(), title: 'Title 2' });
    const workId = faker.string.uuid();

    (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Creation failed'),
    );

    const rollbackSpy = vi.fn().mockResolvedValue(undefined);
    transactions.onRollback(rollbackSpy);

    const promise = titleService.createTitles([title1, title2], workId, transactions);

    await expect(promise).rejects.toThrow('Creation failed');
    expect(rollbackSpy).toHaveBeenCalledOnce();
  });

  it('should still throw original error even if rollback fails', async () => {
    const title = getDefaultTitle({ id: faker.string.uuid(), title: 'Title' });
    const workId = faker.string.uuid();

    (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Title creation failed'),
    );

    transactions.onRollback(async () => {
      throw new Error('Rollback failed');
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const promise = titleService.createTitles([title], workId, transactions);

    await expect(promise).rejects.toThrow('Title creation failed');
    consoleSpy.mockRestore();
  });
});
