'use client';

import type { SyntheticEvent } from 'react';

import { useTypedTranslation } from '@/src/shared/hooks';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import type { TranslateFunction } from '@/src/shared/parsers';
import { Tab, Tabs } from '@/src/shared/ui';

import type { OnixImportReviewModel, OnixReviewFilter } from './reviewModel';

export const REVIEW_FILTERS: readonly OnixReviewFilter[] = ['ATTENTION', 'READY', 'ALL'];

type ImportPlanNavigationProps = {
  readonly model: OnixImportReviewModel;
  readonly value: OnixReviewFilter;
  readonly onChange: (filter: OnixReviewFilter) => void;
};

/**
 * Which Works of a many-Work file are shown (#179 6036599101 G): those needing attention, those ready, or all. Each tab
 * names its count, so the state of the file is read, not inferred from colour; the arrow keys move between them.
 */
export const ImportPlanNavigation = ({ model, value, onChange }: ImportPlanNavigationProps) => {
  const { t } = useTypedTranslation({ namespace: NAMESPACES.enum.common });
  const translate = t as TranslateFunction;
  const { totals } = model;
  const counts: Readonly<Record<OnixReviewFilter, number>> = {
    ATTENTION: totals.worksNeedingAttention,
    READY: totals.works - totals.worksNeedingAttention,
    ALL: totals.works,
  };

  return (
    <Tabs
      value={value}
      onChange={(_event: SyntheticEvent, next: OnixReviewFilter) => onChange(next)}
      aria-label={translate('onixPlan.review.filter.label')}
      indicatorColor="primary"
      textColor="inherit"
      variant="scrollable"
      scrollButtons="auto"
      allowScrollButtonsMobile
      selectionFollowsFocus
      data-testid="onix-review-navigation"
    >
      {REVIEW_FILTERS.map((filter, index) => (
        <Tab
          key={filter}
          value={filter}
          index={index}
          label={translate(`onixPlan.review.filter.${filter}`, { count: counts[filter] })}
        />
      ))}
    </Tabs>
  );
};
