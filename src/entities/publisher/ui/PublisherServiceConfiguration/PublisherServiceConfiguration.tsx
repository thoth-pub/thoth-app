'use client';

import { FormControlLabel, Typography } from '@mui/material';
import { useState } from 'react';

import {
  type BackCatalogueBehaviour,
  DistributionPlatform,
  type DistributionPlatformGroup,
  type ReplacePublisherServiceConfigurationInput,
  ThothPackage,
} from '@/gql/graphql';
import { useUser } from '@/src/entities/user';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import {
  Button,
  Checkbox,
  Chip,
  ContentWrapper,
  FormFieldLabel,
  Skeleton,
  TextField,
  TranslatedContent,
} from '@/src/shared/ui';

import useDistributionPlatformOptions from '../../api/hooks/useDistributionPlatformOptions';
import usePublisherServiceConfiguration from '../../api/hooks/usePublisherServiceConfiguration';
import useReplacePublisherServiceConfiguration, {
  DISTRIBUTION_JOB_CREATION_DISABLED,
  getServiceConfigurationErrorType,
  STALE_SERVICE_CONFIGURATION,
} from '../../api/hooks/useReplacePublisherServiceConfiguration';
import usePublisherStateMachine from '../../store/hooks/usePublisherStateMachine';

const SUBSCRIPTION_PACKAGE_FIELD_ID = 'publisher_subscription_package';

// One edit attempt. `expectedUpdatedAt` is the exact version token of the
// configuration the session was initialized from and is never recomputed,
// defaulted or reused across attempts.
type EditSession = {
  expectedUpdatedAt: ReplacePublisherServiceConfigurationInput['expectedUpdatedAt'];
  subscriptionPackage: ThothPackage;
  enabledPlatforms: DistributionPlatform[];
};

type SaveOutcome =
  | { kind: 'saved' }
  | { kind: 'stale' }
  | { kind: 'jobCreationDisabled' }
  | { kind: 'failed'; message: string };

type PlatformRow = {
  platform: DistributionPlatform;
  displayLabel: string;
  assignable: boolean;
  linkedGroup?: DistributionPlatformGroup | null;
  backCatalogueBehaviour?: BackCatalogueBehaviour | null;
};

// Presentation of the active publisher's service configuration.
//
// Every value is backend-provided: the component never derives capabilities from
// the package, never infers platform eligibility or linkage, and never turns an
// error or absence into a fabricated configuration. Ordinary publishers keep the
// APP-01A read-only view; superusers additionally get a bounded Edit -> Save /
// Cancel session (APP-01B). Superuser visibility is a presentation affordance
// only - the backend remains the authorization boundary.
const PublisherServiceConfiguration = () => {
  const { activePublisher } = usePublisherStateMachine();
  const publisherId = activePublisher?.id ?? '';

  const { serviceConfiguration, isLoading, error } = usePublisherServiceConfiguration(publisherId);
  const { distributionPlatformOptions } = useDistributionPlatformOptions();
  const { user } = useUser();
  const { replaceServiceConfiguration, loading } = useReplacePublisherServiceConfiguration(publisherId);

  const [editSession, setEditSession] = useState<EditSession | null>(null);
  const [outcome, setOutcome] = useState<SaveOutcome | null>(null);

  if (!activePublisher) return null;

  if (isLoading) {
    return (
      <ContentWrapper>
        <Skeleton variant="rounded" height={96} />
      </ContentWrapper>
    );
  }

  // Truthful failure state: on authorization/API error, or when no configuration
  // was returned, show that it is unavailable rather than inventing state.
  if (error || !serviceConfiguration) {
    return (
      <ContentWrapper>
        <Typography>
          <TranslatedContent content="serviceConfigurationUnavailable" namespace={NAMESPACES.enum.profile} />
        </Typography>
      </ContentWrapper>
    );
  }

  const { subscriptionPackage, effectiveCapabilities, enabledDistributionPlatforms, updatedAt } = serviceConfiguration;
  const enabledPlatforms = enabledDistributionPlatforms.map((assignment) => assignment.platform);

  const platformOptions = distributionPlatformOptions ?? [];

  // Editor rows come from the backend option list. A platform that is currently
  // enabled but absent from that list is still shown so an edit cannot silently
  // drop it; missing metadata is not an assertion that it may be assigned, so it
  // stays removable but not re-selectable.
  const platformRows: PlatformRow[] = [
    ...platformOptions,
    ...enabledPlatforms
      .filter((platform) => !platformOptions.some((option) => option.platform === platform))
      .map((platform) => ({ platform, displayLabel: platform, assignable: false })),
  ];

  const isSuperuser = user.isSuperuser;
  const isEditing = editSession !== null;

  const handleEdit = () => {
    setOutcome(null);
    setEditSession({
      expectedUpdatedAt: updatedAt,
      subscriptionPackage,
      enabledPlatforms: [...enabledPlatforms],
    });
  };

  const handleCancel = () => {
    setEditSession(null);
    setOutcome(null);
  };

  // Package and platform selection are independent. The backend owns package
  // capability semantics, so changing the package never rewrites platform state.
  const handlePackageChange = (value: ThothPackage) => {
    setEditSession((session) => (session ? { ...session, subscriptionPackage: value } : session));
  };

  // Exactly the toggled platform changes. No linked-group closure is applied
  // locally: the complete desired set is submitted and the server-normalized
  // response wins.
  const handlePlatformToggle = (platform: DistributionPlatform, selected: boolean) => {
    setEditSession((session) => {
      if (!session) return session;

      return {
        ...session,
        enabledPlatforms: selected
          ? [...session.enabledPlatforms, platform]
          : session.enabledPlatforms.filter((enabled) => enabled !== platform),
      };
    });
  };

  const handleSave = async () => {
    if (!editSession) return;

    setOutcome(null);

    try {
      await replaceServiceConfiguration({
        publisherId,
        subscriptionPackage: editSession.subscriptionPackage,
        enabledDistributionPlatforms: editSession.enabledPlatforms,
        expectedUpdatedAt: editSession.expectedUpdatedAt,
      });

      // Success is reported only once the mutation has resolved. The displayed
      // configuration comes from the query state the hook replaced with the exact
      // server-normalized response, never from this edit session.
      setEditSession(null);
      setOutcome({ kind: 'saved' });
    } catch (saveError) {
      const errorType = getServiceConfigurationErrorType(saveError);

      // The configuration moved on since it was loaded. The hook has refetched it;
      // discard this session so a new one must be started against the fresh token.
      if (errorType === STALE_SERVICE_CONFIGURATION) {
        setEditSession(null);
        setOutcome({ kind: 'stale' });

        return;
      }

      // The backend rolled the whole activation back and created no job. Nothing
      // was saved, and no pending or synthetic job state may be shown.
      if (errorType === DISTRIBUTION_JOB_CREATION_DISABLED) {
        setEditSession(null);
        setOutcome({ kind: 'jobCreationDisabled' });

        return;
      }

      // Unclassified failure: nothing was written to the cache, so the last
      // server-backed configuration remains displayed and authoritative.
      setOutcome({ kind: 'failed', message: saveError instanceof Error ? saveError.message : '' });
    }
  };

  return (
    <>
      <ContentWrapper>
        <FormFieldLabel
          component={isEditing ? 'label' : 'div'}
          id={isEditing ? SUBSCRIPTION_PACKAGE_FIELD_ID : undefined}
          label="subscriptionPackage"
          namespace={NAMESPACES.enum.profile}
        />
        {isEditing ? (
          <TextField
            select
            id={SUBSCRIPTION_PACKAGE_FIELD_ID}
            value={editSession.subscriptionPackage}
            disabled={loading}
            onChange={(event) => handlePackageChange(event.target.value as ThothPackage)}
            slotProps={{ select: { native: true } }}
          >
            {/* Package choices come from the generated contract enum; there is no
                local package-to-capability lookup. */}
            {Object.values(ThothPackage).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </TextField>
        ) : (
          <Typography>{subscriptionPackage}</Typography>
        )}
      </ContentWrapper>

      <ContentWrapper>
        <FormFieldLabel component="div" label="capabilities" namespace={NAMESPACES.enum.profile} />
        {effectiveCapabilities.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {effectiveCapabilities.map((capability) => (
              <Chip key={capability} label={capability} />
            ))}
          </div>
        ) : (
          <Typography>
            <TranslatedContent content="noCapabilities" namespace={NAMESPACES.enum.profile} />
          </Typography>
        )}
      </ContentWrapper>

      <ContentWrapper>
        <FormFieldLabel component="div" label="distributionPlatforms" namespace={NAMESPACES.enum.profile} />
        {isEditing ? (
          <div className="flex flex-col gap-2">
            <Typography variant="body2">
              <TranslatedContent content="linkedGroupNotice" namespace={NAMESPACES.enum.profile} />
            </Typography>
            {platformRows.map((row) => {
              const isSelected = editSession.enabledPlatforms.includes(row.platform);
              // Backend assignability, used directly: a non-assignable platform can
              // only be interacted with while it is still selected, so it can be
              // removed but never (re-)added.
              const isSelectable = row.assignable || isSelected;

              return (
                <div key={row.platform} className="flex flex-col">
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={isSelected}
                        disabled={loading || !isSelectable}
                        onChange={(event) => handlePlatformToggle(row.platform, event.target.checked)}
                      />
                    }
                    label={row.displayLabel}
                  />
                  <div className="flex flex-wrap gap-2 pl-8">
                    {!row.assignable && (
                      <Typography variant="caption">
                        <TranslatedContent
                          content="distributionPlatformNotAssignable"
                          namespace={NAMESPACES.enum.profile}
                        />
                      </Typography>
                    )}
                    {row.linkedGroup && (
                      <Typography variant="caption">
                        <TranslatedContent content="linkedGroupLabel" namespace={NAMESPACES.enum.profile} />
                        {`: ${row.linkedGroup}`}
                      </Typography>
                    )}
                    {row.backCatalogueBehaviour && (
                      <Typography variant="caption">
                        <TranslatedContent content="backCatalogueBehaviour" namespace={NAMESPACES.enum.profile} />
                        {`: ${row.backCatalogueBehaviour}`}
                      </Typography>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : enabledDistributionPlatforms.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {enabledDistributionPlatforms.map((assignment) => {
              // Backend-provided display label only; fall back to the backend
              // platform code if the option is missing. No name-based inference.
              const displayLabel =
                platformOptions.find((option) => option.platform === assignment.platform)?.displayLabel ??
                assignment.platform;

              return <Chip key={assignment.platform} label={displayLabel} />;
            })}
          </div>
        ) : (
          <Typography>
            <TranslatedContent content="noDistributionPlatforms" namespace={NAMESPACES.enum.profile} />
          </Typography>
        )}
      </ContentWrapper>

      {isSuperuser && (
        <ContentWrapper>
          {isEditing ? (
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={loading}>
                <TranslatedContent content="saveServiceConfiguration" namespace={NAMESPACES.enum.profile} />
              </Button>
              <Button onClick={handleCancel} disabled={loading}>
                <TranslatedContent content="cancelServiceConfigurationEdit" namespace={NAMESPACES.enum.profile} />
              </Button>
            </div>
          ) : (
            <Button onClick={handleEdit}>
              <TranslatedContent content="editServiceConfiguration" namespace={NAMESPACES.enum.profile} />
            </Button>
          )}

          {outcome && (
            <Typography role="status">
              {outcome.kind === 'saved' && (
                <TranslatedContent content="serviceConfigurationSaved" namespace={NAMESPACES.enum.profile} />
              )}
              {outcome.kind === 'stale' && (
                <TranslatedContent content="serviceConfigurationStale" namespace={NAMESPACES.enum.profile} />
              )}
              {outcome.kind === 'jobCreationDisabled' && (
                <TranslatedContent
                  content="serviceConfigurationJobCreationDisabled"
                  namespace={NAMESPACES.enum.profile}
                />
              )}
              {outcome.kind === 'failed' && (
                <>
                  <TranslatedContent content="serviceConfigurationSaveFailed" namespace={NAMESPACES.enum.profile} />
                  {outcome.message.length > 0 && `: ${outcome.message}`}
                </>
              )}
            </Typography>
          )}
        </ContentWrapper>
      )}
    </>
  );
};

export default PublisherServiceConfiguration;
