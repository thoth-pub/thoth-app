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

// APP-02C / APP-PUBLISHER-FILTER-ALIGN-01 / -02 local presentation fixes. On
// the Publishers surface the multiple-select filter controls showed their
// selected value chips vertically offset and clipped within the field.
//
// The shared TextField theme sizes a field by giving both the input row and the
// `.MuiInputBase-input` inside it the whole control height - 2rem, 2.75rem from
// 1280px. That is right for a single-line field, where the input *is* the row.
// In a multiple Autocomplete the input is instead one flex sibling among the
// selected chips, so a sibling carrying the whole control height out-sizes the
// row it sits in, and a row fixed to that height cannot grow for the chips
// either: between them that is what pushed the chips off-centre and clipped
// them.
//
// So, locally and only for these filters: the row keeps its centred, wrapping,
// evenly spaced chips (which carry no margins of their own) and is sized by its
// content, with the shared control height kept as a floor rather than as a
// fixed height - an empty or single-row control still looks like every other
// small field, and only a genuinely wrapped selection grows it. The inner text
// input takes its content height, so it stops distorting the row. The retained
// MUI small outlined root padding is asymmetric but still totals 12px: moving
// 2.5px from the top to the bottom aligns the content with the notched
// outline's measured visual centre (`top: -5px; bottom: 0`). The end adornment
// uses the same derived 2.5px shift because MUI otherwise centres it on the
// geometric input root. The row selectors name one extra MUI class so they
// outrank the shared theme's own field-height rules; no negative margins,
// repositioning transforms or fixed positioning are introduced.
//
// This changes no shared TextField, Autocomplete, Chip or global theme, no other
// field on this page - the native back-catalogue job select included - and no
// filter behaviour.
const MULTISELECT_SX = {
  '& .MuiAutocomplete-inputRoot.MuiInputBase-root': {
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '4px',
    height: 'auto',
    minHeight: '2rem',
    paddingTop: '3.5px',
    paddingBottom: '8.5px',

    '@media (min-width: 1280px)': {
      minHeight: '2.75rem',
    },
  },
  '& .MuiAutocomplete-inputRoot .MuiChip-root': {
    margin: 0,
  },
  '& .MuiAutocomplete-inputRoot .MuiAutocomplete-input': {
    height: 'auto',
  },
  '& .MuiAutocomplete-endAdornment': {
    top: 'calc(50% - 2.5px)',
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
