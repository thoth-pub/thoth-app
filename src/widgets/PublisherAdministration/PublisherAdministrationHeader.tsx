'use client';

import { Autocomplete } from '@mui/material';

import type { DistributionJobStatus, DistributionPlatform, ThothPackage } from '@/gql/graphql';
import type { PublisherId } from '@/src/entities/publisher/model/publisher.types';
import { useTypedTranslation } from '@/src/shared/hooks';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import { ContentSection, TextField, TranslatedContent, Typography } from '@/src/shared/ui';

import PublisherAdministrationSpeedDial from './PublisherAdministrationSpeedDial';
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

// APP-02C local presentation fix. On the Publishers surface the multiple-select
// filter controls showed their selected value chips misaligned and clipped
// within the field. Centring the input row's items, letting the chips wrap onto
// further lines, and spacing them with a uniform gap - instead of the default
// per-chip margins that produced the offset - makes multiple selected values sit
// evenly and stay readable, while the field's label, clear control and dropdown
// affordance stay aligned. This is scoped to these Autocomplete instances only:
// it changes no shared TextField, Autocomplete, Chip or global theme, and no
// filter behaviour.
const MULTISELECT_SX = {
  '& .MuiAutocomplete-inputRoot': {
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '4px',
  },
  '& .MuiAutocomplete-inputRoot .MuiChip-root': {
    margin: 0,
  },
} as const;

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
      {/* APP-SHELL-SU-02: the title row carries the page title and nothing else.
          Publisher creation is the fixed speed dial below, matching the
          interaction convention already established on /admin/works.

          The speed dial is mounted from this header, not from the widget, so its
          visibility stays structural rather than a second authorization rule:
          this header only renders once PublisherAdministration has passed the
          existing authoritative-superuser gate, so ordinary and
          not-yet-authoritative users never reach it. The backend remains the
          authorization boundary for the creation itself. */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Typography variant="h1" component="h1">
          <TranslatedContent content="title" namespace={NAMESPACES.enum.publishers} />
        </Typography>
      </div>

      <PublisherAdministrationSpeedDial />

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
          sx={MULTISELECT_SX}
        />

        <Autocomplete
          multiple
          options={packageFilterOptions}
          value={selectedPackages}
          onChange={(_, value) => changeSelectedPackages(value)}
          renderInput={(params) => <TextField {...params} label={t('filterPackages')} />}
          size="small"
          sx={MULTISELECT_SX}
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
            sx={MULTISELECT_SX}
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
            sx={MULTISELECT_SX}
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
