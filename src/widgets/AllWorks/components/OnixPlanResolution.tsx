'use client';

import { FormControlLabel } from '@mui/material';
import { useId, useState } from 'react';

import type { PublicationType } from '@/src/entities/publication/model/publication.types';
import type { WorkType } from '@/src/entities/work/model/work.types';
import { languageOptionsAlt } from '@/src/shared/constants';
import { useTypedTranslation } from '@/src/shared/hooks';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import type { TranslateFunction } from '@/src/shared/parsers';
import { normaliseEditionNumber } from '@/src/shared/parsers/XMLParser/onixPlanning';
import {
  ONIX_EXCLUDABLE_DISPOSITIONS,
  ONIX_FILE_WORK_TYPES,
  ONIX_WORK_OVERRIDE_TYPES,
} from '@/src/shared/parsers/XMLParser/onixTargetResolution';
import {
  ONIX_DESCRIPTIVE_ACKNOWLEDGED,
  ONIX_MANIFESTATION_OMIT,
  type OnixDescriptiveFinding,
  type OnixDescriptiveInput,
  type OnixImportPlanSidecar,
  type OnixManifestationChoice,
  type OnixPlanBlocker,
  type OnixPlanInputs,
  type OnixPlannedProduct,
  type OnixPlannedRecord,
  type OnixPlannedWorkGroup,
} from '@/src/shared/types';
import { Checkbox, TextField, Typography } from '@/src/shared/ui';

type OnixPlanResolutionProps = {
  /** The plan as resolved for the publisher's current decisions, which it carries as `inputs`. */
  readonly sidecar: OnixImportPlanSidecar;
  /** Hands on the publisher's next decisions; the caller resolves the plan again from them. */
  readonly onChange: (inputs: OnixPlanInputs) => void;
};

const NATIVE_SELECT = { select: { native: true }, inputLabel: { shrink: true } } as const;

/** A record without one of its keys, so that taking a decision back leaves no trace of it. */
const without = <T,>(decisions: Readonly<Record<string, T>>, key: string): Record<string, T> =>
  Object.fromEntries(Object.entries(decisions).filter(([decided]) => decided !== key));

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

/** The findings a blocker waits on: its own, or those an unverified existing-Work family is waiting for. */
const findingKeysOf = ({ detail }: OnixPlanBlocker): string[] =>
  typeof detail.findingKey === 'string'
    ? [detail.findingKey]
    : Array.isArray(detail.findingKeys)
      ? [...(detail.findingKeys as readonly string[])]
      : [];

/**
 * The decisions an ONIX file leaves to the publisher, and why its plan waits (thoth-app#182, thoth-app#183).
 *
 * It shows every Work group with its target and the evidence for it, every Product with the Publication and
 * the action it resolved to, the records that are not complete Product records, every descriptive question a
 * blocker waits on, and every blocker that still stands. It decides nothing itself: each control records one
 * decision for one record, Product, Work group or descriptive finding, and nothing starts decided - no WorkType,
 * no format, no exclusion, no compatibility confirmation and no descriptive answer.
 */
export const OnixPlanResolution = ({ sidecar, onChange }: OnixPlanResolutionProps) => {
  const { t } = useTypedTranslation({ namespace: NAMESPACES.enum.common });
  const translate = t as TranslateFunction;
  const headingId = useId();

  const { inputs, records, products, workGroups, blockers, compatibility, executable } = sidecar;
  const decide = (change: Partial<OnixPlanInputs>) => onChange({ ...inputs, ...change });

  const recordByKey = new Map(records.map((record) => [record.recordKey, record]));
  const productByKey = new Map(products.map((product) => [product.productKey, product]));
  const recordLabel = (record: OnixPlannedRecord | undefined) =>
    record === undefined
      ? ''
      : (record.recordReference ?? translate('onixPlan.records.position', { index: record.index }));
  const productLabel = (productKey: string) =>
    (productByKey.get(productKey)?.recordKeys ?? [])
      .map((recordKey) => recordLabel(recordByKey.get(recordKey)))
      .join(', ');
  const groupLabel = (groupKey: string) =>
    translate('onixPlan.group.label', { position: workGroups.findIndex((group) => group.groupKey === groupKey) + 1 });

  const createsWork = workGroups.some(({ target }) => target === 'NEW_WORK');
  const status = !executable
    ? translate('onixPlan.status.blocked', { count: blockers.length })
    : translate(createsWork ? 'onixPlan.status.ready' : 'onixPlan.status.nothingToCreate');

  const chooseManifestation = (productKey: string, choice: OnixManifestationChoice | undefined) =>
    decide({
      manifestationChoices:
        choice === undefined
          ? without(inputs.manifestationChoices, productKey)
          : { ...inputs.manifestationChoices, [productKey]: choice },
    });

  const scopeOf = ({ recordKey, productKey, groupKey }: OnixPlanBlocker) => {
    if (productKey !== null) return translate('onixPlan.scope.product', { product: productLabel(productKey) });
    if (groupKey !== null) return translate('onixPlan.scope.group', { work: groupLabel(groupKey) });
    if (recordKey !== null)
      return translate('onixPlan.scope.record', { record: recordLabel(recordByKey.get(recordKey)) });

    return null;
  };

  const notComplete = records.filter(({ disposition }) => disposition !== 'COMPLETE');

  // Every descriptive question a blocker waits on, and every one already answered so the answer can change, in
  // the order the reductions raised them. A finding nothing in the app can answer stays a blocker only.
  const blocking = new Set(blockers.flatMap(findingKeysOf));
  const asked = new Set([...blocking, ...Object.keys(inputs.descriptiveChoices)]);
  const questions = sidecar.descriptive.findings.filter(
    (finding, index, all) =>
      asked.has(finding.key) &&
      finding.resolution.kind !== 'NONE' &&
      all.findIndex(({ key }) => key === finding.key) === index,
  );
  const answerDescriptive = (findingKey: string, answer: string | undefined) =>
    decide({
      descriptiveChoices:
        answer === undefined
          ? without(inputs.descriptiveChoices, findingKey)
          : { ...inputs.descriptiveChoices, [findingKey]: answer },
    });

  return (
    <section
      aria-labelledby={headingId}
      data-testid="onix-plan-resolution"
      className="flex w-full flex-col gap-4 rounded border border-(--color-border) p-4"
    >
      <Typography id={headingId} className="font-semibold">
        {translate('onixPlan.heading')}
      </Typography>
      <Typography data-testid="onix-plan-status" color={executable ? undefined : 'warning.main'}>
        {status}
      </Typography>

      {compatibility.activation === 'VERIFIED' && (
        <Typography>{translate('onixPlan.compatibility.verified')}</Typography>
      )}
      {compatibility.activation === 'CONTRADICTED' && (
        <Typography color="error">{translate('onixPlan.compatibility.contradicted')}</Typography>
      )}
      {(compatibility.activation === 'AWAITING_CONFIRMATION' || compatibility.activation === 'CONFIRMED') && (
        <div className="flex flex-col gap-1">
          <Typography>{translate('onixPlan.compatibility.unverified')}</Typography>
          <FormControlLabel
            control={
              <Checkbox
                checked={inputs.thothCompatibilityConfirmed}
                onChange={(event) => decide({ thothCompatibilityConfirmed: event.target.checked })}
              />
            }
            label={translate('onixPlan.compatibility.confirm')}
          />
        </div>
      )}

      {createsWork && (
        <TextField
          select
          label={translate('onixPlan.workType.fileLabel')}
          value={inputs.fileWorkType ?? ''}
          onChange={(event) =>
            decide({ fileWorkType: event.target.value === '' ? null : (event.target.value as WorkType) })
          }
          slotProps={NATIVE_SELECT}
          size="small"
        >
          <option value="">{translate('onixPlan.workType.choose')}</option>
          {ONIX_FILE_WORK_TYPES.map((type) => (
            <option key={type} value={type}>
              {translate(`onixPlan.workType.${type}`)}
            </option>
          ))}
        </TextField>
      )}

      {notComplete.length > 0 && (
        <section className="flex flex-col gap-2" data-testid="onix-plan-records">
          <Typography className="font-semibold">{translate('onixPlan.records.heading')}</Typography>
          {notComplete.map((record) => (
            <div key={record.recordKey} className="flex flex-col gap-1">
              <Typography>
                {recordLabel(record)}:{' '}
                {translate(`onixPlan.disposition.${record.disposition}`, { code: record.notificationType ?? '' })}
              </Typography>
              {record.deletionText.length > 0 && (
                <Typography variant="body2">
                  {translate('onixPlan.records.deletionText')}: {record.deletionText.join(' ')}
                </Typography>
              )}
              {ONIX_EXCLUDABLE_DISPOSITIONS.has(record.disposition) && (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={inputs.excludedRecordKeys.includes(record.recordKey)}
                      onChange={(event) =>
                        decide({
                          excludedRecordKeys: event.target.checked
                            ? [...new Set([...inputs.excludedRecordKeys, record.recordKey])].sort()
                            : inputs.excludedRecordKeys.filter((recordKey) => recordKey !== record.recordKey),
                        })
                      }
                    />
                  }
                  label={translate('onixPlan.records.exclude', { record: recordLabel(record) })}
                />
              )}
            </div>
          ))}
        </section>
      )}

      {workGroups.map((group) => (
        <WorkGroupDecisions
          key={group.groupKey}
          group={group}
          label={groupLabel(group.groupKey)}
          products={products.filter(({ groupKey }) => groupKey === group.groupKey)}
          productLabel={productLabel}
          inputs={inputs}
          editionAsked={
            group.target === 'NEW_WORK' &&
            (blockers.some(({ code, groupKey }) => code === 'EDITION_INPUT_REQUIRED' && groupKey === group.groupKey) ||
              (group.edition.status === 'RESOLVED' && group.edition.basis === 'USER_INPUT'))
          }
          translate={translate}
          decide={decide}
          chooseManifestation={chooseManifestation}
        />
      ))}

      {questions.length > 0 && (
        <section className="flex flex-col gap-3" data-testid="onix-plan-descriptive">
          <Typography className="font-semibold">{translate('onixPlan.descriptive.heading')}</Typography>
          {questions.map((finding) => (
            <DescriptiveDecision
              key={finding.key}
              finding={finding}
              scope={
                finding.productKey !== null
                  ? translate('onixPlan.scope.product', { product: productLabel(finding.productKey) })
                  : translate('onixPlan.scope.group', { work: groupLabel(finding.groupKey) })
              }
              answer={inputs.descriptiveChoices[finding.key]}
              // An answer the plan still waits on is not a value it can use.
              rejected={inputs.descriptiveChoices[finding.key] !== undefined && blocking.has(finding.key)}
              translate={translate}
              onAnswer={(answer) => answerDescriptive(finding.key, answer)}
            />
          ))}
        </section>
      )}

      {blockers.length > 0 && (
        <section className="flex flex-col gap-2" data-testid="onix-plan-blockers">
          <Typography className="font-semibold">{translate('onixPlan.blockers.heading')}</Typography>
          <ul className="flex list-disc flex-col gap-2 pl-6">
            {blockers.map((blocker) => {
              const scope = scopeOf(blocker);
              const details = Object.entries(blocker.detail)
                .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
                .join('; ');

              return (
                // What a blocker is about, where, and why: no two blockers the resolver raises share all three.
                <li
                  key={[
                    blocker.code,
                    blocker.recordKey,
                    blocker.productKey,
                    blocker.groupKey,
                    blocker.paths.join(','),
                    details,
                  ].join('|')}
                >
                  <Typography>
                    {scope && <>{scope}: </>}
                    {translate(`onixPlan.blocker.${blocker.code}`)} (
                    {translate(`onixPlan.classification.${blocker.classification}`)})
                  </Typography>
                  {details.length > 0 && (
                    <Typography variant="body2">
                      {translate('onixPlan.blockers.details')}: {details}
                    </Typography>
                  )}
                  {blocker.paths.length > 0 && (
                    <Typography variant="body2" className="break-all">
                      {translate('onixPlan.blockers.paths')}: {blocker.paths.join(', ')}
                    </Typography>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </section>
  );
};

type WorkGroupDecisionsProps = {
  readonly group: OnixPlannedWorkGroup;
  readonly label: string;
  readonly products: readonly OnixPlannedProduct[];
  readonly productLabel: (productKey: string) => string;
  readonly inputs: OnixPlanInputs;
  /** Whether this new Work's edition is the publisher's to give: the file describes one without its number. */
  readonly editionAsked: boolean;
  readonly translate: TranslateFunction;
  readonly decide: (change: Partial<OnixPlanInputs>) => void;
  readonly chooseManifestation: (productKey: string, choice: OnixManifestationChoice | undefined) => void;
};

/** One Work group: its target and evidence, WorkType, edition, and each Product's Publication and action. */
const WorkGroupDecisions = ({
  group,
  label,
  products,
  productLabel,
  inputs,
  editionAsked,
  translate,
  decide,
  chooseManifestation,
}: WorkGroupDecisionsProps) => {
  const { groupKey, target, workType, edition } = group;
  const override = inputs.workTypeOverrides[groupKey];

  return (
    <section aria-label={label} data-testid="onix-plan-group" className="flex flex-col gap-2">
      <Typography className="font-semibold">{label}</Typography>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
        <dt>{translate('onixPlan.group.target')}</dt>
        <dd>
          {translate(`onixPlan.workTarget.${target ?? 'UNRESOLVED'}`)}
          {group.evidence.length > 0 &&
            ` (${group.evidence.map((evidence) => translate(`onixPlan.workEvidence.${evidence.kind}`, { ...evidence })).join('; ')})`}
        </dd>
        <dt>{translate('onixPlan.group.workType')}</dt>
        <dd className="flex flex-col gap-2">
          <span>
            {workType.status === 'RESOLVED'
              ? `${translate(`onixPlan.workType.${workType.type}`)} (${translate(`onixPlan.workTypeProvenance.${workType.provenance}`)})`
              : translate('onixPlan.group.undecided')}
          </span>
          {target === 'NEW_WORK' && (
            <TextField
              select
              label={translate('onixPlan.workType.overrideLabel', { work: label })}
              value={override ?? ''}
              onChange={(event) =>
                decide({
                  workTypeOverrides:
                    event.target.value === ''
                      ? without(inputs.workTypeOverrides, groupKey)
                      : { ...inputs.workTypeOverrides, [groupKey]: event.target.value as WorkType },
                })
              }
              slotProps={NATIVE_SELECT}
              size="small"
            >
              <option value="">{translate('onixPlan.workType.useFileDefault')}</option>
              {ONIX_WORK_OVERRIDE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {translate(`onixPlan.workType.${type}`)}
                </option>
              ))}
            </TextField>
          )}
        </dd>
        <dt>{translate('onixPlan.group.edition')}</dt>
        <dd className="flex flex-col gap-2">
          <span>
            {edition.status === 'RESOLVED'
              ? `${edition.edition} (${translate(`onixPlan.edition.${edition.basis}`)})`
              : translate('onixPlan.group.undecided')}
          </span>
          {editionAsked && (
            <EditionInput
              label={translate('onixPlan.edition.inputLabel', { work: label })}
              invalidText={translate('onixPlan.edition.invalid')}
              value={inputs.editionInputs[groupKey]}
              onChange={(value) =>
                decide({
                  editionInputs:
                    value === undefined
                      ? without(inputs.editionInputs, groupKey)
                      : { ...inputs.editionInputs, [groupKey]: value },
                })
              }
            />
          )}
        </dd>
      </dl>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className="pr-4">{translate('onixPlan.product.record')}</th>
              <th className="pr-4">{translate('onixPlan.product.isbn')}</th>
              <th className="pr-4">{translate('onixPlan.product.publication')}</th>
              <th>{translate('onixPlan.product.action')}</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.productKey} className="align-top">
                <td className="pr-4">{productLabel(product.productKey)}</td>
                <td className="pr-4">{product.isbn ?? translate('onixPlan.product.none')}</td>
                <td className="pr-4">
                  <ManifestationDecision
                    product={product}
                    record={productLabel(product.productKey)}
                    choice={inputs.manifestationChoices[product.productKey]}
                    translate={translate}
                    onChoose={(choice) => chooseManifestation(product.productKey, choice)}
                  />
                </td>
                <td>
                  {translate(`onixPlan.productAction.${product.action ?? 'UNDECIDED'}`)}
                  {product.evidence.length > 0 &&
                    ` (${product.evidence.map((evidence) => translate(`onixPlan.productEvidence.${evidence.kind}`, { ...evidence })).join('; ')})`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

type ManifestationDecisionProps = {
  readonly product: OnixPlannedProduct;
  readonly record: string;
  readonly choice: OnixManifestationChoice | undefined;
  readonly translate: TranslateFunction;
  readonly onChoose: (choice: OnixManifestationChoice | undefined) => void;
};

/**
 * What one Product's manifestation became, and the choice it leaves. A format the file does not establish is
 * chosen among the reducer's own candidates only; any Product may instead be imported with no Publication,
 * which a package Thoth cannot hold needs explicitly acknowledged.
 */
const ManifestationDecision = ({ product, record, choice, translate, onChoose }: ManifestationDecisionProps) => {
  const { manifestation } = product;
  const omitted = choice === ONIX_MANIFESTATION_OMIT;
  const omission = (
    <FormControlLabel
      control={
        <Checkbox
          checked={omitted}
          onChange={(event) => onChoose(event.target.checked ? ONIX_MANIFESTATION_OMIT : undefined)}
        />
      }
      label={translate('onixPlan.manifestation.acknowledge', { record })}
    />
  );

  switch (manifestation.kind) {
    case 'RESOLVED':
      return (
        <div className="flex flex-col gap-1">
          <span>{translate(`onixPlan.publicationType.${manifestation.type}`)}</span>
          {omission}
        </div>
      );
    case 'INPUT_REQUIRED':
      return (
        <div className="flex flex-col gap-2">
          <Typography variant="body2">{translate(`onixPlan.manifestation.reason.${manifestation.reason}`)}</Typography>
          <TextField
            select
            label={translate('onixPlan.manifestation.chooseLabel', { record })}
            value={choice ?? ''}
            onChange={(event) =>
              onChoose(
                event.target.value === ''
                  ? undefined
                  : (event.target.value as PublicationType | typeof ONIX_MANIFESTATION_OMIT),
              )
            }
            slotProps={NATIVE_SELECT}
            size="small"
          >
            <option value="">{translate('onixPlan.manifestation.choose')}</option>
            {manifestation.candidates.map((type) => (
              <option key={type} value={type}>
                {translate(`onixPlan.publicationType.${type}`)}
              </option>
            ))}
            <option value={ONIX_MANIFESTATION_OMIT}>{translate('onixPlan.manifestation.omit')}</option>
          </TextField>
        </div>
      );
    case 'UNREPRESENTABLE':
      return (
        <div className="flex flex-col gap-1">
          <Typography variant="body2">{translate(`onixPlan.manifestation.loss.${manifestation.reason}`)}</Typography>
          {manifestation.acknowledgementRequired ? (
            omission
          ) : (
            <span>{translate('onixPlan.manifestation.omitted')}</span>
          )}
        </div>
      );
  }
};

type DescriptiveDecisionProps = {
  readonly finding: OnixDescriptiveFinding;
  readonly scope: string;
  readonly answer: string | undefined;
  /** Whether the plan still waits on the finding although it has an answer: the answer is no valid value. */
  readonly rejected: boolean;
  readonly translate: TranslateFunction;
  readonly onAnswer: (answer: string | undefined) => void;
};

/**
 * One descriptive question: what the file says, where, and the answer it leaves open - one of the options the
 * source itself supplies, consent to the omission the finding describes, or a value the publisher supplies where
 * the file gives none. The explanation is the planner's own, in the ONIX vocabulary its other disclosures use.
 */
const DescriptiveDecision = ({ finding, scope, answer, rejected, translate, onAnswer }: DescriptiveDecisionProps) => {
  const family = translate(`onixPlan.descriptive.family.${finding.family}`);
  const { resolution } = finding;

  return (
    <div className="flex flex-col gap-1" data-testid="onix-plan-descriptive-question">
      <Typography>
        {scope}: {family}
      </Typography>
      <Typography variant="body2">{finding.message}</Typography>
      {finding.locations.length > 0 && (
        <Typography variant="body2" className="break-all">
          {translate('onixPlan.blockers.paths')}: {finding.locations.map(({ sourcePath }) => sourcePath).join(', ')}
        </Typography>
      )}
      {resolution.kind === 'INPUT' ? (
        <DescriptiveInput
          input={resolution.input}
          label={translate(`onixPlan.descriptive.${INPUT_LABELS[resolution.input]}`, { family, scope })}
          choose={translate('onixPlan.descriptive.choose')}
          invalidText={rejected ? translate('onixPlan.descriptive.invalid') : undefined}
          answer={answer}
          onAnswer={onAnswer}
        />
      ) : resolution.kind === 'CHOICE' ? (
        <TextField
          select
          label={translate('onixPlan.descriptive.chooseLabel', { family, scope })}
          value={answer ?? ''}
          onChange={(event) => onAnswer(event.target.value === '' ? undefined : event.target.value)}
          slotProps={NATIVE_SELECT}
          size="small"
        >
          <option value="">{translate('onixPlan.descriptive.choose')}</option>
          {resolution.options.map(({ key, label }) => (
            <option key={key} value={key}>
              {DESCRIPTIVE_OPTION_NAMES.has(key) ? translate(`onixPlan.descriptive.option.${key}`, { label }) : label}
            </option>
          ))}
        </TextField>
      ) : (
        <FormControlLabel
          control={
            <Checkbox
              checked={answer === ONIX_DESCRIPTIVE_ACKNOWLEDGED}
              onChange={(event) => onAnswer(event.target.checked ? ONIX_DESCRIPTIVE_ACKNOWLEDGED : undefined)}
            />
          }
          label={translate('onixPlan.descriptive.acknowledge', { family, scope })}
        />
      )}
    </div>
  );
};

const INPUT_LABELS: Readonly<Record<OnixDescriptiveInput, string>> = {
  DATE: 'dateLabel',
  LOCALE: 'localeLabel',
  TEXT: 'textLabel',
};

type DescriptiveInputProps = {
  readonly input: OnixDescriptiveInput;
  readonly label: string;
  readonly choose: string;
  readonly invalidText: string | undefined;
  readonly answer: string | undefined;
  readonly onAnswer: (answer: string | undefined) => void;
};

/**
 * A value the file does not give, supplied by the publisher: a calendar day, one of Thoth's locales, or text.
 * Nothing is preselected or defaulted, text stays on screen as typed, and emptying the control takes the answer
 * back. Whether an answer is a value the plan can use is the plan's decision, which the control only reports.
 */
const DescriptiveInput = ({ input, label, choose, invalidText, answer, onAnswer }: DescriptiveInputProps) => {
  const [draft, setDraft] = useState(answer ?? '');
  const shared = { label, size: 'small', error: invalidText !== undefined, helperText: invalidText } as const;

  switch (input) {
    case 'DATE':
      return (
        <TextField
          {...shared}
          type="date"
          value={answer ?? ''}
          onChange={(event) => onAnswer(event.target.value === '' ? undefined : event.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      );
    case 'LOCALE':
      return (
        <TextField
          {...shared}
          select
          value={answer ?? ''}
          onChange={(event) => onAnswer(event.target.value === '' ? undefined : event.target.value)}
          slotProps={NATIVE_SELECT}
        >
          <option value="">{choose}</option>
          {languageOptionsAlt.map(({ label: name, value }) => (
            <option key={value} value={value}>
              {name}
            </option>
          ))}
        </TextField>
      );
    case 'TEXT':
      return (
        <TextField
          {...shared}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            onAnswer(event.target.value === '' ? undefined : event.target.value);
          }}
        />
      );
  }
};

type EditionInputProps = {
  readonly label: string;
  readonly invalidText: string;
  readonly value: number | undefined;
  readonly onChange: (edition: number | undefined) => void;
};

/**
 * The edition number the publisher gives a Work the file describes as a new or revised edition. What is typed
 * stays on screen as typed; only a whole number of 1 or more that Thoth can store becomes the decision.
 */
const EditionInput = ({ label, invalidText, value, onChange }: EditionInputProps) => {
  const [draft, setDraft] = useState(value === undefined ? '' : String(value));
  const invalid = draft.trim().length > 0 && normaliseEditionNumber(draft).kind !== 'VALID';

  return (
    <TextField
      label={label}
      value={draft}
      error={invalid}
      helperText={invalid ? invalidText : undefined}
      onChange={(event) => {
        const typed = event.target.value;
        const edition = normaliseEditionNumber(typed);

        setDraft(typed);
        onChange(edition.kind === 'VALID' ? edition.value : undefined);
      }}
      slotProps={{ htmlInput: { inputMode: 'numeric' } }}
      size="small"
    />
  );
};
