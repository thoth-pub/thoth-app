import { parse } from '@5stones/onix/dist/parse';
import { Document, type Element, type Node } from 'slimdom';

import { MarkupFormat } from '@/gql/graphql';

import type { ImportIssue, ImportIssueCode, ImportIssueSource, OnixSourcePlan } from '../../types';
import type { TranslateFunction } from '../CSVParser/CSVParser';
import { normaliseImportedAbstractHtml } from './importedAbstractHtml';
import { normaliseImportedPlainText } from './importedPlainText';
import type { ExtendedONIXMessageRoot, OnixText } from './interfaces';
import { getOnixText, resolveOnixTextMarkup, toOnixArray } from './onix';
import type { EnvelopeEvidence, NormalizedSourceDto, OnixWorkerResult, RecoveryMarker, SourceFinding } from './validation';
import {
  type AppliedPublisherFix,
  applyPublisherFixToTree,
  deriveXhtmlSubset,
  EDITION_STATEMENT_RULE,
  type EditionTarget,
  editionTarget,
  isPublisherFixable,
  isPublisherFixRule,
  judgeRevalidation,
  pathBeforeFix,
  type PublisherFix,
  type PublisherFixContext,
  type PublisherFixRefusal,
  type PublisherFixRejection,
  type PublisherSuppliedValueMarker,
  recordPublisherFix,
  SHORT_DESCRIPTION_LENGTH_RULE,
  type ShortDescriptionTarget,
  shortDescriptionTarget,
  writeXhtmlForm,
} from './validation/recovery';
import { MEGABYTE } from './validation/worker/envelope';
import { createProvenanceResolver, type ProvenanceResolver } from './validation/worker/provenance';
import { buildProvenanceDto } from './validation/worker/result';
import { buildXdm, forEachElementPath, pathOf, serializeXdm } from './validation/xdm';

/**
 * The bridge from canonical ONIX source validation to the legacy target adapter (thoth-app#197).
 *
 * Canonical validation - the #190 validator, run in the browser by the #196 Worker - is the one
 * authority on the source. The target planner still reads the convenience shape `@5stones/onix`
 * parses, so that shape is parsed only once canonical validation permits continuation, and only from
 * the exact normalised Reference XML the Worker serialised from the validated (recovered) tree - never
 * from the uploaded file. Whether the adapter parses, and how it types or defaults a value, says
 * nothing about the source. The canonical result, with its findings, recovery markers and Short
 * provenance, stays beside the adapter value, unchanged.
 *
 * Only the pure modules of the Worker runtime are imported at run time: the validator itself (pinned
 * schemas, WASM) never enters the page, it runs in the Worker.
 */

/**
 * A canonical result that permits target planning: completed, with no authoritative unrecovered counting
 * finding left in its ledger - every other standards finding, recovered ones included, stays in it - and
 * carrying its normalised source.
 */
export type PermittedOnixSource = OnixWorkerResult & {
  readonly status: 'COMPLETED';
  readonly sourceValid: true;
  readonly normalized: NormalizedSourceDto;
};

export function permitsTargetPlanning(result: OnixWorkerResult): result is PermittedOnixSource {
  return (
    result.status === 'COMPLETED' &&
    result.sourceValid &&
    result.findings.every((finding) => !finding.counts) &&
    result.normalized !== null
  );
}

/**
 * A completed canonical result carrying its normalised source, whatever its verdict: what a bridge may parse. Only a
 * `PermittedOnixSource` is planned whole; any other is planned only as `partitionOnixSourcePlan` partitions it.
 */
export type CompletedOnixSource = OnixWorkerResult & {
  readonly status: 'COMPLETED';
  readonly normalized: NormalizedSourceDto;
};

export interface BridgedOnixSource<Canonical extends CompletedOnixSource = PermittedOnixSource> {
  /** The canonical #196 result, retained whole: the authority on the source. */
  readonly canonical: Canonical;
  /** Source identity of canonical elements: the original tags and paths of a Short source. */
  readonly provenance: ProvenanceResolver;
  /** The convenience target-adapter value, parsed from `canonical.normalized.xml` and nothing else. */
  readonly adapter: ExtendedONIXMessageRoot;
}

const XMLNS = 'http://www.w3.org/2000/xmlns/';
const ELEMENT_NODE = 1;
/**
 * A start tag whose element name carries a namespace prefix. Deliberately loose about what a name may
 * contain, because a false positive only costs the round trip below, while a false negative would hand
 * the adapter a name it cannot read. A comment or CDATA section quoting a prefixed tag is one such
 * harmless false positive; text and attribute values cannot be, since both are escaped.
 */
const PREFIXED_ELEMENT = /<[^\s!?/>][^\s>/]*:/;

/**
 * Copies one element, naming it by its local name alone when it is in the message's own namespace.
 * Every namespace an element is actually in is preserved: the message's namespace becomes the default
 * one, declared on the root, and an element in no namespace says so for itself.
 */
function copyUnprefixed(element: Element, into: Document, onix: string): Element {
  const inOnix = element.namespaceURI === onix;
  const copy = into.createElementNS(element.namespaceURI, inOnix ? element.localName : element.nodeName);
  for (const attribute of element.attributes) {
    // Whatever prefix the source bound the message's namespace to is replaced by the default declaration.
    if (attribute.namespaceURI === XMLNS && attribute.value === onix) continue;
    const node = into.createAttributeNS(attribute.namespaceURI, attribute.name);
    node.value = attribute.value;
    copy.setAttributeNode(node);
  }
  if (element.namespaceURI === null && !copy.hasAttribute('xmlns')) {
    // Under a default-namespaced root, an element in no namespace has to undeclare it to stay there.
    const undeclare = into.createAttributeNS(XMLNS, 'xmlns');
    undeclare.value = '';
    copy.setAttributeNode(undeclare);
  }
  for (const child of element.childNodes) {
    copy.appendChild(child.nodeType === ELEMENT_NODE ? copyUnprefixed(child as Element, into, onix) : into.importNode(child as Node, true));
  }
  return copy;
}

/**
 * The XML the convenience adapter is parsed from.
 *
 * A Reference source may bind the ONIX namespace to a prefix rather than make it the default, and the
 * canonical validator - which is namespace-aware - keeps that prefix, because it is part of the source
 * it validated. `@5stones/onix` is not namespace-aware: it reads element names, so `<onix:Product>`
 * would reach the target planner under a name it has never heard of. This derives an adapter-only copy
 * in which the message's own namespace is the default one and its elements are therefore named as the
 * planner knows them. Nothing else is touched - every element stays in the namespace it was in, with
 * its attributes, its text and the order of repeated elements - and the canonical result keeps the
 * representation validation produced, prefix and all.
 *
 * An unprefixed source is already in that shape and is handed to the adapter exactly as it stands.
 */
export function toAdapterXml(normalizedXml: string): string {
  if (!PREFIXED_ELEMENT.test(normalizedXml)) return normalizedXml;
  const { document } = buildXdm(normalizedXml);
  const onix = document.documentElement?.namespaceURI ?? null;
  if (onix === null) return normalizedXml;

  const adapter = new Document();
  for (const child of document.childNodes) {
    if (child.nodeType !== ELEMENT_NODE) {
      adapter.appendChild(adapter.importNode(child as Node, true));
      continue;
    }
    // The one document element is where the message's own namespace becomes the default one.
    const copy = copyUnprefixed(child as Element, adapter, onix);
    const declaration = adapter.createAttributeNS(XMLNS, 'xmlns');
    declaration.value = onix;
    copy.setAttributeNode(declaration);
    adapter.appendChild(copy);
  }
  return serializeXdm(adapter);
}

const bridge = <Canonical extends CompletedOnixSource>(canonical: Canonical): BridgedOnixSource<Canonical> => ({
  canonical,
  provenance: createProvenanceResolver(canonical.normalized.provenance),
  adapter: parse(toAdapterXml(canonical.normalized.xml)) as ExtendedONIXMessageRoot,
});

export function bridgeOnixSource(result: OnixWorkerResult): BridgedOnixSource {
  if (!permitsTargetPlanning(result)) {
    throw new Error('canonical ONIX source validation does not permit target planning for this source');
  }
  return bridge(result);
}

/* ------------------------------------------------------------------------------------------------ */
/* Product-scoped blocking and partial import (thoth-app#282)                                       */
/* ------------------------------------------------------------------------------------------------ */

/**
 * Why a source is held whole, as every blocked source was before thoth-app#282:
 *
 * - `NOT_COMPLETED`: validation stopped at stage 1 or 2 (release, flavour, prolog, DOCTYPE, bounds, well-formedness),
 *   or completed without a normalised source;
 * - `VERDICT_UNEXPLAINED`: the result is not source-valid, yet no finding counts toward its verdict;
 * - `MESSAGE_LEVEL_FINDING`: a counting finding outside every Product - the Header, the root, the prolog - or with no
 *   canonical path at all;
 * - `PRODUCT_ELEMENT_FINDING`: a counting finding on a Product element itself rather than inside it. The schema reports
 *   where a Product stands in the message there - a missing or misplaced Header, or a NoProduct beside Products, is
 *   reported on Product 1 - and a rule whose context is the Product may weigh other Products too, so such a finding
 *   cannot be proven to be about that one Product alone (#282 review B1);
 * - `PRODUCT_OMITTED`: a recovery omitted a whole Product, so no canonical Product position can be trusted to name the
 *   record the target planner reads at that position;
 * - `PRODUCT_UNRESOLVED`: a counting finding's Product is not exactly one complete record of a Work group the file plans;
 * - `PRODUCT_POSITIONS_UNPROVEN`: the canonical Product positions findings are attributed by cannot be proven to be the
 *   positions the target planner numbers its records by - a Product the adapter does not read as a record (an empty or
 *   text-only Product), a Product element anywhere but directly in the message, or a record whose RecordReference is
 *   not the one the canonical Product at its position states;
 * - `NOTHING_LEFT`: every Work group of the file is held back, so nothing would be imported.
 *
 * Whenever which Product a counting finding is about is uncertain, the file is held.
 */
export type OnixFileHoldReason =
  | 'NOT_COMPLETED'
  | 'VERDICT_UNEXPLAINED'
  | 'MESSAGE_LEVEL_FINDING'
  | 'PRODUCT_ELEMENT_FINDING'
  | 'PRODUCT_OMITTED'
  | 'PRODUCT_UNRESOLVED'
  | 'PRODUCT_POSITIONS_UNPROVEN'
  | 'NOTHING_LEFT';

/**
 * Where a canonical source's counting findings lie, before anything is parsed for the target side: either the whole
 * file is held, or every counting finding lies inside exactly one Product, by its 1-based canonical position. A
 * source-valid result attributes nothing, and is then planned whole exactly as `permitsTargetPlanning` permits it.
 */
export type OnixSourceAttribution =
  | { readonly kind: 'FILE'; readonly reason: OnixFileHoldReason }
  | {
      readonly kind: 'PRODUCTS';
      readonly source: CompletedOnixSource;
      /** Every counting finding, in ledger order, by the 1-based canonical position of the Product it lies in. */
      readonly blockingByProduct: ReadonlyMap<number, readonly SourceFinding[]>;
    };

/** A canonical path inside one Product: the Product itself or anything it contains, and nothing else. */
const PRODUCT_PATH = /^\/ONIXMessage\[1\]\/Product\[([1-9]\d*)\](?:\/|$)/;
/** Exactly one whole Product. */
const WHOLE_PRODUCT_PATH = /^\/ONIXMessage\[1\]\/Product\[[1-9]\d*\]$/;

/**
 * How many Product start tags the normalised XML carries. Only the Worker's own serialisation is read, in which every
 * element is a literal start tag; a comment quoting one can only overcount, which never holds a file it should not.
 */
const PRODUCT_START_TAG = /<(?:[A-Za-z_][\w.-]*:)?Product[\s/>]/g;
const productCountOf = (normalizedXml: string): number => normalizedXml.match(PRODUCT_START_TAG)?.length ?? 0;

/** The 1-based canonical position of the Product a canonical path lies in, or null outside every Product. */
export function productIndexOfPath(path: string | null | undefined): number | null {
  const match = path ? PRODUCT_PATH.exec(path) : null;
  return match ? Number(match[1]) : null;
}

/**
 * Attributes every counting finding of a canonical result to the Product it lies in (thoth-app#282 contract items 1-2).
 * Nothing is reclassified: whether a finding counts is the validator's verdict alone, and every finding stays in the
 * ledger whichever way the source is held.
 */
export function attributeCountingFindings(result: OnixWorkerResult): OnixSourceAttribution {
  if (result.status !== 'COMPLETED' || result.normalized === null) return { kind: 'FILE', reason: 'NOT_COMPLETED' };
  const source = result as CompletedOnixSource;
  const counting = result.findings.filter(({ counts }) => counts);
  if (counting.length === 0) {
    return result.sourceValid
      ? { kind: 'PRODUCTS', source, blockingByProduct: new Map() }
      : { kind: 'FILE', reason: 'VERDICT_UNEXPLAINED' };
  }
  // Positions in the canonical tree only name the planner's records while no recovery has taken a whole Product out.
  const omitsProduct = result.normalized.recoveries.some(
    (recovery) => recovery.recovery === 'OMIT_INVALID_COMPOSITE' && WHOLE_PRODUCT_PATH.test(recovery.removed),
  );
  if (omitsProduct) return { kind: 'FILE', reason: 'PRODUCT_OMITTED' };

  const blockingByProduct = new Map<number, SourceFinding[]>();
  for (const finding of counting) {
    const index = productIndexOfPath(finding.path);
    if (index === null) return { kind: 'FILE', reason: 'MESSAGE_LEVEL_FINDING' };
    // Only a finding below the Product element is provably that Product's; one on the element itself is held whole.
    if (WHOLE_PRODUCT_PATH.test(finding.path ?? '')) return { kind: 'FILE', reason: 'PRODUCT_ELEMENT_FINDING' };
    blockingByProduct.set(index, [...(blockingByProduct.get(index) ?? []), finding]);
  }
  // Settled before anything is parsed for the target side: a finding past the last Product names none, and a file
  // every Product of which is blocked has nothing left to import, whatever its grouping.
  const products = productCountOf(result.normalized.xml);
  if ([...blockingByProduct.keys()].some((index) => index > products)) {
    return { kind: 'FILE', reason: 'PRODUCT_UNRESOLVED' };
  }
  if (blockingByProduct.size >= products) return { kind: 'FILE', reason: 'NOTHING_LEFT' };
  return { kind: 'PRODUCTS', source, blockingByProduct };
}

/**
 * Bridges a source whose counting findings all lie inside Products. Like `bridgeOnixSource`, it parses only the
 * normalised Reference XML the Worker serialised; unlike it, the result may be planned only after
 * `partitionOnixSourcePlan` has held back every Work group a counting finding lies in.
 */
export function bridgeAttributedOnixSource(
  attribution: Extract<OnixSourceAttribution, { kind: 'PRODUCTS' }>,
): BridgedOnixSource<CompletedOnixSource> {
  return bridge(attribution.source);
}

/** One record of a held-back Work group, as the file states it. */
export type OnixHeldBackRecord = {
  readonly recordKey: string;
  /** 1-based position among the message's Products, as every ONIX issue numbers it. */
  readonly index: number;
  readonly recordReference: string | null;
  /** The record's Product's accepted ISBN, where the file states exactly one. */
  readonly isbn: string | null;
};

/**
 * A Work group held back from this import because a counting source finding lies in one of its Products
 * (thoth-app#282). Nothing of it is planned, executed or written; it is disclosed by its title and ISBNs with the
 * findings that hold it back, and is planned again, as any other group, once a later upload no longer carries them.
 */
export type OnixHeldBackGroup = {
  /** The source plan's own key for the group, as `planOnixSource` grouped the whole file. */
  readonly groupKey: string;
  readonly productKeys: readonly string[];
  /** Every record of the group, in file order. */
  readonly records: readonly OnixHeldBackRecord[];
  /**
   * The distinctive title of the group's first record, read as the file states it for display alone: the TitleType 01
   * TitleElement of level 01, with its subtitle. Null where the file states none.
   */
  readonly title: string | null;
  /** Every accepted ISBN of the group's Products, in file order, once each. */
  readonly isbns: readonly string[];
  /** The counting findings that hold the group back, in ledger order. */
  readonly findings: readonly SourceFinding[];
};

/**
 * What target planning may see of a source: the whole file is held, or the source plan without its held-back Work
 * groups. Every other group is planned exactly as it would have been, with the held-back Products read as not in the
 * file at all (thoth-app#282 contract item 4): no relation, Reference or alternative format resolves to them in the
 * file, and none of their warnings or blockers is the plan's.
 */
export type OnixSourcePartition =
  | { readonly kind: 'FILE'; readonly reason: OnixFileHoldReason }
  | {
      readonly kind: 'PLANNED';
      readonly sourcePlan: OnixSourcePlan;
      /** In file order; empty when the source is planned whole. */
      readonly heldBack: readonly OnixHeldBackGroup[];
    };

const isRecordValue = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object';
const childrenOf = (value: unknown, name: string): unknown[] =>
  isRecordValue(value) ? toOnixArray(value[name] as unknown) : [];
const textOf = (value: unknown): string => getOnixText(value as OnixText);
const codeIs = (value: unknown, name: string, code: string) => childrenOf(value, name).some((v) => textOf(v) === code);

/** The distinctive title a Product states, for display alone; never a planning fact. */
function statedTitleOf(product: unknown): string | null {
  const element = childrenOf(product, 'DescriptiveDetail')
    .flatMap((detail) => childrenOf(detail, 'TitleDetail'))
    .filter((detail) => codeIs(detail, 'TitleType', '01'))
    .flatMap((detail) => childrenOf(detail, 'TitleElement'))
    .find((candidate) => codeIs(candidate, 'TitleElementLevel', '01'));
  if (element === undefined) return null;
  const [text] = childrenOf(element, 'TitleText').map(textOf);
  const prefixed = [childrenOf(element, 'TitlePrefix'), childrenOf(element, 'TitleWithoutPrefix')]
    .map((values) => values.map(textOf).join(' '))
    .filter((part) => part.length > 0)
    .join(' ');
  const title = text || prefixed;
  const subtitle = childrenOf(element, 'Subtitle').map(textOf).join(' ');
  if (!title) return subtitle || null;
  return subtitle ? `${title}: ${subtitle}` : title;
}

/** The RecordReference each Product directly inside the canonical message states, in document order. */
function canonicalRecordReferencesOf(normalizedXml: string): (string | null)[] {
  const root = buildXdm(normalizedXml).document.documentElement;
  if (!root) return [];
  const ownChildren = (parent: Element, localName: string) =>
    [...parent.childNodes].filter(
      (node): node is Element =>
        node.nodeType === ELEMENT_NODE &&
        (node as Element).localName === localName &&
        (node as Element).namespaceURI === root.namespaceURI,
    );
  return ownChildren(root, 'Product').map((product) => {
    const [reference] = ownChildren(product, 'RecordReference');
    const text = reference?.textContent?.trim() ?? '';
    return text.length > 0 ? text : null;
  });
}

/**
 * Whether canonical Product positions provably are the positions the planner numbers its records by (thoth-app#282
 * review finding 1). The planner numbers only the Products the adapter reads as records, so one it skips - an empty or
 * text-only Product - shifts every later position. Positions are trusted only when every Product start tag in the
 * normalised XML is a Product directly in the message, the adapter reads every one of them as a record, the planner
 * holds exactly one record for each, in order, and every record's RecordReference is the one the canonical Product at
 * its position states. Anything less holds the file.
 */
function positionsProven(sourcePlan: OnixSourcePlan, normalizedXml: string, adapter: ExtendedONIXMessageRoot): boolean {
  const canonical = canonicalRecordReferencesOf(normalizedXml);
  const declared = adapter.ONIXMessage?.Product as unknown;
  const adapterProducts: unknown[] = Array.isArray(declared) ? declared : declared === undefined ? [] : [declared];
  return (
    canonical.length > 0 &&
    canonical.length === productCountOf(normalizedXml) &&
    adapterProducts.length === canonical.length &&
    adapterProducts.every(isRecordValue) &&
    sourcePlan.records.length === canonical.length &&
    sourcePlan.records.every(
      ({ index, recordReference }, position) =>
        index === position + 1 && recordReference !== null && recordReference === canonical[position],
    )
  );
}

/**
 * Holds back every Work group of the whole-file source plan that a counting finding lies in (thoth-app#282 contract
 * items 1, 2 and 4). The grouping is the planner's own, read once from the whole file: a group is held back whole,
 * never a manifestation of it, so no group's reductions change. A finding whose Product is not exactly one complete
 * record of a planned group holds the file, as does a file of which nothing would be left.
 */
export function partitionOnixSourcePlan(
  sourcePlan: OnixSourcePlan,
  attribution: Extract<OnixSourceAttribution, { kind: 'PRODUCTS' }>,
  adapter: ExtendedONIXMessageRoot,
): OnixSourcePartition {
  const { blockingByProduct } = attribution;
  if (blockingByProduct.size === 0) return { kind: 'PLANNED', sourcePlan, heldBack: [] };
  if (!positionsProven(sourcePlan, attribution.source.normalized.xml, adapter)) {
    return { kind: 'FILE', reason: 'PRODUCT_POSITIONS_UNPROVEN' };
  }

  const recordByIndex = new Map(sourcePlan.records.map((record) => [record.index, record]));
  const productByKey = new Map(sourcePlan.products.map((node) => [node.productKey, node]));
  const findingsByGroup = new Map<string, SourceFinding[]>();
  for (const [index, findings] of blockingByProduct) {
    const record = recordByIndex.get(index);
    const node = record?.productKey ? productByKey.get(record.productKey) : undefined;
    if (node === undefined || !sourcePlan.groups.some(({ groupKey }) => groupKey === node.groupKey)) {
      return { kind: 'FILE', reason: 'PRODUCT_UNRESOLVED' };
    }
    findingsByGroup.set(node.groupKey, [...(findingsByGroup.get(node.groupKey) ?? []), ...findings]);
  }
  if (sourcePlan.groups.every(({ groupKey }) => findingsByGroup.has(groupKey))) {
    return { kind: 'FILE', reason: 'NOTHING_LEFT' };
  }

  const heldProductKeys = new Set(
    sourcePlan.products.filter(({ groupKey }) => findingsByGroup.has(groupKey)).map(({ productKey }) => productKey),
  );
  const heldRecords = sourcePlan.records.filter(
    ({ productKey }) => productKey !== null && heldProductKeys.has(productKey),
  );
  const heldRecordKeys = new Set(heldRecords.map(({ recordKey }) => recordKey));
  const heldIndices = new Set(heldRecords.map(({ index }) => index));
  const ledgerOrder = new Map(attribution.source.findings.map((finding, position) => [finding, position]));
  // The adapter numbers Products as the planner does: every object-valued Product, from 1.
  const adapterProducts = toOnixArray(adapter.ONIXMessage?.Product).filter(isRecordValue);

  const heldBack: OnixHeldBackGroup[] = sourcePlan.groups
    .filter(({ groupKey }) => findingsByGroup.has(groupKey))
    .map((group) => {
      const records = heldRecords
        .filter(({ productKey }) => productKey !== null && productByKey.get(productKey)?.groupKey === group.groupKey)
        .sort((a, b) => a.index - b.index);
      const isbnOf = (productKey: string | null) => {
        const decision = productKey === null ? undefined : productByKey.get(productKey)?.isbn;
        return decision?.kind === 'ACCEPTED' ? decision.isbn : null;
      };
      return {
        groupKey: group.groupKey,
        productKeys: group.productKeys,
        records: records.map(({ recordKey, index, recordReference, productKey }) => ({
          recordKey,
          index,
          recordReference,
          isbn: isbnOf(productKey),
        })),
        title: records.length > 0 ? statedTitleOf(adapterProducts[records[0].index - 1]) : null,
        isbns: [...new Set(records.flatMap(({ productKey }) => isbnOf(productKey) ?? []))],
        findings: (findingsByGroup.get(group.groupKey) ?? []).sort(
          (a, b) => (ledgerOrder.get(a) ?? 0) - (ledgerOrder.get(b) ?? 0),
        ),
      };
    })
    .sort((a, b) => (a.records[0]?.index ?? 0) - (b.records[0]?.index ?? 0));

  const heldGroupKeys = new Set(findingsByGroup.keys());
  const held = ({ recordKey, productKey, groupKey }: OnixSourcePlan['blockers'][number]) =>
    (recordKey !== null && heldRecordKeys.has(recordKey)) ||
    (productKey !== null && heldProductKeys.has(productKey)) ||
    (groupKey !== null && heldGroupKeys.has(groupKey));

  return {
    kind: 'PLANNED',
    sourcePlan: {
      ...sourcePlan,
      compatibility: {
        ...sourcePlan.compatibility,
        ignoredNativeRecordKeys: sourcePlan.compatibility.ignoredNativeRecordKeys.filter(
          (recordKey) => !heldRecordKeys.has(recordKey),
        ),
      },
      records: sourcePlan.records.filter(({ recordKey }) => !heldRecordKeys.has(recordKey)),
      products: sourcePlan.products.filter(({ productKey }) => !heldProductKeys.has(productKey)),
      groups: sourcePlan.groups.filter(({ groupKey }) => !heldGroupKeys.has(groupKey)),
      blockers: sourcePlan.blockers.filter((blocker) => !held(blocker)),
      warnings: sourcePlan.warnings.filter(
        ({ source }) => source.kind !== 'onix' || !heldIndices.has(source.productIndex),
      ),
    },
    heldBack,
  };
}

const SCOPE_CODES: Readonly<Record<SourceFinding['scope'], ImportIssueCode>> = {
  VALIDITY: 'onix.source.validity',
  SUPPORT: 'onix.source.support',
  SECURITY: 'onix.source.security',
};

/** The Product a canonical path lies in, numbered from 1 as the target planner numbers Products; else the file. */
function issueSource(path: string | null | undefined): ImportIssueSource {
  const product = path ? /^\/ONIXMessage\[1\]\/Product\[(\d+)\]/.exec(path) : null;
  return product ? { kind: 'onix', productIndex: Number(product[1]) } : { kind: 'file' };
}

/** Where a finding points: its canonical path, after the original path when a Short source named it differently. */
function location(path: string | null | undefined, sourcePath: string | null | undefined, t: TranslateFunction) {
  if (!path) return '';
  return sourcePath && sourcePath !== path
    ? t('onixValidation.issue.locationShort', { sourcePath, path })
    : t('onixValidation.issue.location', { path });
}

/** How a finding stands in the verdict when it does not simply count toward it. */
function disposition(finding: SourceFinding): string | null {
  if (finding.recoverability !== 'NOT_RECOVERABLE') return finding.recoverability;
  if (finding.projection !== 'AUTHORITATIVE') return finding.projection;
  return finding.counts ? null : 'NON_BLOCKING';
}

function findingIssue(finding: SourceFinding, t: TranslateFunction): ImportIssue {
  const kept = disposition(finding);
  return {
    // Only an authoritative, unrecovered finding of a blocking class counts toward the source's verdict.
    severity: finding.counts ? 'error' : 'warning',
    code: SCOPE_CODES[finding.scope],
    message: t('onixValidation.issue.finding', {
      scope: t(`onixValidation.issue.${finding.scope}`),
      message: finding.message || finding.class,
      id: finding.id,
      findingClass: finding.class,
      location: location(finding.path, finding.sourcePath, t),
      disposition: kept ? t(`onixValidation.disposition.${kept}`) : '',
    }),
    source: issueSource(finding.path),
    sourceValidation: { kind: 'finding', finding },
  };
}

/** Where a recovery applies: the omitted composite, or the composite a post-conformance recovery kept. */
function recoveryPath(recovery: RecoveryMarker): string {
  return recovery.recovery === 'OMIT_INVALID_COMPOSITE' ? recovery.removed : recovery.path;
}

/** What a recovery did, in its own terms: only the ordinary omission leaves anything out. */
function recoveryMessage(recovery: RecoveryMarker, where: string, t: TranslateFunction): string {
  switch (recovery.recovery) {
    case 'OMIT_INVALID_COMPOSITE':
      return t('onixValidation.issue.recovered', { location: where, recovery: recovery.recovery });
    case 'NORMALIZE_IDENTIFIER_LEXICAL_FORM':
      return t('onixValidation.issue.recoveredIdentifier', {
        location: where,
        recovery: recovery.recovery,
        original: recovery.original,
        canonical: recovery.canonical,
      });
    case 'PUBLISHER_CATEGORY_TO_CUSTOM':
      return t('onixValidation.issue.recoveredCategory', {
        location: where,
        recovery: recovery.recovery,
        value: recovery.value,
        valueSource: recovery.valueSource,
      });
    case 'NORMALIZE_ORCID_LEXICAL_FORM':
      return t('onixValidation.issue.recoveredOrcid', {
        location: where,
        recovery: recovery.recovery,
        original: recovery.original,
        canonical: recovery.canonical,
      });
    case 'PUBLISHER_SUPPLIED_VALUE':
      return t('onixValidation.issue.recoveredPublisherValue', {
        location: where,
        rule: recovery.rule,
        recovery: recovery.recovery,
      });
  }
}

/**
 * The original source path of where a recovery applies. A post-conformance recovery's composite is still in the
 * normalised tree, whose provenance names it. An omitted composite is not: `removed` is its canonical path before
 * the omission, which a surviving same-named sibling may now hold, so that provenance would name the survivor.
 * Its source path is the one its own recovered ordinary finding recorded (none for a Reference source); without
 * exactly one such finding it is shown at its canonical path alone, never at a path resolved for it.
 */
function recoverySourcePath(
  recovery: RecoveryMarker,
  findings: readonly SourceFinding[],
  provenance: ProvenanceResolver | null,
): string | null | undefined {
  // A publisher fix records the source path of its own finding; its element may since have been left out.
  if (recovery.recovery === 'PUBLISHER_SUPPLIED_VALUE') return recovery.sourcePath;
  if (recovery.recovery !== 'OMIT_INVALID_COMPOSITE') return provenance?.sourcePathOf(recovery.path);
  const recorded = findings.filter(
    (finding) =>
      finding.id === 'ORDINARY_XSD_INVALID' &&
      finding.recoverability === 'OMIT_INVALID_COMPOSITE' &&
      finding.path === recovery.removed,
  );
  return recorded.length === 1 ? recorded[0].sourcePath : undefined;
}

function recoveryIssue(
  recovery: RecoveryMarker,
  findings: readonly SourceFinding[],
  provenance: ProvenanceResolver | null,
  t: TranslateFunction,
): ImportIssue {
  const path = recoveryPath(recovery);
  return {
    severity: 'warning',
    code: 'onix.source.recovered',
    message: recoveryMessage(recovery, location(path, recoverySourcePath(recovery, findings, provenance), t), t),
    source: issueSource(path),
    sourceValidation: { kind: 'recovery', recovery },
  };
}

/**
 * Every canonical finding in ledger order, then every approved recovery, as upload issues. Nothing is
 * dropped, merged or reclassified: each issue carries its finding or recovery marker whole, and its
 * code keeps the source's validity, Thoth's support for it and the security boundary apart.
 */
export function projectOnixSourceIssues(result: OnixWorkerResult, t: TranslateFunction): ImportIssue[] {
  const provenance = result.normalized ? createProvenanceResolver(result.normalized.provenance) : null;
  return [
    ...result.findings.map((finding) => findingIssue(finding, t)),
    ...(result.normalized?.recoveries ?? []).map((recovery) => recoveryIssue(recovery, result.findings, provenance, t)),
  ];
}

/** Why this browser cannot validate the source: a support outcome, never a finding about the source. */
function refusalMessage(envelope: EnvelopeEvidence, t: TranslateFunction): string {
  if (envelope.verdict === 'REFUSE' && envelope.limits) {
    return t('onixValidation.support.tooLarge', {
      engine: t(`onixValidation.engine.${envelope.engine}`),
      exceeded: envelope.exceeded.map((dimension) => t(`onixValidation.warning.dimension.${dimension}`)),
      limitMegabytes: envelope.limits.warning.bytes / MEGABYTE,
      limitProducts: envelope.limits.warning.products,
    });
  }
  const engine = envelope.engine === 'mobile' || envelope.engine === 'webkit' ? envelope.engine : 'unknown';
  return t(`onixValidation.support.${engine}`);
}

/** A refused source (engine unsupported, or beyond this engine's envelope): one SUPPORT issue, no fallback. */
export function projectOnixRefusal(envelope: EnvelopeEvidence, t: TranslateFunction): ImportIssue[] {
  return [
    {
      severity: 'error',
      code: 'onix.source.support',
      message: refusalMessage(envelope, t),
      source: { kind: 'file' },
      sourceValidation: { kind: 'support', envelope },
    },
  ];
}

/** Validation never reached an outcome (the Worker failed or reported an internal error): nothing was checked. */
export function projectOnixUnavailable(
  failure: { readonly code: string; readonly message: string },
  t: TranslateFunction,
): ImportIssue[] {
  return [
    {
      severity: 'error',
      code: 'onix.source.unavailable',
      message: t('onixValidation.unavailable', { detail: failure.message || failure.code }),
      source: { kind: 'file' },
      sourceValidation: { kind: 'unavailable', code: failure.code, message: failure.message },
    },
  ];
}

/* ------------------------------------------------------------------------------------------------ */
/* Publisher-supplied fixes (thoth-app#283 APP-IMPORT-ONIX-INLINE-FIX-01, Phase A)                   */
/* ------------------------------------------------------------------------------------------------ */

export {
  canOmitShortDescription,
  checkEditionNumber,
  DESCRIPTION_TEXT_TYPES,
  EDITION_STATEMENT_RULE,
  type EditionNumberCheck,
  type EditionTarget,
  MAX_EDITION_NUMBER,
  measureShortDescription,
  PUBLISHER_FIX_RULES,
  type PublisherFix,
  type PublisherFixAction,
  type PublisherFixContext,
  type PublisherFixRefusal,
  type PublisherFixRejection,
  type PublisherFixRule,
  type PublisherSuppliedValueMarker,
  SHORT_DESCRIPTION_LENGTH_RULE,
  SHORT_DESCRIPTION_LIMIT,
  type ShortDescriptionMeasure,
  type ShortDescriptionTarget,
  suggestEditionNumber,
  type XhtmlSubset,
} from './validation/recovery';

/**
 * The review's publisher-fix session over one canonical result. `result` is always a complete, structured-clone-
 * safe canonical result: the uploaded file's ledger - every finding kept, each accepted fix's one finding recorded
 * as `PUBLISHER_SUPPLIED_VALUE` - with the normalised source those fixes produced. Pass `result` wherever the
 * unfixed canonical result went before (issue projection, `permitsTargetPlanning`, `bridgeOnixSource`).
 */
export interface PublisherFixState {
  readonly result: OnixWorkerResult;
  /** Every accepted fix, in the order it was confirmed: what the import report shows. */
  readonly fixes: readonly PublisherSuppliedValueMarker[];
  /** Composites left out by accepted fixes, in order: ledger paths of later same-named siblings have moved. */
  readonly removals: readonly NonNullable<AppliedPublisherFix['removed']>[];
  /** The last validation of `result.normalized.xml`, reused as the baseline of the next re-validation. */
  readonly baseline: OnixWorkerResult | null;
  /** The importer facts and the ONIX XHTML subset every fix of this session is checked against. */
  readonly context: PublisherFixContext;
}

/** Validates bytes exactly as a fresh #196 Worker session does for an upload (continuing past a WARNING). */
export type PublisherFixValidate = (bytes: Uint8Array) => Promise<OnixWorkerResult>;

export type PublisherFixEligibility =
  | {
      readonly eligible: false;
      readonly reason: PublisherFixRefusal | 'NOT_FIXABLE';
    }
  | {
      readonly eligible: true;
      readonly rule: typeof EDITION_STATEMENT_RULE;
      readonly path: string;
      readonly edition: EditionTarget;
    }
  | {
      readonly eligible: true;
      readonly rule: typeof SHORT_DESCRIPTION_LENGTH_RULE;
      readonly path: string;
      readonly shortDescription: ShortDescriptionTarget;
    };

export type PublisherFixOutcome =
  | {
      /** Re-validation proved the fix clean: the new state, with the fix recorded. */
      readonly kind: 'APPLIED';
      readonly state: PublisherFixState;
      readonly marker: PublisherSuppliedValueMarker;
    }
  | {
      /**
       * The fix could not be bound or its value is not acceptable; `state` is the input. Nothing was validated, except
       * for a corrected XHTML short description, whose element form a schema probe refused (`TEXT_NOT_IMPORTABLE`).
       */
      readonly kind: 'REFUSED';
      readonly reason: PublisherFixRefusal;
      readonly state: PublisherFixState;
    }
  | {
      /** Re-validation did not prove the fix clean; nothing was applied. `state` is the input, unchanged. */
      readonly kind: 'REJECTED';
      readonly reason: PublisherFixRejection;
      /** The findings of the re-validation that kept it from being accepted. */
      readonly findings: readonly SourceFinding[];
      readonly state: PublisherFixState;
    };

/**
 * Whether the collateral reducer would import a `Text` as an abstract as it stands, by its own rules
 * (`onixCollateral.ts` `normaliseText` for an abstract slot): a `Text` holding elements is unrepresentable, an empty
 * one imports nothing, and otherwise its declared format and markup must resolve and normalise to content.
 */
export function isImportableAbstract(text: Element): boolean {
  if (Array.from(text.childNodes).some((child) => child.nodeType === ELEMENT_NODE)) return false;
  const content = text.textContent ?? '';
  if (content.length === 0) return false;
  const declared = text.getAttribute('textformat') ?? '';
  const resolution = resolveOnixTextMarkup(declared, content);
  if (resolution.kind === 'unclassifiable') return false;
  if (resolution.format === MarkupFormat.JatsXml) return true;
  const normalised =
    resolution.format === MarkupFormat.PlainText
      ? normaliseImportedPlainText(declared, content)
      : normaliseImportedAbstractHtml(content);
  return normalised.kind === 'content';
}

/**
 * The importer facts and the ONIX XHTML subset every publisher fix is checked against. `xhtmlSubsetXsd` is the text
 * of the pinned `ONIX_XHTML_Subset.xsd` standards resource, loaded and verified as the validator loads it
 * (`loadVerifiedResource`); it is the authority on what a corrected XHTML short description may contain.
 */
export function createPublisherFixContext(xhtmlSubsetXsd: string): PublisherFixContext {
  return { isImportableAbstract, xhtmlSubset: deriveXhtmlSubset(xhtmlSubsetXsd) };
}

/** Starts a publisher-fix session over a completed canonical result; nothing is applied yet. */
export function startPublisherFixSession(result: OnixWorkerResult, context: PublisherFixContext): PublisherFixState {
  return { result, fixes: [], removals: [], baseline: null, context };
}

/** The provenance of every publisher fix in a canonical result, in the order they were confirmed. */
export function publisherFixProvenance(result: OnixWorkerResult): readonly PublisherSuppliedValueMarker[] {
  return (result.normalized?.recoveries ?? []).filter(
    (recovery): recovery is PublisherSuppliedValueMarker => recovery.recovery === 'PUBLISHER_SUPPLIED_VALUE',
  );
}

/** A ledger path in the current normalised tree, or `null` when an accepted fix left its element out. */
function currentPath(path: string, removals: PublisherFixState['removals']): string | null {
  let current = path;
  for (const removed of removals) {
    const prefix = `${removed.parentPath}/${removed.localName}[`;
    if (!current.startsWith(prefix)) continue;
    const rest = current.slice(prefix.length);
    const close = rest.indexOf(']');
    const position = Number(rest.slice(0, close));
    if (position === removed.position) return null;
    if (position > removed.position) current = `${prefix}${position - 1}${rest.slice(close)}`;
  }
  return current;
}

/** A path of the current normalised tree as the ledger names it: every accepted removal undone, latest first. */
function ledgerPath(path: string, removals: PublisherFixState['removals']): string {
  return removals.reduceRight((current, removed) => pathBeforeFix(current, removed), path);
}

/** The one fixable finding of this rule at this ledger path, or why there is none. */
function fixableFinding(
  result: OnixWorkerResult,
  rule: string,
  path: string,
): SourceFinding | 'RULE_NOT_ALLOWLISTED' | 'NO_FINDING' | 'AMBIGUOUS_FINDING' {
  if (!isPublisherFixRule(rule)) return 'RULE_NOT_ALLOWLISTED';
  const matches = result.findings.filter((f) => isPublisherFixable(f) && f.id === rule && f.path === path);
  if (matches.length === 0) return 'NO_FINDING';
  return matches.length === 1 ? matches[0] : 'AMBIGUOUS_FINDING';
}

/**
 * Whether the review may offer an inline fix for a finding, and what the control needs: for
 * `R-EDITION-STATEMENT` the statements and a suggested number (never applied without Confirm); for
 * `_20171221_e_1` the over-limit text in its editable form, its live count, and whether "don't import a short
 * description for this book" may be offered. Any other finding gets no inline control.
 */
export function publisherFixEligibility(state: PublisherFixState, finding: SourceFinding): PublisherFixEligibility {
  const { result } = state;
  if (result.status !== 'COMPLETED' || !result.normalized) return { eligible: false, reason: 'NO_NORMALIZED_SOURCE' };
  if (!isPublisherFixRule(finding.id)) return { eligible: false, reason: 'RULE_NOT_ALLOWLISTED' };
  if (!isPublisherFixable(finding) || !finding.path) return { eligible: false, reason: 'NOT_FIXABLE' };
  const bound = fixableFinding(result, finding.id, finding.path);
  if (typeof bound === 'string') return { eligible: false, reason: bound };
  const path = currentPath(finding.path, state.removals);
  if (path === null) return { eligible: false, reason: 'TARGET_NOT_FOUND' };
  const { document } = buildXdm(result.normalized.xml);
  if (finding.id === EDITION_STATEMENT_RULE) {
    const edition = editionTarget(document, path);
    return typeof edition === 'string'
      ? { eligible: false, reason: edition }
      : { eligible: true, rule: EDITION_STATEMENT_RULE, path: finding.path, edition };
  }
  const shortDescription = shortDescriptionTarget(document, path, state.context);
  return typeof shortDescription === 'string'
    ? { eligible: false, reason: shortDescription }
    : {
        eligible: true,
        rule: SHORT_DESCRIPTION_LENGTH_RULE,
        path: finding.path,
        shortDescription: { ...shortDescription, textPath: ledgerPath(shortDescription.textPath, state.removals) },
      };
}

function summarise(findings: readonly SourceFinding[]): OnixWorkerResult['summary'] {
  return {
    total: findings.length,
    blocking: findings.filter((f) => f.counts).length,
    secondary: findings.filter((f) => f.projection === 'SECONDARY').length,
    notEvaluable: findings.filter((f) => f.class === 'RULE_NOT_EVALUABLE').length,
    recovered: findings.filter((f) => f.recoverability !== 'NOT_RECOVERABLE').length,
  };
}

const ENCODER = new TextEncoder();

/**
 * Applies one confirmed publisher fix and re-validates the whole normalised source with it.
 *
 * The fix is bound to the one counting finding of its allowlisted rule at its ledger path, and applied to a copy
 * of the normalised tree - never to the uploaded bytes, which are not even an input. The normalised source is then
 * validated as a whole twice through `validate` (once without the fix, reused from the previous accepted step when
 * there is one, and once with it), and the fix is accepted only when its finding is gone and no new blocking finding
 * appeared (see `judgeRevalidation`). Accepted: the finding is recorded as `PUBLISHER_SUPPLIED_VALUE` in the uploaded
 * file's ledger, every other finding is kept as it was, and the normalised source, its provenance and its recovery
 * markers are those of the fixed tree. A replaced short description must also be one the importer takes as it stands
 * (`PublisherFixContext`); a corrected XHTML `Text` is stored as escaped HTML (02) for that reason, and anything the
 * importer would not take is refused `TEXT_NOT_IMPORTABLE` before any validation. Anything else returns the input
 * state itself, so a refused or rejected fix changes nothing.
 */
export async function revalidatePublisherFix(
  state: PublisherFixState,
  fix: PublisherFix,
  validate: PublisherFixValidate,
): Promise<PublisherFixOutcome> {
  const refused = (reason: PublisherFixRefusal): PublisherFixOutcome => ({ kind: 'REFUSED', reason, state });
  const rejected = (reason: PublisherFixRejection, findings: readonly SourceFinding[] = []): PublisherFixOutcome => ({
    kind: 'REJECTED',
    reason,
    findings,
    state,
  });
  const { result } = state;
  if (result.status !== 'COMPLETED' || !result.normalized || !result.source) return refused('NO_NORMALIZED_SOURCE');
  const finding = fixableFinding(result, fix.rule, fix.path);
  if (typeof finding === 'string') return refused(finding);
  const path = currentPath(fix.path, state.removals);
  if (path === null) return refused('TARGET_NOT_FOUND');

  const { document } = buildXdm(result.normalized.xml);
  const pathsBefore = new Map<Element, string>();
  forEachElementPath(
    document,
    (element) => element.localName,
    (element, elementPath) => {
      pathsBefore.set(element, elementPath);
    },
  );
  const applied = applyPublisherFixToTree(document, { ...fix, path }, state.context);
  if (typeof applied === 'string') return refused(applied);

  // A validation that fails, throws or stops is no proof either way: nothing is applied.
  const attempt = async (bytes: Uint8Array): Promise<OnixWorkerResult | null> => {
    try {
      const outcome = await validate(bytes);
      return outcome.status === 'COMPLETED' ? outcome : null;
    } catch {
      return null;
    }
  };
  const baseline = state.baseline ?? (await attempt(ENCODER.encode(result.normalized.xml)));
  if (!baseline) return rejected('REVALIDATION_UNAVAILABLE');
  if (applied.escapedXhtml) {
    // Stored as escaped HTML, the markup is no longer checked by the schema. It is first proved in its element (05)
    // form, in a copy of the normalised tree, by the same validation: the pinned XHTML subset's full content model
    // and attribute types. Anything outside it - or any other new blocking finding - refuses the fix. This is the one
    // extra validation an XHTML correction costs.
    const probe = buildXdm(result.normalized.xml).document;
    if (!writeXhtmlForm(probe, applied.escapedXhtml.textPath, applied.escapedXhtml.markup)) {
      return refused('MALFORMED_MARKUP');
    }
    const xhtmlForm = await attempt(ENCODER.encode(serializeXdm(probe)));
    if (!xhtmlForm) return rejected('REVALIDATION_UNAVAILABLE');
    if (!judgeRevalidation({ ...fix, path }, baseline.findings, xhtmlForm.findings, null).accepted) {
      return refused('TEXT_NOT_IMPORTABLE');
    }
  }
  const xml = serializeXdm(document);
  const after = await attempt(ENCODER.encode(xml));
  if (!after) return rejected('REVALIDATION_UNAVAILABLE');
  const judgement = judgeRevalidation({ ...fix, path }, baseline.findings, after.findings, applied.removed);
  if (!judgement.accepted) return rejected(judgement.reason, judgement.findings);

  const findings = recordPublisherFix(result.findings, fix);
  if (!findings) return refused('AMBIGUOUS_FINDING');
  const marker: PublisherSuppliedValueMarker = {
    ...applied.marker,
    path: fix.path,
    valuePath: ledgerPath(applied.marker.valuePath, state.removals),
    sourcePath: finding.sourcePath ?? null,
  };
  const removals = applied.removed ? [...state.removals, applied.removed] : state.removals;

  // Source identity of the fixed tree: each element keeps the source occurrence it had before the fix; an element
  // the publisher supplied has none of its own and is named as the compact rule would name it.
  const previous = createProvenanceResolver(result.normalized.provenance);
  const before = (element: Element) => pathsBefore.get(element) ?? pathOf(element);
  const provenance = buildProvenanceDto({
    ...result.source,
    document,
    provenance: {
      renamedElementCount:
        result.normalized.provenance.kind === 'RENAMED' ? result.normalized.provenance.renamedElementCount : 0,
      sourcePathOf: (element) => previous.sourcePathOf(before(element)),
      sourceTagOf: (element) => previous.sourceTagOf(before(element)),
    },
    recoveries: [],
    serialize: () => xml,
  });
  let elementCount = 0;
  forEachElementPath(
    document,
    (element) => element.localName,
    () => elementCount++,
  );

  const next: OnixWorkerResult = {
    ...result,
    findings,
    summary: summarise(findings),
    sourceValid: findings.every((f) => !f.counts),
    normalized: {
      xml,
      elementCount,
      recoveries: [...result.normalized.recoveries, marker],
      provenance,
    },
  };
  return {
    kind: 'APPLIED',
    marker,
    state: { result: next, fixes: [...state.fixes, marker], removals, baseline: after, context: state.context },
  };
}
