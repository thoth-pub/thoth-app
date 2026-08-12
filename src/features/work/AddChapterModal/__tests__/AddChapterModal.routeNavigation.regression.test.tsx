/* eslint-disable @eslint-react/no-context-provider -- xstate + Next contexts are rendered via their real providers */
/**
 * ROUTE-LEVEL regression coverage for GitHub issue #93 (APP-CHAPTER-01).
 *
 * The sibling file `AddChapterModal.parentWork.regression.test.tsx` proves the *downstream*
 * invariant: given a correct `workId` prop, AddChapterModal always attaches chapters to that
 * Work. It does NOT exercise how the dynamic route id is obtained and propagated, because it
 * mounts AddChapterModal directly and models navigation with a local `setWorkId` state swap.
 *
 * This file closes that gap. It exercises the REAL Next.js navigation surface:
 *
 *   next/navigation useParams()/usePathname()/useRouter()   (the real hooks — NOT mocked)
 *     └─ real AppRouter / Pathname / PathParams contexts, driven by a functional router
 *        with a genuine history stack (push / back / forward)
 *        └─ WorkRouteView reads the dynamic id from useParams() (standing in for the server
 *           WorkPage's `params` read) and propagates it as a prop, exactly as production does
 *           └─ EditWorkWidget (real)  →  EditWorkChapters (real)  →  AddChapterModal (real)
 *              →  useBulkCreateWorkChapters (real)  →  WorkService.createChapter (real)
 *                 →  CreateWorkRelation  (captured at the GraphQL transport boundary)
 *
 * The real StoreProvider (all XState machine providers) is mounted, so the global provider
 * environment is present during navigation. Only the network transport (GraphqlService) and
 * leaf UI editors unrelated to chapters are stubbed.
 *
 * Honest scope of what is and is not real (do not overclaim):
 *   REAL   — Next's useParams/usePathname/useRouter hooks and their contexts; router.back()/
 *            forward() history semantics; the EditWorkWidget→EditWorkChapters→AddChapterModal
 *            production hierarchy; useWork/useWorkChapters React Query; the XState stores and
 *            all machine providers; the exact CreateWorkRelation mutation variables.
 *   MODELLED (needs a real browser + running server, e.g. Playwright, to cover fully) —
 *            the RSC server render of WorkPage, Next's client navigation reducer, and the
 *            browser History engine. Here a functional test router feeds the real contexts
 *            the same pathname/params sequence those layers would produce.
 *   STUBBED — RouteChangeHandler stays at its repo-wide no-op mock (see the note below on the
 *            circular import that blocks mounting the real one); it is orthogonal to parentage.
 *
 * Reconciliation note: navigating between two ids of the same dynamic segment re-renders the
 * parent with a new prop, so React reuses the AddChapterModal instance (state-preserving).
 * This harness demonstrates that reuse under prop change; a real remount would only be safer.
 */

import { ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import {
  PathnameContext,
  PathParamsContext,
  SearchParamsContext,
} from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import { useParams, usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import StoreProvider from '@/app/store';
import { RelationType, WorkStatus, WorkType } from '@/gql/graphql';
import { TitleService } from '@/src/entities/title/api/title.service';
import { CREATE_TITLE } from '@/src/entities/title/model/title.mutations';
import { WorkService } from '@/src/entities/work/api/work.service';
import { CREATE_WORK } from '@/src/entities/work/model/work.mutations';
import { CREATE_WORK_RELATION } from '@/src/entities/work/model/work.schema';
import { QueryKeys } from '@/src/shared/constants';
import { theme } from '@/src/shared/theme';
import { getDefaultTitle, getDefaultWork } from '@/src/shared/utils';
import { EditWorkWidget } from '@/src/widgets';

// ---------------------------------------------------------------------------
// `next/navigation` is left UNMOCKED here — the real useParams/usePathname/useRouter hooks
// read the contexts this file provides.
//
// RouteChangeHandler stays at its repo-wide setup mock (a no-op). It cannot be mounted in this
// jsdom harness: RouteChangeHandler imports every entity store, and the `@/src/shared/store`
// barrel re-exports RouteChangeHandler BEFORE storeFactory, so evaluating the real module mid
// barrel-init makes `createEntityStateMachine` undefined (a pre-existing circular import that
// only the setup mock breaks; Next's build tolerates it). Mounting it would require reordering
// production code, which is out of scope for #93. It is also orthogonal to the invariant under
// test: RouteChangeHandler only resets edit-form state machines on pathname change, while the
// chapter parent is derived from the route id (useParams) and threaded as a prop — it never
// flows through those machines. The real StoreProvider (all machine providers) IS mounted.
// ---------------------------------------------------------------------------

// jsdom does not implement matchMedia; the real widget tree (react-use) needs it.
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

const BOOK_A_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const BOOK_B_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const worksPath = (id: string) => `/admin/works/${id}`;

// Translations stubbed at the react-i18next boundary (the real config imports markdown assets
// Vite cannot transform). Keys used for accessible-name queries are mapped to natural labels.
const TRANSLATIONS: Record<string, string> = {
  'actions.addNewChapter': 'Add New Chapter',
  'actions.create': 'Create',
};

vi.mock('react-i18next', () => ({
  useTranslation: vi.fn(() => ({
    t: (key: string) => TRANSLATIONS[key] ?? key,
    i18n: { language: 'en', changeLanguage: () => Promise.resolve() },
  })),
  Trans: ({ children }: { children: React.ReactNode }) => children,
  I18nextProvider: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

// EditWorkWidget's gating hooks: return imprints for BOTH books so its ownership guard never
// redirects, and grant edit permissions. Everything else in these barrels stays real.
vi.mock('@/src/entities/user', async (importActual) => ({
  ...(await importActual<typeof import('@/src/entities/user')>()),
  useUser: vi.fn(() => ({
    userImprintsOptions: [
      { value: `imprint-${BOOK_A_ID}`, label: 'Imprint A' },
      { value: `imprint-${BOOK_B_ID}`, label: 'Imprint B' },
    ],
    loading: false,
  })),
}));

vi.mock('@/src/entities/publisher', async (importActual) => ({
  ...(await importActual<typeof import('@/src/entities/publisher')>()),
  useActivePublisherPermissions: vi.fn(() => ({
    isStatusEditable: true,
    isPublicationDateEditable: true,
    isWithdrawnDateEditable: true,
  })),
}));

// Keep useWork / useWorkChapters / WorkStateMachineContext real; stub only the header UI.
vi.mock('@/src/entities/work', async (importActual) => ({
  ...(await importActual<typeof import('@/src/entities/work')>()),
  EditWorkHeader: () => null,
}));

// Stub sibling editors unrelated to chapter parentage; keep AddChapterModal (imported by
// EditWorkChapters from a direct path) and everything else real.
vi.mock('@/src/features', async (importActual) => ({
  ...(await importActual<typeof import('@/src/features')>()),
  EditBasicDetails: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  EditContributors: () => null,
  EditDescriptions: () => null,
  EditFundings: () => null,
  WorkSpeedDial: () => null,
  EditChapterModal: () => null,
  EditChaptersModal: () => null,
}));

vi.mock('@/src/features/work/EditPublications/EditPublications', () => ({ default: () => null }));
vi.mock('@/src/features/work/EditReferences/EditReferences', () => ({ default: () => null }));
vi.mock('@/src/features/work/EditWorkSeries/EditWorkSeries', () => ({ default: () => null }));
vi.mock('@/src/widgets/EditWorkMarketing/EditWorkMarketing', () => ({ default: () => null }));
vi.mock('@/src/widgets/EditWorkResources/EditWorkResources', () => ({ default: () => null }));

// ---------------------------------------------------------------------------
// Fake GraphQL transport (only the network boundary is mocked). Real WorkService/TitleService
// run on top, so the exact CreateWorkRelation variables the app would send are observable.
// ---------------------------------------------------------------------------
type RelationInput = {
  relatorWorkId: string;
  relatedWorkId: string;
  relationOrdinal: number;
  relationType: RelationType;
};

function createFakeGraphql() {
  const relationCalls: RelationInput[] = [];
  let workSeq = 0;

  const query = vi.fn(async () => ({ work: { relations: [] } }));

  const mutation = vi.fn(async (document: unknown, variables: { data?: Record<string, unknown> }) => {
    const data = variables?.data ?? {};

    if (document === CREATE_WORK) {
      workSeq += 1;
      return { createWork: { workId: `chapter-${workSeq}`, pageBreakdown: 'I+1+I' } };
    }

    if (document === CREATE_TITLE) {
      return {
        createTitle: {
          titleId: `title-${workSeq}`,
          canonical: true,
          localeCode: data.localeCode ?? 'EN',
          subtitle: data.subtitle ?? null,
          title: data.title ?? 'New chapter',
        },
      };
    }

    if (document === CREATE_WORK_RELATION) {
      relationCalls.push(data as RelationInput);
      return { createWorkRelation: { workRelationId: `relation-${relationCalls.length}` } };
    }

    return {};
  });

  return { graphqlService: { query, mutation } as never, relationCalls };
}

function createWorkService(graphqlService: never) {
  const stub = {} as never;
  return new WorkService({
    graphqlService,
    fundingService: stub,
    subjectService: stub,
    contributionService: stub,
    publicationService: stub,
    languageService: stub,
    seriesService: stub,
    referenceService: stub,
    titleService: new TitleService(graphqlService),
    abstractService: stub,
  });
}

const hoisted = vi.hoisted(() => ({ services: { current: null as unknown } }));

vi.mock('@/src/shared/context/servicesContext', () => ({
  useServices: vi.fn(() => hoisted.services.current),
  ServicesProvider: ({ children }: { children: React.ReactNode }) => children,
}));

let fake: ReturnType<typeof createFakeGraphql>;
let queryClient: QueryClient;

function seedBook(id: string) {
  const book = getDefaultWork({
    id,
    status: WorkStatus.Forthcoming,
    type: WorkType.EditedBook,
    imprintId: `imprint-${id}`,
    titles: [getDefaultTitle({ canonical: true, title: `Book ${id}`, fullTitle: `Book ${id}` })],
  });

  queryClient.setQueryData([QueryKeys.work, id], book);
  queryClient.setQueryData([QueryKeys.workChapters, id], []);
}

beforeEach(() => {
  vi.clearAllMocks();
  fake = createFakeGraphql();
  hoisted.services.current = {
    workService: createWorkService(fake.graphqlService),
    notificationService: {
      sendSuccessNotification: vi.fn(),
      sendErrorNotification: vi.fn(),
      sendWarningNotification: vi.fn(),
      sendProgressNotification: vi.fn(),
      dismissNotification: vi.fn(),
    },
    contributionService: {},
  };
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity, gcTime: Infinity } },
  });
  seedBook(BOOK_A_ID);
  seedBook(BOOK_B_ID);
});

afterEach(() => {
  cleanup();
  queryClient.clear();
});

// ---------------------------------------------------------------------------
// Functional Next App Router backed by a real history stack. push/back/forward mutate the
// stack + index and feed the REAL Pathname/PathParams/AppRouter contexts, which the REAL
// next/navigation hooks read. This is genuine routing state, not a workId prop swap.
// ---------------------------------------------------------------------------
type TestRouter = {
  push: (url: string) => void;
  replace: (url: string) => void;
  back: () => void;
  forward: () => void;
  refresh: () => void;
  prefetch: () => void;
};

function idFromUrl(url: string) {
  return url.split('/').filter(Boolean).pop() ?? '';
}

function TestAppRouter({
  initialId,
  onRouter,
  children,
}: {
  initialId: string;
  onRouter: (r: TestRouter) => void;
  children: React.ReactNode;
}) {
  const [history, setHistory] = useState<string[]>([initialId]);
  const [index, setIndex] = useState(0);

  const currentId = history[index];
  const pathname = worksPath(currentId);
  const params = useMemo(() => ({ id: [currentId] }), [currentId]);
  const searchParams = useMemo(() => new URLSearchParams(), []);

  const router = useMemo<TestRouter>(
    () => ({
      push: (url) => {
        const id = idFromUrl(url);
        setHistory((h) => [...h.slice(0, index + 1), id]);
        setIndex(index + 1);
      },
      replace: (url) => {
        const id = idFromUrl(url);
        setHistory((h) => {
          const next = [...h];
          next[index] = id;
          return next;
        });
      },
      back: () => setIndex(Math.max(0, index - 1)),
      forward: () => setIndex((i) => Math.min(history.length - 1, i + 1)),
      refresh: () => {},
      prefetch: () => {},
    }),
    [index, history.length],
  );

  useEffect(() => {
    onRouter(router);
  }, [router, onRouter]);

  return (
    <AppRouterContext.Provider value={router as never}>
      <PathnameContext.Provider value={pathname}>
        <PathParamsContext.Provider value={params}>
          <SearchParamsContext.Provider value={searchParams}>{children}</SearchParamsContext.Provider>
        </PathParamsContext.Provider>
      </PathnameContext.Provider>
    </AppRouterContext.Provider>
  );
}

// Reads the dynamic route id via the REAL useParams() (WorkPage's `params` read in production)
// and propagates it as a prop through the real widget hierarchy.
function WorkRouteView() {
  const params = useParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : (params.id ?? '');
  return <EditWorkWidget workId={id} />;
}

// A probe that reports the active route/work from the REAL routing hooks, for assertions.
function RouteProbe() {
  const pathname = usePathname();
  const params = useParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : (params.id ?? '');
  return <div data-testid="route-probe" data-pathname={pathname} data-workid={id} />;
}

function renderRoute(initialId: string) {
  const routerRef: { current: TestRouter | null } = { current: null };
  const onRouter = (r: TestRouter) => {
    routerRef.current = r;
  };

  render(
    <TestAppRouter initialId={initialId} onRouter={onRouter}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <StoreProvider>
            <RouteProbe />
            <WorkRouteView />
          </StoreProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </TestAppRouter>,
  );

  return {
    router: () => {
      if (!routerRef.current) throw new Error('router not ready');
      return routerRef.current;
    },
  };
}

const activeWorkId = () => screen.getByTestId('route-probe').getAttribute('data-workid');
const activePathname = () => screen.getByTestId('route-probe').getAttribute('data-pathname');

async function addChapterOnActiveWork(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /add new chapter/i }));
  await screen.findByRole('button', { name: /^create$/i });
  await user.click(screen.getByRole('button', { name: /^create$/i }));
}

describe('AddChapterModal – real route navigation boundary (issue #93)', () => {
  it('BACK/FORWARD: A -> B -> back(A) -> forward(B), then create; relation parent is B', async () => {
    const user = userEvent.setup();
    const { router } = renderRoute(BOOK_A_ID);

    // Editing Book A.
    expect(activePathname()).toBe(worksPath(BOOK_A_ID));
    expect(activeWorkId()).toBe(BOOK_A_ID);
    await screen.findByRole('button', { name: /add new chapter/i });

    // Client-side navigate to Book B via the real router.
    await act(async () => {
      router().push(worksPath(BOOK_B_ID));
    });
    expect(activePathname()).toBe(worksPath(BOOK_B_ID));
    expect(activeWorkId()).toBe(BOOK_B_ID);

    // Browser Back to A.
    await act(async () => {
      router().back();
    });
    expect(activeWorkId()).toBe(BOOK_A_ID);

    // Browser Forward to B.
    await act(async () => {
      router().forward();
    });
    expect(activeWorkId()).toBe(BOOK_B_ID);

    // Create a chapter while B is the active route/work.
    await addChapterOnActiveWork(user);
    await waitFor(() => expect(fake.relationCalls).toHaveLength(1));

    expect(fake.relationCalls[0].relatedWorkId).toBe(BOOK_B_ID);
    expect(fake.relationCalls[0].relatedWorkId).not.toBe(BOOK_A_ID);
    expect(fake.relationCalls[0].relationType).toBe(RelationType.IsChildOf);
  });

  it('DIRECT A -> B: client-navigate then create; relation parent is B, never A', async () => {
    const user = userEvent.setup();
    const { router } = renderRoute(BOOK_A_ID);

    await screen.findByRole('button', { name: /add new chapter/i });

    await act(async () => {
      router().push(worksPath(BOOK_B_ID));
    });
    expect(activeWorkId()).toBe(BOOK_B_ID);

    await addChapterOnActiveWork(user);
    await waitFor(() => expect(fake.relationCalls).toHaveLength(1));

    expect(fake.relationCalls[0].relatedWorkId).toBe(BOOK_B_ID);
    expect(fake.relationCalls.every((call) => call.relatedWorkId !== BOOK_A_ID)).toBe(true);
  });

  it('CONTROL: creating on the initial route A attaches the chapter to A', async () => {
    const user = userEvent.setup();
    renderRoute(BOOK_A_ID);

    await screen.findByRole('button', { name: /add new chapter/i });
    expect(activeWorkId()).toBe(BOOK_A_ID);

    await addChapterOnActiveWork(user);
    await waitFor(() => expect(fake.relationCalls).toHaveLength(1));

    expect(fake.relationCalls[0].relatedWorkId).toBe(BOOK_A_ID);
  });
});
