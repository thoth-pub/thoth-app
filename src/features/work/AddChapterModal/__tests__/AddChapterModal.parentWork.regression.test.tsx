/* eslint-disable @eslint-react/no-context-provider -- xstate actor contexts must be rendered via `.Provider` */
/**
 * Regression coverage for GitHub issue #93 (APP-CHAPTER-01):
 * "wrong parent Work ID during chapter creation".
 *
 * A publisher reported that chapters belonging to an unpublished book were genuinely
 * persisted as children of *older* books. The bad data was the WorkRelation itself, not a
 * rendering artefact. These tests reproduce the client-side chapter-creation path at the
 * highest practical integration level and assert the EXACT parent UUID that reaches the
 * GraphQL `CreateWorkRelation` mutation — not merely what the UI displays.
 *
 * What is real here (the behaviour under investigation):
 *   AddChapterModal (real)
 *     -> useBulkCreateWorkChapters (real)
 *       -> WorkService.createChapter (real)
 *         -> WorkService.createWork  -> graphqlService.mutation(CREATE_WORK / CREATE_TITLE)
 *         -> WorkService.createWorkRelation -> graphqlService.mutation(CREATE_WORK_RELATION)
 *   useWork / useWorkChapters (real, React Query), the XState work/contribution stores (real).
 *
 * The ONLY thing mocked is the network transport (`GraphqlService`), which is the closest
 * authoritative request boundary in the app. Every `CreateWorkRelation` variable set is
 * captured verbatim, so a test fails if the previously viewed Work ID — or any other wrong
 * UUID — is substituted for the parent.
 *
 * Navigation model: in the Next.js App Router, navigating between `/admin/works/A` and
 * `/admin/works/B` (same dynamic segment) re-renders the page subtree with a new `workId`
 * prop WITHOUT remounting the client component tree — React reconciles by type/position, so
 * `AddChapterModal`'s local state (e.g. an open modal) survives the navigation. We model that
 * faithfully by keeping the component instance mounted and changing its `workId` prop, which
 * is the adversarial (state-preserving) case a remount would only make safer.
 */

import { ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RelationType, WorkStatus, WorkType } from '@/gql/graphql';
import { ContributionStateMachineContext } from '@/src/entities/contribution';
import { TitleService } from '@/src/entities/title/api/title.service';
import { CREATE_TITLE } from '@/src/entities/title/model/title.mutations';
import { WorkStateMachineContext } from '@/src/entities/work';
import { WorkService } from '@/src/entities/work/api/work.service';
import { CREATE_WORK } from '@/src/entities/work/model/work.mutations';
import { CREATE_WORK_RELATION } from '@/src/entities/work/model/work.schema';
import { QueryKeys } from '@/src/shared/constants';
import { theme } from '@/src/shared/theme';
import { getDefaultTitle, getDefaultWork } from '@/src/shared/utils';

import AddChapterModal from '../AddChapterModal';

// AddChapterModal -> useWork pulls in hooks that call next/navigation's useRouter, which
// requires a mounted App Router. Stub the router surface used by the work hooks.
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  })),
  usePathname: vi.fn(() => '/admin/works/test'),
  useParams: vi.fn(() => ({})),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

// The real i18n config imports markdown resources that Vite/Vitest cannot transform, so
// translations are stubbed at the react-i18next boundary (keys are returned verbatim). This
// keeps the data path under investigation fully real while avoiding the asset-loader chain.
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

// ---------------------------------------------------------------------------
// Two clearly distinct Works. If a chapter is ever attached to the wrong book,
// the captured relation's relatedWorkId will not equal the book that was active
// at submit time.
// ---------------------------------------------------------------------------
const BOOK_A_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const BOOK_B_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

type RelationInput = {
  relatorWorkId: string;
  relatedWorkId: string;
  relationOrdinal: number;
  relationType: RelationType;
};

// ---------------------------------------------------------------------------
// Fake GraphQL transport. Real WorkService/TitleService run on top of it, so the
// exact mutation variables the app would send over the wire are observable.
// ---------------------------------------------------------------------------
function createFakeGraphql() {
  const relationCalls: RelationInput[] = [];
  const createdChapterIds: string[] = [];
  let workSeq = 0;

  // Deterministic race control: block the next CREATE_WORK until released. No timers.
  let gate: { promise: Promise<void>; release: () => void } | null = null;

  const query = vi.fn(async (_document: unknown, _variables: unknown) => {
    // getWork / getWorkChapters are served from the seeded React Query cache, but a
    // background refetch may still call through; return empty relations either way.
    return { work: { relations: [] } };
  });

  const mutation = vi.fn(async (document: unknown, variables: { data?: Record<string, unknown> }) => {
    const data = variables?.data ?? {};

    if (document === CREATE_WORK) {
      workSeq += 1;
      const id = `chapter-${workSeq}`;
      createdChapterIds.push(id);

      if (gate) {
        const current = gate;
        gate = null;
        await current.promise;
      }

      // pageBreakdown uses roman numerals so the mapper's roman conversion stays quiet.
      return { createWork: { workId: id, pageBreakdown: 'I+1+I' } };
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

  return {
    graphqlService: { query, mutation } as never,
    relationCalls,
    createdChapterIds,
    blockNextCreateWork() {
      let release!: () => void;
      const promise = new Promise<void>((resolve) => {
        release = resolve;
      });
      gate = { promise, release };
      return () => release();
    },
  };
}

// A real WorkService wired to the fake transport. Only titleService is exercised for a
// single-title chapter; the remaining collaborators are never invoked for the default
// chapter payload (empty subjects/fundings/contributions/etc.), so lightweight stubs are
// faithful for the code path under test.
function createWorkService(graphqlService: never) {
  const titleService = new TitleService(graphqlService);
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
    titleService,
    abstractService: stub,
  });
}

// ---------------------------------------------------------------------------
// useServices is replaced with a per-test holder so the real WorkService (fake
// transport) is used by AddChapterModal, useWork, useWorkChapters and the bulk hook.
// ---------------------------------------------------------------------------
const hoisted = vi.hoisted(() => ({ services: { current: null as unknown } }));

vi.mock('@/src/shared/context/servicesContext', () => ({
  useServices: vi.fn(() => hoisted.services.current),
  ServicesProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const notificationServiceStub = {
  sendSuccessNotification: vi.fn(),
  sendErrorNotification: vi.fn(),
  sendWarningNotification: vi.fn(),
  sendProgressNotification: vi.fn(),
  dismissNotification: vi.fn(),
};

let fake: ReturnType<typeof createFakeGraphql>;
let queryClient: QueryClient;

function seedBook(id: string, titleText: string) {
  // Real WorkEntity shape (a book with one canonical title) seeded into the cache so
  // useWork/useWorkChapters resolve synchronously and the flow is deterministic.
  const book = getDefaultWork({
    id,
    status: WorkStatus.Forthcoming,
    type: WorkType.EditedBook,
    imprintId: `imprint-${id}`,
    titles: [getDefaultTitle({ canonical: true, title: titleText, fullTitle: titleText })],
  });

  queryClient.setQueryData([QueryKeys.work, id], book);
  queryClient.setQueryData([QueryKeys.workChapters, id], []);
}

beforeEach(() => {
  vi.clearAllMocks();
  fake = createFakeGraphql();
  hoisted.services.current = {
    workService: createWorkService(fake.graphqlService),
    notificationService: notificationServiceStub,
    contributionService: {},
  };
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity, gcTime: Infinity } },
  });
  seedBook(BOOK_A_ID, 'Book A');
  seedBook(BOOK_B_ID, 'Book B');
});

afterEach(() => {
  cleanup();
  queryClient.clear();
});

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        {/* xstate's createActorContext exposes a `.Provider`; it is not a React context that
            can be rendered directly, so the no-context-provider rule is disabled below. */}
        <WorkStateMachineContext.Provider>
          <ContributionStateMachineContext.Provider>{children}</ContributionStateMachineContext.Provider>
        </WorkStateMachineContext.Provider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

// Models client-side navigation: the same AddChapterModal instance stays mounted while its
// workId prop changes (see navigation model note at the top of the file). The active-Work
// setter is handed back to the test via `register` so navigation can be driven imperatively.
type Nav = { go: (workId: string) => void };

function NavigableModal({ register, initialWorkId }: { register: (go: Nav['go']) => void; initialWorkId: string }) {
  const [workId, setWorkId] = useState(initialWorkId);

  useEffect(() => {
    register(setWorkId);
  }, [register]);

  return <AddChapterModal workId={workId} />;
}

/** Creates a Nav handle plus the `register` prop that binds it to a mounted NavigableModal. */
function createNav() {
  const nav: Nav = { go: () => {} };
  const register = (go: Nav['go']) => {
    nav.go = go;
  };
  return { nav, register };
}

// ---------------------------------------------------------------------------
// UI helpers (queried by role/accessible name, not by brittle visual details).
// ---------------------------------------------------------------------------
const openAddChapter = (scope: { getByRole: typeof screen.getByRole } = screen) =>
  scope.getByRole('button', { name: /add new chapter/i });

const createButton = () => screen.getByRole('button', { name: /^create$/i });

async function openModalAndSubmit(user: ReturnType<typeof userEvent.setup>, chapterCount?: number) {
  await user.click(openAddChapter());
  // The create control lives in the modal (rendered via a portal into document.body).
  await screen.findByRole('button', { name: /^create$/i });

  if (chapterCount !== undefined) {
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: String(chapterCount) } });
  }

  await user.click(createButton());
}

/** Waits until exactly `expected` relation mutations have been captured. */
async function waitForRelationCount(expected: number) {
  await waitFor(() => expect(fake.relationCalls).toHaveLength(expected));
}

describe('AddChapterModal – parent Work ID integrity (issue #93)', () => {
  // Scenario 1
  it('CLIENT NAVIGATION A -> B: chapter submitted on B is a child of B, never A', async () => {
    const user = userEvent.setup();
    const { nav, register } = createNav();

    render(
      <Providers>
        <NavigableModal register={register} initialWorkId={BOOK_A_ID} />
      </Providers>,
    );

    // Client-side navigation A -> B without a remount.
    await act(async () => {
      nav.go(BOOK_B_ID);
    });

    await openModalAndSubmit(user);
    await waitForRelationCount(1);

    expect(fake.relationCalls[0].relatedWorkId).toBe(BOOK_B_ID);
    expect(fake.relationCalls[0].relationType).toBe(RelationType.IsChildOf);
    expect(fake.relationCalls.every((call) => call.relatedWorkId !== BOOK_A_ID)).toBe(true);
  });

  // Scenario 2
  it('CACHED A -> B: previously cached Book A data cannot leak into a chapter created on B', async () => {
    const user = userEvent.setup();
    const { nav, register } = createNav();

    render(
      <Providers>
        <NavigableModal register={register} initialWorkId={BOOK_A_ID} />
      </Providers>,
    );

    // Prime Book A's work + chapter React Query state by opening (then leaving) its modal.
    await user.click(openAddChapter());
    await screen.findByRole('button', { name: /^create$/i });
    expect(queryClient.getQueryData([QueryKeys.work, BOOK_A_ID])).toBeDefined();

    await act(async () => {
      nav.go(BOOK_B_ID);
    });

    await user.click(createButton());
    await waitForRelationCount(1);

    expect(fake.relationCalls[0].relatedWorkId).toBe(BOOK_B_ID);
    expect(fake.relationCalls[0].relatedWorkId).not.toBe(BOOK_A_ID);
  });

  // Scenario 3
  it('MODAL OPEN DURING ROUTE CHANGE: a modal opened on A rebinds to B and submits B, not A', async () => {
    const user = userEvent.setup();
    const { nav, register } = createNav();

    render(
      <Providers>
        <NavigableModal register={register} initialWorkId={BOOK_A_ID} />
      </Providers>,
    );

    // Open Add Chapter while editing A...
    await user.click(openAddChapter());
    await screen.findByRole('button', { name: /^create$/i });

    // ...then change the active Work to B before submitting.
    await act(async () => {
      nav.go(BOOK_B_ID);
    });

    // Invariant: the UI must not appear to edit B while submitting A. Current architecture
    // keeps the open modal bound to the live workId prop, so submission targets B.
    await user.click(createButton());
    await waitForRelationCount(1);

    expect(fake.relationCalls[0].relatedWorkId).toBe(BOOK_B_ID);
    expect(fake.relationCalls.some((call) => call.relatedWorkId === BOOK_A_ID)).toBe(false);
  });

  // Scenario 4
  it('DELAYED NETWORK: navigating A -> B mid-flight does not retarget an in-flight A submission', async () => {
    const user = userEvent.setup();
    const { nav, register } = createNav();

    render(
      <Providers>
        <NavigableModal register={register} initialWorkId={BOOK_A_ID} />
      </Providers>,
    );

    // Block the chapter's CREATE_WORK so the operation is genuinely in flight.
    const release = fake.blockNextCreateWork();

    await user.click(openAddChapter());
    await screen.findByRole('button', { name: /^create$/i });
    await user.click(createButton());

    // The work-creation call is issued but not yet resolved.
    await waitFor(() => expect(fake.createdChapterIds).toHaveLength(1));
    expect(fake.relationCalls).toHaveLength(0);

    // Navigate to B while the A submission is pending.
    await act(async () => {
      nav.go(BOOK_B_ID);
    });

    // Let the in-flight operation complete.
    await act(async () => {
      release();
    });

    await waitForRelationCount(1);
    expect(fake.relationCalls[0].relatedWorkId).toBe(BOOK_A_ID);
    expect(fake.relationCalls[0].relatedWorkId).not.toBe(BOOK_B_ID);
  });

  // Scenario 5
  it('INDEPENDENT INSTANCES: two mounted books never leak each other as the chapter parent', async () => {
    const user = userEvent.setup();

    render(
      <Providers>
        <div data-testid="instance-a">
          <AddChapterModal workId={BOOK_A_ID} />
        </div>
        <div data-testid="instance-b">
          <AddChapterModal workId={BOOK_B_ID} />
        </div>
      </Providers>,
    );

    const instanceA = within(screen.getByTestId('instance-a'));
    const instanceB = within(screen.getByTestId('instance-b'));

    // Alternate creation between the two instances. Only one modal is open at a time, so the
    // portal-rendered "create" button is unambiguous.
    await user.click(openAddChapter(instanceA));
    await user.click(createButton());
    await waitForRelationCount(1);
    expect(fake.relationCalls[0].relatedWorkId).toBe(BOOK_A_ID);

    await user.click(openAddChapter(instanceB));
    await user.click(createButton());
    await waitForRelationCount(2);
    expect(fake.relationCalls[1].relatedWorkId).toBe(BOOK_B_ID);

    await user.click(openAddChapter(instanceA));
    await user.click(createButton());
    await waitForRelationCount(3);
    expect(fake.relationCalls[2].relatedWorkId).toBe(BOOK_A_ID);

    await user.click(openAddChapter(instanceB));
    await user.click(createButton());
    await waitForRelationCount(4);
    expect(fake.relationCalls[3].relatedWorkId).toBe(BOOK_B_ID);
  });

  // Scenario 6
  it('RAPID NAVIGATION A -> B -> A -> B: each submission uses the Work active at submit time', async () => {
    const user = userEvent.setup();
    const { nav, register } = createNav();

    render(
      <Providers>
        <NavigableModal register={register} initialWorkId={BOOK_A_ID} />
      </Providers>,
    );

    const submitOn = async (workId: string, expectedIndex: number) => {
      await act(async () => {
        nav.go(workId);
      });
      await openModalAndSubmit(user);
      await waitForRelationCount(expectedIndex + 1);
      expect(fake.relationCalls[expectedIndex].relatedWorkId).toBe(workId);
    };

    await submitOn(BOOK_A_ID, 0);
    await submitOn(BOOK_B_ID, 1);
    await submitOn(BOOK_A_ID, 2);
    await submitOn(BOOK_B_ID, 3);

    expect(fake.relationCalls.map((call) => call.relatedWorkId)).toEqual([BOOK_A_ID, BOOK_B_ID, BOOK_A_ID, BOOK_B_ID]);
  });

  // Scenario 7
  it('MULTI-CHAPTER: every relation in one submission on B uses B as the parent', async () => {
    const user = userEvent.setup();

    render(
      <Providers>
        <AddChapterModal workId={BOOK_B_ID} />
      </Providers>,
    );

    await openModalAndSubmit(user, 3);
    await waitForRelationCount(3);

    // Every relation — not just the first — must attach to B, and each to a distinct chapter.
    expect(fake.relationCalls).toHaveLength(3);
    fake.relationCalls.forEach((call) => {
      expect(call.relatedWorkId).toBe(BOOK_B_ID);
      expect(call.relationType).toBe(RelationType.IsChildOf);
    });
    expect(fake.relationCalls.map((call) => call.relationOrdinal)).toEqual([1, 2, 3]);
    const parents = new Set(fake.relationCalls.map((call) => call.relatorWorkId));
    expect(parents.size).toBe(3);
  });
});
