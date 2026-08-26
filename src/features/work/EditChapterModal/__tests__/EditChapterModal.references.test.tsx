/* eslint-disable @eslint-react/no-context-provider -- xstate actor contexts must be rendered via `.Provider` */
/**
 * Regression coverage for GitHub issue #98 (APP-CHAPTER-REF-01):
 * "Enable references in single-chapter edit modal".
 *
 * The single-chapter editing workflow does not use `EditWorkWidget`, so it never rendered the
 * existing `EditReferences` section. Two invariants matter and are asserted here:
 *
 *   1. BINDING — `EditReferences` must be rendered for a single selected chapter and must be
 *      handed the *chapter's* Work ID. Substituting the parent book's ID would silently attach
 *      references to the wrong record, which is exactly the class of defect issue #93 covered
 *      for chapter creation.
 *   2. LIFECYCLE — reference editor state is a shared, app-wide XState store. If a chapter-edit
 *      session leaves it populated, the next chapter opened would inherit a stale active
 *      reference. The modal must therefore clear it on Done, on Close, and on unmount.
 *
 * SCOPE: the child editing sections are mocked at their module boundary. This file tests the
 * chapter modal's composition and lifecycle contract, not the internals of `EditReferences` —
 * those are covered by the existing reference feature/hook tests, which must stay unchanged.
 * The real `useReferenceStateMachine` store is used (not a stub) so `finishEditing` is observed
 * through the actual state machine the application ships.
 */

import { ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ContributionStateMachineContext } from '@/src/entities/contribution';
import { FundingStateMachineContext } from '@/src/entities/funding/store/funding.store';
import { ReferenceStateMachineContext, useReferenceStateMachine } from '@/src/entities/reference';
import type { ReferenceEntity } from '@/src/entities/reference/model/reference.types';
import { useWorkStateMachine, WorkStateMachineContext } from '@/src/entities/work';
import type { WorkEntity } from '@/src/entities/work/model/work.types';
import { theme } from '@/src/shared/theme';
import { getDefaultWork } from '@/src/shared/utils';

import EditChapterModal from '../EditChapterModal';

// The i18n runtime loads markdown helper-text assets that Vitest cannot transform; stub at the
// react-i18next boundary so translation keys are returned verbatim.
vi.mock('react-i18next', () => ({
  useTranslation: vi.fn(() => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: () => Promise.resolve() },
  })),
  Trans: ({ children }: { children: React.ReactNode }) => children,
  I18nextProvider: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

// ---------------------------------------------------------------------------
// Child editing sections are replaced with probes that record the exact `workId`
// they receive. Every section is stubbed so this file exercises the modal alone.
// The helper is declared via `vi.hoisted` because `vi.mock` factories are hoisted
// above ordinary top-level bindings.
// ---------------------------------------------------------------------------
const { sectionProbe } = vi.hoisted(() => ({
  sectionProbe: (testId: string) => ({
    default: ({ workId }: { workId: string }) => <div data-testid={testId} data-work-id={workId} />,
  }),
}));

vi.mock('@/src/features/chapters/EditChapterBasicDetails/EditChapterBasicDetails', () =>
  sectionProbe('section-basic-details'),
);
vi.mock('@/src/features/work/EditDescriptions/EditDescriptions', () => sectionProbe('section-descriptions'));
vi.mock('@/src/features/work/EditContributors/EditContributors', () => sectionProbe('section-contributors'));
vi.mock('@/src/features/work/EditPublications/EditPublications', () => sectionProbe('section-publications'));
vi.mock('@/src/features/work/EditFundings/EditFundings', () => sectionProbe('section-fundings'));
vi.mock('@/src/features/work/EditReferences/EditReferences', () => sectionProbe('section-references'));

// Two clearly distinct Works. A chapter's references must never be bound to the parent book.
const PARENT_BOOK_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const CHAPTER_ONE_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const CHAPTER_TWO_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

const chapter = (id: string): WorkEntity => getDefaultWork({ id, relationId: PARENT_BOOK_ID });

let queryClient: QueryClient;

beforeEach(() => {
  vi.clearAllMocks();
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity, gcTime: Infinity } },
  });
});

afterEach(() => {
  cleanup();
  queryClient.clear();
});

/**
 * Selects `chapters` as the active chapter selection (what opening the chapter edit modal does)
 * and puts the shared reference store into an editing state, so leaked state is observable.
 * The live reference entity is reported back through `onReferenceState` on every render.
 */
function Harness({
  chapters,
  activeReference,
  onReferenceState,
  onDone,
}: {
  chapters: WorkEntity[];
  activeReference?: ReferenceEntity;
  onReferenceState?: (entity: ReferenceEntity | null) => void;
  onDone?: () => void;
}) {
  const { edit } = useWorkStateMachine();
  const { edit: editReference, activeEntity: activeReferenceEntity } = useReferenceStateMachine();

  useEffect(() => {
    edit(chapters);
  }, [edit, chapters]);

  useEffect(() => {
    if (activeReference) editReference(activeReference);
  }, [editReference, activeReference]);

  useEffect(() => {
    onReferenceState?.(activeReferenceEntity);
  });

  return <EditChapterModal onDone={onDone} />;
}

/**
 * The chapter modal consumes the work, contribution, funding and reference stores, all of which
 * the application mounts globally in `app/store`. They are all provided here so the modal runs
 * against the real state machines it ships with.
 */
function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        {/* xstate's createActorContext exposes a `.Provider`; it is not a plain React context. */}
        <WorkStateMachineContext.Provider>
          <ContributionStateMachineContext.Provider>
            <FundingStateMachineContext.Provider>
              <ReferenceStateMachineContext.Provider>{children}</ReferenceStateMachineContext.Provider>
            </FundingStateMachineContext.Provider>
          </ContributionStateMachineContext.Provider>
        </WorkStateMachineContext.Provider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function renderModal(options: {
  chapters: WorkEntity[];
  activeReference?: ReferenceEntity;
  onReferenceState?: (entity: ReferenceEntity | null) => void;
  onDone?: () => void;
}) {
  return render(
    <Providers>
      <Harness {...options} />
    </Providers>,
  );
}

/** A reference entity; only its identity is significant to these assertions. */
const aReference = (id: string): ReferenceEntity => ({
  id,
  doi: '',
  journalTitle: '',
  articleTitle: '',
  seriesTitle: '',
  volumeTitle: '',
  url: '',
  orderNumber: 1,
  unstructuredCitation: 'Some citation',
});

/**
 * The modal's Done control is an icon-only submit button with no accessible name, so it is
 * identified as the header button that is not the (labelled) Close control rather than by a
 * brittle icon test id.
 */
const submitButton = () => {
  const closeButton = screen.getByRole('button', { name: /close/i });
  const submit = screen.getAllByRole('button').find((button) => button !== closeButton);

  if (!submit) throw new Error('The chapter modal rendered no submit control.');

  return submit;
};

describe('EditChapterModal – References binding and lifecycle (issue #98)', () => {
  it('renders the References section when a single chapter is selected', () => {
    renderModal({ chapters: [chapter(CHAPTER_ONE_ID)] });

    expect(screen.getByTestId('section-references')).toBeInTheDocument();
  });

  it('binds References to the selected chapter Work ID, never the parent book ID', () => {
    renderModal({ chapters: [chapter(CHAPTER_ONE_ID)] });

    const references = screen.getByTestId('section-references');

    expect(references).toHaveAttribute('data-work-id', CHAPTER_ONE_ID);
    expect(references).not.toHaveAttribute('data-work-id', PARENT_BOOK_ID);
  });

  it('binds References to the same chapter ID as every other chapter section', () => {
    renderModal({ chapters: [chapter(CHAPTER_TWO_ID)] });

    const sections = [
      'section-basic-details',
      'section-descriptions',
      'section-contributors',
      'section-publications',
      'section-fundings',
      'section-references',
    ];

    sections.forEach((testId) => {
      expect(screen.getByTestId(testId)).toHaveAttribute('data-work-id', CHAPTER_TWO_ID);
    });
  });

  it('clears reference editing state on the Done path', async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    let referenceState: ReferenceEntity | null = null;

    renderModal({
      chapters: [chapter(CHAPTER_ONE_ID)],
      activeReference: aReference('reference-1'),
      onReferenceState: (entity) => {
        referenceState = entity;
      },
      onDone,
    });

    expect(referenceState).not.toBeNull();

    // The submit control is the modal's Done path.
    await user.click(submitButton());

    expect(onDone).toHaveBeenCalledTimes(1);
    expect(referenceState).toBeNull();
  });

  it('clears reference editing state on the Close path', async () => {
    const user = userEvent.setup();
    let referenceState: ReferenceEntity | null = null;

    renderModal({
      chapters: [chapter(CHAPTER_ONE_ID)],
      activeReference: aReference('reference-1'),
      onReferenceState: (entity) => {
        referenceState = entity;
      },
    });

    expect(referenceState).not.toBeNull();

    await user.click(screen.getByRole('button', { name: /close/i }));

    expect(referenceState).toBeNull();
  });

  it('clears reference editing state when the modal unmounts', () => {
    let referenceState: ReferenceEntity | null = null;
    const capture = (entity: ReferenceEntity | null) => {
      referenceState = entity;
    };

    // The reference store lives above the modal, so unmounting only the modal subtree — the
    // modal lifecycle cleanup — must be what clears it.
    function Host({ showModal }: { showModal: boolean }) {
      const { edit } = useWorkStateMachine();
      const { edit: editReference, activeEntity } = useReferenceStateMachine();

      useEffect(() => {
        edit([chapter(CHAPTER_ONE_ID)]);
        editReference(aReference('reference-1'));
      }, [edit, editReference]);

      useEffect(() => {
        capture(activeEntity);
      });

      return showModal ? <EditChapterModal /> : null;
    }

    const { rerender } = render(
      <Providers>
        <Host showModal />
      </Providers>,
    );

    expect(referenceState).not.toBeNull();

    rerender(
      <Providers>
        <Host showModal={false} />
      </Providers>,
    );

    expect(referenceState).toBeNull();
  });
});
