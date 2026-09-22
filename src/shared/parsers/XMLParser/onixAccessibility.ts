import type { PublicationType } from '@/src/entities/publication/model/publication.types';

import { AccessibilityExceptions, AccessibilityStandards } from '../../constants/accessibility';
import { PublicationType as PublicationTypes } from '../../constants/publications';
import {
  ONIX_ACCESSIBILITY_ACKNOWLEDGED,
  ONIX_ACCESSIBILITY_KEEP_EXCEPTION,
  ONIX_ACCESSIBILITY_KEEP_STANDARDS,
  ONIX_ACCESSIBILITY_OMIT,
  type OnixAccessibilityCandidate,
  type OnixAccessibilityField,
  type OnixAccessibilityFieldSource,
  type OnixAccessibilityFinding,
  type OnixAccessibilityOmission,
  type OnixAccessibilityOmissionReason,
  type OnixAccessibilityPlan,
  type OnixAccessibilityScope,
  type OnixManifestationDecision,
  type OnixPlanFindingOption,
  type OnixProductAccessibility,
  type OnixProductFormFeatureDescriptionFact,
  type OnixProductFormFeatureFact,
  type OnixProductFormFeatureRole,
  type OnixPublicationAccessibilityReduction,
  type OnixPublicationAccessibilityState,
  type OnixRightsPlan,
  type OnixSourceLocation,
  type OnixSourcePlan,
} from '../../types/onixPlanning';
import { getUrlValidation } from '../../utils/validations';
import type { ExtendedONIXMessageRoot, OnixText } from './interfaces';
import { getOnixText, toOnixArray } from './onix';
import type { ProvenanceResolver } from './validation/worker/provenance';

/**
 * The canonical ProductFormFeature and Publication accessibility reducer of thoth-app#221, the accessibility slice of
 * #184, under ONIX-AUDIT-ACCESSIBILITY-01 (#179 proposal 5571562316, approval 5572432531) as bounded by the database
 * contract thoth#893 Architecture Amendment 3 (5764154050) made authoritative.
 *
 * It runs after canonical source validation has permitted target planning, on the adapter value bridged from the final
 * normalised Reference XML with its Short-tag provenance, after #182 has decided which records are Products and what each
 * manifestation could become. It reads nothing else - no Thoth lookup, no clock, no network, and never a URL a
 * ProductFormFeature carries - and decides nothing about source validity, which the canonical validator alone owns: a
 * valid fact Thoth cannot hold is a target loss here, never an invalid source.
 *
 * Every Product-level ProductFormFeature is kept exactly as stated, in source order at its own path. Only List 79 type 09
 * is reduced towards the four Publication accessibility fields, one Product at a time, and only by the exact approved
 * code combinations: nothing is chosen by source order, version, level or perceived strength, nothing is inferred from a
 * lone version, a lone level, a feature or the manifestation, and no state the database refuses is ever planned.
 */

export type ReduceOnixAccessibilityOptions = {
  /** Maps canonical Reference paths back to the submitted source, for a Short-tag file. */
  readonly provenance?: ProvenanceResolver;
  /**
   * The canonical Product-rights reduction of the same source (thoth-app#211): the usage constraints and technical
   * protection a Product states are shown beside List 196 code 10, whose exceptions they are (rules 58-62). Without it
   * code 10 cannot be read, and is a gap.
   */
  readonly rights?: OnixRightsPlan;
};

/* ------------------------------------------------------------------------------------------------ */
/* Codelists, pinned to the issue canonical validation carries                                      */
/* ------------------------------------------------------------------------------------------------ */

/** List 79 type 09: e-publication accessibility detail, whose value is a List 196 code (rule 11). */
export const ONIX_ACCESSIBILITY_FEATURE_TYPE = '09';

/** List 79 types 10, 15 and 16: format version and validator facts, consistency evidence only (rule 13). */
const FORMAT_EVIDENCE_TYPES: ReadonlySet<string> = new Set(['10', '15', '16']);

/**
 * The List 79 types whose omission is legally, regulatorily or operationally material (rule 17): hazard and safety
 * warnings (12, 13), dangerous goods (14, 21) and battery safety and capacity (19, 20), e-publication authentication and
 * access control (18), personal data requirements (25), and every EUDR regulatory fact - raw material locations, due
 * diligence references and attestations (47-54, 56, 60-65).
 */
export const ONIX_MATERIAL_FEATURE_TYPES: ReadonlySet<string> = new Set([
  '12',
  '13',
  '14',
  '18',
  '19',
  '20',
  '21',
  '25',
  '47',
  '48',
  '49',
  '50',
  '51',
  '52',
  '53',
  '54',
  '56',
  '60',
  '61',
  '62',
  '63',
  '64',
  '65',
]);

/** What a List 196 code is to Thoth's Publication (rules 19-84). */
export type OnixAccessibilityCodeKind =
  | 'SUMMARY'
  | 'COMPLIANCE_SCHEME'
  | 'EPUB_CONFORMANCE'
  | 'PDF_CONFORMANCE'
  | 'STATUS'
  | 'READING_SYSTEM_OPTIONS'
  | 'FEATURE'
  | 'EAA_EXCEPTION'
  | 'WCAG_VERSION'
  | 'WCAG_LEVEL'
  | 'CERTIFICATION'
  | 'DETAIL_URL'
  | 'REPORT_URL'
  | 'CONTACT';

const FEATURE_CODES = [
  '11',
  '12',
  '13',
  '14',
  '15',
  '16',
  '17',
  '18',
  '19',
  '20',
  '21',
  '22',
  '24',
  '25',
  '26',
  '27',
  '28',
  '29',
  '30',
  '31',
  '32',
  '34',
  '35',
  '36',
  '37',
  '38',
  '39',
  '40',
  '41',
  '51',
  '52',
  '53',
  '54',
];

/**
 * Every List 196 code of the pinned codelist issue, by kind; a test holds it to `ONIX_BookProduct_CodeLists.xsd`. A value
 * it does not hold is one canonical validation refuses (`_20171216_e_2`), so meeting one is a gap, never a guess.
 */
export const ONIX_LIST_196_KINDS: Readonly<Record<string, OnixAccessibilityCodeKind>> = {
  '00': 'SUMMARY',
  '01': 'COMPLIANCE_SCHEME',
  '02': 'EPUB_CONFORMANCE',
  '03': 'EPUB_CONFORMANCE',
  '04': 'EPUB_CONFORMANCE',
  '05': 'PDF_CONFORMANCE',
  '06': 'PDF_CONFORMANCE',
  '08': 'STATUS',
  '09': 'STATUS',
  '10': 'READING_SYSTEM_OPTIONS',
  ...Object.fromEntries(FEATURE_CODES.map((code) => [code, 'FEATURE'] as const)),
  '75': 'EAA_EXCEPTION',
  '76': 'EAA_EXCEPTION',
  '77': 'EAA_EXCEPTION',
  '80': 'WCAG_VERSION',
  '81': 'WCAG_VERSION',
  '82': 'WCAG_VERSION',
  '84': 'WCAG_LEVEL',
  '85': 'WCAG_LEVEL',
  '86': 'WCAG_LEVEL',
  '88': 'CERTIFICATION',
  '89': 'CERTIFICATION',
  '90': 'CERTIFICATION',
  '91': 'CERTIFICATION',
  '92': 'CERTIFICATION',
  '93': 'CERTIFICATION',
  '94': 'DETAIL_URL',
  '95': 'DETAIL_URL',
  '96': 'REPORT_URL',
  '97': 'DETAIL_URL',
  '98': 'CONTACT',
  '99': 'CONTACT',
};

const {
  Wcag21Aa,
  Wcag21Aaa,
  Wcag22Aa,
  Wcag22Aaa,
  EpubA11Y10Aa,
  EpubA11Y10Aaa,
  EpubA11Y11Aa,
  EpubA11Y11Aaa,
  PdfUa1,
  PdfUa2,
} = AccessibilityStandards.enum;
const { MicroEnterprises, DisproportionateBurden, FundamentalAlteration } = AccessibilityExceptions.enum;

/** The exact WCAG combinations (rules 28-31): a supported version and a supported level, both stated. */
const WCAG_COMBINATIONS: Readonly<Record<string, string>> = {
  '81|85': Wcag21Aa,
  '81|86': Wcag21Aaa,
  '82|85': Wcag22Aa,
  '82|86': Wcag22Aaa,
};
const SUPPORTED_WCAG_VERSIONS = ['81', '82'];
const SUPPORTED_WCAG_LEVELS = ['85', '86'];

/** EPUB Accessibility 1.1 needs its level stated (rules 42-45): `04` alone, or with level A (`84`), maps to nothing. */
const EPUB_11_COMBINATIONS: Readonly<Record<string, string>> = { '85': EpubA11Y11Aa, '86': EpubA11Y11Aaa };
const PDF_CONFORMANCES: Readonly<Record<string, string>> = { '05': PdfUa1, '06': PdfUa2 };
const EAA_EXCEPTIONS: Readonly<Record<string, string>> = {
  '75': MicroEnterprises,
  '76': DisproportionateBurden,
  '77': FundamentalAlteration,
};

const STANDARD_LABELS: Readonly<Record<string, string>> = {
  [Wcag21Aa]: 'WCAG 2.1 AA',
  [Wcag21Aaa]: 'WCAG 2.1 AAA',
  [Wcag22Aa]: 'WCAG 2.2 AA',
  [Wcag22Aaa]: 'WCAG 2.2 AAA',
  [EpubA11Y10Aa]: 'EPUB Accessibility 1.0 AA',
  [EpubA11Y10Aaa]: 'EPUB Accessibility 1.0 AAA',
  [EpubA11Y11Aa]: 'EPUB Accessibility 1.1 AA',
  [EpubA11Y11Aaa]: 'EPUB Accessibility 1.1 AAA',
  [PdfUa1]: 'PDF/UA-1',
  [PdfUa2]: 'PDF/UA-2',
  [MicroEnterprises]: 'EAA exception: micro-enterprise',
  [DisproportionateBurden]: 'EAA exception: disproportionate burden',
  [FundamentalAlteration]: 'EAA exception: fundamental alteration',
};

/** The order candidates are offered in: the app's own order of values, never the file's. */
const VALUE_ORDER: readonly string[] = [
  Wcag21Aa,
  Wcag21Aaa,
  Wcag22Aa,
  Wcag22Aaa,
  EpubA11Y10Aa,
  EpubA11Y10Aaa,
  EpubA11Y11Aa,
  EpubA11Y11Aaa,
  PdfUa1,
  PdfUa2,
  MicroEnterprises,
  DisproportionateBurden,
  FundamentalAlteration,
];

const PRIMARY_VALUES: ReadonlySet<string> = new Set(Object.values(WCAG_COMBINATIONS));
const EPUB_VALUES: ReadonlySet<string> = new Set([EpubA11Y10Aa, EpubA11Y10Aaa, EpubA11Y11Aa, EpubA11Y11Aaa]);
const PDF_VALUES: ReadonlySet<string> = new Set([PdfUa1, PdfUa2]);
const EXCEPTION_VALUES: ReadonlySet<string> = new Set(Object.values(EAA_EXCEPTIONS));

const { Paperback, Hardback, Mp3, Wav, Epub, Pdf } = PublicationTypes.enum;

const TYPE_NAMES: Readonly<Record<string, string>> = {
  PAPERBACK: 'Paperback',
  HARDBACK: 'Hardback',
  PDF: 'PDF',
  EPUB: 'EPUB',
  HTML: 'HTML',
  XML: 'XML',
  MOBI: 'MOBI',
  AZW3: 'AZW3',
  DOCX: 'DOCX',
  FICTION_BOOK: 'FictionBook',
  MP3: 'MP3',
  WAV: 'WAV',
};

const typeName = (type: PublicationType) => TYPE_NAMES[type] ?? type;

/* ------------------------------------------------------------------------------------------------ */
/* The target contract (thoth#893 Architecture Amendment 3)                                          */
/* ------------------------------------------------------------------------------------------------ */

/**
 * Which Publications may hold accessibility fields at all: Paperback and Hardback none (and nothing is projected to their
 * report URL either, #221), MP3 and WAV no standard or exception, every other type what its family allows.
 */
export const accessibilityScopeOf = (type: PublicationType): OnixAccessibilityScope => {
  if (type === Paperback || type === Hardback) return 'PHYSICAL';
  if (type === Mp3 || type === Wav) return 'AUDIO';

  return 'DIGITAL';
};

/** The one additional-standard family a type can hold: EPUB Accessibility on EPUB, PDF/UA on PDF, none elsewhere. */
const additionalFamilyOf = (type: PublicationType): 'EPUB' | 'PDF' | null =>
  type === Epub ? 'EPUB' : type === Pdf ? 'PDF' : null;

const familyOfValue = (value: string): 'EPUB' | 'PDF' | null =>
  EPUB_VALUES.has(value) ? 'EPUB' : PDF_VALUES.has(value) ? 'PDF' : null;

export const EMPTY_ONIX_ACCESSIBILITY: OnixPublicationAccessibilityState = {
  accessibilityStandard: null,
  accessibilityAdditionalStandard: null,
  accessibilityException: null,
  accessibilityReportUrl: null,
};

/**
 * Whether a Publication of a type may hold an accessibility state, exactly as the merged database CHECK constraints
 * decide (`check_accessibility_standard_rules`, `check_additional_standard_pdf_epub`, `check_standard_or_exception`):
 * a WCAG value only in the primary field, the type's own family only in the additional one and only beside a primary,
 * an exception only with no standard, and none of the three on a Paperback, Hardback, MP3 or WAV.
 */
export const isRepresentableOnixAccessibility = (
  type: PublicationType,
  state: OnixPublicationAccessibilityState,
): boolean => {
  const { accessibilityStandard: standard, accessibilityAdditionalStandard: additional } = state;
  const { accessibilityException: exception } = state;

  if (accessibilityScopeOf(type) !== 'DIGITAL' && (standard !== null || additional !== null || exception !== null)) {
    return false;
  }

  if (standard !== null && !PRIMARY_VALUES.has(standard)) return false;
  if (exception !== null && (!EXCEPTION_VALUES.has(exception) || standard !== null || additional !== null))
    return false;

  return (
    additional === null ||
    (standard !== null && familyOfValue(additional) !== null && familyOfValue(additional) === additionalFamilyOf(type))
  );
};

/* ------------------------------------------------------------------------------------------------ */
/* Reading the adapter                                                                              */
/* ------------------------------------------------------------------------------------------------ */

/** One element occurrence and its canonical path. */
type Occurrence = { readonly value: unknown; readonly path: string };

type Locate = (path: string) => OnixSourceLocation;

const isElement = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * Every occurrence of a named child, in source order, with its canonical path. `@5stones/onix` emits a single
 * occurrence as a value and a repeated one as an array; positions count same-named siblings from 1, as paths do, so a
 * single and a repeated composite normalise alike.
 */
const children = (parent: Occurrence | undefined, name: string): Occurrence[] => {
  if (parent === undefined || !isElement(parent.value) || !(name in parent.value)) return [];

  const child = parent.value[name];

  return (Array.isArray(child) ? child : [child])
    .map((value, index) => ({ value: value as unknown, path: `${parent.path}/${name}[${index + 1}]` }))
    .filter(({ value }) => value !== undefined && value !== null);
};

const textOf = (occurrence: Occurrence | undefined): string =>
  occurrence === undefined ? '' : getOnixText(occurrence.value as OnixText);

const childText = (parent: Occurrence | undefined, name: string): string | null => {
  const text = textOf(children(parent, name)[0]);

  return text.length > 0 ? text : null;
};

const attributeOf = (occurrence: Occurrence, name: string): string | null => {
  const value = isElement(occurrence.value) ? occurrence.value[`@_${name}`] : undefined;

  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
};

const roleOf = (type: string): OnixProductFormFeatureRole => {
  if (type === ONIX_ACCESSIBILITY_FEATURE_TYPE) return 'ACCESSIBILITY';
  if (FORMAT_EVIDENCE_TYPES.has(type)) return 'FORMAT_EVIDENCE';

  return ONIX_MATERIAL_FEATURE_TYPES.has(type) ? 'MATERIAL' : 'OTHER';
};

/** Every Product-level ProductFormFeature, repeats included, in source order, exactly as stated (rules 1-5). */
const readFeatures = (descriptive: Occurrence | undefined, locate: Locate): OnixProductFormFeatureFact[] =>
  children(descriptive, 'ProductFormFeature').map((feature) => {
    const type = childText(feature, 'ProductFormFeatureType') ?? '';

    return {
      ...locate(feature.path),
      type,
      value: childText(feature, 'ProductFormFeatureValue'),
      descriptions: children(feature, 'ProductFormFeatureDescription').map(
        (description): OnixProductFormFeatureDescriptionFact => ({
          ...locate(description.path),
          text: textOf(description),
          language: attributeOf(description, 'language'),
          textScript: attributeOf(description, 'textscript'),
          textFormat: attributeOf(description, 'textformat'),
        }),
      ),
      role: roleOf(type),
    };
  });

/**
 * A code-96 description as the report URL Thoth can hold: an absolute http or https web-page URL (List 196 code 96 is the
 * publisher's web page) that the ordinary Publication form's URL check also accepts, exactly as stated less surrounding
 * space. Only its syntax is read: nothing is ever fetched (rule 84).
 */
const reportUrlOf = (text: string): string | null => {
  const url = text.trim();

  if (!getUrlValidation().safeParse(url).success) return null;

  try {
    const { protocol, hostname } = new URL(url);

    return (protocol === 'http:' || protocol === 'https:') && hostname.length > 0 ? url : null;
  } catch {
    return null;
  }
};

/* ------------------------------------------------------------------------------------------------ */
/* Findings                                                                                         */
/* ------------------------------------------------------------------------------------------------ */

/**
 * A short fingerprint of plain data (cyrb53), as the descriptive reductions key their findings: equal data always gives
 * the same fingerprint, so a key built from one depends on the file alone. It tells facts apart; it is never an identity.
 */
const fingerprint = (value: unknown): string => {
  const text = JSON.stringify(value);
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;

  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);

    h1 = Math.imul(h1 ^ code, 2654435761);
    h2 = Math.imul(h2 ^ code, 1597334677);
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
};

type FindingInput = Omit<OnixAccessibilityFinding, 'family' | 'key' | 'locations'> & {
  /** Canonical paths of the facts the finding is about, in source order. */
  readonly paths: readonly string[];
  /** What tells this finding apart from another of the same code on the same Product and type. */
  readonly discriminator: string;
};

const unique = <T>(values: readonly T[]): T[] => [...new Set(values)];

/** Raises each finding once per key; the key depends on the file alone, so it is stable across resolutions. */
class AccessibilityFindings {
  private readonly byKey = new Map<string, OnixAccessibilityFinding>();

  constructor(private readonly locate: Locate) {}

  add({ paths, discriminator, ...input }: FindingInput): OnixAccessibilityFinding {
    const family = input.code === 'PRODUCT_FORM_FEATURE_NOT_REPRESENTED' ? 'PRODUCT_FORM_FEATURE' : 'ACCESSIBILITY';
    const key = [family, input.code, input.productKey, input.publicationType ?? '-', discriminator].join('|');
    const existing = this.byKey.get(key);

    if (existing) return existing;

    const finding: OnixAccessibilityFinding = { family, key, ...input, locations: unique(paths).map(this.locate) };

    this.byKey.set(key, finding);

    return finding;
  }

  all(): OnixAccessibilityFinding[] {
    return [...this.byKey.values()];
  }
}

const ACKNOWLEDGE = { kind: 'ACKNOWLEDGE' } as const;
const NONE = { kind: 'NONE' } as const;

/** A candidate named with the codes that assert it: `WCAG 2.1 AA (List 196 81 + 85)`. */
const describeCandidate = ({ label, codes }: Pick<OnixAccessibilityCandidate, 'label' | 'codes'>) =>
  `${label} (List 196 ${codes.join(' + ')})`;

const describeCandidates = (candidates: readonly OnixAccessibilityCandidate[]) =>
  candidates.map(describeCandidate).join('; ');

const candidateFacts = (candidates: readonly OnixAccessibilityCandidate[]) =>
  candidates.map(({ value, codes, locations }) => [value, codes, locations.map(({ path }) => path)]);

const pathsOf = (candidates: readonly OnixAccessibilityCandidate[]) =>
  candidates.flatMap(({ locations }) => locations.map(({ path }) => path));

const optionsOf = (candidates: readonly OnixAccessibilityCandidate[]): OnixPlanFindingOption[] =>
  candidates.map((candidate) => ({ key: candidate.value, label: describeCandidate(candidate) }));

/* ------------------------------------------------------------------------------------------------ */
/* Candidates                                                                                       */
/* ------------------------------------------------------------------------------------------------ */

type AccessibilityFact = OnixProductFormFeatureFact & { readonly code: string; readonly index: number };

/** The candidates of one field, one per distinct value, each with every fact stating it, in the app's value order. */
const candidatesOf = (
  field: OnixAccessibilityField,
  stated: readonly {
    readonly value: string;
    readonly codes: readonly string[];
    readonly facts: readonly AccessibilityFact[];
  }[],
  locationsOf: (facts: readonly AccessibilityFact[]) => OnixSourceLocation[] = (facts) =>
    [...facts].sort((a, b) => a.index - b.index).map(({ path, sourcePath }) => ({ path, sourcePath })),
): OnixAccessibilityCandidate[] => {
  const byValue = new Map<string, { codes: Set<string>; facts: AccessibilityFact[] }>();

  stated.forEach(({ value, codes, facts }) => {
    const entry = byValue.get(value) ?? { codes: new Set<string>(), facts: [] };

    codes.forEach((code) => entry.codes.add(code));
    facts.forEach((fact) => {
      if (!entry.facts.includes(fact)) entry.facts.push(fact);
    });
    byValue.set(value, entry);
  });

  return [...byValue.entries()]
    .map(([value, { codes, facts }]) => ({
      field,
      value,
      label: STANDARD_LABELS[value] ?? value,
      family: field === 'accessibilityAdditionalStandard' ? familyOfValue(value) : null,
      codes: [...codes].sort(),
      locations: locationsOf(facts),
    }))
    .sort((a, b) => {
      const order = VALUE_ORDER.indexOf(a.value) - VALUE_ORDER.indexOf(b.value);

      return order !== 0 ? order : a.value < b.value ? -1 : a.value > b.value ? 1 : 0;
    });
};

type ProductCandidates = {
  readonly primary: OnixAccessibilityCandidate[];
  readonly additional: OnixAccessibilityCandidate[];
  readonly exceptions: OnixAccessibilityCandidate[];
  readonly reportUrls: OnixAccessibilityCandidate[];
  /** The facts some candidate is asserted by. */
  readonly used: ReadonlySet<AccessibilityFact>;
  /** Every code-96 description no report URL is made from. */
  readonly unusableReports: readonly { readonly fact: AccessibilityFact; readonly description: string | null }[];
};

/**
 * Every value the explicit type-09 codes assert, exactly (rules 28-50, 63-65, 78). A WCAG value needs a supported version
 * and a supported level both stated (80, 84, a lone version and a lone level map to nothing); code 03 is EPUB
 * Accessibility 1.0 AA, and AAA with 86; code 04 needs 85 or 86; 05 and 06 are PDF/UA-1 and -2; 75-77 the EAA exceptions;
 * and each code-96 web-page URL the report URL. Where several are asserted, every one is a candidate: none is preferred.
 */
const reduceCandidates = (facts: readonly AccessibilityFact[]): ProductCandidates => {
  const byCode = (code: string) => facts.filter((fact) => fact.code === code);
  const has = (code: string) => byCode(code).length > 0;
  const used = new Set<AccessibilityFact>();
  const assert = (value: string, codes: string[]) => {
    const stating = codes.flatMap(byCode);

    stating.forEach((fact) => used.add(fact));

    return { value, codes, facts: stating };
  };

  const primary = SUPPORTED_WCAG_VERSIONS.filter(has).flatMap((version) =>
    SUPPORTED_WCAG_LEVELS.filter(has).map((level) =>
      assert(WCAG_COMBINATIONS[`${version}|${level}`], [version, level]),
    ),
  );

  const additional = [
    // Code 03 is itself AA; a stated 86 makes the exact combination AAA (rules 39-40), and a stated 85 keeps AA.
    ...(has('03') && has('86') ? [assert(EpubA11Y10Aaa, ['03', '86'])] : []),
    ...(has('03') && (!has('86') || has('85')) ? [assert(EpubA11Y10Aa, has('85') ? ['03', '85'] : ['03'])] : []),
    ...(has('04')
      ? SUPPORTED_WCAG_LEVELS.filter(has).map((level) => assert(EPUB_11_COMBINATIONS[level], ['04', level]))
      : []),
    ...Object.keys(PDF_CONFORMANCES)
      .filter(has)
      .map((code) => assert(PDF_CONFORMANCES[code], [code])),
  ];

  const exceptions = Object.keys(EAA_EXCEPTIONS)
    .filter(has)
    .map((code) => assert(EAA_EXCEPTIONS[code], [code]));

  const unusableReports: { fact: AccessibilityFact; description: string | null }[] = [];
  const urlsByValue = new Map<string, { facts: AccessibilityFact[]; locations: OnixSourceLocation[] }>();

  byCode('96').forEach((fact) => {
    if (fact.descriptions.length === 0) unusableReports.push({ fact, description: null });

    fact.descriptions.forEach((description) => {
      const url = reportUrlOf(description.text);

      if (url === null) {
        unusableReports.push({ fact, description: description.text });

        return;
      }

      const entry = urlsByValue.get(url) ?? { facts: [], locations: [] };

      used.add(fact);
      entry.facts.push(fact);
      entry.locations.push({ path: description.path, sourcePath: description.sourcePath });
      urlsByValue.set(url, entry);
    });
  });

  const reportUrls: OnixAccessibilityCandidate[] = [...urlsByValue.entries()]
    .map(([url, { locations }]) => ({
      field: 'accessibilityReportUrl' as const,
      value: url,
      label: url,
      family: null,
      codes: ['96'],
      locations,
    }))
    // No order a file states makes one URL the report: they are offered in a fixed order of their own.
    .sort((a, b) => (a.value < b.value ? -1 : a.value > b.value ? 1 : 0));

  return {
    primary: candidatesOf('accessibilityStandard', primary),
    additional: candidatesOf('accessibilityAdditionalStandard', additional),
    exceptions: candidatesOf('accessibilityException', exceptions),
    reportUrls,
    used,
    unusableReports,
  };
};

/* ------------------------------------------------------------------------------------------------ */
/* The reduction                                                                                    */
/* ------------------------------------------------------------------------------------------------ */

const describeRecord = (index: number, recordReference: string | null) =>
  recordReference === null ? `product ${index}` : `product ${index} (${recordReference})`;

/** The PublicationTypes a Product's manifestation could still become: the resolved one, or every candidate. */
const typesOf = (manifestation: OnixManifestationDecision): PublicationType[] =>
  manifestation.kind === 'RESOLVED'
    ? [manifestation.type]
    : manifestation.kind === 'INPUT_REQUIRED'
      ? [...manifestation.candidates]
      : [];

const KIND_WORDS: Readonly<Record<OnixAccessibilityCodeKind, string>> = {
  SUMMARY: 'an accessibility summary',
  COMPLIANCE_SCHEME: 'a compliance scheme',
  EPUB_CONFORMANCE: 'an EPUB Accessibility conformance',
  PDF_CONFORMANCE: 'a PDF/UA conformance',
  STATUS: 'an accessibility status',
  READING_SYSTEM_OPTIONS: 'a statement about reading-system accessibility options',
  FEATURE: 'an accessibility feature',
  EAA_EXCEPTION: 'an EAA exception',
  WCAG_VERSION: 'a WCAG version',
  WCAG_LEVEL: 'a WCAG level',
  CERTIFICATION: 'certification or assessment metadata',
  DETAIL_URL: 'a web page for detailed accessibility information',
  REPORT_URL: "the publisher's web page for detailed accessibility information",
  CONTACT: 'an accessibility contact',
};

/** Why a type-09 fact that maps to nothing on its own maps to nothing here, in the file's own terms. */
const unmappedReason = (fact: AccessibilityFact, kind: OnixAccessibilityCodeKind): string => {
  switch (fact.code) {
    case '80':
      return 'WCAG 2.0 has no Thoth accessibility standard';
    case '84':
      return 'WCAG level A has no Thoth accessibility standard';
    case '02':
      return 'EPUB Accessibility 1.0 level A has no Thoth accessibility standard';
    case '04':
      return 'EPUB Accessibility 1.1 maps only with level AA (85) or AAA (86), and none is stated with it';
    case '81':
    case '82':
      return 'a WCAG version maps only together with level AA (85) or AAA (86), and none is stated';
    case '85':
    case '86':
      return 'a WCAG level maps only together with WCAG 2.1 (81) or 2.2 (82), or EPUB Accessibility 1.0 (03) or 1.1 (04), and none is stated';
    case '08':
      return 'Thoth records no unknown-accessibility status';
    case '09':
      return 'Thoth records no inaccessible or limited-accessibility status';
    case '00':
      return "Thoth's Publication has no accessibility summary, and a summary is never its report URL or the publisher's accessibility statement";
    case '98':
    case '99':
      return 'a Product contact is never the report URL, and no publisher contact is created or changed from it';
    case '94':
    case '95':
    case '97':
      return "only the publisher's own accessibility web page (96) is the report URL; this page keeps its own provenance";
    default:
      return kind === 'FEATURE' || kind === 'CERTIFICATION' || kind === 'COMPLIANCE_SCHEME'
        ? "Thoth's Publication has no field for it"
        : 'Thoth has no field for it';
  }
};

/**
 * The canonical ProductFormFeature and accessibility reduction of one message: every Product's features, the candidates
 * its type-09 facts assert, and every finding about them, for every PublicationType its manifestation could become.
 * Pure and deterministic: the same file always reduces to the same plan.
 */
export const reduceOnixAccessibility = (
  root: ExtendedONIXMessageRoot,
  sourcePlan: OnixSourcePlan,
  options: ReduceOnixAccessibilityOptions = {},
): OnixAccessibilityPlan => {
  const locate: Locate = (path) => ({ path, sourcePath: options.provenance?.sourcePathOf(path) ?? path });
  const findings = new AccessibilityFindings(locate);
  const productValues = toOnixArray(root.ONIXMessage?.Product);
  const recordByKey = new Map(sourcePlan.records.map((record) => [record.recordKey, record]));
  const products: Record<string, OnixProductAccessibility> = {};

  sourcePlan.products
    .flatMap((node) => {
      const record = recordByKey.get(node.representativeRecordKey);

      return record === undefined ? [] : [{ node, record }];
    })
    .sort((a, b) => a.record.index - b.record.index)
    .forEach(({ node, record }) => {
      const { productKey, groupKey } = node;
      const describe = describeRecord(record.index, record.recordReference);
      const product: Occurrence = { value: productValues[record.index - 1], path: record.path };
      const features = readFeatures(children(product, 'DescriptiveDetail')[0], locate);
      const productFindingKeys: string[] = [];
      const addProduct = (input: Omit<FindingInput, 'productKey' | 'groupKey' | 'publicationType'>) =>
        productFindingKeys.push(findings.add({ ...input, productKey, groupKey, publicationType: null }).key);

      /* Every other valid List 79 type: kept as an explicit Product fact, and never re-scoped (rules 12-18). */
      features
        .filter(({ role }) => role !== 'ACCESSIBILITY')
        .forEach((feature) => {
          const material = feature.role === 'MATERIAL';

          addProduct({
            code: 'PRODUCT_FORM_FEATURE_NOT_REPRESENTED',
            classification: 'TARGET_UNREPRESENTABLE',
            blocking: material,
            paths: [feature.path],
            discriminator: feature.path,
            detail: {
              type: feature.type,
              value: feature.value ?? '',
              role: feature.role,
              descriptions: feature.descriptions.length,
              ...(feature.role === 'FORMAT_EVIDENCE'
                ? {
                    manifestation:
                      node.manifestation.kind === 'RESOLVED' ? node.manifestation.type : node.manifestation.kind,
                  }
                : {}),
            },
            resolution: material ? ACKNOWLEDGE : NONE,
            message:
              feature.role === 'FORMAT_EVIDENCE'
                ? `${describe} states a format version or validator fact (ProductFormFeatureType ${feature.type}${feature.value === null ? '' : `, value ${feature.value}`}); Thoth's Publication has no field for it, and it is consistency evidence only: it never decides or changes the publication type`
                : material
                  ? `${describe} states a legally, regulatorily or operationally material product fact (ProductFormFeatureType ${feature.type}${feature.value === null ? '' : `, value ${feature.value}`}) that Thoth cannot record anywhere; importing the product omits it`
                  : `${describe} states a product form feature (ProductFormFeatureType ${feature.type}${feature.value === null ? '' : `, value ${feature.value}`}) that Thoth does not record`,
          });
        });

      /* Type 09: every fact, then the values its exact code combinations assert. */
      const accessibilityFacts: AccessibilityFact[] = features
        .map((feature, index) => ({ ...feature, code: feature.value ?? '', index }))
        .filter(({ role }) => role === 'ACCESSIBILITY');
      const unexpected = accessibilityFacts.filter(({ code }) => ONIX_LIST_196_KINDS[code] === undefined);
      const known = accessibilityFacts.filter(({ code }) => ONIX_LIST_196_KINDS[code] !== undefined);

      unexpected.forEach((fact) =>
        addProduct({
          code: 'ACCESSIBILITY_SHAPE_UNEXPECTED',
          classification: 'PREFLIGHT_GAP',
          blocking: true,
          paths: [fact.path],
          discriminator: fact.path,
          detail: { value: fact.value ?? '' },
          resolution: NONE,
          message:
            fact.value === null
              ? `${describe} states accessibility detail (ProductFormFeatureType 09) with no ProductFormFeatureValue, so what it asserts cannot be read`
              : `${describe} states accessibility detail (ProductFormFeatureType 09) with a value of "${fact.value}", which List 196 does not define, so what it asserts cannot be read`,
        }),
      );

      const candidates = reduceCandidates(known);
      const usageConstraints = options.rights?.products[productKey]?.usageConstraints ?? [];
      const technicalProtection = options.rights?.products[productKey]?.technicalProtection ?? [];

      known.forEach((fact) => {
        const kind = ONIX_LIST_196_KINDS[fact.code];
        const mapped = candidates.used.has(fact);

        if (fact.code === '96') return;

        if (kind === 'READING_SYSTEM_OPTIONS') {
          // Code 10 carries the exceptions EpubUsageConstraint records (rules 18, 58-62): shown with them, never alone.
          if (options.rights === undefined) {
            addProduct({
              code: 'ACCESSIBILITY_READING_OPTIONS_NOT_RECONCILED',
              classification: 'PREFLIGHT_GAP',
              blocking: true,
              paths: [fact.path],
              discriminator: fact.path,
              detail: { value: fact.code },
              resolution: NONE,
              message: `${describe} states that no reading-system accessibility options are disabled (List 196 10), whose exceptions its usage constraints record; with no rights reduction to read them with, what it means cannot be shown`,
            });

            return;
          }

          addProduct({
            code: 'ACCESSIBILITY_FACT_NOT_REPRESENTED',
            classification: 'TARGET_UNREPRESENTABLE',
            blocking: false,
            paths: [
              fact.path,
              ...usageConstraints.map(({ path }) => path),
              ...technicalProtection.map(({ path }) => path),
            ],
            discriminator: fact.path,
            detail: {
              value: fact.code,
              kind,
              descriptions: fact.descriptions.length,
              usageConstraints: usageConstraints.map(({ type, status }) => `${type}:${status}`),
              technicalProtection: technicalProtection.map(({ code }) => code),
            },
            resolution: NONE,
            message: `${describe} states that no reading-system accessibility options are disabled (List 196 10)${usageConstraints.length > 0 || technicalProtection.length > 0 ? `, except as its usage constraints (${usageConstraints.map(({ type, status }) => `EpubUsageType ${type}, status ${status}`).join('; ') || 'none'}) and technical protection (${technicalProtection.map(({ code }) => code).join(', ') || 'none'}) record` : ''}; Thoth's Publication has no field for it, so it implies nothing about DRM or text-to-speech`,
          });

          return;
        }

        if (mapped) {
          if (fact.descriptions.length > 0) {
            addProduct({
              code: 'ACCESSIBILITY_DESCRIPTION_NOT_REPRESENTED',
              classification: 'SUPPORTED_WITH_WARNING',
              blocking: false,
              paths: [fact.path, ...fact.descriptions.map(({ path }) => path)],
              discriminator: fact.path,
              detail: { value: fact.code, kind, descriptions: fact.descriptions.length },
              resolution: NONE,
              message: `${describe} describes ${KIND_WORDS[kind]} (List 196 ${fact.code}) in words Thoth cannot keep beside the value it maps to; the description is not imported`,
            });
          }

          return;
        }

        addProduct({
          code: 'ACCESSIBILITY_FACT_NOT_REPRESENTED',
          classification: 'TARGET_UNREPRESENTABLE',
          blocking: false,
          paths: [fact.path],
          discriminator: fact.path,
          detail: { value: fact.code, kind, descriptions: fact.descriptions.length },
          resolution: NONE,
          message: `${describe} states ${KIND_WORDS[kind]} (List 196 ${fact.code}) that Thoth does not record: ${unmappedReason(fact, kind)}`,
        });
      });

      candidates.unusableReports.forEach(({ fact, description }) =>
        addProduct({
          code: 'ACCESSIBILITY_REPORT_URL_UNUSABLE',
          classification: 'TARGET_UNREPRESENTABLE',
          blocking: false,
          paths: [fact.path],
          discriminator: `${fact.path}|${description ?? ''}`,
          detail: { value: fact.code, url: description ?? '' },
          resolution: NONE,
          message:
            description === null
              ? `${describe} names the publisher's accessibility web page (List 196 96) with no URL, so it gives no report URL`
              : `${describe} gives "${description}" as the publisher's accessibility web page (List 196 96), which is no web-page URL Thoth can hold as the report URL; nothing is fetched to check it`,
        }),
      );

      /* What those candidates come to for each PublicationType the Product could become. */
      const statusFacts = known.filter(({ code }) => ONIX_LIST_196_KINDS[code] === 'STATUS');
      const reportFacts = known.filter(({ code }) => code === '96');
      const { primary, additional, exceptions, reportUrls } = candidates;
      const publications: Partial<Record<PublicationType, OnixPublicationAccessibilityReduction>> = {};

      typesOf(node.manifestation).forEach((type) => {
        const scope = accessibilityScopeOf(type);
        const family = additionalFamilyOf(type);
        const compatible = scope === 'DIGITAL' ? additional.filter((candidate) => candidate.family === family) : [];
        const incompatible = scope === 'DIGITAL' ? additional.filter((candidate) => candidate.family !== family) : [];
        const keys: string[] = [];
        const publication = `its ${typeName(type)} Publication`;
        const add = (input: Omit<FindingInput, 'productKey' | 'groupKey' | 'publicationType'>) =>
          keys.push(findings.add({ ...input, productKey, groupKey, publicationType: type }).key);

        if (scope !== 'DIGITAL') {
          const notProjected = [...primary, ...additional, ...exceptions, ...(scope === 'PHYSICAL' ? reportUrls : [])];

          if (notProjected.length > 0) {
            add({
              code: 'ACCESSIBILITY_NOT_PROJECTED',
              classification: 'TARGET_UNREPRESENTABLE',
              blocking: false,
              paths: pathsOf(notProjected),
              discriminator: fingerprint(candidateFacts(notProjected)),
              detail: { scope, values: notProjected.map(({ value }) => value) },
              resolution: NONE,
              message:
                scope === 'PHYSICAL'
                  ? `${describe} states e-publication accessibility detail (${describeCandidates(notProjected)}) for ${publication}; a print Publication takes no accessibility standard, exception or report URL, so the facts are kept as source evidence and nothing is imported to it`
                  : `${describe} states accessibility standards or exceptions (${describeCandidates(notProjected)}) for ${publication}; an audiobook Publication holds none, so they are kept as source evidence and nothing is imported to it`,
            });
          }

          if (scope === 'AUDIO' && reportFacts.length > 0) {
            add({
              code: 'ACCESSIBILITY_AUDIO_REPORT_URL_UNRESOLVED',
              classification: 'PREFLIGHT_GAP',
              blocking: true,
              paths: reportFacts.map(({ path }) => path),
              discriminator: fingerprint(
                reportFacts.map(({ path, descriptions }) => [path, descriptions.map(({ text }) => text)]),
              ),
              detail: { urls: reportUrls.map(({ value }) => value) },
              resolution: NONE,
              message: `${describe} names the publisher's accessibility web page (List 196 96) for ${publication}; what an audiobook's accessibility report URL means is not decided, so it is neither imported nor dropped`,
            });
          }

          publications[type] = {
            publicationType: type,
            scope,
            additionalStandards: [],
            incompatibleAdditionalStandards: [],
            findingKeys: keys,
          };

          return;
        }

        if (primary.length > 1) {
          add({
            code: 'ACCESSIBILITY_PRIMARY_CHOICE_REQUIRED',
            classification: 'TARGET_INPUT_REQUIRED',
            blocking: true,
            paths: pathsOf(primary),
            discriminator: fingerprint(candidateFacts(primary)),
            detail: { values: primary.map(({ value }) => value) },
            resolution: {
              kind: 'CHOICE',
              options: [...optionsOf(primary), { key: ONIX_ACCESSIBILITY_OMIT, label: ONIX_ACCESSIBILITY_OMIT }],
            },
            message: `${describe} asserts several WCAG conformances (${describeCandidates(primary)}), and ${publication} holds one accessibility standard; none is taken by source order, version or level: choose one, or set no accessibility standard (and so no additional standard)`,
          });
        }

        if (primary.length > 0 && compatible.length > 1) {
          add({
            code: 'ACCESSIBILITY_ADDITIONAL_CHOICE_REQUIRED',
            classification: 'TARGET_INPUT_REQUIRED',
            blocking: true,
            paths: pathsOf(compatible),
            discriminator: fingerprint(candidateFacts(compatible)),
            detail: { values: compatible.map(({ value }) => value) },
            resolution: { kind: 'CHOICE', options: optionsOf(compatible) },
            message: `${describe} asserts several conformances ${publication} could hold as its one additional accessibility standard (${describeCandidates(compatible)}); none is taken by source order or strength: choose one`,
          });
        }

        if (exceptions.length > 1) {
          add({
            code: 'ACCESSIBILITY_EXCEPTION_CHOICE_REQUIRED',
            classification: 'TARGET_INPUT_REQUIRED',
            blocking: true,
            paths: pathsOf(exceptions),
            discriminator: fingerprint(candidateFacts(exceptions)),
            detail: { values: exceptions.map(({ value }) => value) },
            resolution: { kind: 'CHOICE', options: optionsOf(exceptions) },
            message: `${describe} claims several EAA exceptions (${describeCandidates(exceptions)}), and ${publication} holds one; none is taken by source order: choose one`,
          });
        }

        if (reportUrls.length > 1) {
          add({
            code: 'ACCESSIBILITY_REPORT_URL_CHOICE_REQUIRED',
            classification: 'TARGET_INPUT_REQUIRED',
            blocking: true,
            paths: pathsOf(reportUrls),
            discriminator: fingerprint(candidateFacts(reportUrls)),
            detail: { values: reportUrls.map(({ value }) => value) },
            resolution: { kind: 'CHOICE', options: reportUrls.map(({ value }) => ({ key: value, label: value })) },
            message: `${describe} gives several web pages as the publisher's accessibility information (List 196 96: ${reportUrls.map(({ value }) => value).join(', ')}), and ${publication} holds one report URL; none is taken by source order: choose one`,
          });
        }

        if (primary.length > 0 && exceptions.length > 0) {
          const standards = [...primary, ...compatible];

          add({
            code: 'ACCESSIBILITY_STANDARD_EXCEPTION_CHOICE_REQUIRED',
            classification: 'TARGET_INPUT_REQUIRED',
            blocking: true,
            paths: pathsOf([...standards, ...exceptions]),
            discriminator: fingerprint([candidateFacts(standards), candidateFacts(exceptions)]),
            detail: {
              standards: standards.map(({ value }) => value),
              exceptions: exceptions.map(({ value }) => value),
            },
            resolution: {
              kind: 'CHOICE',
              options: [
                { key: ONIX_ACCESSIBILITY_KEEP_STANDARDS, label: describeCandidates(standards) },
                { key: ONIX_ACCESSIBILITY_KEEP_EXCEPTION, label: describeCandidates(exceptions) },
              ],
            },
            message: `${describe} asserts accessibility standards (${describeCandidates(standards)}) and an EAA exception (${describeCandidates(exceptions)}); a Publication never holds both, so choose which ${publication} keeps - the other is not imported`,
          });
        }

        if (primary.length === 0 && compatible.length > 0) {
          add({
            code: 'ACCESSIBILITY_ADDITIONAL_WITHOUT_PRIMARY',
            classification: 'TARGET_UNREPRESENTABLE',
            blocking: true,
            paths: pathsOf(compatible),
            discriminator: fingerprint(candidateFacts(compatible)),
            detail: { values: compatible.map(({ value }) => value) },
            resolution: ACKNOWLEDGE,
            message: `${describe} asserts ${describeCandidates(compatible)} with no WCAG conformance Thoth holds; an additional accessibility standard is never held without a primary one and none is invented, so ${publication} is created without it`,
          });
        }

        if (incompatible.length > 0) {
          add({
            code: 'ACCESSIBILITY_ADDITIONAL_INCOMPATIBLE',
            classification: 'TARGET_UNREPRESENTABLE',
            blocking: true,
            paths: pathsOf(incompatible),
            discriminator: fingerprint(candidateFacts(incompatible)),
            detail: { values: incompatible.map(({ value }) => value) },
            resolution: ACKNOWLEDGE,
            message: `${describe} asserts ${describeCandidates(incompatible)}, which ${publication} cannot hold (EPUB Accessibility belongs to an EPUB, PDF/UA to a PDF); it is kept as source evidence and not imported`,
          });
        }

        if (statusFacts.length > 0 && primary.length > 0) {
          add({
            code: 'ACCESSIBILITY_STATUS_NOT_REPRESENTED',
            classification: 'TARGET_UNREPRESENTABLE',
            blocking: true,
            paths: statusFacts.map(({ path }) => path),
            discriminator: fingerprint([statusFacts.map(({ path, code }) => [path, code]), candidateFacts(primary)]),
            detail: { statuses: statusFacts.map(({ code }) => code), standards: primary.map(({ value }) => value) },
            resolution: ACKNOWLEDGE,
            message: `${describe} states ${statusFacts.map(({ code }) => (code === '08' ? 'unknown accessibility (List 196 08)' : 'inaccessible or limited accessibility (List 196 09)')).join(' and ')} beside the accessibility standard ${publication} would hold; Thoth cannot record that status, so the standard alone would describe it as more accessible than the file says`,
          });
        }

        publications[type] = {
          publicationType: type,
          scope,
          additionalStandards: compatible,
          incompatibleAdditionalStandards: incompatible,
          findingKeys: keys,
        };
      });

      products[productKey] = {
        productKey,
        groupKey,
        features,
        primaryStandards: primary,
        additionalStandards: additional,
        exceptions,
        reportUrls,
        publications,
        findingKeys: productFindingKeys,
      };
    });

  return { products, findings: findings.all() };
};

/* ------------------------------------------------------------------------------------------------ */
/* One Publication's accessibility, with the publisher's answers                                     */
/* ------------------------------------------------------------------------------------------------ */

/** Whether an answer is one a finding offers: one of its options, or the acknowledgement it asks for. */
export const isOfferedOnixAccessibilityAnswer = (
  finding: Pick<OnixAccessibilityFinding, 'resolution'>,
  answer: string,
): boolean =>
  finding.resolution.kind === 'CHOICE'
    ? finding.resolution.options.some(({ key }) => key === answer)
    : finding.resolution.kind === 'ACKNOWLEDGE' && answer === ONIX_ACCESSIBILITY_ACKNOWLEDGED;

/** What one Publication's accessibility comes to with the answers given, and what it still waits on. */
export type OnixPublicationAccessibilityDecision = {
  readonly scope: OnixAccessibilityScope;
  /** The four fields, once every decision they need is answered and no gap stands; null until then. */
  readonly resolved: OnixPublicationAccessibilityState | null;
  readonly sources: readonly OnixAccessibilityFieldSource[];
  readonly omitted: readonly OnixAccessibilityOmission[];
  /** Choices that decide `resolved` and have no answer yet. */
  readonly pendingChoices: readonly string[];
  /** Choices that decide `resolved` and have an answer they do not offer: never applied. */
  readonly staleChoices: readonly string[];
  /** The acknowledgements a Publication created with `resolved` needs, whether answered or not. */
  readonly acknowledgements: readonly string[];
  /** Findings no answer resolves, which hold the Publication back. */
  readonly gaps: readonly string[];
  /** Every finding of the Product that applies to this Publication as this type. */
  readonly findingKeys: readonly string[];
};

type Picked =
  | { readonly kind: 'NONE' }
  | { readonly kind: 'AUTOMATIC'; readonly candidate: OnixAccessibilityCandidate }
  | { readonly kind: 'CHOSEN'; readonly candidate: OnixAccessibilityCandidate; readonly findingKey: string }
  | { readonly kind: 'OMITTED'; readonly findingKey: string }
  | { readonly kind: 'PENDING'; readonly findingKey: string }
  | { readonly kind: 'STALE'; readonly findingKey: string }
  | { readonly kind: 'GAP' };

/**
 * What one Product's accessibility comes to for its Publication as one PublicationType, with the publisher's answers
 * (thoth-app#221). It never takes a value no explicit code combination asserts, never prefers one candidate to another,
 * and never returns a state the database refuses: a state that could not be represented is a gap, never a Publication.
 * Returns null where the Product was not reduced for the type.
 */
export const resolveOnixPublicationAccessibility = (
  plan: OnixAccessibilityPlan,
  productKey: string,
  publicationType: PublicationType,
  findingByKey: ReadonlyMap<string, OnixAccessibilityFinding>,
  choices: Readonly<Record<string, string>> | undefined,
): OnixPublicationAccessibilityDecision | null => {
  const product = plan.products[productKey];
  const reduction = product?.publications[publicationType];

  if (product === undefined || reduction === undefined) return null;

  const productFindings = product.findingKeys.flatMap((key) => findingByKey.get(key) ?? []);
  const typeFindings = reduction.findingKeys.flatMap((key) => findingByKey.get(key) ?? []);
  const findingOf = (code: OnixAccessibilityFinding['code']) => typeFindings.find((finding) => finding.code === code);
  const gaps = [...productFindings, ...typeFindings]
    .filter(({ classification, blocking }) => classification === 'PREFLIGHT_GAP' && blocking)
    .map(({ key }) => key);
  const sources: OnixAccessibilityFieldSource[] = [];
  const omitted: OnixAccessibilityOmission[] = [];
  const omit = (
    candidates: readonly OnixAccessibilityCandidate[],
    reason: OnixAccessibilityOmissionReason,
    findingKey: string | null = null,
  ) =>
    candidates.forEach(({ field, value, codes, locations }) =>
      omitted.push({ field, value, reason, findingKey, codes, locations }),
    );
  const findingKeys = [...product.findingKeys, ...reduction.findingKeys];

  if (reduction.scope !== 'DIGITAL') {
    const reason = reduction.scope === 'PHYSICAL' ? 'PHYSICAL_PUBLICATION' : 'AUDIO_PUBLICATION';

    omit([...product.primaryStandards, ...product.additionalStandards, ...product.exceptions], reason);
    // An audiobook's report URL is neither taken nor dropped: its gap holds the Publication instead.
    if (reduction.scope === 'PHYSICAL') omit(product.reportUrls, reason);

    return {
      scope: reduction.scope,
      resolved: gaps.length === 0 ? EMPTY_ONIX_ACCESSIBILITY : null,
      sources,
      omitted,
      pendingChoices: [],
      staleChoices: [],
      acknowledgements: [],
      gaps,
      findingKeys,
    };
  }

  const pendingChoices: string[] = [];
  const staleChoices: string[] = [];
  const answerOf = (finding: OnixAccessibilityFinding) => {
    const answer = choices?.[finding.key];

    if (answer === undefined) return { kind: 'UNANSWERED' as const };

    return isOfferedOnixAccessibilityAnswer(finding, answer)
      ? { kind: 'ANSWERED' as const, answer }
      : { kind: 'STALE' as const, answer };
  };
  const pick = (code: OnixAccessibilityFinding['code'], candidates: readonly OnixAccessibilityCandidate[]): Picked => {
    if (candidates.length === 0) return { kind: 'NONE' };
    if (candidates.length === 1) return { kind: 'AUTOMATIC', candidate: candidates[0] };

    const finding = findingOf(code);

    // Several candidates always raise their choice; a reduction that did not is a gap, never read as one value.
    if (finding === undefined) {
      gaps.push(`${productKey}|${publicationType}|${code}`);

      return { kind: 'GAP' };
    }

    const answer = answerOf(finding);

    if (answer.kind === 'UNANSWERED') {
      pendingChoices.push(finding.key);

      return { kind: 'PENDING', findingKey: finding.key };
    }

    if (answer.kind === 'STALE') {
      staleChoices.push(finding.key);

      return { kind: 'STALE', findingKey: finding.key };
    }

    if (answer.answer === ONIX_ACCESSIBILITY_OMIT) return { kind: 'OMITTED', findingKey: finding.key };

    const candidate = candidates.find(({ value }) => value === answer.answer) as OnixAccessibilityCandidate;

    return { kind: 'CHOSEN', candidate, findingKey: finding.key };
  };
  /** The value a pick sets, recording its source and every candidate it leaves out. */
  const settle = (picked: Picked, candidates: readonly OnixAccessibilityCandidate[]): string | null | undefined => {
    switch (picked.kind) {
      case 'NONE':
        return null;
      case 'AUTOMATIC':
      case 'CHOSEN': {
        const { field, value, codes, locations } = picked.candidate;
        const findingKey = picked.kind === 'CHOSEN' ? picked.findingKey : null;

        sources.push({
          field,
          value,
          basis: picked.kind === 'CHOSEN' ? 'PUBLISHER_CHOICE' : 'AUTOMATIC',
          findingKey,
          codes,
          locations,
        });
        omit(
          candidates.filter((candidate) => candidate !== picked.candidate),
          'NOT_CHOSEN',
          findingKey,
        );

        return value;
      }
      case 'OMITTED':
        omit(candidates, 'PUBLISHER_OMISSION', picked.findingKey);

        return null;
      default:
        return undefined;
    }
  };

  const { primaryStandards: primary, exceptions, reportUrls } = product;
  const { additionalStandards: compatible, incompatibleAdditionalStandards: incompatible } = reduction;
  const acknowledgements: string[] = [];

  /* Standards and an exception are never held together: which is kept is the publisher's (Amendment 3). */
  const conflict = findingOf('ACCESSIBILITY_STANDARD_EXCEPTION_CHOICE_REQUIRED');
  let keep: 'BOTH' | 'STANDARDS' | 'EXCEPTION' | 'UNDECIDED' = 'BOTH';

  if (conflict !== undefined) {
    const answer = answerOf(conflict);

    if (answer.kind === 'ANSWERED') {
      keep = answer.answer === ONIX_ACCESSIBILITY_KEEP_EXCEPTION ? 'EXCEPTION' : 'STANDARDS';
    } else {
      keep = 'UNDECIDED';
      (answer.kind === 'STALE' ? staleChoices : pendingChoices).push(conflict.key);
    }
  }

  /* The primary standard: WCAG only. */
  let standard: string | null | undefined = null;

  if (keep === 'EXCEPTION') {
    omit(primary, 'EXCEPTION_CHOSEN', conflict?.key ?? null);
  } else {
    standard = settle(pick('ACCESSIBILITY_PRIMARY_CHOICE_REQUIRED', primary), primary);
  }

  /* The additional standard: the type's own family, and only beside a primary standard. */
  let additional: string | null | undefined = null;

  omit(incompatible, 'INCOMPATIBLE_ADDITIONAL');
  if (incompatible.length > 0) {
    acknowledgements.push(
      ...typeFindings.filter(({ code }) => code === 'ACCESSIBILITY_ADDITIONAL_INCOMPATIBLE').map(({ key }) => key),
    );
  }

  if (keep === 'EXCEPTION') {
    omit(compatible, 'EXCEPTION_CHOSEN', conflict?.key ?? null);
  } else if (compatible.length > 0 && primary.length === 0) {
    omit(compatible, 'NO_PRIMARY_STANDARD');
    acknowledgements.push(
      ...typeFindings.filter(({ code }) => code === 'ACCESSIBILITY_ADDITIONAL_WITHOUT_PRIMARY').map(({ key }) => key),
    );
  } else if (compatible.length > 0 && standard === null) {
    // The publisher set no primary standard, and an additional one is never held without it.
    omit(compatible, 'NO_PRIMARY_STANDARD', findingOf('ACCESSIBILITY_PRIMARY_CHOICE_REQUIRED')?.key ?? null);
  } else if (compatible.length > 0) {
    const picked = pick('ACCESSIBILITY_ADDITIONAL_CHOICE_REQUIRED', compatible);

    additional = standard === undefined ? undefined : settle(picked, compatible);
  }

  /* The exception. */
  let exception: string | null | undefined = null;

  if (keep === 'STANDARDS') {
    omit(exceptions, 'STANDARDS_CHOSEN', conflict?.key ?? null);
  } else {
    exception = settle(pick('ACCESSIBILITY_EXCEPTION_CHOICE_REQUIRED', exceptions), exceptions);
  }

  /* The report URL: code 96 alone, independent of the rest. */
  const reportUrl = settle(pick('ACCESSIBILITY_REPORT_URL_CHOICE_REQUIRED', reportUrls), reportUrls);

  /* Unknown or limited accessibility beside a standard the Publication would keep needs its acknowledgement. */
  const status = findingOf('ACCESSIBILITY_STATUS_NOT_REPRESENTED');

  if (status !== undefined && keep !== 'EXCEPTION' && standard !== null) acknowledgements.push(status.key);

  const decided =
    keep !== 'UNDECIDED' &&
    standard !== undefined &&
    additional !== undefined &&
    exception !== undefined &&
    reportUrl !== undefined &&
    pendingChoices.length === 0 &&
    staleChoices.length === 0;
  const state: OnixPublicationAccessibilityState | null = decided
    ? {
        accessibilityStandard: (standard ?? null) as OnixPublicationAccessibilityState['accessibilityStandard'],
        accessibilityAdditionalStandard: (additional ??
          null) as OnixPublicationAccessibilityState['accessibilityAdditionalStandard'],
        accessibilityException: (exception ?? null) as OnixPublicationAccessibilityState['accessibilityException'],
        accessibilityReportUrl: reportUrl ?? null,
      }
    : null;
  // Never a state the database refuses: one that could not be held is no Publication, whatever was answered.
  const representable = state === null || isRepresentableOnixAccessibility(publicationType, state);

  return {
    scope: reduction.scope,
    resolved: gaps.length === 0 && representable ? state : null,
    sources,
    omitted,
    pendingChoices: unique(pendingChoices),
    staleChoices: unique(staleChoices),
    acknowledgements: unique(acknowledgements),
    gaps: representable ? gaps : [...gaps, `${productKey}|${publicationType}|UNREPRESENTABLE`],
    findingKeys,
  };
};
