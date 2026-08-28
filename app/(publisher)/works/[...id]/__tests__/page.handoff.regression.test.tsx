/**
 * PRODUCTION ROUTE-TO-WIDGET HANDOFF regression coverage for GitHub issue #93
 * (APP-CHAPTER-01), closing the Codex P2 gap on release PR #95.
 *
 * The sibling route test `src/features/work/AddChapterModal/__tests__/
 * AddChapterModal.routeNavigation.regression.test.tsx` models the server render with a
 * test-only `WorkRouteView` that independently reads `useParams()` and forwards the id to
 * `EditWorkWidget`. It therefore proves the client hierarchy, but it does NOT execute the real
 * production server component — so a regression in the actual route's `params` extraction or
 * `workId` hand-off would slip past it.
 *
 * This file closes exactly that gap. It invokes the REAL production server component
 * `app/(publisher)/works/[...id]/page.tsx` (`WorkPage`) with a genuine `params` Promise, mocks only
 * the infrastructure needed to pass the auth / data / ownership gates, and observes the element
 * the real page returns to assert that the exact route Work id reaches `EditWorkWidget`.
 *
 * What is REAL vs mocked (do not overclaim):
 *   REAL     — the production `WorkPage` function itself, including its `params` catch-all
 *              destructuring (`id: [id]`) and the `<EditWorkWidget workId={id} />` hand-off.
 *   MOCKED   — `getServerSession` + `authOptions` (auth gate), `WorkService` (data gate),
 *              `UserService` (ownership gate), `next/navigation` redirect, and `EditWorkWidget`
 *              as the observation boundary. These are the smallest stubs that let the real page
 *              run to its return statement.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const BOOK_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const IMPRINT_ID = 'imprint-aaaa';

// Auth gate: authOptions is only forwarded to the mocked getServerSession, so a bare object is
// enough and it spares us loading the real next-auth/openid-client module graph.
vi.mock('@/src/shared/lib/auth/auth', () => ({ authOptions: {} }));

const getServerSession = vi.fn();
vi.mock('next-auth', () => ({ getServerSession: (...args: unknown[]) => getServerSession(...args) }));

// redirect must never fire on the happy path; capture it so an unexpected gate failure surfaces
// as an explicit assertion rather than a silently wrong element.
const redirect = vi.fn();
vi.mock('next/navigation', () => ({ redirect: (...args: unknown[]) => redirect(...args) }));

// Data gate: the real page constructs WorkService (with real sub-services) and calls getWork.
const getWork = vi.fn();
vi.mock('@/src/entities/work/api/work.service', () => ({
  WorkService: vi.fn(function WorkService() {
    return { getWork };
  }),
}));

// Ownership gate: getUser supplies linkedPublishers so the imprint check passes.
const getUser = vi.fn();
vi.mock('@/src/entities/user', async (importActual) => ({
  ...(await importActual<typeof import('@/src/entities/user')>()),
  UserService: vi.fn(function UserService() {
    return { getUser };
  }),
}));

// Observation boundary: capture the props the real page hands to EditWorkWidget.
import { EditWorkWidget } from '@/src/widgets';

vi.mock('@/src/widgets', () => ({
  EditWorkWidget: vi.fn(() => null),
}));

import WorkPage from '../page';

beforeEach(() => {
  vi.clearAllMocks();
  getServerSession.mockResolvedValue({ accessToken: 'access-token' });
  getWork.mockResolvedValue({ imprintId: IMPRINT_ID });
  getUser.mockResolvedValue({
    linkedPublishers: [{ imprints: [{ id: IMPRINT_ID }] }],
    isSuperuser: false,
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('WorkPage – production route-to-widget hand-off (issue #93, PR #95)', () => {
  it('passes the exact route Work id to EditWorkWidget', async () => {
    const element = await WorkPage({ params: Promise.resolve({ id: [BOOK_ID] }) });

    expect(redirect).not.toHaveBeenCalled();
    expect(getWork).toHaveBeenCalledWith(BOOK_ID);
    expect(element.type).toBe(EditWorkWidget);
    expect(element.props).toEqual({ workId: BOOK_ID });
  });

  it('uses the first catch-all segment as the Work id, ignoring trailing segments', async () => {
    const element = await WorkPage({
      params: Promise.resolve({ id: [BOOK_ID, 'extra-segment'] }),
    });

    expect(redirect).not.toHaveBeenCalled();
    expect(getWork).toHaveBeenCalledWith(BOOK_ID);
    expect(element.props).toEqual({ workId: BOOK_ID });
    expect(element.props.workId).not.toBe('extra-segment');
  });
});
