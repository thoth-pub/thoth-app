'use client';

import { Typography } from '@mui/material';

import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import { Chip, ContentWrapper, FormFieldLabel, Skeleton, TranslatedContent } from '@/src/shared/ui';

import useDistributionPlatformOptions from '../../api/hooks/useDistributionPlatformOptions';
import usePublisherServiceConfiguration from '../../api/hooks/usePublisherServiceConfiguration';
import usePublisherStateMachine from '../../store/hooks/usePublisherStateMachine';

// APP-01A: read-only presentation of the active publisher's service configuration.
// Every value is backend-provided; the component never derives capabilities from
// the package, never infers platform eligibility or linkage, and never turns an
// error or absence into a fabricated configuration. It exposes no edit controls
// for any user, including superusers (editing belongs to APP-01B).
const PublisherServiceConfiguration = () => {
  const { activePublisher } = usePublisherStateMachine();
  const publisherId = activePublisher?.id ?? '';

  const { serviceConfiguration, isLoading, error } = usePublisherServiceConfiguration(publisherId);
  const { distributionPlatformOptions } = useDistributionPlatformOptions();

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

  const { subscriptionPackage, effectiveCapabilities, enabledDistributionPlatforms } = serviceConfiguration;

  return (
    <>
      <ContentWrapper>
        <FormFieldLabel component="div" label="subscriptionPackage" namespace={NAMESPACES.enum.profile} />
        <Typography>{subscriptionPackage}</Typography>
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
        {enabledDistributionPlatforms.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {enabledDistributionPlatforms.map((assignment) => {
              // Backend-provided display label only; fall back to the backend
              // platform code if the option is missing. No name-based inference.
              const displayLabel =
                distributionPlatformOptions?.find((option) => option.platform === assignment.platform)?.displayLabel ??
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
    </>
  );
};

export default PublisherServiceConfiguration;
