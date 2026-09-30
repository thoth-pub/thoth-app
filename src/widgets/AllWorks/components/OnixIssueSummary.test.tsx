import { ThemeProvider } from '@mui/material';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import commonEn from '@/src/shared/i18n/locales/en/common.json';
import type { TranslateFunction } from '@/src/shared/parsers';
import { runOnixSourceGate } from '@/src/shared/parsers/XMLParser/__regression__/pipeline';
import {
  projectOnixRefusal,
  projectOnixSourceIssues,
  projectOnixUnavailable,
} from '@/src/shared/parsers/XMLParser/onixSourceBridge';
import {
  ENGINE_ENVELOPES,
  type EnvelopeEvidence,
  type OnixWorkerResult,
  type RecoveryMarker,
  type SourceFinding,
} from '@/src/shared/parsers/XMLParser/validation';
import { theme } from '@/src/shared/theme';
import type { ImportIssue, ImportIssueCode } from '@/src/shared/types';

import {
  groupImportIssues,
  hasOnixIssues,
  type IssueGroup,
  OnixIssueSummary,
  WARNING_CATEGORY,
} from './OnixIssueSummary';

/** The app's English copy, so what is asserted is what a publisher reads, plurals included. */
const i18n = createInstance();
const t = ((key: string, options?: Record<string, unknown>) => i18n.t(key, options)) as TranslateFunction;

beforeAll(() =>
  i18n.init({
    lng: 'en',
    fallbackLng: 'en',
    ns: ['common'],
    defaultNS: 'common',
    resources: { en: { common: commonEn } },
    interpolation: { escapeValue: false },
    initAsync: false,
  }),
);

// The project does not enable vitest globals, so RTL's auto-cleanup does not run.
afterEach(cleanup);

const REFERENCE_NS = 'http://ns.editeur.org/onix/3.0/reference';
const inProduct = (product: number, tail = '') => `/ONIXMessage[1]/Product[${product}]${tail}`;

const LANGUAGE_RULE = 'Original language of a translation must be distinct from the language of the main text';
const CATEGORY_RULE = 'A publisher’s own category code requires SubjectSchemeName';
const ISNI_RULE = 'IDValue must be a valid ISNI (invalid characters)';

/** A counting finding of the blocking rule the UoLP language-role incident raised, in one Product. */
const blocker = (product: number, overrides: Partial<SourceFinding> = {}): SourceFinding => ({
  id: '_20171218_f_2',
  tier: 'STRICT',
  stage: 6,
  scope: 'VALIDITY',
  class: 'NORMATIVE_INVALID',
  blocking: true,
  projection: 'AUTHORITATIVE',
  recoverability: 'NOT_RECOVERABLE',
  counts: true,
  path: inProduct(product, '/DescriptiveDetail[1]'),
  message: LANGUAGE_RULE,
  detail: { authorityKind: 'EDITEUR_STRICT', ruleSource: 'strict' },
  ...overrides,
});

const categoryPath = (product: number, subject: number) =>
  inProduct(product, `/DescriptiveDetail[1]/Subject[${subject}]`);
const isniPath = (product: number, publisher: number) =>
  inProduct(product, `/PublishingDetail[1]/Publisher[${publisher}]/PublisherIdentifier[1]`);

/** The recovered category finding exactly as the overlay leaves it: the standard's fields, only recoverability changed. */
const recoveredCategory = (product: number, subject: number): SourceFinding =>
  blocker(product, {
    id: '_20171218_a_2',
    recoverability: 'PUBLISHER_CATEGORY_TO_CUSTOM',
    counts: false,
    path: categoryPath(product, subject),
    message: CATEGORY_RULE,
  });

const categoryMarker = (product: number, subject: number, value = 'HIS'): RecoveryMarker => ({
  recovery: 'PUBLISHER_CATEGORY_TO_CUSTOM',
  rule: '_20171218_a_2',
  path: categoryPath(product, subject),
  scheme: { element: 'SubjectSchemeIdentifier', code: '23' },
  valueSource: 'SubjectCode',
  valuePath: `${categoryPath(product, subject)}/SubjectCode[1]`,
  value,
});

const recoveredIsni = (product: number, publisher: number): SourceFinding =>
  blocker(product, {
    id: '_20171126_b_42',
    recoverability: 'NORMALIZE_IDENTIFIER_LEXICAL_FORM',
    counts: false,
    path: isniPath(product, publisher),
    message: ISNI_RULE,
  });

const isniMarker = (product: number, publisher: number): RecoveryMarker => ({
  recovery: 'NORMALIZE_IDENTIFIER_LEXICAL_FORM',
  rule: '_20171126_b_42',
  path: isniPath(product, publisher),
  valuePath: `${isniPath(product, publisher)}/IDValue[1]`,
  scheme: { element: 'PublisherIDType', code: '16' },
  original: `0000-0001-2345-678${product}`,
  canonical: `000000012345678${product}`,
});

const advisory = (product: number, overrides: Partial<SourceFinding> = {}): SourceFinding =>
  blocker(product, {
    id: '_20180214_a_1',
    class: 'ADVISORY',
    blocking: false,
    counts: false,
    message: 'Product composition must be consistent with Product form',
    ...overrides,
  });

/** A completed canonical result, projected to upload issues by the live bridge rather than written by hand. */
const sourceIssues = (findings: SourceFinding[], recoveries: RecoveryMarker[] = []): ImportIssue[] => {
  const result: OnixWorkerResult = {
    status: 'COMPLETED',
    stop: null,
    source: { release: '3.0', schemaRelease: '3.0.8', flavour: 'reference', namespaceURI: REFERENCE_NS },
    findings,
    summary: { total: findings.length, blocking: 0, secondary: 0, notEvaluable: 0, recovered: recoveries.length },
    sourceValid: findings.every(({ counts }) => !counts),
    normalized: {
      xml: `<ONIXMessage release="3.0" xmlns="${REFERENCE_NS}"/>`,
      elementCount: 1,
      recoveries,
      provenance: { kind: 'IDENTITY', flavour: 'reference' },
    },
  };
  return projectOnixSourceIssues(result, t);
};

/** A planner disclosure, shaped as the planner shapes them: a code, English text and the record it is about. */
const plannerWarning = (code: ImportIssueCode, message: string, productIndex: number): ImportIssue => ({
  severity: 'warning',
  code,
  message,
  source: { kind: 'onix', productIndex, recordReference: `press.${productIndex}` },
});

const byCategory = (groups: IssueGroup[], category: IssueGroup['category']) =>
  groups.filter((group) => group.category === category);

/** Every issue each group holds, in occurrence order. */
const issuesOf = (group: IssueGroup) => group.occurrences.flatMap(({ issues }) => issues);

/** The UoLP shape (thoth-app#206, #235): repeated category and ISNI recoveries, a repeated real blocker, advisories. */
const uolpShaped = (): ImportIssue[] =>
  sourceIssues(
    [1, 2, 3].flatMap((product) => [
      advisory(product),
      blocker(product),
      ...[1, 2, 3, 4].map((subject) => recoveredCategory(product, subject)),
      ...(product === 1 ? [recoveredIsni(1, 1), recoveredIsni(1, 2)] : [recoveredIsni(product, 1)]),
    ]),
    [1, 2, 3].flatMap((product) => [
      ...[1, 2, 3, 4].map((subject) => categoryMarker(product, subject)),
      ...(product === 1 ? [isniMarker(1, 1), isniMarker(1, 2)] : [isniMarker(product, 1)]),
    ]),
  );

describe('groupImportIssues', () => {
  it('groups one blocking rule raised by three Products into one Needs attention group of three exact occurrences', () => {
    const findings = [blocker(1), blocker(2), blocker(3)];
    const issues = sourceIssues(findings);

    const groups = groupImportIssues(issues);

    expect(groups).toHaveLength(1);
    const [group] = groups;
    expect(group.category).toBe('attention');
    expect(group.kind).toBe('validity');
    expect(group.occurrences.map(({ issues: [issue] }) => issue)).toEqual(issues);
    expect(
      group.occurrences.map(({ issues: [issue] }) =>
        issue.sourceValidation?.kind === 'finding' ? issue.sourceValidation.finding : null,
      ),
    ).toEqual(findings);
  });

  it('pairs every recovered finding with its own marker under Automatically handled, never as blocking', () => {
    const issues = uolpShaped();

    const handled = byCategory(groupImportIssues(issues), 'handled');

    expect(handled.map((group) => [group.kind, group.occurrences.length])).toEqual([
      ['recovered', 12],
      ['recovered', 4],
    ]);
    handled.forEach((group) =>
      group.occurrences.forEach(({ issues: pair }) => {
        const [finding, marker] = pair;
        // Both pieces of evidence stay, the original finding first, and they describe the same place.
        expect(pair).toHaveLength(2);
        expect(finding.sourceValidation?.kind).toBe('finding');
        expect(marker.sourceValidation?.kind).toBe('recovery');
        if (finding.sourceValidation?.kind !== 'finding' || marker.sourceValidation?.kind !== 'recovery') return;
        expect(finding.sourceValidation.finding.class).toBe('NORMATIVE_INVALID');
        expect(finding.severity).toBe('warning');
        expect(marker.sourceValidation.recovery.recovery).toBe(finding.sourceValidation.finding.recoverability);
        expect(marker.source).toEqual(finding.source);
      }),
    );
  });

  it('keeps recovered findings and markers apart, and both listed, when the evidence cannot prove one occurrence', () => {
    // Two markers claim the same Subject, and the finding at an ISNI marker's path is of another rule than the marker's.
    const issues = sourceIssues(
      [recoveredCategory(1, 1), { ...recoveredIsni(1, 1), id: '_20171126_b_43' }],
      [categoryMarker(1, 1, 'HIS'), categoryMarker(1, 1, 'LIT'), isniMarker(1, 1)],
    );

    const groups = groupImportIssues(issues);

    expect(groups.every(({ category }) => category === 'handled')).toBe(true);
    expect(groups.flatMap(({ occurrences }) => occurrences).every(({ issues: held }) => held.length === 1)).toBe(true);
    expect(groups.flatMap(issuesOf)).toHaveLength(issues.length);
    expect(new Set(groups.flatMap(issuesOf))).toEqual(new Set(issues));
  });

  it('places advisory, deprecated, secondary and not-evaluable findings under Recommendations, never as blocking', () => {
    const issues = sourceIssues([
      advisory(1),
      advisory(2),
      advisory(1, { id: '_20171221_i_5', class: 'DEPRECATED_OR_INFORMATIONAL', message: 'Deprecated element' }),
      blocker(1, { projection: 'SECONDARY', counts: false }),
      blocker(2, { projection: 'NOT_EVALUABLE', class: 'RULE_NOT_EVALUABLE', blocking: false, counts: false }),
    ]);

    const groups = groupImportIssues(issues);

    expect(groups.map((group) => [group.category, group.occurrences.length])).toEqual([
      ['recommendation', 2],
      ['recommendation', 1],
      ['recommendation', 1],
      ['recommendation', 1],
    ]);
    expect(issues.every(({ severity }) => severity === 'warning')).toBe(true);
  });

  it('keeps SUPPORT, SECURITY and validation-unavailable stops distinct from invalid findings and from each other', () => {
    const envelope: EnvelopeEvidence = {
      engine: 'chromium',
      bytes: 90_000_000,
      products: { measured: true, count: 10 },
      verdict: 'REFUSE',
      limits: ENGINE_ENVELOPES.chromium,
      exceeded: ['bytes'],
    };
    const issues = [
      ...sourceIssues([
        blocker(1),
        blocker(1, {
          id: 'UNSUPPORTED_SOURCE',
          scope: 'SUPPORT',
          class: 'PROCESSING_STOP',
          path: null,
          message: 'ONIX 2.1',
        }),
        blocker(1, { id: 'SECURITY_DTD', scope: 'SECURITY', class: 'PROCESSING_STOP', path: null, message: 'DOCTYPE' }),
      ]),
      ...projectOnixRefusal(envelope, t),
      ...projectOnixUnavailable({ code: 'WORKER_FAILED', message: 'The Worker failed' }, t),
    ];

    const groups = groupImportIssues(issues);

    expect(groups.map(({ category, kind }) => [category, kind])).toEqual([
      ['attention', 'validity'],
      ['attention', 'support'],
      ['attention', 'security'],
      ['attention', 'support'],
      ['attention', 'unavailable'],
    ]);
    expect(new Set(groups.map(({ key }) => key)).size).toBe(5);
  });

  it('groups repeated target losses by their stable code under Unsupported — not imported, one occurrence each', () => {
    const issues = [
      plannerWarning('onix.edition.unrepresentable', 'EditionStatement "Revised" of record 1 has no Thoth field', 1),
      plannerWarning('onix.record.duplicate_collapsed', 'Records 2 and 3 repeat the same Product record', 2),
      plannerWarning('onix.edition.unrepresentable', 'EditionStatement "Second" of record 2 has no Thoth field', 2),
      plannerWarning('onix.descriptive.acknowledged', 'Acknowledged by the publisher: a title will not be imported', 2),
      plannerWarning('onix.edition.unrepresentable', 'EditionStatement "Third" of record 4 has no Thoth field', 4),
    ];

    const groups = groupImportIssues(issues);

    expect(groups.map((group) => [group.category, JSON.parse(group.key)[2], group.occurrences.length])).toEqual([
      ['handled', 'onix.record.duplicate_collapsed', 1],
      ['notImported', 'onix.edition.unrepresentable', 3],
      // An acknowledged loss is still a loss: acknowledged, never recovered, and never merged with another code.
      ['notImported', 'onix.descriptive.acknowledged', 1],
    ]);
    expect(issuesOf(groups[1])).toEqual([issues[0], issues[2], issues[4]]);
  });

  it('never merges semantically distinct issues because their visible text is the same', () => {
    const same = 'The same words';
    const issues = [
      // Same canonical message, different rules.
      ...sourceIssues([blocker(1, { message: same }), blocker(2, { id: '_20171218_f_3', message: same })]),
      // Same rule and message, but one could only be judged against an already invalid part.
      ...sourceIssues([blocker(3, { message: same, projection: 'SECONDARY', counts: false })]),
      // Same advisory rule, text and severity, told apart by projection alone.
      ...sourceIssues([advisory(1, { message: same }), advisory(2, { message: same, projection: 'SECONDARY' })]),
      // One tier-wide id, two different schema violations.
      ...sourceIssues([
        blocker(1, {
          id: 'ORDINARY_XSD_INVALID',
          tier: 'CANONICAL_ORDINARY',
          stage: 5,
          class: 'SOURCE_INVALID',
          message: 'Element A: not expected',
        }),
        blocker(2, {
          id: 'ORDINARY_XSD_INVALID',
          tier: 'CANONICAL_ORDINARY',
          stage: 5,
          class: 'SOURCE_INVALID',
          message: 'Element B: missing',
        }),
      ]),
      // Same display text, different codes; and the same code at two severities.
      plannerWarning('onix.edition.unrepresentable', same, 1),
      plannerWarning('onix.identifier.unrepresentable', same, 1),
      { ...plannerWarning('onix.validation', same, 2), severity: 'error' as const },
      plannerWarning('onix.validation', same, 2),
    ];

    const groups = groupImportIssues(issues);

    expect(groups).toHaveLength(issues.length);
    expect(new Set(groups.map(({ key }) => key)).size).toBe(issues.length);
  });

  it('represents every issue exactly once, in its source order within each group', () => {
    const issues = [...uolpShaped(), plannerWarning('onix.manifestation.normalised', 'normalised', 2)];

    const groups = groupImportIssues(issues);
    const held = groups.flatMap(issuesOf);

    expect(held).toHaveLength(issues.length);
    expect(new Set(held)).toEqual(new Set(issues));
    groups.forEach(({ occurrences }) =>
      expect(occurrences.map(({ index }) => index)).toEqual(
        [...occurrences.map(({ index }) => index)].sort((a, b) => a - b),
      ),
    );
  });

  it('collapses the UoLP shape into four understandable groups instead of a flat 38-line list', () => {
    const issues = uolpShaped();

    const groups = groupImportIssues(issues);

    expect(issues).toHaveLength(38);
    expect(groups.map((group) => [group.category, group.kind, group.occurrences.length])).toEqual([
      ['attention', 'validity', 3],
      ['handled', 'recovered', 12],
      ['handled', 'recovered', 4],
      ['recommendation', 'validity', 3],
    ]);
  });

  it('recognises an ONIX issue list by its codes alone', () => {
    expect(hasOnixIssues(uolpShaped())).toBe(true);
    expect(
      hasOnixIssues([{ severity: 'error', code: 'csv.validation', message: 'onix.', source: { kind: 'csv', row: 2 } }]),
    ).toBe(false);
    expect(hasOnixIssues([])).toBe(false);
  });
});

describe('issueSummary copy', () => {
  type Tree = { [key: string]: string | Tree };
  const flatten = (tree: Tree, prefix = ''): [string, string][] =>
    Object.entries(tree).flatMap(([key, value]) =>
      typeof value === 'string' ? [[`${prefix}${key}`, value] as [string, string]] : flatten(value, `${prefix}${key}.`),
    );
  const placeholders = (text: string) => [...text.matchAll(/\{\{(\w+)\}\}/g)].map(([, name]) => name).sort();

  it.each(['en', 'de', 'es', 'pt'])(
    'names every code and says every label in %s, with the English placeholders',
    async (locale) => {
      const { issueSummary } = (await import(`@/src/shared/i18n/locales/${locale}/common.json`)) as {
        issueSummary: Tree;
      };
      const english = new Map(flatten(commonEn.issueSummary as Tree));
      const labels = new Map(flatten(issueSummary));

      expect([...labels.keys()].sort()).toEqual([...english.keys()].sort());
      labels.forEach((text, key) => {
        expect(text, key).toMatch(/\S/);
        expect(placeholders(text), key).toEqual(placeholders(english.get(key) ?? ''));
      });
      Object.keys(WARNING_CATEGORY).forEach((code) => expect(labels.get(`code.${code}`), code).toMatch(/\S/));
    },
  );
});

/** A hex colour as jsdom's style declarations serialise it. */
const rgbOf = (hex: string) =>
  `rgb(${[1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16)).join(', ')})`;

/**
 * Every text colour the emitted stylesheets declare for an element or any ancestor up to `boundary`. jsdom computes
 * no cascade, so the rules of each element's own Emotion classes are the evidence of the colour a browser paints.
 */
const declaredTextColours = (element: Element, boundary: Element): string[] => {
  const rules = [...document.styleSheets].flatMap((sheet) => [...sheet.cssRules]);
  const colours: string[] = [];

  for (let current: Element | null = element; current !== null; current = current.parentElement) {
    const classes = [...current.classList].map((name) => `.${name}`);

    rules.forEach((rule) => {
      if (!(rule instanceof CSSStyleRule) || !rule.style.color) return;
      if (rule.selectorText.split(/[\s,>+~]+/).some((selector) => classes.includes(selector))) {
        colours.push(rule.style.color.toLowerCase());
      }
    });

    if (current === boundary) break;
  }

  return colours;
};

const renderSummary = (issues: readonly ImportIssue[], heading?: string) =>
  render(
    <I18nextProvider i18n={i18n}>
      <ThemeProvider theme={theme}>
        <OnixIssueSummary issues={issues} heading={heading} />
      </ThemeProvider>
    </I18nextProvider>,
  );

const category = (name: IssueGroup['category']) => screen.getByTestId(`import-issue-category-${name}`);

describe('OnixIssueSummary', () => {
  it('answers first whether the file can be imported, then what needs attention, with headings and counts', () => {
    renderSummary(uolpShaped());

    expect(screen.getByRole('heading', { level: 2, name: 'What the import check found' })).toBeInTheDocument();
    expect(screen.getByTestId('import-issue-status')).toHaveTextContent(
      'This file cannot be imported until everything under “Needs attention — blocks import” is resolved.',
    );
    expect(screen.getAllByRole('heading', { level: 3 }).map(({ textContent }) => textContent)).toEqual([
      'Needs attention — blocks import (1 issue, 3 occurrences)',
      'Automatically handled (2 issues, 16 occurrences)',
      'Recommendations (1 issue, 3 occurrences)',
    ]);

    const attention = within(category('attention')).getByTestId('import-issue-group');
    expect(attention).toHaveTextContent(LANGUAGE_RULE);
    expect(within(attention).getByTestId('import-issue-group-count')).toHaveTextContent(
      '3 occurrences in 3 Products (1, 2, 3)',
    );
    expect(within(attention).getByText('Breaks a normative ONIX rule')).toBeInTheDocument();
  });

  it('says nothing blocks the import when only warnings are given, under the heading its screen gives it', () => {
    renderSummary(
      uolpShaped().filter(({ severity }) => severity === 'warning'),
      'warnings',
    );

    expect(screen.getByRole('heading', { level: 2, name: 'Warnings' })).toBeInTheDocument();
    expect(screen.getByTestId('import-issue-status')).toHaveTextContent('Nothing listed here blocks the import.');
    expect(screen.queryByTestId('import-issue-category-attention')).not.toBeInTheDocument();
  });

  it('presents a recovered finding as handled and still invalid, never as valid', () => {
    renderSummary(uolpShaped());

    const handled = category('handled');
    expect(handled).toHaveTextContent('A recovered finding is still a standards error in the submitted file.');
    const [categories, isnis] = within(handled).getAllByTestId('import-issue-group');
    expect(categories).toHaveTextContent(
      "The publisher's own subject categories without a scheme name are kept without one",
    );
    expect(isnis).toHaveTextContent('ISNI identifiers supplied with spaces or hyphens are read without them');
    [categories, isnis].forEach((group) => {
      expect(within(group).getByTestId('import-issue-kind')).toHaveTextContent('Recovered');
      expect(group).toHaveTextContent(
        'Handled automatically, but the submitted file is still invalid ONIX at these places.',
      );
      // "Still invalid", never "valid": nothing in the group claims the recovered part conforms.
      expect(group.textContent).not.toMatch(/\bvalid\b/i);
    });
    expect(within(categories).getByTestId('import-issue-group-count')).toHaveTextContent(
      '12 occurrences in 3 Products (1, 2, 3)',
    );
    expect(within(isnis).getByTestId('import-issue-group-count')).toHaveTextContent(
      '4 occurrences in 3 Products (1, 2, 3)',
    );
  });

  it("keeps each recovered occurrence's original invalid finding and its recovery marker in the technical details", async () => {
    const user = userEvent.setup();
    renderSummary(uolpShaped());

    const [, isnis] = within(category('handled')).getAllByTestId('import-issue-group');
    await user.click(within(isnis).getByRole('button', { name: /^Technical details \(4 occurrences\)/ }));

    const occurrences = within(isnis).getAllByTestId('import-issue-occurrence');
    expect(occurrences).toHaveLength(4);
    const [first] = occurrences;
    // The original finding, whole: rule, scope, class, projection, recoverability, path, its own message and detail.
    [
      '_20171126_b_42',
      'VALIDITY',
      'NORMATIVE_INVALID',
      'AUTHORITATIVE',
      'NORMALIZE_IDENTIFIER_LEXICAL_FORM',
      isniPath(1, 1),
      ISNI_RULE,
      'EDITEUR_STRICT',
      'Product 1',
      'onix.source.validity',
    ].forEach((evidence) => expect(first).toHaveTextContent(evidence));
    // And the recovery that handled it: its kind, the path it applied to, and the values it read.
    [
      'onix.source.recovered',
      `${isniPath(1, 1)}/IDValue[1]`,
      '0000-0001-2345-6781',
      '0000000123456781',
      'PublisherIDType',
    ].forEach((evidence) => expect(first).toHaveTextContent(evidence));
  });

  it('shows the original source path of a Short source beside its canonical path', async () => {
    const user = userEvent.setup();
    renderSummary(sourceIssues([blocker(2, { sourcePath: '/ONIXmessage[1]/product[2]/descriptivedetail[1]' })]));

    await user.click(screen.getByRole('button', { name: /^Technical details \(1 occurrence\)/ }));

    const [occurrence] = screen.getAllByTestId('import-issue-occurrence');
    expect(within(occurrence).getByText('Original source path')).toBeInTheDocument();
    expect(within(occurrence).getByText('/ONIXmessage[1]/product[2]/descriptivedetail[1]')).toBeInTheDocument();
    expect(within(occurrence).getByText(inProduct(2, '/DescriptiveDetail[1]'))).toBeInTheDocument();
  });

  it('keeps advice and deprecations under Recommendations, saying which is which', () => {
    renderSummary(
      sourceIssues([
        advisory(1),
        advisory(1, { id: '_20171221_i_5', class: 'DEPRECATED_OR_INFORMATIONAL', message: 'Deprecated element' }),
        blocker(2, { projection: 'SECONDARY', counts: false }),
      ]),
    );

    const groups = within(category('recommendation')).getAllByTestId('import-issue-group');
    expect(groups).toHaveLength(3);
    expect(groups[0]).toHaveTextContent('Advisory (best practice)');
    expect(groups[1]).toHaveTextContent('Deprecated or informational');
    expect(groups[2]).toHaveTextContent('Depends on a part of the file that is already invalid');
    expect(screen.getByTestId('import-issue-status')).toHaveTextContent('Nothing listed here blocks the import.');
  });

  it('says in words which stop is a support, security or validation-unavailable outcome', () => {
    renderSummary([
      ...sourceIssues([
        blocker(1),
        blocker(1, {
          id: 'SECURITY_DTD',
          scope: 'SECURITY',
          class: 'PROCESSING_STOP',
          path: null,
          message: 'A DOCTYPE is refused',
        }),
      ]),
      ...projectOnixUnavailable({ code: 'WORKER_FAILED', message: 'The Worker failed' }, t),
    ]);

    expect(
      within(category('attention'))
        .getAllByTestId('import-issue-kind')
        .map(({ textContent }) => textContent),
    ).toEqual(['ONIX rule', 'Security stop', 'Validation unavailable']);
  });

  it('keeps a lone issue that is not a source finding in its own words, without opening its details', () => {
    renderSummary([
      {
        severity: 'error',
        code: 'onix.processing_failed',
        message: 'The file could not be read as ONIX.',
        source: { kind: 'file' },
      },
    ]);

    const [group] = screen.getAllByTestId('import-issue-group');
    expect(within(group).getByText('The file could not be read as ONIX.')).toBeVisible();
    expect(group).toHaveTextContent('The file could not be processed');
  });

  it("lists repeated target losses under Unsupported — not imported with each occurrence's record and message", async () => {
    const user = userEvent.setup();
    renderSummary([
      plannerWarning('onix.edition.unrepresentable', 'EditionStatement "Revised" of record 1 has no Thoth field', 1),
      plannerWarning('onix.edition.unrepresentable', 'EditionStatement "Second" of record 2 has no Thoth field', 2),
    ]);

    const group = within(category('notImported')).getByTestId('import-issue-group');
    expect(group).toHaveTextContent('Edition statements Thoth cannot store');
    expect(within(group).getByTestId('import-issue-group-count')).toHaveTextContent(
      '2 occurrences in 2 Products (1, 2)',
    );

    await user.click(within(group).getByRole('button', { name: /^Technical details \(2 occurrences\)/ }));

    const occurrences = within(group).getAllByTestId('import-issue-occurrence');
    expect(
      occurrences.map((occurrence) =>
        within(occurrence)
          .getAllByRole('definition')
          .map(({ textContent }) => textContent),
      ),
    ).toEqual([
      [
        'Product 1 (press.1)',
        'onix.edition.unrepresentable',
        'EditionStatement "Revised" of record 1 has no Thoth field',
      ],
      [
        'Product 2 (press.2)',
        'onix.edition.unrepresentable',
        'EditionStatement "Second" of record 2 has no Thoth field',
      ],
    ]);
  });

  it('names at most ten Products in the summary, and every one in the technical details', async () => {
    const user = userEvent.setup();
    renderSummary(sourceIssues(Array.from({ length: 12 }, (_, index) => blocker(index + 1))));

    expect(screen.getByTestId('import-issue-group-count')).toHaveTextContent(
      '12 occurrences in 12 Products (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, …)',
    );

    await user.click(screen.getByRole('button', { name: /^Technical details/ }));

    expect(
      screen
        .getAllByTestId('import-issue-occurrence')
        .map((occurrence) => within(occurrence).getAllByRole('definition')[0].textContent),
    ).toEqual(Array.from({ length: 12 }, (_, index) => `Product ${index + 1}`));
  });

  it('opens and closes technical details from the keyboard, each disclosure named after its group', async () => {
    const user = userEvent.setup();
    renderSummary(uolpShaped());

    const toggles = screen.getAllByRole('button');
    expect(toggles.map((toggle) => toggle.getAttribute('aria-expanded'))).toEqual(['false', 'false', 'false', 'false']);
    expect(screen.getByRole('button', { name: `Technical details (3 occurrences) ${LANGUAGE_RULE}` })).toBe(toggles[0]);

    await user.tab();
    expect(toggles[0]).toHaveFocus();
    const details = document.getElementById(toggles[0].getAttribute('aria-controls') ?? '');
    expect(details).not.toBeVisible();

    await user.keyboard('{Enter}');
    expect(toggles[0]).toHaveAttribute('aria-expanded', 'true');
    expect(details).toBeVisible();
    expect(within(details as HTMLElement).getAllByTestId('import-issue-occurrence')).toHaveLength(3);

    await user.keyboard(' ');
    expect(toggles[0]).toHaveAttribute('aria-expanded', 'false');
    expect(details).not.toBeVisible();

    await user.tab();
    expect(toggles[1]).toHaveFocus();
  });

  it('gives every disclosure a distinct accessible name, even where the visible toggle text repeats', () => {
    renderSummary(uolpShaped());

    const toggles = screen.getAllByRole('button');
    expect(new Set(toggles.map(({ textContent }) => textContent)).size).toBeLessThan(toggles.length);
    const names = toggles.map((toggle) => {
      const ids = (toggle.getAttribute('aria-labelledby') ?? '').split(' ');
      return ids.map((id) => document.getElementById(id)?.textContent).join(' ');
    });

    expect(new Set(names).size).toBe(names.length);
    names.forEach((name) => expect(screen.getByRole('button', { name })).toBeInTheDocument());
  });

  it('never paints text in a palette accent colour: body copy keeps the ordinary text colour, expanded or not', async () => {
    const user = userEvent.setup();
    renderSummary([...uolpShaped(), plannerWarning('onix.edition.unrepresentable', 'EditionStatement lost', 1)]);
    for (const toggle of screen.getAllByRole('button')) await user.click(toggle);

    const summary = screen.getByTestId('import-issue-summary');
    const accents = [
      theme.palette.warning.main,
      theme.palette.error.main,
      theme.palette.info.main,
      theme.palette.primary.main,
    ]
      .map((hex) => hex.toLowerCase())
      .flatMap((hex) => [hex, rgbOf(hex)]);
    const elements = [summary, ...summary.querySelectorAll('*')];

    expect(elements.length).toBeGreaterThan(100);
    elements.forEach((element) => {
      const colours = declaredTextColours(element, summary);
      accents.forEach((accent) => expect(colours).not.toContain(accent));
    });
  });

  it('can be understood without colour: every category and kind is said in words, and icons stay silent', () => {
    renderSummary([...uolpShaped(), plannerWarning('onix.edition.unrepresentable', 'EditionStatement lost', 1)]);

    expect(
      screen.getAllByRole('heading', { level: 3 }).map(({ textContent }) => textContent?.replace(/ \(.*\)$/, '')),
    ).toEqual([
      'Needs attention — blocks import',
      'Automatically handled',
      'Unsupported — not imported',
      'Recommendations',
    ]);
    screen
      .getAllByTestId('import-issue-group')
      .forEach((group) => expect(within(group).getByTestId('import-issue-kind').textContent).toMatch(/\S/));
    document.querySelectorAll('svg').forEach((icon) => expect(icon).toHaveAttribute('aria-hidden', 'true'));
  });
});

/**
 * The UoLP shape through the live pipeline: the canonical validator a Worker session runs, over a synthetic
 * three-Product file with the defects the UoLP upload repeated (thoth-app#206, #235) - four publisher categories
 * without a scheme name and hyphenated ISNIs in every Product, one blocking language-role contradiction per Product,
 * and an advisory product-composition mismatch per Product - then the bridge's own projection of the result.
 */
// The canonical validator compiles the pinned schemas and rules once for this file; under coverage that alone
// exceeds the default timeouts.
describe('the UoLP shape, validated for real', { timeout: 300_000 }, () => {
  const isbn13 = (twelve: string) => {
    const sum = [...twelve].reduce((total, digit, index) => total + Number(digit) * (index % 2 ? 3 : 1), 0);
    return `${twelve}${(10 - (sum % 10)) % 10}`;
  };
  /** ISO 7064 MOD 11-2, the ISNI check character. */
  const isni = (fifteen: string) => {
    let total = 0;
    for (const digit of fifteen) total = (total + Number(digit)) * 2;
    const check = (12 - (total % 11)) % 11;
    return `${fifteen}${check === 10 ? 'X' : check}`;
  };
  const hyphenated = (id: string) => (id.match(/.{4}/g) ?? []).join('-');

  const product = (index: number, isnis: string[], contradiction: boolean) => {
    const isbn = isbn13(`97818000001${index}`);
    const languages = contradiction ? ['01', '02'] : ['01'];
    return `
  <Product>
    <RecordReference>regression-press.${isbn}</RecordReference>
    <NotificationType>03</NotificationType>
    <ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>${isbn}</IDValue></ProductIdentifier>
    <DescriptiveDetail>
      <ProductComposition>10</ProductComposition>
      <ProductForm>BC</ProductForm>
      <TitleDetail>
        <TitleType>01</TitleType>
        <TitleElement>
          <TitleElementLevel>01</TitleElementLevel>
          <NoPrefix/>
          <TitleWithoutPrefix language="eng">Grouped Diagnostics ${index}</TitleWithoutPrefix>
        </TitleElement>
      </TitleDetail>
      ${languages.map((role) => `<Language><LanguageRole>${role}</LanguageRole><LanguageCode>eng</LanguageCode></Language>`).join('')}
      ${['HIS', 'LIT', 'PHI', 'ART']
        .map(
          (code) =>
            `<Subject><SubjectSchemeIdentifier>23</SubjectSchemeIdentifier><SubjectCode>${code}</SubjectCode></Subject>`,
        )
        .join('')}
    </DescriptiveDetail>
    <PublishingDetail>
      <Imprint><ImprintName>Regression Press</ImprintName></Imprint>
      ${isnis
        .map(
          (value, role) =>
            `<Publisher><PublishingRole>0${role + 1}</PublishingRole><PublisherIdentifier><PublisherIDType>16</PublisherIDType><IDValue>${hyphenated(value)}</IDValue></PublisherIdentifier><PublisherName>Regression Press ${role + 1}</PublisherName></Publisher>`,
        )
        .join('')}
      <PublishingStatus>04</PublishingStatus>
      <PublishingDate><PublishingDateRole>01</PublishingDateRole><Date>20260301</Date></PublishingDate>
    </PublishingDetail>
  </Product>`;
  };

  const source = (contradiction: boolean) =>
    new TextEncoder().encode(`<?xml version="1.0" encoding="UTF-8"?>
<ONIXMessage release="3.0" xmlns="${REFERENCE_NS}">
  <Header>
    <Sender><SenderName>Regression Press</SenderName><EmailAddress>metadata@regression-press.example</EmailAddress></Sender>
    <MessageNumber>1</MessageNumber>
    <SentDateTime>20260930T120000Z</SentDateTime>
  </Header>${product(1, [isni('000000012345678'), isni('000000012345679')], contradiction)}${product(2, [isni('000000012345680')], contradiction)}${product(3, [isni('000000012345681')], contradiction)}
</ONIXMessage>
`);

  it('collapses 38 real issues into four groups, the blocker first and every recovery paired', async () => {
    const { result, permitted } = await runOnixSourceGate(source(true));
    const issues = projectOnixSourceIssues(result, t);

    const groups = groupImportIssues(issues);

    expect(permitted).toBe(false);
    expect(issues).toHaveLength(38);
    expect(
      groups.map((group) => {
        const [first] = issuesOf(group);
        const id = first.sourceValidation?.kind === 'finding' ? first.sourceValidation.finding.id : null;
        return [
          group.category,
          id,
          group.occurrences.length,
          group.occurrences.every(({ issues: held }) => held.length === 2),
        ];
      }),
    ).toEqual([
      ['attention', '_20171218_f_2', 3, false],
      ['handled', '_20171218_a_2', 12, true],
      ['handled', '_20171126_b_42', 4, true],
      ['recommendation', '_20180214_a_1', 3, false],
    ]);
    expect(groups.flatMap(issuesOf)).toHaveLength(issues.length);
  });

  it('shows the same recoveries and advice as non-blocking once the blocker is fixed', async () => {
    const { result, permitted } = await runOnixSourceGate(source(false));

    renderSummary(projectOnixSourceIssues(result, t));

    expect(permitted).toBe(true);
    expect(screen.getByTestId('import-issue-status')).toHaveTextContent('Nothing listed here blocks the import.');
    expect(screen.getAllByRole('heading', { level: 3 }).map(({ textContent }) => textContent)).toEqual([
      'Automatically handled (2 issues, 16 occurrences)',
      'Recommendations (1 issue, 3 occurrences)',
    ]);
  });
});
