import { canonicaliseDoi, canonicaliseRor, orcidValidation } from '../../utils/validations';
import { normaliseImportedPlainText } from '../XMLParser/importedPlainText';
import type { TranslateFunction } from './CSVParser';
import { type CsvFieldDefinition, type CsvRow, csvSchema, normaliseCsvValue } from './csvSchema';

/**
 * The deterministic CSV preflight rules: the checks that can be answered from the canonical rows
 * alone, with no contributor/institution lookup and no mutation, implemented against the same
 * authoritative contracts the rest of the application uses (`canonicaliseDoi`, `orcidValidation`,
 * `rorValidation`, the backend markup subset).
 *
 * `csvSchema` names which rule applies to which field; this module only implements the rule
 * bodies, exactly as `getCsvConfig` implements the `csv-file-validator` rule names. Every finding
 * is independent and actionable: a rule reads one canonical cell and never a value another rule
 * has already rejected, so one broken value cannot fan out into derivative noise.
 */

/** What one preflight rule found wrong with one canonical cell; `undefined` means the cell passed. */
export type CsvPreflightFinding = { message: string };

/**
 * A complete `YYYY-MM-DD` calendar date and nothing else. `dayjs`'s default parser is deliberately
 * not used here: it accepts `22.07.26`, partial dates and other looseness this contract exists to
 * reject. The month length check makes `2026-02-30` as invalid as `2026-13-01`.
 */
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export const isStrictIsoDate = (value: string): boolean => {
  const match = ISO_DATE.exec(value);

  if (!match) return false;

  const [, year, month, day] = match.map(Number);

  if (month < 1 || month > 12 || day < 1) return false;

  // Day zero of the next month is the last day of this one; leap years fall out for free.
  return day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
};

/**
 * Hidden characters that survive `trim()` yet change what a value *is*: C0/C1 controls, zero-width
 * characters and the word joiner / BOM. Boundary-`report` fields treat any of these, anywhere in
 * the value, as unsafe — they are invisible in every spreadsheet the user could check.
 */
// eslint-disable-next-line no-control-regex -- control characters are exactly what this detects
const HIDDEN_CHARACTERS = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F\u200B-\u200D\u2060\uFEFF]/;

export const hasUnsafeBoundary = (value: string): boolean =>
  value.length > 0 && (value !== value.trim() || HIDDEN_CHARACTERS.test(value));

/**
 * The tag shape the backend's `looks_like_markup` matches (`thoth-api/src/markup/mod.rs`). It is
 * narrower than the app's own `isTextContainsAnyMarkdownTag` — `<3` never opens a tag here — and
 * the *backend's* answer is the one that decides which parser the content will actually meet.
 */
const LOOKS_LIKE_MARKUP = /<\/?[A-Za-z][^>]*>/;

/**
 * The JATS elements `validate_jats_subset` accepts for abstracts and biographies, case-sensitive,
 * exactly as the backend lists them. Anything else — including every HTML spelling such as `<b>`,
 * `<i>`, `<em>`, `<br>`, `<div>` — is rejected by the API before any AST is built.
 */
const JATS_ABSTRACT_ELEMENTS = new Set([
  'p',
  'bold',
  'italic',
  'underline',
  'strike',
  'monospace',
  'sup',
  'sub',
  'sc',
  'list',
  'list-item',
  'ext-link',
  'inline-formula',
  'tex-math',
  'email',
  'uri',
]);

/** Block elements that may not open inside an open `<p>` (`validate_jats_subset`'s nesting rule). */
const JATS_BLOCK_ELEMENTS = new Set(['p', 'list', 'list-item']);

/** One tag: optional `/` for closing, a name (namespace prefix allowed), optional `/>` self-close. */
const TAG_PATTERN = /<(\/?)([A-Za-z][^\s/>]*)(?:[^>"']|"[^"]*"|'[^']*')*?(\/?)>/g;

/** The local part of a possibly namespaced tag name, as the backend's `local_tag_name` resolves it. */
const localTagName = (name: string): string => name.split(':').pop() ?? name;

export type ImportedCsvTextProblem =
  | { kind: 'unsupportedElement'; tag: string }
  | { kind: 'nestedBlock' }
  | { kind: 'lineBreak' };

/**
 * Whether one CSV abstract/biography cell can survive the mutation it is headed for.
 *
 * The mutation path is fixed and known: content with no markup is sent as `PLAIN_TEXT`, where the
 * API turns any lone newline inside a paragraph into a `Break` it then rejects; content with
 * markup is sent as `JATS_XML`, where `validate_jats_subset` rejects any element outside the
 * abstract whitelist and any block element nested inside a paragraph. Those three deterministic
 * rejections — and only those — are detected here, so they surface in preflight instead of
 * failing at the API partway through a bulk import.
 *
 * Deliberately fail-open beyond that: this is a mirror of three named backend checks, not a
 * second markup implementation. Content these checks pass may still be refused by the API, and
 * that remains the API's call. Nothing is rewritten either — the cell the user wrote is the cell
 * that is validated and, when valid, imported.
 */
export const checkImportedCsvText = (content: string): ImportedCsvTextProblem | undefined => {
  if (!LOOKS_LIKE_MARKUP.test(content)) {
    // No markup reaches the API's plain-text parser whatever format the app declares, because
    // the JATS path also falls back to plain text when nothing tag-shaped is present.
    return normaliseImportedPlainText('', content).kind === 'unrepresentable' ? { kind: 'lineBreak' } : undefined;
  }

  const openElements: string[] = [];

  for (const match of content.matchAll(TAG_PATTERN)) {
    const [, closing, rawName, selfClosing] = match;
    const tag = localTagName(rawName);

    if (closing) {
      const depth = openElements.lastIndexOf(tag);

      if (depth !== -1) openElements.length = depth;
      continue;
    }

    if (!JATS_ABSTRACT_ELEMENTS.has(tag)) return { kind: 'unsupportedElement', tag };

    if (JATS_BLOCK_ELEMENTS.has(tag) && openElements[openElements.length - 1] === 'p') {
      return { kind: 'nestedBlock' };
    }

    if (!selfClosing) openElements.push(tag);
  }

  return undefined;
};

/**
 * One canonical cell: the exact string that is validated and, if the file passes, planned and
 * imported. Canonicalisation happens once, before any rule runs:
 *
 * - boundary-`canonicalise` fields lose accidental leading/trailing whitespace, so a rule can no
 *   longer pass a trimmed copy while the raw value flows into the plan;
 * - enum-backed fields resolve their supported aliases to the canonical member, as before;
 * - a valid DOI or ROR in any form the Thoth contract accepts becomes its canonical resolver
 *   URL. An invalid one is left exactly as supplied — canonicalisation never manufactures a
 *   plausible identifier out of a broken one — and the matching rule reports it.
 */
export const toCanonicalCsvValue = (field: CsvFieldDefinition, value: string): string => {
  const bounded = field.boundary === 'canonicalise' ? value.trim() : value;
  const normalised = normaliseCsvValue(field, bounded);

  if (normalised.length === 0) return normalised;

  if (field.preflight === 'doi' || field.preflight === 'ror') {
    const canonical = field.preflight === 'doi' ? canonicaliseDoi(normalised) : canonicaliseRor(normalised);

    return canonical.length > 0 ? canonical : normalised;
  }

  return normalised;
};

/**
 * Applies one schema-named preflight rule to one canonical cell.
 *
 * Every rule skips the empty string: each of these fields is optional, and required-ness belongs
 * to the `csv-file-validator` layer. Because the cell is already canonical, no rule trims or
 * rewrites; what is judged here is what will be imported.
 */
const evaluateRule = (
  field: CsvFieldDefinition,
  value: string,
  row: number,
  t: TranslateFunction,
): CsvPreflightFinding | undefined => {
  if (field.preflight === undefined) return undefined;

  if (value.length === 0) return undefined;

  switch (field.preflight) {
    case 'isoDate':
      return isStrictIsoDate(value)
        ? undefined
        : { message: t('errors.csvFieldNotIsoDate', { field: field.header, value, row }) };
    case 'doi':
      return canonicaliseDoi(value).length > 0
        ? undefined
        : { message: t('errors.csvDoiNotValid', { value, row }) };
    case 'orcid':
      return orcidValidation.safeParse(value).success
        ? undefined
        : { message: t('errors.csvOrcidNotValid', { field: field.header, value, row }) };
    case 'ror':
      return canonicaliseRor(value).length > 0
        ? undefined
        : { message: t('errors.csvRorNotValid', { field: field.header, value, row }) };
    case 'integer':
      return Number.isNaN(parseInt(value))
        ? { message: t('errors.csvFieldNotNumber', { field: field.header, row }) }
        : undefined;
    case 'decimal':
      return Number.isNaN(parseFloat(value))
        ? { message: t('errors.csvFieldNotNumber', { field: field.header, row }) }
        : undefined;
    case 'importedText': {
      const problem = checkImportedCsvText(value);

      if (problem === undefined) return undefined;

      switch (problem.kind) {
        case 'unsupportedElement':
          return { message: t('errors.csvTextUnsupportedMarkup', { field: field.header, row, tag: problem.tag }) };
        case 'nestedBlock':
          return { message: t('errors.csvTextNestedBlock', { field: field.header, row }) };
        case 'lineBreak':
          return { message: t('errors.csvTextLineBreak', { field: field.header, row }) };
      }
    }
  }
};

/**
 * Every deterministic finding for one canonical row, in schema field order — which is the order
 * the template lays the columns out in, so within a row the user reads findings left to right.
 */
export const collectRowPreflightFindings = (row: CsvRow, rowNumber: number, t: TranslateFunction): string[] => {
  const messages: string[] = [];

  for (const field of csvSchema) {
    const value = row[field.key];

    if (field.boundary === 'report' && hasUnsafeBoundary(value)) {
      messages.push(t('errors.csvFieldWhitespace', { field: field.header, row: rowNumber }));
    }

    const finding = evaluateRule(field, value, rowNumber, t);

    if (finding) messages.push(finding.message);
  }

  return messages;
};
