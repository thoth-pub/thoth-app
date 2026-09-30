import type { Element } from 'slimdom';

import type { NormalizedOnixSource, OnixSourceValidationResult } from '../validator';
import { forEachElementPath, serializeXdm } from '../xdm';
import type { NormalizedSourceDto, OnixWorkerResult, ProvenanceDto, ProvenanceException } from './protocol';

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
 * The source identity of every element of the validated (recovered) tree. Its
 * source path is the uploaded occurrence #190's provenance fixed at parse time,
 * so where a recovery removed an element, the same-named siblings after it have
 * a canonical path that differs from their source path.
 *
 * Reference input carries no renaming: the sidecar is IDENTITY only when every
 * canonical path is the source path, and otherwise REPOSITIONED, listing every
 * element whose canonical path is not its source path. Short input records the
 * consistent canonical name -> source tag map observed in the tree, plus an
 * explicit exception for every element whose source tag or source path the map
 * alone would not reproduce (a name renamed inconsistently, an element that
 * already carried a Reference name, a sibling a recovery moved, ...), so the
 * reconstruction is exact for every element.
 */
export function buildProvenanceDto(normalized: NormalizedOnixSource): ProvenanceDto {
  const { document, provenance } = normalized;
  const sourceTagOf = (element: Element) => provenance.sourceTagOf(element);

  const candidates = new Map<string, string>();
  if (normalized.flavour === 'short') {
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
  }

  const predictedName = (name: string) => candidates.get(name) ?? name;
  // Without a renamed name (Reference input), the predicted path is the canonical path itself.
  const predictedPath = (path: string) =>
    candidates.size === 0
      ? path
      : '/' +
        path
          .split('/')
          .filter(Boolean)
          .map((step) => {
            const bracket = step.indexOf('[');
            return predictedName(step.slice(0, bracket)) + step.slice(bracket);
          })
          .join('/');
  const exceptions: ProvenanceException[] = [];
  forEachElementPath(document, sourceTagOf, (element, path) => {
    const sourcePath = provenance.sourcePathOf(element);
    const sourceTag = sourceTagOf(element);
    if (predictedPath(path) !== sourcePath || predictedName(element.localName) !== sourceTag) {
      exceptions.push({ path, sourcePath, sourceTag });
    }
  });

  if (normalized.flavour === 'reference') {
    return exceptions.length
      ? { kind: 'REPOSITIONED', flavour: 'reference', exceptions }
      : { kind: 'IDENTITY', flavour: 'reference' };
  }
  const referenceToSource: Record<string, string> = {};
  for (const [name, source] of candidates) referenceToSource[name] = source;
  return {
    kind: 'RENAMED',
    flavour: 'short',
    renamedElementCount: provenance.renamedElementCount,
    referenceToSource,
    exceptions,
  };
}
