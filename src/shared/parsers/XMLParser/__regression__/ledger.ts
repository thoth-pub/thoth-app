import { evaluateXPathToStrings } from 'fontoxpath';

import type { WorkEntity } from '@/src/entities/work/model/work.types';
import type {
  OnixAccessibilityCandidate,
  OnixAdditionalResourceCandidate,
  OnixAdditionalResourceTarget,
  OnixComponentHierarchy,
  OnixComponentIntent,
  OnixComponentOrdinal,
  OnixImportPlanSidecar,
  OnixPlannedReference,
  OnixPriceCandidate,
  OnixPriceDecision,
  OnixRelationEndpoint,
  OnixReviewCandidate,
  OnixReviewsPrizesCandidates,
  OnixReviewsPrizesOrdering,
  OnixSourceLocation,
} from '@/src/shared/types/onixPlanning';
import type { ImportPlan, ImportRelationEndpoint } from '@/src/shared/types/parsers';

import type { OnixValueDecision } from '../onixDescriptive';
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
  OnixTargetAccessibilityEntry,
  OnixTargetCollateralEntry,
  OnixTargetCommercialEntry,
  OnixTargetComponentEntry,
  OnixTargetComponentHierarchy,
  OnixTargetComponentOrdinal,
  OnixTargetDescriptiveEntry,
  OnixTargetIdentityEntry,
  OnixTargetLedger,
  OnixTargetOrdering,
  OnixTargetPlanEntry,
  OnixTargetPlannedWorkEntry,
  OnixTargetPlanWorkRef,
  OnixTargetPriceCandidateEntry,
  OnixTargetPriceDecisionEntry,
  OnixTargetReferenceEntry,
  OnixTargetRelatedMaterialEntry,
  OnixTargetRelationEndpoint,
  OnixTargetReviewCandidateEntry,
  OnixTargetReviewsPrizesEntry,
  OnixTargetRightsEntry,
  OnixTargetValueDecision,
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

/* ------------------------------------------------------------------------------------------------ */
/* The target ledger (thoth-app#249)                                                                 */
/* ------------------------------------------------------------------------------------------------ */

/** A reduction the resolver was given is always in its sidecar; a sidecar without it is a failure, never "empty". */
const required = <T>(value: T | undefined, name: string): T => {
  if (value === undefined) throw new Error(`the resolver sidecar carries no ${name}`);

  return value;
};

/** Each Product- or group-keyed record entry, in the order the sidecar lists those keys. */
const inOrder = <T>(record: Readonly<Record<string, T>>, keys: readonly string[]): T[] =>
  keys.flatMap((key) => (record[key] === undefined ? [] : [record[key]]));

const pathsOf = (locations: readonly OnixSourceLocation[]): string[] => locations.map(({ path }) => path);

const datesOf = (dates: readonly { role: string; date: string }[]) => dates.map(({ role, date }) => ({ role, date }));

const valueDecision = (decision: OnixValueDecision<string | number>): OnixTargetValueDecision => {
  switch (decision.kind) {
    case 'ABSENT':
      return { kind: 'ABSENT' };
    case 'VALUE':
      return { kind: 'VALUE', value: decision.value };
    case 'CHOICE':
      return {
        kind: 'CHOICE',
        findingKey: decision.findingKey,
        options: decision.options.map(({ key, value }) => ({ key, value })),
      };
    case 'BLOCKED':
      return { kind: 'BLOCKED', findingKeys: [...decision.findingKeys] };
  }
};

const identityEntry = (run: OnixPlanningRun, sidecar: OnixImportPlanSidecar): OnixTargetIdentityEntry => {
  const edgesByGroup = new Map(run.sourcePlan.groups.map(({ groupKey, edges }) => [groupKey, edges]));

  return {
    compatibility: {
      headerMatches: sidecar.compatibility.headerMatches,
      ignoredNativeRecordKeys: [...sidecar.compatibility.ignoredNativeRecordKeys],
      activation: sidecar.compatibility.activation,
    },
    groups: sidecar.workGroups.map(({ groupKey, compatibility, thothVerification, evidence }) => ({
      groupKey,
      compatibility,
      thothVerification,
      edges: (edgesByGroup.get(groupKey) ?? []).map((edge) =>
        edge.kind === 'WORK_IDENTITY'
          ? { kind: edge.kind, key: edge.key, productKeys: [...edge.productKeys] }
          : { kind: edge.kind, from: edge.from, to: edge.to, path: edge.path },
      ),
      evidence: evidence.map((entry) => ({ ...entry })),
    })),
    products: sidecar.products.map(({ productKey, recordKeys, evidence, omittable }) => ({
      productKey,
      recordKeys: [...recordKeys],
      evidence: evidence.map((entry) => ({ ...entry })),
      omittable: omittable ?? null,
    })),
  };
};

const descriptiveEntries = (run: OnixPlanningRun, sidecar: OnixImportPlanSidecar): OnixTargetDescriptiveEntry[] =>
  sidecar.workGroups.map(({ groupKey }) => {
    const group = run.descriptive.groups[groupKey];
    if (group === undefined) throw new Error(`the descriptive reduction has no Work group ${groupKey}`);
    const { status, publicationDate, withdrawnDate } = group.lifecycle;

    return {
      groupKey,
      subjects: group.subjects.subjects.map(({ type, code, main, namespace, provenance }) => ({
        type,
        code,
        main,
        namespace,
        sources: provenance.map(({ path, scheme, schemeVersion, valueSource, main: sourceMain }) => ({
          path,
          scheme,
          schemeVersion,
          valueSource,
          main: sourceMain,
        })),
      })),
      primaryChoices: group.subjects.primaryChoices.map(({ type }) => type),
      series: group.series.memberships.map((membership) => ({
        key: membership.key,
        name: membership.name,
        issns: [...membership.issns],
        thothSeriesId: membership.thothSeriesId,
        ordinal: membership.ordinal,
        issueNumber: membership.issueNumber,
        classificationFindingKey: membership.classificationFindingKey,
        ordinalFindingKey: membership.ordinalFindingKey,
        paths: pathsOf(membership.provenance),
      })),
      noCollection: group.series.noCollection,
      lifecycle: {
        status:
          status.kind === 'VALUE'
            ? { kind: 'VALUE', status: status.status }
            : status.kind === 'CHOICE'
              ? { kind: 'CHOICE', findingKey: status.findingKey }
              : { kind: 'BLOCKED', findingKeys: [...status.findingKeys] },
        publicationDate,
        withdrawnDate,
      },
      cover: valueDecision(group.cover),
      profileCover: valueDecision(group.profileCover),
    };
  });

const priceCandidate = (candidate: OnixPriceCandidate): OnixTargetPriceCandidateEntry => ({
  key: candidate.key,
  path: candidate.path,
  currencyCode: candidate.currencyCode,
  amount: candidate.amount,
  unitPrice: candidate.unitPrice,
  priceType: candidate.priceType,
  exclusions: [...candidate.exclusions],
  lost: [...candidate.lost],
});

const priceDecision = (decision: OnixPriceDecision): OnixTargetPriceDecisionEntry => {
  switch (decision.kind) {
    case 'SET':
      return {
        kind: 'SET',
        currencyCode: decision.currencyCode,
        unitPrice: decision.unitPrice,
        paths: pathsOf(decision.locations),
        findingKey: decision.findingKey,
      };
    case 'DEFAULT_WITH_ALTERNATIVES':
      return {
        kind: 'DEFAULT_WITH_ALTERNATIVES',
        currencyCode: decision.currencyCode,
        unitPrice: decision.unitPrice,
        paths: pathsOf(decision.locations),
        alternatives: decision.alternatives.map(priceCandidate),
        findingKey: decision.findingKey,
      };
    case 'CHOICE_REQUIRED':
      return {
        kind: 'CHOICE_REQUIRED',
        reason: decision.reason,
        currencyCode: decision.currencyCode,
        candidates: decision.candidates.map(priceCandidate),
        paths: pathsOf(decision.locations),
        findingKey: decision.findingKey,
      };
  }
};

const commercialEntries = (sidecar: OnixImportPlanSidecar): OnixTargetCommercialEntry[] =>
  inOrder(
    required(sidecar.commercial, 'commercial reduction').products,
    sidecar.products.map(({ productKey }) => productKey),
  ).map((product) => ({
    productKey: product.productKey,
    supplies: product.supplies.map((supply) => ({
      path: supply.path,
      marketPublishingStatus: supply.marketPublishing?.status ?? null,
      marketDates: datesOf(supply.marketPublishing?.dates ?? []),
      supplyDetails: supply.supplyDetails.map((detail) => ({
        path: detail.path,
        supplierRole: detail.supplier?.role ?? null,
        supplierName: detail.supplier?.name ?? null,
        availability: detail.availability,
        supplyDates: datesOf(detail.supplyDates),
        unpricedItemType: detail.unpricedItemType,
        prices: detail.prices.map((price) => ({
          path: price.path,
          type: price.type.value,
          amount: price.amount,
          currency: price.currency.value,
        })),
      })),
    })),
    prices: product.prices.map(priceDecision),
    carriers: Object.fromEntries(
      Object.entries(product.carriers).map(([carrier, { location }]) => [
        carrier,
        location.kind === 'CANONICAL'
          ? {
              kind: 'CANONICAL',
              landingPage: location.candidate.landingPage,
              fullTextUrl: location.candidate.fullTextUrl,
              platform: location.candidate.platform,
            }
          : { kind: location.kind },
      ]),
    ),
    plannedLocations: product.plannedLocations.map((location) => ({
      landingPage: location.landingPage,
      fullTextUrl: location.fullTextUrl,
      platform: location.platform,
      suppliers: location.suppliers.map(({ name }) => name),
      carriers: Object.fromEntries(Object.entries(location.carriers).map(([carrier, { role }]) => [carrier, role])),
    })),
  }));

const rightsEntry = (sidecar: OnixImportPlanSidecar): OnixTargetRightsEntry => {
  const rights = required(sidecar.rights, 'rights reduction');

  return {
    products: inOrder(
      rights.products,
      sidecar.products.map(({ productKey }) => productKey),
    ).map((product) => ({
      productKey: product.productKey,
      carrier: product.carrier,
      expressions: product.licences.flatMap(({ expressions }) =>
        expressions.map(({ path, type, role, identity, link }) => ({ path, type, role, identity, link })),
      ),
      licence:
        product.licence.kind === 'CONFLICT'
          ? { kind: 'CONFLICT', identities: [...product.licence.identities] }
          : { ...product.licence },
      dated: product.dated,
      technicalProtection: product.technicalProtection.map(({ code }) => code),
      technicalProtectionState: product.technicalProtectionState,
      usageConstraints: product.usageConstraints.map(({ path, type, status, limits }) => ({
        path,
        type,
        status,
        limits: limits.map(({ quantity, unit }) => ({ quantity, unit })),
      })),
      deferredRights: product.deferredRights.map(({ path, scope, element }) => ({ path, scope, element })),
    })),
    groups: inOrder(
      rights.groups,
      sidecar.workGroups.map(({ groupKey }) => groupKey),
    ).map(({ groupKey, licence }) => ({
      groupKey,
      licence:
        licence.kind === 'SET_SUPPORTED_LICENSE'
          ? {
              kind: licence.kind,
              identity: licence.identity,
              url: licence.url,
              productKeys: [...licence.productKeys],
              paths: pathsOf(licence.locations),
            }
          : licence.kind === 'BLOCKED'
            ? { kind: licence.kind, findingKeys: [...licence.findingKeys] }
            : { kind: licence.kind },
    })),
    licenceActions: required(sidecar.licenceActions, 'licence actions').map(({ groupKey, action }) => ({
      groupKey,
      action:
        action.kind === 'OMIT_WITH_ACKNOWLEDGED_LOSS'
          ? { kind: action.kind, findingKeys: [...action.findingKeys] }
          : { ...action },
    })),
    acknowledgedFindingKeys: [...required(sidecar.acknowledgedRightsFindingKeys, 'rights acknowledgements')],
  };
};

const candidateValues = (candidates: readonly OnixAccessibilityCandidate[]): string[] =>
  candidates.map(({ value }) => value);

const accessibilityEntry = (sidecar: OnixImportPlanSidecar): OnixTargetAccessibilityEntry => {
  const productKeys = sidecar.products.map(({ productKey }) => productKey);
  const attributes = (stated: { datestamp: string | null; sourceName: string | null; sourceType: string | null }) => ({
    datestamp: stated.datestamp,
    sourceName: stated.sourceName,
    sourceType: stated.sourceType,
  });

  return {
    products: inOrder(required(sidecar.accessibility, 'accessibility reduction').products, productKeys).map(
      (product) => ({
        productKey: product.productKey,
        features: product.features.map((feature) => ({
          path: feature.path,
          type: feature.type,
          value: feature.value,
          role: feature.role,
          attributes: attributes(feature.attributes),
          typeAttributes: feature.typeElement === null ? null : attributes(feature.typeElement.attributes),
          valueAttributes: feature.valueElement === null ? null : attributes(feature.valueElement.attributes),
          descriptions: feature.descriptions.map(({ text, language, attributes: stated }) => ({
            text,
            language,
            attributes: attributes(stated),
          })),
        })),
        primaryStandards: candidateValues(product.primaryStandards),
        additionalStandards: candidateValues(product.additionalStandards),
        exceptions: candidateValues(product.exceptions),
        reportUrls: candidateValues(product.reportUrls),
        publications: Object.values(product.publications).map((publication) => ({
          publicationType: publication.publicationType,
          scope: publication.scope,
          additionalStandards: candidateValues(publication.additionalStandards),
          incompatibleAdditionalStandards: candidateValues(publication.incompatibleAdditionalStandards),
        })),
      }),
    ),
    contacts: inOrder(required(sidecar.salesRights, 'sales-rights reduction').products, productKeys).flatMap(
      ({ productKey, productContacts }) =>
        productContacts.map(({ path, role, scope }) => ({ productKey, path, role, scope: scope.kind })),
    ),
    actions: required(sidecar.accessibilityActions, 'accessibility actions').map((action) => ({
      productKey: action.productKey,
      publicationType: action.publicationType,
      resolved: action.resolved === null ? null : { ...action.resolved },
      sources: action.sources.map(({ field, value, basis, codes }) => ({ field, value, basis, codes: [...codes] })),
      omitted: action.omitted.map(({ field, value, reason, codes }) => ({ field, value, reason, codes: [...codes] })),
      action: action.action.kind,
    })),
  };
};

const componentOrdinal = (ordinal: OnixComponentOrdinal): OnixTargetComponentOrdinal =>
  ordinal.status === 'RESOLVED'
    ? { status: 'RESOLVED', ordinal: ordinal.ordinal, basis: ordinal.basis }
    : { status: 'UNRESOLVED' };

const componentHierarchy = (hierarchy: OnixComponentHierarchy | null): OnixTargetComponentHierarchy =>
  hierarchy === null
    ? null
    : { raw: hierarchy.raw, levels: [...hierarchy.levels], acknowledged: hierarchy.acknowledged };

const componentEntry = (intent: OnixComponentIntent): OnixTargetComponentEntry => {
  const base = {
    path: intent.path,
    productKey: intent.productKey,
    groupKey: intent.groupKey,
    position: intent.position,
  };

  switch (intent.kind) {
    case 'BOOK_CHAPTER':
      return {
        ...base,
        kind: intent.kind,
        matter: intent.matter,
        ordinal: componentOrdinal(intent.ordinal),
        hierarchy: componentHierarchy(intent.hierarchy),
        doi: intent.doi,
        pages:
          intent.pages.status === 'RESOLVED'
            ? {
                status: 'RESOLVED',
                firstPage: intent.pages.firstPage,
                lastPage: intent.pages.lastPage,
                basis: intent.pages.basis,
              }
            : { status: intent.pages.status },
        pageCount: intent.pageCount,
        inherited: [...intent.inherited.fields],
        action: intent.action,
      };
    case 'CONTAINED_WORK':
      return {
        ...base,
        kind: intent.kind,
        workType:
          intent.workType.status === 'RESOLVED'
            ? { status: 'RESOLVED', type: intent.workType.type }
            : { status: 'UNRESOLVED' },
        imprint:
          intent.imprint.status === 'RESOLVED'
            ? { status: 'RESOLVED', imprintId: intent.imprint.imprintId }
            : { status: 'UNRESOLVED' },
        edition: intent.edition.edition,
        lifecycle: {
          status: intent.lifecycle.status,
          publicationDate: intent.lifecycle.publicationDate,
          withdrawnDate: intent.lifecycle.withdrawnDate,
          replacement: intent.lifecycle.replacement,
        },
        ordinal: componentOrdinal(intent.ordinal),
        hierarchy: componentHierarchy(intent.hierarchy),
        doi: intent.doi,
        pageCount: intent.pageCount,
        action: intent.action,
      };
    case 'AV_ITEM':
      return { ...base, kind: intent.kind, avItemType: intent.avItemType, action: intent.action };
    case 'UNSUPPORTED':
      return { ...base, kind: intent.kind, textItemType: intent.textItemType, action: intent.action };
  }
};

/** A relation end by group key or exact existing Work: a planned Work's adapter-generated id is never projected. */
const relationEndpoint = (endpoint: OnixRelationEndpoint): OnixTargetRelationEndpoint =>
  endpoint.kind === 'PLANNED_WORK'
    ? { kind: 'PLANNED_WORK', groupKey: endpoint.groupKey }
    : { kind: 'EXISTING_WORK', workId: endpoint.workId, groupKey: endpoint.groupKey, imprintId: endpoint.imprintId };

const referenceEntry = (reference: OnixPlannedReference): OnixTargetReferenceEntry => ({
  referenceOrdinal: reference.referenceOrdinal,
  doi: reference.doi,
  unstructuredCitation: reference.unstructuredCitation,
  isbn: reference.isbn,
  issn: reference.issn,
  paths: pathsOf(reference.locations),
});

const relatedMaterialEntry = (sidecar: OnixImportPlanSidecar): OnixTargetRelatedMaterialEntry => {
  const related = required(sidecar.relatedMaterial, 'RelatedMaterial reduction');

  return {
    outcomes: related.outcomes.map((outcome) => ({
      declarationKey: outcome.declarationKey,
      path: outcome.path,
      productKey: outcome.productKey,
      construct: outcome.construct,
      code: outcome.code,
      outcome: outcome.outcome,
      endpoint: outcome.endpoint === null ? null : relationEndpoint(outcome.endpoint),
      relationType: outcome.relationType,
      edgeKey: outcome.edgeKey,
    })),
    edges: related.edges.map((edge) => ({
      edgeKey: edge.edgeKey,
      relator: relationEndpoint(edge.relator),
      related: relationEndpoint(edge.related),
      relationType: edge.relationType,
      basis: edge.basis,
      declarationKeys: [...edge.declarationKeys],
      ordinal:
        edge.ordinal.status === 'ASSIGNED'
          ? { status: 'ASSIGNED', ordinal: edge.ordinal.ordinal, after: edge.ordinal.after }
          : edge.ordinal.status === 'EXISTING'
            ? { status: 'EXISTING', ordinal: edge.ordinal.ordinal }
            : { status: 'UNASSIGNED' },
      state: edge.state,
    })),
    productReferences: related.productReferences.map(({ productKey, asserted, references }) => ({
      productKey,
      asserted,
      references: references.map(referenceEntry),
    })),
    referenceActions: related.referenceActions.map(({ groupKey, action }) => ({
      groupKey,
      action:
        action.kind === 'CREATE'
          ? {
              kind: 'CREATE',
              productKey: action.productKey,
              referenceOrdinals: action.references.map(({ referenceOrdinal }) => referenceOrdinal),
            }
          : { kind: action.kind },
    })),
  };
};

const resourceTarget = (target: OnixAdditionalResourceTarget): OnixAdditionalResourceTarget => ({
  title: target.title,
  description: target.description,
  attribution: target.attribution,
  resourceType: target.resourceType,
  url: target.url,
  date: target.date,
});

const resourceCandidate = (candidate: OnixAdditionalResourceCandidate) => ({
  groupKey: candidate.groupKey,
  componentPath: candidate.componentPath,
  productKeys: [...candidate.productKeys],
  contentType: candidate.contentType,
  modes: [...candidate.modes],
  form: candidate.form,
  audiences: [...candidate.audiences],
  target: resourceTarget(candidate.target),
  reasons: [...candidate.reasons],
  decisionFindingKey: candidate.decisionFindingKey,
});

const collateralEntry = (sidecar: OnixImportPlanSidecar): OnixTargetCollateralEntry => {
  const collateral = required(sidecar.collateral, 'collateral reduction');
  const products = inOrder(
    collateral.plan.products,
    sidecar.products.map(({ productKey }) => productKey),
  );

  return {
    textContents: products.flatMap(({ textContents }) =>
      textContents.map((text) => ({
        path: text.path,
        productKey: text.productKey,
        scope: text.scope.kind,
        textType: text.textType,
        role: text.role,
        audiences: [...text.audiences],
        redacted: text.redacted,
      })),
    ),
    resources: products.flatMap(({ resources }) =>
      resources.map((resource) => ({
        path: resource.path,
        productKey: resource.productKey,
        scope: resource.scope.kind,
        contentType: resource.contentType,
        role: resource.role,
        audiences: [...resource.audiences],
        modes: [...resource.modes],
        versions: resource.versions.map(({ form, links }) => ({ form, links: links.map(({ text }) => text) })),
        redacted: resource.redacted,
      })),
    ),
    candidates: [
      ...inOrder(
        collateral.plan.workResourceCandidates,
        sidecar.workGroups.map(({ groupKey }) => groupKey),
      ).flat(),
      ...products.flatMap(({ componentResourceCandidates }) => Object.values(componentResourceCandidates).flat()),
    ].map(resourceCandidate),
    actions: collateral.actions.map((action) => ({
      groupKey: action.groupKey,
      productKey: action.productKey,
      componentPath: action.componentPath,
      target: action.target,
      action: action.action,
      abstracts: action.abstracts.map((abstract) => ({
        type: abstract.type,
        localeCode: abstract.localeCode,
        content: abstract.content,
        markupFormat: abstract.markupFormat,
        canonical: abstract.canonical,
        canonicalBasis: abstract.canonicalBasis,
        textTypes: [...abstract.textTypes],
      })),
      tableOfContents:
        action.tableOfContents === null
          ? null
          : { content: action.tableOfContents.content, textTypes: [...action.tableOfContents.textTypes] },
      generalNote:
        action.generalNote === null
          ? null
          : { content: action.generalNote.content, textTypes: [...action.generalNote.textTypes] },
      resources: action.resources.map((resource) => ({
        target: resourceTarget(resource.target),
        resourceOrdinal: resource.resourceOrdinal,
        basis: resource.basis,
      })),
    })),
  };
};

const ordering = (order: OnixReviewsPrizesOrdering): OnixTargetOrdering =>
  order.status === 'RESOLVED'
    ? { status: 'RESOLVED', basis: order.basis }
    : order.status === 'UNRESOLVED'
      ? { status: 'UNRESOLVED', reason: order.reason }
      : { status: 'EMPTY' };

const reviewCandidate = (candidate: OnixReviewCandidate): OnixTargetReviewCandidateEntry => ({
  kind: candidate.kind,
  productKeys: [...candidate.productKeys],
  sourceCode: candidate.sourceCode,
  audience: candidate.audience,
  texts: candidate.texts.map(({ content, markupFormat }) => ({ content, markupFormat })),
  attributions: [...candidate.attributions],
  links: [...candidate.links],
  reviewDate: candidate.reviewDate,
  sequenceNumbers: [...candidate.sequenceNumbers],
});

const reviewsPrizesEntry = (sidecar: OnixImportPlanSidecar): OnixTargetReviewsPrizesEntry => {
  const reviewsPrizes = required(sidecar.reviewsPrizes, 'reviews and prizes reduction');
  const products = inOrder(
    reviewsPrizes.plan.products,
    sidecar.products.map(({ productKey }) => productKey),
  );
  const candidateSet = (scope: 'WORK' | 'COMPONENT', key: string, set: OnixReviewsPrizesCandidates) => ({
    scope,
    key,
    reviews: set.reviews.map(reviewCandidate),
    endorsements: set.endorsements.map(reviewCandidate),
    prizes: set.prizes.map((prize) => ({
      productKeys: [...prize.productKeys],
      names: prize.names.map(({ name, language }) => ({ name, language })),
      code: prize.code,
      role: prize.role,
      year: prize.year,
      country: prize.country,
      sequenceNumbers: [...prize.sequenceNumbers],
    })),
    ordering: {
      BOOK_REVIEW: ordering(set.ordering.BOOK_REVIEW),
      ENDORSEMENT: ordering(set.ordering.ENDORSEMENT),
      AWARD: ordering(set.ordering.AWARD),
    },
  });

  return {
    citedContents: products.flatMap(({ citedContents }) =>
      citedContents.map((cited) => ({
        path: cited.path,
        productKey: cited.productKey,
        scope: cited.scope.kind,
        citedContentType: cited.citedContentType,
        sourceType: cited.sourceType,
        audiences: [...cited.audiences],
      })),
    ),
    prizes: products.flatMap(({ prizes, contributorPrizes }) =>
      [...prizes, ...contributorPrizes].map((prize) => ({
        path: prize.path,
        productKey: prize.productKey,
        scope: prize.scope.kind,
        code: prize.code,
      })),
    ),
    candidates: [
      ...sidecar.workGroups.flatMap(({ groupKey }) => {
        const set = reviewsPrizes.plan.workCandidates[groupKey];

        return set === undefined ? [] : [candidateSet('WORK', groupKey, set)];
      }),
      ...Object.entries(reviewsPrizes.plan.componentCandidates).map(([key, set]) =>
        candidateSet('COMPONENT', key, set),
      ),
    ],
    actions: reviewsPrizes.actions.map((action) => ({
      groupKey: action.groupKey,
      productKey: action.productKey,
      componentPath: action.componentPath,
      target: action.target,
      action: action.action,
      bookReviews: action.bookReviews.map(({ source, target, orderNumber, orderBasis }) => ({
        source,
        target: { ...target },
        orderNumber,
        orderBasis,
      })),
      endorsements: action.endorsements.map(({ target, orderNumber, orderBasis }) => ({
        target: { ...target },
        orderNumber,
        orderBasis,
      })),
      awards: action.awards.map(({ target, orderNumber, orderBasis }) => ({
        target: { ...target },
        orderNumber,
        orderBasis,
      })),
    })),
  };
};

/** What the executable plan writes beyond `works` and `chapters`; every Work it names, by list and position. */
const planEntry = (plan: ImportPlan | null): OnixTargetPlanEntry => {
  if (plan === null) return { works: [], containedWorks: [], series: [], relations: [] };

  const refs = new Map<string, OnixTargetPlanWorkRef>();
  const lists = { works: plan.works, chapters: plan.chapters, containedWorks: plan.containedWorks ?? [] };
  for (const [list, works] of Object.entries(lists) as ['works' | 'chapters' | 'containedWorks', WorkEntity[]][]) {
    works.forEach(({ id }, index) => refs.set(id, { kind: 'PLANNED_WORK', list, index }));
  }
  const planned = (workId: string): OnixTargetPlanWorkRef => {
    const ref = refs.get(workId);
    if (ref === undefined) throw new Error(`the executable plan names a Work it does not hold: ${workId}`);

    return ref;
  };
  const endpoint = (end: ImportRelationEndpoint): OnixTargetPlanWorkRef =>
    end.kind === 'PLANNED_WORK' ? planned(end.workId) : { kind: 'EXISTING_WORK', workId: end.workId };

  const work = (entity: WorkEntity): OnixTargetPlannedWorkEntry => ({
    license: entity.license ?? null,
    withdrawnDate: entity.withdrawnDate,
    landingPage: entity.landingPage ?? null,
    place: entity.place,
    copyrightHolder: entity.copyrightHolder ?? null,
    coverUrl: entity.coverUrl ?? null,
    coverCaption: entity.coverCaption ?? null,
    toc: entity.toc ?? null,
    generalNote: entity.generalNote,
    bibliographyNote: entity.bibliographyNote,
    lccn: entity.lccn,
    oclc: entity.oclc,
    reference: entity.reference,
    abstracts: entity.abstracts.map(({ type, localeCode, canonical, content }) => ({
      type,
      localeCode,
      canonical,
      content,
    })),
    publications: entity.publications.map((publication) => ({
      type: publication.type,
      isbn: publication.isbn,
      prices: publication.prices.map(({ currencyCode, unitPrice }) => ({ currencyCode, unitPrice })),
      locations: publication.locations.map(({ canonical, landingPage, fullTextUrl, locationPlatform }) => ({
        canonical,
        landingPage,
        fullTextUrl,
        locationPlatform,
      })),
      accessibilityStandard: publication.accessibilityStandard,
      accessibilityAdditionalStandard: publication.accessibilityAdditionalStandard,
      accessibilityException: publication.accessibilityException,
      accessibilityReportUrl: publication.accessibilityReportUrl,
    })),
    references: entity.references.map(({ orderNumber, doi, unstructuredCitation, isbn, issn }) => ({
      orderNumber,
      doi,
      unstructuredCitation,
      isbn: isbn ?? null,
      issn: issn ?? null,
    })),
    additionalResources: entity.additionalResources.map((resource) => ({
      title: resource.title,
      description: resource.description,
      attribution: resource.attribution,
      resourceType: resource.resourceType,
      url: resource.url,
      date: resource.date ?? null,
      orderNumber: resource.orderNumber,
    })),
    bookReviews: entity.bookReviews.map(({ authorName, url, reviewDate, text, orderNumber }) => ({
      authorName,
      url,
      reviewDate,
      text,
      orderNumber,
    })),
    endorsements: entity.endorsements.map(({ authorName, url, text, orderNumber }) => ({
      authorName,
      url,
      text,
      orderNumber,
    })),
    awards: entity.awards.map((award) => ({
      title: award.title,
      role: award.role,
      year: award.year,
      country: award.country,
      jury: award.jury,
      statement: award.statement,
      category: award.category,
      url: award.url,
      orderNumber: award.orderNumber,
    })),
  });

  return {
    works: plan.works.map(work),
    containedWorks: lists.containedWorks.map((contained) => ({
      type: contained.type,
      status: contained.status,
      fullTitle: contained.titles.find(({ canonical }) => canonical)?.fullTitle ?? '',
      publicationDate: contained.publicationDate,
      withdrawnDate: contained.withdrawnDate,
      edition: contained.edition ?? null,
      imprintId: contained.imprintId,
      parent: contained.relationId === null ? null : planned(contained.relationId),
    })),
    series: plan.series.map(({ name, target, members }) => ({
      name,
      target:
        target.kind === 'existing'
          ? { kind: 'existing', seriesId: target.seriesId }
          : {
              kind: 'proposed',
              type: target.series.type,
              imprintId: target.series.imprintId,
              issnPrint: target.series.issnPrint ?? null,
              issnDigital: target.series.issnDigital ?? null,
            },
      members: members.map(({ workId, orderNumber, issueNumber }) => ({
        work: planned(workId),
        orderNumber,
        issueNumber: issueNumber ?? null,
      })),
    })),
    relations: (plan.relations ?? []).map(({ relator, related, relationType, relationOrdinal, status }) => ({
      relator: endpoint(relator),
      related: endpoint(related),
      relationType,
      relationOrdinal,
      status,
    })),
  };
};

/**
 * The target ledger of one run: every reduction's decisions, intents and actions, as the resolver's sidecar, the source
 * plan's Work groups, the descriptive reduction and the executable plan state them (thoth-app#249).
 */
export const targetLedger = (run: OnixPlanningRun, resolution: OnixResolvedImportPlan): OnixTargetLedger => {
  const { sidecar } = resolution;

  return {
    findings: required(sidecar.findings, 'plan findings').map(({ family, code, key, locations }) => ({
      family,
      code,
      key,
      paths: pathsOf(locations),
    })),
    identity: identityEntry(run, sidecar),
    descriptive: descriptiveEntries(run, sidecar),
    commercial: commercialEntries(sidecar),
    priceResolutions: required(sidecar.priceResolutions, 'price resolutions').map(
      ({ productKey, findingKey, currencyCode, basis, unitPrice, locations }) => ({
        productKey,
        findingKey,
        currencyCode,
        basis,
        unitPrice,
        paths: pathsOf(locations),
      }),
    ),
    rights: rightsEntry(sidecar),
    accessibility: accessibilityEntry(sidecar),
    components: required(sidecar.componentIntents, 'component intents').map(componentEntry),
    relatedMaterial: relatedMaterialEntry(sidecar),
    collateral: collateralEntry(sidecar),
    reviewsPrizes: reviewsPrizesEntry(sidecar),
    plan: planEntry(resolution.plan),
  };
};

/**
 * What planning decided under one set of publisher answers. A run whose adapter failed has no resolver sidecar and
 * so no ledger: the uploader stops at that failure, and a fixture must not describe a plan that never existed.
 */
export const planningLedger = (run: OnixPlanningRun): OnixPlanningLedger | null => {
  if (run.resolution === null) return null;
  const { sidecar } = run.resolution;

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
    target: targetLedger(run, run.resolution),
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
