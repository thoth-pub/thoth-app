import { evaluateXPathToStrings } from 'fontoxpath';

import type { OnixResolvedImportPlan } from '../onixTargetResolution';
import type { FindingTier, OnixWorkerResult, ProvenanceDto, SourceFinding } from '../validation';
import { STOP_TEXT } from '../validation/sourceGate';
import { ONIX_NAMESPACES } from '../validation/types';
import { buildXdm, serializeXdm } from '../validation/xdm';
import type { OnixGateRun, OnixPlanningRun } from './pipeline';
import type {
  OnixContractClassification,
  OnixOutcomeEntry,
  OnixPlannedChapterEntry,
  OnixPlannedWorkEntry,
  OnixPlanningLedger,
  OnixSourceFindingEntry,
  OnixSourceGateLedger,
  OnixSourceGateVerdict,
  OnixSourceProvenanceEntry,
  OnixSourceStopEntry,
  OnixSourceStopKind,
} from './types';

/**
 * The semantic projection of a pipeline run (thoth-app#236): every value a regression fixture asserts, read from the
 * contract's own fields. Messages, generated ids and display text are left out, and nothing is reclassified: each
 * classification is the one the stage that emitted it gave.
 */

/** The gate verdict, from the scopes of the findings that count (see `OnixSourceGateVerdict`). */
export const sourceGateVerdict = (gate: OnixGateRun): OnixSourceGateVerdict => {
  if (gate.permitted) return 'PERMITTED';

  const scopes = new Set(gate.result.findings.filter(({ counts }) => counts).map(({ scope }) => scope));
  if (scopes.has('VALIDITY')) return 'SOURCE_INVALID';
  if (scopes.has('SUPPORT')) return 'SOURCE_UNSUPPORTED';
  if (scopes.has('SECURITY')) return 'SOURCE_REFUSED_SECURITY';

  return 'NOT_PERMITTED';
};

/** The tiers whose findings' `detail` is the structured evidence of a stage-1 or stage-2 stop decision. */
const STOP_EVIDENCE_TIERS: ReadonlySet<FindingTier> = new Set<FindingTier>(['RELEASE_FLAVOUR', 'PROLOG']);

const findingEntry = ({
  id,
  tier,
  scope,
  class: klass,
  blocking,
  projection,
  recoverability,
  counts,
  path,
  sourcePath,
  detail,
}: SourceFinding): OnixSourceFindingEntry => ({
  id,
  tier,
  scope,
  class: klass,
  blocking,
  projection,
  recoverability,
  counts,
  path: path ?? null,
  ...(typeof sourcePath === 'string' ? { sourcePath } : {}),
  ...(STOP_EVIDENCE_TIERS.has(tier) && detail !== undefined ? { detail: { ...detail } } : {}),
});

/** Each stop text the validator stops with, by the `STOP_TEXT` key that names it. */
const STOP_KINDS: ReadonlyMap<string, OnixSourceStopKind> = new Map(
  (Object.keys(STOP_TEXT) as OnixSourceStopKind[]).map((kind) => [STOP_TEXT[kind], kind]),
);

/** Where and why the gate stopped, by name. A stop text no `STOP_TEXT` entry has is a failure, never a guess. */
const stopEntry = (stop: OnixWorkerResult['stop']): OnixSourceStopEntry | null => {
  if (stop === null) return null;

  const kind = STOP_KINDS.get(stop.text);
  if (kind === undefined) throw new Error(`the source gate stopped with a text no STOP_TEXT entry has: ${stop.text}`);

  return { stage: stop.stage, kind };
};

/** The Worker's provenance sidecar, field by field. */
const provenanceEntry = (provenance: ProvenanceDto): OnixSourceProvenanceEntry => {
  const exceptions = (list: Extract<ProvenanceDto, { kind: 'REPOSITIONED' | 'RENAMED' }>['exceptions']) =>
    list.map(({ path, sourcePath, sourceTag }) => ({ path, sourcePath, sourceTag }));

  switch (provenance.kind) {
    case 'IDENTITY':
      return { kind: 'IDENTITY', flavour: provenance.flavour };
    case 'REPOSITIONED':
      return { kind: 'REPOSITIONED', flavour: provenance.flavour, exceptions: exceptions(provenance.exceptions) };
    case 'RENAMED':
      return {
        kind: 'RENAMED',
        flavour: provenance.flavour,
        renamedElementCount: provenance.renamedElementCount,
        referenceToSource: { ...provenance.referenceToSource },
        exceptions: exceptions(provenance.exceptions),
      };
  }
};

export const sourceGateLedger = (gate: OnixGateRun): OnixSourceGateLedger => ({
  verdict: sourceGateVerdict(gate),
  release: gate.result.source?.release ?? null,
  flavour: gate.result.source?.flavour ?? null,
  stop: stopEntry(gate.result.stop),
  findings: gate.result.findings.map(findingEntry),
  recoveries: (gate.result.normalized?.recoveries ?? []).map((marker) => ({
    recovery: marker.recovery,
    path: marker.recovery === 'OMIT_INVALID_COMPOSITE' ? marker.removed : marker.path,
  })),
  provenance: gate.result.normalized === null ? null : provenanceEntry(gate.result.normalized.provenance),
});

/** The Works the executable plan would create, by the values the import writes. */
const plannedWorks = (resolution: OnixResolvedImportPlan | null): OnixPlannedWorkEntry[] =>
  (resolution?.plan?.works ?? []).map((work) => ({
    type: work.type,
    status: work.status,
    doi: work.doi,
    edition: work.edition ?? null,
    publicationDate: work.publicationDate,
    pageCount: work.pageCount,
    titles: work.titles.map(({ canonical, localeCode, fullTitle, title, subtitle }) => ({
      canonical,
      localeCode,
      fullTitle,
      title,
      subtitle,
    })),
    publications: work.publications.map(({ type, isbn }) => ({ type, isbn })),
    contributions: work.contributions.map(({ fullName, type, isMain, orderNumber, orcidId }) => ({
      fullName,
      type,
      isMain,
      orderNumber,
      orcidId,
    })),
    languages: work.languages.map(({ code, relation }) => ({ code, relation })),
    subjects: work.subjects.map(({ type, code, ordinal }) => ({ type, code, ordinal })),
  }));

/** The chapter Works the executable plan would create, by the values the import writes. */
const plannedChapters = (resolution: OnixResolvedImportPlan | null): OnixPlannedChapterEntry[] =>
  (resolution?.plan?.chapters ?? []).map((chapter) => ({
    type: chapter.type,
    fullTitle: chapter.titles.find(({ canonical }) => canonical)?.fullTitle ?? '',
    firstPage: chapter.firstPage,
    lastPage: chapter.lastPage,
    pageCount: chapter.pageCount,
  }));

/**
 * What planning decided under one set of publisher answers. A run whose adapter failed has no resolver sidecar and
 * so no ledger: the uploader stops at that failure, and a fixture must not describe a plan that never existed.
 */
export const planningLedger = (run: OnixPlanningRun): OnixPlanningLedger | null => {
  const sidecar = run.resolution?.sidecar;
  if (sidecar === undefined) return null;

  return {
    executable: run.resolution?.plan != null,
    records: sidecar.records.map(({ index, recordReference, disposition, productKey, action }) => ({
      index,
      recordReference,
      disposition,
      productKey,
      action,
    })),
    products: sidecar.products.map(
      ({ productKey, groupKey, isbn, manifestation, publicationType, action, executable }) => ({
        productKey,
        groupKey,
        isbn,
        manifestation,
        publicationType,
        action,
        executable,
      }),
    ),
    workGroups: sidecar.workGroups.map(({ groupKey, productKeys, target, workType, edition, workDoi, executable }) => ({
      groupKey,
      productKeys,
      target,
      workType,
      edition,
      workDoi,
      executable,
    })),
    blockers: sidecar.blockers.map(({ code, classification, recordKey, productKey, groupKey }) => ({
      code,
      classification,
      recordKey,
      productKey,
      groupKey,
    })),
    findings: (sidecar.findings ?? []).map(
      ({ family, code, classification, blocking, resolution, answer, productKey, groupKey }) => ({
        family,
        code,
        classification,
        blocking,
        resolution: resolution.kind,
        answer: answer.state,
        productKey,
        groupKey,
      }),
    ),
    works: plannedWorks(run.resolution),
    chapters: plannedChapters(run.resolution),
  };
};

/**
 * Every classified outcome of a run in the programme vocabulary, stage by stage: the gate's verdict when it refuses,
 * each resolved manifestation's own classification, each plan blocker and each plan finding. A permitted gate and a
 * manifestation left to a blocker are not outcomes of their own: the blocker that holds them is.
 */
export const outcomeLedger = (gate: OnixSourceGateLedger, planning: OnixPlanningLedger | null): OnixOutcomeEntry[] => {
  const entries: OnixOutcomeEntry[] = [];

  if (gate.verdict === 'SOURCE_INVALID') {
    entries.push({
      stage: 'SOURCE_GATE',
      outcome: 'SOURCE_INVALID',
      code: gate.verdict,
      subject: null,
      blocking: true,
    });
  }

  for (const product of planning?.products ?? []) {
    if (product.manifestation.kind !== 'RESOLVED') continue;
    entries.push({
      stage: 'MANIFESTATION',
      outcome: product.manifestation.classification,
      code: product.manifestation.type,
      subject: product.productKey,
      blocking: false,
    });
  }

  for (const blocker of planning?.blockers ?? []) {
    entries.push({
      stage: 'PLAN_BLOCKER',
      outcome: blocker.classification,
      code: blocker.code,
      subject: blocker.productKey ?? blocker.groupKey,
      blocking: true,
    });
  }

  for (const finding of planning?.findings ?? []) {
    entries.push({
      stage: 'PLAN_FINDING',
      outcome: finding.classification,
      code: `${finding.family}/${finding.code}`,
      subject: finding.productKey ?? finding.groupKey,
      blocking: finding.blocking,
    });
  }

  return entries;
};

/** How many outcomes of each classification a ledger holds; classifications that do not occur are left out. */
export const countOutcomes = (
  entries: readonly OnixOutcomeEntry[],
): Partial<Record<OnixContractClassification, number>> => {
  const counts: Partial<Record<OnixContractClassification, number>> = {};
  for (const { outcome } of entries) counts[outcome] = (counts[outcome] ?? 0) + 1;

  return counts;
};

/**
 * The string values each XPath selects in the normalised Reference source the target side reads, with `onix:` bound
 * to the Reference namespace of the source's release: a Short source is normalised into it, so a Short source that
 * was not would select nothing. Read from the gate's serialised normalised XML, never from the uploaded bytes.
 */
export const normalizedValues = (gate: OnixGateRun, xpaths: readonly string[]): Record<string, readonly string[]> => {
  const normalized = gate.result.normalized;
  if (normalized === null || gate.result.source === null) {
    throw new Error('the source gate produced no normalised source to read');
  }

  const { document } = buildXdm(normalized.xml);
  const namespaceURI = ONIX_NAMESPACES[gate.result.source.release].reference;

  return Object.fromEntries(
    xpaths.map((xpath) => [
      xpath,
      evaluateXPathToStrings(xpath, document, null, null, {
        namespaceResolver: (prefix: string | null) => (prefix === 'onix' ? namespaceURI : null),
      }),
    ]),
  );
};

/**
 * The normalised ONIX message itself: the document element of the normalised XML, serialised, without the prolog
 * (XML declaration, comments) outside it. Two sources normalised to the same canonical message give the same string.
 */
export const normalizedMessage = (gate: OnixGateRun): string => {
  const normalized = gate.result.normalized;
  if (normalized === null) throw new Error('the source gate produced no normalised source to read');

  const message = buildXdm(normalized.xml).document.documentElement;
  if (message === null) throw new Error('the normalised source has no ONIX message');

  return serializeXdm(message);
};
