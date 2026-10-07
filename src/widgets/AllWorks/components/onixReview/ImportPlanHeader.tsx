'use client';

import { useTypedTranslation } from '@/src/shared/hooks';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import type { TranslateFunction } from '@/src/shared/parsers';
import { Typography } from '@/src/shared/ui';

import { SeverityLabel } from '../OnixValidationStatus';
import type { OnixImportReviewModel } from './reviewModel';

type ImportPlanHeaderProps = {
  readonly model: OnixImportReviewModel;
  /** The id the surrounding region is labelled by. */
  readonly headingId: string;
};

/**
 * What the file comes to, in one glance (#179 6036599101 G-H): how many Works and Publications, whether the import can
 * proceed, how many confirmations are still the publisher's and how many problems only the file can resolve - and,
 * folded away, the compact reassurance of what Thoth handled by itself. Every state is said in words beside its icon.
 */
export const ImportPlanHeader = ({ model, headingId }: ImportPlanHeaderProps) => {
  const { t } = useTypedTranslation({ namespace: NAMESPACES.enum.common });
  const translate = t as TranslateFunction;
  const { totals, automatic, executable, createsSomething } = model;
  const handled = automatic.reduce((count, { count: items }) => count + items, 0);

  return (
    <header className="flex flex-col gap-2" data-testid="onix-review-header">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Typography id={headingId} component="h2" className="font-semibold">
          {translate('onixPlan.review.heading')}
        </Typography>
        <Typography component="p" variant="body2" data-testid="onix-review-counts">
          {[
            translate('onixPlan.review.works', { count: totals.works }),
            translate('onixPlan.review.publications', { count: totals.publications }),
          ].join(' · ')}
        </Typography>
      </div>
      <div data-testid="onix-plan-status" className="flex flex-wrap items-center gap-2">
        <SeverityLabel severity={executable ? 'ready' : 'warning'}>
          {translate(executable ? 'onixPlan.review.status.ready' : 'onixPlan.review.status.attention')}
        </SeverityLabel>
        <Typography component="p">
          {executable
            ? translate(createsSomething ? 'onixPlan.review.ready' : 'onixPlan.review.nothingToCreate')
            : [
                ...(totals.requiredConfirmations > 0
                  ? [
                      `${translate('onixPlan.review.confirmations', { count: totals.requiredConfirmations })} ${translate(
                        'onixPlan.review.acrossWorks',
                        { count: totals.worksNeedingAttention },
                      )}`,
                    ]
                  : []),
                ...(totals.problems > 0 ? [translate('onixPlan.review.problems', { count: totals.problems })] : []),
              ].join(' ')}
        </Typography>
      </div>
      {handled > 0 && (
        <details data-testid="onix-review-automatic">
          <summary>
            <Typography component="span" variant="body2">
              {translate('onixPlan.review.automatic.heading', { count: handled })}
            </Typography>
          </summary>
          <ul className="flex list-disc flex-col gap-1 pl-6">
            {automatic.map(({ kind, count }) => (
              <li key={kind}>
                <Typography variant="body2">{translate(`onixPlan.review.automatic.${kind}`, { count })}</Typography>
              </li>
            ))}
          </ul>
        </details>
      )}
    </header>
  );
};
