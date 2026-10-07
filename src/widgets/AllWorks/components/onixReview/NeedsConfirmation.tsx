'use client';

import { useId } from 'react';

import type { TranslateFunction } from '@/src/shared/parsers';
import { Button, Typography } from '@/src/shared/ui';

import { TaskDecision, taskTitle } from './decisions';
import type { OnixReviewTask, OnixReviewWork } from './reviewModel';

type NeedsConfirmationProps = {
  readonly work: OnixReviewWork;
  /** The title the card shows, for the accessible names of every control. */
  readonly title: string;
  /** The decisions the publisher still has to take, and the resolved ones they opened to change. */
  readonly tasks: readonly OnixReviewTask[];
  /** Adjustments the plan does not wait on: offered apart, and never counted. */
  readonly optional: readonly OnixReviewTask[];
  /** The resolved tasks currently open for change. */
  readonly editing: readonly string[];
  readonly translate: TranslateFunction;
  readonly onAnswer: (task: OnixReviewTask, value: string | undefined) => void;
  readonly onDone: (taskKey: string) => void;
};

/**
 * Every decision of one Work that is still the publisher's, in one place (#179 6036599101 G): each named for what it
 * decides, each writing its answer to its canonical input. A decision taken leaves this section for the summary; one
 * reopened from the summary returns here until it is closed again.
 */
export const NeedsConfirmation = ({
  work,
  title,
  tasks,
  optional,
  editing,
  translate,
  onAnswer,
  onDone,
}: NeedsConfirmationProps) => {
  const headingId = useId();
  const required = tasks.filter(({ state, required: waits }) => waits && state !== 'RESOLVED').length;

  if (tasks.length === 0 && optional.length === 0) return null;

  const item = (task: OnixReviewTask) => {
    const open = editing.includes(task.key);

    return (
      <li key={task.key} data-testid="onix-review-task" data-task-state={task.state} className="flex flex-col gap-2">
        <TaskDecision
          task={task}
          work={work}
          workTitle={title}
          translate={translate}
          onAnswer={(value) => onAnswer(task, value)}
        />
        {open && (
          <div>
            <Button
              variant="text"
              size="small"
              aria-label={translate('onixPlan.review.confirmation.doneLabel', { task: taskTitle(task, translate) })}
              onClick={() => onDone(task.key)}
            >
              {translate('onixPlan.review.confirmation.done')}
            </Button>
          </div>
        )}
      </li>
    );
  };

  return (
    <section
      aria-labelledby={headingId}
      data-testid="onix-review-confirmation"
      className="flex flex-col gap-3 rounded border border-(--color-border) p-3"
    >
      {tasks.length > 0 && (
        <>
          <Typography id={headingId} component="h4" className="font-semibold">
            {translate('onixPlan.review.confirmation.heading')}
            {required > 0 && ` (${translate('onixPlan.review.confirmation.count', { count: required })})`}
          </Typography>
          <ul className="flex flex-col gap-4">{tasks.map(item)}</ul>
        </>
      )}
      {optional.length > 0 && (
        <details data-testid="onix-review-optional">
          <summary>
            <Typography component="span" variant="body2">
              {tasks.length === 0 ? (
                <span id={headingId}>
                  {translate('onixPlan.review.confirmation.optional', { count: optional.length })}
                </span>
              ) : (
                translate('onixPlan.review.confirmation.optional', { count: optional.length })
              )}
            </Typography>
          </summary>
          <ul className="flex flex-col gap-4 pt-2">{optional.map(item)}</ul>
        </details>
      )}
    </section>
  );
};
