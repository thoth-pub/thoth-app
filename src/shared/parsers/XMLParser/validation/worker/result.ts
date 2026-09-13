import type { NormalizedOnixSource, OnixSourceValidationResult } from '../validator';
import { forEachElementPath, serializeXdm } from '../xdm';
import type { NormalizedSourceDto, OnixWorkerResult, ProvenanceDto } from './protocol';

/**
 * Projects the in-process #190 result onto the Worker wire contract. The
 * finding ledger, summary, descriptor and recovery markers are already plain
 * data and cross unchanged; the normalised tree is serialised here, from the
 * exact validated (recovered) tree, and its provenance becomes a deterministic
 * sidecar (see `buildProvenanceDto`).
 */
export function toWorkerResult(result: OnixSourceValidationResult): OnixWorkerResult {
  return {
    status: result.status,
    stop: result.stop,
    source: result.source,
    findings: result.findings,
    summary: result.summary,
    sourceValid: result.sourceValid,
    normalized: result.normalized ? toNormalizedSourceDto(result.normalized) : null,
  };
}

export function toNormalizedSourceDto(normalized: NormalizedOnixSource): NormalizedSourceDto {
  let elementCount = 0;
  forEachElementPath(
    normalized.document,
    (element) => element.localName,
    () => elementCount++,
  );
  return {
    xml: serializeXdm(normalized.document),
    elementCount,
    recoveries: normalized.recoveries,
    provenance: buildProvenanceDto(normalized),
  };
}

/**
 * Reference input carries no renaming: source names and paths are the
 * canonical ones (identity). Short input records the consistent canonical
 * name -> source tag map observed in the tree, plus an explicit exception for
 * every element whose source tag or source path the map alone would not
 * reproduce (a name renamed inconsistently, an element that already carried a
 * Reference name, ...), so the reconstruction is exact for every element.
 */
export function buildProvenanceDto(normalized: NormalizedOnixSource): ProvenanceDto {
  if (normalized.flavour === 'reference') return { kind: 'IDENTITY', flavour: 'reference' };
  const { document, provenance } = normalized;
  const sourceTagOf = (element: Parameters<typeof provenance.sourceTagOf>[0]) => provenance.sourceTagOf(element);

  const candidates = new Map<string, string>();
  const ambiguous = new Set<string>();
  forEachElementPath(document, sourceTagOf, (element) => {
    const name = element.localName;
    const source = sourceTagOf(element);
    if (source === name) return;
    const known = candidates.get(name);
    if (known === undefined) candidates.set(name, source);
    else if (known !== source) ambiguous.add(name);
  });
  for (const name of ambiguous) candidates.delete(name);

  const referenceToSource: Record<string, string> = {};
  for (const [name, source] of candidates) referenceToSource[name] = source;
  const predictedName = (name: string) => candidates.get(name) ?? name;
  const exceptions: { path: string; sourcePath: string; sourceTag: string }[] = [];
  forEachElementPath(document, sourceTagOf, (element, path, sourcePath) => {
    const sourceTag = sourceTagOf(element);
    const predictedPath =
      '/' +
      path
        .split('/')
        .filter(Boolean)
        .map((step) => {
          const bracket = step.indexOf('[');
          return predictedName(step.slice(0, bracket)) + step.slice(bracket);
        })
        .join('/');
    if (predictedPath !== sourcePath || predictedName(element.localName) !== sourceTag) {
      exceptions.push({ path, sourcePath, sourceTag });
    }
  });
  return {
    kind: 'RENAMED',
    flavour: 'short',
    renamedElementCount: provenance.renamedElementCount,
    referenceToSource,
    exceptions,
  };
}
