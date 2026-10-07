'use client';

import type { ReactNode } from 'react';

import type { TranslateFunction } from '@/src/shared/parsers';
import { ONIX_SUPPORTED_LICENCES } from '@/src/shared/parsers/XMLParser/onixRights';
import type { OnixWorkLicenceAction } from '@/src/shared/types';
import { Button, Typography } from '@/src/shared/ui';

import { resolvedAnswerLabel, taskTitle } from './decisions';
import { PublicationSummary } from './PublicationSummary';
import type { OnixReviewWork } from './reviewModel';

/** A supported licence, named as the app names it. */
const supportedLicenceLabel = (identity: string) =>
  ONIX_SUPPORTED_LICENCES.find((licence) => licence.identity === identity)?.label ?? identity;

/** What a Work's licence comes to, said plainly; null where nothing is worth a line of the summary yet. */
const licenceText = (
  action: OnixWorkLicenceAction['action'] | null,
  target: OnixReviewWork['target'],
  translate: TranslateFunction,
): string | null => {
  if (action === null) return null;

  switch (action.kind) {
    case 'SET_SUPPORTED_LICENSE':
      return supportedLicenceLabel(action.identity);
    case 'ALREADY_PRESENT':
      return translate('onixPlan.review.summary.licenceAlreadyPresent', {
        licence: supportedLicenceLabel(action.identity),
      });
    case 'EXISTING_PRESERVED':
      return translate('onixPlan.review.summary.licenceKept');
    case 'OMIT_WITH_ACKNOWLEDGED_LOSS':
      return translate('onixPlan.review.summary.licenceOmitted');
    case 'UNSET':
      return target === 'NEW_WORK' ? translate('onixPlan.review.summary.licenceNone') : null;
    case 'BLOCKED':
      return null;
  }
};

type WorkSummaryProps = {
  readonly work: OnixReviewWork;
  /** The title the card shows, for the accessible names of the edit affordances. */
  readonly title: string;
  readonly translate: TranslateFunction;
  /** Opens the task a resolved fact was decided by, so it can be changed through its canonical input. */
  readonly onEdit: (taskKey: string) => void;
};

/**
 * What Thoth will create for one Work, as resolved facts (#179 6036599101 G): its type, edition, licence and cover where
 * each is decided, and each Publication with its identifiers and prices. Nothing undecided is shown here - that waits in
 * the Work's confirmations - and a fact the publisher decided keeps an explicit edit affordance.
 */
export const WorkSummary = ({ work, title, translate, onEdit }: WorkSummaryProps) => {
  const fact = (key: string, value: ReactNode, taskKey: string | null, testId: string) => (
    <div className="contents" data-testid={testId}>
      <dt>{translate(`onixPlan.review.summary.${key}`)}</dt>
      <dd className="flex flex-wrap items-center gap-2">
        <span>{value}</span>
        {taskKey !== null && (
          <Button
            variant="text"
            size="small"
            aria-label={translate('onixPlan.review.summary.edit', {
              fact: translate(`onixPlan.review.summary.${key}`),
              work: title,
            })}
            onClick={() => onEdit(taskKey)}
          >
            {translate('onixPlan.review.summary.editShort')}
          </Button>
        )}
      </dd>
    </div>
  );
  const licence = licenceText(work.licence, work.target, translate);
  // Every other decision the publisher took, named with its answer: the facts above hold the type, edition and
  // prices; this holds the rest, each with the affordance to change it through its canonical input.
  const decided = work.tasks.filter(
    ({ state, control }) =>
      state === 'RESOLVED' &&
      control.kind !== 'WORK_TYPE' &&
      control.kind !== 'EDITION' &&
      control.kind !== 'MANIFESTATION' &&
      control.kind !== 'PRICE',
  );
  const formats = [
    ...new Set(
      work.publications.flatMap(({ type }) => (type === null ? [] : [translate(`onixPlan.publicationType.${type}`)])),
    ),
  ];

  return (
    <div className="flex flex-col gap-3" data-testid="onix-review-summary">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        {work.workType !== null &&
          fact(
            'workType',
            translate(`onixPlan.workType.${work.workType}`),
            work.workTypeTaskKey,
            'onix-review-work-type',
          )}
        {work.edition !== null && fact('edition', String(work.edition), work.editionTaskKey, 'onix-review-edition')}
        {licence !== null && fact('licence', licence, null, 'onix-review-licence')}
        {work.cover !== null &&
          fact(
            'cover',
            translate(
              work.cover === 'FOUND' ? 'onixPlan.review.summary.coverFound' : 'onixPlan.review.summary.coverNone',
            ),
            null,
            'onix-review-cover',
          )}
      </dl>
      {decided.length > 0 && (
        <div className="flex flex-col gap-1">
          <Typography component="h4" variant="body2" className="font-medium">
            {translate('onixPlan.review.summary.decided', { count: decided.length })}
          </Typography>
          <ul className="flex flex-col gap-1" data-testid="onix-review-decided">
            {decided.map((task) => {
              const name = taskTitle(task, translate);

              return (
                <li key={task.key} className="flex flex-wrap items-center gap-2" data-testid="onix-review-decision">
                  <Typography component="span" variant="body2">
                    {name}: {resolvedAnswerLabel(task, translate)}
                  </Typography>
                  <Button
                    variant="text"
                    size="small"
                    aria-label={translate('onixPlan.review.summary.edit', { fact: name, work: title })}
                    onClick={() => onEdit(task.key)}
                  >
                    {translate('onixPlan.review.summary.editShort')}
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <div className="flex flex-col gap-1">
        <Typography component="h4" variant="body2" className="font-medium">
          {translate('onixPlan.review.summary.publications', { count: work.publications.length })}
          {formats.length > 0 && ` · ${formats.join(', ')}`}
        </Typography>
        <ul className="flex flex-col gap-2" data-testid="onix-review-publications">
          {work.publications.map((publication) => (
            <PublicationSummary
              key={publication.productKey}
              publication={publication}
              work={title}
              translate={translate}
              onEdit={onEdit}
            />
          ))}
        </ul>
      </div>
    </div>
  );
};
