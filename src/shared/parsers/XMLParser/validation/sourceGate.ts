import { makeFinding, type SourceFinding } from './findings';
import { type PrologScan, type ScanOptions, scanProlog } from './prolog';
import { resolveReleaseFlavour } from './release';
import type { OnixSourceDescriptor } from './types';

export const STOP_TEXT = {
  unsupported: 'STOP after stage 1 (source outside the supported release/flavour boundary)',
  invalidDeclaration: 'STOP after stage 1 (invalid release/flavour declaration)',
  dtd: 'STOP after stage 2 (DOCTYPE/DTD construct); no later tier parsed or evaluated',
  bound: 'STOP after stage 2 (prolog bound exceeded)',
  malformed: 'STOP after stage 2 (not well-formed)',
} as const;

export type SourceGateResult =
  | {
      readonly kind: 'CONTINUE';
      readonly source: OnixSourceDescriptor;
      readonly scan: PrologScan;
    }
  | {
      readonly kind: 'STOP';
      readonly stage: 1 | 2;
      readonly findings: readonly SourceFinding[];
      readonly stopText: string;
      readonly source: OnixSourceDescriptor | null;
      readonly scan: PrologScan;
    };

/**
 * Stages 1 and 2 over the raw text, before Product sizing or any XML parser:
 * release/flavour resolution, then the fail-closed DTD/prolog-bound security
 * decision. A malformed prolog stops here as not well-formed; everything else
 * continues to the hardened well-formedness parse.
 */
export function evaluateSourceGate(text: string, options: ScanOptions = {}): SourceGateResult {
  const scan = scanProlog(text, options);
  const resolution = scan.root ? resolveReleaseFlavour(scan.root) : null;

  if (resolution && resolution.kind !== 'RESOLVED') {
    const unsupported = resolution.kind === 'UNSUPPORTED';
    return {
      kind: 'STOP',
      stage: 1,
      stopText: unsupported ? STOP_TEXT.unsupported : STOP_TEXT.invalidDeclaration,
      source: null,
      scan,
      findings: [
        unsupported
          ? makeFinding({
              id: 'UNSUPPORTED_SOURCE',
              policy: 'P-SUPPORT-RELEASE-FLAVOUR',
              tier: 'RELEASE_FLAVOUR',
              stage: 1,
              scope: 'SUPPORT',
              class: 'PROCESSING_STOP',
              blocking: true,
              message: 'The source is outside the supported ONIX 3.0.8 / 3.1.3 Reference/Short boundary.',
              detail: { reason: resolution.reason, ...resolution.detail },
            })
          : makeFinding({
              id: 'SOURCE_RELEASE_FLAVOUR_INVALID',
              tier: 'RELEASE_FLAVOUR',
              stage: 1,
              scope: 'VALIDITY',
              class: 'SOURCE_INVALID',
              blocking: true,
              message: 'The ONIX release and tag flavour declared by the root element are invalid.',
              detail: { reason: resolution.reason, ...resolution.detail },
            }),
      ],
    };
  }

  const source = resolution ? resolution.source : null;

  if (scan.doctype) {
    const findings = [
      makeFinding({
        id: 'SECURITY_DTD',
        policy: 'P-SECURITY-DTD',
        tier: 'PROLOG',
        stage: 2,
        scope: 'SECURITY',
        class: 'PROCESSING_STOP',
        blocking: true,
        message: 'A DOCTYPE/DTD construct is present; nothing later is parsed or resolved.',
        detail: { ...scan.doctype },
      }),
    ];
    if (source?.release === '3.1') {
      findings.push(
        makeFinding({
          id: 'R-MSG-NO-DOCTYPE-31',
          tier: 'PROLOG',
          stage: 2,
          scope: 'VALIDITY',
          class: 'SOURCE_INVALID',
          blocking: true,
          message: 'ONIX 3.1.3: any DOCTYPE declaration must be removed before the message is made available.',
        }),
      );
    }
    return { kind: 'STOP', stage: 2, stopText: STOP_TEXT.dtd, source, scan, findings };
  }

  if (scan.outcome === 'BOUND_EXCEEDED') {
    return {
      kind: 'STOP',
      stage: 2,
      stopText: STOP_TEXT.bound,
      source,
      scan,
      findings: [
        makeFinding({
          id: 'SECURITY_PROLOG_BOUND',
          tier: 'PROLOG',
          stage: 2,
          scope: 'SECURITY',
          class: 'PROCESSING_STOP',
          blocking: true,
          message: `The prolog does not end within the ${scan.bound}-character scan bound.`,
        }),
      ],
    };
  }

  if (scan.outcome === 'MALFORMED' || !source) {
    return {
      kind: 'STOP',
      stage: 2,
      stopText: STOP_TEXT.malformed,
      source,
      scan,
      findings: [notWellFormed(scan.error ?? 'root element not resolvable')],
    };
  }

  return { kind: 'CONTINUE', source, scan };
}

export function notWellFormed(reason: string, detail: Readonly<Record<string, unknown>> = {}): SourceFinding {
  return makeFinding({
    id: 'SOURCE_NOT_WELL_FORMED',
    tier: 'WELL_FORMEDNESS',
    stage: 2,
    scope: 'VALIDITY',
    class: 'SOURCE_INVALID',
    blocking: true,
    message: 'The source is not well-formed XML.',
    detail: { reason, ...detail },
  });
}
