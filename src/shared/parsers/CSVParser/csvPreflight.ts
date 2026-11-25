import { WorkType } from '@/gql/graphql';

import { convertRomanToArabic } from '../../utils/conversions/romans';
import { THEMA_CODES } from '../../utils/subjects/thema-codes';
import {
  canonicaliseDoi,
  canonicaliseOrcid,
  canonicaliseRor,
  orcidValidation,
  workTypeValidation,
} from '../../utils/validations';
import { normaliseImportedPlainText } from '../XMLParser/importedPlainText';
import type { TranslateFunction } from './CSVParser';
import {
  CSV_KEYS,
  type CsvFieldDefinition,
  type CsvFieldKey,
  type CsvRow,
  csvSchema,
  normaliseCsvValue,
} from './csvSchema';

/**
 * The deterministic CSV preflight rules: the checks that can be answered from the canonical rows
 * alone, with no contributor/institution lookup and no mutation, implemented against the same
 * authoritative contracts the rest of the application uses (`canonicaliseDoi`, `canonicaliseOrcid`,
 * `canonicaliseRor`, `orcidValidation`, the existing plain-text representability helper).
 *
 * `csvSchema` names which rule applies to which field; this module only implements the rule
 * bodies, exactly as `getCsvConfig` implements the `csv-file-validator` rule names. Every finding
 * is independent and actionable: a rule reads one canonical cell and never a value another rule
 * has already rejected, so one broken value cannot fan out into derivative noise.
 */

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

// eslint-disable-next-line no-control-regex -- control characters are exactly what this removes
const HIDDEN_CHARACTERS_EVERYWHERE = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F\u200B-\u200D\u2060\uFEFF]/g;

export const hasUnsafeBoundary = (value: string): boolean =>
  value.length > 0 && (value !== value.trim() || HIDDEN_CHARACTERS.test(value));

/**
 * The value with the whitespace/hidden-character defect removed — never imported, never shown;
 * used only to ask whether anything would *still* be wrong once the user fixes the reported
 * boundary defect. That question is what keeps one stray tab from producing both a whitespace
 * error and a derivative "invalid identifier" error for the same keystroke.
 */
export const withoutBoundaryDefect = (value: string): string => value.replace(HIDDEN_CHARACTERS_EVERYWHERE, '').trim();

/**
 * The tag shape the backend's `looks_like_markup` matches (`thoth-api/src/markup/mod.rs`). It is
 * narrower than the app's own `isTextContainsAnyMarkdownTag` — `<3` never opens a tag here — and
 * the *backend's* answer is the one that decides which parser the content will actually meet.
 */
const LOOKS_LIKE_MARKUP = /<\/?[A-Za-z][^>]*>/;

/**
 * The markup structures this preflight rejects, and the only ones.
 *
 * Each is a named production regression of this import path — the structures behind the
 * "Abstracts and biographies cannot contain nested block elements inside paragraphs", line-break
 * and pasted-block-HTML API failures that motivated issue #110:
 *
 * - a line-break element (`<br>`, `<break>`): Thoth's abstract/biography model cannot hold a
 *   line break in any input format, so the element is unrepresentable wherever it appears;
 * - a block element (`p`, `list`, `list-item`) opening directly inside an open `<p>`;
 * - one of the {@link KNOWN_UNSUPPORTED_BLOCK_HTML} structures below.
 *
 * Deliberately NOT here: any general list of which elements Thoth accepts. That rulebook lives in
 * the backend and only there; content this scan passes may still be refused by the API, and that
 * remains the API's call. Keeping the check this narrow is what keeps it from becoming a second,
 * drifting copy of backend markup policy.
 */
const LINE_BREAK_ELEMENTS = new Set(['br', 'break']);

const BLOCK_ELEMENTS = new Set(['p', 'list', 'list-item']);

/**
 * A small historical-regression denylist: the block-HTML structures that publisher-support
 * corrections behind issue #110 kept producing, in abstracts and biographies pasted out of a word
 * processor or a web page. A CSV abstract carrying tags is content-sniffed and submitted as
 * `JATS_XML`, and the mutation deterministically refuses every one of these — so letting them
 * through preflight only moves the same failure later into the correction loop this task exists to
 * remove.
 *
 * This is NOT the authoritative account of what Thoth's markup subset allows or forbids: backend
 * markup semantics stay authoritative and this list is deliberately not exhaustive. An element
 * absent from here — and not matching the two structural checks above — still defers to the API
 * exactly as before. The app deliberately keeps no second copy of the backend's rulebook.
 *
 * Matched case-insensitively, unlike the JATS structures above: these are HTML elements, where
 * `<DIV>` and `<div>` are the same element, and no element of Thoth's JATS subset differs from one
 * of these by case alone.
 */
const KNOWN_UNSUPPORTED_BLOCK_HTML = new Set([
  'div',
  'blockquote',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
]);

/** One tag: optional `/` for closing, a name (namespace prefix allowed), optional `/>` self-close. */
const TAG_PATTERN = /<(\/?)([A-Za-z][^\s/>]*)(?:[^>"']|"[^"]*"|'[^']*')*?(\/?)>/g;

/** The local part of a possibly namespaced tag name, as the backend resolves one. */
const localTagName = (name: string): string => name.split(':').pop() ?? name;

export type ImportedCsvTextProblem =
  | { kind: 'unsupportedElement'; tag: string }
  | { kind: 'nestedBlock' }
  | { kind: 'lineBreak' };

/**
 * Whether one CSV abstract/biography cell exhibits one of the known deterministic structures the
 * mutation it is headed for is certain to reject.
 *
 * Tag-free content is judged by the existing plain-text representability helper: the API's
 * plain-text parser turns a lone newline inside a paragraph into a line break it then rejects,
 * while blank-line paragraph separation is exactly what it stores. Tag-bearing content is scanned
 * only for the named structures of {@link LINE_BREAK_ELEMENTS}, {@link BLOCK_ELEMENTS} and
 * {@link KNOWN_UNSUPPORTED_BLOCK_HTML}.
 *
 * Everything else is deliberately left to the API — this is a regression check for structures
 * already seen to break real imports, not an app-side markup validator. Nothing is rewritten:
 * the cell the user wrote is the cell that is validated and, when valid, imported.
 */
export const checkImportedCsvText = (content: string): ImportedCsvTextProblem | undefined => {
  if (!LOOKS_LIKE_MARKUP.test(content)) {
    // No markup reaches the API's plain-text parser whatever format the app declares, because
    // the JATS path also falls back to plain text when nothing tag-shaped is present.
    return normaliseImportedPlainText('', content).kind === 'unrepresentable' ? { kind: 'lineBreak' } : undefined;
  }

  /**
   * Every element currently open, not only the tracked ones: whether a block element sits
   * *directly* inside a `<p>` depends on what opened in between, so `<p><bold><list>` must not
   * read as `list` directly inside `p`.
   */
  const openElements: string[] = [];

  for (const match of content.matchAll(TAG_PATTERN)) {
    const [, closing, rawName, selfClosing] = match;
    const tag = localTagName(rawName);

    // Either half of the pair is enough to know the cell carries block HTML: prose pasted with a
    // stray `</div>` is the same historical fault as prose pasted with the whole element.
    if (KNOWN_UNSUPPORTED_BLOCK_HTML.has(tag.toLowerCase())) return { kind: 'unsupportedElement', tag };

    if (closing) {
      const depth = openElements.lastIndexOf(tag);

      if (depth !== -1) openElements.length = depth;
      continue;
    }

    if (LINE_BREAK_ELEMENTS.has(tag)) return { kind: 'unsupportedElement', tag };

    if (BLOCK_ELEMENTS.has(tag) && openElements[openElements.length - 1] === 'p') {
      return { kind: 'nestedBlock' };
    }

    if (!selfClosing) openElements.push(tag);
  }

  return undefined;
};

/**
 * The canonical representation of one identifier, or `''` when the value is not that identifier
 * at all. Each delegates to the contract that already owns the question, so the preflight holds
 * no second opinion about what a DOI, an ORCID or a ROR is.
 */
const toCanonicalIdentifier = (rule: 'doi' | 'orcid' | 'ror', value: string): string => {
  switch (rule) {
    case 'doi':
      return canonicaliseDoi(value);
    case 'orcid':
      return canonicaliseOrcid(value);
    case 'ror':
      return canonicaliseRor(value);
  }
};

/**
 * One canonical cell: the exact string that is validated and, if the file passes, planned and
 * imported. Canonicalisation happens once, before any rule runs, and only ever re-applies a
 * transformation an existing authoritative contract already performs:
 *
 * - boundary-`canonicalise` fields (DOI, the series fields) lose accidental leading/trailing
 *   whitespace, exactly as `canonicaliseDoi` and `parseSeries` always have;
 * - enum-backed fields resolve their supported aliases to the canonical member, as before;
 * - a valid DOI or ROR in any form the Thoth contract accepts becomes its canonical resolver
 *   URL, and an ORCID written as its bare sixteen characters becomes the hyphenated form Thoth
 *   stores. An invalid one is left exactly as supplied — canonicalisation never manufactures a
 *   plausible identifier out of a broken one — and the matching rule reports it.
 *
 * Boundary-`report` fields are never repaired here: their defects are findings, not input.
 */
export const toCanonicalCsvValue = (field: CsvFieldDefinition, value: string): string => {
  const bounded = field.boundary === 'canonicalise' ? value.trim() : value;
  const normalised = normaliseCsvValue(field, bounded);

  if (normalised.length === 0) return normalised;

  if (field.preflight === 'doi' || field.preflight === 'ror' || field.preflight === 'orcid') {
    const canonical = toCanonicalIdentifier(field.preflight, normalised);

    return canonical.length > 0 ? canonical : normalised;
  }

  return normalised;
};

/**
 * The largest whole number Thoth can store in a count or an edition: GraphQL `Int` is a signed
 * 32-bit integer.
 */
const MAX_GRAPHQL_INT = 2147483647;

/** What one number cell says: nothing, a number Thoth accepts, or anything else. */
export type CsvNumberReading = { kind: 'blank' } | { kind: 'number'; value: number } | { kind: 'invalid' };

/**
 * One whole-number cell (`edition`, `page_count` and the four counts), read the one way the preflight judges it and
 * the row parser plans it (APP-IMPORT-CSV-PARITY-01 R-1, thoth-app#320). Digits only, at most {@link MAX_GRAPHQL_INT}:
 * no sign, decimal point, exponent, separator or hidden character, so nothing `parseInt` used to truncate, drop or
 * misread can reach the plan. Surrounding whitespace is not part of the number, as it never was for `parseInt`; a
 * hidden character such as U+200B is not whitespace, so it stays and the cell is `invalid`. The backend's own ranges
 * (`edition > 0`, `page_count > 0`, the counts `>= 0`) are judged on what the parser sends, not here.
 */
export const readCsvWholeNumber = (value: string): CsvNumberReading => {
  const trimmed = value.trim();

  if (trimmed.length === 0) return { kind: 'blank' };

  if (!DECIMAL_DIGITS.test(trimmed)) return { kind: 'invalid' };

  const number = Number(trimmed);

  return number <= MAX_GRAPHQL_INT ? { kind: 'number', value: number } : { kind: 'invalid' };
};

/** Decimal digits with an optional decimal point: `12.50`, `.5` and `5.` are prices; a sign or exponent is not. */
const PRICE = /^(?:\d+(?:\.\d*)?|\.\d+)$/;

/**
 * One unit-price cell, read the one way the preflight judges it and the row parser plans it (APP-IMPORT-CSV-PARITY-01
 * R-2, thoth-app#320). Digits with an optional decimal point and nothing else: no sign, decimal comma, exponent or
 * currency, before or after. The backend's `unit_price > 0` (`PricePolicy::validate_unit_price`,
 * `price_unit_price_check`) is met by every non-zero value this accepts; zero keeps its existing handling.
 */
export const readCsvPrice = (value: string): CsvNumberReading => {
  const trimmed = value.trim();

  if (trimmed.length === 0) return { kind: 'blank' };

  if (!PRICE.test(trimmed)) return { kind: 'invalid' };

  const number = Number(trimmed);

  return Number.isFinite(number) ? { kind: 'number', value: number } : { kind: 'invalid' };
};

/**
 * The URL shape Thoth's database requires of a Work's `cover_url` and `landing_page` and of a location's
 * `landing_page` and `full_text_url` (thoth `migrations/20250000_v1.0.0/up.sql:3265`, and `:3272`, `:2900`, `:2901`),
 * matched case-insensitively as `~*` matches. Built from its text rather than written as a literal, so that its
 * `.source` is the SQL pattern byte for byte.
 */
export const THOTH_URL_PATTERN = new RegExp(String.raw`^[^:]*:\/\/(?:[^\/:]*:[^\/@]*@)?(?:[^\/:.]*\.)+([^:\/]+)`, 'i');

/**
 * Whether a URL cell holds a value Thoth would refuse, judged on what the mappers send: the cell trimmed, as
 * `emptyToNull` trims it. A blank or whitespace-only cell is sent as `null`, which every one of these columns allows.
 */
export const isRefusedThothUrl = (value: string): boolean => {
  const trimmed = value.trim();

  return trimmed.length > 0 && !THOTH_URL_PATTERN.test(trimmed);
};

/**
 * The codes Thoth accepts as Thema subjects: the own keys of `THEMA_CODES`, matched exactly as the backend's
 * `THEMA_CODES.binary_search` matches (`subject/policy.rs` `check_subject`). A plain object lookup would also accept
 * `constructor` or `toString`; `isThemaCategoryOf` would refuse the qualifiers the backend accepts.
 */
const THEMA_SUBJECT_CODES: ReadonlySet<string> = new Set(Object.keys(THEMA_CODES));

/**
 * The pieces of a `thema_subjects` cell Thoth would refuse, each once, in order of first appearance. The cell is split
 * exactly as the row parser splits it: on `,`, each piece trimmed, empty pieces skipped.
 */
export const refusedThemaCodes = (value: string): string[] => {
  const refused = new Set<string>();

  for (const piece of value.split(',')) {
    const code = piece.trim();

    if (code.length > 0 && !THEMA_SUBJECT_CODES.has(code)) refused.add(code);
  }

  return [...refused];
};

/**
 * What a canonical `work_type` makes of its row: a Book Chapter, another Thoth work type, or not a work type at all
 * (left to the validator). The one predicate the backend-parity rules and the row parser's edition planning share.
 */
export type CsvWorkTypeKind = 'chapter' | 'nonChapter' | 'invalid';

export const csvWorkTypeKind = (workType: string): CsvWorkTypeKind => {
  if (!workTypeValidation.safeParse(workType).success) return 'invalid';

  return workType === WorkType.BookChapter ? 'chapter' : 'nonChapter';
};

/**
 * The verdict of the existing `orcid` rule on a non-empty value. Canonicalised again here rather than trusted from the
 * row, because the rule is also asked about the residual of a value whose boundary defect has been reported — a string
 * that never went through `toCanonicalCsvValue`. Canonicalising is idempotent, so the already-canonical cell is
 * unaffected. The verdict stays `orcidValidation`'s alone.
 */
export const passesCsvOrcidRule = (value: string): boolean =>
  orcidValidation.safeParse(canonicaliseOrcid(value) || value).success;

/** The ISBN cells a Book Chapter row may not fill (APP-IMPORT-CSV-PARITY-01 R-9). */
const ISBN_KEYS: ReadonlySet<CsvFieldKey> = new Set([
  CSV_KEYS.PUBLICATION_PAPERBACK_ISBN,
  CSV_KEYS.PUBLICATION_HARDBACK_ISBN,
  CSV_KEYS.PUBLICATION_PDF_ISBN,
]);

/**
 * Applies one schema-named preflight rule to one value.
 *
 * Every rule skips the empty string: each of these fields is optional, and required-ness belongs
 * to the `csv-file-validator` layer. No rule trims or rewrites; what is judged is what will be
 * imported (or, for a value with an already-reported boundary defect, what would remain of it).
 */
const evaluateRule = (
  field: CsvFieldDefinition,
  value: string,
  row: number,
  t: TranslateFunction,
): string | undefined => {
  if (field.preflight === undefined) return undefined;

  if (value.length === 0) return undefined;

  switch (field.preflight) {
    case 'isoDate':
      return isStrictIsoDate(value) ? undefined : t('errors.csvFieldNotIsoDate', { field: field.header, value, row });
    case 'doi':
      return canonicaliseDoi(value).length > 0 ? undefined : t('errors.csvDoiNotValid', { value, row });
    case 'orcid':
      // The value named in the error is always the one the file supplied.
      return passesCsvOrcidRule(value) ? undefined : t('errors.csvOrcidNotValid', { field: field.header, value, row });
    case 'ror':
      return canonicaliseRor(value).length > 0
        ? undefined
        : t('errors.csvRorNotValid', { field: field.header, value, row });
    case 'integer':
      // R-1: the cell as written, whether or not the row would send it (an edition on a Book Chapter row).
      return readCsvWholeNumber(value).kind === 'invalid'
        ? t('errors.csvFieldNotWholeNumber', { field: field.header, value, row })
        : undefined;
    case 'decimal':
      // R-2: the cell as written, whether or not a price would be planned from it.
      return readCsvPrice(value).kind === 'invalid'
        ? t('errors.csvPriceNotValid', { field: field.header, value, row })
        : undefined;
    case 'url':
      // R-3: `work_cover_url_check` and `work_landing_page_check` (up.sql:3265, 3272), on the value the mapper sends.
      return isRefusedThothUrl(value)
        ? t('errors.csvUrlNotValid', { field: field.header, value: value.trim(), row })
        : undefined;
    case 'thema': {
      // R-8: `SubjectPolicy::check_subject` (subject/policy.rs), one finding naming every refused code.
      const refused = refusedThemaCodes(value);

      return refused.length > 0 ? t('errors.csvThemaCodesNotValid', { row, codes: refused.join(', ') }) : undefined;
    }
    case 'importedText': {
      const problem = checkImportedCsvText(value);

      if (problem === undefined) return undefined;

      switch (problem.kind) {
        case 'unsupportedElement':
          return t('errors.csvTextUnsupportedMarkup', { field: field.header, row, tag: problem.tag });
        case 'nestedBlock':
          return t('errors.csvTextNestedBlock', { field: field.header, row });
        case 'lineBreak':
          return t('errors.csvTextLineBreak', { field: field.header, row });
      }
    }
  }
};

/** One rule's finding. */
const ruleFinding = (_field: CsvFieldDefinition, message: string): CsvRowPreflightFinding => ({ message });

/**
 * The largest page count Thoth can store: `pageCount` is a GraphQL `Int`, which the specification
 * fixes at a signed 32-bit integer.
 */
const MAX_PAGE_COUNT = 2147483647;

/** Unsigned decimal digits and nothing else: no sign, decimal point, exponent or spacing. */
const DECIMAL_DIGITS = /^\d+$/;

/**
 * How `convertArabicToRoman(0)` spells zero, and so how app-written breakdowns have recorded an
 * empty front or back matter slot. It is read back as zero for compatibility, in those slots only.
 */
const LEGACY_ROMAN_ZERO = 'nulla';

const PAGE_BREAKDOWN_SEPARATOR = '+';

/** Why a non-empty `page_breakdown` cannot be imported as it stands. */
export type PageBreakdownProblem =
  /** Not exactly `<front>+<main>` or `<front>+<main>+<back>`. */
  | 'componentCount'
  /** The front matter slot is not empty, `nulla` or a positive Roman numeral. */
  | 'frontmatter'
  /** The main content slot is not a whole number written in decimal digits. */
  | 'mainContent'
  /** The back matter slot is not empty, `nulla` or a positive Roman numeral. */
  | 'backmatter'
  /** front + main + back is more pages than Thoth can store. */
  | 'totalOutOfRange'
  /** An explicit `page_count` disagrees with front + main + back. */
  | 'totalMismatch';

/**
 * What one row's `page_count` and `page_breakdown` mean together. This is the only reading of
 * the pair: the preflight blocks on `invalid`, and the row parser builds the Work from `empty`
 * or `valid`, so a row is planned exactly as it was validated.
 */
export type PageCountReconciliation =
  /** No breakdown: `page_count` keeps its own, pre-existing path. */
  | { kind: 'empty' }
  | { kind: 'valid'; pageCount: number; frontmatterCount: number; backmatterCount: number }
  | {
      kind: 'invalid';
      /** `page_count` is not a positive page count written in decimal digits. */
      pageCountNotValid: boolean;
      breakdownProblem?: PageBreakdownProblem;
    };

/**
 * A front or back matter count. Empty and legacy `nulla` are zero; anything else must be a
 * positive Roman numeral. `convertRomanToArabic` answers zero for whatever it cannot read and no
 * numeral is worth zero, so a zero here means the value is not a numeral at all — an error, not a
 * silently absent count.
 */
const parseMatterCount = (component: string): number | undefined => {
  if (component.length === 0 || component === LEGACY_ROMAN_ZERO) return 0;

  const count = convertRomanToArabic(component);

  return count > 0 ? count : undefined;
};

type ParsedPageBreakdown =
  | { kind: 'parsed'; total: number; frontmatterCount: number; backmatterCount: number }
  | { kind: 'invalid'; problem: PageBreakdownProblem };

/**
 * Positional front matter + main content + back matter, as in the template's `xxiv+278`: 24
 * Roman-numbered pages of front matter and 278 of main content, 302 pages in all. Whitespace
 * around a component is not part of it, so `xxiv + 278` reads exactly like `xxiv+278`.
 */
const parsePageBreakdown = (value: string): ParsedPageBreakdown => {
  const components = value.split(PAGE_BREAKDOWN_SEPARATOR).map((component) => component.trim());

  if (components.length < 2 || components.length > 3) return { kind: 'invalid', problem: 'componentCount' };

  const [front, main, back = ''] = components;
  const frontmatterCount = parseMatterCount(front);

  if (frontmatterCount === undefined) return { kind: 'invalid', problem: 'frontmatter' };

  if (!DECIMAL_DIGITS.test(main)) return { kind: 'invalid', problem: 'mainContent' };

  const backmatterCount = parseMatterCount(back);

  if (backmatterCount === undefined) return { kind: 'invalid', problem: 'backmatter' };

  const total = frontmatterCount + Number(main) + backmatterCount;

  if (total > MAX_PAGE_COUNT) return { kind: 'invalid', problem: 'totalOutOfRange' };

  return { kind: 'parsed', total, frontmatterCount, backmatterCount };
};

type ExplicitPageCount = { kind: 'unset' } | { kind: 'count'; value: number } | { kind: 'invalid' };

/**
 * `page_count` as the breakdown is checked against. Blank and zero both mean no count was given,
 * as zero always has for a Work's page count. This strict reading applies only alongside a
 * breakdown; on its own, `page_count` keeps the general `integer` rule.
 */
const parseExplicitPageCount = (value: string): ExplicitPageCount => {
  if (value.length === 0) return { kind: 'unset' };

  if (!DECIMAL_DIGITS.test(value)) return { kind: 'invalid' };

  const count = Number(value);

  if (count === 0) return { kind: 'unset' };

  return count <= MAX_PAGE_COUNT ? { kind: 'count', value: count } : { kind: 'invalid' };
};

/**
 * Reconciles a row's `page_count` with its `page_breakdown`. `page_count` is the total, and the
 * breakdown divides that same total into front matter + main content + back matter, so a
 * breakdown's implied total is front + main + back — never its middle component alone. An
 * explicit `page_count` must equal that total; without one, the total becomes the page count.
 * Neither value is ever chosen over the other: when they disagree the row is invalid.
 *
 * The answer depends on the two cells alone — no lookup, no shared state — so the preflight and
 * the row parser both ask it and get the same answer.
 */
export const reconcilePageCount = (pageCount: string, pageBreakdown: string): PageCountReconciliation => {
  if (pageBreakdown.trim().length === 0) return { kind: 'empty' };

  const breakdown = parsePageBreakdown(pageBreakdown);
  const explicit = parseExplicitPageCount(pageCount);

  // Two independent cells: a malformed page count and a malformed breakdown are two corrections.
  if (breakdown.kind === 'invalid' || explicit.kind === 'invalid') {
    return {
      kind: 'invalid',
      pageCountNotValid: explicit.kind === 'invalid',
      ...(breakdown.kind === 'invalid' ? { breakdownProblem: breakdown.problem } : {}),
    };
  }

  if (explicit.kind === 'count' && explicit.value !== breakdown.total) {
    return { kind: 'invalid', pageCountNotValid: false, breakdownProblem: 'totalMismatch' };
  }

  return {
    kind: 'valid',
    pageCount: breakdown.total,
    frontmatterCount: breakdown.frontmatterCount,
    backmatterCount: breakdown.backmatterCount,
  };
};

/**
 * The generic invalid-cell finding, naming the cell by its header and by the column it occupies
 * in the canonical (schema-ordered) file — the same column `csv-file-validator` would name. The
 * row is this parser's own numbering, as for every other preflight rule.
 */
const invalidCell = (key: CsvFieldKey, rowNumber: number, t: TranslateFunction): string => {
  const index = csvSchema.findIndex((field) => field.key === key);

  return t('errors.csvFieldNotValid', { field: csvSchema[index].header, row: rowNumber, column: index + 1 });
};

/**
 * The page-count findings for one row. A `page_count` the general `integer` rule has already
 * rejected is not reported a second time, and cannot be compared with anything, so it yields no
 * mismatch either — only a breakdown that is malformed in its own right adds a finding then.
 */
const collectPageCountFindings = (
  row: CsvRow,
  rowNumber: number,
  t: TranslateFunction,
  pageCountReported: boolean,
): CsvRowPreflightFinding[] => {
  const reconciliation = reconcilePageCount(row[CSV_KEYS.PAGE_COUNT], row[CSV_KEYS.PAGE_BREAKDOWN]);

  if (reconciliation.kind !== 'invalid') return [];

  const findings: CsvRowPreflightFinding[] = [];

  if (reconciliation.pageCountNotValid && !pageCountReported) {
    findings.push({ message: invalidCell(CSV_KEYS.PAGE_COUNT, rowNumber, t) });
  }

  if (reconciliation.breakdownProblem !== undefined) {
    findings.push({ message: invalidCell(CSV_KEYS.PAGE_BREAKDOWN, rowNumber, t) });
  }

  return findings;
};

/**
 * What the preflight needs to know beyond the rows themselves: the exact-match imprint labels, and whether the user is
 * a Thoth superuser (APP-IMPORT-CSV-PARITY-01 R-12). Without `isSuperuser` the THOTH-platform rule says nothing and
 * the API keeps its say, as before.
 */
export type CsvPreflightContext = { imprintLabels: readonly string[]; isSuperuser?: boolean };

export type CsvRowPreflightFinding = {
  message: string;
  /**
   * Set when this row/field also has a `csv-file-validator` finding that says nothing the
   * boundary finding does not already say — the value fails the validator *only because* of the
   * boundary defect reported here. The parser drops that validator finding, so one stray space
   * reads as one actionable error rather than two phrasings of the same keystroke.
   */
  suppressValidatorFinding?: CsvFieldKey;
};

/**
 * Every deterministic finding for one canonical row, in schema field order — which is the order
 * the template lays the columns out in, so within a row the user reads findings left to right.
 *
 * Cascade suppression for boundary defects works in both directions. A field whose only problem
 * is boundary whitespace gets exactly one finding: the rule check runs on the value with the
 * defect removed, so no derivative "invalid identifier" is added — and where the (untrimmed)
 * file validator would reject the same cell for the same reason, that finding is marked for
 * suppression. A field whose value would still be invalid after the defect is fixed reports both
 * findings, because they are two independent corrections the user has to make.
 *
 * The `page_count`/`page_breakdown` pair is reconciled where `page_breakdown` sits in that order,
 * once `page_count`'s own rule has had its say.
 *
 * On a Book Chapter row, an ISBN cell that is not blank once trimmed gets exactly one finding, `csvChapterIsbn`, in
 * place of its boundary finding and with the validator's ISBN finding suppressed: removing it is the one correction
 * (APP-IMPORT-CSV-PARITY-01 R-9; thoth `PublicationProperties::validate` -> `validate_chapter_constraints`,
 * `ChapterIsbnError`). The cross-cell backend-parity rules run after this, in `csvBackendParity.ts`.
 */
export const collectRowPreflightFindings = (
  row: CsvRow,
  rowNumber: number,
  t: TranslateFunction,
  context: CsvPreflightContext,
): CsvRowPreflightFinding[] => {
  const findings: CsvRowPreflightFinding[] = [];
  let pageCountReported = false;
  const isChapterRow = csvWorkTypeKind(row[CSV_KEYS.WORK_TYPE]) === 'chapter';

  for (const field of csvSchema) {
    const value = row[field.key];

    if (field.key === CSV_KEYS.PAGE_BREAKDOWN) {
      findings.push(...collectPageCountFindings(row, rowNumber, t, pageCountReported));
    }

    if (isChapterRow && ISBN_KEYS.has(field.key) && value.trim().length > 0) {
      findings.push({
        message: t('errors.csvChapterIsbn', { field: field.header, row: rowNumber }),
        suppressValidatorFinding: field.key,
      });

      continue;
    }

    if (field.boundary === 'report' && hasUnsafeBoundary(value)) {
      const residual = withoutBoundaryDefect(value);

      // The imprint validator matches labels exactly, without trimming, so it would report this
      // cell a second time for the same stray whitespace. Suppress that duplicate only when the
      // defect is the whole story — an imprint that is also simply wrong keeps both findings.
      const boundaryDefectOnly = field.validation === 'imprint' && context.imprintLabels.includes(residual);

      findings.push({
        message: t('errors.csvFieldWhitespace', { field: field.header, row: rowNumber }),
        ...(boundaryDefectOnly ? { suppressValidatorFinding: field.key } : {}),
      });

      const independentDefect = evaluateRule(field, residual, rowNumber, t);

      if (independentDefect) findings.push(ruleFinding(field, independentDefect));

      continue;
    }

    const message = evaluateRule(field, value, rowNumber, t);

    if (message) {
      findings.push(ruleFinding(field, message));

      if (field.key === CSV_KEYS.PAGE_COUNT) pageCountReported = true;
    }
  }

  return findings;
};
