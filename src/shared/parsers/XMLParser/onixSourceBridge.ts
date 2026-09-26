import { parse } from '@5stones/onix/dist/parse';
import { Document, type Element, type Node } from 'slimdom';

import type { ImportIssue, ImportIssueCode, ImportIssueSource } from '../../types';
import type { TranslateFunction } from '../CSVParser/CSVParser';
import type { ExtendedONIXMessageRoot } from './interfaces';
import type { EnvelopeEvidence, NormalizedSourceDto, OnixWorkerResult, RecoveryMarker, SourceFinding } from './validation';
import { MEGABYTE } from './validation/worker/envelope';
import { createProvenanceResolver, type ProvenanceResolver } from './validation/worker/provenance';
import { buildXdm, serializeXdm } from './validation/xdm';

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

export interface BridgedOnixSource {
  /** The canonical #196 result, retained whole: the authority on the source. */
  readonly canonical: PermittedOnixSource;
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

export function bridgeOnixSource(result: OnixWorkerResult): BridgedOnixSource {
  if (!permitsTargetPlanning(result)) {
    throw new Error('canonical ONIX source validation does not permit target planning for this source');
  }
  return {
    canonical: result,
    provenance: createProvenanceResolver(result.normalized.provenance),
    adapter: parse(toAdapterXml(result.normalized.xml)) as ExtendedONIXMessageRoot,
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
