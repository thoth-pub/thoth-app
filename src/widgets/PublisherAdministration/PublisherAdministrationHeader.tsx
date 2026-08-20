'use client';

import { Autocomplete } from '@mui/material';

import type { DistributionJobStatus, DistributionPlatform, ThothPackage } from '@/gql/graphql';
import type { PublisherId } from '@/src/entities/publisher/model/publisher.types';
import { useTypedTranslation } from '@/src/shared/hooks';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import { ContentSection, TextField, TranslatedContent, Typography } from '@/src/shared/ui';

import type { JobPresenceFilter } from './usePublisherAdministration';

type PublisherFilterOption = {
  id: PublisherId;
  name: string;
};

type PublisherAdministrationHeaderProps = {
  selectedPublisherIds: PublisherId[];
  changeSelectedPublisherIds: (publisherIds: PublisherId[]) => void;
  selectedPackages: ThothPackage[];
  changeSelectedPackages: (packages: ThothPackage[]) => void;
  selectedPlatforms: DistributionPlatform[];
  changeSelectedPlatforms: (platforms: DistributionPlatform[]) => void;
  selectedJobStatuses: DistributionJobStatus[];
  changeSelectedJobStatuses: (jobStatuses: DistributionJobStatus[]) => void;
  jobPresence: JobPresenceFilter;
  changeJobPresence: (presence: JobPresenceFilter) => void;
  publisherFilterOptions: PublisherFilterOption[];
  packageFilterOptions: ThothPackage[];
  platformFilterOptions: DistributionPlatform[];
  jobStatusFilterOptions: DistributionJobStatus[];
  getPlatformDisplayLabel: (platform: DistributionPlatform) => string;
};

const JOB_PRESENCE_VALUES: JobPresenceFilter[] = ['all', 'withoutJob', 'withJob'];

const JOB_PRESENCE_LABEL_KEYS: Record<JobPresenceFilter, string> = {
  all: 'jobPresenceAll',
  withoutJob: 'jobPresenceWithout',
  withJob: 'jobPresenceWith',
};

// Server-backed filter controls for the staff publisher index (APP-02A). Each
// control only collects exact backend values; the semantics (platform
// narrowing, job-status widening, tri-state job presence) live in the report
// contract and are surfaced here as hints, never reinterpreted client-side.
const PublisherAdministrationHeader = (props: PublisherAdministrationHeaderProps) => {
  const {
    selectedPublisherIds,
    changeSelectedPublisherIds,
    selectedPackages,
    changeSelectedPackages,
    selectedPlatforms,
    changeSelectedPlatforms,
    selectedJobStatuses,
    changeSelectedJobStatuses,
    jobPresence,
    changeJobPresence,
    publisherFilterOptions,
    packageFilterOptions,
    platformFilterOptions,
    jobStatusFilterOptions,
    getPlatformDisplayLabel,
  } = props;

  const { t } = useTypedTranslation({ namespace: NAMESPACES.enum.publishers });

  const selectedPublisherOptions = publisherFilterOptions.filter((option) =>
    selectedPublisherIds.includes(option.id),
  );

  return (
    <ContentSection>
      <div className="flex items-center justify-between gap-2">
        <Typography variant="h1" component="h1">
          <TranslatedContent content="title" namespace={NAMESPACES.enum.publishers} />
        </Typography>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Autocomplete
          multiple
          options={publisherFilterOptions}
          getOptionLabel={(option) => option.name}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          value={selectedPublisherOptions}
          onChange={(_, value) => changeSelectedPublisherIds(value.map((option) => option.id))}
          renderInput={(params) => <TextField {...params} label={t('filterPublisher')} />}
          size="small"
        />

        <Autocomplete
          multiple
          options={packageFilterOptions}
          value={selectedPackages}
          onChange={(_, value) => changeSelectedPackages(value)}
          renderInput={(params) => <TextField {...params} label={t('filterPackages')} />}
          size="small"
        />

        <div className="flex flex-col gap-1">
          <Autocomplete
            multiple
            options={platformFilterOptions}
            getOptionLabel={(option) => getPlatformDisplayLabel(option)}
            value={selectedPlatforms}
            onChange={(_, value) => changeSelectedPlatforms(value)}
            renderInput={(params) => <TextField {...params} label={t('filterEnabledPlatforms')} />}
            size="small"
          />
          <Typography variant="caption">
            <TranslatedContent content="filterEnabledPlatformsHint" namespace={NAMESPACES.enum.publishers} />
          </Typography>
        </div>

        <div className="flex flex-col gap-1">
          <Autocomplete
            multiple
            options={jobStatusFilterOptions}
            value={selectedJobStatuses}
            onChange={(_, value) => changeSelectedJobStatuses(value)}
            renderInput={(params) => <TextField {...params} label={t('filterJobStatuses')} />}
            size="small"
          />
          <Typography variant="caption">
            <TranslatedContent content="filterJobStatusesHint" namespace={NAMESPACES.enum.publishers} />
          </Typography>
        </div>

        <TextField
          select
          label={t('filterJobPresence')}
          value={jobPresence}
          onChange={(event) => changeJobPresence(event.target.value as JobPresenceFilter)}
          slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
          size="small"
        >
          {JOB_PRESENCE_VALUES.map((presence) => (
            <option key={presence} value={presence}>
              {t(JOB_PRESENCE_LABEL_KEYS[presence])}
            </option>
          ))}
        </TextField>
      </div>
    </ContentSection>
  );
};

export default PublisherAdministrationHeader;
