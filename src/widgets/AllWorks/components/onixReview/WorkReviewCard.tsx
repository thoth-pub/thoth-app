'use client';

import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import Box from '@mui/material/Box';
import { useId } from 'react';

import { useTypedTranslation } from '@/src/shared/hooks';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import type { TranslateFunction } from '@/src/shared/parsers';
import { Typography } from '@/src/shared/ui';

import { SeverityLabel } from '../OnixValidationStatus';
import type { OnixReviewWork } from './reviewModel';

type WorkReviewCardProps = {
  readonly work: OnixReviewWork;
};

/** A Work's state, said in words beside its icon: never by colour alone. */
const WorkStateLabel = ({ work, translate }: { work: OnixReviewWork; translate: TranslateFunction }) => {
  if (work.state === 'BLOCKED') {
    return (
      <Box
        component="span"
        sx={{ bgcolor: 'error.main', color: 'common.white' }}
        className="inline-flex items-center gap-1 rounded px-2 py-0.5 font-semibold"
      >
        <ErrorOutlineIcon fontSize="inherit" aria-hidden />
        {translate('onixPlan.review.work.state.BLOCKED')}
      </Box>
    );
  }

  return (
    <SeverityLabel severity={work.state === 'READY' ? 'ready' : 'warning'}>
      {translate(`onixPlan.review.work.state.${work.state}`)}
    </SeverityLabel>
  );
};

/**
 * One grouped Work, the unit of the review (#179 6036599101 G): its title or a neutral position, what Thoth does with
 * it, and - in the tasks that follow - its resolved facts, the decisions still the publisher's, and its problems.
 */
export const WorkReviewCard = ({ work }: WorkReviewCardProps) => {
  const { t } = useTypedTranslation({ namespace: NAMESPACES.enum.common });
  const translate = t as TranslateFunction;
  const titleId = useId();
  const title = work.title ?? translate('onixPlan.review.work.fallbackTitle', { position: work.position });

  return (
    <article
      aria-labelledby={titleId}
      data-testid="onix-review-work"
      data-state={work.state}
      className="flex flex-col gap-3 rounded border border-(--color-border) p-4"
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <Typography id={titleId} component="h3" className="font-semibold">
          {title}
        </Typography>
        <div className="flex flex-wrap items-center gap-2">
          <Typography component="span" variant="body2">
            {translate(`onixPlan.review.work.target.${work.target ?? 'UNRESOLVED'}`)}
          </Typography>
          <WorkStateLabel work={work} translate={translate} />
        </div>
      </header>
      <Typography component="p" variant="body2">
        {translate('onixPlan.review.work.publications', { count: work.publications.length })}
        {work.requiredConfirmations > 0 &&
          ` · ${translate('onixPlan.review.work.confirmations', { count: work.requiredConfirmations })}`}
      </Typography>
    </article>
  );
};
