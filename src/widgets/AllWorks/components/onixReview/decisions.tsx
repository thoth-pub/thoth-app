'use client';

import { FormControlLabel } from '@mui/material';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import RadioGroup from '@mui/material/RadioGroup';
import { type ReactNode, useId, useState } from 'react';

import type { WorkType } from '@/src/entities/work/model/work.types';
import type { TranslateFunction } from '@/src/shared/parsers';
import { normaliseEditionNumber } from '@/src/shared/parsers/XMLParser/onixPlanning';
import {
  ONIX_ACCESSIBILITY_ACKNOWLEDGED,
  ONIX_COLLATERAL_ACKNOWLEDGED,
  ONIX_COMPONENT_ACKNOWLEDGED,
  ONIX_DESCRIPTIVE_ACKNOWLEDGED,
  ONIX_MANIFESTATION_OMIT,
  ONIX_PRICE_OMIT,
  ONIX_RELATED_MATERIAL_ACKNOWLEDGED,
  ONIX_REVIEWS_PRIZES_ACKNOWLEDGED,
  ONIX_RIGHTS_ACKNOWLEDGED,
  type OnixPlanFindingFamily,
} from '@/src/shared/types';
import { Button, Checkbox, Radio, TextField, Typography } from '@/src/shared/ui';

import { LocaleAutocomplete, localeLabel } from './LocaleAutocomplete';
import { priceLabel } from './PublicationSummary';
import type { OnixReviewOption, OnixReviewTask, OnixReviewWork } from './reviewModel';
import { SuggestedValueConfirmation } from './SuggestedValueConfirmation';

/*
 * The controls that answer the review's tasks (thoth-app#262 Tasks 4-5). Each takes a task the review model projected -
 * its structured control, its canonical answer state - and writes the publisher's answer to the task's canonical
 * input through `onAnswer`. Nothing here decides what an answer means: the resolver takes it, or refuses it, and the
 * next projection shows which. The copy names the decision and its result; the planner's own message is never the
 * primary text.
 */

const NATIVE_SELECT = { select: { native: true }, inputLabel: { shrink: true } } as const;

/** The answer that acknowledges an omission, by the family that offers it (one vocabulary per reduction). */
const ACKNOWLEDGED_OF_FAMILY: Readonly<Record<OnixPlanFindingFamily, string>> = {
  DESCRIPTIVE: ONIX_DESCRIPTIVE_ACKNOWLEDGED,
  RIGHTS: ONIX_RIGHTS_ACKNOWLEDGED,
  COMMERCIAL: ONIX_PRICE_OMIT,
  SALES_RIGHTS: ONIX_RIGHTS_ACKNOWLEDGED,
  PRODUCT_CONTACT: ONIX_RIGHTS_ACKNOWLEDGED,
  LICENCE_RECONCILIATION: ONIX_RIGHTS_ACKNOWLEDGED,
  ACCESSIBILITY: ONIX_ACCESSIBILITY_ACKNOWLEDGED,
  PRODUCT_FORM_FEATURE: ONIX_ACCESSIBILITY_ACKNOWLEDGED,
  ACCESSIBILITY_RECONCILIATION: ONIX_ACCESSIBILITY_ACKNOWLEDGED,
  COMPONENT: ONIX_COMPONENT_ACKNOWLEDGED,
  RELATION: ONIX_RELATED_MATERIAL_ACKNOWLEDGED,
  REFERENCE: ONIX_RELATED_MATERIAL_ACKNOWLEDGED,
  COLLATERAL: ONIX_COLLATERAL_ACKNOWLEDGED,
  REVIEWS_PRIZES: ONIX_REVIEWS_PRIZES_ACKNOWLEDGED,
};

/** Answer keys the descriptive reductions give a fixed meaning, which are named rather than shown as codes. */
const DESCRIPTIVE_OPTION_NAMES: ReadonlySet<string> = new Set([
  'OMIT',
  'FIRST_SOURCE_SUBJECT',
  'SERIES',
  'NOT_SERIES',
  'BOOK_SERIES',
  'JOURNAL',
  'PRINT',
  'DIGITAL',
  'PRINT_DIGITAL',
  'DIGITAL_PRINT',
  'FILE_ORDER',
  'SEQUENCE_ORDER',
]);
const ACCESSIBILITY_OPTION_NAMES: ReadonlySet<string> = new Set(['OMIT', 'STANDARDS', 'EXCEPTION']);
const RELATED_MATERIAL_OPTION_NAMES: ReadonlySet<string> = new Set(['OMIT', 'HAS_TRANSLATION', 'IS_TRANSLATION_OF']);
const REVIEWS_PRIZES_OPTION_NAMES: ReadonlySet<string> = new Set([
  'WORK_AWARD',
  'PRODUCT_AWARD',
  'OMIT',
  'NONE',
  'PROJECT',
]);

/** The descriptive decisions whose omission reads as no affiliation, or no funding. */
const INSTITUTION_OMISSIONS: Readonly<Record<string, string>> = {
  CONTRIBUTOR_AFFILIATION_UNIDENTIFIED: 'NO_AFFILIATION',
  CONTRIBUTOR_AFFILIATION_UNRESOLVED: 'NO_AFFILIATION',
  FUNDING_FUNDER_UNIDENTIFIED: 'NO_FUNDING',
  FUNDING_FUNDER_UNRESOLVED: 'NO_FUNDING',
};

/** The descriptive codes the review has a plainer title for than their family's. */
const TOPIC_TITLES: ReadonlySet<string> = new Set([
  'CONTRIBUTOR_BIOGRAPHY_LOCALE_UNRESOLVED',
  'CONTRIBUTOR_BIOGRAPHY_CANONICAL_REQUIRED',
  'CONTRIBUTOR_AFFILIATION_UNIDENTIFIED',
  'CONTRIBUTOR_AFFILIATION_UNRESOLVED',
  'CONTRIBUTOR_NAME_REQUIRED',
  'CONTRIBUTOR_ORDER_AMBIGUOUS',
  'CONTRIBUTOR_AGENT_UNREPRESENTABLE',
  'FUNDING_FUNDER_UNIDENTIFIED',
  'FUNDING_FUNDER_UNRESOLVED',
  'TITLE_LOCALE_UNRESOLVED',
  'TITLE_CANONICAL_MISSING',
  'TITLE_CANONICAL_CONFLICT',
  'LIFECYCLE_STATUS_REQUIRED',
  'LIFECYCLE_DATE_REQUIRED',
  'SERIES_ORDINAL_REQUIRED',
  'SERIES_COLLECTION_TYPE_REQUIRED',
  'SERIES_TYPE_REQUIRED',
  'SERIES_ISSN_ASSIGNMENT_REQUIRED',
  'SUBJECT_PRIMARY_REQUIRED',
  'SUBJECT_PRIMARY_AMBIGUOUS',
  'LANDING_PAGE_CHOICE_REQUIRED',
  'PLACE_CHOICE_REQUIRED',
  'COVER_CHOICE_REQUIRED',
  'COVER_CAPTION_CHOICE_REQUIRED',
]);

export type DecisionProps = {
  readonly task: OnixReviewTask;
  readonly work: OnixReviewWork;
  /** The title the card shows, for the accessible names of every control. */
  readonly workTitle: string;
  readonly translate: TranslateFunction;
  /** Writes the answer to the task's canonical input, or clears it with `undefined`. */
  readonly onAnswer: (value: string | undefined) => void;
};

/** The Publication a Product-owned task is about, named by its format and ISBN. */
const publicationContext = (task: OnixReviewTask, work: OnixReviewWork, translate: TranslateFunction): string => {
  if (task.scope.kind !== 'PRODUCT' && task.scope.kind !== 'COMPONENT') return '';

  const { productKey } = task.scope;
  const publication = work.publications.find((candidate) => candidate.productKey === productKey);
  const format =
    publication?.type === undefined || publication.type === null
      ? ''
      : translate(`onixPlan.publicationType.${publication.type}`);
  const identity = publication?.isbn ?? task.scope.label;
  const context = [format, identity].filter((part) => part.length > 0).join(' ');

  return task.scope.kind === 'COMPONENT'
    ? translate('onixPlan.review.decision.componentScope', { position: task.scope.position, publication: context })
    : context;
};

/** What a task decides, in a few words: its heading, and the start of every accessible name it has. */
export const taskTitle = (task: OnixReviewTask, translate: TranslateFunction): string => {
  const { control, code, family, topic, subject } = task;
  const named = (title: string) => (subject === null ? title : `${title} - ${subject}`);

  switch (control.kind) {
    case 'WORK_TYPE':
      return translate('onixPlan.review.decision.workType.title');
    case 'EDITION':
      return translate('onixPlan.review.decision.edition.title');
    case 'MANIFESTATION':
      return translate('onixPlan.review.decision.manifestation.title');
    case 'PRICE':
      return translate('onixPlan.review.decision.price.title', { currency: control.currencyCode ?? '' });
    case 'CONFIRM':
      return task.input.field === 'thothCompatibilityConfirmed'
        ? translate('onixPlan.review.decision.compatibility.title')
        : translate('onixPlan.review.decision.record.title', {
            record: task.scope.kind === 'RECORD' ? task.scope.label : '',
          });
    case 'CLEAR':
      return translate('onixPlan.review.decision.stale.title');
    default:
      if (family === 'DESCRIPTIVE') {
        return named(
          TOPIC_TITLES.has(code)
            ? translate(`onixPlan.review.decision.topic.${code}`)
            : translate(`onixPlan.descriptive.family.${topic ?? 'TITLE'}`),
        );
      }

      return named(translate(`onixPlan.review.decision.family.${family}`));
  }
};

/** A refused answer, said once beside its control, with the one way out: clear it or answer again. */
const StaleAnswer = ({ task, translate, onAnswer }: Pick<DecisionProps, 'task' | 'translate' | 'onAnswer'>) =>
  task.state !== 'REJECTED' ? null : (
    <div className="flex flex-wrap items-center gap-2" data-testid="onix-review-stale">
      <Typography component="p" variant="body2" color="error">
        {translate('onixPlan.review.confirmation.stale')}
      </Typography>
      <Button
        variant="text"
        size="small"
        aria-label={translate('onixPlan.review.confirmation.clearLabel', { task: taskTitle(task, translate) })}
        onClick={() => onAnswer(undefined)}
      >
        {translate('onixPlan.review.confirmation.clear')}
      </Button>
    </div>
  );

type DecisionFrameProps = {
  readonly task: OnixReviewTask;
  readonly work: OnixReviewWork;
  readonly translate: TranslateFunction;
  readonly headingId: string;
  readonly children: ReactNode;
};

/**
 * The heading every task has, and the body below it. A Product-owned task of a Work with several Publications names the
 * one it is about once, beside the heading; with one Publication there is nothing to tell apart, and nothing is repeated.
 */
const DecisionFrame = ({ task, work, translate, headingId, children }: DecisionFrameProps) => {
  const context = work.publications.length > 1 ? publicationContext(task, work, translate) : '';

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <Typography id={headingId} component="h5" className="font-medium">
          {taskTitle(task, translate)}
        </Typography>
        {context.length > 0 && (
          <Typography component="p" variant="body2">
            {context}
          </Typography>
        )}
      </div>
      {children}
    </div>
  );
};

/* ------------------------------------------------------------------------------------------------ */
/* WorkType                                                                                          */
/* ------------------------------------------------------------------------------------------------ */

const WorkTypeDecision = ({ task, work, workTitle, translate, onAnswer }: DecisionProps) => {
  const headingId = useId();
  const control = task.control.kind === 'WORK_TYPE' ? task.control : null;

  if (control === null) return null;

  const typeLabel = (type: WorkType) => translate(`onixPlan.workType.${type}`);
  const choice = (
    <FormControl component="fieldset" variant="standard">
      <FormLabel id={`${headingId}-work-type-label`} component="legend" className="sr-only">
        {translate('onixPlan.review.decision.workType.label', { work: workTitle })}
      </FormLabel>
      <RadioGroup
        row
        aria-labelledby={`${headingId}-work-type-label`}
        name={`${headingId}-work-type`}
        value={task.answer ?? ''}
        onChange={(event) => onAnswer(event.target.value === '' ? undefined : event.target.value)}
      >
        {control.options.map((type) => (
          <FormControlLabel key={type} value={type} control={<Radio size="small" />} label={typeLabel(type)} />
        ))}
      </RadioGroup>
    </FormControl>
  );

  return (
    <DecisionFrame task={task} work={work} translate={translate} headingId={headingId}>
      <StaleAnswer task={task} translate={translate} onAnswer={onAnswer} />
      {control.suggestion !== null && task.state === 'PENDING' ? (
        <SuggestedValueConfirmation
          describedBy={headingId}
          basis={translate('onixPlan.review.decision.workType.suggested', { type: typeLabel(control.suggestion) })}
          confirmLabel={translate('onixPlan.review.decision.workType.confirm', { type: typeLabel(control.suggestion) })}
          chooseAnotherLabel={translate('onixPlan.review.decision.chooseAnother')}
          onConfirm={() => onAnswer(control.suggestion ?? undefined)}
        >
          {choice}
        </SuggestedValueConfirmation>
      ) : (
        choice
      )}
    </DecisionFrame>
  );
};

/* ------------------------------------------------------------------------------------------------ */
/* Edition                                                                                           */
/* ------------------------------------------------------------------------------------------------ */

const EditionDecision = ({ task, work, workTitle, translate, onAnswer }: DecisionProps) => {
  const headingId = useId();
  const [draft, setDraft] = useState(task.answer ?? '');
  const invalid = draft.trim().length > 0 && normaliseEditionNumber(draft).kind !== 'VALID';

  return (
    <DecisionFrame task={task} work={work} translate={translate} headingId={headingId}>
      <StaleAnswer task={task} translate={translate} onAnswer={onAnswer} />
      <TextField
        label={translate('onixPlan.review.decision.edition.label', { work: workTitle })}
        value={draft}
        error={invalid}
        helperText={invalid ? translate('onixPlan.review.decision.edition.invalid') : undefined}
        onChange={(event) => {
          const typed = event.target.value;
          const edition = normaliseEditionNumber(typed);

          setDraft(typed);
          onAnswer(edition.kind === 'VALID' ? String(edition.value) : undefined);
        }}
        slotProps={{ htmlInput: { inputMode: 'numeric', 'aria-describedby': headingId } }}
        size="small"
        className="max-w-xs"
      />
    </DecisionFrame>
  );
};

/* ------------------------------------------------------------------------------------------------ */
/* Manifestation                                                                                     */
/* ------------------------------------------------------------------------------------------------ */

const ManifestationDecision = ({ task, work, translate, onAnswer }: DecisionProps) => {
  const headingId = useId();
  const control = task.control.kind === 'MANIFESTATION' ? task.control : null;

  if (control === null) return null;

  const publication = publicationContext(task, work, translate);
  const reason = typeof task.evidence.detail.reason === 'string' ? task.evidence.detail.reason : null;
  const omitted = task.answer === ONIX_MANIFESTATION_OMIT;

  return (
    <DecisionFrame task={task} work={work} translate={translate} headingId={headingId}>
      {reason !== null && (
        <Typography component="p" variant="body2">
          {translate(
            control.candidates.length > 0
              ? `onixPlan.manifestation.reason.${reason}`
              : `onixPlan.manifestation.loss.${reason}`,
          )}
        </Typography>
      )}
      <StaleAnswer task={task} translate={translate} onAnswer={onAnswer} />
      {control.candidates.length > 0 ? (
        <TextField
          select
          label={translate('onixPlan.review.decision.manifestation.label', { publication })}
          value={task.answer ?? ''}
          onChange={(event) => onAnswer(event.target.value === '' ? undefined : event.target.value)}
          slotProps={{ ...NATIVE_SELECT, htmlInput: { 'aria-describedby': headingId } }}
          size="small"
          className="max-w-md"
        >
          <option value="">{translate('onixPlan.review.decision.manifestation.choose')}</option>
          {control.candidates.map((type) => (
            <option key={type} value={type}>
              {translate(`onixPlan.publicationType.${type}`)}
            </option>
          ))}
          {control.omitOffered && (
            <option value={ONIX_MANIFESTATION_OMIT}>{translate('onixPlan.review.decision.manifestation.omit')}</option>
          )}
        </TextField>
      ) : (
        control.omitOffered && (
          <FormControlLabel
            control={
              <Checkbox
                checked={omitted}
                onChange={(event) => onAnswer(event.target.checked ? ONIX_MANIFESTATION_OMIT : undefined)}
                slotProps={{ input: { 'aria-describedby': headingId } }}
              />
            }
            label={translate('onixPlan.review.decision.manifestation.omitLabel', { publication })}
          />
        )
      )}
    </DecisionFrame>
  );
};

/* ------------------------------------------------------------------------------------------------ */
/* Locale, date, text, ordinal                                                                       */
/* ------------------------------------------------------------------------------------------------ */

const LocaleDecision = ({ task, work, workTitle, translate, onAnswer }: DecisionProps) => {
  const headingId = useId();
  const control = task.control.kind === 'LOCALE' ? task.control : null;

  if (control === null) return null;

  const label = translate('onixPlan.review.decision.locale.label', {
    title: taskTitle(task, translate),
    work: workTitle,
  });
  const input = (
    <LocaleAutocomplete
      id={`${headingId}-locale`}
      label={label}
      describedBy={headingId}
      value={task.answer}
      error={task.state === 'REJECTED'}
      helperText={task.state === 'REJECTED' ? translate('onixPlan.review.confirmation.invalid') : undefined}
      onChange={onAnswer}
    />
  );

  return (
    <DecisionFrame task={task} work={work} translate={translate} headingId={headingId}>
      {control.suggestion !== null && task.state === 'PENDING' ? (
        <SuggestedValueConfirmation
          describedBy={headingId}
          basis={translate('onixPlan.review.decision.locale.suggested', {
            locale: localeLabel(control.suggestion.value),
          })}
          confirmLabel={translate('onixPlan.review.decision.locale.confirm', {
            locale: localeLabel(control.suggestion.value),
          })}
          chooseAnotherLabel={translate('onixPlan.review.decision.chooseAnother')}
          onConfirm={() => onAnswer(control.suggestion?.value)}
        >
          {input}
        </SuggestedValueConfirmation>
      ) : (
        input
      )}
    </DecisionFrame>
  );
};

const DateDecision = ({ task, work, workTitle, translate, onAnswer }: DecisionProps) => {
  const headingId = useId();
  const rejected = task.state === 'REJECTED';

  return (
    <DecisionFrame task={task} work={work} translate={translate} headingId={headingId}>
      <TextField
        type="date"
        label={translate('onixPlan.review.decision.date.label', { title: taskTitle(task, translate), work: workTitle })}
        value={task.answer ?? ''}
        error={rejected}
        helperText={rejected ? translate('onixPlan.review.confirmation.invalid') : undefined}
        onChange={(event) => onAnswer(event.target.value === '' ? undefined : event.target.value)}
        slotProps={{ inputLabel: { shrink: true }, htmlInput: { 'aria-describedby': headingId } }}
        size="small"
        className="max-w-xs"
      />
    </DecisionFrame>
  );
};

const TextDecision = ({ task, work, workTitle, translate, onAnswer }: DecisionProps) => {
  const headingId = useId();
  const [draft, setDraft] = useState(task.answer ?? '');
  const rejected = task.state === 'REJECTED';

  return (
    <DecisionFrame task={task} work={work} translate={translate} headingId={headingId}>
      <TextField
        label={translate('onixPlan.review.decision.text.label', { title: taskTitle(task, translate), work: workTitle })}
        value={draft}
        error={rejected}
        helperText={rejected ? translate('onixPlan.review.confirmation.invalid') : undefined}
        onChange={(event) => {
          setDraft(event.target.value);
          onAnswer(event.target.value === '' ? undefined : event.target.value);
        }}
        slotProps={{ htmlInput: { 'aria-describedby': headingId } }}
        size="small"
        className="max-w-md"
      />
    </DecisionFrame>
  );
};

const POSITIVE_WHOLE_NUMBER = /^[1-9]\d*$/;

const OrdinalDecision = ({ task, work, workTitle, translate, onAnswer }: DecisionProps) => {
  const headingId = useId();
  const [draft, setDraft] = useState(task.answer ?? '');
  const invalid = draft.length > 0 && !POSITIVE_WHOLE_NUMBER.test(draft);
  const rejected = task.state === 'REJECTED';

  return (
    <DecisionFrame task={task} work={work} translate={translate} headingId={headingId}>
      <StaleAnswer task={task} translate={translate} onAnswer={onAnswer} />
      <TextField
        label={translate('onixPlan.review.decision.ordinal.label', {
          title: taskTitle(task, translate),
          work: workTitle,
        })}
        value={draft}
        error={invalid || rejected}
        helperText={
          invalid
            ? translate('onixPlan.review.decision.ordinal.invalid')
            : rejected
              ? translate('onixPlan.review.confirmation.invalid')
              : undefined
        }
        onChange={(event) => {
          const typed = event.target.value;

          setDraft(typed);
          onAnswer(POSITIVE_WHOLE_NUMBER.test(typed) ? typed : undefined);
        }}
        slotProps={{ htmlInput: { inputMode: 'numeric', 'aria-describedby': headingId } }}
        size="small"
        className="max-w-xs"
      />
    </DecisionFrame>
  );
};

/* ------------------------------------------------------------------------------------------------ */
/* Institution, price, generic choice                                                                */
/* ------------------------------------------------------------------------------------------------ */

const InstitutionDecision = ({ task, work, workTitle, translate, onAnswer }: DecisionProps) => {
  const headingId = useId();
  const control = task.control.kind === 'INSTITUTION' ? task.control : null;

  if (control === null) return null;

  const omission = INSTITUTION_OMISSIONS[task.code] ?? 'OMIT';

  return (
    <DecisionFrame task={task} work={work} translate={translate} headingId={headingId}>
      <Typography component="p" variant="body2">
        {control.options.length > 0
          ? translate('onixPlan.review.decision.institution.matches', { count: control.options.length })
          : translate('onixPlan.review.decision.institution.noMatches')}
      </Typography>
      <StaleAnswer task={task} translate={translate} onAnswer={onAnswer} />
      <TextField
        select
        label={translate('onixPlan.review.decision.institution.label', {
          title: taskTitle(task, translate),
          work: workTitle,
        })}
        value={task.answer ?? ''}
        onChange={(event) => onAnswer(event.target.value === '' ? undefined : event.target.value)}
        slotProps={{ ...NATIVE_SELECT, htmlInput: { 'aria-describedby': headingId } }}
        size="small"
        className="max-w-md"
      >
        <option value="">{translate('onixPlan.review.decision.choose')}</option>
        {control.options.length > 0 && (
          <optgroup label={translate('onixPlan.review.decision.institution.suggestions')}>
            {control.options.map(({ key, label }) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </optgroup>
        )}
        {control.omitOption !== null && (
          <option value={control.omitOption.key}>{translate(`onixPlan.descriptive.option.${omission}`)}</option>
        )}
      </TextField>
    </DecisionFrame>
  );
};

const PriceDecision = ({ task, work, workTitle, translate, onAnswer }: DecisionProps) => {
  const headingId = useId();
  const control = task.control.kind === 'PRICE' ? task.control : null;

  if (control === null) return null;

  const publication = publicationContext(task, work, translate);

  return (
    <DecisionFrame task={task} work={work} translate={translate} headingId={headingId}>
      <StaleAnswer task={task} translate={translate} onAnswer={onAnswer} />
      <FormControl component="fieldset" variant="standard">
        <FormLabel id={`${headingId}-price-label`} component="legend" className="sr-only">
          {translate('onixPlan.review.decision.price.label', { publication, work: workTitle })}
        </FormLabel>
        <RadioGroup
          aria-labelledby={`${headingId}-price-label`}
          name={`${headingId}-price`}
          value={task.answer ?? ''}
          onChange={(event) => onAnswer(event.target.value === '' ? undefined : event.target.value)}
        >
          {control.candidates.map(({ key, currencyCode, unitPrice }) => (
            <FormControlLabel
              key={key}
              value={key}
              control={<Radio size="small" />}
              label={translate('onixPlan.review.decision.price.use', {
                price: priceLabel(translate, currencyCode, unitPrice),
              })}
            />
          ))}
          {control.omitOffered && (
            <FormControlLabel
              value={ONIX_PRICE_OMIT}
              control={<Radio size="small" />}
              label={translate('onixPlan.review.decision.price.none')}
            />
          )}
        </RadioGroup>
      </FormControl>
    </DecisionFrame>
  );
};

/** An option as the review names it: a fixed-meaning key by its name, anything else as the file states it. */
const optionLabel = (task: OnixReviewTask, { key, label }: OnixReviewOption, translate: TranslateFunction): string => {
  switch (task.family) {
    case 'DESCRIPTIVE':
      return DESCRIPTIVE_OPTION_NAMES.has(key) ? translate(`onixPlan.descriptive.option.${key}`, { label }) : label;
    case 'ACCESSIBILITY':
    case 'PRODUCT_FORM_FEATURE':
    case 'ACCESSIBILITY_RECONCILIATION':
      return ACCESSIBILITY_OPTION_NAMES.has(key) ? translate(`onixPlan.accessibility.option.${key}`, { label }) : label;
    case 'COMPONENT':
      return task.code === 'CONTAINED_WORK_TYPE_REQUIRED'
        ? translate(`onixPlan.workType.${key}`)
        : task.code === 'CONTAINED_WORK_STATUS_REQUIRED'
          ? translate(`onixPlan.components.status.${key}`)
          : key === 'OMIT'
            ? translate('onixPlan.components.option.OMIT')
            : label;
    case 'RELATION':
    case 'REFERENCE':
      return key === 'PROJECT'
        ? translate('onixPlan.relatedMaterial.option.PROJECT', {
            relation: translate(`onixPlan.relatedMaterial.relationType.${label}`),
          })
        : RELATED_MATERIAL_OPTION_NAMES.has(key)
          ? translate(`onixPlan.relatedMaterial.option.${key}`)
          : label;
    case 'COLLATERAL':
      return key === 'PROJECT'
        ? translate('onixPlan.collateral.option.PROJECT', {
            type: translate(`onixPlan.collateral.resourceType.${label}`),
          })
        : key === 'OMIT'
          ? translate('onixPlan.collateral.option.OMIT')
          : label;
    case 'REVIEWS_PRIZES':
      return REVIEWS_PRIZES_OPTION_NAMES.has(key) ? translate(`onixPlan.reviewsPrizes.option.${key}`) : label;
    default:
      return label;
  }
};

const ChoiceDecision = ({ task, work, workTitle, translate, onAnswer }: DecisionProps) => {
  const headingId = useId();
  const control = task.control.kind === 'CHOICE' ? task.control : null;

  if (control === null) return null;

  const stale =
    task.state === 'REJECTED' && task.answer !== undefined && !control.options.some(({ key }) => key === task.answer)
      ? task.answer
      : null;

  return (
    <DecisionFrame task={task} work={work} translate={translate} headingId={headingId}>
      <StaleAnswer task={task} translate={translate} onAnswer={onAnswer} />
      <TextField
        select
        label={translate('onixPlan.review.decision.choice.label', {
          title: taskTitle(task, translate),
          scope: publicationContext(task, work, translate),
          work: workTitle,
        })}
        value={task.answer ?? ''}
        onChange={(event) => onAnswer(event.target.value === '' ? undefined : event.target.value)}
        error={task.state === 'REJECTED'}
        slotProps={{ ...NATIVE_SELECT, htmlInput: { 'aria-describedby': headingId } }}
        size="small"
        className="max-w-md"
      >
        {stale !== null && (
          <option value={stale} disabled>
            {translate('onixPlan.review.confirmation.staleAnswer', { answer: stale })}
          </option>
        )}
        <option value="">{translate('onixPlan.review.decision.choose')}</option>
        {control.options.map((option) => (
          <option key={option.key} value={option.key}>
            {optionLabel(task, option, translate)}
          </option>
        ))}
      </TextField>
    </DecisionFrame>
  );
};

/* ------------------------------------------------------------------------------------------------ */
/* Acknowledgements, confirmations, stale answers                                                    */
/* ------------------------------------------------------------------------------------------------ */

const AcknowledgeDecision = ({ task, work, workTitle, translate, onAnswer }: DecisionProps) => {
  const headingId = useId();
  const acknowledged = ACKNOWLEDGED_OF_FAMILY[task.family as OnixPlanFindingFamily] ?? ONIX_DESCRIPTIVE_ACKNOWLEDGED;

  return (
    <DecisionFrame task={task} work={work} translate={translate} headingId={headingId}>
      <StaleAnswer task={task} translate={translate} onAnswer={onAnswer} />
      <FormControlLabel
        control={
          <Checkbox
            checked={task.state === 'RESOLVED'}
            onChange={(event) => onAnswer(event.target.checked ? acknowledged : undefined)}
            slotProps={{ input: { 'aria-describedby': headingId } }}
          />
        }
        label={translate('onixPlan.review.decision.acknowledge.label', {
          title: taskTitle(task, translate),
          scope: publicationContext(task, work, translate),
          work: workTitle,
        })}
      />
    </DecisionFrame>
  );
};

const ConfirmDecision = ({ task, work, translate, onAnswer }: DecisionProps) => {
  const headingId = useId();
  const record = task.scope.kind === 'RECORD' ? task.scope.label : '';
  const compatibility = task.input.field === 'thothCompatibilityConfirmed';
  const disposition = typeof task.evidence.code === 'string' && !compatibility ? task.code : null;
  const deletionText = Array.isArray(task.evidence.detail.deletionText)
    ? task.evidence.detail.deletionText.join(' ')
    : '';

  return (
    <DecisionFrame task={task} work={work} translate={translate} headingId={headingId}>
      <Typography component="p" variant="body2">
        {compatibility
          ? translate('onixPlan.review.decision.compatibility.body')
          : translate('onixPlan.review.decision.record.body', {
              disposition: translate(`onixPlan.disposition.${disposition ?? 'UNRECOGNISED'}`, {
                code: task.subject ?? '',
              }),
            })}
        {deletionText.length > 0 &&
          ` ${translate('onixPlan.review.decision.record.deletionText', { text: deletionText })}`}
      </Typography>
      <FormControlLabel
        control={
          <Checkbox
            checked={task.state === 'RESOLVED'}
            onChange={(event) => onAnswer(event.target.checked ? 'true' : undefined)}
            slotProps={{ input: { 'aria-describedby': headingId } }}
          />
        }
        label={
          compatibility
            ? translate('onixPlan.review.decision.compatibility.confirm')
            : translate('onixPlan.review.decision.record.exclude', { record })
        }
      />
    </DecisionFrame>
  );
};

const ClearDecision = ({ task, work, translate, onAnswer }: DecisionProps) => {
  const headingId = useId();

  return (
    <DecisionFrame task={task} work={work} translate={translate} headingId={headingId}>
      <Typography component="p" variant="body2">
        {translate('onixPlan.review.decision.stale.body')}
      </Typography>
      <div>
        <Button variant="outlined" size="small" aria-describedby={headingId} onClick={() => onAnswer(undefined)}>
          {translate('onixPlan.review.decision.stale.clear', { answer: task.answer ?? '' })}
        </Button>
      </div>
    </DecisionFrame>
  );
};

/** The control that answers one task, chosen from its structured control alone. */
export const TaskDecision = (props: DecisionProps) => {
  switch (props.task.control.kind) {
    case 'WORK_TYPE':
      return <WorkTypeDecision {...props} />;
    case 'EDITION':
      return <EditionDecision {...props} />;
    case 'MANIFESTATION':
      return <ManifestationDecision {...props} />;
    case 'LOCALE':
      return <LocaleDecision {...props} />;
    case 'DATE':
      return <DateDecision {...props} />;
    case 'TEXT':
      return <TextDecision {...props} />;
    case 'ORDINAL':
      return <OrdinalDecision {...props} />;
    case 'INSTITUTION':
      return <InstitutionDecision {...props} />;
    case 'PRICE':
      return <PriceDecision {...props} />;
    case 'CHOICE':
      return <ChoiceDecision {...props} />;
    case 'ACKNOWLEDGE':
      return <AcknowledgeDecision {...props} />;
    case 'CONFIRM':
      return <ConfirmDecision {...props} />;
    case 'CLEAR':
      return <ClearDecision {...props} />;
  }
};
