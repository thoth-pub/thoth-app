import type { Document, Element } from 'slimdom';

import { schematronDisposition, strictDisposition } from './dispositions';
import { decodeSource } from './encoding';
import { type FindingClass, makeFinding, type SourceFinding } from './findings';
import {
  deriveXhtmlElementNames,
  evaluateInventory,
  type InventoryBinding,
  inventoryBindings,
  inventoryOptions,
} from './inventory/inventory';
import { createOrdinaryValidator, type OrdinaryValidator } from './ordinary';
import { runOrdinaryStage } from './ordinaryStage';
import { loadVerifiedResource, ONIX_VALIDATION_RESOURCES, type OnixResourceLoader, resourcesFor } from './resources';
import { SCHEMA_MODELS, type SchemaModel } from './schemaModel';
import { evaluateSchematron, schematronOptions } from './schematron';
import { evaluateSourceGate, notWellFormed, STOP_TEXT } from './sourceGate';
import { applySchemaDefaults, evaluateStrict, strictOptions } from './strict/evaluate';
import { buildRuleset, compileRuleset, type Ruleset, type SchematronReport } from './strict/ruleset';
import { deriveTagMap, type TagMap } from './tagMap';
import {
  applyOrdinaryDefects,
  parseDependencyAst,
  projectDependency,
  type ProjectedDependency,
  projectNative,
  type RecoveryMarker,
} from './taint';
import type { OnixFlavour, OnixRelease, OnixSourceDescriptor } from './types';
import { pathOf, serializeXdm, type XdmProvenance } from './xdm';

/**
 * Canonical ONIX source validation (thoth#895, thoth-app#190):
 *
 * raw bytes -> release/flavour -> fail-closed prolog/DTD security ->
 * source-flavour ordinary XSD -> Short-to-Reference normalisation ->
 * canonical Reference ordinary XSD -> canonical Reference strict assertions ->
 * canonical Reference Schematron -> stage-8 source-rule inventory ->
 * taint/SECONDARY projection + approved recovery overlay ->
 * normalised Reference source + complete finding ledger.
 *
 * Pure and browser-compatible: every standards resource comes from the
 * caller's loader and is verified against its pin before use; nothing is
 * fetched, and no URL inside the publisher's ONIX is ever dereferenced.
 * Source validity is decided here only; target representability is not.
 */
export interface NormalizedOnixSource extends OnixSourceDescriptor {
  /** Canonical Reference tree after the approved recovery; otherwise content-identical to the source. */
  readonly document: Document;
  readonly provenance: XdmProvenance;
  readonly recoveries: readonly RecoveryMarker[];
  serialize(): string;
}

export interface OnixSourceValidationSummary {
  readonly total: number;
  /** Authoritative, unrecovered blocking findings: the source is invalid when this is not 0. */
  readonly blocking: number;
  readonly secondary: number;
  readonly notEvaluable: number;
  readonly recovered: number;
}

export interface OnixSourceValidationResult {
  readonly status: 'STOPPED' | 'COMPLETED';
  readonly stop: { readonly stage: 1 | 2; readonly text: string } | null;
  readonly source: OnixSourceDescriptor | null;
  /** The complete ledger in stage order; nothing is dropped. Serialisable (no DOM nodes). */
  readonly findings: readonly SourceFinding[];
  readonly summary: OnixSourceValidationSummary;
  /** True only for a completed validation without an authoritative blocking finding. */
  readonly sourceValid: boolean;
  readonly normalized: NormalizedOnixSource | null;
}

export interface OnixSourceValidator {
  validate(bytes: Uint8Array): Promise<OnixSourceValidationResult>;
}

export interface OnixSourceValidatorOptions {
  /** Supplies a pinned resource by file name (e.g. a same-origin fetch of /onix-validation/<name>). */
  readonly loadResource: OnixResourceLoader;
}

export function createOnixSourceValidator(options: OnixSourceValidatorOptions): OnixSourceValidator {
  return createConformanceValidator({ loadResource: options.loadResource });
}

/**
 * Conformance entry point (not part of the public module surface): runs the
 * identical pipeline with the exact rule sets of a recorded reference run —
 * a replacement stage-8 binding list and extra Schematron reports — so the
 * frozen SPIKE-02 v4 taint transcripts can be reproduced.
 */
export interface ConformanceOptions extends OnixSourceValidatorOptions {
  readonly inventoryBindings?: readonly InventoryBinding[];
  readonly extraSchematron?: readonly (SchematronReport & { readonly klass: string })[];
}

interface Engine {
  readonly release: OnixRelease;
  readonly flavour: OnixFlavour;
  readonly sourceValidator: OrdinaryValidator;
  readonly referenceValidator: OrdinaryValidator;
  readonly tagMap: TagMap | null;
  readonly model: SchemaModel;
  readonly ruleset: Ruleset;
  readonly schematronClass: ReadonlyMap<string, string>;
  readonly xhtmlElementNames: ReadonlySet<string>;
  readonly bindings: readonly InventoryBinding[];
}

const TEXT = new TextDecoder();

export function createConformanceValidator(options: ConformanceOptions): OnixSourceValidator {
  const verified = new Map<string, Promise<Uint8Array>>();
  const resource = (name: string) => {
    let pending = verified.get(name);
    if (!pending) {
      pending = loadVerifiedResource(options.loadResource, name);
      verified.set(name, pending);
    }
    return pending;
  };
  const engines = new Map<string, Promise<Engine>>();

  async function prepare(release: OnixRelease, flavour: OnixFlavour): Promise<Engine> {
    const selection = resourcesFor(release, flavour);
    const names = [
      selection.referenceOrdinary,
      ...(selection.shortOrdinary ? [selection.shortOrdinary] : []),
      selection.referenceStrict,
      ...selection.shared,
    ];
    const bytes = new Map<string, Uint8Array>();
    for (const name of names) bytes.set(name, await resource(name));
    const text = (name: string) => TEXT.decode(bytes.get(name)!);

    const model = SCHEMA_MODELS[release];
    const pin = ONIX_VALIDATION_RESOURCES.find((r) => r.fileName === selection.referenceOrdinary)!;
    if (model.ordinarySha256 !== pin.sha256) {
      throw new Error(`schema model ${model.release} does not belong to ${pin.fileName}`);
    }
    const referenceValidator = await createOrdinaryValidator(bytes, selection.referenceOrdinary);
    const sourceValidator = selection.shortOrdinary
      ? await createOrdinaryValidator(bytes, selection.shortOrdinary)
      : referenceValidator;
    const tagMap = selection.shortOrdinary
      ? deriveTagMap(text(selection.referenceOrdinary), text(selection.shortOrdinary))
      : null;

    const compiled = compileRuleset(buildRuleset(text(selection.referenceStrict)), model);
    const schemaRelease = release === '3.0' ? '3.0.8' : '3.1.3';
    const schematronClass = new Map<string, string>();
    for (const rules of compiled.byElement.values()) {
      for (const rule of rules) {
        if (!strictDisposition(schemaRelease, rule.id)) throw new Error(`strict rule ${rule.id} has no disposition`);
      }
    }
    for (const report of compiled.schematron) {
      const klass = schematronDisposition(schemaRelease, report.id);
      if (!klass) throw new Error(`Schematron report ${report.id} has no disposition`);
      schematronClass.set(report.id, klass);
    }
    const extra = (options.extraSchematron ?? []).map((report) => {
      schematronClass.set(report.id, report.klass);
      return { ...report, prefixes: compiled.schematron[0]?.prefixes ?? {} };
    });
    const ruleset: Ruleset = extra.length ? { ...compiled, schematron: [...compiled.schematron, ...extra] } : compiled;
    return {
      release,
      flavour,
      sourceValidator,
      referenceValidator,
      tagMap,
      model,
      ruleset,
      schematronClass,
      xhtmlElementNames: deriveXhtmlElementNames(text('ONIX_XHTML_Subset.xsd')),
      bindings: (options.inventoryBindings ?? inventoryBindings(release)).filter((b) => b.releases.includes(release)),
    };
  }

  const engineFor = (source: OnixSourceDescriptor) => {
    const key = `${source.release}/${source.flavour}`;
    let engine = engines.get(key);
    if (!engine) {
      engine = prepare(source.release, source.flavour);
      engines.set(key, engine);
      engine.catch(() => engines.delete(key));
    }
    return engine;
  };

  return {
    async validate(bytes) {
      const decoded = decodeSource(bytes);
      if (decoded.kind === 'UNSUPPORTED_ENCODING') {
        return stopped(1, STOP_TEXT.unsupported, null, [
          makeFinding({
            id: 'UNSUPPORTED_SOURCE',
            tier: 'RELEASE_FLAVOUR',
            stage: 1,
            scope: 'SUPPORT',
            class: 'PROCESSING_STOP',
            blocking: true,
            message: 'The source encoding is outside the supported UTF-8 / UTF-16 boundary.',
            detail: { reason: 'UNSUPPORTED_ENCODING', declared: decoded.declared },
          }),
        ]);
      }
      if (decoded.kind === 'MALFORMED') return stopped(2, STOP_TEXT.malformed, null, [notWellFormed(decoded.reason)]);

      const gate = evaluateSourceGate(decoded.text);
      if (gate.kind === 'STOP') return stopped(gate.stage, gate.stopText, gate.source, gate.findings);
      const { source, scan } = gate;
      const engine = await engineFor(source);
      const ordinary = runOrdinaryStage({
        source,
        bytes,
        text: decoded.text,
        sourceValidator: engine.sourceValidator,
        referenceValidator: engine.referenceValidator,
        tagMap: engine.tagMap,
      });
      if (ordinary.kind === 'STOP') return stopped(2, STOP_TEXT.malformed, source, ordinary.findings);

      const { xdm } = ordinary;
      const { document, provenance } = xdm;
      const short = source.flavour === 'short';
      const sourcePath = (node: Element | null) => (short && node ? provenance.sourcePathOf(node) : undefined);
      const defaults = applySchemaDefaults(document, engine.model);

      const sourceOnlyBlocking = ordinary.sourceOnly.filter((d) => !d.artifactDefect);
      const { taint, defects, recoveries } = applyOrdinaryDefects(
        document,
        [
          ...ordinary.canonicalDefects.map((d) => ({
            kind: d.kind,
            node: d.node,
            message: d.diagnostic.message,
            xpath: d.diagnostic.xpath,
          })),
          ...sourceOnlyBlocking.map((d) => ({
            kind: 'BLOCKING' as const,
            node: d.node,
            message: d.diagnostic.message,
            xpath: d.diagnostic.xpath,
          })),
        ],
        engine.model,
        source.release,
      );

      const findings: SourceFinding[] = [];
      // Stage 3: Short-schema diagnostics the canonical verdict does not reproduce.
      for (const defect of ordinary.sourceOnly.filter((d) => d.artifactDefect)) {
        findings.push(
          makeFinding({
            id: 'SHORT_SCHEMA_ARTIFACT_DEFECT',
            tier: 'SOURCE_ORDINARY',
            stage: 3,
            scope: 'VALIDITY',
            class: 'ARTIFACT_DEFECT',
            blocking: false,
            path: defect.node ? pathOf(defect.node) : null,
            sourcePath: sourcePath(defect.node),
            message: defect.diagnostic.message,
            detail: { artifactDefect: defect.artifactDefect, xpath: defect.diagnostic.xpath },
          }),
        );
      }
      const canonicalCount = ordinary.canonicalDefects.length;
      sourceOnlyBlocking.forEach((defect, i) => {
        const applied = defects[canonicalCount + i];
        findings.push(
          makeFinding({
            id: 'SOURCE_FLAVOUR_XSD_INVALID',
            tier: 'SOURCE_ORDINARY',
            stage: 3,
            scope: 'VALIDITY',
            class: 'SOURCE_INVALID',
            blocking: true,
            path: applied.resolvedPath,
            sourcePath: sourcePath(defect.node),
            message: defect.diagnostic.message,
            detail: {
              kind: 'BLOCKING',
              xpath: defect.diagnostic.xpath,
              line: defect.diagnostic.line,
              taint: applied.taint,
            },
          }),
        );
      });
      // Stage 5: canonical Reference ordinary verdict.
      ordinary.canonicalDefects.forEach((defect, i) => {
        const applied = defects[i];
        findings.push(
          makeFinding({
            id: 'ORDINARY_XSD_INVALID',
            tier: 'CANONICAL_ORDINARY',
            stage: 5,
            scope: 'VALIDITY',
            class: 'SOURCE_INVALID',
            blocking: true,
            recoverability: defect.kind === 'RECOVERABLE' ? 'OMIT_INVALID_COMPOSITE' : 'NOT_RECOVERABLE',
            path: applied.resolvedPath,
            sourcePath: sourcePath(defect.node),
            message: defect.diagnostic.message,
            detail: {
              kind: defect.kind,
              xpath: defect.diagnostic.xpath,
              line: defect.diagnostic.line,
              col: defect.diagnostic.col,
              taint: applied.taint,
              ...(defect.sourceDiagnostics.length
                ? { sourceDiagnostics: defect.sourceDiagnostics.map((d) => ({ message: d.message, xpath: d.xpath })) }
                : {}),
            },
          }),
        );
      });

      const schemaRelease = source.schemaRelease;
      const later = (
        tier: 'STRICT' | 'SCHEMATRON' | 'INVENTORY',
        stage: 6 | 7 | 8,
        id: string,
        klass: FindingClass,
        path: string,
        node: Element | null,
        message: string,
        projection: ProjectedDependency,
        detail: Record<string, unknown>,
      ) =>
        makeFinding({
          id,
          tier,
          stage,
          scope: 'VALIDITY',
          class: klass,
          blocking: klass === 'NORMATIVE_INVALID',
          projection: projection.disposition,
          path,
          sourcePath: sourcePath(node),
          message,
          detail: {
            ...detail,
            dependency: {
              fallback: projection.fallback,
              paths: projection.paths,
              taintedDependencies: projection.taintedDependencies,
            },
          },
        });

      // Stage 6: canonical Reference strict assertions.
      const strictResolver = strictOptions(engine.ruleset).namespaceResolver;
      for (const f of evaluateStrict(engine.ruleset, document).findings) {
        const [tableClass, authorityKind, artifactDefect] = strictDisposition(schemaRelease, f.id)!;
        const klass: FindingClass = f.dynamicError ? 'RULE_NOT_EVALUABLE' : tableClass;
        const projection = projectDependency(
          f.node,
          f.rule.ast,
          document,
          strictResolver,
          taint,
          klass === 'RULE_NOT_EVALUABLE',
        );
        findings.push(
          later('STRICT', 6, f.id, klass, f.path, f.node, f.message, projection, {
            authorityKind,
            artifactDefect,
            ruleSource: f.source,
            ...(f.dynamicError ? { error: f.dynamicError } : {}),
          }),
        );
      }

      // Stage 7: canonical Reference Schematron.
      const schematronAst = new Map<SchematronReport, Element | null>();
      for (const f of evaluateSchematron(engine.ruleset, document)) {
        const tableClass = engine.schematronClass.get(f.id) as FindingClass;
        const common = { role: f.report.role };
        if (f.notEvaluable?.phase === 'context' || !f.node) {
          findings.push(
            later('SCHEMATRON', 7, f.id, 'RULE_NOT_EVALUABLE', '/', null, f.report.text, NO_DEPENDENCY_NOT_EVALUABLE, {
              ...common,
              phase: 'context',
              error: f.notEvaluable?.error ?? null,
            }),
          );
          continue;
        }
        let ast = schematronAst.get(f.report);
        if (ast === undefined) {
          ast = parseDependencyAst(f.report.test);
          schematronAst.set(f.report, ast);
        }
        const klass: FindingClass = f.notEvaluable ? 'RULE_NOT_EVALUABLE' : tableClass;
        const resolver = schematronOptions(f.report).namespaceResolver;
        const projection = projectDependency(f.node, ast, document, resolver, taint, klass === 'RULE_NOT_EVALUABLE');
        findings.push(
          later(
            'SCHEMATRON',
            7,
            f.id,
            klass,
            f.path,
            f.node.nodeType === 1 ? (f.node as Element) : null,
            f.report.text,
            projection,
            {
              ...common,
              ...(f.notEvaluable ? { phase: 'test', error: f.notEvaluable.error } : {}),
            },
          ),
        );
      }

      // Stage 8: centralized source-rule inventory.
      const inventoryResolver = inventoryOptions(source.release).namespaceResolver;
      const bindingAst = new Map<InventoryBinding, Element | null>();
      for (const f of evaluateInventory(
        document,
        source.release,
        { xmlDeclaration: scan.xmlDecl, xhtmlElementNames: engine.xhtmlElementNames },
        engine.bindings,
      )) {
        const klass: FindingClass = f.error ? 'RULE_NOT_EVALUABLE' : f.disposition;
        let projection: ProjectedDependency;
        if ('native' in f.binding) {
          projection = projectNative(f.node, f.binding.dependency, document, taint, !!f.error);
        } else {
          let ast = bindingAst.get(f.binding);
          if (ast === undefined) {
            ast = parseDependencyAst(f.binding.xpath);
            bindingAst.set(f.binding, ast);
          }
          projection = projectDependency(f.node, f.error ? null : ast, document, inventoryResolver, taint, !!f.error);
        }
        const binding = f.binding as InventoryBinding & {
          authority?: string;
          authority_class?: string;
          basis?: string;
        };
        findings.push(
          later('INVENTORY', 8, f.id, klass, f.path, f.node, binding.authority ?? binding.basis ?? '', projection, {
            ...(binding.authority_class ? { authorityClass: binding.authority_class } : {}),
            ...(binding.basis ? { basis: binding.basis } : {}),
            ...(f.error ? { error: f.error } : {}),
          }),
        );
      }

      defaults.revert();
      return {
        status: 'COMPLETED',
        stop: null,
        source,
        findings,
        summary: summarise(findings),
        sourceValid: findings.every((f) => !f.counts),
        normalized: {
          ...source,
          document,
          provenance,
          recoveries,
          serialize: () => serializeXdm(document),
        },
      };
    },
  };
}

const NO_DEPENDENCY_NOT_EVALUABLE: ProjectedDependency = {
  disposition: 'NOT_EVALUABLE',
  fallback: null,
  paths: [],
  taintedDependencies: [],
};

function summarise(findings: readonly SourceFinding[]): OnixSourceValidationSummary {
  return {
    total: findings.length,
    blocking: findings.filter((f) => f.counts).length,
    secondary: findings.filter((f) => f.projection === 'SECONDARY').length,
    notEvaluable: findings.filter((f) => f.class === 'RULE_NOT_EVALUABLE').length,
    recovered: findings.filter((f) => f.recoverability !== 'NOT_RECOVERABLE').length,
  };
}

function stopped(
  stage: 1 | 2,
  text: string,
  source: OnixSourceDescriptor | null,
  findings: readonly SourceFinding[],
): OnixSourceValidationResult {
  return {
    status: 'STOPPED',
    stop: { stage, text },
    source,
    findings,
    summary: summarise(findings),
    sourceValid: false,
    normalized: null,
  };
}
