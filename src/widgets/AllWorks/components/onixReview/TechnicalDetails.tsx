'use client';

import type { TranslateFunction } from '@/src/shared/parsers';
import { Typography } from '@/src/shared/ui';

import type { OnixReviewEvidence } from './reviewModel';

type TechnicalDetailsProps = {
  readonly evidence: OnixReviewEvidence;
  readonly translate: TranslateFunction;
};

/** A structured detail value as the technical details show it: text as it is, a list joined. */
const detailValue = (value: string | number | readonly string[]): string =>
  Array.isArray(value) ? value.join(', ') : String(value);

/**
 * The evidence one decision or problem rests on (#179 6036599101 H): its finding code and classification, where in
 * the file it is stated, the exact values the planner recorded, and the planner's own note. Secondary by design, behind
 * a native disclosure that is keyboard-operable and announces its state; never the primary copy, and never a ledger of
 * every finding the plan holds.
 */
export const TechnicalDetails = ({ evidence, translate }: TechnicalDetailsProps) => {
  const entries = Object.entries(evidence.detail).filter(([, value]) => !Array.isArray(value) || value.length > 0);

  return (
    <details data-testid="onix-review-technical" className="text-sm">
      <summary className="cursor-pointer">
        <Typography component="span" variant="body2">
          {translate('onixPlan.review.technical.heading')}
        </Typography>
      </summary>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        <dt>{translate('onixPlan.review.technical.code')}</dt>
        <dd className="break-all">{evidence.code}</dd>
        {evidence.classification !== null && (
          <>
            <dt>{translate('onixPlan.review.technical.classification')}</dt>
            <dd>{translate(`onixPlan.classification.${evidence.classification}`)}</dd>
          </>
        )}
        {evidence.findingKey !== null && (
          <>
            <dt>{translate('onixPlan.review.technical.finding')}</dt>
            <dd className="break-all">{evidence.findingKey}</dd>
          </>
        )}
        {evidence.locations.length > 0 && (
          <>
            <dt>{translate('onixPlan.review.technical.locations', { count: evidence.locations.length })}</dt>
            <dd>
              <ul className="flex list-disc flex-col gap-1 pl-4">
                {evidence.locations.map(({ path, sourcePath }) => (
                  <li key={path} className="break-all">
                    {sourcePath}
                  </li>
                ))}
              </ul>
            </dd>
          </>
        )}
        {entries.length > 0 && (
          <>
            <dt>{translate('onixPlan.review.technical.detail')}</dt>
            <dd>
              <ul className="flex list-disc flex-col gap-1 pl-4">
                {entries.map(([key, value]) => (
                  <li key={key} className="break-all">
                    {key}: {detailValue(value)}
                  </li>
                ))}
              </ul>
            </dd>
          </>
        )}
        {evidence.values.length > 0 && (
          <>
            <dt>{translate('onixPlan.review.technical.values')}</dt>
            <dd>
              <ul className="flex list-disc flex-col gap-1 pl-4">
                {evidence.values.map((value) => (
                  <li key={value} className="break-all">
                    {value}
                  </li>
                ))}
              </ul>
            </dd>
          </>
        )}
        {evidence.message !== null && evidence.message.length > 0 && (
          <>
            <dt>{translate('onixPlan.review.technical.message')}</dt>
            <dd>{evidence.message}</dd>
          </>
        )}
      </dl>
    </details>
  );
};
