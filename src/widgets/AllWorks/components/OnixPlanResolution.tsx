'use client';

import { useId, useMemo, useState } from 'react';

import { useTypedTranslation } from '@/src/shared/hooks';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import type { TranslateFunction } from '@/src/shared/parsers';
import type { OnixImportPlanSidecar, OnixPlanInputs } from '@/src/shared/types';
import { Typography } from '@/src/shared/ui';

import { TaskDecision } from './onixReview/decisions';
import { ImportPlanHeader } from './onixReview/ImportPlanHeader';
import { ImportPlanNavigation } from './onixReview/ImportPlanNavigation';
import {
  answerReviewTask,
  buildImportReviewModel,
  filterReviewWorks,
  type OnixImportReviewModel,
  type OnixReviewFilter,
  type OnixReviewPresentationContext,
  type OnixReviewTask,
  type OnixReviewWork,
} from './onixReview/reviewModel';
import { ProblemList, WorkReviewCard } from './onixReview/WorkReviewCard';

type OnixPlanResolutionProps = {
  /** The plan as resolved for the publisher's current decisions, which it carries as `inputs`. */
  readonly sidecar: OnixImportPlanSidecar;
  /** Read-only display context from the same planning run: canonical facts already decided, exact titles. */
  readonly context?: OnixReviewPresentationContext;
  /** Hands on the publisher's next decisions; the caller resolves the plan again from them. */
  readonly onChange: (inputs: OnixPlanInputs) => void;
};

const NO_CONTEXT: OnixReviewPresentationContext = {};

/**
 * A Work the file-level decisions are rendered against: none of them belongs to a Work, so no Publication is named.
 */
const FILE_SCOPE: OnixReviewWork = {
  groupKey: '',
  position: 0,
  title: null,
  target: null,
  existingWorkId: null,
  workType: null,
  workTypeTaskKey: null,
  edition: null,
  editionTaskKey: null,
  licence: null,
  cover: null,
  publications: [],
  tasks: [],
  problems: [],
  state: 'READY',
  requiredConfirmations: 0,
};

type FileSectionProps = {
  readonly model: OnixImportReviewModel;
  readonly translate: TranslateFunction;
  readonly onAnswer: (task: OnixReviewTask, value: string | undefined) => void;
};

/**
 * The decisions and problems that belong to the file rather than to one Work: records Thoth cannot apply, the Thoth
 * compatibility confirmation, an answer to a finding the file does not have, and the blockers no Work owns.
 */
const FileSection = ({ model, translate, onAnswer }: FileSectionProps) => {
  const headingId = useId();
  const { fileTasks, fileProblems } = model;

  if (fileTasks.length === 0 && fileProblems.length === 0) return null;

  return (
    <section
      aria-labelledby={headingId}
      data-testid="onix-review-file"
      className="flex flex-col gap-3 rounded border border-(--color-border) p-4"
    >
      <Typography id={headingId} component="h3" className="font-semibold">
        {translate('onixPlan.review.file.heading')}
      </Typography>
      {fileTasks.length > 0 && (
        <ul className="flex flex-col gap-4" data-testid="onix-review-file-tasks">
          {fileTasks.map((task) => (
            <li key={task.key} data-testid="onix-review-task" data-task-state={task.state}>
              <TaskDecision
                task={task}
                work={FILE_SCOPE}
                workTitle={translate('onixPlan.review.file.heading')}
                translate={translate}
                onAnswer={(value) => onAnswer(task, value)}
              />
            </li>
          ))}
        </ul>
      )}
      <ProblemList problems={fileProblems} work={null} translate={translate} />
    </section>
  );
};

/**
 * The publisher's review of one resolved ONIX Import Plan (thoth-app#262; #179 6036599101 G-K): what Thoth will create,
 * what still needs their confirmation, and whether the import can proceed. One grouped Work is the unit; for a many-Work
 * file the Works needing attention are shown first, and only they are rendered until another view is chosen. Every
 * decision is written to the canonical inputs and resolved again by the caller: nothing here decides a target value, and
 * whether the plan can be previewed stays the resolver's alone.
 */
export const OnixPlanResolution = ({ sidecar, context = NO_CONTEXT, onChange }: OnixPlanResolutionProps) => {
  const { t } = useTypedTranslation({ namespace: NAMESPACES.enum.common });
  const translate = t as TranslateFunction;
  const headingId = useId();
  const model = useMemo(() => buildImportReviewModel(sidecar, context), [sidecar, context]);
  // Opens on the Works needing attention while any does, and stays on the view the publisher is in: a view that
  // empties as the last decision is taken says so rather than changing under them.
  const [chosenFilter, setChosenFilter] = useState<OnixReviewFilter>(() => model.defaultFilter);
  const navigates = model.works.length > 1;
  const filter: OnixReviewFilter = navigates ? chosenFilter : 'ALL';
  // Filtered before anything is rendered: a file of hundreds of ready Works renders only the few needing attention.
  const shown = filterReviewWorks(model.works, filter);
  const decide = (task: Pick<OnixReviewTask, 'input'>, value: string | undefined) =>
    onChange(answerReviewTask(sidecar.inputs, task, value));

  return (
    <section
      aria-labelledby={headingId}
      data-testid="onix-plan-resolution"
      className="flex w-full flex-col gap-4 rounded border border-(--color-border) p-4"
    >
      <ImportPlanHeader model={model} headingId={headingId} />
      <FileSection model={model} translate={translate} onAnswer={decide} />
      {navigates && <ImportPlanNavigation model={model} value={filter} onChange={setChosenFilter} />}
      <div
        role={navigates ? 'tabpanel' : undefined}
        id={navigates ? `full-width-tabpanel-${filter}` : undefined}
        aria-labelledby={navigates ? `full-width-tab-${filter}` : undefined}
        className="flex flex-col gap-3"
        data-testid="onix-review-works"
      >
        {shown.length === 0 ? (
          <Typography component="p">{translate(`onixPlan.review.filter.empty.${filter}`)}</Typography>
        ) : (
          shown.map((work) => <WorkReviewCard key={work.groupKey} work={work} onAnswer={decide} />)
        )}
      </div>
    </section>
  );
};
