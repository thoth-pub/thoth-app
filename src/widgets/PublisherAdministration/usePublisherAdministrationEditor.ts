'use client';

import { useRef, useState } from 'react';

import type {
  BackCatalogueBehaviour,
  DistributionPlatform,
  DistributionPlatformGroup,
  GetDistributionPlatformOptionsQuery,
  GetPublisherServiceConfigurationReportQuery,
  ReplacePublisherServiceConfigurationInput,
  ThothPackage,
} from '@/gql/graphql';
import useReplacePublisherServiceConfiguration, {
  DISTRIBUTION_JOB_CREATION_DISABLED,
  getServiceConfigurationErrorType,
  STALE_SERVICE_CONFIGURATION,
} from '@/src/entities/publisher/api/hooks/useReplacePublisherServiceConfiguration';
import type { PublisherId } from '@/src/entities/publisher/model/publisher.types';

type ReportSummary = GetPublisherServiceConfigurationReportQuery['publisherServiceConfigurations'][number];

type DistributionPlatformOption = GetDistributionPlatformOptionsQuery['distributionPlatformOptions'][number];

// The immutable half of one edit session: exactly what was read from one
// internally consistent APP-02A report row, captured when Edit was pressed.
//
// `expectedUpdatedAt` is the backend's optimistic-concurrency version token for
// that same row/version. Identity and token live in this one object and are
// only ever read together, so one publisher's token can never be paired with
// another publisher's ID. Nothing in this snapshot is ever recomputed,
// defaulted, refreshed from a later report read, or carried across publishers
// or attempts.
export type PublisherAdministrationEditSnapshot = {
  publisherId: PublisherId;
  // Presentation only. It names the publisher in the editor and in the save
  // outcome; it is never part of the mutation or of any cache identity.
  publisherName: string;
  expectedUpdatedAt: ReplacePublisherServiceConfigurationInput['expectedUpdatedAt'];
  subscriptionPackage: ThothPackage;
  enabledPlatforms: DistributionPlatform[];
};

// The editable half: seeded once from the snapshot and thereafter changed only
// by an explicit user selection in the editor.
export type PublisherAdministrationEditDraft = {
  subscriptionPackage: ThothPackage;
  enabledPlatforms: DistributionPlatform[];
};

export type PublisherAdministrationEditSession = {
  snapshot: PublisherAdministrationEditSnapshot;
  draft: PublisherAdministrationEditDraft;
};

// One save attempt's result, bound to the publisher the attempt was actually
// made for, so it can never be presented as another publisher's outcome. The
// name is carried here too: a successful edit may legitimately drop the
// publisher out of the active filtered page, and the outcome must not depend on
// a row that is no longer there.
export type PublisherAdministrationSaveOutcome = {
  publisherId: PublisherId;
  publisherName: string;
  kind: 'saved' | 'stale' | 'jobCreationDisabled' | 'failed';
  message?: string;
};

// One selectable platform row in the editor. Every field is backend-provided;
// the client adds no policy of its own.
export type PublisherAdministrationPlatformRow = {
  platform: DistributionPlatform;
  displayLabel: string;
  assignable: boolean;
  linkedGroup?: DistributionPlatformGroup | null;
  backCatalogueBehaviour?: BackCatalogueBehaviour | null;
};

type UsePublisherAdministrationEditorProps = {
  // Presentation/initiation gating only - true once authoritative user state
  // confirms a superuser. The backend remains the authorization boundary for
  // the mutation itself.
  isEligible: boolean;
  distributionPlatformOptions: DistributionPlatformOption[] | undefined;
};

// APP-02B: the bounded staff edit session for exactly one publisher's desired
// service configuration, started from one row of the APP-02A index.
//
// Global active-publisher state is deliberately absent from this module. The
// edit target, the version token, the selections, the mutation input, the
// settlement owner and the outcome all come from the session snapshot captured
// from the chosen row, so changing the active publisher elsewhere - even while
// a save is in flight - cannot retarget, clear or reinterpret the edit.
//
// At most one session exists at a time and at most one mutation is ever in
// flight: `startEdit` refuses while a session is open, and an in-flight attempt
// additionally blocks cancelling, so a second publisher's edit cannot begin
// before the first attempt has settled. Every settlement path discards the
// exact session object that initiated it and nothing else.
const usePublisherAdministrationEditor = ({
  isEligible,
  distributionPlatformOptions,
}: UsePublisherAdministrationEditorProps) => {
  const { replaceServiceConfiguration, loading } = useReplacePublisherServiceConfiguration();

  const [session, setSession] = useState<PublisherAdministrationEditSession | null>(null);
  const [outcome, setOutcome] = useState<PublisherAdministrationSaveOutcome | null>(null);
  const [isAttemptPending, setIsAttemptPending] = useState(false);

  // Hard single-flight latch. `isAttemptPending` drives presentation, but React
  // state only settles on a re-render; this ref is set synchronously so two
  // save calls within one render pass still cannot produce two mutations.
  const attemptInFlight = useRef(false);

  const isEditing = session !== null;
  const isSaving = loading || isAttemptPending;

  // An edit may start only for an authoritative superuser, only when no session
  // is open, and only when no attempt is settling.
  const canStartEdit = isEligible && !isEditing && !isSaving;
  // Dismissal is withheld while an attempt is in flight: allowing it would let
  // another publisher's edit begin before this one settled.
  const canCancel = isEditing && !isSaving;

  // Editor rows come from the backend option list. A platform that this row
  // currently has enabled but that the option list does not describe is still
  // listed, so an edit cannot silently drop it; absent metadata is not evidence
  // that it may be assigned, so it stays removable but never re-selectable.
  // Membership is read from the session's captured set, not from the draft, so
  // removing such a platform does not make its row disappear mid-session.
  const platformOptions = distributionPlatformOptions ?? [];

  const platformRows: PublisherAdministrationPlatformRow[] = session
    ? [
        ...platformOptions,
        ...session.snapshot.enabledPlatforms
          .filter((platform) => !platformOptions.some((option) => option.platform === platform))
          .map((platform) => ({ platform, displayLabel: platform, assignable: false })),
      ]
    : [];

  // Identity comes only from the row's own `configuration.publisher.publisherId`
  // - never from a row index, a URL, the active publisher or any other
  // selected-publisher state - and package, platform set and version token are
  // all taken from that one row, so they describe the same configuration
  // version.
  const startEdit = (summary: ReportSummary) => {
    if (!canStartEdit) return;

    const { publisher, subscriptionPackage, enabledDistributionPlatforms, updatedAt } = summary.configuration;
    const enabledPlatforms = enabledDistributionPlatforms.map((assignment) => assignment.platform);

    setOutcome(null);
    setSession({
      snapshot: {
        publisherId: publisher.publisherId,
        publisherName: publisher.publisherName,
        expectedUpdatedAt: updatedAt,
        subscriptionPackage,
        enabledPlatforms: [...enabledPlatforms],
      },
      draft: {
        subscriptionPackage,
        enabledPlatforms: [...enabledPlatforms],
      },
    });
  };

  const cancelEdit = () => {
    if (!canCancel) return;

    setSession(null);
    setOutcome(null);
  };

  // Package and platform selection are independent. Package capability
  // semantics are backend-owned, so changing the package never rewrites
  // platform state here.
  const changePackage = (subscriptionPackage: ThothPackage) => {
    if (isSaving) return;

    setSession((current) =>
      current ? { ...current, draft: { ...current.draft, subscriptionPackage } } : current,
    );
  };

  // Exactly the toggled platform changes. No linked-group closure is applied
  // locally: the complete desired set is submitted and the server-normalized
  // result wins.
  const togglePlatform = (platform: DistributionPlatform, selected: boolean) => {
    if (isSaving) return;

    setSession((current) => {
      if (!current) return current;

      return {
        ...current,
        draft: {
          ...current.draft,
          enabledPlatforms: selected
            ? [...current.draft.enabledPlatforms, platform]
            : current.draft.enabledPlatforms.filter((enabled) => enabled !== platform),
        },
      };
    });
  };

  const save = async () => {
    const attempt = session;

    if (!attempt) return;

    // Fail closed: if authoritative user state no longer identifies a
    // superuser, no new mutation is initiated.
    if (!isEligible) return;

    // One mutation at a time.
    if (attemptInFlight.current) return;

    attemptInFlight.current = true;
    setIsAttemptPending(true);
    setOutcome(null);

    const { publisherId, publisherName, expectedUpdatedAt } = attempt.snapshot;

    // Settlement only ever touches the exact session object that started this
    // attempt; any other session state is left untouched.
    const discardThisSession = () => setSession((current) => (current === attempt ? null : current));

    try {
      // Identity and token are read from the same frozen snapshot, and the
      // selections from that snapshot's own draft. Nothing here is derived from
      // global active-publisher state, from a later report read, or from any
      // other row.
      await replaceServiceConfiguration({
        publisherId,
        subscriptionPackage: attempt.draft.subscriptionPackage,
        enabledDistributionPlatforms: attempt.draft.enabledPlatforms,
        expectedUpdatedAt,
      });

      // Success only after the mutation resolved. The authoritative
      // configuration is the server-normalized response the mutation hook wrote
      // to the protected cache; nothing is reconstructed from this draft.
      discardThisSession();
      setOutcome({ publisherId, publisherName, kind: 'saved' });
    } catch (saveError) {
      const errorType = getServiceConfigurationErrorType(saveError);

      // The configuration moved on since the row was read. Nothing was
      // overwritten; the session is discarded so the next attempt must
      // deliberately capture a fresh token from a refreshed row.
      if (errorType === STALE_SERVICE_CONFIGURATION) {
        discardThisSession();
        setOutcome({ publisherId, publisherName, kind: 'stale' });

        return;
      }

      // The backend rolled the whole activation back and created no job:
      // failed, not saved. No synthetic configuration or pending job may be
      // shown, and nothing about job creation is changed from here.
      if (errorType === DISTRIBUTION_JOB_CREATION_DISABLED) {
        discardThisSession();
        setOutcome({ publisherId, publisherName, kind: 'jobCreationDisabled' });

        return;
      }

      // Unclassified failure: the outcome is genuinely ambiguous - the server
      // may have committed the replace without the response arriving. The
      // mutation hook has already re-anchored the attempted publisher's
      // configuration and job state and the staff report/count to API truth;
      // the session is discarded so the submitted values are not left standing
      // as truth and any new attempt starts from refreshed state.
      discardThisSession();
      setOutcome({
        publisherId,
        publisherName,
        kind: 'failed',
        message: saveError instanceof Error ? saveError.message : '',
      });
    } finally {
      attemptInFlight.current = false;
      setIsAttemptPending(false);
    }
  };

  return {
    session,
    isEditing,
    isSaving,
    canStartEdit,
    canCancel,
    outcome,
    platformRows,
    startEdit,
    cancelEdit,
    changePackage,
    togglePlatform,
    save,
  };
};

export default usePublisherAdministrationEditor;
