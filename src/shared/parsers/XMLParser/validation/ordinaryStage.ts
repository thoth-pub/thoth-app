import type { Element } from 'slimdom';

import type { SourceFinding } from './findings';
import type { OrdinaryDiagnostic, OrdinaryValidator } from './ordinary';
import { notWellFormed } from './sourceGate';
import type { TagMap } from './tagMap';
import type { OnixRelease, OnixSourceDescriptor } from './types';
import { buildXdm, resolveLibxmlPath, serializeXdm, type Xdm, XdmParseError } from './xdm';

/**
 * Ordinary tiers (thoth#895 stages 2-5):
 * - hardened well-formedness + source-flavour ordinary XSD on the raw bytes;
 * - the XDM tree, renamed Short-to-Reference for Short input;
 * - the canonical structural verdict: the Reference ordinary XSD applied to
 *   the normalised tree (identical to the source-flavour pass for Reference).
 *
 * Every diagnostic is resolved to its node before anything is mutated.
 * Defect kinds follow the SPIKE-02 v4 taint reference: a `TextContent`
 * missing `Text` is RECOVERABLE, an identity-constraint violation is
 * BLOCKING_IDENTITY, everything else BLOCKING.
 */
export type OrdinaryDefectKind = 'RECOVERABLE' | 'BLOCKING_IDENTITY' | 'BLOCKING';

export interface CanonicalDefect {
  readonly kind: OrdinaryDefectKind;
  /** Reported node in the normalised tree; `null` when the path is unresolved. */
  readonly node: Element | null;
  readonly diagnostic: OrdinaryDiagnostic;
  /** Short-schema diagnostics reporting the same node (Short input only). */
  readonly sourceDiagnostics: readonly OrdinaryDiagnostic[];
}

export type ShortArtifactDefect = 'FD-1' | 'FD-2' | 'FD-3' | 'FD-4';

/** A Short-schema diagnostic that the canonical Reference verdict does not reproduce. */
export interface SourceOnlyDefect {
  readonly node: Element | null;
  readonly diagnostic: OrdinaryDiagnostic;
  /** Registered EDItEUR Short-artifact defect, or `null` (blocking flavour/purity defect). */
  readonly artifactDefect: ShortArtifactDefect | null;
}

export type OrdinaryStageResult =
  | { readonly kind: 'STOP'; readonly findings: readonly SourceFinding[] }
  | {
      readonly kind: 'OK';
      readonly xdm: Xdm;
      readonly canonicalDefects: readonly CanonicalDefect[];
      readonly sourceOnly: readonly SourceOnlyDefect[];
    };

export interface OrdinaryStageInput {
  readonly source: OnixSourceDescriptor;
  readonly bytes: Uint8Array;
  readonly text: string;
  readonly sourceValidator: OrdinaryValidator;
  readonly referenceValidator: OrdinaryValidator;
  readonly tagMap: TagMap | null;
}

const parentName = (node: Element) => (node.parentNode as Element | null)?.localName ?? null;

/**
 * SPIKE-02 structural delta register B: the only differences between the
 * ordinary Reference and Short schemas under the tag map, in each of which the
 * Short schema contradicts the Specification.
 */
const SHORT_ARTIFACT_DEFECTS: readonly {
  readonly id: ShortArtifactDefect;
  readonly release: OnixRelease;
  readonly matches: (node: Element) => boolean;
}[] = [
  {
    id: 'FD-1',
    release: '3.0',
    matches: (n) => n.localName === 'SalesOutlet' && ['CoverResource', 'InsertResource'].includes(parentName(n) ?? ''),
  },
  { id: 'FD-2', release: '3.0', matches: (n) => n.localName === 'ConferenceRole' && n.childNodes.length === 0 },
  { id: 'FD-3', release: '3.1', matches: (n) => n.localName === 'ProductSupply' },
  {
    id: 'FD-4',
    release: '3.1',
    matches: (n) => n.localName === 'Affiliation' && parentName(n) === 'ProfessionalAffiliation',
  },
];

export function classifyDefect(node: Element | null, message: string): OrdinaryDefectKind {
  let kind: OrdinaryDefectKind = 'BLOCKING';
  if (
    node &&
    node.localName === 'TextContent' &&
    /Missing child element/.test(message) &&
    !Array.from(node.childNodes).some((c) => c.nodeType === 1 && (c as Element).localName === 'Text')
  ) {
    kind = 'RECOVERABLE';
  }
  if (/Duplicate key-sequence|identity-constraint/i.test(message)) kind = 'BLOCKING_IDENTITY';
  return kind;
}

export function runOrdinaryStage(input: OrdinaryStageInput): OrdinaryStageResult {
  const { source, bytes, text, sourceValidator, referenceValidator, tagMap } = input;
  const sourcePass = sourceValidator.validate(bytes);
  if (!sourcePass.wellFormed) {
    const first = sourcePass.diagnostics[0];
    return {
      kind: 'STOP',
      findings: [
        notWellFormed(first?.message ?? 'not well-formed', {
          parser: 'libxml2',
          line: first?.line ?? null,
          col: first?.col ?? null,
        }),
      ],
    };
  }

  if (source.flavour === 'short' && !tagMap) throw new Error('Short input needs the schema-derived tag map');
  let xdm: Xdm;
  try {
    xdm = buildXdm(
      text,
      source.flavour === 'short' && tagMap
        ? {
            rename: {
              shortToReference: tagMap.shortToReference,
              sourceNamespace: tagMap.shortNamespace,
              targetNamespace: tagMap.referenceNamespace,
            },
          }
        : {},
    );
  } catch (error) {
    if (error instanceof XdmParseError) {
      return { kind: 'STOP', findings: [notWellFormed(error.message, { parser: 'saxes' })] };
    }
    throw error;
  }
  const resolve = (d: OrdinaryDiagnostic) => (d.xpath ? resolveLibxmlPath(xdm.document, d.xpath) : null);

  if (source.flavour === 'reference') {
    return {
      kind: 'OK',
      xdm,
      sourceOnly: [],
      canonicalDefects: sourcePass.diagnostics.map((diagnostic) => {
        const node = resolve(diagnostic);
        return { kind: classifyDefect(node, diagnostic.message), node, diagnostic, sourceDiagnostics: [] };
      }),
    };
  }

  const canonicalPass = referenceValidator.validate(new TextEncoder().encode(serializeXdm(xdm.document)));
  if (!canonicalPass.wellFormed) {
    return {
      kind: 'STOP',
      findings: [notWellFormed('the normalised Reference tree is not well-formed', { parser: 'libxml2' })],
    };
  }
  const canonical = canonicalPass.diagnostics.map((diagnostic) => ({
    diagnostic,
    node: resolve(diagnostic),
    sourceDiagnostics: [] as OrdinaryDiagnostic[],
  }));
  const sourceOnly: SourceOnlyDefect[] = [];
  for (const diagnostic of sourcePass.diagnostics) {
    const node = resolve(diagnostic);
    const reproduced = node ? canonical.find((c) => c.node === node) : undefined;
    if (reproduced) {
      reproduced.sourceDiagnostics.push(diagnostic);
      continue;
    }
    const artifact = node
      ? SHORT_ARTIFACT_DEFECTS.find((fd) => fd.release === source.release && fd.matches(node))
      : undefined;
    sourceOnly.push({ node, diagnostic, artifactDefect: artifact ? artifact.id : null });
  }
  return {
    kind: 'OK',
    xdm,
    sourceOnly,
    canonicalDefects: canonical.map((c) => ({
      kind: classifyDefect(c.node, c.diagnostic.message),
      node: c.node,
      diagnostic: c.diagnostic,
      sourceDiagnostics: c.sourceDiagnostics,
    })),
  };
}
