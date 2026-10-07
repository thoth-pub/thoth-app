'use client';

import type { TranslateFunction } from '@/src/shared/parsers';
import { Button, Typography } from '@/src/shared/ui';

import type { OnixReviewPublication } from './reviewModel';

/** A price as the review names it: the currency and the amount Thoth will store, nothing of its source qualifiers. */
export const priceLabel = (translate: TranslateFunction, currencyCode: string | null, unitPrice: number) =>
  translate('onixPlan.review.publication.price', { currency: currencyCode ?? '', amount: unitPrice.toFixed(2) });

type PublicationSummaryProps = {
  readonly publication: OnixReviewPublication;
  /** The Work the Publication belongs to, for the accessible names of its edit affordances. */
  readonly work: string;
  readonly translate: TranslateFunction;
  /** Opens the task a resolved fact was decided by, so it can be changed through its canonical input. */
  readonly onEdit: (taskKey: string) => void;
};

/**
 * One Publication as Thoth will create it (#179 6036599101 G): its format, ISBN, what happens to it, and the price of
 * each currency - the one amount the file states, or the one the publisher chose. Nothing unresolved is decided here;
 * a fact the publisher decided, or may still change, keeps an explicit edit affordance.
 */
export const PublicationSummary = ({ publication, work, translate, onEdit }: PublicationSummaryProps) => {
  const { label, isbn, type, action, prices, manifestationTaskKey } = publication;
  const context = `${label}${isbn === null ? '' : ` ${isbn}`}`.trim();
  const editLabel = (fact: string) =>
    translate('onixPlan.review.publication.edit', {
      fact: translate(`onixPlan.review.publication.fact.${fact}`),
      publication: context,
      work,
    });

  return (
    <li data-testid="onix-review-publication" className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Typography component="span" className="font-medium">
          {type === null
            ? translate('onixPlan.review.publication.untyped')
            : translate(`onixPlan.publicationType.${type}`)}
        </Typography>
        <Typography component="span" variant="body2">
          {isbn ?? translate('onixPlan.review.publication.noIsbn')}
        </Typography>
        <Typography component="span" variant="body2">
          {translate(`onixPlan.review.publication.action.${action}`)}
        </Typography>
        {manifestationTaskKey !== null && (
          <Button
            variant="text"
            size="small"
            aria-label={editLabel('format')}
            onClick={() => onEdit(manifestationTaskKey)}
          >
            {translate('onixPlan.review.summary.editShort')}
          </Button>
        )}
      </div>
      {prices.length > 0 && (
        <ul className="flex flex-wrap gap-x-3 gap-y-1" data-testid="onix-review-prices">
          {prices.map((price) => (
            <li key={`${price.currencyCode ?? ''}|${price.taskKey ?? ''}`} className="flex items-center gap-1">
              <Typography component="span" variant="body2">
                {price.unitPrice === null
                  ? translate('onixPlan.review.publication.noPrice', { currency: price.currencyCode ?? '' })
                  : priceLabel(translate, price.currencyCode, price.unitPrice)}
              </Typography>
              {price.taskKey !== null && (
                <Button
                  variant="text"
                  size="small"
                  aria-label={editLabel('price')}
                  onClick={() => price.taskKey !== null && onEdit(price.taskKey)}
                >
                  {translate('onixPlan.review.summary.editShort')}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
};
