import type { ProvenanceDto } from './protocol';

/**
 * Client-side reconstruction of the source identity of a canonical element
 * from the provenance sidecar (no DOM, no Worker): the original Short tag and
 * the original source-flavour path - its uploaded occurrence, also where a
 * recovery moved it - of the element at a canonical Reference path of the
 * normalised tree, exactly as #190's in-process `XdmProvenance` reports them.
 */
export interface ProvenanceResolver {
  sourcePathOf(canonicalPath: string): string;
  sourceTagOf(canonicalPath: string): string;
}

const STEP = /^([^[]+)\[(\d+)\]$/;

export function createProvenanceResolver(provenance: ProvenanceDto): ProvenanceResolver {
  if (provenance.kind === 'IDENTITY') {
    return {
      sourcePathOf: (path) => path,
      sourceTagOf: (path) => lastStepName(path),
    };
  }
  const exceptions = new Map(provenance.exceptions.map((e) => [e.path, e]));
  // A repositioned Reference source keeps every name: only its listed exceptions differ from their canonical paths.
  const names: Readonly<Record<string, string>> = provenance.kind === 'RENAMED' ? provenance.referenceToSource : {};
  const own = Object.prototype.hasOwnProperty;
  const sourceName = (name: string) => (own.call(names, name) ? names[name] : name);
  return {
    sourcePathOf(path) {
      const exception = exceptions.get(path);
      if (exception) return exception.sourcePath;
      return (
        '/' +
        path
          .split('/')
          .filter(Boolean)
          .map((step) => {
            const match = STEP.exec(step);
            return match ? `${sourceName(match[1])}[${match[2]}]` : step;
          })
          .join('/')
      );
    },
    sourceTagOf(path) {
      const exception = exceptions.get(path);
      return exception ? exception.sourceTag : sourceName(lastStepName(path));
    },
  };
}

function lastStepName(path: string): string {
  const step = path.slice(path.lastIndexOf('/') + 1);
  const match = STEP.exec(step);
  return match ? match[1] : step;
}
