import { ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/*
  APP-IMPORT-SERIES-FRESH-01 (thoth-app#317), end to end: the real upload step, Series hook, CSV parser and contributor
  step, on a real QueryClient with the app's query defaults (only retries are off). What is replaced is the identity,
  the active publisher, translation and the services, so every Series read - the query's and the step's alike - reaches
  `getAllSerieses` below and is held until the test settles it. Both kinds of read call it with the same arguments, so
  each test says which call is which by its order.

  Audit finding R2-F-45 / vector V-33 (thoth-app#280): a file planned against a cached list proposes a Series the list
  does not hold yet, and the import creates it a second time.
*/

const { session, getAllSerieses, reads, translate } = vi.hoisted(() => {
  const reads: { publishersIds: string[]; resolve: (list: unknown[]) => void; reject: (error: Error) => void }[] = [];

  return {
    reads,
    getAllSerieses: vi.fn(
      ({ publishersIds }: { publishersIds: string[] }) =>
        new Promise<unknown[]>((resolve, reject) => {
          reads.push({ publishersIds, resolve, reject });
        }),
    ),
    /** What `useUser` returns: one object, read by both the Series hook and the upload step. */
    session: { current: {} as Record<string, unknown>, activePublisher: null as { id: string; name: string } | null },
    translate: (key: string, options?: Record<string, unknown>) =>
      options ? `${key}:${JSON.stringify(options)}` : key,
  };
});

vi.mock('@/src/entities/user', () => ({
  // eslint-disable-next-line @eslint-react/hooks-extra/no-unnecessary-use-prefix -- mocking a hook
  useUser: () => session.current,
}));

vi.mock('@/src/entities/publisher/store/hooks/usePublisherStateMachine', () => ({
  default: () => ({ activePublisher: session.activePublisher }),
}));

vi.mock('@/src/shared/hooks', () => ({
  // eslint-disable-next-line @eslint-react/hooks-extra/no-unnecessary-use-prefix -- mocking a hook
  useTypedTranslation: () => ({ t: translate }),
}));

vi.mock('@/src/shared/hooks/useTypedTranslation', () => ({
  default: () => ({ t: translate }),
}));

vi.mock('@/src/shared/context', () => ({
  // eslint-disable-next-line @eslint-react/hooks-extra/no-unnecessary-use-prefix -- mocking a hook
  useServices: () => ({ seriesService: { getAllSerieses }, contributorService: {}, institutionService: {} }),
}));

import { appConfig } from '@/src/shared/config';
import { licenseOptions, QueryKeys } from '@/src/shared/constants';
import { SeriesType } from '@/src/shared/constants/series';
import { getCsvConfig } from '@/src/shared/parsers/CSVParser/getCsvConfig';
import { theme } from '@/src/shared/theme';
import type { ImportPlan } from '@/src/shared/types';

import { UploadStep } from '../components/UploadStep';

const IMPRINT_ID = '11111111-1111-1111-1111-111111111111';
const IMPRINT_NAME = 'Arc Humanities Press';
const IMPRINT_OPTIONS = [{ value: IMPRINT_ID, label: IMPRINT_NAME }];
const ACTIVE_PUBLISHER = { id: 'pub-1', name: 'Publisher One' };

const linked = (publisherId: string, publisherName: string, imprints: { id: string; name: string }[]) => ({
  publisherId,
  publisherName,
  publisherAdmin: false,
  workLifecycle: false,
  cdnWrite: false,
  imprints: imprints.map(({ id, name }) => ({ id, name, url: '' })),
});

const PUBLISHER_ONE = linked('pub-1', 'Publisher One', [{ id: IMPRINT_ID, name: IMPRINT_NAME }]);
const PUBLISHER_TWO = linked('pub-2', 'Publisher Two', []);

const userLinkedTo = (...linkedPublishers: ReturnType<typeof linked>[]) => ({
  id: 'user-1',
  email: 'user@example.org',
  firstName: 'Test',
  lastName: 'User',
  isSuperuser: false,
  linkedPublishers,
});

/** `useUser` once `me` has settled on a user: the raw and the settled user agree. */
const settledSession = (user: ReturnType<typeof userLinkedTo>, userImprintsOptions = IMPRINT_OPTIONS) => ({
  user,
  userImprintsOptions,
  isAuthoritative: true,
  error: null,
  identitySettled: true,
  settledUser: user,
});

/** P1: the user is linked to Publisher One only. P2: Publisher Two is linked too; same user, same active publisher. */
const P1 = settledSession(userLinkedTo(PUBLISHER_ONE));
const P2 = settledSession(userLinkedTo(PUBLISHER_ONE, PUBLISHER_TWO));

/**
 * What the real `useUser` returns with an empty token (a NextAuth desync, or a sign-out not yet confirmed): the empty
 * default user, nothing authoritative, no error, and no settled identity. #285 does not treat it as identity loss,
 * because `identityChanged` needs `isAuthoritative` (`UploadStep.tsx`).
 */
const UNSETTLED = {
  user: { id: '', email: '', firstName: '', lastName: '', isSuperuser: false, linkedPublishers: [] },
  userImprintsOptions: [],
  isAuthoritative: false,
  error: null,
  identitySettled: false,
  settledUser: null,
};

const P1_KEY = [QueryKeys.allUserSerieses, 'pub-1'];
const P2_KEY = [QueryKeys.allUserSerieses, 'pub-1', 'pub-2'];

const seriesNamed = (id: string, name: string) => ({
  id,
  name,
  type: SeriesType.enum.BookSeries,
  issnPrint: '',
  issnDigital: '',
  updatedAt: '',
  imprintId: IMPRINT_ID,
  imprintName: IMPRINT_NAME,
  url: '',
  cfpUrl: '',
  description: '',
  issues: [],
});

/** The list read before the selection: it does not hold "Existing Series" yet. */
const L0 = [seriesNamed('series-other', 'Another Series')];
/** A list read after the selection, holding "Existing Series". */
const withExisting = (id: string) => [
  seriesNamed('series-other', 'Another Series'),
  seriesNamed(id, 'Existing Series'),
];

/** One row in "Existing Series", in the real template's column order. */
const buildCsv = () => {
  const headers = getCsvConfig(IMPRINT_OPTIONS, licenseOptions, translate).headers.map((header) => header.name);
  const values: Record<string, string> = {
    imprint: IMPRINT_NAME,
    work_type: 'EDITED_BOOK',
    work_status: 'FORTHCOMING',
    title: 'A Companion to Existing Things',
    series_name: 'Existing Series',
  };

  return [headers.join(','), headers.map((name) => `"${values[name] ?? ''}"`).join(',')].join('\n');
};

describe('the bulk upload plans every file against a Series list read after it was selected', () => {
  let client: QueryClient;
  let csv: File;
  const onPreview = vi.fn();

  const ui = () => (
    <QueryClientProvider client={client}>
      <ThemeProvider theme={theme}>
        <UploadStep onPreview={onPreview} />
      </ThemeProvider>
    </QueryClientProvider>
  );

  const mount = () => {
    const view = render(ui());
    return { rerender: () => view.rerender(ui()) };
  };

  /** Lets settled promises, the renders they cause and the query's own work run, so what did not happen can be asserted. */
  const flush = () =>
    act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

  const settle = async (index: number, outcome: unknown[] | Error) => {
    await act(async () => {
      if (outcome instanceof Error) reads[index].reject(outcome);
      else reads[index].resolve(outcome);
    });
    await flush();
  };

  const selectCsv = async () => {
    await userEvent.upload(document.querySelector('input[type="file"]') as HTMLInputElement, csv);
    await flush();
  };

  const readSets = () => reads.map(({ publishersIds }) => publishersIds);

  const previewButton = () => screen.queryByRole('button', { name: 'preview' });

  /** Waits for the parse to finish, asks for the preview, and returns the plan the preview received. */
  const previewedPlan = async (): Promise<ImportPlan> => {
    await userEvent.click(await screen.findByRole('button', { name: 'preview' }, { timeout: 5000 }));
    expect(onPreview).toHaveBeenCalledTimes(1);

    return onPreview.mock.calls[0][0];
  };

  /** The plan joins the Series with this id, and proposes none. */
  const expectJoins = (plan: ImportPlan, seriesId: string) => {
    expect(plan.series).toHaveLength(1);
    expect(plan.series[0].target).toEqual({ kind: 'existing', seriesId });
    expect(plan.series.some(({ target }) => target.kind === 'proposed')).toBe(false);
  };

  beforeEach(() => {
    reads.length = 0;
    getAllSerieses.mockClear();
    onPreview.mockReset();
    session.current = P1;
    session.activePublisher = ACTIVE_PUBLISHER;
    client = new QueryClient({ defaultOptions: { queries: { ...appConfig.query, retry: false } } });
    csv = new File([buildCsv()], 'series.csv', { type: 'text/csv' });
  });

  afterEach(() => {
    cleanup();
    client.clear();
    // Nothing the step made is left pending.
    reads.forEach(({ resolve }) => resolve([]));
  });

  it('E-1: with a fresh cached list, waits for a read made after the selection and joins the Series it returns', async () => {
    client.setQueryData(P1_KEY, L0);
    mount();
    await flush();
    // Latched on the fresh cached list: no read yet, and nothing to wait for.
    expect(reads).toHaveLength(0);
    expect(screen.queryByTestId('upload-session-loading')).not.toBeInTheDocument();

    await selectCsv();

    // Call 0: the step's read for this selection (the query has nothing to re-read).
    expect(reads).toHaveLength(1);
    expect(readSets()).toEqual([['pub-1']]);
    expect(previewButton()).not.toBeInTheDocument();
    expect(screen.getByTestId('upload-session-loading')).toBeInTheDocument();

    await settle(0, withExisting('series-existing'));

    expectJoins(await previewedPlan(), 'series-existing');
    expect(client.getQueryData(P1_KEY)).toBe(L0);
    expect(reads).toHaveLength(1);
  });

  it('E-2: reopened after a failed import, parses on its own read, never on the list the query re-reads', async () => {
    client.setQueryData(P1_KEY, L0);
    // Exactly what `useBulkCreateWorks.onSettled` does once an import settles, failed or not.
    await client.invalidateQueries({ queryKey: [QueryKeys.allUserSerieses] });
    mount();
    await flush();
    // Call 0: the query's re-read of the invalidated list, still pending.
    expect(readSets()).toEqual([['pub-1']]);

    await selectCsv();

    // Call 1: the step's read for this selection.
    expect(reads).toHaveLength(2);
    expect(readSets()).toEqual([['pub-1'], ['pub-1']]);
    expect(previewButton()).not.toBeInTheDocument();

    await settle(0, L0);
    expect(previewButton()).not.toBeInTheDocument();
    expect(screen.getByTestId('upload-session-loading')).toBeInTheDocument();

    await settle(1, withExisting('series-existing'));

    expectJoins(await previewedPlan(), 'series-existing');
    expect(reads).toHaveLength(2);
  });

  it('E-3: with nothing cached, reads again after the query first settles, and parses on that read', async () => {
    mount();
    await flush();
    // Call 0: the query's first read, still pending.
    expect(readSets()).toEqual([['pub-1']]);
    expect(screen.getByTestId('upload-session-loading')).toBeInTheDocument();

    await selectCsv();
    expect(reads).toHaveLength(1);

    await settle(0, L0);

    // Call 1: the step's read, made once the step latched, after the selection.
    expect(reads).toHaveLength(2);
    expect(readSets()).toEqual([['pub-1'], ['pub-1']]);
    expect(previewButton()).not.toBeInTheDocument();

    await settle(1, withExisting('series-existing'));

    expectJoins(await previewedPlan(), 'series-existing');
    expect(reads).toHaveLength(2);
  });

  it.each(['resolves', 'rejects'])(
    'E-4: reads again when the linked publishers change while it waits, and drops the earlier read, which %s',
    async (earlier) => {
      client.setQueryData(P1_KEY, L0);
      client.setQueryData(P2_KEY, withExisting('series-p2-cached'));
      const { rerender } = mount();
      await flush();

      await selectCsv();
      // Call 0: the step's read with P1.
      expect(readSets()).toEqual([['pub-1']]);

      session.current = P2;
      rerender();
      await flush();

      // Call 1: the step's read with P2. P2's cached list is fresh, so the query reads nothing.
      expect(readSets()).toEqual([['pub-1'], ['pub-1', 'pub-2']]);

      await settle(0, earlier === 'resolves' ? withExisting('series-p1-read') : new Error('P1 read failed'));
      expect(previewButton()).not.toBeInTheDocument();
      expect(screen.queryByTestId('upload-session-unavailable')).not.toBeInTheDocument();
      expect(screen.getByTestId('upload-session-loading')).toBeInTheDocument();

      await settle(1, withExisting('series-p2-read'));

      expectJoins(await previewedPlan(), 'series-p2-read');
      expect(reads).toHaveLength(2);
    },
  );

  it('E-5: when the linked publishers change back, parses only on the third read, dropping both earlier results', async () => {
    client.setQueryData(P1_KEY, L0);
    client.setQueryData(P2_KEY, withExisting('series-p2-cached'));
    const { rerender } = mount();
    await flush();

    await selectCsv();
    session.current = P2;
    rerender();
    await flush();
    session.current = P1;
    rerender();
    await flush();

    // Calls 0, 1 and 2: the step's reads with P1, P2 and P1 again. Both cached lists are fresh: the query reads nothing.
    expect(readSets()).toEqual([['pub-1'], ['pub-1', 'pub-2'], ['pub-1']]);

    await settle(0, withExisting('series-p1-first'));
    expect(previewButton()).not.toBeInTheDocument();

    await settle(2, withExisting('series-p1-third'));
    await screen.findByRole('button', { name: 'preview' }, { timeout: 5000 });

    await settle(1, withExisting('series-p2-read'));

    expectJoins(await previewedPlan(), 'series-p1-third');
    expect(reads).toHaveLength(3);
  });

  it('E-6: a failed read parses nothing and says so; choosing the file again reads again and parses on that read', async () => {
    client.setQueryData(P1_KEY, L0);
    mount();
    await flush();

    await selectCsv();
    await settle(0, new Error('Series read failed'));

    expect(screen.getByTestId('upload-session-unavailable')).toBeInTheDocument();
    expect(screen.queryByTestId('upload-session-loading')).not.toBeInTheDocument();
    expect(previewButton()).not.toBeInTheDocument();
    expect(onPreview).not.toHaveBeenCalled();
    expect(reads).toHaveLength(1);

    await selectCsv();

    expect(reads).toHaveLength(2);
    expect(screen.getByTestId('upload-session-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('upload-session-unavailable')).not.toBeInTheDocument();

    await settle(1, withExisting('series-existing'));

    expectJoins(await previewedPlan(), 'series-existing');
  });

  it('E-7: a settled user with no linked publishers reads no Series at all, and the parse runs as before', async () => {
    session.current = settledSession(userLinkedTo(), []);
    session.activePublisher = null;
    mount();
    await flush();

    await selectCsv();

    // With no imprints the parse stops at #284's imprint check, which says why.
    expect(
      await screen.findByText(/importImprint\.noActivePublisher/, undefined, { timeout: 5000 }),
    ).toBeInTheDocument();
    await flush();
    expect(getAllSerieses).not.toHaveBeenCalled();
  });

  it('E-8 (a): a read that resolves while the session is out of step is dropped, and settling reads once more', async () => {
    client.setQueryData(P1_KEY, L0);
    const { rerender } = mount();
    await flush();

    await selectCsv();
    // Call 0: the step's read with P1.
    expect(readSets()).toEqual([['pub-1']]);

    session.current = UNSETTLED;
    rerender();
    await flush();
    await settle(0, withExisting('series-dropped'));

    expect(previewButton()).not.toBeInTheDocument();
    expect(screen.getByTestId('upload-session-loading')).toBeInTheDocument();
    expect(reads).toHaveLength(1);

    session.current = P1;
    rerender();
    await flush();

    // Call 1: the step's read on settling. P1's cached list is still fresh, so the query reads nothing.
    expect(readSets()).toEqual([['pub-1'], ['pub-1']]);

    await settle(1, withExisting('series-existing'));

    expectJoins(await previewedPlan(), 'series-existing');
    expect(reads.every(({ publishersIds }) => publishersIds.length > 0)).toBe(true);
  });

  it('E-8 (b): a file chosen while the session is out of step reads nothing until it settles, then reads once', async () => {
    client.setQueryData(P1_KEY, L0);
    const { rerender } = mount();
    await flush();

    session.current = UNSETTLED;
    rerender();
    await flush();
    await selectCsv();

    expect(reads).toHaveLength(0);
    expect(previewButton()).not.toBeInTheDocument();
    expect(screen.getByTestId('upload-session-loading')).toBeInTheDocument();

    session.current = P1;
    rerender();
    await flush();

    // Call 0: the step's read on settling.
    expect(readSets()).toEqual([['pub-1']]);

    await settle(0, withExisting('series-existing'));

    expectJoins(await previewedPlan(), 'series-existing');
    expect(reads.every(({ publishersIds }) => publishersIds.length > 0)).toBe(true);
  });
});
