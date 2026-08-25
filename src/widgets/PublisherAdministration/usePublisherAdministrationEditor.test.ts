import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BackCatalogueBehaviour,
  DistributionPlatform,
  DistributionPlatformGroup,
  type GetPublisherServiceConfigurationReportQuery,
  ThothPackage,
} from '@/gql/graphql';
import { GraphqlError } from '@/src/shared/api/graphqlService';

const replaceServiceConfigurationMock = vi.fn();
const replaceHookMock = vi.fn();
// Spy proving global active-publisher isolation: the staff edit session must
// never consult the active-publisher state machine for identity, token,
// selections, settlement or reconciliation.
const stateMachineSpy = vi.fn();

// Only the mutation hook itself is replaced. The backend error classification
// helpers are the real ones, so classification behavior under test is the
// shipped behavior, not a test double.
vi.mock('@/src/entities/publisher/api/hooks/useReplacePublisherServiceConfiguration', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/src/entities/publisher/api/hooks/useReplacePublisherServiceConfiguration')>();

  return { ...actual, default: () => replaceHookMock() };
});
vi.mock('@/src/entities/publisher/store/hooks/usePublisherStateMachine', () => ({
  default: () => stateMachineSpy(),
}));

import usePublisherAdministrationEditor from './usePublisherAdministrationEditor';

type ReportSummary = GetPublisherServiceConfigurationReportQuery['publisherServiceConfigurations'][number];

const createSummary = (overrides?: {
  publisherId?: string;
  publisherName?: string;
  subscriptionPackage?: ThothPackage;
  platforms?: DistributionPlatform[];
  updatedAt?: string;
}): ReportSummary => ({
  configuration: {
    publisher: {
      publisherId: overrides?.publisherId ?? 'pub-A',
      publisherName: overrides?.publisherName ?? 'Publisher A',
    },
    subscriptionPackage: overrides?.subscriptionPackage ?? ThothPackage.Sphinx,
    enabledDistributionPlatforms: (overrides?.platforms ?? [DistributionPlatform.Oapen]).map((platform) => ({
      platform,
    })),
    updatedAt: overrides?.updatedAt ?? '2026-08-01T10:00:00Z',
  },
  lastChange: { changedAt: '2026-08-01T10:00:00Z' },
  latestBackCatalogueJob: null,
});

const summaryA = createSummary();

const summaryB = createSummary({
  publisherId: 'pub-B',
  publisherName: 'Publisher B',
  subscriptionPackage: ThothPackage.Pyramid,
  platforms: [DistributionPlatform.Doab],
  updatedAt: '2026-08-02T20:00:00Z',
});

const platformOptions = [
  {
    platform: DistributionPlatform.Oapen,
    displayLabel: 'OAPEN Library',
    assignable: true,
    linkedGroup: DistributionPlatformGroup.OapenDoab,
    backCatalogueBehaviour: BackCatalogueBehaviour.PullFeed,
  },
  {
    platform: DistributionPlatform.Doab,
    displayLabel: 'Directory of Open Access Books',
    assignable: false,
    linkedGroup: DistributionPlatformGroup.OapenDoab,
    backCatalogueBehaviour: BackCatalogueBehaviour.PullFeed,
  },
];

const renderEditor = (props?: { isEligible?: boolean; withoutOptions?: boolean }) =>
  renderHook(
    (hookProps: { isEligible: boolean; distributionPlatformOptions: typeof platformOptions | undefined }) =>
      usePublisherAdministrationEditor(hookProps),
    {
      initialProps: {
        isEligible: props?.isEligible ?? true,
        distributionPlatformOptions: props?.withoutOptions ? undefined : platformOptions,
      },
    },
  );

// A promise whose settlement the test controls, so "while the mutation is in
// flight" is a real state and not a timing assumption.
const deferred = () => {
  let resolve: (value: unknown) => void = () => {};
  let reject: (reason: unknown) => void = () => {};
  const promise = new Promise<unknown>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  // The rejection is always handled by the hook's own await; attaching a no-op
  // here keeps an unhandled rejection from being reported before that happens.
  promise.catch(() => {});

  return { promise, resolve, reject };
};

beforeEach(() => {
  vi.clearAllMocks();
  replaceServiceConfigurationMock.mockResolvedValue({
    subscriptionPackage: ThothPackage.Pyramid,
    effectiveCapabilities: [],
    enabledDistributionPlatforms: [],
    updatedAt: '2026-08-03T00:00:00Z',
  });
  replaceHookMock.mockReturnValue({
    replaceServiceConfiguration: replaceServiceConfigurationMock,
    loading: false,
  });
});

describe('usePublisherAdministrationEditor', () => {
  describe('starting an edit session', () => {
    it('snapshots the exact row publisher id, name, package, platform set and updatedAt token', () => {
      const { result } = renderEditor();

      act(() => result.current.startEdit(summaryA));

      expect(result.current.session?.snapshot).toEqual({
        publisherId: 'pub-A',
        publisherName: 'Publisher A',
        expectedUpdatedAt: '2026-08-01T10:00:00Z',
        subscriptionPackage: ThothPackage.Sphinx,
        enabledPlatforms: [DistributionPlatform.Oapen],
      });
      expect(result.current.session?.draft).toEqual({
        subscriptionPackage: ThothPackage.Sphinx,
        enabledPlatforms: [DistributionPlatform.Oapen],
      });
    });

    it('takes identity from the row, not from row position: a second row yields that row own id and token', () => {
      const { result } = renderEditor();

      act(() => result.current.startEdit(summaryB));

      expect(result.current.session?.snapshot.publisherId).toBe('pub-B');
      expect(result.current.session?.snapshot.expectedUpdatedAt).toBe('2026-08-02T20:00:00Z');
    });

    it('copies the platform set so mutating the report row cannot reach into the session', () => {
      const { result } = renderEditor();
      const mutableSummary = createSummary({ platforms: [DistributionPlatform.Oapen] });

      act(() => result.current.startEdit(mutableSummary));

      mutableSummary.configuration.enabledDistributionPlatforms.push({ platform: DistributionPlatform.Doab });

      expect(result.current.session?.snapshot.enabledPlatforms).toEqual([DistributionPlatform.Oapen]);
      expect(result.current.session?.draft.enabledPlatforms).toEqual([DistributionPlatform.Oapen]);
    });

    it('allows only one edit session at a time: a second row cannot open while one is open', () => {
      const { result } = renderEditor();

      act(() => result.current.startEdit(summaryA));

      expect(result.current.canStartEdit).toBe(false);

      act(() => result.current.startEdit(summaryB));

      expect(result.current.session?.snapshot.publisherId).toBe('pub-A');
      expect(result.current.session?.snapshot.expectedUpdatedAt).toBe('2026-08-01T10:00:00Z');
    });

    it('does not replace an open session token or selections when the report is refetched', () => {
      const { result, rerender } = renderEditor();

      act(() => result.current.startEdit(summaryA));
      act(() => result.current.changePackage(ThothPackage.Pyramid));

      // The report refetches and the same publisher comes back at a newer
      // version with different values; the parent re-renders with it.
      const refetchedA = createSummary({
        subscriptionPackage: ThothPackage.Oasis,
        platforms: [DistributionPlatform.Doab],
        updatedAt: '2026-08-09T23:59:00Z',
      });
      rerender({ isEligible: true, distributionPlatformOptions: platformOptions });
      act(() => result.current.startEdit(refetchedA));

      expect(result.current.session?.snapshot.expectedUpdatedAt).toBe('2026-08-01T10:00:00Z');
      expect(result.current.session?.snapshot.subscriptionPackage).toBe(ThothPackage.Sphinx);
      expect(result.current.session?.draft.subscriptionPackage).toBe(ThothPackage.Pyramid);
      expect(result.current.session?.draft.enabledPlatforms).toEqual([DistributionPlatform.Oapen]);
    });

    it('never consults the global active-publisher state machine', () => {
      const { result } = renderEditor();

      act(() => result.current.startEdit(summaryA));
      act(() => result.current.changePackage(ThothPackage.Pyramid));

      expect(stateMachineSpy).not.toHaveBeenCalled();
    });
  });

  describe('superuser gating', () => {
    it('offers no edit affordance to a viewer who is not an authoritative superuser', () => {
      const { result } = renderEditor({ isEligible: false });

      expect(result.current.canStartEdit).toBe(false);

      act(() => result.current.startEdit(summaryA));

      expect(result.current.session).toBeNull();
    });

    it('fails closed: it starts no mutation once authoritative state no longer identifies a superuser', async () => {
      const { result, rerender } = renderEditor({ isEligible: true });

      act(() => result.current.startEdit(summaryA));

      rerender({ isEligible: false, distributionPlatformOptions: platformOptions });

      await act(async () => {
        await result.current.save();
      });

      expect(replaceServiceConfigurationMock).not.toHaveBeenCalled();
    });
  });

  describe('package and platform selection', () => {
    it('does not change the platform selection when the package changes', () => {
      const { result } = renderEditor();

      act(() => result.current.startEdit(summaryA));
      act(() => result.current.changePackage(ThothPackage.Obelisk));

      expect(result.current.session?.draft.subscriptionPackage).toBe(ThothPackage.Obelisk);
      expect(result.current.session?.draft.enabledPlatforms).toEqual([DistributionPlatform.Oapen]);
    });

    it('changes platform membership only through an explicit toggle, with no linked-group closure', () => {
      const { result } = renderEditor();

      act(() => result.current.startEdit(summaryA));
      // OAPEN and DOAB share a linked group in the metadata above. Selecting one
      // must not select the other: closure is backend-owned.
      act(() => result.current.togglePlatform(DistributionPlatform.Doab, true));

      expect(result.current.session?.draft.enabledPlatforms).toEqual([
        DistributionPlatform.Oapen,
        DistributionPlatform.Doab,
      ]);

      act(() => result.current.togglePlatform(DistributionPlatform.Oapen, false));

      expect(result.current.session?.draft.enabledPlatforms).toEqual([DistributionPlatform.Doab]);
      expect(result.current.session?.draft.subscriptionPackage).toBe(ThothPackage.Sphinx);
    });

    it('presents backend option metadata as-is and adds no client-side policy', () => {
      const { result } = renderEditor();

      act(() => result.current.startEdit(summaryA));

      expect(result.current.platformRows).toEqual([
        {
          platform: DistributionPlatform.Oapen,
          displayLabel: 'OAPEN Library',
          assignable: true,
          linkedGroup: DistributionPlatformGroup.OapenDoab,
          backCatalogueBehaviour: BackCatalogueBehaviour.PullFeed,
        },
        {
          platform: DistributionPlatform.Doab,
          displayLabel: 'Directory of Open Access Books',
          assignable: false,
          linkedGroup: DistributionPlatformGroup.OapenDoab,
          backCatalogueBehaviour: BackCatalogueBehaviour.PullFeed,
        },
      ]);
    });

    it('keeps a currently enabled platform that option metadata does not describe, as non-assignable', () => {
      const { result } = renderEditor();

      act(() =>
        result.current.startEdit(
          createSummary({ platforms: [DistributionPlatform.Oapen, DistributionPlatform.GooglePlay] }),
        ),
      );

      const unknown = result.current.platformRows.find(
        (row) => row.platform === DistributionPlatform.GooglePlay,
      );

      expect(unknown).toEqual({
        platform: DistributionPlatform.GooglePlay,
        displayLabel: DistributionPlatform.GooglePlay,
        assignable: false,
      });
      expect(result.current.session?.draft.enabledPlatforms).toContain(DistributionPlatform.GooglePlay);
    });

    it('keeps the unknown-metadata platform row visible after it is removed, still non-assignable', () => {
      const { result } = renderEditor();

      act(() =>
        result.current.startEdit(
          createSummary({ platforms: [DistributionPlatform.Oapen, DistributionPlatform.GooglePlay] }),
        ),
      );
      act(() => result.current.togglePlatform(DistributionPlatform.GooglePlay, false));

      // Removable, but the row remains listed and metadata still does not make
      // it assignable, so the editor cannot present it as re-selectable.
      expect(result.current.session?.draft.enabledPlatforms).not.toContain(DistributionPlatform.GooglePlay);
      expect(
        result.current.platformRows.find((row) => row.platform === DistributionPlatform.GooglePlay),
      ).toEqual({
        platform: DistributionPlatform.GooglePlay,
        displayLabel: DistributionPlatform.GooglePlay,
        assignable: false,
      });
    });

    it('does not drop an enabled platform when option metadata has not loaded at all', () => {
      const { result } = renderEditor({ withoutOptions: true });

      act(() => result.current.startEdit(summaryA));

      expect(result.current.platformRows).toEqual([
        { platform: DistributionPlatform.Oapen, displayLabel: DistributionPlatform.Oapen, assignable: false },
      ]);
    });
  });

  describe('saving', () => {
    it('submits the session exact publisher id, selections and captured expectedUpdatedAt', async () => {
      const { result } = renderEditor();

      act(() => result.current.startEdit(summaryA));
      act(() => result.current.changePackage(ThothPackage.Pyramid));
      act(() => result.current.togglePlatform(DistributionPlatform.Doab, true));

      await act(async () => {
        await result.current.save();
      });

      expect(replaceServiceConfigurationMock).toHaveBeenCalledWith({
        publisherId: 'pub-A',
        subscriptionPackage: ThothPackage.Pyramid,
        enabledDistributionPlatforms: [DistributionPlatform.Oapen, DistributionPlatform.Doab],
        expectedUpdatedAt: '2026-08-01T10:00:00Z',
      });
    });

    it('never pairs one publisher token with another publisher id', async () => {
      const { result } = renderEditor();

      // A is opened; B is then attempted while A is open and is refused.
      act(() => result.current.startEdit(summaryA));
      act(() => result.current.startEdit(summaryB));

      await act(async () => {
        await result.current.save();
      });

      const input = replaceServiceConfigurationMock.mock.calls[0][0];

      expect(input.publisherId).toBe('pub-A');
      expect(input.expectedUpdatedAt).toBe('2026-08-01T10:00:00Z');
      expect(input.expectedUpdatedAt).not.toBe(summaryB.configuration.updatedAt);
    });

    it('reports success only after the mutation resolves, and then discards the session', async () => {
      const settlement = deferred();
      replaceServiceConfigurationMock.mockReturnValue(settlement.promise);

      const { result } = renderEditor();

      act(() => result.current.startEdit(summaryA));

      let saving: Promise<void> = Promise.resolve();
      act(() => {
        saving = result.current.save();
      });

      expect(result.current.outcome).toBeNull();
      expect(result.current.session).not.toBeNull();

      await act(async () => {
        settlement.resolve({});
        await saving;
      });

      expect(result.current.outcome).toEqual({
        publisherId: 'pub-A',
        publisherName: 'Publisher A',
        kind: 'saved',
      });
      expect(result.current.session).toBeNull();
    });

    it('holds the session and blocks dismissal, retargeting and a second mutation while one is in flight', async () => {
      const settlement = deferred();
      replaceServiceConfigurationMock.mockReturnValue(settlement.promise);

      const { result } = renderEditor();

      act(() => result.current.startEdit(summaryA));

      let saving: Promise<void> = Promise.resolve();
      act(() => {
        saving = result.current.save();
      });

      expect(result.current.isSaving).toBe(true);
      expect(result.current.canCancel).toBe(false);
      expect(result.current.canStartEdit).toBe(false);

      // No dismissal, no retarget, no second attempt.
      act(() => result.current.cancelEdit());
      act(() => result.current.startEdit(summaryB));
      await act(async () => {
        await result.current.save();
      });

      expect(result.current.session?.snapshot.publisherId).toBe('pub-A');
      expect(replaceServiceConfigurationMock).toHaveBeenCalledTimes(1);

      await act(async () => {
        settlement.resolve({});
        await saving;
      });

      // Settlement is attributed to the exact attempted publisher only.
      expect(result.current.outcome?.publisherId).toBe('pub-A');
      expect(replaceServiceConfigurationMock).toHaveBeenCalledTimes(1);
    });

    it('does not let a pending attempt change its own selections', async () => {
      const settlement = deferred();
      replaceServiceConfigurationMock.mockReturnValue(settlement.promise);

      const { result } = renderEditor();

      act(() => result.current.startEdit(summaryA));

      let saving: Promise<void> = Promise.resolve();
      act(() => {
        saving = result.current.save();
      });

      act(() => result.current.changePackage(ThothPackage.Oasis));
      act(() => result.current.togglePlatform(DistributionPlatform.Doab, true));

      expect(result.current.session?.draft).toEqual({
        subscriptionPackage: ThothPackage.Sphinx,
        enabledPlatforms: [DistributionPlatform.Oapen],
      });

      await act(async () => {
        settlement.resolve({});
        await saving;
      });
    });

    it('requires a deliberate new edit after a settled attempt, which captures the fresh token', async () => {
      const { result } = renderEditor();

      act(() => result.current.startEdit(summaryA));
      await act(async () => {
        await result.current.save();
      });

      expect(result.current.session).toBeNull();
      expect(result.current.canStartEdit).toBe(true);

      const refreshedA = createSummary({ updatedAt: '2026-08-20T08:00:00Z' });
      act(() => result.current.startEdit(refreshedA));

      expect(result.current.session?.snapshot.expectedUpdatedAt).toBe('2026-08-20T08:00:00Z');
    });

    it('exposes no bulk or multi-publisher mutation path', () => {
      const { result } = renderEditor();

      const api = Object.keys(result.current);

      expect(api).toEqual([
        'session',
        'isEditing',
        'isSaving',
        'canStartEdit',
        'canCancel',
        'outcome',
        'platformRows',
        'startEdit',
        'cancelEdit',
        'changePackage',
        'togglePlatform',
        'save',
      ]);
      // `startEdit` takes exactly one report summary, and `save` takes nothing:
      // there is no shape in this API that could carry a second publisher.
      expect(result.current.startEdit.length).toBe(1);
      expect(result.current.save.length).toBe(0);
    });
  });

  describe('failure classifications', () => {
    it('treats a stale write as not saved, discards the session and requires a new edit', async () => {
      replaceServiceConfigurationMock.mockRejectedValue(
        new GraphqlError('changed', { type: 'STALE_SERVICE_CONFIGURATION' }),
      );

      const { result } = renderEditor();

      act(() => result.current.startEdit(summaryA));
      await act(async () => {
        await result.current.save();
      });

      expect(result.current.outcome).toEqual({
        publisherId: 'pub-A',
        publisherName: 'Publisher A',
        kind: 'stale',
      });
      expect(result.current.session).toBeNull();
      expect(replaceServiceConfigurationMock).toHaveBeenCalledTimes(1);
    });

    it('treats DISTRIBUTION_JOB_CREATION_DISABLED as not saved, with no synthetic job or configuration', async () => {
      replaceServiceConfigurationMock.mockRejectedValue(
        new GraphqlError('disabled', { type: 'DISTRIBUTION_JOB_CREATION_DISABLED' }),
      );

      const { result } = renderEditor();

      act(() => result.current.startEdit(summaryA));
      await act(async () => {
        await result.current.save();
      });

      expect(result.current.outcome).toEqual({
        publisherId: 'pub-A',
        publisherName: 'Publisher A',
        kind: 'jobCreationDisabled',
      });
      expect(result.current.session).toBeNull();
    });

    it('treats an unclassified failure as an uncertain outcome and discards the submitted values', async () => {
      replaceServiceConfigurationMock.mockRejectedValue(new Error('Network error'));

      const { result } = renderEditor();

      act(() => result.current.startEdit(summaryA));
      act(() => result.current.changePackage(ThothPackage.Pyramid));
      await act(async () => {
        await result.current.save();
      });

      expect(result.current.outcome).toEqual({
        publisherId: 'pub-A',
        publisherName: 'Publisher A',
        kind: 'failed',
        message: 'Network error',
      });
      expect(result.current.session).toBeNull();
    });

    it('classifies by extensions only: a message naming a classification is still unclassified', async () => {
      replaceServiceConfigurationMock.mockRejectedValue(new GraphqlError('STALE_SERVICE_CONFIGURATION'));

      const { result } = renderEditor();

      act(() => result.current.startEdit(summaryA));
      await act(async () => {
        await result.current.save();
      });

      expect(result.current.outcome?.kind).toBe('failed');
    });

    it('never retries a failed mutation automatically', async () => {
      replaceServiceConfigurationMock.mockRejectedValue(new Error('Network error'));

      const { result } = renderEditor();

      act(() => result.current.startEdit(summaryA));
      await act(async () => {
        await result.current.save();
      });

      expect(replaceServiceConfigurationMock).toHaveBeenCalledTimes(1);

      // Nothing re-attempts on its own after settlement either.
      await act(async () => {
        await Promise.resolve();
      });

      expect(replaceServiceConfigurationMock).toHaveBeenCalledTimes(1);
    });

    it('attributes a failed attempt to the publisher it was made for, and never to a later session', async () => {
      replaceServiceConfigurationMock.mockRejectedValue(new Error('Network error'));

      const { result } = renderEditor();

      act(() => result.current.startEdit(summaryA));
      await act(async () => {
        await result.current.save();
      });

      expect(result.current.outcome?.publisherId).toBe('pub-A');
      expect(result.current.outcome?.publisherName).toBe('Publisher A');

      // Opening a deliberate new session for a different publisher clears the
      // previous attempt outcome rather than carrying it over to that
      // publisher, and captures that publisher's own identity and token.
      act(() => result.current.startEdit(summaryB));

      expect(result.current.outcome).toBeNull();
      expect(result.current.session?.snapshot.publisherId).toBe('pub-B');
      expect(result.current.session?.snapshot.expectedUpdatedAt).toBe('2026-08-02T20:00:00Z');
    });
  });
});
