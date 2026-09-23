import type { WorkId, WorkStatus, WorkType } from '@/src/entities/work/model/work.types';

import { WorkStatuses, WorkTypes } from '../../constants/work';
import {
  ONIX_COMPONENT_ACKNOWLEDGED,
  ONIX_COMPONENT_OMIT,
  type OnixAvItemIntent,
  type OnixChapterIntent,
  type OnixComponentDoi,
  type OnixComponentFact,
  type OnixComponentFactOwner,
  type OnixComponentFinding,
  type OnixComponentFindingCode,
  type OnixComponentHierarchy,
  type OnixComponentIntent,
  type OnixComponentMatter,
  type OnixComponentOrdinal,
  type OnixComponentPageRange,
  type OnixComponentPageRunFact,
  type OnixComponentPlan,
  type OnixComponentResolution,
  type OnixContainedWorkIntent,
  type OnixContainedWorkLifecycle,
  type OnixContentItemKind,
  type OnixGeneralAttributes,
  type OnixLevelSequence,
  type OnixPlanFindingOption,
  type OnixPlanFindingResolution,
  type OnixProductComponents,
  type OnixRetainedComponentFact,
  type OnixSourceLocation,
  type OnixSourcePlan,
  type OnixStatedIdentifier,
  type OnixUnsupportedComponentIntent,
} from '../../types/onixPlanning';
import type { ExtendedONIXMessageRoot, OnixText } from './interfaces';
import { getOnixText, selectCanonicalDoi, toOnixArray } from './onix';
import { isCompleteCalendarDate, type OnixDescriptivePlan, resolveOnixDescriptiveComponent } from './onixDescriptive';
import type { ProvenanceResolver } from './validation/worker/provenance';

/**
 * The canonical component and contained-Work planning of thoth-app#223 (APP-IMPORT-ONIX-REL-01A of #185), under the
 * approved ContentDetail decision (#179 5541336717) and #223 Specification Amendment 1 (5780784445).
 *
 * It runs after canonical source validation has permitted target planning, on the adapter value bridged from the final
 * normalised Reference XML with its Short-tag provenance, after #182 has classified every ContentItem. It reads nothing
 * else - no Thoth lookup, no clock, no network - and decides nothing about source validity, which the canonical validator
 * alone owns: a valid component Thoth cannot hold is a target loss or a publisher input here, never an invalid source.
 *
 * Every ContentItem is kept exactly as stated, at its own path. Only TextItemType 02, 03 and 04 are structural
 * BookChapters; 01 is a separate contained Work related `IsPartOf` its parent, whose WorkType and lifecycle are the
 * publisher's; an AVItem is an acknowledged loss; anything else is a gap. A relation ordinal is a flat positive
 * LevelSequenceNumber or the publisher's explicit input - never source order, never a ComponentNumber - a multi-level
 * position is never flattened by itself, and every PageRun is read, none first-wins. Titles, contributors, languages and
 * subjects stay the shared descriptive reducers' at the component's own scope (thoth-app#183), and every fact a later
 * stage owns is kept for it, unread.
 */

export type ReduceOnixComponentsOptions = {
  /** Maps canonical Reference paths back to the submitted source, for a Short-tag file. */
  readonly provenance?: ProvenanceResolver;
};

/* ------------------------------------------------------------------------------------------------ */
/* Codelists and target limits                                                                      */
/* ------------------------------------------------------------------------------------------------ */

/** List 42: the matter each structural chapter TextItemType is (rule 2). */
const MATTER_OF: Readonly<Record<string, OnixComponentMatter>> = { '02': 'FRONT', '03': 'BODY', '04': 'BACK' };

const MATTER_WORDS: Readonly<Record<OnixComponentMatter, string>> = { FRONT: 'front', BODY: 'body', BACK: 'back' };

/** List 43 06: a DOI. Only a TextItemIdentifier of this declared type is ever a component DOI (rule 11). */
const DOI_TEXT_ITEM_ID_TYPE = '06';

/** Thoth stores a relation ordinal and a page count in a PostgreSQL `integer`. */
const MAX_TARGET_INTEGER = 2_147_483_647;

const { BookSet, EditedBook, JournalIssue, Monograph, Textbook } = WorkTypes.enum;
const { Active, Cancelled, Forthcoming, PostponedIndefinitely, Superseded, Withdrawn } = WorkStatuses.enum;

/**
 * The WorkTypes a contained Work may be given (Amendment 1 section 1): the five non-chapter types. BookChapter stays the
 * structural mapping of TextItemType 02, 03 and 04 alone, and is never offered for a complete embedded Work.
 */
export const ONIX_CONTAINED_WORK_TYPES: readonly WorkType[] = [Monograph, EditedBook, Textbook, JournalIssue, BookSet];

/** The target statuses a contained Work may be given (Amendment 1 section 4): all six, none preselected. */
export const ONIX_CONTAINED_WORK_STATUSES: readonly WorkStatus[] = [
  Forthcoming,
  Active,
  Withdrawn,
  Superseded,
  PostponedIndefinitely,
  Cancelled,
];

/** The statuses Thoth only stores with a complete publication date. */
const PUBLISHED_STATUSES: ReadonlySet<WorkStatus> = new Set([Active, Withdrawn, Superseded]);
/** The statuses Thoth only stores with a complete withdrawal date, and the only ones that may hold one. */
const WITHDRAWN_STATUSES: ReadonlySet<WorkStatus> = new Set([Withdrawn, Superseded]);

/**
 * The component-scoped elements a later stage owns (#185 decomposition 5780552558), and the one whose rights reduction
 * already holds the plan for them (#211): kept whole here, never mapped, never moved to the parent Work.
 */
const RETAINED_ELEMENTS: Readonly<Record<string, { owner: OnixComponentFactOwner; ownerIssue: string }>> = {
  RelatedWork: { owner: 'APP-IMPORT-ONIX-REL-01B', ownerIssue: '#224' },
  RelatedProduct: { owner: 'APP-IMPORT-ONIX-REL-01B', ownerIssue: '#224' },
  TextContent: { owner: 'APP-IMPORT-ONIX-REL-01C', ownerIssue: '#225' },
  SupportingResource: { owner: 'APP-IMPORT-ONIX-REL-01C', ownerIssue: '#225' },
  CitedContent: { owner: 'APP-IMPORT-ONIX-REL-01D', ownerIssue: '#226' },
  EpubLicense: { owner: 'APP-IMPORT-ONIX-PUB-01', ownerIssue: '#184' },
  EpubUsageConstraint: { owner: 'APP-IMPORT-ONIX-PUB-01', ownerIssue: '#184' },
};

/**
 * ONIX 3.1 component publishing facts no approved decision reduces at component scope. A chapter or a contained Work
 * stating one cannot go ahead with it unread: taking the parent's in its place would misstate it.
 */
const UNREDUCED_ELEMENTS: readonly string[] = ['Publisher', 'CopyrightStatement', 'CopyrightStatementText'];

/* ------------------------------------------------------------------------------------------------ */
/* Reading the adapter                                                                              */
/* ------------------------------------------------------------------------------------------------ */

/** One element occurrence and its canonical path. */
type Occurrence = { readonly value: unknown; readonly path: string };

type Locate = (path: string) => OnixSourceLocation;

const isElement = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * Every occurrence of a named child, in source order, with its canonical path. `@5stones/onix` emits a single occurrence
 * as a value and a repeated one as an array; positions count same-named siblings from 1, as paths do, so a single and a
 * repeated composite normalise alike, and an empty element is an occurrence like any other.
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

/** An attribute exactly as the element states it, or null where it states none. */
const attributeOf = (occurrence: Occurrence, name: string): string | null => {
  const value = isElement(occurrence.value) ? occurrence.value[`@_${name}`] : undefined;

  return typeof value === 'string' ? value : null;
};

const generalAttributesOf = (occurrence: Occurrence): OnixGeneralAttributes => ({
  datestamp: attributeOf(occurrence, 'datestamp'),
  sourceName: attributeOf(occurrence, 'sourcename'),
  sourceType: attributeOf(occurrence, 'sourcetype'),
});

/** Serialises with object keys sorted, so two equal adapter values serialise alike whatever their key order. */
const canonicalJson = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;

  if (isElement(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(',')}}`;
  }

  return value === undefined ? 'null' : JSON.stringify(value);
};

/**
 * A short fingerprint of plain data (cyrb53), as the other canonical reductions key their findings: equal data always
 * gives the same fingerprint, so a key built from one depends on the file alone. It tells facts apart; it is never an
 * identity.
 */
const fingerprint = (value: unknown): string => {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
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

const unique = <T>(values: readonly T[]): T[] => [...new Set(values)];

/* ------------------------------------------------------------------------------------------------ */
/* Normalising one ContentItem                                                                      */
/* ------------------------------------------------------------------------------------------------ */

/** The canonical decimal spelling of a whole number: digits with no leading zero, the only one an input may take. */
const CANONICAL_POSITIVE_INTEGER = /^[1-9][0-9]*$/;

/**
 * A LevelSequenceNumber as stated, and what it is to a relation ordinal. Its lexical form is the pinned schemas'
 * `dt.MultiLevelNumber` (3.0 `\d+(\.\d+)*`, 3.1 without a zero at any level): one level is flat and is read as the whole
 * number it spells, more than one is a hierarchy, and zero - or a number no ordinal can hold - is no ordinal at all.
 */
const levelSequenceOf = (item: Occurrence, locate: Locate): OnixLevelSequence => {
  const [element] = children(item, 'LevelSequenceNumber');

  if (element === undefined) return { kind: 'ABSENT' };

  const raw = textOf(element);
  const location = locate(element.path);

  if (/^\d+$/.test(raw)) {
    const ordinal = Number(raw);

    if (ordinal === 0) return { ...location, kind: 'UNUSABLE', raw, reason: 'ZERO' };
    if (!Number.isSafeInteger(ordinal) || ordinal > MAX_TARGET_INTEGER) {
      return { ...location, kind: 'UNUSABLE', raw, reason: 'OUT_OF_RANGE' };
    }

    return { ...location, kind: 'FLAT', raw, ordinal };
  }

  if (/^\d+(\.\d+)+$/.test(raw)) return { ...location, kind: 'HIERARCHICAL', raw, levels: raw.split('.') };

  return { ...location, kind: 'UNUSABLE', raw, reason: 'NOT_A_NUMBER' };
};

/** An `xs:positiveInteger` literal as the whole number it is, or null where it is no such number. */
const positiveIntegerOf = (raw: string): number | null => {
  if (!/^\+?\d+$/.test(raw)) return null;

  const value = Number(raw.replace(/^\+/, ''));

  return Number.isSafeInteger(value) && value >= 1 ? value : null;
};

const identifiersOf = (
  item: Occurrence,
  itemElement: 'TextItem' | 'AVItem',
  locate: Locate,
): readonly OnixStatedIdentifier[] =>
  children(children(item, itemElement)[0], itemElement === 'TextItem' ? 'TextItemIdentifier' : 'AVItemIdentifier').map(
    (identifier) => ({
      ...locate(identifier.path),
      type: childText(identifier, itemElement === 'TextItem' ? 'TextItemIDType' : 'AVItemIDType') ?? '',
      typeName: childText(identifier, 'IDTypeName'),
      value: childText(identifier, 'IDValue') ?? '',
    }),
  );

/** The component DOI its type-06 identifiers state, read by declared scheme alone, and the values no DOI is read from. */
const doiOf = (
  identifiers: readonly OnixStatedIdentifier[],
): { readonly doi: OnixComponentDoi; readonly unusable: readonly OnixStatedIdentifier[] } => {
  const declared = identifiers.filter(({ type }) => type === DOI_TEXT_ITEM_ID_TYPE);
  const selection = selectCanonicalDoi(declared.map(({ value }) => value));
  const unusableValues = new Set(selection.unusable);
  const unusable = declared.filter(({ value }) => unusableValues.has(value.trim()));
  const usable = declared.filter(({ value }) => !unusableValues.has(value.trim()) && value.trim().length > 0);
  const locations = usable.map(({ path, sourcePath }) => ({ path, sourcePath }));

  switch (selection.kind) {
    case 'doi':
      return { doi: { kind: 'DOI', doi: selection.doi, locations }, unusable };
    case 'conflict':
      return { doi: { kind: 'CONFLICT', dois: selection.dois, locations }, unusable };
    default:
      return { doi: { kind: 'NONE' }, unusable };
  }
};

/** Every PageRun, in source order, exactly as stated. */
const pageRunsOf = (textItem: Occurrence | undefined, locate: Locate): OnixComponentPageRunFact[] =>
  children(textItem, 'PageRun').map((pageRun) => ({
    ...locate(pageRun.path),
    firstPage: childText(pageRun, 'FirstPageNumber') ?? '',
    lastPage: childText(pageRun, 'LastPageNumber'),
  }));

/**
 * The page ranges several PageRuns state, once each: two PageRuns naming the same pages are one range, stated twice.
 * Distinct ranges are never merged into one, however they abut or overlap (rule 12).
 */
const distinctRuns = (runs: readonly OnixComponentPageRunFact[]): OnixComponentPageRunFact[] =>
  runs.filter(
    (run, index) =>
      runs.findIndex(({ firstPage, lastPage }) => firstPage === run.firstPage && lastPage === run.lastPage) === index,
  );

const describeRun = ({ firstPage, lastPage }: Pick<OnixComponentPageRunFact, 'firstPage' | 'lastPage'>) =>
  lastPage === null ? firstPage : `${firstPage}–${lastPage}`;

const describeRecord = (index: number, recordReference: string | null) =>
  recordReference === null ? `product ${index}` : `product ${index} (${recordReference})`;

/* ------------------------------------------------------------------------------------------------ */
/* Findings                                                                                         */
/* ------------------------------------------------------------------------------------------------ */

type FindingInput = Omit<OnixComponentFinding, 'family' | 'key' | 'locations' | 'resolution' | 'detail'> & {
  /** Canonical paths of the facts the finding is about, in source order. */
  readonly paths: readonly string[];
  /** What tells this finding apart from another of the same code on the same Product. */
  readonly discriminator: string;
  readonly detail?: OnixComponentFinding['detail'];
  readonly resolution?: OnixComponentResolution;
};

const NONE = { kind: 'NONE' } as const;
const ACKNOWLEDGE = { kind: 'ACKNOWLEDGE' } as const;

/** Raises each finding once per key; the key depends on the file alone, so it is stable across resolutions. */
class ComponentFindings {
  private readonly byKey = new Map<string, OnixComponentFinding>();

  constructor(private readonly locate: Locate) {}

  add({ paths, discriminator, resolution = NONE, detail = {}, ...input }: FindingInput): OnixComponentFinding {
    const key = ['COMPONENT', input.code, input.productKey, discriminator].join('|');
    const existing = this.byKey.get(key);

    if (existing) return existing;

    const finding: OnixComponentFinding = {
      family: 'COMPONENT',
      key,
      ...input,
      detail,
      resolution,
      locations: unique(paths).map(this.locate),
    };

    this.byKey.set(key, finding);

    return finding;
  }

  all(): OnixComponentFinding[] {
    return [...this.byKey.values()];
  }
}

const workTypeOptions = (): OnixPlanFindingOption[] =>
  ONIX_CONTAINED_WORK_TYPES.map((type) => ({ key: type, label: type }));

const statusOptions = (): OnixPlanFindingOption[] =>
  ONIX_CONTAINED_WORK_STATUSES.map((status) => ({ key: status, label: status }));

/** The value an answer gives, when it is one the finding offers: never a default, never a value it does not name. */
export const isOfferedOnixComponentAnswer = (
  finding: { readonly resolution: OnixComponentResolution | OnixPlanFindingResolution },
  answer: string,
): boolean => {
  const { resolution } = finding;

  switch (resolution.kind) {
    case 'ACKNOWLEDGE':
      return answer === ONIX_COMPONENT_ACKNOWLEDGED;
    case 'CHOICE':
      return resolution.options.some(({ key }) => key === answer);
    case 'INPUT':
      if (resolution.input === 'DATE') return isCompleteCalendarDate(answer);

      return (
        resolution.input === 'ORDINAL' &&
        CANONICAL_POSITIVE_INTEGER.test(answer) &&
        Number(answer) <= MAX_TARGET_INTEGER
      );
    case 'NONE':
      return false;
  }
};

/** The answer a finding has, when the finding offers it; null while it has none, or has one it cannot use. */
const answerOf = (finding: OnixComponentFinding, choices: Readonly<Record<string, string>> | undefined) => {
  const answer = choices?.[finding.key];

  return answer !== undefined && isOfferedOnixComponentAnswer(finding, answer) ? answer : null;
};

/* ------------------------------------------------------------------------------------------------ */
/* The reduction                                                                                    */
/* ------------------------------------------------------------------------------------------------ */

/** The relation set a component's ordinal belongs to: chapters of the parent, or Works that are part of it. */
const relationSetOf = (kind: OnixContentItemKind): 'IS_CHILD_OF' | 'IS_PART_OF' | null =>
  kind === 'CHAPTER' ? 'IS_CHILD_OF' : kind === 'EMBEDDED_WORK' ? 'IS_PART_OF' : null;

/**
 * The canonical component reduction of one message: every ContentItem of every Product as stated, and every finding the
 * source alone establishes about it. Pure and deterministic: the same file always reduces to the same plan.
 */
export const reduceOnixComponents = (
  root: ExtendedONIXMessageRoot,
  sourcePlan: OnixSourcePlan,
  options: ReduceOnixComponentsOptions = {},
): OnixComponentPlan => {
  const locate: Locate = (path) => ({ path, sourcePath: options.provenance?.sourcePathOf(path) ?? path });
  const findings = new ComponentFindings(locate);
  const productValues = toOnixArray(root.ONIXMessage?.Product);
  const recordByKey = new Map(sourcePlan.records.map((record) => [record.recordKey, record]));
  const products: Record<string, OnixProductComponents> = {};

  sourcePlan.products
    .flatMap((node) => {
      const record = recordByKey.get(node.representativeRecordKey);

      return record === undefined || node.contentItems.length === 0 ? [] : [{ node, record }];
    })
    .sort((a, b) => a.record.index - b.record.index)
    .forEach(({ node, record }) => {
      const { productKey, groupKey } = node;
      const product: Occurrence = { value: productValues[record.index - 1], path: record.path };
      const occurrences = new Map(
        children(children(product, 'ContentDetail')[0], 'ContentItem').map((item) => [item.path, item]),
      );
      const productFindingKeys: string[] = [];

      const components = node.contentItems.map(({ path, kind, textItemType }, index): OnixComponentFact => {
        const item = occurrences.get(path) ?? { value: undefined, path };
        const position = index + 1;
        const describe = `content item ${position} of ${describeRecord(record.index, record.recordReference)}`;
        const binding = fingerprint(canonicalJson({ path, kind, value: item.value }));
        const componentKey = `${productKey}|${path}`;
        const findingKeys: string[] = [];
        const add = (input: Omit<FindingInput, 'productKey' | 'groupKey' | 'componentKey'>) => {
          const finding = findings.add({ ...input, productKey, groupKey, componentKey });

          findingKeys.push(finding.key);

          return finding;
        };
        // Every answer about the component is bound to all it states: a changed item at the same place is asked again.
        const bound = (suffix = '') => `${path}|${binding}${suffix}`;

        const textItem = children(item, 'TextItem')[0];
        const avItem = children(item, 'AVItem')[0];
        const levelSequence = levelSequenceOf(item, locate);
        const [typeNameElement] = children(item, 'ComponentTypeName');
        const [numberElement] = children(item, 'ComponentNumber');
        const componentTypeName =
          typeNameElement === undefined
            ? null
            : {
                ...locate(typeNameElement.path),
                value: textOf(typeNameElement),
                language: attributeOf(typeNameElement, 'language'),
              };
        const componentNumber =
          numberElement === undefined ? null : { ...locate(numberElement.path), value: textOf(numberElement) };
        const identifiers =
          kind === 'AV_ITEM' ? identifiersOf(item, 'AVItem', locate) : identifiersOf(item, 'TextItem', locate);
        const { doi, unusable } =
          kind === 'AV_ITEM' ? { doi: { kind: 'NONE' } as const, unusable: [] } : doiOf(identifiers);
        const pageRuns = pageRunsOf(textItem, locate);
        const [pagesElement] = children(textItem, 'NumberOfPages');
        const numberOfPages =
          pagesElement === undefined ? null : { ...locate(pagesElement.path), value: textOf(pagesElement) };
        const statedPageCount = numberOfPages === null ? null : positiveIntegerOf(numberOfPages.value);
        const pageCount = statedPageCount !== null && statedPageCount <= MAX_TARGET_INTEGER ? statedPageCount : null;
        const retained = Object.keys(RETAINED_ELEMENTS).flatMap((element) =>
          children(item, element).map(
            (occurrence): OnixRetainedComponentFact => ({
              ...locate(occurrence.path),
              element,
              ...RETAINED_ELEMENTS[element],
            }),
          ),
        );
        const unreduced = UNREDUCED_ELEMENTS.flatMap((element) =>
          children(item, element).map((occurrence) => ({ element, path: occurrence.path })),
        );
        const planned = kind === 'CHAPTER' || kind === 'EMBEDDED_WORK';
        const matter = kind === 'CHAPTER' && textItemType !== null ? MATTER_OF[textItemType] : null;

        /* What each kind is, and the loss or gap that says so (rules 1-4). */
        if (kind === 'CHAPTER') {
          add({
            code: 'COMPONENT_MATTER_NOT_REPRESENTED',
            classification: 'SUPPORTED_NORMALIZED',
            blocking: false,
            paths: [children(textItem, 'TextItemType')[0]?.path ?? path],
            discriminator: bound(),
            detail: { textItemType: textItemType ?? '', matter: matter ?? '' },
            message: `${describe} is ${MATTER_WORDS[matter as OnixComponentMatter]} matter (TextItemType ${textItemType}); it is imported as a book chapter, and Thoth's chapter does not record that it was ${MATTER_WORDS[matter as OnixComponentMatter]} matter`,
          });
        }

        if (kind === 'AV_ITEM') {
          add({
            code: 'COMPONENT_AV_ITEM_UNREPRESENTABLE',
            classification: 'TARGET_UNREPRESENTABLE',
            blocking: true,
            paths: [path],
            discriminator: bound(),
            detail: {
              avItemType: childText(avItem, 'AVItemType') ?? '',
              identifiers: identifiers.map(({ type, value }) => `${type}: ${value}`),
            },
            resolution: ACKNOWLEDGE,
            message: `${describe} is an audiovisual item (AVItemType ${childText(avItem, 'AVItemType') ?? 'not given'}), which is never a written chapter and which Thoth cannot record; importing the product omits it, and everything it states, while the rest of the product is planned as usual`,
          });
        }

        if (kind === 'UNSUPPORTED') {
          add({
            code: 'COMPONENT_FORM_UNSUPPORTED',
            classification: 'PREFLIGHT_GAP',
            blocking: true,
            paths: [path],
            discriminator: bound(),
            detail: { textItemType: textItemType ?? '' },
            message: `${describe} is neither a text item of an approved type (TextItemType ${textItemType ?? 'not given'}) nor an audiovisual item, which canonical validation should not have admitted; it is never read as a chapter or a contained Work, so the import cannot go ahead with it`,
          });
        }

        if (planned) {
          /* Source metadata Thoth does not record, and never an ordinal (rules 8-9). */
          if (componentTypeName !== null || componentNumber !== null) {
            add({
              code: 'COMPONENT_LABEL_NOT_REPRESENTED',
              classification: 'TARGET_UNREPRESENTABLE',
              blocking: false,
              paths: [componentTypeName?.path, componentNumber?.path].filter((value): value is string => !!value),
              discriminator: bound(),
              detail: {
                componentTypeName: componentTypeName?.value ?? '',
                componentNumber: componentNumber?.value ?? '',
              },
              message: `${describe} is labelled ${[
                componentTypeName === null ? null : `"${componentTypeName.value}"`,
                componentNumber === null ? null : `number "${componentNumber.value}"`,
              ]
                .filter((part) => part !== null)
                .join(
                  ' ',
                )}; Thoth does not record a component's type name or number, and neither is ever used as its position`,
            });
          }

          const otherIdentifiers = identifiers.filter(({ type }) => type !== DOI_TEXT_ITEM_ID_TYPE);

          if (otherIdentifiers.length > 0) {
            add({
              code: 'COMPONENT_IDENTIFIER_NOT_REPRESENTED',
              classification: 'TARGET_UNREPRESENTABLE',
              blocking: false,
              paths: otherIdentifiers.map(({ path: identifierPath }) => identifierPath),
              discriminator: bound(),
              detail: {
                identifiers: otherIdentifiers.map(
                  ({ type, typeName, value }) => `${type}${typeName === null ? '' : ` (${typeName})`}: ${value}`,
                ),
              },
              message: `${describe} states identifiers of types Thoth does not record for it (TextItemIDType ${unique(otherIdentifiers.map(({ type }) => type)).join(', ')}); they were not imported, and none is ever read as a DOI`,
            });
          }

          if (unusable.length > 0) {
            add({
              code: 'COMPONENT_DOI_UNUSABLE',
              classification: 'TARGET_UNREPRESENTABLE',
              blocking: false,
              paths: unusable.map(({ path: identifierPath }) => identifierPath),
              discriminator: bound(),
              detail: { values: unusable.map(({ value }) => value) },
              message: `${describe} gives ${unusable.map(({ value }) => `"${value}"`).join(', ')} as a DOI (TextItemIDType 06), which Thoth cannot read as one, so it was not imported`,
            });
          }

          if (doi.kind === 'CONFLICT') {
            add({
              code: 'COMPONENT_DOI_CONFLICT',
              classification: 'TARGET_UNREPRESENTABLE',
              blocking: false,
              paths: doi.locations.map(({ path: identifierPath }) => identifierPath),
              discriminator: bound(),
              detail: { dois: doi.dois },
              message: `${describe} gives more than one distinct DOI (${doi.dois.join(', ')}); Thoth holds one, and none is chosen, so it is imported without a DOI`,
            });
          }

          /* Its relation ordinal: a flat positive LevelSequenceNumber, or the publisher's (rules 5-7; Amendment 1 section 5). */
          if (levelSequence.kind === 'HIERARCHICAL') {
            add({
              code: 'COMPONENT_HIERARCHY_UNREPRESENTABLE',
              classification: 'TARGET_UNREPRESENTABLE',
              blocking: true,
              paths: [levelSequence.path],
              discriminator: bound(),
              detail: { levelSequenceNumber: levelSequence.raw, levels: levelSequence.levels },
              resolution: ACKNOWLEDGE,
              message: `${describe} sits at level ${levelSequence.levels.length} of a hierarchy (LevelSequenceNumber ${levelSequence.raw}), which Thoth cannot represent: its components hang directly off their Work. It is never flattened by itself; acknowledge that the hierarchy is not imported, and give its position among the Work's ${kind === 'CHAPTER' ? 'chapters' : 'contained Works'}`,
            });
          }

          if (levelSequence.kind !== 'FLAT') {
            add({
              code: 'COMPONENT_ORDINAL_REQUIRED',
              classification: 'TARGET_INPUT_REQUIRED',
              blocking: true,
              paths: [levelSequence.kind === 'ABSENT' ? path : levelSequence.path],
              discriminator: bound(),
              detail: {
                levelSequenceNumber: levelSequence.kind === 'ABSENT' ? '' : levelSequence.raw,
                reason: levelSequence.kind === 'UNUSABLE' ? levelSequence.reason : levelSequence.kind,
                relation: relationSetOf(kind) ?? '',
              },
              resolution: { kind: 'INPUT', input: 'ORDINAL' },
              message: `${describe} ${
                levelSequence.kind === 'ABSENT'
                  ? 'states no LevelSequenceNumber'
                  : levelSequence.kind === 'HIERARCHICAL'
                    ? `states the multi-level position ${levelSequence.raw}`
                    : `states LevelSequenceNumber ${levelSequence.raw}, which is no position Thoth can hold`
              }, so its position among the Work's ${kind === 'CHAPTER' ? 'chapters' : 'contained Works'} is not known; enter it as a whole number of 1 or more. It is never taken from its place in the file or from its ComponentNumber`,
            });
          }

          /* Pages: every PageRun, none first-wins (rule 12); NumberOfPages exactly (rule 13). */
          const runs = distinctRuns(pageRuns);

          if (kind === 'CHAPTER' && runs.length > 1) {
            add({
              code: 'COMPONENT_PAGE_RUNS_CHOICE_REQUIRED',
              classification: 'TARGET_INPUT_REQUIRED',
              blocking: true,
              paths: pageRuns.map(({ path: runPath }) => runPath),
              discriminator: bound(),
              detail: { pageRuns: runs.map(describeRun) },
              resolution: {
                kind: 'CHOICE',
                options: [
                  ...runs.map((run) => ({ key: run.path, label: describeRun(run) })),
                  { key: ONIX_COMPONENT_OMIT, label: runs.map(describeRun).join(', ') },
                ],
              },
              message: `${describe} states ${runs.length} separate page ranges (${runs.map(describeRun).join(', ')}), and a Thoth chapter holds one; they are never joined into one range. Choose the range Thoth records, or import none: the others are not imported`,
            });
          }

          if (kind === 'EMBEDDED_WORK' && pageRuns.length > 0) {
            add({
              code: 'COMPONENT_PAGE_RANGE_UNREPRESENTABLE',
              classification: 'TARGET_UNREPRESENTABLE',
              blocking: true,
              paths: pageRuns.map(({ path: runPath }) => runPath),
              discriminator: bound(),
              detail: { pageRuns: runs.map(describeRun) },
              resolution: ACKNOWLEDGE,
              message: `${describe} states its pages in the product (${runs.map(describeRun).join(', ')}); Thoth records a page range only for a book chapter, so the contained Work cannot hold it. Acknowledge that it is not imported`,
            });
          }

          if (numberOfPages !== null && statedPageCount === null) {
            add({
              code: 'COMPONENT_SHAPE_UNEXPECTED',
              classification: 'PREFLIGHT_GAP',
              blocking: true,
              paths: [numberOfPages.path],
              discriminator: bound(),
              detail: { numberOfPages: numberOfPages.value },
              message: `NumberOfPages "${numberOfPages.value}" of ${describe} is no whole number of pages, which canonical validation should not have admitted; no page count is read from it, so the import cannot go ahead with it`,
            });
          } else if (numberOfPages !== null && pageCount === null) {
            add({
              code: 'COMPONENT_PAGE_COUNT_UNREPRESENTABLE',
              classification: 'TARGET_UNREPRESENTABLE',
              blocking: true,
              paths: [numberOfPages.path],
              discriminator: bound(),
              detail: { numberOfPages: numberOfPages.value },
              resolution: ACKNOWLEDGE,
              message: `NumberOfPages ${numberOfPages.value} of ${describe} is more pages than Thoth's page count can hold; acknowledge that it is imported without a page count`,
            });
          }

          if (unreduced.length > 0) {
            add({
              code: 'COMPONENT_FACT_UNREDUCED',
              classification: 'PREFLIGHT_GAP',
              blocking: true,
              paths: unreduced.map(({ path: unreducedPath }) => unreducedPath),
              discriminator: bound(),
              detail: { elements: unique(unreduced.map(({ element }) => element)) },
              message: `${describe} states its own publisher or copyright, which no approved decision reduces for a component, and which its Work's would misstate; the import cannot go ahead with it unread`,
            });
          }
        }

        /* A contained Work: its own WorkType and lifecycle, its parent's imprint, a planned first edition (Amendment 1). */
        if (kind === 'EMBEDDED_WORK') {
          add({
            code: 'CONTAINED_WORK_TYPE_REQUIRED',
            classification: 'TARGET_INPUT_REQUIRED',
            blocking: true,
            paths: [path],
            discriminator: bound(),
            resolution: { kind: 'CHOICE', options: workTypeOptions() },
            message: `${describe} is a complete work embedded in the product (TextItemType 01), planned as a Work of its own that is part of the product's Work. ONIX does not say which kind of Work it is, and it never takes its parent's WorkType or the file's; choose its WorkType`,
          });
          add({
            code: 'CONTAINED_WORK_STATUS_REQUIRED',
            classification: 'TARGET_INPUT_REQUIRED',
            blocking: true,
            paths: [path],
            discriminator: bound(),
            resolution: { kind: 'CHOICE', options: statusOptions() },
            message: `${describe} is planned as a Work of its own, whose publishing status ONIX does not state for it and which never takes its parent's status or dates; choose its status`,
          });
          add({
            code: 'CONTAINED_WORK_IMPRINT_INHERITED',
            classification: 'SUPPORTED_NORMALIZED',
            blocking: false,
            paths: [path],
            discriminator: bound(),
            message: `${describe} is planned in the imprint of the product's Work, which it is part of; no imprint of its own is looked up`,
          });
          add({
            code: 'CONTAINED_WORK_EDITION_NORMALISED',
            classification: 'SUPPORTED_NORMALIZED',
            blocking: false,
            paths: [path],
            discriminator: bound(),
            detail: { edition: 1 },
            message: `${describe} states no edition of its own, so it is planned as a first edition`,
          });
          add({
            code: 'CONTAINED_WORK_EXECUTION_DEFERRED',
            classification: 'EXECUTION_DEFERRED',
            blocking: true,
            paths: [path],
            discriminator: bound(),
            message: `${describe} is planned as a Work of its own that is part of the product's Work, but this import cannot yet create a contained Work or its IsPartOf relation; the import cannot go ahead while it holds one`,
          });
        }

        return {
          ...locate(path),
          componentKey,
          productKey,
          groupKey,
          position,
          kind,
          textItemType: kind === 'AV_ITEM' ? null : textItemType,
          avItemType: kind === 'AV_ITEM' ? childText(avItem, 'AVItemType') : null,
          matter,
          attributes: generalAttributesOf(item),
          levelSequence,
          componentTypeName,
          componentNumber,
          identifiers,
          doi,
          pageRuns,
          numberOfPages,
          pageCount,
          descriptivePath: planned ? path : null,
          retained,
          binding,
          findingKeys,
        };
      });

      /* Two components of one relation set stating the same flat ordinal: never ordered between (Amendment 1 section 5). */
      (['IS_CHILD_OF', 'IS_PART_OF'] as const).forEach((relation) => {
        const byOrdinal = new Map<number, OnixComponentFact[]>();

        components
          .filter(({ kind }) => relationSetOf(kind) === relation)
          .forEach((component) => {
            if (component.levelSequence.kind !== 'FLAT') return;

            const { ordinal } = component.levelSequence;

            byOrdinal.set(ordinal, [...(byOrdinal.get(ordinal) ?? []), component]);
          });

        byOrdinal.forEach((sharing, ordinal) => {
          if (sharing.length < 2) return;

          const finding = findings.add({
            code: 'COMPONENT_ORDINAL_DUPLICATE',
            classification: 'SOURCE_CONFLICT',
            blocking: true,
            productKey,
            groupKey,
            componentKey: null,
            paths: sharing.map(({ levelSequence }) => (levelSequence.kind === 'FLAT' ? levelSequence.path : '')),
            discriminator: `${relation}|${ordinal}|${fingerprint(sharing.map(({ path, binding }) => [path, binding]))}`,
            detail: { relation, ordinal, components: sharing.map(({ path }) => path) },
            message: `${sharing.length} ${relation === 'IS_CHILD_OF' ? 'chapters' : 'contained Works'} of ${describeRecord(record.index, record.recordReference)} (content items ${sharing.map(({ position }) => position).join(', ')}) all state LevelSequenceNumber ${ordinal}; a Work holds each position once, and none is chosen by its place in the file, so the file has to say which comes where`,
          });

          productFindingKeys.push(finding.key);
        });
      });

      products[productKey] = {
        productKey,
        groupKey,
        components,
        findingKeys: unique([...components.flatMap(({ findingKeys }) => findingKeys), ...productFindingKeys]),
      };
    });

  return { products, findings: findings.all() };
};

/* ------------------------------------------------------------------------------------------------ */
/* One Work's components, with the publisher's answers                                              */
/* ------------------------------------------------------------------------------------------------ */

export type ResolveOnixComponentsOptions = {
  readonly groupKey: string;
  /** The Product whose components the Work is planned with: its group's representative, the first in file order. */
  readonly productKey: string;
  readonly choices: Readonly<Record<string, string>> | undefined;
  /** The Work the components are planned under: the group's new Work, and the imprint it is created in when known. */
  readonly parent: { readonly plannedWorkId: WorkId | null; readonly imprintId: string | null };
  /** The candidate chapter Work the adapter built for each chapter component, by its canonical path. */
  readonly chapterWorkIds: Readonly<Record<string, WorkId>>;
  /**
   * The descriptive reductions of the same source, which a contained Work's own titles, languages and subjects are
   * resolved from (thoth-app#183). Without them a contained Work's descriptive values are left unresolved.
   */
  readonly descriptive?: OnixDescriptivePlan;
  /**
   * Which kinds this resolution plans: every kind, or only the chapters - for a caller that gave no component reduction,
   * whose other components stand as the gap they are instead (thoth-app#223).
   */
  readonly kinds?: 'ALL' | 'CHAPTERS';
};

export type OnixResolvedComponents = {
  /** What each planned component becomes, in source order. */
  readonly intents: readonly OnixComponentIntent[];
  /** The findings only the answers raise - required dates, invalid date orders, collisions - in the order raised. */
  readonly raised: readonly OnixComponentFinding[];
  /** Every component finding that applies to the planned components, the source's and the answers', once each. */
  readonly findingKeys: readonly string[];
  /** Blocking findings still unanswered, or answered with a value the plan cannot use, in a stable order. */
  readonly pendingFindingKeys: readonly string[];
};

const planIndexes = new WeakMap<OnixComponentPlan, ReadonlyMap<string, OnixComponentFinding>>();

/** A plan's findings by key, built once per plan: resolution runs again for every decision. */
const findingsByKeyOf = (plan: OnixComponentPlan): ReadonlyMap<string, OnixComponentFinding> => {
  const cached = planIndexes.get(plan);

  if (cached !== undefined) return cached;

  const index = new Map(plan.findings.map((finding) => [finding.key, finding]));

  planIndexes.set(plan, index);

  return index;
};

/** Every finding the reduction raised about one component, by code. */
const ownFinding = (
  component: OnixComponentFact,
  byKey: ReadonlyMap<string, OnixComponentFinding>,
  code: OnixComponentFindingCode,
): OnixComponentFinding | undefined =>
  component.findingKeys.map((key) => byKey.get(key)).find((finding) => finding?.code === code);

/**
 * A structural ordinal as the plan takes it: the source's flat LevelSequenceNumber, or the whole number the publisher
 * entered where the source gives none it can use. Never source order, never a ComponentNumber.
 */
const ordinalOf = (
  component: OnixComponentFact,
  byKey: ReadonlyMap<string, OnixComponentFinding>,
  choices: ResolveOnixComponentsOptions['choices'],
): OnixComponentOrdinal => {
  const { levelSequence } = component;

  if (levelSequence.kind === 'FLAT') {
    return {
      status: 'RESOLVED',
      ordinal: levelSequence.ordinal,
      basis: 'LEVEL_SEQUENCE_NUMBER',
      findingKey: null,
      locations: [{ path: levelSequence.path, sourcePath: levelSequence.sourcePath }],
    };
  }

  const question = ownFinding(component, byKey, 'COMPONENT_ORDINAL_REQUIRED');
  const answer = question === undefined ? null : answerOf(question, choices);

  return question === undefined || answer === null
    ? { status: 'UNRESOLVED' }
    : {
        status: 'RESOLVED',
        ordinal: Number(answer),
        basis: 'PUBLISHER_INPUT',
        findingKey: question.key,
        locations: [],
      };
};

/** A chapter's page range: none, the one range its PageRuns state, or the one the publisher chose among several. */
const pageRangeOf = (
  component: OnixComponentFact,
  byKey: ReadonlyMap<string, OnixComponentFinding>,
  choices: ResolveOnixComponentsOptions['choices'],
): OnixComponentPageRange => {
  const runs = distinctRuns(component.pageRuns);

  if (runs.length === 0) return { status: 'NONE' };

  if (runs.length === 1) {
    return {
      status: 'RESOLVED',
      firstPage: runs[0].firstPage,
      lastPage: runs[0].lastPage ?? '',
      basis: 'PAGE_RUN',
      findingKey: null,
      locations: component.pageRuns.map(({ path, sourcePath }) => ({ path, sourcePath })),
    };
  }

  const question = ownFinding(component, byKey, 'COMPONENT_PAGE_RUNS_CHOICE_REQUIRED') as OnixComponentFinding;
  const answer = answerOf(question, choices);
  const chosen = runs.find(({ path }) => path === answer);

  if (answer === null) return { status: 'UNRESOLVED', findingKey: question.key };
  if (chosen === undefined) return { status: 'OMITTED', findingKey: question.key };

  return {
    status: 'RESOLVED',
    firstPage: chosen.firstPage,
    lastPage: chosen.lastPage ?? '',
    basis: 'PUBLISHER_CHOICE',
    findingKey: question.key,
    locations: [{ path: chosen.path, sourcePath: chosen.sourcePath }],
  };
};

/**
 * What one Work's components come to with the publisher's answers (thoth-app#223): each chapter with its ordinal, page
 * range and DOI, each contained Work with its WorkType, imprint, edition, lifecycle and IsPartOf ordinal, each AVItem's
 * acknowledged loss, and every finding that still holds the Work back. Nothing is taken by source order, from a
 * ComponentNumber, from the parent's WorkType or lifecycle, or by default.
 */
export const resolveOnixComponents = (
  plan: OnixComponentPlan,
  options: ResolveOnixComponentsOptions,
): OnixResolvedComponents => {
  const { groupKey, productKey, choices, parent, chapterWorkIds, descriptive, kinds = 'ALL' } = options;
  const reduced = plan.products[productKey];

  if (reduced === undefined) return { intents: [], raised: [], findingKeys: [], pendingFindingKeys: [] };

  const byKey = findingsByKeyOf(plan);
  const components = reduced.components.filter(({ kind }) => kinds === 'ALL' || kind === 'CHAPTER');
  const sourcePathOf = new Map(components.map(({ path, sourcePath }) => [path, sourcePath]));
  const raisedFindings = new ComponentFindings((path) => ({ path, sourcePath: sourcePathOf.get(path) ?? path }));
  const applicable: string[] = [];
  const pending: string[] = [];
  const applicableByComponent = new Map<string, string[]>();
  const pendingByComponent = new Map<string, string[]>();

  /** Records that a finding applies to a component, and whether it still holds it back. */
  const holds = (componentKey: string, finding: OnixComponentFinding) => {
    const blocked = finding.blocking && answerOf(finding, choices) === null;

    if (!applicable.includes(finding.key)) applicable.push(finding.key);
    if (blocked && !pending.includes(finding.key)) pending.push(finding.key);

    applicableByComponent.set(componentKey, unique([...(applicableByComponent.get(componentKey) ?? []), finding.key]));

    if (blocked) {
      pendingByComponent.set(componentKey, unique([...(pendingByComponent.get(componentKey) ?? []), finding.key]));
    }
  };
  const raise = (input: Omit<FindingInput, 'productKey' | 'groupKey'>) =>
    raisedFindings.add({ ...input, productKey, groupKey });

  components.forEach((component) =>
    component.findingKeys.forEach((key) => {
      const finding = byKey.get(key);

      if (finding !== undefined) holds(component.componentKey, finding);
    }),
  );

  // A duplicate the source states holds every component it names.
  reduced.findingKeys
    .map((key) => byKey.get(key))
    .forEach((finding) => {
      if (finding?.code !== 'COMPONENT_ORDINAL_DUPLICATE') return;

      const named = finding.detail.components as readonly string[];

      components.filter(({ path }) => named.includes(path)).forEach(({ componentKey }) => holds(componentKey, finding));
    });

  const ordinals = new Map(
    components.map((component) => [component.componentKey, ordinalOf(component, byKey, choices)]),
  );
  const resolvedOrdinal = ({ componentKey }: OnixComponentFact): number | null => {
    const ordinal = ordinals.get(componentKey);

    return ordinal?.status === 'RESOLVED' ? ordinal.ordinal : null;
  };

  /* A position the publisher entered that another component of the same relation set also takes. */
  (['CHAPTER', 'EMBEDDED_WORK'] as const).forEach((kind) => {
    const relation = relationSetOf(kind) as 'IS_CHILD_OF' | 'IS_PART_OF';
    const byOrdinal = new Map<number, OnixComponentFact[]>();

    components
      .filter((component) => component.kind === kind)
      .forEach((component) => {
        const ordinal = resolvedOrdinal(component);

        if (ordinal !== null) byOrdinal.set(ordinal, [...(byOrdinal.get(ordinal) ?? []), component]);
      });

    byOrdinal.forEach((sharing, ordinal) => {
      // The source's own duplicates are the source's to correct, and already hold every component they name.
      if (sharing.length < 2 || sharing.every(({ levelSequence }) => levelSequence.kind === 'FLAT')) return;

      const finding = raise({
        code: 'COMPONENT_ORDINAL_COLLISION',
        classification: 'TARGET_INPUT_REQUIRED',
        blocking: true,
        componentKey: null,
        paths: sharing.map(({ path }) => path),
        discriminator: `${relation}|${ordinal}|${fingerprint(sharing.map(({ path, binding }) => [path, binding]))}`,
        detail: { relation, ordinal, components: sharing.map(({ path }) => path) },
        message: `Position ${ordinal} is taken by ${sharing.length} ${kind === 'CHAPTER' ? 'chapters' : 'contained Works'} (content items ${sharing.map(({ position }) => position).join(', ')}), at least one of them by a position you entered; a Work holds each position once, so give each a different one`,
      });

      sharing.forEach(({ componentKey }) => holds(componentKey, finding));
    });
  });

  /*
   * The chapters' ordinals as the current executor creates them: it numbers a Work's chapters 1 to N in plan order, and
   * the plan keeps them in the file's order, so it creates them truthfully only where their ordinals, read in the file's
   * order, are exactly 1 to N. Any other sequence - a gap, or the right positions in another order - is planned exactly
   * but cannot be created truthfully yet (#187), and is never reordered to fit.
   */
  const chapters = components.filter(({ kind }) => kind === 'CHAPTER');
  const chapterOrdinals = chapters.map(resolvedOrdinal);

  if (
    chapters.length > 0 &&
    chapterOrdinals.every((ordinal) => ordinal !== null) &&
    new Set(chapterOrdinals).size === chapters.length
  ) {
    if (chapterOrdinals.some((ordinal, index) => ordinal !== index + 1)) {
      const finding = raise({
        code: 'CHAPTER_ORDINAL_EXECUTION_DEFERRED',
        classification: 'EXECUTION_DEFERRED',
        blocking: true,
        componentKey: null,
        paths: chapters.map(({ path }) => path),
        discriminator: `IS_CHILD_OF|${fingerprint(chapters.map((chapter) => [chapter.path, chapter.binding, resolvedOrdinal(chapter)]))}`,
        detail: {
          relation: 'IS_CHILD_OF',
          ordinals: chapterOrdinals.map(String),
          components: chapters.map(({ path }) => path),
        },
        message: `In the order the file lists them, the chapters of this Work take positions ${chapterOrdinals.join(', ')}. They are planned exactly as stated, but this import can only create a Work's chapters at positions 1 to ${chapters.length} in the order the file lists them, so it cannot go ahead until chapters can be created where they belong`,
      });

      chapters.forEach(({ componentKey }) => holds(componentKey, finding));
    }
  }

  /* A contained Work's lifecycle: its own status, and the complete dates that status needs, as the publisher gives them. */
  const lifecycleOf = (component: OnixComponentFact): OnixContainedWorkLifecycle => {
    const { componentKey } = component;
    const describe = `content item ${component.position}`;
    const statusFinding = ownFinding(component, byKey, 'CONTAINED_WORK_STATUS_REQUIRED') as OnixComponentFinding;
    const status = answerOf(statusFinding, choices) as WorkStatus | null;
    const dateFindingKeys: string[] = [];
    const dateOf = (role: 'PUBLICATION' | 'WITHDRAWAL') => {
      const question = raise({
        code: 'CONTAINED_WORK_DATE_REQUIRED',
        classification: 'TARGET_INPUT_REQUIRED',
        blocking: true,
        componentKey,
        paths: [component.path],
        // One question per date: a date the publisher gives is the contained Work's, whichever status needs it.
        discriminator: `${component.path}|${component.binding}|${role}`,
        detail: { status: status ?? '', role },
        resolution: { kind: 'INPUT', input: 'DATE' },
        message: `The contained Work of ${describe} has status ${status}, which Thoth only stores with a complete ${role === 'PUBLICATION' ? 'publication' : 'withdrawal'} date; ONIX gives none for it and none is ever taken from its parent, so enter the date`,
      });

      holds(componentKey, question);
      dateFindingKeys.push(question.key);

      return answerOf(question, choices);
    };

    if (status === null) {
      return {
        status,
        statusFindingKey: statusFinding.key,
        publicationDate: null,
        withdrawnDate: null,
        dateFindingKeys,
        replacement: 'NOT_REQUIRED',
      };
    }

    const publicationDate = PUBLISHED_STATUSES.has(status) ? dateOf('PUBLICATION') : null;
    const withdrawnDate = WITHDRAWN_STATUSES.has(status) ? dateOf('WITHDRAWAL') : null;

    if (publicationDate !== null && withdrawnDate !== null && withdrawnDate <= publicationDate) {
      holds(
        componentKey,
        raise({
          code: 'CONTAINED_WORK_DATE_ORDER_INVALID',
          classification: 'TARGET_INPUT_REQUIRED',
          blocking: true,
          componentKey,
          paths: [component.path],
          discriminator: `${component.path}|${component.binding}|${publicationDate}|${withdrawnDate}`,
          detail: { publicationDate, withdrawnDate },
          message: `The contained Work of ${describe} is withdrawn on ${withdrawnDate}, which is not after its publication on ${publicationDate}; Thoth requires a withdrawal strictly after publication`,
        }),
      );
    }

    // Superseded needs the exact Work that replaces it, which only the relation stage can establish: never invented here.
    if (status === Superseded) {
      holds(
        componentKey,
        raise({
          code: 'CONTAINED_WORK_REPLACEMENT_UNRESOLVED',
          classification: 'TARGET_INPUT_REQUIRED',
          blocking: true,
          componentKey,
          paths: [component.path],
          discriminator: `${component.path}|${component.binding}`,
          detail: { status, owner: 'APP-IMPORT-ONIX-REL-01B', ownerIssue: '#224' },
          message: `The contained Work of ${describe} is to be Superseded, which Thoth holds only with the exact Work that replaces it; no replacement relation evidence is available to this stage (#224) and none is ever invented, so it cannot be planned as Superseded yet`,
        }),
      );
    }

    return {
      status,
      statusFindingKey: statusFinding.key,
      publicationDate,
      withdrawnDate,
      dateFindingKeys,
      replacement: status === Superseded ? 'UNRESOLVED' : 'NOT_REQUIRED',
    };
  };

  const lifecycles = new Map(
    components.flatMap((component) =>
      component.kind === 'EMBEDDED_WORK' ? [[component.componentKey, lifecycleOf(component)] as const] : [],
    ),
  );

  /* A chapter of an adapted Work is created from the candidate chapter Work the adapter built for it, or not at all. */
  if (parent.plannedWorkId !== null) {
    chapters
      .filter(({ path }) => chapterWorkIds[path] === undefined)
      .forEach((chapter) =>
        holds(
          chapter.componentKey,
          raise({
            code: 'CHAPTER_CANDIDATE_MISSING',
            classification: 'PREFLIGHT_GAP',
            blocking: true,
            componentKey: chapter.componentKey,
            paths: [chapter.path],
            discriminator: `${chapter.path}|${chapter.binding}`,
            message: `No candidate chapter Work was built for content item ${chapter.position}, so it cannot be created; it is never left out of the Work silently`,
          }),
        ),
      );
  }

  const intents = components.map((component): OnixComponentIntent => {
    const { componentKey, levelSequence } = component;
    const hierarchyFinding = ownFinding(component, byKey, 'COMPONENT_HIERARCHY_UNREPRESENTABLE');
    const hierarchy: OnixComponentHierarchy | null =
      levelSequence.kind !== 'HIERARCHICAL' || hierarchyFinding === undefined
        ? null
        : {
            path: levelSequence.path,
            sourcePath: levelSequence.sourcePath,
            raw: levelSequence.raw,
            levels: levelSequence.levels,
            findingKey: hierarchyFinding.key,
            acknowledged: answerOf(hierarchyFinding, choices) !== null,
          };
    const ordinal = ordinals.get(componentKey) as OnixComponentOrdinal;
    const doi = component.doi.kind === 'DOI' ? component.doi.doi : null;
    const findingKeys = applicableByComponent.get(componentKey) ?? [];
    const pendingFindingKeys = pendingByComponent.get(componentKey) ?? [];
    const base = () => ({
      path: component.path,
      sourcePath: component.sourcePath,
      componentKey,
      productKey,
      groupKey,
      position: component.position,
      parent: { groupKey, plannedWorkId: parent.plannedWorkId },
      findingKeys,
      pendingFindingKeys,
    });

    switch (component.kind) {
      case 'CHAPTER': {
        const pages = pageRangeOf(component, byKey, choices);
        const intent: OnixChapterIntent = {
          ...base(),
          kind: 'BOOK_CHAPTER',
          workType: { type: 'BOOK_CHAPTER', provenance: 'STRUCTURAL_RULE' },
          relation: 'IS_CHILD_OF',
          matter: component.matter as OnixComponentMatter,
          chapterWorkId: chapterWorkIds[component.path] ?? null,
          ordinal,
          hierarchy,
          doi,
          pages,
          pageCount: component.pageCount,
          inherited: {
            basis: 'PARENT_WORK',
            classification: 'SUPPORTED_NORMALIZED',
            fields: ['imprint', 'status', 'publicationDate', 'withdrawnDate', 'copyrightHolder'],
          },
          action: pendingFindingKeys.length === 0 && ordinal.status === 'RESOLVED' ? 'CREATE_CHAPTER' : 'BLOCKED',
        };

        return intent;
      }
      case 'EMBEDDED_WORK': {
        const typeFinding = ownFinding(component, byKey, 'CONTAINED_WORK_TYPE_REQUIRED') as OnixComponentFinding;
        const imprintFinding = ownFinding(component, byKey, 'CONTAINED_WORK_IMPRINT_INHERITED') as OnixComponentFinding;
        const editionFinding = ownFinding(
          component,
          byKey,
          'CONTAINED_WORK_EDITION_NORMALISED',
        ) as OnixComponentFinding;
        const type = answerOf(typeFinding, choices) as WorkType | null;
        const lifecycle = lifecycles.get(componentKey) as OnixContainedWorkLifecycle;
        const own =
          descriptive === undefined || component.descriptivePath === null
            ? null
            : resolveOnixDescriptiveComponent(descriptive, productKey, component.descriptivePath, choices ?? {});
        const intent: OnixContainedWorkIntent = {
          ...base(),
          kind: 'CONTAINED_WORK',
          relation: 'IS_PART_OF',
          workType:
            type === null
              ? { status: 'UNRESOLVED', findingKey: typeFinding.key }
              : { status: 'RESOLVED', type, provenance: 'USER_COMPONENT_CHOICE', findingKey: typeFinding.key },
          imprint:
            parent.imprintId === null
              ? { status: 'UNRESOLVED', findingKey: imprintFinding.key }
              : {
                  status: 'RESOLVED',
                  imprintId: parent.imprintId,
                  basis: 'INHERITED_FROM_PARENT',
                  classification: 'SUPPORTED_NORMALIZED',
                  findingKey: imprintFinding.key,
                },
          edition: {
            edition: 1,
            basis: 'FIRST_EDITION_NORMALISED',
            classification: 'SUPPORTED_NORMALIZED',
            findingKey: editionFinding.key,
          },
          lifecycle,
          ordinal,
          hierarchy,
          doi,
          pageCount: component.pageCount,
          descriptive:
            own === null || component.descriptivePath === null
              ? null
              : { componentPath: component.descriptivePath, ...own },
          action: 'EXECUTION_DEFERRED',
        };

        return intent;
      }
      case 'AV_ITEM': {
        const loss = ownFinding(component, byKey, 'COMPONENT_AV_ITEM_UNREPRESENTABLE') as OnixComponentFinding;
        const intent: OnixAvItemIntent = {
          ...base(),
          kind: 'AV_ITEM',
          avItemType: component.avItemType,
          findingKey: loss.key,
          action: answerOf(loss, choices) === null ? 'BLOCKED' : 'OMIT_WITH_ACKNOWLEDGED_LOSS',
        };

        return intent;
      }
      default: {
        const intent: OnixUnsupportedComponentIntent = {
          ...base(),
          kind: 'UNSUPPORTED',
          textItemType: component.textItemType,
          action: 'BLOCKED',
        };

        return intent;
      }
    }
  });

  return {
    intents,
    raised: raisedFindings.all(),
    findingKeys: applicable,
    pendingFindingKeys: pending,
  };
};
