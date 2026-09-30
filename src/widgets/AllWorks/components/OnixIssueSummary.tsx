'use client';

import AutoFixHighOutlinedIcon from '@mui/icons-material/AutoFixHighOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import { Box } from '@mui/material';
import { type ReactNode, useId, useState } from 'react';

import { useTypedTranslation } from '@/src/shared/hooks';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import type { TranslateFunction } from '@/src/shared/parsers';
import type { RecoveryMarker, SourceFinding } from '@/src/shared/parsers/XMLParser/validation';
import type { ImportIssue, ImportIssueCode, ImportIssueSource } from '@/src/shared/types';
import { Typography } from '@/src/shared/ui';

/**
 * The publisher-facing summary of what an ONIX import check found (thoth-app#206).
 *
 * A validated file can raise hundreds of issues, most of them the same problem repeated across Products. Listed
 * flat, a genuine blocker disappears among recovered findings and advice. This groups the issues into the four
 * questions a publisher asks - what blocks the import, what Thoth handled automatically, what will not be
 * imported, and what is merely advice - and within each, repeated occurrences of one problem into one item.
 *
 * It is a projection of the issues and nothing more. Grouping reads only the structured evidence each issue
 * already carries - the canonical source finding, recovery marker, support envelope or runtime failure of an
 * ONIX source-validation issue, and the stable `code` of every other issue - never display text, and it changes
 * no severity: an error is always listed as needing attention, a warning never is. Every issue stays reachable
 * in the technical details of its group, with its complete evidence.
 */

/** The four questions a diagnostic answers, in the order a publisher needs them answered. */
export const ISSUE_CATEGORIES = ['attention', 'handled', 'notImported', 'recommendation'] as const;
export type IssueCategory = (typeof ISSUE_CATEGORIES)[number];

/** What a group is, said in words beside its category rather than left to colour. */
export type IssueKind = 'validity' | 'support' | 'security' | 'unavailable' | 'recovered' | 'import';

/**
 * One place a problem occurs: one issue, or a recovered source finding together with the recovery marker that
 * handled that very occurrence. `index` is the position of its first issue in the list it was grouped from.
 */
export type IssueOccurrence = {
  readonly index: number;
  readonly issues: readonly ImportIssue[];
};

export type IssueGroup = {
  /** Stable identity, built from structured evidence only. */
  readonly key: string;
  readonly category: IssueCategory;
  readonly kind: IssueKind;
  /** In the order the issues were given, which is source-file order. */
  readonly occurrences: readonly IssueOccurrence[];
};

/**
 * Where a warning belongs, by its stable code. Errors always need attention, and ONIX source-validation issues
 * are placed by their own evidence first; this is what a warning's code says it is. Exhaustive, so a new code
 * does not compile until it has been given a place.
 */
export const WARNING_CATEGORY: Readonly<Record<ImportIssueCode, IssueCategory>> = {
  'file.validation': 'recommendation',
  'csv.validation': 'recommendation',
  'csv.parsing_failed': 'recommendation',
  'onix.validation': 'recommendation',
  'onix.processing_failed': 'recommendation',
  'onix.no_products': 'recommendation',
  'onix.series.non_publisher_collection_skipped': 'notImported',
  'onix.reference.unrepresentable_citation': 'notImported',
  'onix.reference.unusable_identifier': 'notImported',
  'onix.identifier.unusable_doi': 'notImported',
  'onix.date.unrepresentable': 'notImported',
  'onix.date.incompatible_status': 'notImported',
  'onix.text.unrepresentable_format': 'notImported',
  'onix.text.unrepresentable_structure': 'notImported',
  'onix.contributor.sequence_fallback': 'handled',
  'onix.location.unrepresentable_canonical': 'notImported',
  'onix.record.omitted': 'notImported',
  'onix.record.duplicate_collapsed': 'handled',
  'onix.identifier.unrepresentable': 'notImported',
  'onix.edition.normalised': 'handled',
  'onix.edition.unrepresentable': 'notImported',
  'onix.manifestation.normalised': 'handled',
  'onix.manifestation.omitted': 'notImported',
  'onix.target.already_present': 'notImported',
  'onix.target.existing_work_difference': 'notImported',
  'onix.compatibility.not_applied': 'recommendation',
  // One code for every descriptive fact that will not be imported as supplied, whether left out or normalised;
  // nothing structured tells the two apart, so both stay under "not imported as supplied" rather than being guessed.
  'onix.descriptive.disclosure': 'notImported',
  // An omission the publisher acknowledged is still an omission: acknowledged, never recovered.
  'onix.descriptive.acknowledged': 'notImported',
  'onix.target.unavailable': 'recommendation',
  'onix.source.validity': 'recommendation',
  'onix.source.support': 'recommendation',
  'onix.source.security': 'recommendation',
  'onix.source.recovered': 'handled',
  'onix.source.unavailable': 'recommendation',
};

/** Whether a list of issues is an ONIX import's: codes are namespaced by format, so this reads no message. */
export const hasOnixIssues = (issues: readonly ImportIssue[]): boolean =>
  issues.some(({ code }) => code.startsWith('onix.'));

const SCOPE_KIND: Readonly<Record<SourceFinding['scope'], IssueKind>> = {
  VALIDITY: 'validity',
  SUPPORT: 'support',
  SECURITY: 'security',
};

const findingOf = (issue: ImportIssue): SourceFinding | null =>
  issue.sourceValidation?.kind === 'finding' ? issue.sourceValidation.finding : null;

const recoveryOf = (issue: ImportIssue): RecoveryMarker | null =>
  issue.sourceValidation?.kind === 'recovery' ? issue.sourceValidation.recovery : null;

/** Where a recovery applied, and to which rule: the ordinary omission is bound to no rule of its own. */
const recoveryAnchor = (recovery: RecoveryMarker): { path: string; rule: string | null } =>
  recovery.recovery === 'OMIT_INVALID_COMPOSITE'
    ? { path: recovery.removed, rule: null }
    : { path: recovery.path, rule: recovery.rule };

/**
 * Pairs each recovery marker with the recovered finding it handled, where the evidence proves they are the same
 * occurrence: the same recovery at the same canonical path, of the marker's own rule when it names one, with
 * exactly one finding and one marker there. Anything less certain stays unpaired - listed separately, never lost.
 */
function pairRecoveries(issues: readonly ImportIssue[]): Map<ImportIssue, ImportIssue> {
  const findings = new Map<string, { issue: ImportIssue; finding: SourceFinding }[]>();
  const markers = new Map<string, { issue: ImportIssue; recovery: RecoveryMarker }[]>();

  issues.forEach((issue) => {
    const finding = findingOf(issue);
    if (finding && finding.recoverability !== 'NOT_RECOVERABLE' && finding.path) {
      const key = JSON.stringify([finding.recoverability, finding.path]);
      findings.set(key, [...(findings.get(key) ?? []), { issue, finding }]);
    }
    const recovery = recoveryOf(issue);
    if (recovery) {
      const key = JSON.stringify([recovery.recovery, recoveryAnchor(recovery).path]);
      markers.set(key, [...(markers.get(key) ?? []), { issue, recovery }]);
    }
  });

  const pairs = new Map<ImportIssue, ImportIssue>();
  markers.forEach((atPath, key) => {
    const candidates = findings.get(key) ?? [];
    if (atPath.length !== 1 || candidates.length !== 1) return;
    const [{ issue: markerIssue, recovery }] = atPath;
    const [{ issue: findingIssue, finding }] = candidates;
    const { rule } = recoveryAnchor(recovery);
    if (rule !== null && rule !== finding.id) return;
    pairs.set(findingIssue, markerIssue);
  });
  return pairs;
}

/**
 * The identity, category and kind of one issue.
 *
 * A source finding is identified by its whole disposition - rule or finding id, scope, class, tier, projection,
 * recoverability and whether it counts - and by its own canonical message. That message is a rule's fixed text for
 * every rule-specific finding, so it never splits one rule's occurrences; it is there because a tier-wide id such
 * as `ORDINARY_XSD_INVALID` reports every schema violation under one name, and only the message tells those
 * violations apart. Nothing is ever merged by it. Every other issue is identified by its code.
 */
function classify(issue: ImportIssue): { key: string; category: IssueCategory; kind: IssueKind } {
  const blocking = issue.severity === 'error';
  const evidence = issue.sourceValidation;

  switch (evidence?.kind) {
    case 'finding': {
      const { finding } = evidence;
      const recovered = finding.recoverability !== 'NOT_RECOVERABLE';
      return {
        key: JSON.stringify([
          'finding',
          issue.severity,
          issue.code,
          finding.id,
          finding.scope,
          finding.class,
          finding.tier,
          finding.stage,
          finding.blocking,
          finding.projection,
          finding.recoverability,
          finding.counts,
          finding.message ?? null,
        ]),
        category: blocking ? 'attention' : recovered ? 'handled' : 'recommendation',
        kind: recovered ? 'recovered' : SCOPE_KIND[finding.scope],
      };
    }
    case 'recovery': {
      const { recovery } = evidence;
      return {
        key: JSON.stringify(['recovery', issue.severity, issue.code, recovery.recovery, recoveryAnchor(recovery).rule]),
        category: blocking ? 'attention' : 'handled',
        kind: 'recovered',
      };
    }
    case 'support':
      return {
        key: JSON.stringify([
          'support',
          issue.severity,
          issue.code,
          evidence.envelope.engine,
          evidence.envelope.verdict,
        ]),
        category: blocking ? 'attention' : 'recommendation',
        kind: 'support',
      };
    case 'unavailable':
      return {
        key: JSON.stringify(['unavailable', issue.severity, issue.code, evidence.code]),
        category: blocking ? 'attention' : 'recommendation',
        kind: 'unavailable',
      };
    default:
      return {
        key: JSON.stringify(['issue', issue.severity, issue.code]),
        category: blocking ? 'attention' : WARNING_CATEGORY[issue.code],
        kind: 'import',
      };
  }
}

/**
 * Groups issues for the summary: by category in the order of `ISSUE_CATEGORIES`, then by identity in the order
 * each group first occurs. Every issue is in exactly one occurrence of exactly one group.
 */
export function groupImportIssues(issues: readonly ImportIssue[]): IssueGroup[] {
  const pairs = pairRecoveries(issues);
  const paired = new Set(pairs.values());
  const groups = new Map<
    string,
    { key: string; category: IssueCategory; kind: IssueKind; occurrences: IssueOccurrence[] }
  >();

  issues.forEach((issue, index) => {
    if (paired.has(issue)) return;
    const marker = pairs.get(issue);
    const occurrence: IssueOccurrence = { index, issues: marker ? [issue, marker] : [issue] };
    const { key, category, kind } = classify(issue);
    const group = groups.get(key);
    if (group) group.occurrences.push(occurrence);
    else groups.set(key, { key, category, kind, occurrences: [occurrence] });
  });

  const all = [...groups.values()];
  return ISSUE_CATEGORIES.flatMap((category) => all.filter((group) => group.category === category));
}

/** Every Product the issues of some occurrences point at, numbered from 1 as the file numbers them. */
const productsOf = (occurrences: readonly IssueOccurrence[]): number[] =>
  [
    ...new Set(
      occurrences.flatMap(({ issues }) =>
        issues.flatMap(({ source }) => (source.kind === 'onix' ? [source.productIndex] : [])),
      ),
    ),
  ].sort((a, b) => a - b);

/** Above this many Products the summary gives only their number; the technical details still name every one. */
const LISTED_PRODUCTS = 10;

type CategoryStyle = { accent: string; icon: ReactNode };

/** Colour is only an accent on the border and icon: the heading says the category in words. */
const CATEGORY_STYLE: Readonly<Record<IssueCategory, CategoryStyle>> = {
  attention: { accent: 'error.main', icon: <ErrorOutlineIcon fontSize="inherit" aria-hidden /> },
  handled: { accent: 'primary.main', icon: <AutoFixHighOutlinedIcon fontSize="inherit" aria-hidden /> },
  notImported: { accent: 'warning.main', icon: <RemoveCircleOutlineIcon fontSize="inherit" aria-hidden /> },
  recommendation: { accent: 'info.main', icon: <InfoOutlinedIcon fontSize="inherit" aria-hidden /> },
};

type OnixIssueSummaryProps = {
  /** The issues exactly as the parser reported them, in source-file order. */
  issues: readonly ImportIssue[];
  /** The translation key of the summary's heading, where the surrounding screen already names what these are. */
  heading?: string;
};

export const OnixIssueSummary = ({ issues, heading = 'issueSummary.heading' }: OnixIssueSummaryProps) => {
  const { t } = useTypedTranslation({ namespace: NAMESPACES.enum.common });
  const translate = t as TranslateFunction;
  const headingId = useId();

  const groups = groupImportIssues(issues);
  const blocked = groups.some(({ category }) => category === 'attention');

  return (
    <section aria-labelledby={headingId} data-testid="import-issue-summary" className="flex w-full flex-col gap-3">
      <Typography id={headingId} component="h2" className="font-semibold">
        {translate(heading)}
      </Typography>
      <Typography data-testid="import-issue-status">
        {translate(blocked ? 'issueSummary.status.blocked' : 'issueSummary.status.clear')}
      </Typography>
      {ISSUE_CATEGORIES.map((category) => {
        const inCategory = groups.filter((group) => group.category === category);
        return inCategory.length > 0 ? (
          <IssueCategorySection key={category} category={category} groups={inCategory} translate={translate} />
        ) : null;
      })}
    </section>
  );
};

type IssueCategorySectionProps = {
  category: IssueCategory;
  groups: readonly IssueGroup[];
  translate: TranslateFunction;
};

const IssueCategorySection = ({ category, groups, translate }: IssueCategorySectionProps) => {
  const headingId = useId();
  const { accent, icon } = CATEGORY_STYLE[category];
  const occurrences = groups.reduce((total, group) => total + group.occurrences.length, 0);

  return (
    <Box
      component="section"
      aria-labelledby={headingId}
      data-testid={`import-issue-category-${category}`}
      sx={{ borderColor: 'var(--color-border)', borderLeftColor: accent }}
      className="flex flex-col gap-2 rounded border border-l-4 border-solid p-4"
    >
      <Typography id={headingId} component="h3" className="flex flex-wrap items-center gap-2 font-semibold">
        {icon}
        <span>{translate(`issueSummary.category.${category}.heading`)}</span>{' '}
        <span className="font-normal">
          ({translate('issueSummary.groups', { count: groups.length })},{' '}
          {translate('issueSummary.occurrences', { count: occurrences })})
        </span>
      </Typography>
      <Typography>{translate(`issueSummary.category.${category}.description`)}</Typography>
      <ul className="flex flex-col gap-3">
        {groups.map((group) => (
          <IssueGroupItem key={group.key} group={group} accent={accent} translate={translate} />
        ))}
      </ul>
    </Box>
  );
};

/** What a group is about, in the publisher's terms: the recovery that handled it, the rule's text, or the code. */
const groupTitle = (group: IssueGroup, translate: TranslateFunction): string => {
  const [issue] = group.occurrences[0].issues;
  const evidence = issue.sourceValidation;
  switch (evidence?.kind) {
    case 'finding':
      return evidence.finding.recoverability !== 'NOT_RECOVERABLE'
        ? translate(`issueSummary.recovery.${evidence.finding.recoverability}`)
        : evidence.finding.message?.trim() || translate(`issueSummary.findingClass.${evidence.finding.class}`);
    case 'recovery':
      return translate(`issueSummary.recovery.${evidence.recovery.recovery}`);
    case 'support':
    case 'unavailable':
      return issue.message;
    default:
      return translate(`issueSummary.code.${issue.code}`);
  }
};

/** How a source finding stands, in plain words: its class, and whether it could be judged on its own. */
const findingNote = (group: IssueGroup, translate: TranslateFunction): string | null => {
  const finding = findingOf(group.occurrences[0].issues[0]);
  if (!finding || finding.recoverability !== 'NOT_RECOVERABLE') return null;
  const notes = [translate(`issueSummary.findingClass.${finding.class}`)];
  if (finding.projection !== 'AUTHORITATIVE') notes.push(translate(`issueSummary.projection.${finding.projection}`));
  return notes.join(' · ');
};

type IssueGroupItemProps = {
  group: IssueGroup;
  accent: string;
  translate: TranslateFunction;
};

const IssueGroupItem = ({ group, accent, translate }: IssueGroupItemProps) => {
  const titleId = useId();
  const count = group.occurrences.length;
  const products = productsOf(group.occurrences);
  const note = findingNote(group, translate);
  const [only] = group.occurrences;
  // A lone issue that is not a source finding explains itself best in its own words, so it is not hidden.
  const ownWords = count === 1 && group.kind === 'import' ? only.issues[0].message : null;
  const listed =
    products.length > LISTED_PRODUCTS ? `${products.slice(0, LISTED_PRODUCTS).join(', ')}, …` : products.join(', ');

  return (
    <li data-testid="import-issue-group" className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <Box
          component="span"
          sx={{ borderColor: accent }}
          data-testid="import-issue-kind"
          className="inline-flex items-center rounded border border-solid px-2 py-0.5 text-sm font-semibold"
        >
          {translate(`issueSummary.kind.${group.kind}`)}
        </Box>{' '}
        <Typography id={titleId} component="span" className="font-semibold">
          {groupTitle(group, translate)}
        </Typography>
      </div>
      {ownWords && <Typography>{ownWords}</Typography>}
      <Typography data-testid="import-issue-group-count">
        {translate('issueSummary.occurrences', { count })}
        {products.length > 0 && <> {translate('issueSummary.inProducts', { count: products.length, list: listed })}</>}
      </Typography>
      {note && <Typography>{note}</Typography>}
      {group.kind === 'recovered' && <Typography>{translate('issueSummary.stillInvalid')}</Typography>}
      <OccurrenceDetails group={group} titleId={titleId} translate={translate} />
    </li>
  );
};

type OccurrenceDetailsProps = {
  group: IssueGroup;
  /** The group's title, which completes the disclosure's accessible name so that each one is distinct. */
  titleId: string;
  translate: TranslateFunction;
};

/**
 * The complete evidence of every occurrence, behind a native disclosure button: keyboard-operable as any button
 * is, with its state in `aria-expanded` and its name completed by the group's title. The details are only built
 * once asked for, so a file with thousands of findings does not render them all up front.
 */
const OccurrenceDetails = ({ group, titleId, translate }: OccurrenceDetailsProps) => {
  const [open, setOpen] = useState(false);
  const labelId = useId();
  const regionId = useId();
  const count = group.occurrences.length;

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={regionId}
        aria-labelledby={`${labelId} ${titleId}`}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 font-semibold underline"
      >
        {open ? <ExpandLessIcon fontSize="small" aria-hidden /> : <ExpandMoreIcon fontSize="small" aria-hidden />}
        <span id={labelId}>{translate('issueSummary.details.toggle', { count })}</span>
      </button>
      <div id={regionId} hidden={!open} data-testid="import-issue-details">
        {open && (
          <ol className="mt-2 flex list-decimal flex-col gap-3 pl-6">
            {group.occurrences.map((occurrence) => (
              <li key={occurrence.index} data-testid="import-issue-occurrence">
                {occurrence.issues.map((issue) => (
                  <IssueEvidence key={issue.sourceValidation?.kind ?? 'issue'} issue={issue} translate={translate} />
                ))}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
};

/** A value as the technical details show it: text as it is, anything structured as JSON. */
const shown = (value: unknown): string => (typeof value === 'string' ? value : JSON.stringify(value));

const where = (source: ImportIssueSource, translate: TranslateFunction): string => {
  switch (source.kind) {
    case 'file':
      return translate('issueSummary.details.file');
    case 'csv':
      return translate('issueSummary.details.row', { row: source.row });
    case 'onix':
      return source.recordReference
        ? translate('issueSummary.details.productReference', {
            index: source.productIndex,
            reference: source.recordReference,
          })
        : translate('issueSummary.details.product', { index: source.productIndex });
  }
};

type Row = readonly [label: string, value: string, technical?: boolean];

/** Every field of a finding that describes it, nothing summarised away. */
const findingRows = (finding: SourceFinding, translate: TranslateFunction): Row[] => [
  [translate('issueSummary.details.findingId'), finding.id, true],
  [translate('issueSummary.details.scope'), finding.scope, true],
  [translate('issueSummary.details.class'), finding.class, true],
  [translate('issueSummary.details.projection'), finding.projection, true],
  [translate('issueSummary.details.recoverability'), finding.recoverability, true],
  [translate('issueSummary.details.tier'), `${finding.tier} (${finding.stage})`, true],
  ...(finding.policy ? [[translate('issueSummary.details.policy'), finding.policy, true] as const] : []),
  ...(finding.path ? [[translate('issueSummary.details.path'), finding.path, true] as const] : []),
  ...(finding.sourcePath && finding.sourcePath !== finding.path
    ? [[translate('issueSummary.details.sourcePath'), finding.sourcePath, true] as const]
    : []),
  ...(finding.message ? [[translate('issueSummary.details.findingMessage'), finding.message] as const] : []),
  ...(finding.detail
    ? [[translate('issueSummary.details.detail'), JSON.stringify(finding.detail), true] as const]
    : []),
];

/**
 * A recovery marker's kind and the path it applied to - the composite it omitted, or the one a post-conformance
 * recovery kept - then every other field it records, under its own name.
 */
const recoveryRows = (recovery: RecoveryMarker, translate: TranslateFunction): Row[] => {
  const pathField = recovery.recovery === 'OMIT_INVALID_COMPOSITE' ? 'removed' : 'path';
  return [
    [translate('issueSummary.details.recovery'), recovery.recovery, true],
    [translate('issueSummary.details.recoveryPath'), recoveryAnchor(recovery).path, true],
    ...Object.entries(recovery)
      .filter(([field]) => field !== 'recovery' && field !== pathField)
      .map(([field, value]) => [field, shown(value), true] as const),
  ];
};

const evidenceRows = (issue: ImportIssue, translate: TranslateFunction): Row[] => {
  const evidence = issue.sourceValidation;
  switch (evidence?.kind) {
    case 'finding':
      return findingRows(evidence.finding, translate);
    case 'recovery':
      return recoveryRows(evidence.recovery, translate);
    case 'support':
      return Object.entries(evidence.envelope).map(([field, value]) => [field, shown(value), true] as const);
    case 'unavailable':
      return [
        [translate('issueSummary.details.failureCode'), evidence.code, true],
        [translate('issueSummary.details.failureMessage'), evidence.message],
      ];
    default:
      return [];
  }
};

const IssueEvidence = ({ issue, translate }: { issue: ImportIssue; translate: TranslateFunction }) => {
  const rows: Row[] = [
    [translate('issueSummary.details.location'), where(issue.source, translate)],
    [translate('issueSummary.details.code'), issue.code, true],
    [translate('issueSummary.details.message'), issue.message],
    ...evidenceRows(issue, translate),
  ];

  return (
    <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-1">
      {rows.map(([label, value, technical]) => (
        <div key={label} className="contents">
          <dt className="font-semibold">{label}</dt>
          <dd className={technical ? 'm-0 font-mono text-sm break-all' : 'm-0'}>{value}</dd>
        </div>
      ))}
    </dl>
  );
};
