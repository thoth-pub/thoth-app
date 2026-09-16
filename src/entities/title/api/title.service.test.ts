import { faker } from '@faker-js/faker';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MarkupFormat } from '@/gql/graphql';
import { GraphqlService } from '@/src/shared/api/graphqlService';
import { TransactionContext } from '@/src/shared/services';
import type { PlannedTitleEntity } from '@/src/shared/types';
import { getDefaultTitle } from '@/src/shared/utils/work';

import { CREATE_TITLE, DELETE_TITLE } from '../model/title.mutations';
import { TitleService } from './title.service';

describe('createTitle', () => {
  let titleService: TitleService;
  let mutation: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mutation = vi.fn(async (_document, variables) => ({
      createTitle: { titleId: faker.string.uuid(), ...variables.data, subtitle: variables.data.subtitle },
    }));
    titleService = new TitleService({ query: vi.fn(), mutation } as unknown as GraphqlService);
  });

  const planned = (data: Partial<PlannedTitleEntity>): PlannedTitleEntity => ({
    ...getDefaultTitle({ canonical: true, title: 'Cities', subtitle: 'A History', fullTitle: 'Cities: A History' }),
    sourceMarkupFormat: MarkupFormat.PlainText,
    ...data,
  });

  it('sends a planned title with the markup format and the full title its plan decided', async () => {
    await titleService.createTitle(
      planned({ fullTitle: '<italic>Cities</italic>: A History', sourceMarkupFormat: MarkupFormat.JatsXml }),
      'work-id',
    );

    expect(mutation).toHaveBeenCalledWith(CREATE_TITLE, {
      data: {
        canonical: true,
        fullTitle: '<italic>Cities</italic>: A History',
        localeCode: 'EN',
        subtitle: 'A History',
        title: 'Cities',
        workId: 'work-id',
      },
      markupFormat: MarkupFormat.JatsXml,
    });
  });

  it('sends a planned plain title as plain text, however its characters look', async () => {
    await titleService.createTitle(
      planned({ title: 'When a <b> c', subtitle: '', fullTitle: 'When a <b> c', canonical: false }),
      'work-id',
    );

    expect(mutation.mock.calls[0][1].markupFormat).toBe(MarkupFormat.PlainText);
    expect(mutation.mock.calls[0][1].data).not.toHaveProperty('sourceMarkupFormat');
  });

  it('sends a planned HTML title as HTML, never guessed as JATS', async () => {
    await titleService.createTitle(
      planned({
        title: '<i>Cities</i>',
        subtitle: '',
        fullTitle: '<i>Cities</i>',
        sourceMarkupFormat: MarkupFormat.Html,
      }),
      'work-id',
    );

    expect(mutation.mock.calls[0][1].markupFormat).toBe(MarkupFormat.Html);
  });

  it('still reads the format of a title typed in the editor from its text, and compiles its full title', async () => {
    await titleService.createTitle(
      getDefaultTitle({ title: '<italic>Cities</italic>', subtitle: 'A History', fullTitle: 'ignored' }),
      'work-id',
    );

    expect(mutation.mock.calls[0][1]).toEqual({
      data: expect.objectContaining({ fullTitle: '<italic>Cities</italic>: A History' }),
      markupFormat: MarkupFormat.JatsXml,
    });
  });
});

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

  it('rolls the attempt back when there is no title to create, since that fails the title stage too', async () => {
    const rollbackSpy = vi.fn().mockResolvedValue(undefined);
    transactions.onRollback(rollbackSpy);

    await expect(titleService.createTitles([], faker.string.uuid(), transactions)).rejects.toThrow(
      'Must have at least one title',
    );
    expect(rollbackSpy).toHaveBeenCalledOnce();
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

  it('fails the title stage when one of several titles fails, and never returns the one that was created', async () => {
    const title1 = getDefaultTitle({ id: faker.string.uuid(), title: 'Title 1' });
    const title2 = getDefaultTitle({ id: faker.string.uuid(), title: 'Title 2' });
    const workId = faker.string.uuid();
    const createdTitleId = faker.string.uuid();
    const calls: string[] = [];

    (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockImplementation(async (document, variables) => {
      if (document === DELETE_TITLE) {
        calls.push(`delete ${variables.titleId}`);

        return { deleteTitle: { titleId: variables.titleId } };
      }

      if (variables.data.title === title1.title) {
        return { createTitle: { titleId: createdTitleId, ...variables.data, subtitle: null } };
      }

      throw new Error('Second title failed');
    });

    transactions.onRollback(async () => {
      calls.push('delete work');
    });

    await expect(titleService.createTitles([title1, title2], workId, transactions)).rejects.toThrow(
      'Second title failed',
    );
    // The created title belongs to the failed attempt: it is removed before the work it was created on.
    expect(calls).toEqual([`delete ${createdTitleId}`, 'delete work']);
  });

  it('reports the first failure in plan order when several titles fail', async () => {
    const titles = ['Title 1', 'Title 2', 'Title 3'].map((title) => getDefaultTitle({ title }));

    (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockImplementation(async (document, variables) => {
      if (document === DELETE_TITLE) return { deleteTitle: { titleId: variables.titleId } };
      if (variables.data.title === 'Title 1') {
        return { createTitle: { titleId: faker.string.uuid(), ...variables.data, subtitle: null } };
      }

      // The third fails first in time, the second first in the plan.
      await new Promise((resolve) => setTimeout(resolve, variables.data.title === 'Title 2' ? 5 : 0));
      throw new Error(`${variables.data.title} failed`);
    });

    await expect(titleService.createTitles(titles, faker.string.uuid(), transactions)).rejects.toThrow(
      'Title 2 failed',
    );
  });

  it('keeps the title failure as the error when removing a created title fails too', async () => {
    const title1 = getDefaultTitle({ title: 'Title 1' });
    const title2 = getDefaultTitle({ title: 'Title 2' });

    (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockImplementation(async (document, variables) => {
      if (document === DELETE_TITLE) throw new Error('Delete title failed');
      if (variables.data.title === 'Title 1') {
        return { createTitle: { titleId: faker.string.uuid(), ...variables.data, subtitle: null } };
      }

      throw new Error('Title creation failed');
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(titleService.createTitles([title1, title2], faker.string.uuid(), transactions)).rejects.toThrow(
      'Title creation failed',
    );
    expect(consoleSpy).toHaveBeenCalledWith(new Error('Delete title failed'));
    consoleSpy.mockRestore();
  });

  it('returns every planned title only when all of them were created, each owned by the transaction', async () => {
    const titles = ['Title 1', 'Title 2'].map((title) => getDefaultTitle({ title }));
    const ids = [faker.string.uuid(), faker.string.uuid()];
    const deleted: string[] = [];

    (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockImplementation(async (document, variables) => {
      if (document === DELETE_TITLE) {
        deleted.push(variables.titleId);

        return { deleteTitle: { titleId: variables.titleId } };
      }

      return {
        createTitle: { titleId: ids[variables.data.title === 'Title 1' ? 0 : 1], ...variables.data, subtitle: null },
      };
    });

    const result = await titleService.createTitles(titles, faker.string.uuid(), transactions);

    expect(result.map(({ id }) => id)).toEqual(ids);
    expect(deleted).toEqual([]);

    // A later stage of the same work failing rolls the created titles back with everything else.
    await transactions.rollback();
    expect([...deleted].sort()).toEqual([...ids].sort());
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
