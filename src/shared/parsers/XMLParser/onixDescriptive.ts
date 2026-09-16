import {
  ContributionType,
  LanguageCode,
  LanguageRelation,
  LocaleCode,
  MarkupFormat,
  SeriesType,
  SubjectType,
  WorkStatus,
} from '@/gql/graphql';
import type { WorkContribution } from '@/src/entities/contribution/model/contribution.types';
import type { FundingEntity } from '@/src/entities/funding/model/funding.types';
import type { LanguageEntity } from '@/src/entities/language/model/language.types';
import type { SeriesEntity } from '@/src/entities/series/model/series.types';
import type { SubjectEntity } from '@/src/entities/subject/model/subject.types';
import type { WorkId } from '@/src/entities/work/model/work.types';

import { appConfig } from '../../config';
import type { LocaleCodeType } from '../../types/languages';
import type { ImportedMarkupFormat } from '../../types/markdown';
import type {
  OnixDescriptiveClassification,
  OnixDescriptiveCompatibilityOutcome,
  OnixDescriptiveFamily,
  OnixDescriptiveFinding,
  OnixDescriptiveFindingCode,
  OnixDescriptiveLookups,
  OnixDescriptiveResolution,
  OnixExistingWorkDescriptiveFacts,
  OnixSourceLocation,
  OnixSourcePlan,
} from '../../types/onixPlanning';
import { ONIX_DESCRIPTIVE_ACKNOWLEDGED } from '../../types/onixPlanning';
import type { SeriesImportMember, SeriesImportPlan, SeriesImportTarget } from '../../types/parsers';
import type { TitleEntity } from '../../types/titles';
import { localeFromLanguageCode } from '../../utils/locales';
import { THEMA_CODES } from '../../utils/subjects/thema-codes';
import { canonicaliseDoi, canonicaliseOrcid, canonicaliseRor } from '../../utils/validations';
import { canonicalImportOrcid } from '../importLookupCoordinator';
import { findExistingSeries, normalizeSeriesName } from '../series/seriesPlan';
import { normaliseImportedAbstractHtml } from './importedAbstractHtml';
import { normaliseImportedPlainText } from './importedPlainText';
import type { ExtendedONIXMessageRoot, OnixText } from './interfaces';
import { getOnixText, MAX_ISSUE_ORDINAL, readOnixDate, resolveOnixTextMarkup, toOnixArray } from './onix';
import type { RecoveryMarker } from './validation';
import type { PublisherCategoryMarker } from './validation/recovery';
import type { ProvenanceResolver } from './validation/worker/provenance';

/**
 * The canonical descriptive reducers of thoth-app#183.
 *
 * They run after canonical source validation has permitted target planning (`permitsTargetPlanning()` /
 * `bridgeOnixSource()`, thoth-app#205) and after #182 has decided which records are Products and which Products
 * manifest one Work. They read only the adapter value bridged from the final normalised Reference XML, with its
 * Short-tag provenance and the approved recovery markers, and they never read Thoth: every value here is decided
 * from the file alone, deterministically, before any lookup.
 *
 * They own the target representation of the descriptive Work-level families - titles, languages, contributors,
 * subjects, Series membership, extent, ancillary counts, the illustrations note, lifecycle, copyright, funding,
 * the landing page and the place of publication - and nothing about source validity. A source fact the canonical
 * validator admitted is never reclassified as invalid here; a shape it should not have admitted is reported as a
 * `PREFLIGHT_GAP` and never repaired.
 *
 * Every finding is plain data with a key that depends on the file alone. A decision the file leaves open is
 * never taken by document order: it is a finding the publisher answers, and `resolveOnixDescriptiveWork` applies
 * the answer.
 */

export type ReduceOnixDescriptiveOptions = {
  /** Maps canonical Reference paths back to the submitted source, for a Short-tag file. */
  readonly provenance?: ProvenanceResolver;
  /** The approved recovery markers of the canonical result: the evidence a recovered fact is carried with. */
  readonly recoveries?: readonly RecoveryMarker[];
};

const MESSAGE_PATH = '/ONIXMessage[1]';

/* ------------------------------------------------------------------------------------------------ */
/* Reading the adapter                                                                              */
/* ------------------------------------------------------------------------------------------------ */

/** One element occurrence and its canonical path. */
type Occurrence = { readonly value: unknown; readonly path: string };

const isElement = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * Every occurrence of a named child, in source order, with its canonical path.
 *
 * `@5stones/onix` emits a single occurrence as a value and a repeated one as an array, and an empty marker
 * element as an empty string. Positions count same-named siblings from 1, exactly as canonical paths do.
 */
const children = (parent: Occurrence, name: string): Occurrence[] => {
  if (!isElement(parent.value) || !(name in parent.value)) return [];

  const child = parent.value[name];

  return (Array.isArray(child) ? child : [child])
    .map((value, index) => ({ value: value as unknown, path: `${parent.path}/${name}[${index + 1}]` }))
    .filter(({ value }) => value !== undefined && value !== null);
};

const has = (parent: Occurrence, name: string): boolean => children(parent, name).length > 0;

const textOf = (occurrence: Occurrence | undefined): string =>
  occurrence === undefined ? '' : getOnixText(occurrence.value as OnixText);

const childText = (parent: Occurrence, name: string): string => textOf(children(parent, name)[0]);

const childTexts = (parent: Occurrence, name: string): string[] =>
  children(parent, name)
    .map(textOf)
    .filter((text) => text.length > 0);

const unique = <T>(values: readonly T[]): T[] => [...new Set(values)];

/* ------------------------------------------------------------------------------------------------ */
/* Findings                                                                                         */
/* ------------------------------------------------------------------------------------------------ */

type Locate = (path: string) => OnixSourceLocation;

/** Where a finding belongs: a Product of a Work group, or the grouped Work itself. */
type FindingScope = {
  readonly groupKey: string;
  readonly productKey: string | null;
};

type FindingInput = FindingScope & {
  readonly family: OnixDescriptiveFamily;
  readonly code: OnixDescriptiveFindingCode;
  readonly classification: OnixDescriptiveClassification;
  readonly blocking: boolean;
  /** Canonical paths of the source facts the finding is about, in source order. */
  readonly paths: readonly string[];
  /** The located facts, when the caller already holds them located. */
  readonly locations?: readonly OnixSourceLocation[];
  readonly detail?: OnixDescriptiveFinding['detail'];
  readonly resolution?: OnixDescriptiveResolution;
  readonly message: string;
  /** What tells this finding apart from another of the same code in the same scope. */
  readonly discriminator?: string;
};

const NO_RESOLUTION: OnixDescriptiveResolution = { kind: 'NONE' };

class FindingCollector {
  private readonly byKey = new Map<string, OnixDescriptiveFinding>();

  constructor(private readonly locate: Locate) {}

  locateOf(path: string): OnixSourceLocation {
    return this.locate(path);
  }

  add(input: FindingInput): OnixDescriptiveFinding {
    const scope = input.productKey ?? input.groupKey;
    const key = [input.family, input.code, scope, input.discriminator ?? input.paths[0] ?? ''].join('|');
    const existing = this.byKey.get(key);

    // A finding is raised once per key; a second raise is the same fact, never a new one.
    if (existing) return existing;

    const finding: OnixDescriptiveFinding = {
      key,
      family: input.family,
      code: input.code,
      classification: input.classification,
      blocking: input.blocking,
      productKey: input.productKey,
      groupKey: input.groupKey,
      locations: input.locations ?? unique(input.paths).map(this.locate),
      detail: input.detail ?? {},
      resolution: input.resolution ?? NO_RESOLUTION,
      message: input.message,
    };

    this.byKey.set(key, finding);

    return finding;
  }

  all(): OnixDescriptiveFinding[] {
    return [...this.byKey.values()];
  }
}

/** Findings by key, as far as resolving a decision needs them. */
export type FindingLookup = Pick<ReadonlyMap<string, OnixDescriptiveFinding>, 'get' | 'has'>;

/** The chosen answer to a finding, when it is one the finding offers. */
const answerOf = (finding: Pick<OnixDescriptiveFinding, 'key' | 'resolution'>, choices: ChoiceMap): string | null => {
  const answer = choices[finding.key];

  if (answer === undefined) return null;

  switch (finding.resolution.kind) {
    case 'ACKNOWLEDGE':
      return answer === ONIX_DESCRIPTIVE_ACKNOWLEDGED ? answer : null;
    case 'CHOICE':
      return finding.resolution.options.some(({ key }) => key === answer) ? answer : null;
    case 'NONE':
      return null;
  }
};

type ChoiceMap = Readonly<Record<string, string>>;

/* ------------------------------------------------------------------------------------------------ */
/* Scope                                                                                            */
/* ------------------------------------------------------------------------------------------------ */

/** Everything one Product's reduction needs to know about where it is. */
type ProductContext = FindingScope & {
  readonly productKey: string;
  readonly record: Occurrence;
  readonly describe: string;
  readonly findings: FindingCollector;
  readonly categoryRecoveries: ReadonlyMap<string, PublisherCategoryMarker>;
};

/** A component scope: the Product itself, or one of its ContentItems. */
type ComponentScope = {
  readonly node: Occurrence;
  /** The canonical path of the ContentItem, or null for the Product itself. */
  readonly componentPath: string | null;
  readonly describe: string;
};

/* ------------------------------------------------------------------------------------------------ */
/* Subjects (ONIX-AUDIT-SUBJECTS-01 5541524582, amended for code 23 by 5683791471)                  */
/* ------------------------------------------------------------------------------------------------ */

/**
 * The Thema vocabulary pinned for List 27 code 93: Thoth's own accepted Thema v1.6 subject list, which the
 * backend validates every THEMA subject against and which the app carries unchanged. A Thema subject is
 * validated against this version when it declares `1.6`, or when it declares no version at all.
 */
export const PINNED_THEMA_VERSION = '1.6';

const THEMA_VOCABULARY: ReadonlySet<string> = new Set(Object.keys(THEMA_CODES));

/** A Thema subject category code; qualifiers (List 27 94-99) begin with a digit and are never one. */
const THEMA_CATEGORY = /^[A-Z]/;

type SubjectRule =
  | { readonly kind: 'CONTROLLED'; readonly type: SubjectType }
  | { readonly kind: 'THEMA' }
  | { readonly kind: 'KEYWORDS' }
  | { readonly kind: 'PUBLISHER_CATEGORY' };

/** The only List 27 schemes with an approved Thoth subject type. Every other valid scheme is an explicit loss. */
const SUBJECT_RULES: Readonly<Record<string, SubjectRule>> = {
  '03': { kind: 'CONTROLLED', type: SubjectType.Lcc },
  '10': { kind: 'CONTROLLED', type: SubjectType.Bisac },
  '12': { kind: 'CONTROLLED', type: SubjectType.Bic },
  '20': { kind: 'KEYWORDS' },
  '23': { kind: 'PUBLISHER_CATEGORY' },
  '93': { kind: 'THEMA' },
};

/** Where one planned subject came from. A merged subject keeps every occurrence. */
export type OnixSubjectProvenance = OnixSourceLocation & {
  readonly scheme: string;
  /** SubjectSchemeName as supplied: provenance only, since no Thoth subject can store it. */
  readonly schemeName: string | null;
  readonly schemeVersion: string | null;
  readonly valueSource: 'SubjectCode' | 'SubjectHeadingText';
  readonly main: boolean;
  /** The #205 recovery marker of this exact Subject, when its category value was recovered. */
  readonly recovery: PublisherCategoryMarker | null;
};

export type OnixPlannedSubject = {
  readonly type: SubjectType;
  /** The target code, or null while the publisher has still to say which heading a category means. */
  readonly code: string | null;
  readonly main: boolean;
  /** A publisher category's namespace: its SubjectSchemeName, or null when the source gave none. */
  readonly namespace: string | null;
  /** The finding that asks which heading a category means, when its code is still open. */
  readonly valueFindingKey: string | null;
  readonly provenance: readonly OnixSubjectProvenance[];
};

/** How one scope's subjects become Thoth subjects: the subjects, and the decisions the source leaves open. */
export type OnixSubjectDecision = {
  readonly subjects: readonly OnixPlannedSubject[];
  /** Distinct publisher-category namespaces that collapse onto one Custom value, by acknowledging finding. */
  readonly collisions: readonly {
    readonly findingKey: string;
    readonly value: string;
    readonly indices: readonly number[];
  }[];
  /** Target types whose primary subject the publisher chooses, by finding. */
  readonly primaryChoices: readonly { readonly findingKey: string; readonly type: SubjectType }[];
};

const FIRST_SOURCE_SUBJECT = 'FIRST_SOURCE_SUBJECT';

const subjectKey = ({ type, code, namespace }: Pick<OnixPlannedSubject, 'type' | 'code' | 'namespace'>) =>
  type === SubjectType.Custom ? `${type}|${code}|${namespace ?? ''}` : `${type}|${code}`;

/** One scope's subjects, normalised, and the target types whose source main subject was not among them. */
type NormalisedSubjects = {
  readonly subjects: OnixPlannedSubject[];
  /** A subject marked MainSubject that is not imported leaves its type's primary undetermined. */
  readonly unplannedMainTypes: SubjectType[];
};

const typeOfRule = (rule: SubjectRule): SubjectType | null =>
  rule.kind === 'CONTROLLED'
    ? rule.type
    : rule.kind === 'THEMA'
      ? SubjectType.Thema
      : rule.kind === 'PUBLISHER_CATEGORY'
        ? SubjectType.Custom
        : null;

/** Every subject one scope states, normalised, with the losses and unknowns it discloses. */
const normaliseSubjects = (context: ProductContext, scope: ComponentScope): NormalisedSubjects => {
  const planned: OnixPlannedSubject[] = [];
  const unplannedMainTypes = new Set<SubjectType>();
  const losses = new Map<string, { scheme: string; paths: string[]; codes: string[]; mainPaths: string[] }>();
  const missingCodes = new Map<string, string[]>();
  const unknownVersions = new Map<string, { scheme: string; version: string; paths: string[] }>();
  const unknownThema: { code: string; path: string }[] = [];
  const defaultThemaPaths: string[] = [];
  const bicPaths: string[] = [];
  const namespaces: { name: string; path: string }[] = [];

  children(scope.node, 'Subject').forEach((subject) => {
    const scheme = childText(subject, 'SubjectSchemeIdentifier');
    const schemeName = childText(subject, 'SubjectSchemeName') || null;
    const schemeVersion = childText(subject, 'SubjectSchemeVersion') || null;
    const code = childText(subject, 'SubjectCode');
    const headings = childTexts(subject, 'SubjectHeadingText');
    const main = has(subject, 'MainSubject');
    const rule = SUBJECT_RULES[scheme];

    const provenanceOf = (valueSource: OnixSubjectProvenance['valueSource']): OnixSubjectProvenance => ({
      ...context.findings.locateOf(subject.path),
      scheme,
      schemeName,
      schemeVersion,
      valueSource,
      main,
      recovery: context.categoryRecoveries.get(subject.path) ?? null,
    });

    if (rule === undefined) {
      const loss = losses.get(scheme) ?? { scheme, paths: [], codes: [], mainPaths: [] };

      loss.paths.push(subject.path);
      if (code.length > 0) loss.codes.push(code);
      if (main) loss.mainPaths.push(subject.path);
      losses.set(scheme, loss);

      return;
    }

    const plannedBefore = planned.length;
    const notImported = () => {
      const type = typeOfRule(rule);

      if (main && type !== null && planned.length === plannedBefore) unplannedMainTypes.add(type);
    };

    // A declared version is honoured only where a pinned vocabulary can tell what it means.
    if (schemeVersion !== null && !(rule.kind === 'THEMA' && schemeVersion === PINNED_THEMA_VERSION)) {
      notImported();
      const key = `${scheme}|${schemeVersion}`;
      const unknown = unknownVersions.get(key) ?? { scheme, version: schemeVersion, paths: [] };

      unknown.paths.push(subject.path);
      unknownVersions.set(key, unknown);

      return;
    }

    switch (rule.kind) {
      case 'CONTROLLED': {
        if (code.length === 0) {
          notImported();
          missingCodes.set(scheme, [...(missingCodes.get(scheme) ?? []), subject.path]);

          return;
        }

        if (rule.type === SubjectType.Bic) bicPaths.push(subject.path);

        planned.push({
          type: rule.type,
          code,
          main,
          namespace: null,
          valueFindingKey: null,
          provenance: [provenanceOf('SubjectCode')],
        });

        return;
      }
      case 'THEMA': {
        if (code.length === 0) {
          notImported();
          missingCodes.set(scheme, [...(missingCodes.get(scheme) ?? []), subject.path]);

          return;
        }

        if (!THEMA_CATEGORY.test(code) || !THEMA_VOCABULARY.has(code)) {
          notImported();
          unknownThema.push({ code, path: subject.path });

          return;
        }

        if (schemeVersion === null) defaultThemaPaths.push(subject.path);

        planned.push({
          type: SubjectType.Thema,
          code,
          main,
          namespace: null,
          valueFindingKey: null,
          provenance: [provenanceOf('SubjectCode')],
        });

        return;
      }
      case 'KEYWORDS': {
        const keywords = headings.flatMap((heading) =>
          heading
            .split(';')
            .map((keyword) => keyword.trim())
            .filter((keyword) => keyword.length > 0),
        );

        if (keywords.length === 0) {
          missingCodes.set(scheme, [...(missingCodes.get(scheme) ?? []), subject.path]);

          return;
        }

        keywords.forEach((keyword) =>
          planned.push({
            type: SubjectType.Keyword,
            code: keyword,
            main,
            namespace: null,
            valueFindingKey: null,
            provenance: [provenanceOf('SubjectHeadingText')],
          }),
        );

        return;
      }
      case 'PUBLISHER_CATEGORY': {
        const recovery = context.categoryRecoveries.get(subject.path) ?? null;
        const values = code.length > 0 ? [code] : unique(headings);
        const valueSource = code.length > 0 ? 'SubjectCode' : 'SubjectHeadingText';

        if (schemeName !== null) namespaces.push({ name: schemeName, path: subject.path });

        if (values.length === 0) {
          notImported();
          missingCodes.set(scheme, [...(missingCodes.get(scheme) ?? []), subject.path]);

          return;
        }

        if (
          recovery !== null &&
          (values.length !== 1 || recovery.value !== values[0] || recovery.valueSource !== valueSource)
        ) {
          notImported();
          context.findings.add({
            ...context,
            family: 'SUBJECTS',
            code: 'SUBJECT_RECOVERY_MISMATCH',
            classification: 'PREFLIGHT_GAP',
            blocking: true,
            paths: [subject.path],
            detail: { recoveredValue: recovery.value, sourceValues: values },
            message: `The publisher category of ${scope.describe} was recovered as "${recovery.value}", but its Subject now reads ${values.map((value) => `"${value}"`).join(', ')}; the category is not imported until the source and its recovery agree`,
          });

          return;
        }

        if (values.length > 1) {
          const finding = context.findings.add({
            ...context,
            family: 'SUBJECTS',
            code: 'SUBJECT_CUSTOM_VALUE_AMBIGUOUS',
            classification: 'TARGET_INPUT_REQUIRED',
            blocking: true,
            paths: [subject.path],
            detail: { headings: values },
            resolution: { kind: 'CHOICE', options: values.map((value) => ({ key: value, label: value })) },
            message: `The publisher category of ${scope.describe} has no code and several headings (${values.map((value) => `"${value}"`).join(', ')}); choose the one Thoth imports as its Custom subject`,
          });

          planned.push({
            type: SubjectType.Custom,
            code: null,
            main,
            namespace: schemeName,
            valueFindingKey: finding.key,
            provenance: [provenanceOf(valueSource)],
          });

          return;
        }

        planned.push({
          type: SubjectType.Custom,
          code: values[0],
          main,
          namespace: schemeName,
          valueFindingKey: null,
          provenance: [provenanceOf(valueSource)],
        });

        return;
      }
    }
  });

  losses.forEach(({ scheme, paths, codes, mainPaths }) =>
    context.findings.add({
      ...context,
      family: 'SUBJECTS',
      code: 'SUBJECT_SCHEME_UNREPRESENTABLE',
      classification: 'TARGET_UNREPRESENTABLE',
      blocking: false,
      paths,
      discriminator: `${scope.componentPath ?? ''}|${scheme}`,
      detail: { scheme, codes: unique(codes), mainSubjectPaths: mainPaths },
      message: `Subjects in List 27 scheme ${scheme} of ${scope.describe} have no Thoth subject type, so they were not imported${mainPaths.length > 0 ? ', including one marked as the main subject' : ''}`,
    }),
  );

  missingCodes.forEach((paths, scheme) =>
    context.findings.add({
      ...context,
      family: 'SUBJECTS',
      code: 'SUBJECT_CODE_MISSING',
      classification: 'TARGET_UNREPRESENTABLE',
      blocking: false,
      paths,
      discriminator: `${scope.componentPath ?? ''}|${scheme}`,
      detail: { scheme },
      message: `Subjects in List 27 scheme ${scheme} of ${scope.describe} give no value Thoth can store for that scheme, so they were not imported`,
    }),
  );

  unknownVersions.forEach(({ scheme, version, paths }) =>
    context.findings.add({
      ...context,
      family: 'SUBJECTS',
      code: 'SUBJECT_VERSION_UNKNOWN',
      classification: 'UNKNOWN',
      blocking: false,
      paths,
      discriminator: `${scope.componentPath ?? ''}|${scheme}|${version}`,
      detail: { scheme, version },
      message: `Subjects in List 27 scheme ${scheme} of ${scope.describe} declare scheme version "${version}", which no pinned vocabulary covers, so their meaning cannot be checked and they were not imported`,
    }),
  );

  if (unknownThema.length > 0) {
    context.findings.add({
      ...context,
      family: 'SUBJECTS',
      code: 'SUBJECT_THEMA_CODE_UNKNOWN',
      classification: 'UNKNOWN',
      blocking: false,
      paths: unknownThema.map(({ path }) => path),
      discriminator: scope.componentPath ?? '',
      detail: { codes: unique(unknownThema.map(({ code }) => code)), version: PINNED_THEMA_VERSION },
      message: `Thema subjects ${unique(unknownThema.map(({ code }) => code)).join(', ')} of ${scope.describe} are not subject categories of the pinned Thema ${PINNED_THEMA_VERSION} vocabulary, so they were not imported`,
    });
  }

  if (defaultThemaPaths.length > 0) {
    context.findings.add({
      ...context,
      family: 'SUBJECTS',
      code: 'SUBJECT_THEMA_DEFAULT_VERSION',
      classification: 'SUPPORTED_NORMALIZED',
      blocking: false,
      paths: defaultThemaPaths,
      discriminator: scope.componentPath ?? '',
      detail: { version: PINNED_THEMA_VERSION },
      message: `Thema subjects of ${scope.describe} declare no scheme version, so they were checked against the pinned Thema ${PINNED_THEMA_VERSION} vocabulary`,
    });
  }

  if (bicPaths.length > 0) {
    context.findings.add({
      ...context,
      family: 'SUBJECTS',
      code: 'SUBJECT_BIC_DEPRECATED',
      classification: 'SUPPORTED_WITH_WARNING',
      blocking: false,
      paths: bicPaths,
      discriminator: scope.componentPath ?? '',
      message: `BIC subjects of ${scope.describe} were imported, but BIC is a deprecated scheme that is no longer maintained`,
    });
  }

  if (namespaces.length > 0) {
    context.findings.add({
      ...context,
      family: 'SUBJECTS',
      code: 'SUBJECT_CUSTOM_NAMESPACE_NOT_REPRESENTED',
      classification: 'SUPPORTED_WITH_WARNING',
      blocking: false,
      paths: namespaces.map(({ path }) => path),
      discriminator: scope.componentPath ?? '',
      detail: { schemeNames: unique(namespaces.map(({ name }) => name)) },
      message: `Publisher categories of ${scope.describe} were imported as Custom subjects, but Thoth cannot store their category scheme name (${unique(namespaces.map(({ name }) => name)).join(', ')})`,
    });
  }

  const nameAsSubject = children(scope.node, 'NameAsSubject');

  if (nameAsSubject.length > 0) {
    context.findings.add({
      ...context,
      family: 'SUBJECTS',
      code: 'SUBJECT_NAME_AS_SUBJECT_UNREPRESENTABLE',
      classification: 'TARGET_UNREPRESENTABLE',
      blocking: false,
      paths: nameAsSubject.map(({ path }) => path),
      discriminator: scope.componentPath ?? '',
      message: `Names given as subjects of ${scope.describe} have no Thoth field: they are neither contributors nor keywords, so they were not imported`,
    });
  }

  return { subjects: planned, unplannedMainTypes: [...unplannedMainTypes] };
};

/**
 * One scope's subjects as Thoth will hold them: exact repeats merged with every occurrence kept, distinct
 * category namespaces collapsing onto one Custom value surfaced, and every primary subject the source leaves open
 * raised as a choice. `scope` names whose decision this is: a grouped Work, or one component.
 */
const decideSubjects = (
  subjects: readonly OnixPlannedSubject[],
  scope: FindingScope & { readonly componentPath: string | null; readonly describe: string },
  findings: FindingCollector,
  /** The types whose source main subject is not imported, which no remaining subject silently replaces. */
  unplannedMainTypes: readonly SubjectType[] = [],
): OnixSubjectDecision => {
  const merged: OnixPlannedSubject[] = [];
  const indexByKey = new Map<string, number>();

  subjects.forEach((subject) => {
    // An open category value merges with nothing until it is chosen.
    const key = subject.code === null ? null : subjectKey(subject);
    const index = key === null ? undefined : indexByKey.get(key);

    if (index === undefined) {
      if (key !== null) indexByKey.set(key, merged.length);
      merged.push(subject);

      return;
    }

    const existing = merged[index];

    if (existing.main !== subject.main) {
      findings.add({
        ...scope,
        family: 'SUBJECTS',
        code: 'SUBJECT_DUPLICATE_DIFFERS',
        classification: 'SUPPORTED_WITH_WARNING',
        blocking: false,
        paths: [...existing.provenance, ...subject.provenance].map(({ path }) => path),
        discriminator: `${scope.componentPath ?? ''}|${key}`,
        detail: { type: subject.type, code: subject.code ?? '' },
        message: `${subject.type} subject ${subject.code} of ${scope.describe} is given more than once, marked as the main subject in some occurrences only; it is imported once, as a main subject`,
      });
    }

    merged[index] = {
      ...existing,
      main: existing.main || subject.main,
      provenance: [...existing.provenance, ...subject.provenance],
    };
  });

  /* Distinct publisher-category namespaces that Thoth's one Custom value cannot keep apart. */
  const byCustomValue = new Map<string, number[]>();

  merged.forEach(({ type, code }, index) => {
    if (type !== SubjectType.Custom || code === null) return;

    byCustomValue.set(code, [...(byCustomValue.get(code) ?? []), index]);
  });

  const collisions: OnixSubjectDecision['collisions'][number][] = [];

  byCustomValue.forEach((indices, value) => {
    if (indices.length < 2) return;

    const paths = indices.flatMap((index) => merged[index].provenance.map(({ path }) => path));
    const schemeNames = indices.map((index) => merged[index].namespace ?? '(no scheme name)');
    const finding = findings.add({
      ...scope,
      family: 'SUBJECTS',
      code: 'SUBJECT_CUSTOM_NAMESPACE_COLLISION',
      classification: 'TARGET_UNREPRESENTABLE',
      blocking: true,
      paths,
      discriminator: `${scope.componentPath ?? ''}|${value}`,
      detail: { value, schemeNames },
      resolution: { kind: 'ACKNOWLEDGE' },
      message: `Publisher categories from different schemes (${schemeNames.join(', ')}) of ${scope.describe} all read "${value}", and Thoth cannot store which scheme each belongs to; acknowledge that they are imported as one Custom subject`,
    });

    collisions.push({ findingKey: finding.key, value, indices });
  });

  /*
   * Primary subjects, per target type. Keywords carry no primary meaning in Thoth. Colliding categories can only
   * ever enter as the one Custom subject their acknowledgement makes, so they are one candidate here.
   */
  const primaryChoices: OnixSubjectDecision['primaryChoices'][number][] = [];
  const types = unique(merged.map(({ type }) => type)).filter((type) => type !== SubjectType.Keyword);
  const collapsed = new Set(collisions.flatMap(({ indices }) => indices.slice(1)));
  const candidates = merged
    .map((subject, index) => {
      const collision = collisions.find(({ indices }) => indices[0] === index);

      return collision === undefined
        ? subject
        : { ...subject, main: collision.indices.some((member) => merged[member].main) };
    })
    .filter((_subject, index) => !collapsed.has(index));

  types.forEach((type) => {
    const ofType = candidates.filter((subject) => subject.type === type && subject.code !== null);
    const mains = ofType.filter(({ main }) => main);
    const paths = ofType.flatMap(({ provenance }) => provenance.map(({ path }) => path));

    const mainNotImported = mains.length === 0 && unplannedMainTypes.includes(type);

    if (mains.length === 1 || (mains.length === 0 && ofType.length <= 1 && !mainNotImported)) return;

    const codes = unique((mains.length > 1 ? mains : ofType).map(({ code }) => code as string));
    const finding =
      mains.length > 1
        ? findings.add({
            ...scope,
            family: 'SUBJECTS',
            code: 'SUBJECT_PRIMARY_AMBIGUOUS',
            classification: 'TARGET_INPUT_REQUIRED',
            blocking: true,
            paths: mains.flatMap(({ provenance }) => provenance.map(({ path }) => path)),
            discriminator: `${scope.componentPath ?? ''}|${type}`,
            detail: { type, codes },
            resolution: { kind: 'CHOICE', options: codes.map((code) => ({ key: code, label: code })) },
            message: `More than one ${type} subject of ${scope.describe} is marked as the main subject (${codes.join(', ')}); choose the one Thoth imports as primary`,
          })
        : findings.add({
            ...scope,
            family: 'SUBJECTS',
            code: 'SUBJECT_PRIMARY_REQUIRED',
            classification: 'TARGET_INPUT_REQUIRED',
            blocking: true,
            paths,
            discriminator: `${scope.componentPath ?? ''}|${type}`,
            detail: { type, codes },
            resolution: {
              kind: 'CHOICE',
              options: [
                { key: FIRST_SOURCE_SUBJECT, label: codes[0] },
                ...codes.map((code) => ({ key: code, label: code })),
              ],
            },
            message: mainNotImported
              ? `The ${type} subject of ${scope.describe} marked as the main subject was not imported, and no other is primary on its own (${codes.join(', ')}); choose the primary one, or confirm that the first remaining subject in the file is primary`
              : `${type} subjects of ${scope.describe} (${codes.join(', ')}) name no main subject; choose the primary one, or confirm that the first subject in the file is primary`,
          });

    primaryChoices.push({ findingKey: finding.key, type });
  });

  return { subjects: merged, collisions, primaryChoices };
};

/** The Thoth subjects a subject decision makes with the publisher's answers, and what is still unanswered. */
export const resolveSubjects = (
  decision: OnixSubjectDecision,
  findingsByKey: FindingLookup,
  choices: ChoiceMap,
): { readonly subjects: SubjectEntity[]; readonly pending: string[] } => {
  const pending: string[] = [];
  const answer = (findingKey: string) => {
    const finding = findingsByKey.get(findingKey);

    return finding === undefined ? null : answerOf(finding, choices);
  };

  const codes = decision.subjects.map(({ code, valueFindingKey }) => {
    if (code !== null) return code;

    const chosen = valueFindingKey === null ? null : answer(valueFindingKey);

    if (chosen === null && valueFindingKey !== null) pending.push(valueFindingKey);

    return chosen;
  });

  const excluded = new Set<number>();

  decision.collisions.forEach(({ findingKey, indices }) => {
    if (answer(findingKey) === null) {
      pending.push(findingKey);
      indices.forEach((index) => excluded.add(index));

      return;
    }

    // Acknowledged: the categories become the one Custom subject Thoth can hold, at the first one's position.
    indices.slice(1).forEach((index) => excluded.add(index));
  });

  const kept = decision.subjects
    .map((subject, index) => ({ subject, index, code: codes[index] }))
    .filter(({ index, code }) => code !== null && !excluded.has(index));

  const collisionMain = new Map(
    decision.collisions.map(({ indices }) => [indices[0], indices.some((index) => decision.subjects[index].main)]),
  );

  const result: SubjectEntity[] = [];
  const pendingTypes = new Set(
    decision.subjects.filter((_subject, index) => codes[index] === null).map(({ type }) => type),
  );

  unique(kept.map(({ subject }) => subject.type)).forEach((type) => {
    if (pendingTypes.has(type)) return;

    const ofType = kept
      .filter(({ subject }) => subject.type === type)
      .map(({ subject, index, code }) => ({
        code: code as string,
        main: collisionMain.get(index) ?? subject.main,
      }));
    const choice = decision.primaryChoices.find((candidate) => candidate.type === type);
    let primary: string | null = null;

    if (choice !== undefined) {
      const chosen = answer(choice.findingKey);

      if (chosen === null) {
        pending.push(choice.findingKey);

        return;
      }

      primary = chosen === FIRST_SOURCE_SUBJECT ? ofType[0].code : chosen;
    } else {
      primary = ofType.find(({ main }) => main)?.code ?? null;
    }

    const ordered =
      primary === null
        ? ofType
        : [...ofType.filter(({ code }) => code === primary), ...ofType.filter(({ code }) => code !== primary)];

    ordered.forEach(({ code }, position) =>
      result.push({ id: appConfig.defaultId, type, code, ordinal: position + 1 }),
    );
  });

  return { subjects: result, pending: unique(pending) };
};

/* ------------------------------------------------------------------------------------------------ */
/* Languages (ONIX-AUDIT-LANGUAGE-01 5558297710, same-key 01 + 02 per ONIX-AUDIT-LANGUAGE-02)       */
/* ------------------------------------------------------------------------------------------------ */

/** ONIX List 22 roles that describe the language of the Work's own text, and those scoped elsewhere. */
const TEXT_LANGUAGE_ROLES = new Set(['01', '02', '06', '07']);
const SCOPED_LANGUAGE_ROLES = new Set(['03', '08', '09', '10', '11', '12', '13', '14', '15']);

/** The role a Header DefaultLanguageOfText plays in a Product that gives no text language of its own. */
export const HEADER_DEFAULT_LANGUAGE_ROLE = 'HEADER_DEFAULT';

const THOTH_LANGUAGE_CODES: ReadonlySet<string> = new Set(Object.values(LanguageCode));
const THOTH_LOCALE_CODES: ReadonlySet<string> = new Set(Object.values(LocaleCode));

/** One source language fact: a Language composite, or the Header default applied to a Product. */
export type OnixLanguageFact = OnixSourceLocation & {
  readonly role: string;
  /** The List 74 code as supplied, lower-cased: ONIX codes are case-insensitive, nothing else is changed. */
  readonly code: string;
  readonly country: string | null;
  readonly script: string | null;
};

/** Why a Work-language row has the relation it has. */
export type OnixLanguageBasis =
  /** Role 02, 06 or 07 states the relation. */
  | 'SPECIFIC_ROLE'
  /** A language of text beside role-02 evidence that the original is not present: translated into. */
  | 'TRANSLATION_EVIDENCE'
  /** A language of text with no translation evidence at all: Original, as a target convention only. */
  | 'NO_TRANSLATION_EVIDENCE';

export type OnixPlannedLanguage = {
  readonly code: LanguageCode;
  /** The relation, or null while the publisher has still to choose it or the grouped Work contradicts itself. */
  readonly relation: LanguageRelation | null;
  readonly basis: OnixLanguageBasis | null;
  /** The finding whose answer supplies the relation, when one does. */
  readonly choiceFindingKey: string | null;
  /** Every source fact behind the row: the relation-stating facts first, then the ones they corroborate. */
  readonly provenance: readonly OnixLanguageFact[];
};

export type OnixLanguageDecision = {
  readonly rows: readonly OnixPlannedLanguage[];
  /** The Thoth locales the scope's text is in, as its language facts say, for consumers of locale evidence. */
  readonly textLocales: readonly LocaleCodeType[];
  /** Whether that text-language evidence is only the Header default. */
  readonly textLanguageFromHeaderDefault: boolean;
};

const EMPTY_LANGUAGES: OnixLanguageDecision = { rows: [], textLocales: [], textLanguageFromHeaderDefault: false };

const qualifiersCompatible = (a: OnixLanguageFact, b: OnixLanguageFact) =>
  (a.country === null || b.country === null || a.country === b.country) &&
  (a.script === null || b.script === null || a.script === b.script);

const sameLanguageKey = (a: OnixLanguageFact, b: OnixLanguageFact) =>
  a.code === b.code && a.country === b.country && a.script === b.script;

const SPECIFIC_RELATIONS: Readonly<Record<string, LanguageRelation>> = {
  '02': LanguageRelation.TranslatedFrom,
  '06': LanguageRelation.Original,
  '07': LanguageRelation.TranslatedInto,
};

/** A current-text relation a role-01 language may be given; a language present in the text is never TranslatedFrom. */
const CURRENT_TEXT_RELATIONS: readonly LanguageRelation[] = [
  LanguageRelation.Original,
  LanguageRelation.TranslatedInto,
];

/**
 * The Thoth locale a language fact's text is written in: base language, qualified by an explicit script or
 * country only when Thoth has exactly that locale. Nothing is inferred beyond what the fact states.
 */
export const localeOfLanguage = (
  code: string,
  script: string | null,
  country: string | null,
): { readonly locale: LocaleCodeType | undefined; readonly qualifierLost: boolean } => {
  const base = localeFromLanguageCode(code);

  if (base === undefined) return { locale: undefined, qualifierLost: false };

  const qualified = [script, country].filter((part): part is string => part !== null && part.length > 0);

  if (qualified.length === 0) return { locale: base, qualifierLost: false };

  const exact = [base, ...qualified.map((part) => part.toUpperCase())].join('_');

  return THOTH_LOCALE_CODES.has(exact)
    ? { locale: exact as LocaleCodeType, qualifierLost: false }
    : { locale: base, qualifierLost: true };
};

type LanguageCandidate = {
  readonly code: string;
  readonly relation: LanguageRelation | 'REQUIRED';
  readonly basis: OnixLanguageBasis | null;
  readonly facts: readonly OnixLanguageFact[];
};

type LanguageReduction = OnixLanguageDecision & {
  /** Every text-language fact the scope states, specific or generic, and whether any is not the Header default. */
  readonly hasExplicitTextLanguage: boolean;
};

/**
 * One scope's whole language set reduced to Thoth's one row per language code (Approach B): every fact
 * normalised first, specific roles classified directly, generic role 01 read against the whole set, and only
 * then projected onto target codes, where incompatible relations for one code are a choice, never two rows.
 */
const reduceLanguageScope = (
  context: ProductContext,
  scope: ComponentScope,
  headerDefault: Occurrence | null,
): LanguageReduction => {
  const scopeRef = { ...context, discriminatorPrefix: scope.componentPath ?? '' };
  const facts: OnixLanguageFact[] = [];
  const unusable: string[] = [];

  children(scope.node, 'Language').forEach((language) => {
    const role = childText(language, 'LanguageRole');
    const code = childText(language, 'LanguageCode').toLowerCase();

    if (role.length === 0 || code.length === 0 || !(TEXT_LANGUAGE_ROLES.has(role) || SCOPED_LANGUAGE_ROLES.has(role))) {
      unusable.push(language.path);

      return;
    }

    const fact: OnixLanguageFact = {
      ...context.findings.locateOf(language.path),
      role,
      code,
      country: childText(language, 'CountryCode') || null,
      script: childText(language, 'ScriptCode') || null,
    };

    // An exact repeat is one fact; its provenance is kept on the first.
    if (facts.some((existing) => existing.role === fact.role && sameLanguageKey(existing, fact))) return;

    facts.push(fact);
  });

  if (unusable.length > 0) {
    context.findings.add({
      ...context,
      family: 'LANGUAGES',
      code: 'LANGUAGE_STRUCTURE_UNUSABLE',
      classification: 'PREFLIGHT_GAP',
      blocking: true,
      paths: unusable,
      discriminator: scopeRef.discriminatorPrefix,
      message: `A Language of ${scope.describe} has no usable role or code, which canonical source validation should not have admitted; its languages are not planned`,
    });
  }

  const scoped = facts.filter(({ role }) => SCOPED_LANGUAGE_ROLES.has(role));

  if (scoped.length > 0) {
    context.findings.add({
      ...context,
      family: 'LANGUAGES',
      code: 'LANGUAGE_ROLE_SCOPED',
      classification: 'TARGET_UNREPRESENTABLE',
      blocking: false,
      paths: scoped.map(({ path }) => path),
      discriminator: scopeRef.discriminatorPrefix,
      detail: { roles: unique(scoped.map(({ role }) => role)) },
      message: `Languages of ${scope.describe} with roles ${unique(scoped.map(({ role }) => role)).join(', ')} describe abstracts, audio, subtitles or other parts rather than the Work's text, and Thoth has no field for them, so they were not imported`,
    });
  }

  let textFacts = facts.filter(({ role }) => TEXT_LANGUAGE_ROLES.has(role));

  /* The exact same-key 01 + 02 contradiction is the source layer's to refuse; it never becomes target input. */
  const contradicted = textFacts.filter(
    (fact) =>
      (fact.role === '01' || fact.role === '02') &&
      textFacts.some((other) => other.role === (fact.role === '01' ? '02' : '01') && sameLanguageKey(fact, other)),
  );

  if (contradicted.length > 0) {
    context.findings.add({
      ...context,
      family: 'LANGUAGES',
      code: 'LANGUAGE_SOURCE_CONTRADICTION',
      classification: 'PREFLIGHT_GAP',
      blocking: true,
      paths: contradicted.map(({ path }) => path),
      discriminator: scopeRef.discriminatorPrefix,
      detail: { codes: unique(contradicted.map(({ code }) => code)) },
      message: `${scope.describe} declares the same language as both the language of its text and an original language not present, a source contradiction canonical validation should have refused; no language relation is planned for it`,
    });

    const excludedCodes = new Set(contradicted.map(({ code }) => code));

    textFacts = textFacts.filter(({ code }) => !excludedCodes.has(code));
  }

  const hasExplicitTextLanguage = textFacts.some(({ role }) => role === '01' || role === '06' || role === '07');

  if (!hasExplicitTextLanguage && headerDefault !== null && scope.componentPath === null) {
    const code = textOf(headerDefault).toLowerCase();

    if (code.length > 0) {
      textFacts = [
        ...textFacts,
        {
          ...context.findings.locateOf(headerDefault.path),
          role: HEADER_DEFAULT_LANGUAGE_ROLE,
          code,
          country: null,
          script: null,
        },
      ];

      context.findings.add({
        ...context,
        family: 'LANGUAGES',
        code: 'LANGUAGE_HEADER_DEFAULT',
        classification: 'SUPPORTED_NORMALIZED',
        blocking: false,
        paths: [headerDefault.path],
        discriminator: scopeRef.discriminatorPrefix,
        detail: { code },
        message: `${scope.describe} states no language of its text, so the message Header's DefaultLanguageOfText "${code}" applies to it`,
      });
    }
  }

  const specific = textFacts.filter(({ role }) => SPECIFIC_RELATIONS[role] !== undefined);
  const multilingual = specific.some(({ role }) => role === '06' || role === '07');
  const translation = specific.some(({ role }) => role === '02');
  const candidates: LanguageCandidate[] = [];
  const corroborated = new Map<OnixLanguageFact, OnixLanguageFact[]>();

  textFacts.forEach((fact) => {
    const relation = SPECIFIC_RELATIONS[fact.role];

    if (relation !== undefined) {
      candidates.push({ code: fact.code, relation, basis: 'SPECIFIC_ROLE', facts: [fact] });

      return;
    }

    // A generic language of text corroborates a compatible multilingual fact about the same language.
    const classifying = specific.find(
      (candidate) =>
        (candidate.role === '06' || candidate.role === '07') &&
        candidate.code === fact.code &&
        qualifiersCompatible(candidate, fact),
    );

    if (classifying !== undefined) {
      corroborated.set(classifying, [...(corroborated.get(classifying) ?? []), fact]);

      return;
    }

    candidates.push(
      multilingual
        ? { code: fact.code, relation: 'REQUIRED', basis: null, facts: [fact] }
        : translation
          ? { code: fact.code, relation: LanguageRelation.TranslatedInto, basis: 'TRANSLATION_EVIDENCE', facts: [fact] }
          : { code: fact.code, relation: LanguageRelation.Original, basis: 'NO_TRANSLATION_EVIDENCE', facts: [fact] },
    );
  });

  const withCorroboration = candidates.map((candidate) => ({
    ...candidate,
    facts: [...candidate.facts, ...candidate.facts.flatMap((fact) => corroborated.get(fact) ?? [])],
  }));

  /* Projection onto Thoth's language codes. */
  const unrepresentable = withCorroboration.filter(({ code }) => !THOTH_LANGUAGE_CODES.has(code.toUpperCase()));

  if (unrepresentable.length > 0) {
    context.findings.add({
      ...context,
      family: 'LANGUAGES',
      code: 'LANGUAGE_CODE_UNREPRESENTABLE',
      classification: 'TARGET_UNREPRESENTABLE',
      blocking: false,
      paths: unrepresentable.flatMap(({ facts: unrepresented }) => unrepresented.map(({ path }) => path)),
      discriminator: scopeRef.discriminatorPrefix,
      detail: { codes: unique(unrepresentable.map(({ code }) => code)) },
      message: `Languages ${unique(unrepresentable.map(({ code }) => code)).join(', ')} of ${scope.describe} are valid ONIX language codes Thoth has no language for, so they were not imported`,
    });
  }

  const rows: OnixPlannedLanguage[] = [];

  // Rows follow each language's first appearance in the source, corroborating facts included.
  unique(textFacts.map(({ code }) => code))
    .filter((code) => withCorroboration.some((candidate) => candidate.code === code))
    .filter((code) => THOTH_LANGUAGE_CODES.has(code.toUpperCase()))
    .forEach((code) => {
      const ofCode = withCorroboration.filter((candidate) => candidate.code === code);
      const targetCode = code.toUpperCase() as LanguageCode;
      const provenance = ofCode.flatMap(({ facts: candidateFacts }) => candidateFacts);
      const determined = unique(ofCode.flatMap(({ relation }) => (relation === 'REQUIRED' ? [] : [relation])));
      const required = ofCode.some(({ relation }) => relation === 'REQUIRED');

      if (!required && determined.length === 1) {
        const qualifiers = unique(provenance.map(({ country, script }) => `${country ?? ''}|${script ?? ''}`));

        if (qualifiers.length > 1) {
          context.findings.add({
            ...context,
            family: 'LANGUAGES',
            code: 'LANGUAGE_VARIANT_NOT_REPRESENTED',
            classification: 'SUPPORTED_WITH_WARNING',
            blocking: false,
            paths: provenance.map(({ path }) => path),
            discriminator: `${scopeRef.discriminatorPrefix}|${code}`,
            detail: { code: targetCode },
            message: `Language ${code} of ${scope.describe} is given with different country or script qualifiers; Thoth holds one ${targetCode} language and cannot store those variants`,
          });
        }

        rows.push({
          code: targetCode,
          relation: determined[0],
          basis: ofCode.find(({ relation }) => relation === determined[0])?.basis ?? null,
          choiceFindingKey: null,
          provenance,
        });

        return;
      }

      const options = unique([...determined, ...(required ? CURRENT_TEXT_RELATIONS : [])]);
      const finding =
        !required || determined.length > 0
          ? context.findings.add({
              ...context,
              family: 'LANGUAGES',
              code: 'LANGUAGE_RELATION_COLLISION',
              classification: 'TARGET_UNREPRESENTABLE',
              blocking: true,
              paths: provenance.map(({ path }) => path),
              discriminator: `${scopeRef.discriminatorPrefix}|${code}`,
              detail: { code: targetCode, relations: options },
              resolution: { kind: 'CHOICE', options: options.map((relation) => ({ key: relation, label: relation })) },
              message: `${scope.describe} gives language ${code} more than one relation (${options.join(', ')}), but a Thoth Work holds each language once; choose the relation Thoth imports`,
            })
          : context.findings.add({
              ...context,
              family: 'LANGUAGES',
              code: 'LANGUAGE_RELATION_REQUIRED',
              classification: 'TARGET_INPUT_REQUIRED',
              blocking: true,
              paths: provenance.map(({ path }) => path),
              discriminator: `${scopeRef.discriminatorPrefix}|${code}`,
              detail: { code: targetCode },
              resolution: { kind: 'CHOICE', options: options.map((relation) => ({ key: relation, label: relation })) },
              message: `${scope.describe} is a multilingual edition whose original and translated languages are stated, but it does not say how language ${code} relates to them; choose its relation`,
            });

      rows.push({ code: targetCode, relation: null, basis: null, choiceFindingKey: finding.key, provenance });
    });

  const textLanguageFacts = textFacts.filter(({ role }) => role !== '02');
  const textLocales = unique(
    textLanguageFacts.flatMap(({ code, script, country }) => {
      const { locale } = localeOfLanguage(code, script, country);

      return locale === undefined ? [] : [locale];
    }),
  );

  return {
    rows,
    textLocales,
    textLanguageFromHeaderDefault:
      textLanguageFacts.length > 0 && textLanguageFacts.every(({ role }) => role === HEADER_DEFAULT_LANGUAGE_ROLE),
    hasExplicitTextLanguage,
  };
};

/**
 * One grouped Work's languages from its manifestations' reductions. Identical semantics merge; a specific
 * multilingual role on one manifestation classifies a compatible generic language of text on another; anything
 * else that disagrees is a contradictory Work-language regime, which blocks rather than being unioned.
 */
const reconcileLanguages = (
  reductions: readonly LanguageReduction[],
  scope: FindingScope & { readonly describe: string },
  findings: FindingCollector,
): OnixLanguageDecision => {
  if (reductions.length === 1) return reductions[0];

  const anyExplicit = reductions.some(({ hasExplicitTextLanguage }) => hasExplicitTextLanguage);
  const rows = reductions.flatMap(({ rows: productRows }) =>
    // A Header default never stands beside explicit text-language facts of another manifestation.
    productRows.filter(
      ({ provenance }) => !(anyExplicit && provenance.every(({ role }) => role === HEADER_DEFAULT_LANGUAGE_ROLE)),
    ),
  );
  const merged: OnixPlannedLanguage[] = [];
  const conflicts: { code: LanguageCode; paths: string[] }[] = [];

  unique(rows.map(({ code }) => code)).forEach((code) => {
    const ofCode = rows.filter((row) => row.code === code);
    const provenance = ofCode.flatMap((row) => row.provenance);
    const determined = ofCode.filter(({ relation }) => relation !== null);
    const pending = ofCode.filter(({ relation }) => relation === null);
    const specificRelations = unique(
      determined.filter(({ basis }) => basis === 'SPECIFIC_ROLE').map(({ relation }) => relation as LanguageRelation),
    );
    const genericRelations = unique(
      determined.filter(({ basis }) => basis !== 'SPECIFIC_ROLE').map(({ relation }) => relation as LanguageRelation),
    );
    const multilingualSpecific = determined.filter(
      ({ basis, provenance: rowProvenance }) =>
        basis === 'SPECIFIC_ROLE' && rowProvenance.some(({ role }) => role === '06' || role === '07'),
    );

    let relation: LanguageRelation | null = null;
    let basis: OnixLanguageBasis | null = null;
    let choiceFindingKey: string | null = null;

    if (pending.length > 0) {
      const keys = unique(pending.map(({ choiceFindingKey: key }) => key));
      const options = unique(
        pending.flatMap(({ choiceFindingKey: key }) => {
          const finding = findings.all().find((candidate) => candidate.key === key);

          return finding?.resolution.kind === 'CHOICE'
            ? finding.resolution.options.map(({ key: option }) => option)
            : [];
        }),
      );

      if (
        keys.length === 1 &&
        determined.every(({ relation: determinedRelation }) => options.includes(determinedRelation as string))
      ) {
        choiceFindingKey = keys[0];
      } else {
        conflicts.push({ code, paths: provenance.map(({ path }) => path) });
      }
    } else if (
      specificRelations.length === 1 &&
      genericRelations.every((generic) => generic === specificRelations[0] || multilingualSpecific.length > 0)
    ) {
      relation = specificRelations[0];
      basis = 'SPECIFIC_ROLE';
    } else if (specificRelations.length === 0 && genericRelations.length === 1) {
      relation = genericRelations[0];
      basis = determined[0].basis;
    } else {
      conflicts.push({ code, paths: provenance.map(({ path }) => path) });
    }

    if (relation === null && choiceFindingKey === null) {
      merged.push({ code, relation: null, basis: null, choiceFindingKey: null, provenance });

      return;
    }

    merged.push({ code, relation, basis, choiceFindingKey, provenance });
  });

  if (conflicts.length > 0) {
    findings.add({
      ...scope,
      family: 'LANGUAGES',
      code: 'LANGUAGE_GROUP_CONFLICT',
      classification: 'SOURCE_CONFLICT',
      blocking: true,
      paths: conflicts.flatMap(({ paths }) => paths),
      discriminator: 'group',
      detail: { codes: conflicts.map(({ code }) => code) },
      message: `The manifestations of ${scope.describe} state contradictory relations for languages ${conflicts.map(({ code }) => code).join(', ')}; one Work cannot hold both, which may mean these Products do not manifest the same Work`,
    });
  }

  const textLocales = unique(reductions.flatMap(({ textLocales: locales }) => locales));

  return {
    rows: merged,
    textLocales,
    textLanguageFromHeaderDefault: reductions.every(
      ({ textLanguageFromHeaderDefault }) => textLanguageFromHeaderDefault,
    ),
  };
};

/** The Thoth languages a language decision makes with the publisher's answers, and what is still unanswered. */
export const resolveLanguages = (
  decision: OnixLanguageDecision,
  findingsByKey: FindingLookup,
  choices: ChoiceMap,
): { readonly languages: LanguageEntity[]; readonly pending: string[] } => {
  const pending: string[] = [];
  const languages: LanguageEntity[] = [];

  decision.rows.forEach(({ code, relation, choiceFindingKey }) => {
    if (relation !== null) {
      languages.push({ id: appConfig.defaultId, code, relation });

      return;
    }

    if (choiceFindingKey === null) return;

    const finding = findingsByKey.get(choiceFindingKey);
    const chosen = finding === undefined ? null : answerOf(finding, choices);

    if (chosen === null) {
      pending.push(choiceFindingKey);

      return;
    }

    languages.push({ id: appConfig.defaultId, code, relation: chosen as LanguageRelation });
  });

  return { languages, pending: unique(pending) };
};

/* ------------------------------------------------------------------------------------------------ */
/* Titles (ONIX-AUDIT-TITLE-LOCALE-01 5551465280)                                                   */
/* ------------------------------------------------------------------------------------------------ */

/** List 149 levels: the Product, a Collection, and a ContentItem. A level never stands in for another. */
export const TITLE_LEVEL = { PRODUCT: '01', COLLECTION: '02', CONTENT_ITEM: '04' } as const;

/** List 15 roles a non-canonical Thoth title may carry, with the precise role disclosed as lost. */
const ALTERNATE_TITLE_TYPES = new Set(['03', '06', '16']);

/** Anything shaped like an opening or closing tag, read as the backend reads markup. */
const TAG_SHAPE = /<\/?[A-Za-z][^>]*>/;

/** Title structure Thoth's title rows do not keep, in the order a disclosure lists it. */
const TITLE_STRUCTURE_KINDS = [
  'PREFIX_BOUNDARY',
  'PART_NUMBER',
  'YEAR_OF_ANNUAL',
  'COLLATION_KEY',
  'TEXT_CASE',
  'OTHER_LEVEL',
] as const;

type TitleStructureKind = (typeof TITLE_STRUCTURE_KINDS)[number];

export type OnixTitleCandidate = {
  /** The canonical path of the TitleDetail the candidate was first read from: stable, and unique in a scope. */
  readonly key: string;
  readonly titleType: string;
  readonly title: string;
  readonly subtitle: string;
  readonly fullTitle: string;
  readonly localeCode: LocaleCodeType | null;
  /** Findings that keep this candidate from becoming a Thoth title: an unresolved locale, conflicting languages, markup. */
  readonly issueFindingKeys: readonly string[];
  readonly provenance: readonly OnixSourceLocation[];
};

export type OnixTitleDecision = {
  /** Distinct Type-01 candidates: exactly one is the canonical title, or the publisher chooses. */
  readonly canonical: readonly OnixTitleCandidate[];
  /** Distinct TitleType 03, 06 and 16 candidates. */
  readonly alternates: readonly OnixTitleCandidate[];
  /** Candidates of every other role, offered only when no Type-01 title exists. */
  readonly others: readonly OnixTitleCandidate[];
  /** The choice of canonical title the source leaves open, when it does. */
  readonly canonicalFindingKey: string | null;
};

/** Where a scope's untagged titles may take their locale from, in precedence order. */
type TitleLocaleEvidence = {
  readonly textLocales: readonly LocaleCodeType[];
  readonly fromHeaderDefault: boolean;
};

const joinTitlePrefix = (prefix: string, rest: string): string =>
  /['’-]$/.test(prefix) ? `${prefix}${rest}` : `${prefix} ${rest}`;

/** Thoth's own `TitleProperties::compile_fulltitle`. */
export const compileFullTitle = (title: string, subtitle: string): string =>
  subtitle.length === 0 ? title : /[?!:.]$/.test(title) ? `${title} ${subtitle}` : `${title}: ${subtitle}`;

const attributeOf = (occurrence: Occurrence | undefined, name: string): string => {
  const value = occurrence?.value;

  return isElement(value) && typeof value[`@_${name}`] === 'string' ? (value[`@_${name}`] as string).trim() : '';
};

/** Whether an element holds child elements, which only an XHTML-enabled element may. */
const holdsElements = (occurrence: Occurrence): boolean =>
  isElement(occurrence.value) && Object.keys(occurrence.value).some((key) => key !== '#text' && !key.startsWith('@_'));

/**
 * The title candidates one scope states at its own level, each with the findings that decide whether it can
 * become a Thoth title row. Nothing is ranked: a TitleDetail either has one usable element at the level asked
 * for, or it contributes no candidate and says why.
 */
const normaliseTitles = (
  context: ProductContext,
  scope: ComponentScope,
  level: string,
  evidence: TitleLocaleEvidence,
): OnixTitleCandidate[] => {
  const discriminator = scope.componentPath ?? '';
  const candidates: OnixTitleCandidate[] = [];
  const kinds = new Set<TitleStructureKind>();
  const kindPaths: string[] = [];
  const unusable: string[] = [];
  const unrepresentedTypes = new Map<string, string[]>();

  const noteStructure = (kind: TitleStructureKind, path: string) => {
    kinds.add(kind);
    kindPaths.push(path);
  };

  children(scope.node, 'TitleDetail').forEach((detail) => {
    const titleType = childText(detail, 'TitleType');
    const elements = children(detail, 'TitleElement');
    const levels = elements.map((element) => childText(element, 'TitleElementLevel'));

    if (titleType.length === 0 || elements.length === 0 || levels.some((elementLevel) => elementLevel.length === 0)) {
      unusable.push(detail.path);

      return;
    }

    const atLevel = elements.filter((_element, index) => levels[index] === level);

    elements.forEach((element, index) => {
      if (levels[index] !== level) noteStructure('OTHER_LEVEL', element.path);
    });

    if (atLevel.length === 0) return;

    if (atLevel.length > 1) {
      const sequences = atLevel.map((element) => childText(element, 'SequenceNumber'));
      const order = sequences.every((sequence) => sequence.length === 0)
        ? 'SOURCE_ORDER'
        : sequences.every((sequence) => sequence.length > 0) && unique(sequences).length === sequences.length
          ? 'SEQUENCED'
          : 'AMBIGUOUS';

      context.findings.add({
        ...context,
        family: 'TITLE',
        code: 'TITLE_ELEMENTS_UNREPRESENTABLE',
        classification: 'TARGET_UNREPRESENTABLE',
        blocking: false,
        paths: atLevel.map(({ path }) => path),
        discriminator: detail.path,
        detail: { titleType, order },
        message: `A title of ${scope.describe} is made of ${atLevel.length} parts at the same level; Thoth's title and subtitle cannot represent that structure, and no approved rule splits it, so this title is not imported`,
      });

      return;
    }

    const [element] = atLevel;
    const titleText = children(element, 'TitleText')[0];
    const prefix = children(element, 'TitlePrefix')[0];
    const without = children(element, 'TitleWithoutPrefix')[0];
    const subtitle = children(element, 'Subtitle')[0];
    const main =
      titleText !== undefined
        ? textOf(titleText)
        : without !== undefined
          ? prefix !== undefined
            ? joinTitlePrefix(textOf(prefix), textOf(without))
            : textOf(without)
          : '';

    if (prefix !== undefined && titleText === undefined) noteStructure('PREFIX_BOUNDARY', prefix.path);
    if (has(element, 'PartNumber')) noteStructure('PART_NUMBER', `${element.path}/PartNumber[1]`);
    if (has(element, 'YearOfAnnual')) noteStructure('YEAR_OF_ANNUAL', `${element.path}/YearOfAnnual[1]`);

    const pieces = [titleText, prefix, without, subtitle].filter((piece): piece is Occurrence => piece !== undefined);

    pieces.forEach((piece) => {
      if (attributeOf(piece, 'collationkey').length > 0) noteStructure('COLLATION_KEY', piece.path);
      if (attributeOf(piece, 'textcase').length > 0) noteStructure('TEXT_CASE', piece.path);
    });

    if (main.length === 0) return;

    if (!ALTERNATE_TITLE_TYPES.has(titleType) && titleType !== '01') {
      unrepresentedTypes.set(titleType, [...(unrepresentedTypes.get(titleType) ?? []), detail.path]);
    }

    const issues: string[] = [];
    const subtitleText = subtitle === undefined ? '' : textOf(subtitle);
    let fullTitle = compileFullTitle(main, subtitleText);

    /* Locale: the pieces' own language first, then the scope's text language, never an invented default. */
    const languages = unique(
      pieces.map((piece) => attributeOf(piece, 'language').toLowerCase()).filter((language) => language.length > 0),
    );
    const scripts = unique(
      pieces.map((piece) => attributeOf(piece, 'textscript')).filter((script) => script.length > 0),
    );
    let localeCode: LocaleCodeType | null = null;
    const describeTitle = `title "${main}" of ${scope.describe}`;

    if (languages.length > 1) {
      issues.push(
        context.findings.add({
          ...context,
          family: 'TITLE',
          code: 'TITLE_LANGUAGE_CONFLICT',
          classification: 'TARGET_INPUT_REQUIRED',
          blocking: false,
          paths: pieces.map(({ path }) => path),
          discriminator: detail.path,
          detail: { languages },
          message: `The parts of the ${describeTitle} declare different languages (${languages.join(', ')}), and one Thoth title row has one locale, so it cannot be imported as it stands`,
        }).key,
      );
    } else {
      const script = scripts.length === 1 ? scripts[0] : null;

      if (languages.length === 1) {
        const { locale, qualifierLost } = localeOfLanguage(languages[0], script, null);

        localeCode = locale ?? null;

        if (qualifierLost) {
          context.findings.add({
            ...context,
            family: 'TITLE',
            code: 'TITLE_SCRIPT_NOT_REPRESENTED',
            classification: 'SUPPORTED_WITH_WARNING',
            blocking: false,
            paths: pieces.map(({ path }) => path),
            discriminator: detail.path,
            detail: { language: languages[0], script: script ?? '' },
            message: `The ${describeTitle} declares script ${script}, which Thoth has no ${languages[0]} locale for, so it is imported with the base language locale`,
          });
        }
      } else if (evidence.textLocales.length === 1) {
        localeCode = evidence.textLocales[0];

        if (evidence.fromHeaderDefault) {
          context.findings.add({
            ...context,
            family: 'TITLE',
            code: 'TITLE_HEADER_DEFAULT_LANGUAGE',
            classification: 'SUPPORTED_NORMALIZED',
            blocking: false,
            paths: [detail.path],
            discriminator: detail.path,
            detail: { localeCode },
            message: `The ${describeTitle} declares no language, so it takes the locale of the message Header's default language of text`,
          });
        }
      }

      if (localeCode === null) {
        issues.push(
          context.findings.add({
            ...context,
            family: 'TITLE',
            code: 'TITLE_LOCALE_UNRESOLVED',
            classification: 'TARGET_INPUT_REQUIRED',
            blocking: false,
            paths: [detail.path],
            discriminator: detail.path,
            detail: { languages, textLocales: evidence.textLocales },
            message:
              languages.length === 1
                ? `The ${describeTitle} is in language ${languages[0]}, which has no Thoth locale, so it cannot be imported as it stands`
                : evidence.textLocales.length > 1
                  ? `The ${describeTitle} declares no language, and the text is in more than one language (${evidence.textLocales.join(', ')}), so its locale cannot be decided`
                  : `The ${describeTitle} declares no language, and nothing else in the file states one, so its locale cannot be decided; Thoth never assumes English`,
          }).key,
        );
      }
    }

    /* The display statement, where the source supplies one Thoth can hold as its full title. */
    const statement = children(detail, 'TitleStatement')[0];

    if (statement !== undefined) {
      const statementText = textOf(statement);
      const statementLanguage = attributeOf(statement, 'language').toLowerCase();

      if (holdsElements(statement) || TAG_SHAPE.test(statementText)) {
        context.findings.add({
          ...context,
          family: 'TITLE',
          code: 'TITLE_STATEMENT_UNREPRESENTABLE',
          classification: 'TARGET_UNREPRESENTABLE',
          blocking: false,
          paths: [statement.path],
          detail: { reason: 'MARKUP' },
          message: `The title statement of ${scope.describe} carries markup Thoth's title import cannot keep, so the full title is compiled from the title and subtitle instead`,
        });
      } else if (statementLanguage.length > 0 && languages.length === 1 && statementLanguage !== languages[0]) {
        context.findings.add({
          ...context,
          family: 'TITLE',
          code: 'TITLE_STATEMENT_UNREPRESENTABLE',
          classification: 'TARGET_UNREPRESENTABLE',
          blocking: false,
          paths: [statement.path],
          detail: { reason: 'LANGUAGE' },
          message: `The title statement of ${scope.describe} is in ${statementLanguage}, not in the title's language, so the full title is compiled from the title and subtitle instead`,
        });
      } else if (statementText.length > 0) {
        fullTitle = statementText;
      }
    }

    if ([main, subtitleText, fullTitle].some((text) => TAG_SHAPE.test(text))) {
      issues.push(
        context.findings.add({
          ...context,
          family: 'TITLE',
          code: 'TITLE_MARKUP_UNREPRESENTABLE',
          classification: 'TARGET_UNREPRESENTABLE',
          blocking: false,
          paths: pieces.map(({ path }) => path),
          discriminator: detail.path,
          message: `The ${describeTitle} contains text shaped like markup, which Thoth's title import would read as markup rather than as the characters the file states, so it cannot be imported as it stands`,
        }).key,
      );
    }

    if (ALTERNATE_TITLE_TYPES.has(titleType)) {
      context.findings.add({
        ...context,
        family: 'TITLE',
        code: 'TITLE_ROLE_NOT_REPRESENTED',
        classification: 'SUPPORTED_WITH_WARNING',
        blocking: false,
        paths: [detail.path],
        detail: { titleType },
        message: `The ${describeTitle} has TitleType ${titleType}; Thoth keeps it as another title of the Work but cannot record that role`,
      });
    }

    candidates.push({
      key: detail.path,
      titleType,
      title: main,
      subtitle: subtitleText,
      fullTitle,
      localeCode,
      issueFindingKeys: issues,
      provenance: [context.findings.locateOf(detail.path)],
    });
  });

  if (unusable.length > 0) {
    context.findings.add({
      ...context,
      family: 'TITLE',
      code: 'TITLE_STRUCTURE_UNUSABLE',
      classification: 'PREFLIGHT_GAP',
      blocking: true,
      paths: unusable,
      discriminator,
      message: `A title of ${scope.describe} lacks the TitleType, TitleElement or TitleElementLevel canonical source validation requires; it is not repaired, and not imported`,
    });
  }

  if (unrepresentedTypes.size > 0) {
    context.findings.add({
      ...context,
      family: 'TITLE',
      code: 'TITLE_TYPE_UNREPRESENTABLE',
      classification: 'TARGET_UNREPRESENTABLE',
      blocking: false,
      paths: [...unrepresentedTypes.values()].flat(),
      discriminator,
      detail: { titleTypes: [...unrepresentedTypes.keys()] },
      message: `Titles of ${scope.describe} with TitleType ${[...unrepresentedTypes.keys()].join(', ')} have roles a Thoth title cannot carry, so they were not imported`,
    });
  }

  if (kinds.size > 0) {
    context.findings.add({
      ...context,
      family: 'TITLE',
      code: 'TITLE_STRUCTURE_LOSS',
      classification: 'SUPPORTED_WITH_WARNING',
      blocking: false,
      paths: kindPaths,
      discriminator,
      detail: { kinds: TITLE_STRUCTURE_KINDS.filter((kind) => kinds.has(kind)) },
      message: `Title structure of ${scope.describe} that Thoth's titles do not keep was not imported: ${TITLE_STRUCTURE_KINDS.filter((kind) => kinds.has(kind)).join(', ')}`,
    });
  }

  return candidates;
};

const titleSignature = ({ title, subtitle, fullTitle, localeCode }: OnixTitleCandidate) =>
  JSON.stringify([title, subtitle, fullTitle, localeCode]);

const mergeTitleCandidates = (candidates: readonly OnixTitleCandidate[]): OnixTitleCandidate[] => {
  const merged: OnixTitleCandidate[] = [];

  candidates.forEach((candidate) => {
    const index = merged.findIndex(
      (existing) =>
        existing.issueFindingKeys.length === 0 &&
        candidate.issueFindingKeys.length === 0 &&
        titleSignature(existing) === titleSignature(candidate),
    );

    if (index < 0) {
      merged.push(candidate);

      return;
    }

    merged[index] = { ...merged[index], provenance: [...merged[index].provenance, ...candidate.provenance] };
  });

  return merged;
};

const titleLabel = ({ fullTitle, localeCode }: OnixTitleCandidate) => `${fullTitle} (${localeCode ?? 'no locale'})`;

/**
 * One scope's titles as Thoth will hold them: exactly one canonical title, chosen by the publisher whenever the
 * source does not give exactly one distinct Type-01 title, plus the alternate titles whose locales stay distinct.
 */
const decideTitles = (
  candidates: readonly OnixTitleCandidate[],
  scope: FindingScope & {
    readonly describe: string;
    readonly discriminator: string;
    readonly paths: readonly string[];
  },
  findings: FindingCollector,
): OnixTitleDecision => {
  const canonical = mergeTitleCandidates(candidates.filter(({ titleType }) => titleType === '01'));
  const alternates = mergeTitleCandidates(candidates.filter(({ titleType }) => ALTERNATE_TITLE_TYPES.has(titleType)));
  const others = mergeTitleCandidates(
    candidates.filter(({ titleType }) => titleType !== '01' && !ALTERNATE_TITLE_TYPES.has(titleType)),
  );
  let canonicalFindingKey: string | null = null;

  if (canonical.length > 1) {
    canonicalFindingKey = findings.add({
      ...scope,
      family: 'TITLE',
      code: 'TITLE_CANONICAL_CONFLICT',
      classification: 'TARGET_INPUT_REQUIRED',
      blocking: true,
      paths: canonical.flatMap(({ provenance }) => provenance.map(({ path }) => path)),
      discriminator: scope.discriminator,
      detail: { titles: canonical.map(titleLabel) },
      resolution: {
        kind: 'CHOICE',
        options: canonical.map((candidate) => ({ key: candidate.key, label: titleLabel(candidate) })),
      },
      message: `${scope.describe} gives ${canonical.length} different distinctive titles (${canonical.map(titleLabel).join('; ')}); choose the canonical Thoth title. A title left in the same locale as the one chosen cannot also be imported`,
    }).key;
  } else if (canonical.length === 0) {
    const selectable = [...alternates, ...others];

    canonicalFindingKey = findings.add({
      ...scope,
      family: 'TITLE',
      code: 'TITLE_CANONICAL_MISSING',
      classification: 'TARGET_INPUT_REQUIRED',
      blocking: true,
      paths:
        selectable.length > 0
          ? selectable.flatMap(({ provenance }) => provenance.map(({ path }) => path))
          : scope.paths,
      discriminator: scope.discriminator,
      detail: { titles: selectable.map(titleLabel) },
      resolution:
        selectable.length > 0
          ? {
              kind: 'CHOICE',
              options: selectable.map((candidate) => ({
                key: candidate.key,
                label: `${titleLabel(candidate)} [TitleType ${candidate.titleType}]`,
              })),
            }
          : NO_RESOLUTION,
      message:
        selectable.length > 0
          ? `${scope.describe} has no distinctive title (TitleType 01); choose which of its other titles Thoth imports as the canonical title, knowing its own title role is not kept`
          : `${scope.describe} has no title at its own level that Thoth can import as the canonical title`,
    }).key;
  } else if (canonical[0].localeCode !== null) {
    const taken = new Set([canonical[0].localeCode]);
    const colliding = alternates.filter(({ localeCode }) => {
      if (localeCode === null) return false;
      if (taken.has(localeCode)) return true;

      taken.add(localeCode);

      return false;
    });

    if (colliding.length > 0) {
      findings.add({
        ...scope,
        family: 'TITLE',
        code: 'TITLE_LOCALE_COLLISION',
        classification: 'TARGET_UNREPRESENTABLE',
        blocking: false,
        paths: colliding.flatMap(({ provenance }) => provenance.map(({ path }) => path)),
        discriminator: scope.discriminator,
        detail: { titles: colliding.map(titleLabel) },
        message: `Titles of ${scope.describe} (${colliding.map(titleLabel).join('; ')}) share a locale with another title, and a Thoth Work holds one title per locale, so they were not imported`,
      });
    }
  }

  return { canonical, alternates, others, canonicalFindingKey };
};

/** The Thoth titles a title decision makes with the publisher's answers, and what is still unanswered. */
export const resolveTitles = (
  decision: OnixTitleDecision,
  findingsByKey: FindingLookup,
  choices: ChoiceMap,
): { readonly titles: TitleEntity[]; readonly pending: string[] } => {
  let chosen: OnixTitleCandidate | undefined =
    decision.canonicalFindingKey === null ? decision.canonical[0] : undefined;

  if (decision.canonicalFindingKey !== null) {
    const finding = findingsByKey.get(decision.canonicalFindingKey);
    const answer = finding === undefined ? null : answerOf(finding, choices);

    chosen = [...decision.canonical, ...decision.alternates, ...decision.others].find(({ key }) => key === answer);

    if (chosen === undefined) return { titles: [], pending: [decision.canonicalFindingKey] };
  }

  if (chosen === undefined) return { titles: [], pending: [] };

  if (chosen.localeCode === null || chosen.issueFindingKeys.length > 0) {
    return { titles: [], pending: [...chosen.issueFindingKeys] };
  }

  const titles: TitleEntity[] = [
    {
      id: appConfig.defaultId,
      canonical: true,
      title: chosen.title,
      subtitle: chosen.subtitle,
      fullTitle: chosen.fullTitle,
      localeCode: chosen.localeCode,
    },
  ];
  const locales = new Set<string>([chosen.localeCode]);

  [...decision.canonical, ...decision.alternates]
    .filter(
      (candidate) => candidate !== chosen && candidate.localeCode !== null && candidate.issueFindingKeys.length === 0,
    )
    .forEach((candidate) => {
      if (locales.has(candidate.localeCode as string)) return;

      locales.add(candidate.localeCode as string);
      titles.push({
        id: appConfig.defaultId,
        canonical: false,
        title: candidate.title,
        subtitle: candidate.subtitle,
        fullTitle: candidate.fullTitle,
        localeCode: candidate.localeCode as LocaleCodeType,
      });
    });

  return { titles, pending: [] };
};

/* ------------------------------------------------------------------------------------------------ */
/* Single values reconciled across a scope                                                          */
/* ------------------------------------------------------------------------------------------------ */

/** The option that omits a value the source gives but the publisher chooses not to import. */
export const OMIT_OPTION = 'OMIT';

/** One Work-level value: absent, decided by the source, or chosen by the publisher among the source's own values. */
export type OnixValueDecision<T extends string | number> =
  | { readonly kind: 'ABSENT' }
  | { readonly kind: 'VALUE'; readonly value: T }
  | {
      readonly kind: 'CHOICE';
      readonly findingKey: string;
      /** Option key to value; a null value omits it. */
      readonly options: readonly { readonly key: string; readonly value: T | null }[];
    }
  | { readonly kind: 'BLOCKED'; readonly findingKeys: readonly string[] };

const ABSENT: OnixValueDecision<never> = { kind: 'ABSENT' };

const resolveValue = <T extends string | number>(
  decision: OnixValueDecision<T>,
  findingsByKey: FindingLookup,
  choices: ChoiceMap,
): { readonly value: T | null; readonly pending: string[] } => {
  switch (decision.kind) {
    case 'ABSENT':
      return { value: null, pending: [] };
    case 'VALUE':
      return { value: decision.value, pending: [] };
    case 'BLOCKED':
      return { value: null, pending: [...decision.findingKeys] };
    case 'CHOICE': {
      const finding = findingsByKey.get(decision.findingKey);
      const answer = finding === undefined ? null : answerOf(finding, choices);
      const option = decision.options.find(({ key }) => key === answer);

      return option === undefined
        ? { value: null, pending: [decision.findingKey] }
        : { value: option.value, pending: [] };
    }
  }
};

/* ------------------------------------------------------------------------------------------------ */
/* Lifecycle (ONIX-AUDIT-PUBLISHING-DETAIL-01 5543477343, rules 30-55)                              */
/* ------------------------------------------------------------------------------------------------ */

type StatusRule =
  | { readonly kind: 'EXACT'; readonly status: WorkStatus }
  | { readonly kind: 'NORMALISED'; readonly status: WorkStatus }
  | { readonly kind: 'PERMANENT_WITHDRAWAL' }
  | { readonly kind: 'INACTIVE' }
  | { readonly kind: 'UNSPECIFIED' }
  | { readonly kind: 'CHOICE' };

/** ONIX List 64, as far as a create-mode import may take it. `21` is not a List 64 code at all. */
const PUBLISHING_STATUS_RULES: Readonly<Record<string, StatusRule>> = {
  '00': { kind: 'UNSPECIFIED' },
  '01': { kind: 'EXACT', status: WorkStatus.Cancelled },
  '02': { kind: 'EXACT', status: WorkStatus.Forthcoming },
  '03': { kind: 'EXACT', status: WorkStatus.PostponedIndefinitely },
  '04': { kind: 'EXACT', status: WorkStatus.Active },
  '05': { kind: 'CHOICE' },
  '06': { kind: 'CHOICE' },
  '07': { kind: 'PERMANENT_WITHDRAWAL' },
  '08': { kind: 'INACTIVE' },
  '09': { kind: 'UNSPECIFIED' },
  '10': { kind: 'CHOICE' },
  '11': { kind: 'PERMANENT_WITHDRAWAL' },
  '12': { kind: 'CHOICE' },
  '13': { kind: 'NORMALISED', status: WorkStatus.Active },
  '15': { kind: 'CHOICE' },
  '16': { kind: 'CHOICE' },
  '17': { kind: 'PERMANENT_WITHDRAWAL' },
  '18': { kind: 'NORMALISED', status: WorkStatus.Active },
};

/** The statuses a publisher may choose. Superseded needs a replacement relation this import cannot create. */
const CHOOSABLE_STATUSES: readonly WorkStatus[] = [
  WorkStatus.Forthcoming,
  WorkStatus.Active,
  WorkStatus.PostponedIndefinitely,
  WorkStatus.Withdrawn,
  WorkStatus.Cancelled,
];

const PUBLISHED_STATUSES: ReadonlySet<WorkStatus> = new Set([
  WorkStatus.Active,
  WorkStatus.Withdrawn,
  WorkStatus.Superseded,
]);
const OUT_OF_PRINT_STATUSES: ReadonlySet<WorkStatus> = new Set([WorkStatus.Withdrawn, WorkStatus.Superseded]);

const PUBLICATION_DATE_ROLE = '01';
const WITHDRAWN_DATE_ROLE = '13';

/** List 51: this Product is replaced by the related one. */
const REPLACED_BY_RELATION = '05';

type ProductLifecycle = {
  readonly publishingStatus: string | null;
  readonly statusPath: string | null;
  readonly notes: readonly string[];
  /** Complete calendar dates by role, as `YYYY-MM-DD`. */
  readonly dates: Readonly<Record<string, readonly string[]>>;
  readonly datePaths: readonly string[];
  readonly replacementPaths: readonly string[];
  readonly publishingPath: string;
};

export type OnixLifecycleDecision = {
  readonly status:
    | { readonly kind: 'VALUE'; readonly status: WorkStatus }
    | { readonly kind: 'CHOICE'; readonly findingKey: string }
    | { readonly kind: 'BLOCKED'; readonly findingKeys: readonly string[] };
  readonly publicationDate: string | null;
  readonly withdrawnDate: string | null;
  readonly notes: readonly string[];
  readonly locations: readonly OnixSourceLocation[];
};

const normaliseLifecycle = (context: ProductContext): ProductLifecycle => {
  const publishingDetail = children(context.record, 'PublishingDetail')[0] ?? {
    value: undefined,
    path: `${context.record.path}/PublishingDetail[1]`,
  };
  const status = children(publishingDetail, 'PublishingStatus')[0];
  const dates: Record<string, string[]> = {};
  const partial = new Map<string, { values: string[]; paths: string[] }>();
  const otherRoles: { role: string; path: string }[] = [];
  const datePaths: string[] = [];

  children(publishingDetail, 'PublishingDate').forEach((publishingDate) => {
    const role = childText(publishingDate, 'PublishingDateRole');
    const dateElement = children(publishingDate, 'Date')[0];

    if (role !== PUBLICATION_DATE_ROLE && role !== WITHDRAWN_DATE_ROLE) {
      otherRoles.push({ role, path: publishingDate.path });

      return;
    }

    datePaths.push(publishingDate.path);

    const day = readOnixDate(dateElement?.value as OnixText | undefined);

    if (day === undefined) {
      const raw = textOf(dateElement);
      const entry = partial.get(role) ?? { values: [], paths: [] };

      if (raw.length > 0) {
        entry.values.push(raw);
        entry.paths.push(publishingDate.path);
        partial.set(role, entry);
      }

      return;
    }

    dates[role] = unique([...(dates[role] ?? []), day]);
  });

  partial.forEach(({ values, paths }, role) =>
    context.findings.add({
      ...context,
      family: 'LIFECYCLE',
      code: 'LIFECYCLE_DATE_UNREPRESENTABLE',
      classification: 'TARGET_UNREPRESENTABLE',
      blocking: false,
      paths,
      discriminator: `partial|${role}`,
      detail: { role, values },
      message: `PublishingDate role ${role} of ${context.describe} (${values.join(', ')}) is not a complete calendar day, which is all Thoth can store; it was not imported and no day is invented`,
    }),
  );

  if (otherRoles.length > 0) {
    context.findings.add({
      ...context,
      family: 'LIFECYCLE',
      code: 'LIFECYCLE_DATE_UNREPRESENTABLE',
      classification: 'TARGET_UNREPRESENTABLE',
      blocking: false,
      paths: otherRoles.map(({ path }) => path),
      discriminator: 'roles',
      detail: { roles: unique(otherRoles.map(({ role }) => role)) },
      message: `Publishing dates of ${context.describe} in roles ${unique(otherRoles.map(({ role }) => role)).join(', ')} have no Thoth field, so they were not imported`,
    });
  }

  Object.entries(dates).forEach(([role, values]) => {
    if (values.length < 2) return;

    context.findings.add({
      ...context,
      family: 'LIFECYCLE',
      code: 'LIFECYCLE_DATE_CONFLICT',
      classification: 'SOURCE_CONFLICT',
      blocking: true,
      paths: datePaths,
      discriminator: role,
      detail: { role, dates: values },
      message: `${context.describe} gives more than one date (${values.join(', ')}) for PublishingDate role ${role}; choosing one would invent a history, so none is imported`,
    });
  });

  const replacementPaths = children(context.record, 'RelatedMaterial')
    .flatMap((relatedMaterial) => children(relatedMaterial, 'RelatedProduct'))
    .filter((relatedProduct) => childText(relatedProduct, 'ProductRelationCode') === REPLACED_BY_RELATION)
    .map(({ path }) => path);

  return {
    publishingStatus: status === undefined ? null : textOf(status),
    statusPath: status?.path ?? null,
    notes: childTexts(publishingDetail, 'PublishingStatusNote'),
    dates,
    datePaths,
    replacementPaths,
    publishingPath: publishingDetail.path,
  };
};

/** The target date invariants Thoth enforces, for one status: what may be stored, and what blocks. */
const lifecycleInvariants = (
  status: WorkStatus,
  decision: Pick<OnixLifecycleDecision, 'publicationDate' | 'withdrawnDate' | 'locations'>,
  scope: FindingScope & { readonly describe: string },
): { readonly withdrawnDate: string | null; readonly findings: readonly FindingInput[] } => {
  const findings: FindingInput[] = [];
  const base = { ...scope, family: 'LIFECYCLE' as const, paths: [] as string[], locations: decision.locations };

  if (PUBLISHED_STATUSES.has(status) && decision.publicationDate === null) {
    findings.push({
      ...base,
      code: 'LIFECYCLE_DATE_REQUIRED',
      classification: 'TARGET_INPUT_REQUIRED',
      blocking: true,
      discriminator: `${status}|${PUBLICATION_DATE_ROLE}`,
      detail: { status, role: PUBLICATION_DATE_ROLE },
      message: `${scope.describe} has status ${status}, which Thoth only stores with a complete publication date (PublishingDate role 01), and the file gives none; no date is invented`,
    });
  }

  if (OUT_OF_PRINT_STATUSES.has(status) && decision.withdrawnDate === null) {
    findings.push({
      ...base,
      code: 'LIFECYCLE_DATE_REQUIRED',
      classification: 'TARGET_INPUT_REQUIRED',
      blocking: true,
      discriminator: `${status}|${WITHDRAWN_DATE_ROLE}`,
      detail: { status, role: WITHDRAWN_DATE_ROLE },
      message: `${scope.describe} has status ${status}, which Thoth only stores with a complete withdrawal date (PublishingDate role 13), and the file gives none; no date is invented`,
    });
  }

  if (!OUT_OF_PRINT_STATUSES.has(status) && decision.withdrawnDate !== null) {
    findings.push({
      ...base,
      code: 'LIFECYCLE_DATE_NOT_STORED',
      classification: 'TARGET_UNREPRESENTABLE',
      blocking: false,
      discriminator: status,
      detail: { status, withdrawnDate: decision.withdrawnDate },
      message: `Withdrawal date ${decision.withdrawnDate} of ${scope.describe} cannot be stored for a Work with status ${status}, so it was not imported`,
    });
  }

  const withdrawnDate = OUT_OF_PRINT_STATUSES.has(status) ? decision.withdrawnDate : null;

  if (withdrawnDate !== null && decision.publicationDate !== null && withdrawnDate <= decision.publicationDate) {
    findings.push({
      ...base,
      code: 'LIFECYCLE_DATE_ORDER_INVALID',
      classification: 'TARGET_INPUT_REQUIRED',
      blocking: true,
      discriminator: status,
      detail: { publicationDate: decision.publicationDate, withdrawnDate },
      message: `${scope.describe} is withdrawn on ${withdrawnDate}, which is not after its publication on ${decision.publicationDate}; Thoth requires a withdrawal strictly after publication`,
    });
  }

  return { withdrawnDate, findings };
};

const reconcileLifecycle = (
  members: readonly ProductLifecycle[],
  scope: FindingScope & { readonly describe: string },
  findings: FindingCollector,
): OnixLifecycleDecision => {
  const locations = members.flatMap(({ publishingPath }) => [findings.locateOf(publishingPath)]);
  const codes = unique(
    members.flatMap(({ publishingStatus }) =>
      publishingStatus === null || PUBLISHING_STATUS_RULES[publishingStatus]?.kind === 'UNSPECIFIED'
        ? []
        : [publishingStatus],
    ),
  );
  const conflictFields: string[] = [];

  if (codes.length > 1) conflictFields.push('status');

  const dateOf = (role: string): string | null | undefined => {
    const values = unique(members.flatMap(({ dates }) => dates[role] ?? []));

    if (values.length > 1) {
      // Within one Product a repeat is that Product's conflict; across Products it is the grouped Work's.
      if (members.some(({ dates }) => (dates[role] ?? []).length > 1)) return undefined;

      conflictFields.push(role === PUBLICATION_DATE_ROLE ? 'publicationDate' : 'withdrawnDate');

      return undefined;
    }

    return values[0] ?? null;
  };

  const publicationDate = dateOf(PUBLICATION_DATE_ROLE);
  const withdrawnDate = dateOf(WITHDRAWN_DATE_ROLE);
  const notes = unique(members.flatMap(({ notes: memberNotes }) => memberNotes));

  if (conflictFields.length > 0) {
    const conflict = findings.add({
      ...scope,
      family: 'LIFECYCLE',
      code: 'LIFECYCLE_GROUP_CONFLICT',
      classification: 'SOURCE_CONFLICT',
      blocking: true,
      paths: members.flatMap(({ statusPath, datePaths }) => [
        ...(statusPath === null ? [] : [statusPath]),
        ...datePaths,
      ]),
      discriminator: 'group',
      detail: { fields: conflictFields },
      message: `The manifestations of ${scope.describe} disagree about the Work's ${conflictFields.join(' and ')}; one Work has one lifecycle, so none is chosen`,
    });

    return {
      status: { kind: 'BLOCKED', findingKeys: [conflict.key] },
      publicationDate: null,
      withdrawnDate: null,
      notes,
      locations,
    };
  }

  const code = codes[0] ?? null;
  const rule: StatusRule =
    code === null ? { kind: 'UNSPECIFIED' } : (PUBLISHING_STATUS_RULES[code] ?? { kind: 'CHOICE' });
  const statusPaths = members.flatMap(({ statusPath }) => (statusPath === null ? [] : [statusPath]));
  const replacementPaths = members.flatMap(({ replacementPaths: paths }) => paths);
  const decided = { publicationDate: publicationDate ?? null, withdrawnDate: withdrawnDate ?? null, notes, locations };

  if (code !== null && PUBLISHING_STATUS_RULES[code] === undefined) {
    const unusable = findings.add({
      ...scope,
      family: 'LIFECYCLE',
      code: 'LIFECYCLE_STATUS_UNUSABLE',
      classification: 'PREFLIGHT_GAP',
      blocking: true,
      paths: statusPaths,
      discriminator: code,
      detail: { publishingStatus: code },
      message: `PublishingStatus "${code}" of ${scope.describe} is not a List 64 code, which canonical source validation should have refused; no Work status is assumed for it`,
    });

    return { ...decided, status: { kind: 'BLOCKED', findingKeys: [unusable.key] } };
  }

  if ((rule.kind === 'PERMANENT_WITHDRAWAL' || rule.kind === 'INACTIVE') && replacementPaths.length > 0) {
    const unresolved = findings.add({
      ...scope,
      family: 'LIFECYCLE',
      code: 'LIFECYCLE_REPLACEMENT_UNRESOLVED',
      classification: 'TARGET_INPUT_REQUIRED',
      blocking: true,
      paths: [...statusPaths, ...replacementPaths],
      discriminator: code ?? '',
      detail: { publishingStatus: code ?? '' },
      message: `${scope.describe} has PublishingStatus ${code} and names a replacing product, so it may be Superseded rather than Withdrawn; that depends on the replacement relation, which this import does not resolve, so its status is not decided`,
    });

    return { ...decided, status: { kind: 'BLOCKED', findingKeys: [unresolved.key] } };
  }

  let status: OnixLifecycleDecision['status'];

  switch (rule.kind) {
    case 'EXACT':
      status = { kind: 'VALUE', status: rule.status };
      break;
    case 'NORMALISED':
      findings.add({
        ...scope,
        family: 'LIFECYCLE',
        code: 'LIFECYCLE_STATUS_NORMALISED',
        classification: 'SUPPORTED_WITH_WARNING',
        blocking: false,
        paths: statusPaths,
        discriminator: code ?? '',
        detail: { publishingStatus: code ?? '' },
        message: `PublishingStatus ${code} of ${scope.describe} is imported as ACTIVE; Thoth cannot record that the product is not sold separately or as a set`,
      });
      status = { kind: 'VALUE', status: rule.status };
      break;
    case 'PERMANENT_WITHDRAWAL':
      status = { kind: 'VALUE', status: WorkStatus.Withdrawn };
      break;
    default:
      status = {
        kind: 'CHOICE',
        findingKey: findings.add({
          ...scope,
          family: 'LIFECYCLE',
          code: 'LIFECYCLE_STATUS_REQUIRED',
          classification: 'TARGET_INPUT_REQUIRED',
          blocking: true,
          paths: statusPaths.length > 0 ? statusPaths : members.map(({ publishingPath }) => publishingPath),
          discriminator: code ?? 'omitted',
          detail: { publishingStatus: code ?? 'omitted' },
          resolution: { kind: 'CHOICE', options: CHOOSABLE_STATUSES.map((choice) => ({ key: choice, label: choice })) },
          message:
            code === null || rule.kind === 'UNSPECIFIED'
              ? `${scope.describe} does not specify its publishing status; choose the Work status Thoth records, which is never assumed to be Forthcoming`
              : `PublishingStatus ${code} of ${scope.describe} has no exact Thoth Work status; choose the status Thoth records`,
        }).key,
      };
  }

  if (status.kind === 'VALUE') {
    lifecycleInvariants(status.status, decided, scope).findings.forEach((finding) => findings.add(finding));
  }

  return { ...decided, status };
};

/* ------------------------------------------------------------------------------------------------ */
/* Copyright (5543477343 rules 56-64)                                                               */
/* ------------------------------------------------------------------------------------------------ */

type CopyrightKind = 'YEAR' | 'RIGHTS_TYPE' | 'OWNER_IDENTIFIER';

const COPYRIGHT_KINDS: readonly CopyrightKind[] = ['YEAR', 'RIGHTS_TYPE', 'OWNER_IDENTIFIER'];

type ProductCopyright = { readonly holder: string | null; readonly paths: readonly string[] };

const normaliseCopyright = (context: ProductContext): ProductCopyright => {
  const publishingDetail = children(context.record, 'PublishingDetail')[0];

  if (publishingDetail === undefined) return { holder: null, paths: [] };

  const names: string[] = [];
  const kinds = new Set<CopyrightKind>();
  const lossPaths: string[] = [];
  const statements = children(publishingDetail, 'CopyrightStatement');

  statements.forEach((statement) => {
    const type = childText(statement, 'CopyrightType') || 'C';

    if (has(statement, 'CopyrightYear')) {
      kinds.add('YEAR');
      lossPaths.push(statement.path);
    }

    if (type !== 'C') {
      kinds.add('RIGHTS_TYPE');
      lossPaths.push(statement.path);

      return;
    }

    children(statement, 'CopyrightOwner').forEach((owner) => {
      if (has(owner, 'CopyrightOwnerIdentifier')) {
        kinds.add('OWNER_IDENTIFIER');
        lossPaths.push(owner.path);
      }

      const name = childText(owner, 'PersonName') || childText(owner, 'CorporateName');

      if (name.length > 0) names.push(name);
    });
  });

  if (kinds.size > 0) {
    context.findings.add({
      ...context,
      family: 'COPYRIGHT',
      code: 'COPYRIGHT_UNREPRESENTABLE',
      classification: 'TARGET_UNREPRESENTABLE',
      blocking: false,
      paths: lossPaths,
      discriminator: 'copyright',
      detail: { kinds: COPYRIGHT_KINDS.filter((kind) => kinds.has(kind)) },
      message: `Copyright facts of ${context.describe} that Thoth's one copyright holder field cannot keep were not imported: ${COPYRIGHT_KINDS.filter((kind) => kinds.has(kind)).join(', ')}`,
    });
  }

  const holders = unique(names);

  if (holders.length > 1) {
    context.findings.add({
      ...context,
      family: 'COPYRIGHT',
      code: 'COPYRIGHT_NORMALISED',
      classification: 'SUPPORTED_NORMALIZED',
      blocking: false,
      paths: statements.map(({ path }) => path),
      discriminator: 'holders',
      detail: { holders },
      message: `The ${holders.length} copyright holders of ${context.describe} are imported as one holder text, in source order, separated by semicolons`,
    });
  }

  return { holder: holders.length > 0 ? holders.join('; ') : null, paths: statements.map(({ path }) => path) };
};

/* ------------------------------------------------------------------------------------------------ */
/* Funding (5543477343 rules 65-78)                                                                 */
/* ------------------------------------------------------------------------------------------------ */

const PUBLICATION_FUNDING_ROLES = new Set(['14', '16']);
const RESEARCH_FUNDING_ROLE = '15';
const ROR_IDENTIFIER_TYPE = '40';
const FUNDREF_IDENTIFIER_TYPE = '32';

/** Thoth's own proprietary FundingIdentifier names: meaningful only under the Thoth compatibility profile. */
const THOTH_FUNDING_NAMES = {
  programname: 'program',
  projectname: 'projectName',
  projectshortname: 'projectShortname',
  grantnumber: 'grantNumber',
} as const;

export type OnixPlannedFunding = {
  readonly program: string;
  readonly projectName: string;
  readonly projectShortname: string;
  readonly grantNumber: string;
};

export type OnixPlannedFunder = {
  /** The funder's identity key: its canonical ROR, else its canonical FundRef DOI. */
  readonly key: string;
  readonly ror: string | null;
  readonly fundrefDoi: string | null;
  readonly name: string;
  /** Generic fundings, and the same fundings as Thoth's own export conventions read them. */
  readonly fundings: readonly OnixPlannedFunding[];
  readonly profileFundings: readonly OnixPlannedFunding[];
  readonly provenance: readonly OnixSourceLocation[];
};

export type OnixFundingDecision = {
  readonly funders: readonly OnixPlannedFunder[];
  /** Findings that disclose Thoth's own proprietary funding names as lost: moot under the compatibility profile. */
  readonly thothConventionFindingKeys: readonly string[];
};

const EMPTY_FUNDING: OnixPlannedFunding = { program: '', projectName: '', projectShortname: '', grantNumber: '' };

const uniqueFundings = (fundings: readonly OnixPlannedFunding[]): OnixPlannedFunding[] =>
  fundings.filter(
    (funding, index) => fundings.findIndex((other) => JSON.stringify(other) === JSON.stringify(funding)) === index,
  );

const normaliseFunding = (context: ProductContext): OnixFundingDecision => {
  const publishingDetail = children(context.record, 'PublishingDetail')[0];

  if (publishingDetail === undefined) return { funders: [], thothConventionFindingKeys: [] };

  const funders: OnixPlannedFunder[] = [];
  const researchOnly: string[] = [];
  const normalisedRole: string[] = [];
  const unrepresented: { scheme: string; path: string }[] = [];
  const thothNames: { scheme: string; path: string }[] = [];

  children(publishingDetail, 'Publisher').forEach((publisher) => {
    const role = childText(publisher, 'PublishingRole');

    if (role === RESEARCH_FUNDING_ROLE) {
      researchOnly.push(publisher.path);

      return;
    }

    if (!PUBLICATION_FUNDING_ROLES.has(role)) return;

    if (role === '16') normalisedRole.push(publisher.path);

    const identifiers = children(publisher, 'PublisherIdentifier').map((identifier) => ({
      type: childText(identifier, 'PublisherIDType'),
      value: childText(identifier, 'IDValue'),
    }));
    const rors = unique(
      identifiers
        .filter(({ type }) => type === ROR_IDENTIFIER_TYPE)
        .map(({ value }) => canonicaliseRor(value))
        .filter((value) => value.length > 0),
    );
    const dois = unique(
      identifiers
        .filter(({ type }) => type === FUNDREF_IDENTIFIER_TYPE)
        .map(({ value }) => canonicaliseDoi(value))
        .filter((value) => value.length > 0),
    );
    const name = childText(publisher, 'PublisherName');

    if (rors.length > 1 || dois.length > 1) {
      context.findings.add({
        ...context,
        family: 'FUNDING',
        code: 'FUNDING_FUNDER_CONFLICT',
        classification: 'SOURCE_CONFLICT',
        blocking: true,
        paths: [publisher.path],
        detail: { rors, dois },
        message: `Funder "${name}" of ${context.describe} declares more than one identity (${[...rors, ...dois].join(', ')}); one Funding cannot name several institutions, so none is chosen`,
      });

      return;
    }

    if (rors.length === 0 && dois.length === 0) {
      context.findings.add({
        ...context,
        family: 'FUNDING',
        code: 'FUNDING_FUNDER_UNIDENTIFIED',
        classification: 'TARGET_INPUT_REQUIRED',
        blocking: true,
        paths: [publisher.path],
        detail: { name },
        resolution: { kind: 'ACKNOWLEDGE' },
        message: `Funder "${name}" of ${context.describe} declares no ROR or FundRef DOI, and a funder is never matched by name; acknowledge that its funding is not imported`,
      });

      return;
    }

    const fundings: OnixPlannedFunding[] = [];
    const profileFundings: OnixPlannedFunding[] = [];

    children(publisher, 'Funding').forEach((funding) => {
      const profile: Record<string, string> = {};

      children(funding, 'FundingIdentifier').forEach((identifier) => {
        const type = childText(identifier, 'FundingIDType');
        const typeName = childText(identifier, 'IDTypeName');
        const field = type === '01' ? THOTH_FUNDING_NAMES[typeName as keyof typeof THOTH_FUNDING_NAMES] : undefined;

        if (field !== undefined) {
          profile[field] = childText(identifier, 'IDValue');
          thothNames.push({ scheme: `01:${typeName}`, path: identifier.path });

          return;
        }

        unrepresented.push({ scheme: type === '01' ? `01:${typeName}` : type, path: identifier.path });
      });

      fundings.push(EMPTY_FUNDING);
      profileFundings.push({ ...EMPTY_FUNDING, ...profile });
    });

    funders.push({
      key: rors.length > 0 ? `ror:${rors[0]}` : `doi:${dois[0]}`,
      ror: rors[0] ?? null,
      fundrefDoi: dois[0] ?? null,
      name,
      fundings: fundings.length > 0 ? uniqueFundings(fundings) : [EMPTY_FUNDING],
      profileFundings: profileFundings.length > 0 ? uniqueFundings(profileFundings) : [EMPTY_FUNDING],
      provenance: [context.findings.locateOf(publisher.path)],
    });
  });

  if (researchOnly.length > 0) {
    context.findings.add({
      ...context,
      family: 'FUNDING',
      code: 'FUNDING_RESEARCH_ONLY_UNREPRESENTABLE',
      classification: 'TARGET_UNREPRESENTABLE',
      blocking: false,
      paths: researchOnly,
      discriminator: 'research',
      message: `Research funders (PublishingRole 15) of ${context.describe} did not fund the publication, and Thoth records publication funding only, so they were not imported`,
    });
  }

  if (normalisedRole.length > 0) {
    context.findings.add({
      ...context,
      family: 'FUNDING',
      code: 'FUNDING_ROLE_NORMALISED',
      classification: 'SUPPORTED_WITH_WARNING',
      blocking: false,
      paths: normalisedRole,
      discriminator: 'role16',
      message: `Funding bodies (PublishingRole 16) of ${context.describe} are imported as publication funding; Thoth cannot record that they also funded research`,
    });
  }

  if (unrepresented.length > 0) {
    context.findings.add({
      ...context,
      family: 'FUNDING',
      code: 'FUNDING_IDENTIFIER_UNREPRESENTABLE',
      classification: 'TARGET_UNREPRESENTABLE',
      blocking: false,
      paths: unrepresented.map(({ path }) => path),
      discriminator: 'identifiers',
      detail: { schemes: unique(unrepresented.map(({ scheme }) => scheme)) },
      message: `Funding identifiers of ${context.describe} (${unique(unrepresented.map(({ scheme }) => scheme)).join(', ')}) have no Thoth funding field; a grant DOI is never stored as a grant number, so they were not imported`,
    });
  }

  const thothConventionFindingKeys =
    thothNames.length === 0
      ? []
      : [
          context.findings.add({
            ...context,
            family: 'FUNDING',
            code: 'FUNDING_IDENTIFIER_UNREPRESENTABLE',
            classification: 'TARGET_UNREPRESENTABLE',
            blocking: false,
            paths: thothNames.map(({ path }) => path),
            discriminator: 'thoth-names',
            detail: { schemes: unique(thothNames.map(({ scheme }) => scheme)) },
            message: `Funding identifiers of ${context.describe} use Thoth's own proprietary names (${unique(thothNames.map(({ scheme }) => scheme)).join(', ')}), which are read only for a verified or confirmed Thoth export, so they were not imported`,
          }).key,
        ];

  return { funders, thothConventionFindingKeys };
};

const reconcileFunding = (
  members: readonly OnixFundingDecision[],
  scope: FindingScope & { readonly describe: string },
  findings: FindingCollector,
): OnixFundingDecision => {
  const funders: OnixPlannedFunder[] = [];

  members
    .flatMap(({ funders: memberFunders }) => memberFunders)
    .forEach((funder) => {
      const index = funders.findIndex(({ key }) => key === funder.key);

      if (index < 0) {
        funders.push(funder);

        return;
      }

      const existing = funders[index];

      funders[index] = {
        ...existing,
        fundings: uniqueFundings([...existing.fundings, ...funder.fundings]),
        profileFundings: uniqueFundings([...existing.profileFundings, ...funder.profileFundings]),
        provenance: [...existing.provenance, ...funder.provenance],
      };
    });

  funders.forEach((funder) => {
    const byGrant = new Map<string, OnixPlannedFunding[]>();

    funder.profileFundings.forEach((funding) => {
      if (funding.grantNumber.length === 0) return;

      byGrant.set(funding.grantNumber, [...(byGrant.get(funding.grantNumber) ?? []), funding]);
    });

    byGrant.forEach((grants, grantNumber) => {
      if (grants.length < 2) return;

      findings.add({
        ...scope,
        family: 'FUNDING',
        code: 'FUNDING_GROUP_CONFLICT',
        classification: 'SOURCE_CONFLICT',
        blocking: true,
        paths: [],
        locations: funder.provenance,
        discriminator: `${funder.key}|${grantNumber}`,
        detail: { funder: funder.key, grantNumber },
        message: `Grant ${grantNumber} of funder "${funder.name}" is described differently by the manifestations of ${scope.describe}; one Funding cannot hold both`,
      });
    });
  });

  return {
    funders,
    thothConventionFindingKeys: members.flatMap(({ thothConventionFindingKeys }) => thothConventionFindingKeys),
  };
};

/* ------------------------------------------------------------------------------------------------ */
/* Landing page and place of publication (5543477343 rules 21-29)                                   */
/* ------------------------------------------------------------------------------------------------ */

const LANDING_PAGE_PUBLISHER_ROLES = new Set(['01', '02']);
const WORK_WEBSITE_ROLE = '02';

/** The URL shape Thoth's database accepts for a landing page. */
const TARGET_URL = /^[^:]*:\/\/(?:[^/:]*:[^/@]*@)?(?:[^/:.]*\.)+([^:/]+)/i;

type ProductValues<T> = { readonly values: readonly T[]; readonly paths: readonly string[] };

const normaliseLandingPages = (context: ProductContext): ProductValues<string> => {
  const publishingDetail = children(context.record, 'PublishingDetail')[0];

  if (publishingDetail === undefined) return { values: [], paths: [] };

  const values: string[] = [];
  const paths: string[] = [];
  const ineligible: string[] = [];

  children(publishingDetail, 'Publisher').forEach((publisher) => {
    const eligible = LANDING_PAGE_PUBLISHER_ROLES.has(childText(publisher, 'PublishingRole'));

    children(publisher, 'Website')
      .filter((website) => childText(website, 'WebsiteRole') === WORK_WEBSITE_ROLE)
      .forEach((website) => {
        const link = childText(website, 'WebsiteLink');

        if (!eligible || !TARGET_URL.test(link)) {
          ineligible.push(website.path);

          return;
        }

        values.push(link);
        paths.push(website.path);
      });
  });

  if (ineligible.length > 0) {
    context.findings.add({
      ...context,
      family: 'LANDING_PAGE',
      code: 'LANDING_PAGE_UNREPRESENTABLE',
      classification: 'TARGET_UNREPRESENTABLE',
      blocking: false,
      paths: ineligible,
      discriminator: 'landing',
      message: `Work websites of ${context.describe} that do not belong to its publisher or co-publisher, or are not links Thoth can store, were not imported as the Work landing page`,
    });
  }

  return { values: unique(values), paths };
};

const normalisePlaces = (context: ProductContext): ProductValues<string> => {
  const publishingDetail = children(context.record, 'PublishingDetail')[0];

  if (publishingDetail === undefined) return { values: [], paths: [] };

  const cities = children(publishingDetail, 'CityOfPublication');
  const countries = children(publishingDetail, 'CountryOfPublication');

  if (countries.length > 0) {
    context.findings.add({
      ...context,
      family: 'PLACE',
      code: 'PLACE_UNREPRESENTABLE',
      classification: 'TARGET_UNREPRESENTABLE',
      blocking: false,
      paths: countries.map(({ path }) => path),
      discriminator: 'country',
      message: `The country of publication of ${context.describe} has no Thoth field and is never added to the place, so it was not imported`,
    });
  }

  return {
    values: unique(cities.map(textOf).filter((city) => city.length > 0)),
    paths: cities.map(({ path }) => path),
  };
};

/** Distinct values across a scope: one is the value, several are the publisher's choice. */
const reconcileValues = <T extends string | number>(
  members: readonly ProductValues<T>[],
  scope: FindingScope & { readonly describe: string },
  findings: FindingCollector,
  finding: Pick<FindingInput, 'family' | 'code' | 'message'> & { readonly omittable: boolean },
): OnixValueDecision<T> => {
  const values = unique(members.flatMap(({ values: memberValues }) => memberValues));

  if (values.length === 0) return ABSENT;
  if (values.length === 1) return { kind: 'VALUE', value: values[0] };

  const options = [
    ...values.map((value) => ({ key: String(value), value: value as T | null })),
    ...(finding.omittable ? [{ key: OMIT_OPTION, value: null }] : []),
  ];

  return {
    kind: 'CHOICE',
    findingKey: findings.add({
      ...scope,
      family: finding.family,
      code: finding.code,
      classification: 'TARGET_INPUT_REQUIRED',
      blocking: true,
      paths: members.flatMap(({ paths }) => paths),
      discriminator: 'values',
      detail: { values: values.map(String) },
      resolution: { kind: 'CHOICE', options: options.map(({ key }) => ({ key, label: key })) },
      message: finding.message,
    }).key,
    options,
  };
};

/* ------------------------------------------------------------------------------------------------ */
/* Extent, AncillaryContent, IllustrationsNote (5545670440 rules 66-79, 93-104; Amendment 3)        */
/* ------------------------------------------------------------------------------------------------ */

const PAGES_UNIT = '03';

const POSITIVE_WHOLE_NUMBER = /^\d+$/;

const normaliseExtent = (context: ProductContext, descriptive: Occurrence): ProductValues<number> => {
  const pageValues = new Map<string, number[]>();
  const losses: string[] = [];

  children(descriptive, 'Extent').forEach((extentOccurrence) => {
    const type = childText(extentOccurrence, 'ExtentType');
    const value = childText(extentOccurrence, 'ExtentValue');
    const unit = childText(extentOccurrence, 'ExtentUnit');

    if (unit !== PAGES_UNIT || !['00', '03', '04', '05'].includes(type) || !POSITIVE_WHOLE_NUMBER.test(value)) {
      losses.push(extentOccurrence.path);

      return;
    }

    pageValues.set(type, unique([...(pageValues.get(type) ?? []), Number(value)]));
  });

  const single = (type: string) => {
    const values = pageValues.get(type) ?? [];

    return values.length === 1 ? values[0] : undefined;
  };

  let candidates: number[] = [];
  const extentPaths = children(descriptive, 'Extent').map(({ path }) => path);

  if (pageValues.has('05')) {
    candidates = pageValues.get('05') ?? [];
  } else if (single('00') !== undefined && single('03') !== undefined && single('04') !== undefined) {
    candidates = [(single('00') as number) + (single('03') as number) + (single('04') as number)];

    context.findings.add({
      ...context,
      family: 'EXTENT',
      code: 'EXTENT_NORMALISED',
      classification: 'SUPPORTED_NORMALIZED',
      blocking: false,
      paths: extentPaths,
      discriminator: 'sum',
      detail: {
        mainContent: single('00') as number,
        frontMatter: single('03') as number,
        backMatter: single('04') as number,
      },
      message: `${context.describe} gives no total numbered pages, so its page count is the sum of its main content, front matter and back matter pages`,
    });
  } else if (pageValues.has('00')) {
    candidates = pageValues.get('00') ?? [];

    context.findings.add({
      ...context,
      family: 'EXTENT',
      code: 'EXTENT_MAIN_CONTENT_ONLY',
      classification: 'SUPPORTED_WITH_WARNING',
      blocking: false,
      paths: extentPaths,
      discriminator: 'main',
      message: `${context.describe} gives only its main content page count, which is imported as the Work page count although it is not a total of numbered pages`,
    });
  }

  const zero = candidates.filter((candidate) => candidate === 0);

  if (losses.length > 0 || zero.length > 0) {
    context.findings.add({
      ...context,
      family: 'EXTENT',
      code: 'EXTENT_UNREPRESENTABLE',
      classification: 'TARGET_UNREPRESENTABLE',
      blocking: false,
      paths: zero.length > 0 ? extentPaths : losses,
      discriminator: 'extent',
      message: `Extents of ${context.describe} that are not a page count Thoth can store as the Work page count (durations, file sizes, print-counterpart or other page measures, or zero pages) were not imported`,
    });
  }

  return { values: candidates.filter((candidate) => candidate > 0), paths: extentPaths };
};

type AncillaryKind = 'imageCount' | 'tableCount' | 'audioCount' | 'videoCount';

const ANCILLARY_KINDS: readonly AncillaryKind[] = ['imageCount', 'tableCount', 'audioCount', 'videoCount'];

/** Kinds only Thoth's own export convention defines: recorded music as audio, an unspecified "Videos" item as video. */
const THOTH_CONVENTION_KINDS: ReadonlySet<AncillaryKind> = new Set(['audioCount', 'videoCount']);

type ProductAncillary = {
  readonly counts: Readonly<Record<AncillaryKind, ProductValues<number>>>;
  readonly thothConventionFindingKeys: readonly string[];
};

const normaliseAncillary = (context: ProductContext, descriptive: Occurrence): ProductAncillary => {
  const counts: Record<AncillaryKind, { values: number[]; paths: string[] }> = {
    imageCount: { values: [], paths: [] },
    tableCount: { values: [], paths: [] },
    audioCount: { values: [], paths: [] },
    videoCount: { values: [], paths: [] },
  };
  const convention: { type: string; path: string }[] = [];
  const losses: { type: string; path: string }[] = [];
  const illustrations: string[] = [];

  children(descriptive, 'AncillaryContent').forEach((content) => {
    const type = childText(content, 'AncillaryContentType');
    const number = childText(content, 'Number');
    const description = childText(content, 'AncillaryContentDescription');
    const kind: AncillaryKind | undefined =
      type === '09'
        ? 'imageCount'
        : type === '11'
          ? 'tableCount'
          : type === '19'
            ? 'audioCount'
            : type === '00' && description === 'Videos'
              ? 'videoCount'
              : undefined;

    if (kind === undefined || !POSITIVE_WHOLE_NUMBER.test(number) || Number(number) === 0) {
      losses.push({ type, path: content.path });

      return;
    }

    if (THOTH_CONVENTION_KINDS.has(kind)) convention.push({ type, path: content.path });
    if (kind === 'imageCount') illustrations.push(content.path);

    counts[kind].values = unique([...counts[kind].values, Number(number)]);
    counts[kind].paths.push(content.path);
  });

  if (illustrations.length > 0) {
    context.findings.add({
      ...context,
      family: 'ANCILLARY_CONTENT',
      code: 'ANCILLARY_NORMALISED',
      classification: 'SUPPORTED_WITH_WARNING',
      blocking: false,
      paths: illustrations,
      discriminator: 'images',
      message: `Unspecified illustrations of ${context.describe} are imported as the Work image count, which does not keep the kind of illustration`,
    });
  }

  const thothConventionFindingKeys =
    convention.length === 0
      ? []
      : [
          context.findings.add({
            ...context,
            family: 'ANCILLARY_CONTENT',
            code: 'ANCILLARY_UNREPRESENTABLE',
            classification: 'TARGET_UNREPRESENTABLE',
            blocking: false,
            paths: convention.map(({ path }) => path),
            discriminator: 'thoth-convention',
            detail: { types: convention.map(({ type }) => type) },
            message: `Recorded music items and unspecified "Videos" of ${context.describe} are Thoth's own export convention for audio and video counts, read only for a verified or confirmed Thoth export, so they were not imported`,
          }).key,
        ];

  if (losses.length > 0) {
    context.findings.add({
      ...context,
      family: 'ANCILLARY_CONTENT',
      code: 'ANCILLARY_UNREPRESENTABLE',
      classification: 'TARGET_UNREPRESENTABLE',
      blocking: false,
      paths: losses.map(({ path }) => path),
      discriminator: 'losses',
      detail: { types: losses.map(({ type }) => type) },
      message: `Ancillary content of ${context.describe} that is not a count Thoth can store (types ${unique(losses.map(({ type }) => type)).join(', ')}, or a zero or missing number) was not imported`,
    });
  }

  return { counts, thothConventionFindingKeys };
};

type ProductIllustrationsNote = { readonly note: string | null; readonly findingKey: string | null };

const normaliseIllustrationsNote = (context: ProductContext, descriptive: Occurrence): ProductIllustrationsNote => {
  const notes = children(descriptive, 'IllustrationsNote');
  const texts = unique(notes.map(textOf).filter((text) => text.length > 0));

  if (texts.length === 0) return { note: null, findingKey: null };

  const finding = context.findings.add({
    ...context,
    family: 'ILLUSTRATIONS_NOTE',
    code: 'ILLUSTRATIONS_NOTE_UNREPRESENTABLE',
    classification: 'TARGET_UNREPRESENTABLE',
    blocking: false,
    paths: notes.map(({ path }) => path),
    discriminator: 'note',
    message: `The illustrations note of ${context.describe} describes illustrations and other content, which no Thoth Work field records, so it was not imported`,
  });

  return { note: texts.length === 1 ? texts[0] : null, findingKey: finding.key };
};

/* ------------------------------------------------------------------------------------------------ */
/* Contributors (ONIX-AUDIT-CONTRIBUTOR-01 5562159621, ORCID spellings per 5572802864)               */
/* ------------------------------------------------------------------------------------------------ */

/** ONIX List 17 as pinned at codelist Issue 74: every role a supported source may carry. */
const LIST_17: ReadonlySet<string> = new Set([
  'A01',
  'A02',
  'A03',
  'A04',
  'A05',
  'A06',
  'A07',
  'A08',
  'A09',
  'A10',
  'A11',
  'A12',
  'A13',
  'A14',
  'A15',
  'A16',
  'A17',
  'A18',
  'A19',
  'A20',
  'A21',
  'A22',
  'A23',
  'A24',
  'A25',
  'A26',
  'A27',
  'A28',
  'A29',
  'A30',
  'A31',
  'A32',
  'A33',
  'A34',
  'A35',
  'A36',
  'A37',
  'A38',
  'A39',
  'A40',
  'A41',
  'A42',
  'A43',
  'A44',
  'A45',
  'A46',
  'A47',
  'A48',
  'A49',
  'A50',
  'A51',
  'A52',
  'A56',
  'A99',
  'B01',
  'B02',
  'B03',
  'B04',
  'B05',
  'B06',
  'B07',
  'B08',
  'B09',
  'B10',
  'B11',
  'B12',
  'B13',
  'B14',
  'B15',
  'B16',
  'B17',
  'B18',
  'B19',
  'B20',
  'B21',
  'B22',
  'B23',
  'B24',
  'B25',
  'B26',
  'B27',
  'B28',
  'B29',
  'B30',
  'B31',
  'B32',
  'B33',
  'B34',
  'B35',
  'B36',
  'B99',
  'C01',
  'C02',
  'C03',
  'C04',
  'C99',
  'D01',
  'D02',
  'D03',
  'D04',
  'D99',
  'E01',
  'E02',
  'E03',
  'E04',
  'E05',
  'E06',
  'E07',
  'E08',
  'E09',
  'E10',
  'E11',
  'E99',
  'F01',
  'F02',
  'F99',
  'Z01',
  'Z02',
  'Z03',
  'Z04',
  'Z05',
  'Z06',
  'Z98',
  'Z99',
]);

/**
 * The approved List 17 -> ContributionType projections (rules 28-37), and nothing else: every other pinned
 * role is an explicit loss. There is no default. A06 is never MusicEditor, and B25 and A13 are generic ONIX
 * roles that do not become MusicEditor or Photographer.
 */
const ROLE_PROJECTIONS: Readonly<Record<string, readonly ContributionType[]>> = {
  A01: [ContributionType.Author],
  B01: [ContributionType.Editor],
  B06: [ContributionType.Translator],
  A08: [ContributionType.Photographer],
  A12: [ContributionType.Illustrator],
  A23: [ContributionType.ForewordBy],
  A24: [ContributionType.IntroductionBy],
  A19: [ContributionType.AfterwordBy],
  A15: [ContributionType.PrefaceBy],
  A30: [ContributionType.SoftwareBy],
  A51: [ContributionType.ResearchBy],
  A32: [ContributionType.ContributionsBy],
  A34: [ContributionType.Indexer],
  B10: [ContributionType.Editor, ContributionType.Translator],
  B08: [ContributionType.Translator],
  A29: [ContributionType.IntroductionBy],
};

/** Compound roles only part of which a Thoth contribution can say. */
const PARTIAL_ROLES: ReadonlySet<string> = new Set(['B08', 'A29']);

const ORCID_IDENTIFIER_TYPE = '21';
const CONTRIBUTOR_OWN_WEBSITE = '06';

/** Contributor metadata no Thoth contributor or contribution field keeps. */
const UNREPRESENTED_CONTRIBUTOR_METADATA = [
  'AlternativeName',
  'ContributorDate',
  'ContributorPlace',
  'ContributorDescription',
  'Prize',
];

export type OnixPlannedContribution = {
  readonly type: ContributionType;
  /** The contiguous 1..n position on the Work; never a source SequenceNumber. */
  readonly ordinal: number;
  readonly sourceRoles: readonly string[];
};

export type OnixPlannedAffiliation = {
  /** The declared ROR, canonical; the only key an Institution is ever matched by. */
  readonly ror: string;
  readonly text: string;
  readonly position: string;
  readonly provenance: readonly OnixSourceLocation[];
};

export type OnixPlannedBiography = {
  readonly content: string;
  readonly markup: ImportedMarkupFormat;
  readonly localeCode: LocaleCodeType;
  /** Whether it is the canonical biography, or null while the publisher has still to choose one. */
  readonly canonical: boolean | null;
  readonly provenance: readonly OnixSourceLocation[];
};

/** One source person, identity decided once, expanding into every contribution their mapped roles make. */
export type OnixContributorIntent = {
  readonly key: string;
  readonly fullName: string;
  /** The surname from structured name parts, or null when the source gives none: never split from a name. */
  readonly lastName: string | null;
  readonly firstName: string;
  /** The declared ORCID in Thoth's hyphenated form. */
  readonly orcid: string | null;
  /** The finding asking for the surname, which an exact ORCID identity may still supply. */
  readonly nameFindingKey: string | null;
  readonly website: string;
  readonly contributions: readonly OnixPlannedContribution[];
  readonly affiliations: readonly OnixPlannedAffiliation[];
  readonly biographies: readonly OnixPlannedBiography[];
  readonly biographyCanonicalFindingKey: string | null;
  readonly provenance: readonly OnixSourceLocation[];
};

export type OnixContributorDecision = {
  readonly intents: readonly OnixContributorIntent[];
  /** The scope says explicitly that it names no contributor. */
  readonly noContributor: boolean;
};

const EMPTY_CONTRIBUTORS: OnixContributorDecision = { intents: [], noContributor: false };

type ContributorScope = OnixContributorDecision & {
  /** A comparable description of every Contributor composite, for grouped manifestations. */
  readonly signature: string | null;
};

/** One declared ORCID in the spellings the approved compatibility rule accepts, or null when it is none of them. */
const declaredOrcid = (value: string): string | null => {
  const identifier = value.startsWith('https://orcid.org/')
    ? value.slice('https://orcid.org/'.length)
    : value.startsWith('orcid.org/')
      ? value.slice('orcid.org/'.length)
      : value;
  const canonical = canonicaliseOrcid(identifier);

  return canonical.length > 0 && canonicalImportOrcid(canonical) !== null ? canonical : null;
};

const joinNames = (...parts: string[]) => parts.filter((part) => part.length > 0).join(' ');

type ContributorComposite = {
  readonly occurrence: Occurrence;
  readonly kind: 'PERSON' | 'CORPORATE' | 'UNNAMED';
  readonly sequence: string;
  readonly roles: readonly string[];
};

const reduceContributorScope = (context: ProductContext, scope: ComponentScope): ContributorScope => {
  const discriminator = scope.componentPath ?? '';
  const noContributor = has(scope.node, 'NoContributor');
  const composites: ContributorComposite[] = children(scope.node, 'Contributor').map((occurrence) => ({
    occurrence,
    kind: has(occurrence, 'UnnamedPersons')
      ? 'UNNAMED'
      : (has(occurrence, 'CorporateName') || has(occurrence, 'CorporateNameInverted')) &&
          !has(occurrence, 'PersonName') &&
          !has(occurrence, 'KeyNames')
        ? 'CORPORATE'
        : 'PERSON',
    sequence: childText(occurrence, 'SequenceNumber'),
    roles: unique(childTexts(occurrence, 'ContributorRole')),
  }));

  const statements = children(scope.node, 'ContributorStatement');

  if (statements.length > 0) {
    context.findings.add({
      ...context,
      family: 'CONTRIBUTORS',
      code: 'CONTRIBUTOR_STATEMENT_UNREPRESENTABLE',
      classification: 'TARGET_UNREPRESENTABLE',
      blocking: false,
      paths: statements.map(({ path }) => path),
      discriminator,
      message: `The contributor statement of ${scope.describe} has no Thoth field and no people or roles are read out of it, so it was not imported`,
    });
  }

  if (composites.length === 0)
    return { intents: [], noContributor, signature: noContributor ? 'NO_CONTRIBUTOR' : null };

  /* Order, decided per source contributor before any role expansion. */
  const sequences = composites.map(({ sequence }) => sequence);
  const numbered = sequences.filter((sequence) => sequence.length > 0);
  const usable = numbered.every((sequence) => /^\d+$/.test(sequence) && Number(sequence) > 0);
  let ordered = composites;

  if (numbered.length > 0) {
    const values = numbered.map(Number);
    const uniqueValues = unique(values).length === values.length;
    const increasing = values.every((value, index) => index === 0 || value > values[index - 1]);

    if (usable && uniqueValues && numbered.length === composites.length) {
      ordered = [...composites].sort((a, b) => Number(a.sequence) - Number(b.sequence));
    } else if (usable && uniqueValues && increasing) {
      context.findings.add({
        ...context,
        family: 'CONTRIBUTORS',
        code: 'CONTRIBUTOR_ORDER_INCOMPLETE',
        classification: 'SUPPORTED_WITH_WARNING',
        blocking: false,
        paths: composites.map(({ occurrence }) => occurrence.path),
        discriminator,
        message: `Only some contributors of ${scope.describe} are numbered, consistently with the file's order, so the file's order is kept`,
      });
    } else {
      context.findings.add({
        ...context,
        family: 'CONTRIBUTORS',
        code: 'CONTRIBUTOR_ORDER_AMBIGUOUS',
        classification: 'TARGET_INPUT_REQUIRED',
        blocking: true,
        paths: composites.map(({ occurrence }) => occurrence.path),
        discriminator,
        detail: { sequenceNumbers: sequences },
        message: `The contributor sequence numbers of ${scope.describe} (${sequences.map((sequence) => sequence || '-').join(', ')}) are duplicated, malformed or contradict the file's order, so no contributor order can be decided`,
      });
    }
  }

  const identifierTypes: { type: string; path: string }[] = [];
  const otherWebsites: string[] = [];
  const affiliationIdentifiers: string[] = [];
  const metadata: string[] = [];
  const intents: OnixContributorIntent[] = [];
  const signatures: unknown[] = [];
  let ordinal = 0;

  ordered.forEach(({ occurrence, kind, roles }) => {
    const describeContributor = (name: string) =>
      `contributor ${name.length > 0 ? `"${name}"` : ''} of ${scope.describe}`.replace('  ', ' ');

    UNREPRESENTED_CONTRIBUTOR_METADATA.forEach((element) =>
      children(occurrence, element).forEach(({ path }) => metadata.push(path)),
    );

    if (kind !== 'PERSON') {
      const name = childText(occurrence, 'CorporateName') || childText(occurrence, 'CorporateNameInverted');

      context.findings.add({
        ...context,
        family: 'CONTRIBUTORS',
        code: 'CONTRIBUTOR_AGENT_UNREPRESENTABLE',
        classification: 'TARGET_UNREPRESENTABLE',
        blocking: true,
        paths: [occurrence.path],
        detail: { kind, roles },
        resolution: { kind: 'ACKNOWLEDGE' },
        message:
          kind === 'CORPORATE'
            ? `Corporate contributor "${name}" of ${scope.describe} cannot be a Thoth contributor, which is always a person, and is never made one; acknowledge that it is not imported`
            : `An unnamed contributor of ${scope.describe} (UnnamedPersons ${childText(occurrence, 'UnnamedPersons')}) cannot be a Thoth contributor and no placeholder person is created; acknowledge that it is not imported`,
      });
      signatures.push({ kind, name, roles: [...roles].sort() });

      return;
    }

    /* Names: never split from free text. */
    const personName = childText(occurrence, 'PersonName');
    const keyNames = childText(occurrence, 'KeyNames');
    const prefixToKey = childText(occurrence, 'PrefixToKey');
    const namesBeforeKey = childText(occurrence, 'NamesBeforeKey');
    const fullName =
      personName ||
      joinNames(
        childText(occurrence, 'TitlesBeforeNames'),
        namesBeforeKey,
        prefixToKey,
        keyNames,
        childText(occurrence, 'NamesAfterKey'),
        childText(occurrence, 'SuffixToKey'),
        childText(occurrence, 'LettersAfterNames'),
        childText(occurrence, 'TitlesAfterNames'),
      );
    const lastName = keyNames.length > 0 ? joinNames(prefixToKey, keyNames) : null;
    const displayName = fullName || childText(occurrence, 'PersonNameInverted');

    /* Roles: the approved projections only, one contribution per target type. */
    const contributionTypes: { type: ContributionType; sourceRoles: string[] }[] = [];
    const unmapped: string[] = [];
    const partial: string[] = [];
    const unpinned: string[] = [];

    roles.forEach((role) => {
      if (!LIST_17.has(role)) {
        unpinned.push(role);

        return;
      }

      const projections = ROLE_PROJECTIONS[role];

      if (projections === undefined) {
        unmapped.push(role);

        return;
      }

      if (PARTIAL_ROLES.has(role)) partial.push(role);

      projections.forEach((type) => {
        const existing = contributionTypes.find((candidate) => candidate.type === type);

        if (existing) existing.sourceRoles.push(role);
        else contributionTypes.push({ type, sourceRoles: [role] });
      });
    });

    if (roles.length === 0 || unpinned.length > 0) {
      context.findings.add({
        ...context,
        family: 'CONTRIBUTORS',
        code: 'CONTRIBUTOR_ROLE_UNREPRESENTABLE',
        classification: 'PREFLIGHT_GAP',
        blocking: true,
        paths: [occurrence.path],
        discriminator: `${occurrence.path}|unpinned`,
        detail: { roles: unpinned },
        message: `The ${describeContributor(displayName)} has ${roles.length === 0 ? 'no contributor role' : `roles outside the pinned List 17 (${unpinned.join(', ')})`}, which canonical source validation should have refused; no role is assumed`,
      });
    }

    if (unmapped.length > 0) {
      context.findings.add({
        ...context,
        family: 'CONTRIBUTORS',
        code: 'CONTRIBUTOR_ROLE_UNREPRESENTABLE',
        classification: 'TARGET_UNREPRESENTABLE',
        blocking: true,
        paths: [occurrence.path],
        detail: { roles: unmapped },
        resolution: { kind: 'ACKNOWLEDGE' },
        message: `The ${describeContributor(displayName)} has roles ${unmapped.join(', ')}, which no Thoth contribution type represents and which never become Author; acknowledge that they are not imported`,
      });
    }

    if (partial.length > 0) {
      context.findings.add({
        ...context,
        family: 'CONTRIBUTORS',
        code: 'CONTRIBUTOR_ROLE_FACET_LOST',
        classification: 'TARGET_UNREPRESENTABLE',
        blocking: true,
        paths: [occurrence.path],
        detail: { roles: partial },
        resolution: { kind: 'ACKNOWLEDGE' },
        message: `The ${describeContributor(displayName)} has compound roles ${partial.join(', ')}; Thoth keeps the translation or introduction but not the commentary or notes, so acknowledge that part is not imported`,
      });
    }

    /* Identity: an ORCID only where the source declares one. */
    const nameIdentifiers = children(occurrence, 'NameIdentifier').map((identifier) => ({
      type: childText(identifier, 'NameIDType'),
      value: childText(identifier, 'IDValue'),
      path: identifier.path,
    }));
    const declared = nameIdentifiers.filter(({ type }) => type === ORCID_IDENTIFIER_TYPE);
    const orcids = declared.map(({ value }) => declaredOrcid(value));
    const distinctOrcids = unique(orcids.filter((orcid): orcid is string => orcid !== null));
    let orcid: string | null = distinctOrcids.length === 1 ? distinctOrcids[0] : null;

    nameIdentifiers
      .filter(({ type }) => type !== ORCID_IDENTIFIER_TYPE)
      .forEach(({ type, path }) => identifierTypes.push({ type, path }));

    if (orcids.some((candidate) => candidate === null)) {
      orcid = null;
      context.findings.add({
        ...context,
        family: 'CONTRIBUTORS',
        code: 'CONTRIBUTOR_ORCID_INVALID',
        classification: 'TARGET_INPUT_REQUIRED',
        blocking: true,
        paths: declared.map(({ path }) => path),
        detail: { values: declared.map(({ value }) => value) },
        message: `The ${describeContributor(displayName)} declares an ORCID that is not a valid ORCID in any accepted spelling; it is not ignored and the contributor is not imported without it`,
      });
    } else if (distinctOrcids.length > 1) {
      context.findings.add({
        ...context,
        family: 'CONTRIBUTORS',
        code: 'CONTRIBUTOR_ORCID_CONFLICT',
        classification: 'SOURCE_CONFLICT',
        blocking: true,
        paths: declared.map(({ path }) => path),
        detail: { orcids: distinctOrcids },
        message: `The ${describeContributor(displayName)} declares different ORCIDs (${distinctOrcids.join(', ')}); one person has one identity, so none is chosen`,
      });
    }

    /* Website: the contributor's own only. */
    const websites = children(occurrence, 'Website');
    const ownWebsites = unique(
      websites
        .filter((website) => childText(website, 'WebsiteRole') === CONTRIBUTOR_OWN_WEBSITE)
        .map((website) => childText(website, 'WebsiteLink'))
        .filter((link) => link.length > 0),
    );

    websites
      .filter((website) => childText(website, 'WebsiteRole') !== CONTRIBUTOR_OWN_WEBSITE)
      .forEach(({ path }) => otherWebsites.push(path));

    if (ownWebsites.length > 1) {
      context.findings.add({
        ...context,
        family: 'CONTRIBUTORS',
        code: 'CONTRIBUTOR_WEBSITE_CONFLICT',
        classification: 'TARGET_INPUT_REQUIRED',
        blocking: true,
        paths: websites.map(({ path }) => path),
        detail: { websites: ownWebsites },
        resolution: { kind: 'ACKNOWLEDGE' },
        message: `The ${describeContributor(displayName)} gives several websites of their own (${ownWebsites.join(', ')}), and a Thoth contributor holds one; acknowledge that none is imported`,
      });
    }

    /* Affiliations: every one, identified by a declared ROR only. */
    const affiliations: OnixPlannedAffiliation[] = [];

    children(occurrence, 'ProfessionalAffiliation').forEach((affiliation) => {
      const identifiers = children(affiliation, 'AffiliationIdentifier').map((identifier) => ({
        type: childText(identifier, 'AffiliationIDType'),
        value: childText(identifier, 'IDValue'),
        path: identifier.path,
      }));
      const declaredRors = identifiers.filter(({ type }) => type === ROR_IDENTIFIER_TYPE);
      const rors = unique(declaredRors.map(({ value }) => canonicaliseRor(value)));
      const text = childText(affiliation, 'Affiliation');
      const positions = unique(childTexts(affiliation, 'ProfessionalPosition'));

      identifiers
        .filter(({ type }) => type !== ROR_IDENTIFIER_TYPE)
        .forEach(({ path }) => affiliationIdentifiers.push(path));

      if (rors.includes('')) {
        context.findings.add({
          ...context,
          family: 'CONTRIBUTORS',
          code: 'CONTRIBUTOR_AFFILIATION_ROR_INVALID',
          classification: 'TARGET_INPUT_REQUIRED',
          blocking: true,
          paths: declaredRors.map(({ path }) => path),
          detail: { values: declaredRors.map(({ value }) => value) },
          message: `An affiliation of the ${describeContributor(displayName)} declares a ROR that is not a valid ROR; it is never matched by its name instead`,
        });

        return;
      }

      if (rors.length > 1) {
        context.findings.add({
          ...context,
          family: 'CONTRIBUTORS',
          code: 'CONTRIBUTOR_AFFILIATION_ROR_CONFLICT',
          classification: 'SOURCE_CONFLICT',
          blocking: true,
          paths: declaredRors.map(({ path }) => path),
          detail: { rors },
          message: `An affiliation of the ${describeContributor(displayName)} declares different RORs (${rors.join(', ')}); one affiliation names one institution, so none is chosen`,
        });

        return;
      }

      if (rors.length === 0) {
        context.findings.add({
          ...context,
          family: 'CONTRIBUTORS',
          code: 'CONTRIBUTOR_AFFILIATION_UNIDENTIFIED',
          classification: 'TARGET_INPUT_REQUIRED',
          blocking: true,
          paths: [affiliation.path],
          detail: { affiliation: text },
          resolution: { kind: 'ACKNOWLEDGE' },
          message: `Affiliation "${text}" of the ${describeContributor(displayName)} declares no ROR, and an institution is never matched by name; acknowledge that the affiliation is not imported`,
        });

        return;
      }

      if (positions.length > 1) {
        context.findings.add({
          ...context,
          family: 'CONTRIBUTORS',
          code: 'CONTRIBUTOR_POSITION_CONFLICT',
          classification: 'TARGET_INPUT_REQUIRED',
          blocking: true,
          paths: [affiliation.path],
          detail: { positions },
          resolution: { kind: 'ACKNOWLEDGE' },
          message: `Affiliation "${text}" of the ${describeContributor(displayName)} gives several positions (${positions.join(', ')}), and a Thoth affiliation holds one; acknowledge that no position is imported`,
        });
      }

      const planned: OnixPlannedAffiliation = {
        ror: rors[0],
        text,
        position: positions.length === 1 ? positions[0] : '',
        provenance: [context.findings.locateOf(affiliation.path)],
      };

      if (
        !affiliations.some(
          (existing) =>
            existing.ror === planned.ror && existing.position === planned.position && existing.text === planned.text,
        )
      ) {
        affiliations.push(planned);
      }
    });

    /* Biographies: each its own locale and markup; English is never assumed. */
    const biographyCandidates: OnixPlannedBiography[] = [];

    children(occurrence, 'BiographicalNote').forEach((note) => {
      const content = textOf(note);

      if (content.length === 0) return;

      const declaredFormat = attributeOf(note, 'textformat');
      const resolution = resolveOnixTextMarkup(declaredFormat, content);
      const unrepresentable = (reason: string, tags: readonly string[] = []) =>
        context.findings.add({
          ...context,
          family: 'CONTRIBUTORS',
          code: 'CONTRIBUTOR_BIOGRAPHY_UNREPRESENTABLE',
          classification: 'TARGET_UNREPRESENTABLE',
          blocking: true,
          paths: [note.path],
          detail: { reason, tags },
          message:
            reason === 'FORMAT'
              ? `The biography of the ${describeContributor(displayName)} declares ONIX textformat "${declaredFormat}" but contains markup Thoth cannot safely read as HTML, JATS or plain text (${tags.map((tag) => `<${tag}>`).join(', ')}), so it cannot be imported`
              : `The biography of the ${describeContributor(displayName)} has a structure Thoth cannot represent without inventing or losing content, so it cannot be imported`,
        });

      if (resolution.kind === 'unclassifiable') {
        unrepresentable('FORMAT', resolution.tags);

        return;
      }

      let normalised = content;

      if (resolution.format === MarkupFormat.PlainText || resolution.format === MarkupFormat.Html) {
        const result =
          resolution.format === MarkupFormat.PlainText
            ? normaliseImportedPlainText(declaredFormat, content)
            : normaliseImportedAbstractHtml(content);

        if (result.kind === 'unrepresentable') {
          unrepresentable('STRUCTURE');

          return;
        }

        if (result.kind === 'empty') return;

        normalised = result.content;
      }

      const language = attributeOf(note, 'language').toLowerCase();
      const { locale } = language.length > 0 ? localeOfLanguage(language, null, null) : { locale: undefined };

      if (locale === undefined) {
        context.findings.add({
          ...context,
          family: 'CONTRIBUTORS',
          code: 'CONTRIBUTOR_BIOGRAPHY_LOCALE_UNRESOLVED',
          classification: 'TARGET_INPUT_REQUIRED',
          blocking: true,
          paths: [note.path],
          detail: { language },
          resolution: { kind: 'ACKNOWLEDGE' },
          message:
            language.length > 0
              ? `The biography of the ${describeContributor(displayName)} is in language ${language}, which has no Thoth locale; acknowledge that it is not imported`
              : `The biography of the ${describeContributor(displayName)} declares no language, and Thoth never assumes English or the Work's language for it; acknowledge that it is not imported`,
        });

        return;
      }

      biographyCandidates.push({
        content: normalised,
        markup: resolution.format,
        localeCode: locale,
        canonical: null,
        provenance: [context.findings.locateOf(note.path)],
      });
    });

    const byLocale = new Map<string, OnixPlannedBiography[]>();

    biographyCandidates.forEach((biography) =>
      byLocale.set(biography.localeCode, [...(byLocale.get(biography.localeCode) ?? []), biography]),
    );

    const biographies: OnixPlannedBiography[] = [];

    byLocale.forEach((ofLocale, localeCode) => {
      const contents = unique(ofLocale.map(({ content }) => content));

      if (contents.length > 1) {
        context.findings.add({
          ...context,
          family: 'CONTRIBUTORS',
          code: 'CONTRIBUTOR_BIOGRAPHY_LOCALE_COLLISION',
          classification: 'TARGET_INPUT_REQUIRED',
          blocking: true,
          paths: ofLocale.flatMap(({ provenance }) => provenance.map(({ path }) => path)),
          discriminator: `${occurrence.path}|${localeCode}`,
          detail: { localeCode },
          resolution: { kind: 'ACKNOWLEDGE' },
          message: `The ${describeContributor(displayName)} has different biographies in one locale (${localeCode}), and Thoth holds one per locale; acknowledge that none of them is imported`,
        });

        return;
      }

      biographies.push({ ...ofLocale[0], provenance: ofLocale.flatMap(({ provenance }) => provenance) });
    });

    let biographyCanonicalFindingKey: string | null = null;

    if (biographies.length > 1) {
      biographyCanonicalFindingKey = context.findings.add({
        ...context,
        family: 'CONTRIBUTORS',
        code: 'CONTRIBUTOR_BIOGRAPHY_CANONICAL_REQUIRED',
        classification: 'TARGET_INPUT_REQUIRED',
        blocking: true,
        paths: biographies.flatMap(({ provenance }) => provenance.map(({ path }) => path)),
        discriminator: `${occurrence.path}|canonical`,
        detail: { locales: biographies.map(({ localeCode }) => localeCode) },
        resolution: {
          kind: 'CHOICE',
          options: biographies.map(({ localeCode }) => ({ key: localeCode, label: localeCode })),
        },
        message: `The ${describeContributor(displayName)} has biographies in ${biographies.length} locales, and ONIX does not say which is primary; choose the canonical one`,
      }).key;
    }

    const plannedBiographies = biographies.map((biography) => ({
      ...biography,
      canonical: biographies.length === 1 ? true : null,
    }));

    signatures.push({
      kind,
      orcid,
      fullName,
      lastName,
      firstName: namesBeforeKey,
      roles: [...roles].sort(),
      website: ownWebsites,
      affiliations: affiliations.map(({ ror, position, text }) => [ror, position, text]),
      biographies: plannedBiographies.map(({ localeCode, content }) => [localeCode, content]),
    });

    if (contributionTypes.length === 0) return;

    const nameFindingKey =
      lastName === null || fullName.length === 0
        ? context.findings.add({
            ...context,
            family: 'CONTRIBUTORS',
            code: 'CONTRIBUTOR_NAME_REQUIRED',
            classification: 'TARGET_INPUT_REQUIRED',
            blocking: true,
            paths: [occurrence.path],
            detail: { name: displayName, orcid: orcid ?? '' },
            message: `The ${describeContributor(displayName)} gives no structured surname (KeyNames), which a new Thoth contributor requires; no surname is split out of the name${orcid === null ? '' : ', unless the exact ORCID identifies an existing contributor'}`,
          }).key
        : null;

    intents.push({
      key: occurrence.path,
      fullName,
      lastName,
      firstName: namesBeforeKey,
      orcid,
      nameFindingKey,
      website: ownWebsites.length === 1 ? ownWebsites[0] : '',
      contributions: contributionTypes.map(({ type, sourceRoles }) => {
        ordinal += 1;

        return { type, ordinal, sourceRoles };
      }),
      affiliations,
      biographies: plannedBiographies,
      biographyCanonicalFindingKey,
      provenance: [context.findings.locateOf(occurrence.path)],
    });
  });

  /* One person, one role on one Work: the same ORCID twice in one type cannot be two contributions. */
  intents.forEach((intent, index) => {
    if (intent.orcid === null) return;

    const earlier = intents
      .slice(0, index)
      .find(
        (other) =>
          other.orcid === intent.orcid &&
          other.contributions.some(({ type }) =>
            intent.contributions.some((contribution) => contribution.type === type),
          ),
      );

    if (earlier === undefined) return;

    context.findings.add({
      ...context,
      family: 'CONTRIBUTORS',
      code: 'CONTRIBUTOR_DUPLICATE_IDENTITY',
      classification: 'SOURCE_CONFLICT',
      blocking: true,
      paths: [earlier.key, intent.key],
      detail: { orcid: intent.orcid },
      message: `Two contributors of ${scope.describe} share ORCID ${intent.orcid} in the same role; one person holds each role on a Work once, so they are not imported until the source says who they are`,
    });
  });

  if (identifierTypes.length > 0) {
    context.findings.add({
      ...context,
      family: 'CONTRIBUTORS',
      code: 'CONTRIBUTOR_IDENTIFIER_UNREPRESENTABLE',
      classification: 'TARGET_UNREPRESENTABLE',
      blocking: false,
      paths: identifierTypes.map(({ path }) => path),
      discriminator,
      detail: { types: unique(identifierTypes.map(({ type }) => type)) },
      message: `Contributor identifiers of ${scope.describe} other than ORCID (NameIDType ${unique(identifierTypes.map(({ type }) => type)).join(', ')}) have no Thoth field, so they were not imported`,
    });
  }

  if (otherWebsites.length > 0) {
    context.findings.add({
      ...context,
      family: 'CONTRIBUTORS',
      code: 'CONTRIBUTOR_WEBSITE_UNREPRESENTABLE',
      classification: 'TARGET_UNREPRESENTABLE',
      blocking: false,
      paths: otherWebsites,
      discriminator,
      message: `Contributor web pages of ${scope.describe} that are not the contributor's own website (blogs, interviews, social or publisher pages) were not imported`,
    });
  }

  if (affiliationIdentifiers.length > 0) {
    context.findings.add({
      ...context,
      family: 'CONTRIBUTORS',
      code: 'CONTRIBUTOR_AFFILIATION_IDENTIFIER_UNREPRESENTABLE',
      classification: 'TARGET_UNREPRESENTABLE',
      blocking: false,
      paths: affiliationIdentifiers,
      discriminator,
      message: `Affiliation identifiers of ${scope.describe} other than ROR have no Thoth field, so they were not imported`,
    });
  }

  if (metadata.length > 0) {
    context.findings.add({
      ...context,
      family: 'CONTRIBUTORS',
      code: 'CONTRIBUTOR_METADATA_UNREPRESENTABLE',
      classification: 'TARGET_UNREPRESENTABLE',
      blocking: false,
      paths: metadata,
      discriminator,
      message: `Contributor details of ${scope.describe} such as alternative names, dates, places or descriptions have no Thoth field, so they were not imported`,
    });
  }

  if (intents.length > 0) {
    context.findings.add({
      ...context,
      family: 'CONTRIBUTORS',
      code: 'CONTRIBUTOR_MAIN_NORMALISED',
      classification: 'SUPPORTED_NORMALIZED',
      blocking: false,
      paths: intents.map(({ key }) => key),
      discriminator,
      message: `ONIX does not say which contributions of ${scope.describe} are main contributions, so every imported contribution is marked as main`,
    });
  }

  return { intents, noContributor, signature: JSON.stringify(signatures) };
};

/**
 * One grouped Work's contributors. Identity and roles are settled per manifestation; the Work takes the one set
 * every manifestation that names contributors agrees on. A silent manifestation is no contradiction; a
 * manifestation saying there is no contributor, beside one that names some, needs the publisher's consent; and
 * manifestations naming different contributors block rather than being merged.
 */
const reconcileContributors = (
  members: readonly ContributorScope[],
  scope: FindingScope & { readonly describe: string; readonly paths: readonly string[] },
  findings: FindingCollector,
): OnixContributorDecision => {
  if (members.length === 1) return { intents: members[0].intents, noContributor: members[0].noContributor };

  const naming = members.filter(({ signature }) => signature !== null && signature !== 'NO_CONTRIBUTOR');
  const saysNone = members.some(({ signature }) => signature === 'NO_CONTRIBUTOR');

  if (unique(naming.map(({ signature }) => signature)).length > 1) {
    findings.add({
      ...scope,
      family: 'CONTRIBUTORS',
      code: 'CONTRIBUTOR_GROUP_CONFLICT',
      classification: 'SOURCE_CONFLICT',
      blocking: true,
      paths: scope.paths,
      discriminator: 'group',
      message: `The manifestations of ${scope.describe} name different contributors; one Work has one contributor list, and contributors are never merged by name, so none is chosen`,
    });

    return EMPTY_CONTRIBUTORS;
  }

  if (naming.length === 0) return { intents: [], noContributor: saysNone };

  if (saysNone) {
    findings.add({
      ...scope,
      family: 'CONTRIBUTORS',
      code: 'CONTRIBUTOR_NO_CONTRIBUTOR_CONFLICT',
      classification: 'TARGET_INPUT_REQUIRED',
      blocking: true,
      paths: scope.paths,
      discriminator: 'no-contributor',
      resolution: { kind: 'ACKNOWLEDGE' },
      message: `One manifestation of ${scope.describe} says it has no contributor while another names contributors; Thoth cannot keep contributors per manifestation, so acknowledge that the Work takes the named contributors`,
    });
  }

  return { intents: naming[0].intents, noContributor: false };
};

/* ------------------------------------------------------------------------------------------------ */
/* Series / Collection / Issue (recovery ledger 5541009506 F)                                       */
/* ------------------------------------------------------------------------------------------------ */

const PUBLISHER_COLLECTION = '10';
const UNSPECIFIED_COLLECTION = '00';
const PUBLICATION_ORDER = '03';
const ISSN_IDENTIFIER_TYPE = '02';
const THOTH_SERIES_ID_NAME = 'Series ID';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISSN = /^\d{7}[\dX]$/;

/** The publisher's answer that an unspecified collection is, or is not, a Series. */
export const SERIES_CLASSIFICATION = { SERIES: 'SERIES', NOT_SERIES: 'NOT_SERIES' } as const;

/** Collection metadata no Thoth Series or Issue field keeps. */
const UNREPRESENTED_COLLECTION_METADATA = [
  'CollectionFrequency',
  'Contributor',
  'ContributorStatement',
  'NoContributor',
];

export type OnixSeriesMembership = {
  /** The membership's identity: its first ISSN, else its normalised name. */
  readonly key: string;
  readonly name: string;
  /** Declared ISSNs, in Thoth's hyphenated form. ONIX does not say which is print and which digital. */
  readonly issns: readonly string[];
  /** Thoth's own proprietary Series ID, honoured only under the Thoth compatibility profile. */
  readonly thothSeriesId: string | null;
  /** The publication-order position (CollectionSequenceType 03): Thoth's issue ordinal. */
  readonly ordinal: number | null;
  /** An integer collection-level PartNumber: Thoth's issue number. */
  readonly issueNumber: number | null;
  /** The publisher's classification of an unspecified collection, when one is needed. */
  readonly classificationFindingKey: string | null;
  /** The acknowledgement that omits a membership whose publication order the file does not give. */
  readonly ordinalFindingKey: string | null;
  readonly provenance: readonly OnixSourceLocation[];
};

export type OnixSeriesDecision = {
  readonly memberships: readonly OnixSeriesMembership[];
  readonly noCollection: boolean;
};

const EMPTY_SERIES: OnixSeriesDecision = { memberships: [], noCollection: false };

/** A title element's display text: its TitleText, or its prefix joined to the text without it. */
const titleElementText = (element: Occurrence): string => {
  const titleText = childText(element, 'TitleText');

  if (titleText.length > 0) return titleText;

  const without = childText(element, 'TitleWithoutPrefix');
  const prefix = childText(element, 'TitlePrefix');

  return without.length === 0 ? '' : prefix.length > 0 ? joinTitlePrefix(prefix, without) : without;
};

const reduceSeriesScope = (context: ProductContext, descriptive: Occurrence): OnixSeriesDecision => {
  const collections = children(descriptive, 'Collection');
  const noCollection = has(descriptive, 'NoCollection');
  const memberships: OnixSeriesMembership[] = [];
  const identifierLosses: { scheme: string; path: string }[] = [];
  const sequenceLosses: { type: string; path: string }[] = [];
  const metadataLosses: string[] = [];

  /* ONIX lets a sole collection's title sit in the Product's own title detail, at the collection level. */
  const productCollectionElements = children(descriptive, 'TitleDetail')
    .filter((detail) => childText(detail, 'TitleType') === '01')
    .flatMap((detail) => children(detail, 'TitleElement'))
    .filter((element) => childText(element, 'TitleElementLevel') === TITLE_LEVEL.COLLECTION);

  collections.forEach((collection) => {
    const type = childText(collection, 'CollectionType');

    UNREPRESENTED_COLLECTION_METADATA.forEach((element) =>
      children(collection, element).forEach(({ path }) => metadataLosses.push(path)),
    );

    if (type !== PUBLISHER_COLLECTION && type !== UNSPECIFIED_COLLECTION && type.length > 0) {
      context.findings.add({
        ...context,
        family: 'SERIES',
        code: 'SERIES_COLLECTION_UNREPRESENTABLE',
        classification: 'TARGET_UNREPRESENTABLE',
        blocking: false,
        paths: [collection.path],
        detail: { collectionType: type },
        message: `Collection type ${type} of ${context.describe} is an editorial or ascribed grouping, not the publisher's Series, so no Series membership is imported from it`,
      });

      return;
    }

    /* Identifiers, by declared scheme only. */
    const issns: string[] = [];
    let thothSeriesId: string | null = null;

    children(collection, 'CollectionIdentifier').forEach((identifier) => {
      const idType = childText(identifier, 'CollectionIDType');
      const typeName = childText(identifier, 'IDTypeName');
      const value = childText(identifier, 'IDValue');
      const compact = value.replace(/[\s-]/g, '').toUpperCase();

      if (idType === ISSN_IDENTIFIER_TYPE && ISSN.test(compact)) {
        issns.push(`${compact.slice(0, 4)}-${compact.slice(4)}`);
      } else if (idType === '01' && typeName === THOTH_SERIES_ID_NAME && UUID.test(value)) {
        thothSeriesId = value.toLowerCase();
      } else {
        identifierLosses.push({ scheme: idType === '01' ? `01:${typeName}` : idType, path: identifier.path });
      }
    });

    /* Name and issue number, at the collection level and never below it. */
    const ownElements = children(collection, 'TitleDetail')
      .filter((detail) => childText(detail, 'TitleType') === '01')
      .flatMap((detail) => children(detail, 'TitleElement'));
    const deeper = ownElements.filter((element) => {
      const level = childText(element, 'TitleElementLevel');

      return level !== TITLE_LEVEL.COLLECTION && level !== TITLE_LEVEL.PRODUCT;
    });

    if (deeper.length > 0) {
      context.findings.add({
        ...context,
        family: 'SERIES',
        code: 'SERIES_HIERARCHY_UNREPRESENTABLE',
        classification: 'TARGET_UNREPRESENTABLE',
        blocking: true,
        paths: deeper.map(({ path }) => path),
        message: `A collection of ${context.describe} has a subcollection, and a Thoth Series has no hierarchy; it is never flattened into its collection, so the membership is not imported as it stands`,
      });

      return;
    }

    const collectionElements = ownElements.filter(
      (element) => childText(element, 'TitleElementLevel') === TITLE_LEVEL.COLLECTION,
    );
    const elements =
      collectionElements.length > 0
        ? collectionElements
        : collections.length === 1 && !has(collection, 'TitleDetail')
          ? productCollectionElements
          : [];
    const names = unique(elements.map(titleElementText).filter((name) => name.length > 0));

    if (names.length !== 1) {
      context.findings.add({
        ...context,
        family: 'SERIES',
        code: 'SERIES_TITLE_MISSING',
        classification: 'TARGET_INPUT_REQUIRED',
        blocking: true,
        paths: [collection.path, ...elements.map(({ path }) => path)],
        detail: { names },
        message:
          names.length === 0
            ? `A collection of ${context.describe} has no collection-level title, so no Series can be identified or created for it`
            : `A collection of ${context.describe} has several titles (${names.join(', ')}), so its Series cannot be identified`,
      });

      return;
    }

    const partNumbers = unique(
      elements.map((element) => childText(element, 'PartNumber')).filter((part) => part.length > 0),
    );
    let issueNumber: number | null = null;

    if (
      partNumbers.length === 1 &&
      /^\d+$/.test(partNumbers[0]) &&
      Number(partNumbers[0]) > 0 &&
      Number(partNumbers[0]) <= MAX_ISSUE_ORDINAL
    ) {
      issueNumber = Number(partNumbers[0]);
    } else if (partNumbers.length > 0) {
      context.findings.add({
        ...context,
        family: 'SERIES',
        code: 'SERIES_PART_NUMBER_UNREPRESENTABLE',
        classification: 'TARGET_UNREPRESENTABLE',
        blocking: false,
        paths: elements.map(({ path }) => path),
        detail: { partNumbers },
        message: `Part number ${partNumbers.join(', ')} of Series "${names[0]}" in ${context.describe} is not one whole number Thoth can store as an issue number, so it was not imported`,
      });
    }

    /* Publication order, and only publication order. */
    const sequences = children(collection, 'CollectionSequence').map((sequence) => ({
      type: childText(sequence, 'CollectionSequenceType'),
      number: childText(sequence, 'CollectionSequenceNumber'),
      path: sequence.path,
    }));
    const publicationOrder = sequences.filter(({ type }) => type === PUBLICATION_ORDER);

    sequences
      .filter(({ type }) => type !== PUBLICATION_ORDER)
      .forEach(({ type, path }) => sequenceLosses.push({ type, path }));

    const numbers = unique(publicationOrder.map(({ number }) => number));

    if (numbers.some((number) => /^\d+$/.test(number) && Number(number) > MAX_ISSUE_ORDINAL)) {
      context.findings.add({
        ...context,
        family: 'SERIES',
        code: 'SERIES_ORDINAL_OUT_OF_RANGE',
        classification: 'TARGET_UNREPRESENTABLE',
        blocking: true,
        paths: publicationOrder.map(({ path }) => path),
        detail: { numbers },
        message: `Series "${names[0]}" of ${context.describe} gives publication-order number ${numbers.join(', ')}, beyond the issue ordinals Thoth can store (1 to ${MAX_ISSUE_ORDINAL})`,
      });

      return;
    }

    const usable = unique(numbers.filter((number) => /^\d+$/.test(number) && Number(number) > 0).map(Number));

    if (usable.length > 1 || usable.length !== numbers.length) {
      context.findings.add({
        ...context,
        family: 'SERIES',
        code: 'SERIES_ORDINAL_CONFLICT',
        classification: 'SOURCE_CONFLICT',
        blocking: true,
        paths: publicationOrder.map(({ path }) => path),
        detail: { numbers },
        message: `Series "${names[0]}" of ${context.describe} is given more than one publication-order number (${numbers.join(', ')}), so no issue ordinal is chosen`,
      });

      return;
    }

    const classificationFindingKey =
      type === PUBLISHER_COLLECTION
        ? null
        : context.findings.add({
            ...context,
            family: 'SERIES',
            code: 'SERIES_COLLECTION_TYPE_REQUIRED',
            classification: 'TARGET_INPUT_REQUIRED',
            blocking: true,
            paths: [collection.path],
            detail: { collectionType: type || 'omitted', name: names[0] },
            resolution: {
              kind: 'CHOICE',
              options: Object.values(SERIES_CLASSIFICATION).map((option) => ({ key: option, label: option })),
            },
            message: `Collection "${names[0]}" of ${context.describe} does not say whether it is the publisher's own collection; say whether Thoth should treat it as a Series`,
          }).key;

    const ordinalFindingKey =
      usable.length === 1
        ? null
        : context.findings.add({
            ...context,
            family: 'SERIES',
            code: 'SERIES_ORDINAL_REQUIRED',
            classification: 'TARGET_INPUT_REQUIRED',
            blocking: true,
            paths: [collection.path],
            detail: { name: names[0] },
            resolution: { kind: 'ACKNOWLEDGE' },
            message: `Series "${names[0]}" of ${context.describe} gives no publication-order number, and Thoth never numbers an issue by appending it after the highest; acknowledge that this Series membership is not imported`,
          }).key;

    memberships.push({
      key: issns.length > 0 ? `issn:${issns[0]}` : `name:${normalizeSeriesName(names[0])}`,
      name: names[0],
      issns: unique(issns),
      thothSeriesId,
      ordinal: usable.length === 1 ? usable[0] : null,
      issueNumber,
      classificationFindingKey,
      ordinalFindingKey,
      provenance: [context.findings.locateOf(collection.path)],
    });
  });

  if (identifierLosses.length > 0) {
    context.findings.add({
      ...context,
      family: 'SERIES',
      code: 'SERIES_IDENTIFIER_UNREPRESENTABLE',
      classification: 'TARGET_UNREPRESENTABLE',
      blocking: false,
      paths: identifierLosses.map(({ path }) => path),
      discriminator: 'identifiers',
      detail: { schemes: unique(identifierLosses.map(({ scheme }) => scheme)) },
      message: `Collection identifiers of ${context.describe} (${unique(identifierLosses.map(({ scheme }) => scheme)).join(', ')}) have no Thoth Series field, so they were not imported`,
    });
  }

  if (sequenceLosses.length > 0) {
    context.findings.add({
      ...context,
      family: 'SERIES',
      code: 'SERIES_SEQUENCE_UNREPRESENTABLE',
      classification: 'TARGET_UNREPRESENTABLE',
      blocking: false,
      paths: sequenceLosses.map(({ path }) => path),
      discriminator: 'sequences',
      detail: { sequenceTypes: unique(sequenceLosses.map(({ type }) => type)) },
      message: `Collection sequences of ${context.describe} other than publication order (types ${unique(sequenceLosses.map(({ type }) => type)).join(', ')}) are not issue ordinals, so they were not imported`,
    });
  }

  if (metadataLosses.length > 0) {
    context.findings.add({
      ...context,
      family: 'SERIES',
      code: 'SERIES_METADATA_UNREPRESENTABLE',
      classification: 'TARGET_UNREPRESENTABLE',
      blocking: false,
      paths: metadataLosses,
      discriminator: 'metadata',
      message: `Collection details of ${context.describe} such as frequency or collection contributors have no Thoth Series field, so they were not imported`,
    });
  }

  return { memberships, noCollection };
};

const membershipSignature = ({ key, ordinal, issueNumber }: OnixSeriesMembership) =>
  `${key}|${ordinal ?? ''}|${issueNumber ?? ''}`;

/** One grouped Work's Series memberships: the set every manifestation asserting one agrees on, or a block. */
const reconcileSeries = (
  members: readonly OnixSeriesDecision[],
  scope: FindingScope & { readonly describe: string; readonly paths: readonly string[] },
  findings: FindingCollector,
): OnixSeriesDecision => {
  if (members.length === 1) return members[0];

  const asserting = members.filter(({ memberships, noCollection }) => memberships.length > 0 || noCollection);
  const signatures = unique(
    asserting.map(({ memberships, noCollection }) =>
      noCollection && memberships.length === 0
        ? 'NO_COLLECTION'
        : memberships.map(membershipSignature).sort().join('||'),
    ),
  );

  if (signatures.length > 1) {
    findings.add({
      ...scope,
      family: 'SERIES',
      code: 'SERIES_GROUP_CONFLICT',
      classification: 'SOURCE_CONFLICT',
      blocking: true,
      paths: asserting.flatMap(({ memberships }) =>
        memberships.flatMap(({ provenance }) => provenance.map(({ path }) => path)),
      ),
      discriminator: 'group',
      message: `The manifestations of ${scope.describe} disagree about the Work's Series memberships; one manifestation's memberships are never chosen over another's`,
    });

    return EMPTY_SERIES;
  }

  const [representative] = asserting;

  if (representative === undefined) return EMPTY_SERIES;

  return {
    noCollection: representative.noCollection,
    memberships: representative.memberships.map((membership) => ({
      ...membership,
      provenance: asserting.flatMap(({ memberships }) =>
        memberships.filter(({ key }) => key === membership.key).flatMap(({ provenance }) => provenance),
      ),
    })),
  };
};

/** The Series memberships a decision makes with the publisher's answers, and what is still unanswered. */
export const resolveSeriesMemberships = (
  decision: OnixSeriesDecision,
  findingsByKey: FindingLookup,
  choices: ChoiceMap,
): { readonly memberships: OnixSeriesMembership[]; readonly pending: string[] } => {
  const pending: string[] = [];
  const answer = (key: string) => {
    const finding = findingsByKey.get(key);

    return finding === undefined ? null : answerOf(finding, choices);
  };
  const memberships = decision.memberships.filter((membership) => {
    if (membership.classificationFindingKey !== null) {
      const classification = answer(membership.classificationFindingKey);

      if (classification === null) {
        pending.push(membership.classificationFindingKey);

        return false;
      }

      if (classification === SERIES_CLASSIFICATION.NOT_SERIES) return false;
    }

    if (membership.ordinalFindingKey !== null) {
      if (answer(membership.ordinalFindingKey) === null) pending.push(membership.ordinalFindingKey);

      // Acknowledged or not, a membership without a publication order is never planned.
      return false;
    }

    return true;
  });

  return { memberships, pending };
};

/* ------------------------------------------------------------------------------------------------ */
/* The plan                                                                                         */
/* ------------------------------------------------------------------------------------------------ */

export type OnixDescriptiveContentItem = {
  readonly path: string;
  readonly titles: OnixTitleDecision;
  readonly contributors: OnixContributorDecision;
  readonly languages: OnixLanguageDecision;
  readonly subjects: OnixSubjectDecision;
};

export type OnixDescriptiveProduct = {
  readonly productKey: string;
  readonly groupKey: string;
  readonly recordPath: string;
  /** Every title candidate the Product itself states, not yet reconciled with other manifestations. */
  readonly titles: readonly OnixTitleCandidate[];
  readonly contributors: OnixContributorDecision;
  readonly languages: OnixLanguageDecision;
  readonly series: OnixSeriesDecision;
  /** Every subject the Product itself states, normalised and not yet reconciled with other manifestations. */
  readonly subjects: readonly OnixPlannedSubject[];
  /** The target types whose main subject this Product marks but that is not imported. */
  readonly unplannedMainSubjectTypes: readonly SubjectType[];
  readonly contentItems: Readonly<Record<string, OnixDescriptiveContentItem>>;
};

type ProductWorkFacts = {
  readonly lifecycle: ProductLifecycle;
  readonly copyright: ProductCopyright;
  readonly funding: OnixFundingDecision;
  readonly landingPages: ProductValues<string>;
  readonly places: ProductValues<string>;
  readonly extent: ProductValues<number>;
  readonly ancillary: ProductAncillary;
  readonly illustrationsNote: ProductIllustrationsNote;
};

export type OnixDescriptiveGroup = {
  readonly groupKey: string;
  readonly productKeys: readonly string[];
  readonly titles: OnixTitleDecision;
  readonly contributors: OnixContributorDecision;
  readonly languages: OnixLanguageDecision;
  readonly subjects: OnixSubjectDecision;
  readonly series: OnixSeriesDecision;
  readonly lifecycle: OnixLifecycleDecision;
  readonly copyrightHolder: OnixValueDecision<string>;
  readonly funding: OnixFundingDecision;
  readonly landingPage: OnixValueDecision<string>;
  readonly place: OnixValueDecision<string>;
  readonly pageCount: OnixValueDecision<number>;
  readonly counts: Readonly<Record<AncillaryKind, OnixValueDecision<number>>>;
  readonly ancillaryConventionFindingKeys: readonly string[];
  /** The illustrations note a Thoth export carries as its bibliography note, when every manifestation agrees. */
  readonly illustrationsNote: string | null;
  readonly illustrationsNoteFindingKeys: readonly string[];
};

export type OnixDescriptivePlan = {
  readonly products: Readonly<Record<string, OnixDescriptiveProduct>>;
  readonly groups: Readonly<Record<string, OnixDescriptiveGroup>>;
  /** Every finding, in the order it was raised: Products in file order, then their grouped Works. */
  readonly findings: readonly OnixDescriptiveFinding[];
};

const reconcileWorkFacts = (
  members: readonly ProductWorkFacts[],
  scope: FindingScope & { readonly describe: string },
  findings: FindingCollector,
): Pick<
  OnixDescriptiveGroup,
  | 'lifecycle'
  | 'copyrightHolder'
  | 'funding'
  | 'landingPage'
  | 'place'
  | 'pageCount'
  | 'counts'
  | 'ancillaryConventionFindingKeys'
  | 'illustrationsNote'
  | 'illustrationsNoteFindingKeys'
> => {
  const holders = unique(members.flatMap(({ copyright }) => (copyright.holder === null ? [] : [copyright.holder])));
  let copyrightHolder: OnixValueDecision<string> = holders.length === 1 ? { kind: 'VALUE', value: holders[0] } : ABSENT;

  if (holders.length > 1) {
    copyrightHolder = {
      kind: 'BLOCKED',
      findingKeys: [
        findings.add({
          ...scope,
          family: 'COPYRIGHT',
          code: 'COPYRIGHT_GROUP_CONFLICT',
          classification: 'SOURCE_CONFLICT',
          blocking: true,
          paths: members.flatMap(({ copyright }) => copyright.paths),
          discriminator: 'group',
          detail: { holders },
          message: `The manifestations of ${scope.describe} name different copyright holders (${holders.join(' / ')}); the Work has one copyright holder, so none is chosen`,
        }).key,
      ],
    };
  }

  const counts = Object.fromEntries(
    ANCILLARY_KINDS.map((kind) => [
      kind,
      reconcileValues(
        members.map(({ ancillary }) => ancillary.counts[kind]),
        { ...scope, describe: scope.describe },
        findings,
        {
          family: 'ANCILLARY_CONTENT',
          code: 'ANCILLARY_COUNT_CONFLICT',
          omittable: true,
          message: `${scope.describe} gives different ${kind.replace('Count', '')} counts; choose the one Thoth imports, or import none`,
        },
      ),
    ]),
  ) as Record<AncillaryKind, OnixValueDecision<number>>;
  const notes = unique(
    members.flatMap(({ illustrationsNote }) => (illustrationsNote.note === null ? [] : [illustrationsNote.note])),
  );

  return {
    lifecycle: reconcileLifecycle(
      members.map(({ lifecycle }) => lifecycle),
      scope,
      findings,
    ),
    copyrightHolder,
    funding: reconcileFunding(
      members.map(({ funding }) => funding),
      scope,
      findings,
    ),
    landingPage: reconcileValues(
      members.map(({ landingPages }) => landingPages),
      scope,
      findings,
      {
        family: 'LANDING_PAGE',
        code: 'LANDING_PAGE_CHOICE_REQUIRED',
        omittable: false,
        message: `${scope.describe} gives more than one publisher web page for the Work, and Thoth holds one landing page; choose it`,
      },
    ),
    place: reconcileValues(
      members.map(({ places }) => places),
      scope,
      findings,
      {
        family: 'PLACE',
        code: 'PLACE_CHOICE_REQUIRED',
        omittable: false,
        message: `${scope.describe} gives more than one city of publication, and Thoth holds one place; choose it`,
      },
    ),
    pageCount: reconcileValues(
      members.map(({ extent }) => extent),
      scope,
      findings,
      {
        family: 'EXTENT',
        code: 'EXTENT_VALUE_CONFLICT',
        omittable: true,
        message: `${scope.describe} gives different page counts, and the Work holds one; choose it, or import none`,
      },
    ),
    counts,
    ancillaryConventionFindingKeys: members.flatMap(({ ancillary }) => ancillary.thothConventionFindingKeys),
    illustrationsNote: notes.length === 1 ? notes[0] : null,
    illustrationsNoteFindingKeys: members.flatMap(({ illustrationsNote }) =>
      illustrationsNote.findingKey === null ? [] : [illustrationsNote.findingKey],
    ),
  };
};

const describeRecord = (index: number, recordReference: string | null) =>
  recordReference === null ? `product ${index}` : `product ${index} (${recordReference})`;

export const reduceOnixDescriptive = (
  root: ExtendedONIXMessageRoot,
  sourcePlan: OnixSourcePlan,
  options: ReduceOnixDescriptiveOptions = {},
): OnixDescriptivePlan => {
  const locate: Locate = (path) => ({ path, sourcePath: options.provenance?.sourcePathOf(path) ?? path });
  const findings = new FindingCollector(locate);
  const categoryRecoveries = new Map(
    (options.recoveries ?? []).flatMap((marker) =>
      marker.recovery === 'PUBLISHER_CATEGORY_TO_CUSTOM' ? [[marker.path, marker] as const] : [],
    ),
  );
  const productValues = toOnixArray(root.ONIXMessage?.Product);
  const header: Occurrence = { value: root.ONIXMessage?.Header, path: `${MESSAGE_PATH}/Header[1]` };
  const headerDefaultLanguage = children(header, 'DefaultLanguageOfText')[0] ?? null;
  const languageReductions = new Map<string, LanguageReduction>();
  const workFacts = new Map<string, ProductWorkFacts>();
  const contributorScopes = new Map<string, ContributorScope>();
  const recordByKey = new Map(sourcePlan.records.map((record) => [record.recordKey, record]));

  const products: Record<string, OnixDescriptiveProduct> = {};

  [...sourcePlan.products]
    .map((node) => ({ node, record: recordByKey.get(node.representativeRecordKey) }))
    .filter(
      (entry): entry is { node: (typeof sourcePlan.products)[number]; record: NonNullable<typeof entry.record> } =>
        entry.record !== undefined,
    )
    .sort((a, b) => a.record.index - b.record.index)
    .forEach(({ node, record }) => {
      const recordOccurrence: Occurrence = { value: productValues[record.index - 1], path: record.path };
      const describe = describeRecord(record.index, record.recordReference);
      const context: ProductContext = {
        groupKey: node.groupKey,
        productKey: node.productKey,
        record: recordOccurrence,
        describe,
        findings,
        categoryRecoveries,
      };
      const descriptive = children(recordOccurrence, 'DescriptiveDetail')[0] ?? {
        value: undefined,
        path: `${record.path}/DescriptiveDetail[1]`,
      };

      const productScope: ComponentScope = { node: descriptive, componentPath: null, describe };
      const languages = reduceLanguageScope(context, productScope, headerDefaultLanguage);
      const productEvidence: TitleLocaleEvidence = {
        textLocales: languages.textLocales,
        fromHeaderDefault: languages.textLanguageFromHeaderDefault,
      };

      languageReductions.set(node.productKey, languages);

      const contentItems: Record<string, OnixDescriptiveContentItem> = {};
      // Only a ContentItem #182 plans as a chapter becomes one; every other kind never reaches a Work.
      const chapterPaths = new Set(node.contentItems.filter(({ kind }) => kind === 'CHAPTER').map(({ path }) => path));

      children(recordOccurrence, 'ContentDetail').forEach((contentDetail) =>
        children(contentDetail, 'ContentItem').forEach((item, position) => {
          if (!chapterPaths.has(item.path)) return;

          const scope: ComponentScope = {
            node: item,
            componentPath: item.path,
            describe: `content item ${position + 1} of ${describe}`,
          };
          const itemLanguages = reduceLanguageScope(context, scope, null);
          // A component's own text language first; otherwise the Product's, never the parent's title.
          const itemEvidence: TitleLocaleEvidence =
            itemLanguages.textLocales.length > 0
              ? { textLocales: itemLanguages.textLocales, fromHeaderDefault: false }
              : productEvidence;

          const itemContributors = reduceContributorScope(context, scope);
          const itemSubjects = normaliseSubjects(context, scope);

          contentItems[item.path] = {
            path: item.path,
            contributors: { intents: itemContributors.intents, noContributor: itemContributors.noContributor },
            titles: decideTitles(
              normaliseTitles(context, scope, TITLE_LEVEL.CONTENT_ITEM, itemEvidence),
              { ...context, describe: scope.describe, discriminator: item.path, paths: [item.path] },
              findings,
            ),
            languages: itemLanguages,
            subjects: decideSubjects(
              itemSubjects.subjects,
              { ...context, componentPath: item.path, describe: scope.describe },
              findings,
              itemSubjects.unplannedMainTypes,
            ),
          };
        }),
      );

      workFacts.set(node.productKey, {
        lifecycle: normaliseLifecycle(context),
        copyright: normaliseCopyright(context),
        funding: normaliseFunding(context),
        landingPages: normaliseLandingPages(context),
        places: normalisePlaces(context),
        extent: normaliseExtent(context, descriptive),
        ancillary: normaliseAncillary(context, descriptive),
        illustrationsNote: normaliseIllustrationsNote(context, descriptive),
      });

      const contributors = reduceContributorScope(context, productScope);
      const productSubjects = normaliseSubjects(context, productScope);

      contributorScopes.set(node.productKey, contributors);

      products[node.productKey] = {
        productKey: node.productKey,
        groupKey: node.groupKey,
        recordPath: record.path,
        titles: normaliseTitles(context, productScope, TITLE_LEVEL.PRODUCT, productEvidence),
        contributors: { intents: contributors.intents, noContributor: contributors.noContributor },
        series: reduceSeriesScope(context, descriptive),
        languages,
        subjects: productSubjects.subjects,
        unplannedMainSubjectTypes: productSubjects.unplannedMainTypes,
        contentItems,
      };
    });

  const groups: Record<string, OnixDescriptiveGroup> = {};
  const productsByGroup = new Map<string, OnixDescriptiveProduct[]>();
  // A Product's first record names it, exactly as a search in record order would.
  const recordByProduct = new Map<string | null, (typeof sourcePlan.records)[number]>();

  sourcePlan.records.forEach((record) => {
    if (!recordByProduct.has(record.productKey)) recordByProduct.set(record.productKey, record);
  });

  // Products in file order, so each group's members keep that order too.
  Object.values(products).forEach((reduced) =>
    productsByGroup.set(reduced.groupKey, [...(productsByGroup.get(reduced.groupKey) ?? []), reduced]),
  );

  sourcePlan.groups.forEach((group) => {
    const members = productsByGroup.get(group.groupKey) ?? [];
    const firstRecord = members[0] === undefined ? undefined : recordByProduct.get(members[0].productKey);
    const describe =
      members.length === 1 && firstRecord !== undefined
        ? describeRecord(firstRecord.index, firstRecord.recordReference)
        : `the Work of ${members.length} grouped products`;
    const scope = { groupKey: group.groupKey, productKey: null, componentPath: null, describe };

    groups[group.groupKey] = {
      groupKey: group.groupKey,
      productKeys: members.map(({ productKey }) => productKey),
      titles: decideTitles(
        members.flatMap(({ titles }) => titles),
        {
          ...scope,
          discriminator: 'work',
          paths: members.map(({ recordPath }) => `${recordPath}/DescriptiveDetail[1]`),
        },
        findings,
      ),
      contributors:
        members.length === 0
          ? EMPTY_CONTRIBUTORS
          : reconcileContributors(
              members.map(({ productKey }) => contributorScopes.get(productKey) as ContributorScope),
              { ...scope, paths: members.map(({ recordPath }) => `${recordPath}/DescriptiveDetail[1]`) },
              findings,
            ),
      series:
        members.length === 0
          ? EMPTY_SERIES
          : reconcileSeries(
              members.map(({ series }) => series),
              { ...scope, paths: members.map(({ recordPath }) => `${recordPath}/DescriptiveDetail[1]`) },
              findings,
            ),
      languages:
        members.length === 0
          ? EMPTY_LANGUAGES
          : reconcileLanguages(
              members.map(({ productKey }) => languageReductions.get(productKey) as LanguageReduction),
              scope,
              findings,
            ),
      subjects: decideSubjects(
        members.flatMap(({ subjects }) => subjects),
        scope,
        findings,
        unique(members.flatMap(({ unplannedMainSubjectTypes }) => unplannedMainSubjectTypes)),
      ),
      ...reconcileWorkFacts(
        members.map(({ productKey }) => workFacts.get(productKey) as ProductWorkFacts),
        scope,
        findings,
      ),
    };
  });

  return { products, groups, findings: findings.all() };
};

/* ------------------------------------------------------------------------------------------------ */
/* Resolution                                                                                       */
/* ------------------------------------------------------------------------------------------------ */

/** Findings by key: the plan's, and the few only one Work's answers raise, without copying the plan's. */
const withResolutionFindings = (plan: OnixDescriptivePlan, resolved: OnixResolvedDescriptiveWork): FindingLookup => {
  const { byKey } = indexOf(plan);

  if (resolved.findings.length === 0) return byKey;

  const own = new Map(resolved.findings.map((finding) => [finding.key, finding]));

  return {
    get: (key: string) => own.get(key) ?? byKey.get(key),
    has: (key: string) => own.has(key) || byKey.has(key),
  };
};

export type ResolveOnixDescriptiveOptions = {
  readonly choices: ChoiceMap;
  /** Whether the verified or publisher-confirmed Thoth compatibility profile applies to this group. */
  readonly thothProfileActive: boolean;
};

/** The descriptive Work fields one grouped Work gets with the publisher's answers. */
export type OnixDescriptiveWorkValues = {
  readonly titles: TitleEntity[];
  readonly languages: LanguageEntity[];
  readonly subjects: SubjectEntity[];
  readonly series: readonly OnixSeriesMembership[];
  readonly status: WorkStatus | null;
  readonly publicationDate: string | null;
  readonly withdrawnDate: string | null;
  readonly copyrightHolder: string;
  readonly landingPage: string;
  readonly place: string;
  /** Zero when no page count is planned: the app writes a zero count as unset. */
  readonly pageCount: number;
  readonly imageCount: number;
  readonly tableCount: number;
  readonly audioCount: number;
  readonly videoCount: number;
  readonly bibliographyNote: string;
  /** The funders to resolve to exact Institutions, with the fundings each carries. */
  readonly funders: readonly (Omit<OnixPlannedFunder, 'profileFundings'> & {
    readonly fundings: readonly OnixPlannedFunding[];
  })[];
};

export type OnixResolvedDescriptiveWork = {
  readonly values: OnixDescriptiveWorkValues;
  /** Blocking findings still unanswered for this Work, in a stable order. */
  readonly pendingFindingKeys: readonly string[];
  /** Findings only the publisher's answers raise, such as the dates a chosen status requires. */
  readonly findings: readonly OnixDescriptiveFinding[];
  /**
   * Findings that say nothing about what this Work becomes: disclosed losses the Thoth compatibility profile
   * makes moot because it reads them back, and the chapter findings of a manifestation whose chapters are not
   * the ones planned.
   */
  readonly inapplicableFindingKeys: readonly string[];
};

/** The representative Product of a Work group: the first in file order, whose chapters the Work gets. */
const representativeOf = (group: OnixDescriptiveGroup): string | undefined => group.productKeys[0];

const withinComponent = (paths: readonly string[], componentPath: string) =>
  paths.length > 0 && paths.every((path) => path === componentPath || path.startsWith(`${componentPath}/`));

/** A plan's findings by key and by Work group, built once per plan: resolution runs again for every decision. */
type PlanIndex = {
  readonly byKey: ReadonlyMap<string, OnixDescriptiveFinding>;
  readonly byGroup: ReadonlyMap<string, readonly OnixDescriptiveFinding[]>;
};

const planIndexes = new WeakMap<OnixDescriptivePlan, PlanIndex>();

const indexOf = (plan: OnixDescriptivePlan): PlanIndex => {
  const cached = planIndexes.get(plan);

  if (cached !== undefined) return cached;

  const byGroup = new Map<string, OnixDescriptiveFinding[]>();

  plan.findings.forEach((finding) =>
    byGroup.set(finding.groupKey, [...(byGroup.get(finding.groupKey) ?? []), finding]),
  );

  const index = { byKey: new Map(plan.findings.map((finding) => [finding.key, finding])), byGroup };

  planIndexes.set(plan, index);

  return index;
};

/** Every finding the reductions raised for one Work group, its Products' included, in the order they were raised. */
export const groupFindingsOf = (plan: OnixDescriptivePlan, groupKey: string): readonly OnixDescriptiveFinding[] =>
  indexOf(plan).byGroup.get(groupKey) ?? [];

/** Whether a finding is about one of its Product's chapter ContentItems rather than about the Work. */
const isChapterFinding = (plan: OnixDescriptivePlan, { productKey, locations }: OnixDescriptiveFinding): boolean =>
  productKey !== null &&
  Object.keys(plan.products[productKey]?.contentItems ?? {}).some((componentPath) =>
    withinComponent(
      locations.map(({ path }) => path),
      componentPath,
    ),
  );

/**
 * The chapter findings of every manifestation but the representative one. Grouped manifestations must state
 * the same chapters to become one Work at all, so only the representative's are asked about.
 */
const otherManifestationChapterFindingKeys = (plan: OnixDescriptivePlan, group: OnixDescriptiveGroup): string[] =>
  group.productKeys.slice(1).flatMap((productKey) => {
    const componentPaths = Object.keys(plan.products[productKey]?.contentItems ?? {});

    if (componentPaths.length === 0) return [];

    return groupFindingsOf(plan, group.groupKey)
      .filter(
        ({ productKey: findingProduct, locations }) =>
          findingProduct === productKey &&
          componentPaths.some((componentPath) =>
            withinComponent(
              locations.map(({ path }) => path),
              componentPath,
            ),
          ),
      )
      .map(({ key }) => key);
  });

export const resolveOnixDescriptiveWork = (
  plan: OnixDescriptivePlan,
  groupKey: string,
  options: ResolveOnixDescriptiveOptions,
): OnixResolvedDescriptiveWork => {
  const group = plan.groups[groupKey];
  const findingsByKey = indexOf(plan).byKey;

  if (group === undefined) throw new Error(`ONIX descriptive plan has no Work group ${groupKey}`);

  const titles = resolveTitles(group.titles, findingsByKey, options.choices);
  const languages = resolveLanguages(group.languages, findingsByKey, options.choices);
  const subjects = resolveSubjects(group.subjects, findingsByKey, options.choices);
  const series = resolveSeriesMemberships(group.series, findingsByKey, options.choices);

  /* Lifecycle: the status the source decides or the publisher chose, held to Thoth's date invariants. */
  const resolutionFindings = new Map<string, OnixDescriptiveFinding>();
  const lifecyclePending: string[] = [];
  let status: WorkStatus | null = null;
  let withdrawnDate: string | null = null;
  const { lifecycle } = group;

  if (lifecycle.status.kind === 'BLOCKED') {
    lifecyclePending.push(...lifecycle.status.findingKeys);
  } else {
    const chosen =
      lifecycle.status.kind === 'VALUE'
        ? lifecycle.status.status
        : (() => {
            const finding = findingsByKey.get(lifecycle.status.findingKey);
            const answer = finding === undefined ? null : answerOf(finding, options.choices);

            if (answer === null) lifecyclePending.push(lifecycle.status.findingKey);

            return answer as WorkStatus | null;
          })();

    if (chosen !== null) {
      const invariants = lifecycleInvariants(chosen, lifecycle, {
        groupKey,
        productKey: null,
        describe: 'the Work',
      });
      const collector = new FindingCollector((path) => ({ path, sourcePath: path }));

      invariants.findings.forEach((input) => {
        const raised = collector.add(input);
        // A finding the reduction already raised stays that finding; only an answer's own is new.
        const finding = findingsByKey.get(raised.key) ?? raised;

        if (!findingsByKey.has(finding.key)) resolutionFindings.set(finding.key, finding);
        if (finding.blocking) lifecyclePending.push(finding.key);
      });

      status = invariants.findings.some(({ blocking }) => blocking) ? null : chosen;
      withdrawnDate = status === null ? null : invariants.withdrawnDate;
    }
  }

  const copyrightHolder = resolveValue(group.copyrightHolder, findingsByKey, options.choices);
  const landingPage = resolveValue(group.landingPage, findingsByKey, options.choices);
  const place = resolveValue(group.place, findingsByKey, options.choices);
  const pageCount = resolveValue(group.pageCount, findingsByKey, options.choices);
  const counts = Object.fromEntries(
    ANCILLARY_KINDS.map((kind) => {
      // Thoth's audio and video convention exists only for its own verified or confirmed exports.
      if (THOTH_CONVENTION_KINDS.has(kind) && !options.thothProfileActive) return [kind, { value: null, pending: [] }];

      return [kind, resolveValue(group.counts[kind], findingsByKey, options.choices)];
    }),
  ) as Record<AncillaryKind, { value: number | null; pending: string[] }>;
  const inapplicableFindingKeys = [
    ...(options.thothProfileActive
      ? [
          ...group.ancillaryConventionFindingKeys,
          ...(group.illustrationsNote === null ? [] : group.illustrationsNoteFindingKeys),
          ...group.funding.thothConventionFindingKeys,
        ]
      : []),
    ...otherManifestationChapterFindingKeys(plan, group),
  ];

  const resolvedPending = [
    ...titles.pending,
    ...languages.pending,
    ...subjects.pending,
    ...series.pending,
    ...lifecyclePending,
    ...copyrightHolder.pending,
    ...landingPage.pending,
    ...place.pending,
    ...pageCount.pending,
    ...ANCILLARY_KINDS.flatMap((kind) => counts[kind].pending),
  ];

  // Every other blocking finding of the group's Products is unanswered until its own resolution says otherwise.
  const alreadyPending = new Set([...resolvedPending, ...inapplicableFindingKeys]);
  const pending = groupFindingsOf(plan, groupKey)
    .filter(
      (finding) => finding.blocking && answerOf(finding, options.choices) === null && !alreadyPending.has(finding.key),
    )
    .map(({ key }) => key);

  return {
    values: {
      titles: titles.titles,
      languages: languages.languages,
      subjects: subjects.subjects,
      series: series.memberships,
      status,
      publicationDate: lifecycle.publicationDate,
      withdrawnDate,
      copyrightHolder: copyrightHolder.value ?? '',
      landingPage: landingPage.value ?? '',
      place: place.value ?? '',
      pageCount: pageCount.value ?? 0,
      imageCount: counts.imageCount.value ?? 0,
      tableCount: counts.tableCount.value ?? 0,
      audioCount: counts.audioCount.value ?? 0,
      videoCount: counts.videoCount.value ?? 0,
      bibliographyNote: options.thothProfileActive ? (group.illustrationsNote ?? '') : '',
      funders: group.funding.funders.map(({ profileFundings, fundings, ...funder }) => ({
        ...funder,
        fundings: options.thothProfileActive ? profileFundings : fundings,
      })),
    },
    pendingFindingKeys: unique([...resolvedPending, ...pending]),
    findings: [...resolutionFindings.values()],
    inapplicableFindingKeys,
  };
};

/* ------------------------------------------------------------------------------------------------ */
/* Series identity against Thoth                                                                    */
/* ------------------------------------------------------------------------------------------------ */

export type OnixSeriesMatch =
  | { readonly kind: 'EXISTING'; readonly series: SeriesEntity }
  | { readonly kind: 'NEW' }
  | { readonly kind: 'AMBIGUOUS'; readonly seriesIds: readonly string[] };

const compactIssn = (issn: string) => issn.replace(/[\s-]/g, '').toUpperCase();

/**
 * The Thoth Series one membership names, within the Work's imprint: Thoth's own Series ID under the
 * compatibility profile, else a declared ISSN, else the name exactly or as normalised for identity. A strong
 * identifier decides before a name, and more than one answer is never narrowed to one.
 */
export const matchSeriesMembership = (
  membership: Pick<OnixSeriesMembership, 'name' | 'issns' | 'thothSeriesId'>,
  serieses: readonly SeriesEntity[],
  imprintId: string,
  thothProfileActive: boolean,
): OnixSeriesMatch => {
  const inImprint = serieses.filter((series) => series.imprintId === imprintId);

  if (thothProfileActive && membership.thothSeriesId !== null) {
    const native = serieses.find(({ id }) => id.toLowerCase() === membership.thothSeriesId);

    if (native !== undefined) {
      return native.imprintId === imprintId
        ? { kind: 'EXISTING', series: native }
        : { kind: 'AMBIGUOUS', seriesIds: [native.id] };
    }
  }

  const issns = new Set(membership.issns.map(compactIssn));
  const byIssn = inImprint.filter(
    ({ issnPrint, issnDigital }) =>
      (issnPrint.length > 0 && issns.has(compactIssn(issnPrint))) ||
      (issnDigital.length > 0 && issns.has(compactIssn(issnDigital))),
  );

  if (byIssn.length === 1) return { kind: 'EXISTING', series: byIssn[0] };
  if (byIssn.length > 1) return { kind: 'AMBIGUOUS', seriesIds: byIssn.map(({ id }) => id) };

  const byName = findExistingSeries([...inImprint], membership.name, imprintId);

  if (byName.status === 'found') return { kind: 'EXISTING', series: byName.series };
  if (byName.status === 'ambiguous') {
    return {
      kind: 'AMBIGUOUS',
      seriesIds: inImprint
        .filter(({ name }) => normalizeSeriesName(name) === normalizeSeriesName(membership.name))
        .map(({ id }) => id),
    };
  }

  return { kind: 'NEW' };
};

/* ------------------------------------------------------------------------------------------------ */
/* Existing-Work compatibility (#182 Specification Amendments 2 and 3)                              */
/* ------------------------------------------------------------------------------------------------ */

export type CompareOnixDescriptiveOptions = ResolveOnixDescriptiveOptions & {
  readonly serieses: readonly SeriesEntity[];
  /** The exact existing Work's imprint, which every Series it can belong to sits in. */
  readonly imprintId: string;
};

export type OnixFamilyComparison = {
  readonly outcome: OnixDescriptiveCompatibilityOutcome;
  readonly reasons: readonly string[];
  /** The unanswered findings of the family the comparison waits for, which the publisher can still answer. */
  readonly findingKeys: readonly string[];
};

/** Invariants of creating a Work, which say nothing about whether a source fact matches an existing one. */
const CREATION_ONLY_CODES: ReadonlySet<OnixDescriptiveFindingCode> = new Set([
  'LIFECYCLE_DATE_REQUIRED',
  'LIFECYCLE_DATE_ORDER_INVALID',
]);

const comparison = (
  contradicted: readonly string[],
  unverified: readonly string[],
  findingKeys: readonly string[] = [],
): OnixFamilyComparison =>
  contradicted.length > 0
    ? { outcome: 'CONTRADICTED', reasons: unique(contradicted), findingKeys: [] }
    : unverified.length > 0
      ? { outcome: 'UNVERIFIED', reasons: unique(unverified), findingKeys: unique(findingKeys) }
      : { outcome: 'COMPATIBLE', reasons: [], findingKeys: [] };

/** Anything the existing Work returns as markup or escaped text cannot be compared with source characters. */
const comparableText = (value: string) => !TAG_SHAPE.test(value) && !value.includes('&');

const sameOrcid = (a: string, b: string) =>
  canonicalImportOrcid(a) !== null && canonicalImportOrcid(a) === canonicalImportOrcid(b);

/**
 * How one descriptive family the source asserts compares with the exact existing Work its Product would attach
 * to. Only representable, decided source facts are compared: a loss the source discloses contradicts nothing,
 * and a target fact the source does not assert is absent evidence. A source fact the Work does not hold, or
 * holds in a form that cannot be compared, is unverified - never assumed compatible - and a disagreement is a
 * contradiction, never a warning.
 */
export const compareOnixDescriptiveFamily = (
  plan: OnixDescriptivePlan,
  groupKey: string,
  family: OnixDescriptiveFamily,
  existing: OnixExistingWorkDescriptiveFacts,
  options: CompareOnixDescriptiveOptions,
): OnixFamilyComparison => {
  const group = plan.groups[groupKey];
  const resolved = resolveOnixDescriptiveWork(plan, groupKey, options);
  const findingsByKey = withResolutionFindings(plan, resolved);
  const pending = resolved.pendingFindingKeys
    .map((key) => findingsByKey.get(key))
    .filter(
      (finding): finding is OnixDescriptiveFinding =>
        finding !== undefined &&
        finding.family === family &&
        finding.resolution.kind !== 'ACKNOWLEDGE' &&
        !CREATION_ONLY_CODES.has(finding.code) &&
        !isChapterFinding(plan, finding),
    );

  if (pending.length > 0) {
    return comparison(
      [],
      pending.map(({ code }) => code),
      pending.map(({ key }) => key),
    );
  }

  const { values } = resolved;
  const contradicted: string[] = [];
  const unverified: string[] = [];

  const compareValue = (reason: string, source: string | number, target: string | number, unset: string | number) => {
    if (source === unset) return;
    if (target === unset) unverified.push(`${reason}_NOT_ON_WORK`);
    else if (source !== target) contradicted.push(`${reason}_DIFFERS`);
  };

  switch (family) {
    case 'TITLE': {
      const [canonical, ...alternates] = values.titles;
      const existingCanonical = existing.titles.find((title) => title.canonical);

      if (canonical === undefined) return comparison([], ['NO_SOURCE_TITLE']);

      [canonical, ...alternates].forEach((title) => {
        const target = title.canonical
          ? existingCanonical
          : existing.titles.find(({ localeCode }) => localeCode === title.localeCode);

        if (target === undefined) {
          unverified.push(title.canonical ? 'CANONICAL_TITLE_NOT_ON_WORK' : 'TITLE_NOT_ON_WORK');

          return;
        }

        if (![target.title, target.subtitle, target.fullTitle].every(comparableText)) {
          unverified.push('TITLE_NOT_COMPARABLE');

          return;
        }

        const statement = title.fullTitle !== compileFullTitle(title.title, title.subtitle);

        if (
          target.title !== title.title ||
          (target.subtitle ?? '') !== title.subtitle ||
          target.localeCode !== title.localeCode ||
          (statement && target.fullTitle !== title.fullTitle)
        ) {
          contradicted.push(title.canonical ? 'CANONICAL_TITLE_DIFFERS' : 'TITLE_DIFFERS');
        }
      });

      break;
    }
    case 'CONTRIBUTORS': {
      if (group.contributors.noContributor && group.contributors.intents.length === 0) {
        if (existing.contributions.length > 0) contradicted.push('WORK_HAS_CONTRIBUTORS');

        break;
      }

      group.contributors.intents.forEach((intent) =>
        intent.contributions.forEach(({ ordinal, type }) => {
          const target = existing.contributions.find(({ orderNumber }) => orderNumber === ordinal);

          if (target === undefined) {
            unverified.push('CONTRIBUTION_NOT_ON_WORK');

            return;
          }

          if (target.type !== type) contradicted.push('CONTRIBUTION_TYPE_DIFFERS');

          if (intent.orcid !== null && target.orcid.length > 0) {
            if (!sameOrcid(intent.orcid, target.orcid)) contradicted.push('CONTRIBUTOR_ORCID_DIFFERS');
          } else if (target.fullName.trim() !== intent.fullName) {
            contradicted.push('CONTRIBUTOR_NAME_DIFFERS');
          }
        }),
      );

      break;
    }
    case 'LANGUAGES':
      values.languages.forEach(({ code, relation }) => {
        const target = existing.languages.find((language) => language.code === code);

        if (target === undefined) unverified.push('LANGUAGE_NOT_ON_WORK');
        else if (target.relation !== relation) contradicted.push('LANGUAGE_RELATION_DIFFERS');
      });

      break;
    case 'SUBJECTS':
      values.subjects.forEach(({ type, code, ordinal }) => {
        const ofType = existing.subjects.filter((subject) => subject.type === type);

        if (!ofType.some((subject) => subject.code === code)) unverified.push('SUBJECT_NOT_ON_WORK');

        if (ordinal === 1 && type !== SubjectType.Keyword) {
          const primary = ofType.find((subject) => subject.ordinal === 1);

          if (primary !== undefined && primary.code !== code) contradicted.push('PRIMARY_SUBJECT_DIFFERS');
        }
      });

      break;
    case 'SERIES': {
      if (group.series.noCollection && group.series.memberships.length === 0) {
        if (existing.issues.length > 0) contradicted.push('WORK_IS_IN_A_SERIES');

        break;
      }

      values.series.forEach((membership) => {
        const match = matchSeriesMembership(
          membership,
          options.serieses,
          options.imprintId,
          options.thothProfileActive,
        );

        if (match.kind !== 'EXISTING') {
          unverified.push(match.kind === 'NEW' ? 'SERIES_NOT_IN_THOTH' : 'SERIES_MATCH_AMBIGUOUS');

          return;
        }

        const issue = existing.issues.find(({ seriesId }) => seriesId === match.series.id);

        if (issue === undefined) unverified.push('SERIES_MEMBERSHIP_NOT_ON_WORK');
        else if (issue.ordinal !== membership.ordinal) contradicted.push('ISSUE_ORDINAL_DIFFERS');

        // The existing Work's issues are read without their issue number, so a stated number cannot be checked.
        if (membership.issueNumber !== null) unverified.push('ISSUE_NUMBER_NOT_COMPARABLE');
      });

      break;
    }
    case 'EXTENT':
      compareValue('PAGE_COUNT', values.pageCount, existing.pageCount, 0);
      break;
    case 'ANCILLARY_CONTENT':
      compareValue('IMAGE_COUNT', values.imageCount, existing.imageCount, 0);
      compareValue('TABLE_COUNT', values.tableCount, existing.tableCount, 0);
      compareValue('AUDIO_COUNT', values.audioCount, existing.audioCount, 0);
      compareValue('VIDEO_COUNT', values.videoCount, existing.videoCount, 0);
      break;
    case 'ILLUSTRATIONS_NOTE':
      compareValue('BIBLIOGRAPHY_NOTE', values.bibliographyNote, existing.bibliographyNote, '');
      break;
    case 'LIFECYCLE': {
      const { lifecycle } = group;
      const statusChoice =
        lifecycle.status.kind === 'CHOICE' ? findingsByKey.get(lifecycle.status.findingKey) : undefined;
      const status =
        lifecycle.status.kind === 'VALUE'
          ? lifecycle.status.status
          : statusChoice === undefined
            ? null
            : answerOf(statusChoice, options.choices);

      if (status === null) return comparison([], ['STATUS_UNDECIDED']);
      if (existing.status !== status) contradicted.push('STATUS_DIFFERS');

      compareValue(
        'PUBLICATION_DATE',
        lifecycle.publicationDate ?? '',
        (existing.publicationDate ?? '').slice(0, 10),
        '',
      );

      if (OUT_OF_PRINT_STATUSES.has(status as WorkStatus)) {
        compareValue('WITHDRAWN_DATE', lifecycle.withdrawnDate ?? '', (existing.withdrawnDate ?? '').slice(0, 10), '');
      }

      break;
    }
    case 'COPYRIGHT':
      compareValue('COPYRIGHT_HOLDER', values.copyrightHolder, existing.copyrightHolder, '');
      break;
    case 'LANDING_PAGE':
      compareValue('LANDING_PAGE', values.landingPage, existing.landingPage ?? '', '');
      break;
    case 'PLACE':
      compareValue('PLACE', values.place, existing.place, '');
      break;
    case 'FUNDING':
      values.funders.forEach((funder) => {
        const targets =
          funder.ror === null
            ? []
            : existing.fundings.filter(({ institutionRor }) => canonicaliseRor(institutionRor) === funder.ror);

        if (funder.ror === null) {
          // The existing Work's fundings are read without their institution's DOI.
          unverified.push('FUNDER_NOT_COMPARABLE');

          return;
        }

        if (targets.length === 0) {
          unverified.push('FUNDING_NOT_ON_WORK');

          return;
        }

        funder.fundings
          .filter((funding) => Object.values(funding).some((field) => field.length > 0))
          .forEach((funding) => {
            const matched = targets.some(
              (target) =>
                target.program === funding.program &&
                target.projectName === funding.projectName &&
                target.projectShortname === funding.projectShortname &&
                target.grantNumber === funding.grantNumber,
            );

            if (!matched) unverified.push('FUNDING_NOT_ON_WORK');
          });
      });

      break;
  }

  return comparison(contradicted, unverified);
};

/* ------------------------------------------------------------------------------------------------ */
/* Building a new Work from exact lookups and the publisher's answers                               */
/* ------------------------------------------------------------------------------------------------ */

/** A contributor intent Thoth is asked about: whether its exact ORCID names a contributor, and who shares its name. */
export type OnixContributorRequest = {
  readonly key: string;
  readonly orcid: string | null;
  readonly fullName: string;
  /** The contribution ordinals the intent makes, in order. */
  readonly ordinals: readonly number[];
  /** The chapter ContentItem the intent belongs to, or null for the Work itself. */
  readonly chapterPath: string | null;
};

/** Everything the adapter has to ask Thoth for one Work group before the Work can be built. */
export type OnixDescriptiveLookupRequests = {
  readonly contributors: readonly OnixContributorRequest[];
  /** Every canonical ROR an affiliation declares, once each. */
  readonly rors: readonly string[];
  readonly funders: readonly OnixPlannedFunder[];
  /** The chapter ContentItems of the representative Product, in file order. */
  readonly chapterPaths: readonly string[];
};

export const descriptiveLookupRequests = (
  plan: OnixDescriptivePlan,
  groupKey: string,
): OnixDescriptiveLookupRequests => {
  const group = plan.groups[groupKey];

  if (group === undefined) throw new Error(`ONIX descriptive plan has no Work group ${groupKey}`);

  const representative = representativeOf(group);
  const chapters = Object.values(representative === undefined ? {} : plan.products[representative].contentItems);
  const scopes = [
    { chapterPath: null, intents: group.contributors.intents },
    ...chapters.map(({ path, contributors }) => ({ chapterPath: path, intents: contributors.intents })),
  ];
  const contributors = scopes.flatMap(({ chapterPath, intents }) =>
    intents.map(({ key, orcid, fullName, contributions }) => ({
      key,
      orcid,
      fullName,
      ordinals: contributions.map(({ ordinal }) => ordinal),
      chapterPath,
    })),
  );

  return {
    contributors,
    rors: unique(
      scopes.flatMap(({ intents }) => intents.flatMap(({ affiliations }) => affiliations.map(({ ror }) => ror))),
    ),
    funders: group.funding.funders,
    chapterPaths: chapters.map(({ path }) => path),
  };
};

export type BuildOnixDescriptiveOptions = ResolveOnixDescriptiveOptions & {
  readonly lookups: OnixDescriptiveLookups;
};

export type OnixBuiltChapter = {
  readonly path: string;
  readonly workId: WorkId;
  readonly titles: TitleEntity[];
  readonly languages: LanguageEntity[];
  readonly subjects: SubjectEntity[];
  readonly contributions: WorkContribution[];
};

/** The contributions one contributor intent became on the Work, or on one of its chapters. */
export type OnixBuiltContributorIntent = {
  readonly chapterPath: string | null;
  readonly key: string;
  readonly ordinals: readonly number[];
};

export type OnixBuiltDescriptiveWork = {
  readonly values: OnixDescriptiveWorkValues;
  readonly contributions: WorkContribution[];
  readonly fundings: FundingEntity[];
  readonly chapters: readonly OnixBuiltChapter[];
  readonly contributorIntents: readonly OnixBuiltContributorIntent[];
  /** Every finding that applies to the Work: the reductions', the answers' and the lookups'. */
  readonly findings: readonly OnixDescriptiveFinding[];
  /** Blocking findings still unanswered, in a stable order. */
  readonly pendingFindingKeys: readonly string[];
};

/**
 * The descriptive Work one new Work group becomes: the canonical reductions, with the publisher's answers applied
 * and every identity settled only by what an exact lookup returned. A lookup that was never made fails closed.
 */
export const buildOnixDescriptiveWork = (
  plan: OnixDescriptivePlan,
  groupKey: string,
  options: BuildOnixDescriptiveOptions,
): OnixBuiltDescriptiveWork => {
  const group = plan.groups[groupKey];
  const resolved = resolveOnixDescriptiveWork(plan, groupKey, options);
  const { lookups, choices } = options;
  const lookupFindings = new FindingCollector((path) => ({ path, sourcePath: path }));
  const findingsByKey = withResolutionFindings(plan, resolved);
  const settledFindingKeys = new Set<string>();
  const lookupPending: string[] = [];
  const scope = { groupKey, productKey: null };

  const raise = (
    input: Omit<FindingInput, keyof FindingScope | 'paths'> & { readonly locations: readonly OnixSourceLocation[] },
  ) => {
    const finding = lookupFindings.add({ ...scope, ...input, paths: input.locations.map(({ path }) => path) });

    if (finding.blocking && answerOf(finding, choices) === null && !lookupPending.includes(finding.key)) {
      lookupPending.push(finding.key);
    }

    return finding;
  };
  const answer = (findingKey: string | null) => {
    const finding = findingKey === null ? undefined : findingsByKey.get(findingKey);

    return finding === undefined ? null : answerOf(finding, choices);
  };

  const buildContributions = (decision: OnixContributorDecision, chapterPath: string | null) => {
    const contributions: WorkContribution[] = [];
    const intents: OnixBuiltContributorIntent[] = [];

    decision.intents.forEach((intent) => {
      const describe = intent.fullName.length > 0 ? `contributor "${intent.fullName}"` : 'unnamed contributor';
      const lookup = lookups.contributors[intent.key];

      if (lookup === undefined) {
        raise({
          family: 'CONTRIBUTORS',
          code: 'CONTRIBUTOR_LOOKUP_UNAVAILABLE',
          classification: 'PREFLIGHT_GAP',
          blocking: true,
          locations: intent.provenance,
          discriminator: intent.key,
          message: `Thoth was not asked whether the ${describe} is an existing contributor, so no contribution can be planned for them`,
        });

        return;
      }

      const match = lookup.orcidMatch;
      let { lastName } = intent;

      if (match !== null && intent.nameFindingKey !== null && intent.fullName.length > 0) {
        settledFindingKeys.add(intent.nameFindingKey);
        lastName = match.lastName;
        raise({
          family: 'CONTRIBUTORS',
          code: 'CONTRIBUTOR_ORCID_NAME_ENRICHED',
          classification: 'SUPPORTED_WITH_WARNING',
          blocking: false,
          locations: intent.provenance,
          discriminator: intent.key,
          detail: { orcid: match.orcid, lastName: match.lastName },
          message: `The ${describe} gives no structured surname; the existing Thoth contributor their ORCID ${match.orcid} identifies supplies "${match.lastName}"`,
        });
      }

      if (lastName === null || intent.fullName.length === 0) return;

      const affiliations = intent.affiliations.flatMap((affiliation) => {
        const institution = lookups.institutions[affiliation.ror];

        if (institution === undefined) {
          raise({
            family: 'CONTRIBUTORS',
            code: 'CONTRIBUTOR_LOOKUP_UNAVAILABLE',
            classification: 'PREFLIGHT_GAP',
            blocking: true,
            locations: affiliation.provenance,
            discriminator: `${intent.key}|${affiliation.ror}`,
            message: `Thoth was not asked which institution ROR ${affiliation.ror} of the ${describe} names, so the affiliation cannot be planned`,
          });

          return [];
        }

        if (institution.kind !== 'FOUND') {
          raise({
            family: 'CONTRIBUTORS',
            code: 'CONTRIBUTOR_AFFILIATION_UNRESOLVED',
            classification: 'TARGET_INPUT_REQUIRED',
            blocking: true,
            locations: affiliation.provenance,
            discriminator: `${intent.key}|${affiliation.ror}`,
            detail: { ror: affiliation.ror, affiliation: affiliation.text },
            resolution: { kind: 'ACKNOWLEDGE' },
            message: `No Thoth institution has the ROR ${affiliation.ror} that affiliation "${affiliation.text}" of the ${describe} declares; acknowledge that the affiliation is not imported`,
          });

          return [];
        }

        return [{ institution, position: affiliation.position }];
      });
      const canonicalLocale = answer(intent.biographyCanonicalFindingKey);

      intent.contributions.forEach(({ type, ordinal }) =>
        contributions.push({
          id: appConfig.defaultId,
          contributorId: match?.contributorId ?? appConfig.defaultId,
          type,
          isMain: true,
          orderNumber: ordinal,
          fullName: intent.fullName,
          lastName: lastName as string,
          firstName: intent.firstName,
          orcidId: match?.orcid ?? intent.orcid ?? '',
          website: match?.website ?? intent.website,
          biographies: intent.biographies.map((biography) => ({
            id: appConfig.defaultId,
            canonical: biography.canonical ?? biography.localeCode === canonicalLocale,
            content: biography.content,
            localeCode: biography.localeCode,
            contributionId: appConfig.defaultId,
            sourceMarkupFormat: biography.markup,
          })),
          affiliations: affiliations.map(({ institution, position }, index) => ({
            id: appConfig.defaultId,
            contributionId: appConfig.defaultId,
            institutionId: institution.institutionId,
            institutionName: institution.name,
            rorId: institution.ror,
            position,
            orderNumber: index + 1,
          })),
        }),
      );
      intents.push({ chapterPath, key: intent.key, ordinals: intent.contributions.map(({ ordinal }) => ordinal) });
    });

    return { contributions, intents };
  };

  const work = buildContributions(group.contributors, null);

  const fundings = resolved.values.funders.flatMap((funder): FundingEntity[] => {
    const institution = lookups.funders[funder.key];
    const describe = `funder "${funder.name}"`;

    if (institution === undefined) {
      raise({
        family: 'FUNDING',
        code: 'FUNDING_LOOKUP_UNAVAILABLE',
        classification: 'PREFLIGHT_GAP',
        blocking: true,
        locations: funder.provenance,
        discriminator: funder.key,
        message: `Thoth was not asked which institution ${describe} is, so its funding cannot be planned`,
      });

      return [];
    }

    if (institution.kind === 'CONFLICT') {
      raise({
        family: 'FUNDING',
        code: 'FUNDING_FUNDER_CONFLICT',
        classification: 'SOURCE_CONFLICT',
        blocking: true,
        locations: funder.provenance,
        discriminator: `${funder.key}|lookup`,
        detail: { institutionIds: institution.institutionIds },
        message: `The ROR and the FundRef DOI of ${describe} name different Thoth institutions, so none is chosen`,
      });

      return [];
    }

    if (institution.kind === 'NOT_FOUND') {
      raise({
        family: 'FUNDING',
        code: 'FUNDING_FUNDER_UNRESOLVED',
        classification: 'TARGET_INPUT_REQUIRED',
        blocking: true,
        locations: funder.provenance,
        discriminator: funder.key,
        detail: { ror: funder.ror ?? '', doi: funder.fundrefDoi ?? '' },
        resolution: { kind: 'ACKNOWLEDGE' },
        message: `No Thoth institution has the identity ${[funder.ror, funder.fundrefDoi].filter((value) => value !== null).join(' / ')} that ${describe} declares; acknowledge that its funding is not imported`,
      });

      return [];
    }

    return funder.fundings.map((funding) => ({
      id: appConfig.defaultId,
      ...funding,
      institutionId: institution.institutionId,
      institutionName: institution.name,
      institutionRor: institution.ror,
    }));
  });

  const representative = representativeOf(group);
  const chapterIntents: OnixBuiltContributorIntent[] = [];
  const chapterPending: string[] = [];
  const chapters = Object.entries(lookups.chapterWorkIds).flatMap(([path, workId]): OnixBuiltChapter[] => {
    const item = representative === undefined ? undefined : plan.products[representative].contentItems[path];

    if (item === undefined) return [];

    const built = buildContributions(item.contributors, path);
    const titles = resolveTitles(item.titles, findingsByKey, choices);
    const languages = resolveLanguages(item.languages, findingsByKey, choices);
    const subjects = resolveSubjects(item.subjects, findingsByKey, choices);

    chapterIntents.push(...built.intents);
    chapterPending.push(...titles.pending, ...languages.pending, ...subjects.pending);

    return [
      {
        path,
        workId,
        titles: titles.titles,
        languages: languages.languages,
        subjects: subjects.subjects,
        contributions: built.contributions,
      },
    ];
  });

  const inapplicable = new Set(resolved.inapplicableFindingKeys);

  return {
    values: resolved.values,
    contributions: work.contributions,
    fundings,
    chapters,
    contributorIntents: [...work.intents, ...chapterIntents],
    findings: [
      ...groupFindingsOf(plan, groupKey).filter((finding) => !inapplicable.has(finding.key)),
      ...resolved.findings,
      ...lookupFindings.all(),
    ],
    pendingFindingKeys: unique([
      ...resolved.pendingFindingKeys.filter((key) => !settledFindingKeys.has(key)),
      ...chapterPending,
      ...lookupPending,
    ]),
  };
};

/* ------------------------------------------------------------------------------------------------ */
/* Series targets across the import                                                                 */
/* ------------------------------------------------------------------------------------------------ */

/** One new Work's resolved Series memberships, with where the Work is created. */
export type OnixSeriesPlanEntry = {
  readonly groupKey: string;
  readonly workId: WorkId;
  readonly imprintId: string;
  readonly thothProfileActive: boolean;
  readonly memberships: readonly OnixSeriesMembership[];
};

export type OnixPlannedSeries = {
  /** The Series groups the import can run, in first-appearance order. */
  readonly series: SeriesImportPlan;
  readonly findings: readonly OnixDescriptiveFinding[];
  readonly pendingFindingKeys: readonly string[];
};

/** How the publisher assigns the ISSNs of a Series Thoth does not hold, which ONIX does not tell apart. */
export const SERIES_ISSN_ASSIGNMENT = {
  PRINT: 'PRINT',
  DIGITAL: 'DIGITAL',
  PRINT_DIGITAL: 'PRINT_DIGITAL',
  DIGITAL_PRINT: 'DIGITAL_PRINT',
  OMIT: OMIT_OPTION,
} as const;

const issnAssignments = (issns: readonly string[]): { key: string; print: string; digital: string }[] => {
  const omit = { key: SERIES_ISSN_ASSIGNMENT.OMIT, print: '', digital: '' };

  if (issns.length === 1) {
    return [
      { key: SERIES_ISSN_ASSIGNMENT.PRINT, print: issns[0], digital: '' },
      { key: SERIES_ISSN_ASSIGNMENT.DIGITAL, print: '', digital: issns[0] },
      omit,
    ];
  }

  if (issns.length === 2) {
    return [
      { key: SERIES_ISSN_ASSIGNMENT.PRINT_DIGITAL, print: issns[0], digital: issns[1] },
      { key: SERIES_ISSN_ASSIGNMENT.DIGITAL_PRINT, print: issns[1], digital: issns[0] },
      omit,
    ];
  }

  return [omit];
};

/**
 * Where every Series membership of the import's new Works goes: an existing Thoth Series exact identity names, or
 * one Series proposed for the whole import once the publisher has given it the type and ISSNs ONIX cannot. A
 * Series is never chosen between by name, and an issue ordinal Thoth or another Work already holds is never reused.
 */
export const planOnixDescriptiveSeries = (
  entries: readonly OnixSeriesPlanEntry[],
  options: { readonly serieses: readonly SeriesEntity[]; readonly choices: ChoiceMap },
): OnixPlannedSeries => {
  const { serieses, choices } = options;
  const findings = new FindingCollector((path) => ({ path, sourcePath: path }));
  const pending: string[] = [];
  const raise = (
    input: Omit<FindingInput, 'productKey' | 'paths'> & { readonly locations: readonly OnixSourceLocation[] },
  ) => {
    const finding = findings.add({ ...input, productKey: null, paths: input.locations.map(({ path }) => path) });

    if (finding.blocking && answerOf(finding, choices) === null && !pending.includes(finding.key))
      pending.push(finding.key);

    return finding;
  };

  type PlannedTarget = {
    readonly name: string;
    readonly target: SeriesImportTarget | null;
    readonly members: SeriesImportMember[];
    readonly claimed: Map<number, string>;
  };

  const targets = new Map<string, PlannedTarget>();

  entries.forEach((entry) => {
    const identities = new Set<string>();

    entry.memberships.forEach((membership) => {
      const describe = `Series "${membership.name}"`;
      const ordinal = membership.ordinal as number;
      const match = matchSeriesMembership(membership, serieses, entry.imprintId, entry.thothProfileActive);

      if (match.kind === 'AMBIGUOUS') {
        raise({
          groupKey: entry.groupKey,
          family: 'SERIES',
          code: 'SERIES_MATCH_AMBIGUOUS',
          classification: 'SOURCE_CONFLICT',
          blocking: true,
          locations: membership.provenance,
          discriminator: membership.key,
          detail: { seriesIds: match.seriesIds },
          message: `${describe} matches ${match.seriesIds.length === 1 ? 'a Thoth Series outside the Work’s imprint' : `${match.seriesIds.length} Thoth Series`}, and a Series is never chosen between, so the membership cannot be planned`,
        });

        return;
      }

      const identity =
        match.kind === 'EXISTING' ? `existing:${match.series.id}` : `proposed:${entry.imprintId}|${membership.key}`;

      if (identities.has(identity)) {
        raise({
          groupKey: entry.groupKey,
          family: 'SERIES',
          code: 'SERIES_IDENTITY_CONFLICT',
          classification: 'SOURCE_CONFLICT',
          blocking: true,
          locations: membership.provenance,
          discriminator: identity,
          message: `Two Collections of one Work name ${describe}, and a Work is one issue of a Series at most, so neither membership is chosen`,
        });

        return;
      }

      identities.add(identity);

      if (match.kind === 'EXISTING' && match.series.issues.some((issue) => issue.ordinal === ordinal)) {
        raise({
          groupKey: entry.groupKey,
          family: 'SERIES',
          code: 'SERIES_ORDINAL_COLLISION',
          classification: 'SOURCE_CONFLICT',
          blocking: true,
          locations: membership.provenance,
          discriminator: `${identity}|${ordinal}|thoth`,
          detail: { seriesId: match.series.id, ordinal },
          message: `${describe} already has an issue ${ordinal} in Thoth, so the Work cannot take that position`,
        });

        return;
      }

      let planned = targets.get(identity);

      if (planned === undefined) {
        let target: SeriesImportTarget | null = null;

        if (match.kind === 'EXISTING') {
          target = { kind: 'existing', seriesId: match.series.id };
        } else {
          // One question for the whole import, asked where the Series first appears.
          const typeAnswer = answerOf(
            raise({
              groupKey: entry.groupKey,
              family: 'SERIES',
              code: 'SERIES_TYPE_REQUIRED',
              classification: 'TARGET_INPUT_REQUIRED',
              blocking: true,
              locations: membership.provenance,
              discriminator: identity,
              resolution: {
                kind: 'CHOICE',
                options: [SeriesType.BookSeries, SeriesType.Journal].map((key) => ({ key, label: membership.name })),
              },
              message: `${describe} is not in Thoth, and ONIX does not say whether it is a book series or a journal; choose which Series to create`,
            }),
            choices,
          );
          const assignments = issnAssignments(membership.issns);
          const issnAnswer =
            membership.issns.length === 0
              ? SERIES_ISSN_ASSIGNMENT.OMIT
              : answerOf(
                  raise({
                    groupKey: entry.groupKey,
                    family: 'SERIES',
                    code: 'SERIES_ISSN_ASSIGNMENT_REQUIRED',
                    classification: 'TARGET_INPUT_REQUIRED',
                    blocking: true,
                    locations: membership.provenance,
                    discriminator: identity,
                    detail: { issns: membership.issns },
                    resolution: {
                      kind: 'CHOICE',
                      options: assignments.map(({ key }) => ({ key, label: membership.issns.join(', ') })),
                    },
                    message: `${describe} is not in Thoth, and ONIX does not say whether ISSN ${membership.issns.join(', ')} identifies its print or its digital form; assign it, or create the Series without it`,
                  }),
                  choices,
                );
          const assignment = assignments.find(({ key }) => key === issnAnswer);

          if (typeAnswer !== null && assignment !== undefined) {
            target = {
              kind: 'proposed',
              series: {
                name: membership.name,
                imprintId: entry.imprintId,
                type: typeAnswer as SeriesType,
                issnPrint: assignment.print,
                issnDigital: assignment.digital,
              },
            };
          }
        }

        planned = { name: membership.name, target, members: [], claimed: new Map() };
        targets.set(identity, planned);
      }

      const claimant = planned.claimed.get(ordinal);

      if (claimant !== undefined) {
        raise({
          groupKey: entry.groupKey,
          family: 'SERIES',
          code: 'SERIES_ORDINAL_COLLISION',
          classification: 'SOURCE_CONFLICT',
          blocking: true,
          locations: membership.provenance,
          discriminator: `${identity}|${ordinal}`,
          detail: { ordinal, groupKeys: [claimant, entry.groupKey] },
          message: `${describe} is given issue ${ordinal} by two Works of this import, so neither can take that position`,
        });

        return;
      }

      planned.claimed.set(ordinal, entry.groupKey);
      planned.members.push({ workId: entry.workId, orderNumber: ordinal, issueNumber: membership.issueNumber });
    });
  });

  return {
    series: [...targets.values()].flatMap(({ name, target, members }) =>
      target === null || members.length === 0 ? [] : [{ name, target, members }],
    ),
    findings: findings.all(),
    pendingFindingKeys: pending,
  };
};
