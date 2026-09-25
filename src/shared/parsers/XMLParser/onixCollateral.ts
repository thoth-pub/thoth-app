import { AbstractType, LocaleCode, MarkupFormat, ResourceType } from '@/gql/graphql';

import type { ImportedMarkupFormat } from '../../types/markdown';
import {
  ONIX_COLLATERAL_ACKNOWLEDGED,
  ONIX_COLLATERAL_OMIT,
  ONIX_COLLATERAL_PROJECT,
  type OnixAdditionalResourceCandidate,
  type OnixAdditionalResourceIntent,
  type OnixAdditionalResourceTarget,
  type OnixCollateralDateFact,
  type OnixCollateralFinding,
  type OnixCollateralFindingCode,
  type OnixCollateralPlan,
  type OnixCollateralRecoveredOmission,
  type OnixCollateralScope,
  type OnixCollateralStatedText,
  type OnixCollateralTextCandidate,
  type OnixCollateralTextLocale,
  type OnixCollateralTextSlot,
  type OnixContentItemKind,
  type OnixPlanFindingClassification,
  type OnixPlannedAbstract,
  type OnixPlannedCollateralText,
  type OnixProductCollateral,
  type OnixPromotionalEventFact,
  type OnixPromotionalEventOccurrenceFact,
  type OnixResourceCandidateReason,
  type OnixResourceFeatureFact,
  type OnixResourceRole,
  type OnixResourceVersionFact,
  type OnixSourceLocation,
  type OnixSourcePlan,
  type OnixSupportingResourceFact,
  type OnixTextContentFact,
  type OnixTextContentRole,
} from '../../types/onixPlanning';
import { normaliseImportedAbstractHtml } from './importedAbstractHtml';
import { normaliseImportedPlainText } from './importedPlainText';
import type { ExtendedONIXMessageRoot, OnixText } from './interfaces';
import { extractTagNames, getOnixText, readOnixDate, resolveOnixTextMarkup, toOnixArray } from './onix';
import { localeOfLanguage, type OnixDescriptivePlan } from './onixDescriptive';
import type { RecoveryMarker } from './validation';
import type { ProvenanceResolver } from './validation/worker/provenance';

/**
 * The canonical collateral reduction of thoth-app#225 (APP-IMPORT-ONIX-REL-01C of #185), under the approved collateral decision
 * ONIX-AUDIT-COLLATERAL-01 (#179 proposal 5562227566, approval 5568781349) with its trailer amendment, the recovered
 * PromotionDetail decision (5541009506) as that approval amends it, the recoverable empty-TextContent amendment (5572802864,
 * #185 5572808295) and the Phase-A reconciliation (5572448584).
 *
 * `reduceOnixCollateral` runs after canonical source validation has permitted target planning, on the adapter value bridged
 * from the final normalised Reference XML, after #182 has grouped Products into Works. It reads every TextContent and
 * SupportingResource of every complete Product and of every ContentItem, and every PromotionalEvent, exactly as stated and in
 * source order (rules 1-7, 70-80): nothing is fetched, downloaded, copied or re-hosted, no ResourceType is read from a link, a
 * filename or an extension, and no first match stands for a repeated composite. Each fact keeps its scope - the Product, its
 * ContentItem or its event - and is never moved to a writable target elsewhere (rules 159-162).
 *
 * The front cover stays the descriptive cover reducer's (thoth-app#219): this reduction names its SupportingResource and
 * decides nothing about it. A malformed TextContent the validator omitted under the approved narrow recovery arrives omitted,
 * and only its marker is recorded. Review and endorsement text is kept whole for REL-01D (#226), and projected by nothing
 * here.
 *
 * `resolveOnixCollateralWork` and `resolveOnixCollateralComponent` are pure: from the reduction and the publisher's answers they
 * decide the abstracts, table of contents and general note a Work, chapter or contained Work is created with, and every
 * AdditionalResource intent - which always waits on #187, which creates it.
 */

export type ReduceOnixCollateralOptions = {
  /** Maps canonical Reference paths back to the submitted source, for a Short-tag file. */
  readonly provenance?: ProvenanceResolver;
  /** The approved recovery markers of the canonical result: an omitted TextContent is recorded, never re-read. */
  readonly recoveries?: readonly RecoveryMarker[];
  /**
   * The canonical descriptive reductions of the same source (thoth-app#183): the text-language evidence an untagged text
   * takes its locale from, exactly as an untagged title does (5562227566 rule 39; 5551158156 rules 54-58).
   */
  readonly descriptive?: OnixDescriptivePlan;
};

/* ------------------------------------------------------------------------------------------------ */
/* Pinned codelists (Issue 74)                                                                      */
/* ------------------------------------------------------------------------------------------------ */

/** List 154: the one audience a public target takes by itself, the one never shown, and a search index (rules 13-16). */
const UNRESTRICTED_AUDIENCE = '00';
const RESTRICTED_AUDIENCE = '01';
const SEARCH_INDEX_AUDIENCE = '09';

/** List 153 TextTypes and what each is to this stage (rules 32-69). */
const TEXT_ROLES: Readonly<Record<string, OnixTextContentRole>> = {
  '02': 'SHORT_ABSTRACT',
  '03': 'LONG_ABSTRACT',
  '30': 'LONG_ABSTRACT',
  '04': 'TABLE_OF_CONTENTS',
  '13': 'GENERAL_NOTE',
  '06': 'REVIEW',
  '07': 'REVIEW',
  '08': 'REVIEW',
  '09': 'REVIEW',
};

const DESCRIPTION_TEXT_TYPE = '03';
const ABSTRACT_TEXT_TYPE = '30';
const SENDER_DEFINED_TEXT_TYPE = '01';

/** Why a List 153 TextType has no target, by the rule that says so (rules 56-67). */
const UNREPRESENTED_TEXT_REASONS: Readonly<Record<string, string>> = {
  '01': 'SENDER_DEFINED_TEXT',
  '12': 'ALL_CONTRIBUTORS_BIOGRAPHY',
  '16': 'COLLECTION_DESCRIPTION',
  '17': 'COLLECTION_DESCRIPTION',
  '20': 'OPEN_ACCESS_STATEMENT',
  '24': 'SCHEMA_ORG_SNIPPET',
  '29': 'BIBLIOGRAPHY',
  '33': 'IMPRINT_OR_PUBLISHER_DESCRIPTION',
  '34': 'IMPRINT_OR_PUBLISHER_DESCRIPTION',
  '35': 'IMPRINT_OR_PUBLISHER_DESCRIPTION',
  '36': 'IMPRINT_OR_PUBLISHER_DESCRIPTION',
};

const UNREPRESENTED_TEXT_EXPLANATIONS: Readonly<Record<string, string>> = {
  SENDER_DEFINED_TEXT: 'sender-defined text is not for general distribution and never fills a generic Work field',
  ALL_CONTRIBUTORS_BIOGRAPHY:
    'a biographical note of all contributors is never divided among them and never makes a contributor',
  COLLECTION_DESCRIPTION: "a collection's description is never the Work's, and no Series description is set from it",
  OPEN_ACCESS_STATEMENT: 'an open access statement is marketing text, never evidence of a licence or of open access',
  SCHEMA_ORG_SNIPPET: 'a schema.org snippet is data, never markup to run or a Work note',
  BIBLIOGRAPHY: "a list of the author's books is never the Work's bibliography note",
  IMPRINT_OR_PUBLISHER_DESCRIPTION: 'an imprint or publisher description never changes the imprint or publisher',
  NO_TARGET: 'Thoth has no field for this kind of text, and no other text field stands in for it',
  CHAPTER_TABLE_OF_CONTENTS: 'Thoth holds no table of contents for a chapter, and it is never moved to its Work',
};

/** List 155 roles that control when collateral may be used, which no Thoth field enforces (rules 22-25). */
const TEMPORAL_CONTROL_ROLES: ReadonlySet<string> = new Set(['14', '15', '24', '27', '28']);
/** List 155 publication (01) and broadcast (04) dates: the only roles AdditionalResource.date may take (rule 28). */
const INTRINSIC_DATE_ROLES: ReadonlySet<string> = new Set(['01', '04']);

/** List 161. */
const LINKABLE_FORM = '01';
const DOWNLOADABLE_FORM = '02';
const EMBEDDABLE_FORM = '03';
const FORM_NAMES: Readonly<Record<string, string>> = {
  [LINKABLE_FORM]: 'a linkable resource',
  [DOWNLOADABLE_FORM]: 'a downloadable file',
  [EMBEDDABLE_FORM]: 'an embeddable application',
};

/** List 159. */
const AUDIO_MODE = '02';
const IMAGE_MODE = '03';
const TEXT_MODE = '04';
const VIDEO_MODE = '05';
const MULTI_MODE = '06';

/** List 160. */
const REQUIRED_CREDIT = '01';
const CAPTION = '02';
const FEATURE_NAMES: Readonly<Record<string, string>> = {
  '03': 'copyright holder, which is never the Work copyright holder',
  '04': 'length in minutes',
  '05': 'ISNI of a contributor, which creates no Thoth contributor relation',
  '06': 'proprietary contributor ID, which creates no Thoth contributor relation',
  '07': 'alternative text',
  '08': 'background colour',
  '09': 'product image attribute',
  '10': 'page background colour',
  '11': 'ORCID of a contributor, which creates no Thoth contributor relation',
};

/** List 158 22 is the one feature article role that may become an ARTICLE (rule 117). */
const FEATURE_ARTICLE = '21';

/**
 * The pinned List 158 (Issue 74) labels: an AdditionalResource's title where ONIX gives none, as a target normalisation
 * (rule 111), and how every role is named in the plan.
 */
export const ONIX_LIST_158_LABELS: Readonly<Record<string, string>> = {
  '01': 'Front cover',
  '02': 'Back cover',
  '03': 'Cover / pack',
  '04': 'Contributor picture',
  '05': 'Collection image / artwork',
  '06': 'Collection logo',
  '07': 'Product image / artwork',
  '08': 'Product logo',
  '09': 'Publisher logo',
  '10': 'Imprint logo',
  '11': 'Contributor interview',
  '12': 'Contributor presentation',
  '13': 'Contributor reading',
  '14': 'Contributor event schedule',
  '15': 'Sample content',
  '16': 'Widget',
  '17': 'Review',
  '18': 'Commentary / discussion',
  '19': 'Reading group guide',
  '20': 'Teacher’s guide',
  '21': 'Feature article',
  '22': 'Character ‘interview’',
  '23': 'Wallpaper / screensaver',
  '24': 'Press release',
  '25': 'Table of contents',
  '26': 'Trailer',
  '27': 'Cover thumbnail',
  '28': 'Full content',
  '29': 'Full cover',
  '30': 'Master brand logo',
  '31': 'Description',
  '32': 'Index',
  '33': 'Student’s guide',
  '34': 'Publisher’s catalogue',
  '35': 'Online advertisement panel',
  '36': 'Online advertisement page',
  '37': 'Promotional event material',
  '38': 'Digital review copy',
  '39': 'Instructional material',
  '40': 'Errata',
  '41': 'Introduction',
  '42': 'Collection description',
  '43': 'Bibliography',
  '44': 'Abstract',
  '45': 'Cover holding image',
  '46': 'Rules or instructions',
  '47': 'Transcript',
  '48': 'Full cast and credit list',
  '49': 'Image for social media',
  '50': 'Supplementary learning resources',
  '51': 'Cover flap image',
  '52': 'Warning label',
  '53': 'Product safety contacts',
  '54': 'Page edge deco image',
  '55': 'Endpaper deco image',
  '56': 'Spine image',
  '57': 'Spine panorama image',
  '99': 'License',
};

/**
 * The List 158 roles an AdditionalResource may be planned from, exactly as the approved decision names them: sample content
 * (rule 127), the Work collateral of rule 128 (less 42, a collection's, rule 134), a feature article (rule 117), a trailer
 * (rules 142-145), a full cover (rule 131), a cover holding image (rule 132) and contributor collateral (rule 133).
 */
const WORK_RESOURCE_ROLES: ReadonlySet<string> = new Set([
  '04',
  '11',
  '12',
  '13',
  '14',
  '15',
  '19',
  '20',
  '21',
  '25',
  '26',
  '29',
  '31',
  '32',
  '33',
  '39',
  '40',
  '41',
  '43',
  '44',
  '45',
  '46',
  '47',
  '48',
  '49',
  '50',
  '51',
  '52',
  '54',
  '55',
  '56',
  '57',
]);

/** Collection, publisher, imprint and master brand collateral: never re-scoped to the Work (rule 134). */
const NOT_WORK_SCOPED_ROLES: ReadonlySet<string> = new Set(['05', '06', '09', '10', '30', '34', '42']);

const roleOfResource = (contentType: string): OnixResourceRole => {
  if (contentType === '01') return 'FRONT_COVER';
  if (WORK_RESOURCE_ROLES.has(contentType)) return 'WORK_RESOURCE';
  if (NOT_WORK_SCOPED_ROLES.has(contentType)) return 'NOT_WORK_SCOPED';

  switch (contentType) {
    case '28':
      return 'FULL_CONTENT';
    case '38':
      return 'REVIEW_COPY';
    case '53':
      return 'PRODUCT_SAFETY';
    case '99':
      return 'LICENCE';
    default:
      return 'NOT_PROJECTED';
  }
};

const ROLE_EXPLANATIONS: Readonly<Record<string, string>> = {
  NOT_WORK_SCOPED:
    "it is a collection's, publisher's, imprint's or brand's collateral, which is never re-scoped to the Work, and no publisher or imprint is changed",
  REVIEW_COPY:
    'it is a digital review copy, whose access limits an AdditionalResource cannot keep, so it is never published as one',
  PRODUCT_SAFETY:
    'it holds product safety contacts, which are never a public Work resource; nothing of them is repeated here',
  LICENCE:
    'it is a licence link, which belongs to the licence contract alone: it is neither an AdditionalResource nor the Work licence',
  NO_APPROVED_PROJECTION: 'no approved rule projects this role as an AdditionalResource, and none is inferred for it',
  CHAPTER: 'Thoth holds no AdditionalResource for a chapter, and it is never moved to the chapter’s Work',
  COMPONENT_COVER: 'a component’s front cover is not a cover any Work of this plan takes',
};

/** Where a Thoth URL field can hold a link: an absolute URL with a host (the backend's own check). */
const TARGET_URL = /^[^:]*:\/\/(?:[^/:]*:[^/@]*@)?(?:[^/:.]*\.)+([^:/]+)/i;

const THOTH_LOCALE_CODES: ReadonlySet<string> = new Set(Object.values(LocaleCode));

const TERRITORY_PARTS = ['CountriesIncluded', 'RegionsIncluded', 'CountriesExcluded', 'RegionsExcluded'] as const;

const HTML_DECLARATIONS: ReadonlySet<string> = new Set(['02', '05']);

/* ------------------------------------------------------------------------------------------------ */
/* Reading the adapter                                                                              */
/* ------------------------------------------------------------------------------------------------ */

type Occurrence = { readonly value: unknown; readonly path: string };

type Locate = (path: string) => OnixSourceLocation;

const isElement = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/** Every occurrence of a named child, in source order, with its canonical path; an empty element is an occurrence. */
const children = (parent: Occurrence | undefined, name: string): Occurrence[] => {
  if (parent === undefined || !isElement(parent.value) || !(name in parent.value)) return [];

  const child = parent.value[name];

  return (Array.isArray(child) ? child : [child])
    .map((value, index) => ({ value: value as unknown, path: `${parent.path}/${name}[${index + 1}]` }))
    .filter(({ value }) => value !== undefined && value !== null);
};

const textOf = (occurrence: Occurrence | undefined): string =>
  occurrence === undefined ? '' : getOnixText(occurrence.value as OnixText);

const childText = (parent: Occurrence | undefined, name: string): string => textOf(children(parent, name)[0]);

const childTexts = (parent: Occurrence, name: string): string[] =>
  children(parent, name)
    .map(textOf)
    .filter((text) => text.length > 0);

const attributeOf = (occurrence: Occurrence | undefined, name: string): string => {
  const value = occurrence?.value;

  return isElement(value) && typeof value[`@_${name}`] === 'string' ? (value[`@_${name}`] as string).trim() : '';
};

/** Whether an element holds child elements, which only an XHTML-enabled element may. */
const holdsElements = (occurrence: Occurrence): boolean =>
  isElement(occurrence.value) && Object.keys(occurrence.value).some((key) => key !== '#text' && !key.startsWith('@_'));

const unique = <T>(values: readonly T[]): T[] => [...new Set(values)];

const nullIfEmpty = (value: string): string | null => (value.length > 0 ? value : null);

/** Serialises with object keys sorted, so two equal values serialise alike whatever their key order. */
const canonicalJson = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;

  if (isElement(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(',')}}`;
  }

  return value === undefined ? 'null' : JSON.stringify(value);
};

/**
 * A short fingerprint of plain data (cyrb53), as the other canonical reductions key their findings: equal data always gives
 * the same fingerprint, so a key built from one depends on the file alone. It tells facts apart; it is never an identity.
 */
const fingerprint = (value: unknown): string => {
  const text = typeof value === 'string' ? value : canonicalJson(value);
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;

  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);

    h1 = Math.imul(h1 ^ code, 2654435761);
    h2 = Math.imul(h2 ^ code, 1597334677);
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
};

/** A text as the plan names it in a message or an option: its first words, never more than a line. */
const excerpt = (content: string): string => {
  const flat = content.replace(/\s+/g, ' ').trim();

  return flat.length > 80 ? `${flat.slice(0, 79)}…` : flat;
};

/* ------------------------------------------------------------------------------------------------ */
/* Findings                                                                                         */
/* ------------------------------------------------------------------------------------------------ */

type FindingInput = {
  readonly code: OnixCollateralFindingCode;
  readonly classification: OnixPlanFindingClassification;
  readonly blocking: boolean;
  readonly productKey: string | null;
  readonly groupKey: string;
  readonly componentPath: string | null;
  readonly locations: readonly OnixSourceLocation[];
  readonly detail?: OnixCollateralFinding['detail'];
  readonly resolution?: OnixCollateralFinding['resolution'];
  readonly message: string;
  /** What tells this finding apart from another of the same code in the same scope: the facts it is about. */
  readonly discriminator: string;
};

class CollateralFindings {
  private readonly byKey = new Map<string, OnixCollateralFinding>();

  add(input: FindingInput): OnixCollateralFinding {
    const key = [
      'COLLATERAL',
      input.code,
      input.productKey ?? input.groupKey,
      input.componentPath ?? '',
      input.discriminator,
    ].join('|');
    const existing = this.byKey.get(key);

    if (existing !== undefined) return existing;

    const finding: OnixCollateralFinding = {
      family: 'COLLATERAL',
      key,
      code: input.code,
      classification: input.classification,
      blocking: input.blocking,
      productKey: input.productKey,
      groupKey: input.groupKey,
      componentPath: input.componentPath,
      locations: input.locations,
      detail: input.detail ?? {},
      resolution: input.resolution ?? { kind: 'NONE' },
      message: input.message,
    };

    this.byKey.set(key, finding);

    return finding;
  }

  all(): OnixCollateralFinding[] {
    return [...this.byKey.values()];
  }
}

/**
 * Whether an answer is one a collateral finding offers (thoth-app#225): the acknowledgement for a loss, one of a choice's
 * options, or a Thoth locale for a locale input. A finding no answer resolves offers none; every other answer is stale.
 */
export const isOfferedOnixCollateralAnswer = (
  finding: Pick<OnixCollateralFinding, 'resolution'>,
  answer: string,
): boolean => {
  switch (finding.resolution.kind) {
    case 'ACKNOWLEDGE':
      return answer === ONIX_COLLATERAL_ACKNOWLEDGED;
    case 'CHOICE':
      return finding.resolution.options.some(({ key }) => key === answer);
    case 'INPUT':
      return THOTH_LOCALE_CODES.has(answer);
    case 'NONE':
      return false;
  }
};

/* ------------------------------------------------------------------------------------------------ */
/* Facts                                                                                            */
/* ------------------------------------------------------------------------------------------------ */

type ProductContext = {
  readonly productKey: string;
  readonly groupKey: string;
  readonly describe: string;
  readonly locate: Locate;
  readonly findings: CollateralFindings;
  readonly findingKeys: string[];
  readonly descriptive: OnixDescriptivePlan | undefined;
};

const statedText = (occurrence: Occurrence, locate: Locate, withheld: boolean): OnixCollateralStatedText => {
  const elements = holdsElements(occurrence);

  return {
    ...locate(occurrence.path),
    text: withheld || elements ? null : textOf(occurrence),
    language: nullIfEmpty(attributeOf(occurrence, 'language').toLowerCase()),
    script: nullIfEmpty(attributeOf(occurrence, 'textscript')),
    textFormat: nullIfEmpty(attributeOf(occurrence, 'textformat')),
    holdsElements: elements,
  };
};

/** One ContentDate, with the one complete calendar day it names where the ONIX 3.0 element or 3.1 attribute allows it. */
const dateFactOf = (occurrence: Occurrence, locate: Locate): OnixCollateralDateFact => {
  const [date] = children(occurrence, 'Date');
  const elementFormat = childText(occurrence, 'DateFormat');
  const format = nullIfEmpty(elementFormat) ?? nullIfEmpty(attributeOf(date, 'dateformat'));
  const day =
    date !== undefined && (elementFormat.length === 0 || elementFormat === '00')
      ? (readOnixDate(date.value as OnixText) ?? null)
      : null;

  return {
    ...locate(occurrence.path),
    role: childText(occurrence, 'ContentDateRole'),
    format,
    value: textOf(date),
    day,
  };
};

const territoryOf = (parent: Occurrence): string[] => {
  const [territory] = children(parent, 'Territory');

  return territory === undefined
    ? []
    : TERRITORY_PARTS.flatMap((part) =>
        childTexts(territory, part).map((value) => `${part} ${value.split(/\s+/).join(' ')}`),
      );
};

/** Whether a stated Territory is the whole world and nothing less. */
const isWorldOnly = (territory: readonly string[]): boolean =>
  territory.length === 0 || (territory.length === 1 && territory[0] === 'RegionsIncluded WORLD');

const usageTermsOf = (parent: Occurrence, locate: Locate): OnixSourceLocation[] =>
  [...children(parent, 'EpubUsageConstraint'), ...children(parent, 'EpubLicense')].map(({ path }) => locate(path));

const featuresOf = (parent: Occurrence, element: string, typeElement: string, locate: Locate, withheld: boolean) =>
  children(parent, element).map(
    (feature): OnixResourceFeatureFact => ({
      ...locate(feature.path),
      type: childText(feature, typeElement),
      value: withheld ? null : nullIfEmpty(childText(feature, 'FeatureValue')),
      notes: children(feature, 'FeatureNote').map((note) => statedText(note, locate, withheld)),
    }),
  );

/** Everything a fact states, as a fingerprint that leaves its place out: what an answer about it is bound to. */
const bindingOf = (occurrence: Occurrence): string => fingerprint(occurrence.value);

const textContentFactOf = (
  context: ProductContext,
  occurrence: Occurrence,
  scope: OnixCollateralScope,
  position: number,
): OnixTextContentFact => {
  const { locate } = context;
  const textType = childText(occurrence, 'TextType');
  const audiences = childTexts(occurrence, 'ContentAudience');
  const redacted = audiences.includes(RESTRICTED_AUDIENCE) || textType === SENDER_DEFINED_TEXT_TYPE;
  const texts = (name: string) => children(occurrence, name).map((text) => statedText(text, locate, redacted));
  const [rating] = children(occurrence, 'ReviewRating');

  return {
    ...locate(occurrence.path),
    factKey: `${context.productKey}|${occurrence.path}`,
    productKey: context.productKey,
    groupKey: context.groupKey,
    scope,
    position,
    sequenceNumber: nullIfEmpty(childText(occurrence, 'SequenceNumber')),
    textType,
    role: TEXT_ROLES[textType] ?? 'UNREPRESENTED',
    audiences,
    territory: territoryOf(occurrence),
    texts: texts('Text'),
    reviewRating:
      rating === undefined
        ? []
        : [childText(rating, 'Rating'), childText(rating, 'RatingLimit'), ...childTexts(rating, 'RatingUnits')].filter(
            (part) => part.length > 0,
          ),
    authors: texts('TextAuthor'),
    sourceCorporate: texts('TextSourceCorporate'),
    sourceDescriptions: texts('TextSourceDescription'),
    textSources: children(occurrence, 'TextSource').map(({ path }) => locate(path)),
    sourceTitles: texts('SourceTitle'),
    sourceLinks: texts('TextSourceLink'),
    usageTerms: usageTermsOf(occurrence, locate),
    dates: children(occurrence, 'ContentDate').map((date) => dateFactOf(date, locate)),
    redacted,
    binding: bindingOf(occurrence),
  };
};

const resourceFactOf = (
  context: ProductContext,
  occurrence: Occurrence,
  scope: OnixCollateralScope,
  position: number,
): OnixSupportingResourceFact => {
  const { locate } = context;
  const contentType = childText(occurrence, 'ResourceContentType');
  const audiences = childTexts(occurrence, 'ContentAudience');
  const role = roleOfResource(contentType);
  const redacted = audiences.includes(RESTRICTED_AUDIENCE) || role === 'REVIEW_COPY' || role === 'PRODUCT_SAFETY';

  return {
    ...locate(occurrence.path),
    factKey: `${context.productKey}|${occurrence.path}`,
    productKey: context.productKey,
    groupKey: context.groupKey,
    scope,
    position,
    sequenceNumber: nullIfEmpty(childText(occurrence, 'SequenceNumber')),
    contentType,
    role,
    audiences,
    territory: territoryOf(occurrence),
    modes: childTexts(occurrence, 'ResourceMode'),
    features: featuresOf(occurrence, 'ResourceFeature', 'ResourceFeatureType', locate, redacted),
    versions: children(occurrence, 'ResourceVersion').map(
      (version): OnixResourceVersionFact => ({
        ...locate(version.path),
        form: childText(version, 'ResourceForm'),
        features: featuresOf(version, 'ResourceVersionFeature', 'ResourceVersionFeatureType', locate, redacted),
        links: children(version, 'ResourceLink').map((link) => statedText(link, locate, redacted)),
        usageTerms: usageTermsOf(version, locate),
        dates: children(version, 'ContentDate').map((date) => dateFactOf(date, locate)),
      }),
    ),
    redacted,
    binding: bindingOf(occurrence),
  };
};

const locationOf = ({ path, sourcePath }: OnixSourceLocation): OnixSourceLocation => ({ path, sourcePath });

/* ------------------------------------------------------------------------------------------------ */
/* TextContent                                                                                      */
/* ------------------------------------------------------------------------------------------------ */

const slotOf = (role: OnixTextContentRole): OnixCollateralTextSlot | null =>
  role === 'SHORT_ABSTRACT' || role === 'LONG_ABSTRACT' || role === 'TABLE_OF_CONTENTS' || role === 'GENERAL_NOTE'
    ? role
    : null;

const isAbstractSlot = (slot: OnixCollateralTextSlot) => slot === 'SHORT_ABSTRACT' || slot === 'LONG_ABSTRACT';

const SLOT_NAMES: Readonly<Record<OnixCollateralTextSlot, string>> = {
  SHORT_ABSTRACT: 'short abstract',
  LONG_ABSTRACT: 'long abstract',
  TABLE_OF_CONTENTS: 'table of contents',
  GENERAL_NOTE: 'general note',
};

type NormalisedText =
  | { readonly kind: 'content'; readonly content: string; readonly format: ImportedMarkupFormat }
  | { readonly kind: 'empty' }
  | { readonly kind: 'unrepresentable'; readonly reason: string; readonly tags: readonly string[] };

/**
 * One Text as the target it may fill holds it (rule 40): an abstract through the approved markup policy the descriptive
 * texts follow - HTML, JATS or plain text, each normalised as the API reads it - and a table of contents or general note
 * as the plain text those fields store as given. Nothing is ever guessed from angle brackets, and nothing is invented.
 */
const normaliseText = (text: OnixCollateralStatedText, slot: OnixCollateralTextSlot): NormalisedText => {
  if (text.holdsElements) return { kind: 'unrepresentable', reason: 'STRUCTURE', tags: [] };

  const content = text.text ?? '';

  if (content.length === 0) return { kind: 'empty' };

  const declared = text.textFormat ?? '';
  const resolution = resolveOnixTextMarkup(declared, content);

  if (resolution.kind === 'unclassifiable') return { kind: 'unrepresentable', reason: 'FORMAT', tags: resolution.tags };

  if (!isAbstractSlot(slot)) {
    // Work.toc and Work.generalNote store the text as given, and the app shows it as plain text: markup has no place there.
    if (resolution.format !== MarkupFormat.PlainText) {
      return { kind: 'unrepresentable', reason: 'MARKUP_IN_PLAIN_FIELD', tags: extractTagNames(content) };
    }

    if (!HTML_DECLARATIONS.has(declared)) {
      return { kind: 'content', content: content.replace(/\r\n?/g, '\n'), format: MarkupFormat.PlainText };
    }
  }

  if (resolution.format === MarkupFormat.JatsXml) return { kind: 'content', content, format: resolution.format };

  const normalised =
    resolution.format === MarkupFormat.PlainText
      ? normaliseImportedPlainText(declared, content)
      : normaliseImportedAbstractHtml(content);

  if (normalised.kind === 'unrepresentable') {
    return {
      kind: 'unrepresentable',
      reason: resolution.format === MarkupFormat.PlainText ? 'LINE_BREAK' : 'STRUCTURE',
      tags: [],
    };
  }

  return normalised.kind === 'empty'
    ? { kind: 'empty' }
    : { kind: 'content', content: normalised.content, format: resolution.format };
};

const UNREPRESENTABLE_EXPLANATIONS: Readonly<Record<string, string>> = {
  STRUCTURE: 'it holds structure Thoth cannot represent without inventing or losing content',
  FORMAT: 'it contains markup Thoth cannot safely read as HTML, JATS or plain text',
  LINE_BREAK: 'it contains a single line break Thoth cannot represent in an abstract',
  MARKUP_IN_PLAIN_FIELD: 'it contains markup, and Thoth keeps this field as plain text',
};

/** Where an untagged text in a scope may take its locale from, as the title reducer reads it (5551158156 rules 54-58). */
const localeEvidenceOf = (context: ProductContext, componentPath: string | null) => {
  const product = context.descriptive?.products[context.productKey];
  const item = componentPath === null ? undefined : product?.contentItems[componentPath];

  if (item !== undefined && item.languages.textLocales.length > 0) {
    return { textLocales: item.languages.textLocales as readonly string[], fromHeaderDefault: false };
  }

  return {
    textLocales: (product?.languages.textLocales ?? []) as readonly string[],
    fromHeaderDefault: product?.languages.textLanguageFromHeaderDefault ?? false,
  };
};

/**
 * The locale one abstract text is in (rule 39): its own language, qualified by its script where Thoth has exactly that
 * locale; otherwise its scope's one text language, with the Header default's provenance where that is what it is; and
 * otherwise the publisher's answer - a choice among the scope's text languages, or a locale they give. Never English by
 * default, and never the first of several.
 */
const localeOfText = (
  context: ProductContext,
  text: OnixCollateralStatedText,
  componentPath: string | null,
  describe: string,
  binding: string,
): OnixCollateralTextLocale => {
  const scope = { productKey: context.productKey, groupKey: context.groupKey, componentPath };
  const note = (finding: FindingInput) => {
    context.findingKeys.push(context.findings.add(finding).key);
  };

  if (text.language !== null) {
    const { locale, qualifierLost } = localeOfLanguage(text.language, text.script, null);

    if (locale !== undefined) {
      if (qualifierLost) {
        note({
          ...scope,
          code: 'COLLATERAL_TEXT_SCRIPT_NOT_REPRESENTED',
          classification: 'SUPPORTED_WITH_WARNING',
          blocking: false,
          locations: [locationOf(text)],
          discriminator: text.path,
          detail: { language: text.language, script: text.script ?? '' },
          message: `The ${describe} declares script ${text.script}, which Thoth has no ${text.language} locale for, so it is imported with the base language locale`,
        });
      }

      return { status: 'RESOLVED', localeCode: locale, basis: 'TEXT_LANGUAGE' };
    }

    const finding = context.findings.add({
      ...scope,
      code: 'COLLATERAL_TEXT_LOCALE_UNRESOLVED',
      classification: 'TARGET_INPUT_REQUIRED',
      blocking: true,
      locations: [locationOf(text)],
      discriminator: `${text.path}|${binding}`,
      detail: { language: text.language },
      resolution: { kind: 'INPUT', input: 'LOCALE' },
      message: `The ${describe} is in language ${text.language}, which has no Thoth locale; give the locale Thoth records it in`,
    });

    context.findingKeys.push(finding.key);

    return { status: 'DECISION', findingKey: finding.key };
  }

  const evidence = localeEvidenceOf(context, componentPath);

  if (evidence.textLocales.length === 1) {
    if (evidence.fromHeaderDefault) {
      note({
        ...scope,
        code: 'COLLATERAL_TEXT_HEADER_DEFAULT_LANGUAGE',
        classification: 'SUPPORTED_NORMALIZED',
        blocking: false,
        locations: [locationOf(text)],
        discriminator: text.path,
        detail: { localeCode: evidence.textLocales[0] },
        message: `The ${describe} declares no language, so it takes the locale of the message Header's default language of text`,
      });
    }

    return {
      status: 'RESOLVED',
      localeCode: evidence.textLocales[0],
      basis: evidence.fromHeaderDefault ? 'HEADER_DEFAULT_LANGUAGE' : 'SCOPE_TEXT_LANGUAGE',
    };
  }

  const choosable = evidence.textLocales.length > 1;
  const finding = context.findings.add({
    ...scope,
    code: 'COLLATERAL_TEXT_LOCALE_UNRESOLVED',
    classification: 'TARGET_INPUT_REQUIRED',
    blocking: true,
    locations: [locationOf(text)],
    discriminator: `${text.path}|${binding}`,
    detail: { language: '', textLocales: evidence.textLocales },
    resolution: choosable
      ? { kind: 'CHOICE', options: evidence.textLocales.map((locale) => ({ key: locale, label: locale })) }
      : { kind: 'INPUT', input: 'LOCALE' },
    message: choosable
      ? `The ${describe} declares no language, and the text is in more than one language (${evidence.textLocales.join(', ')}); choose the locale Thoth records it in`
      : `The ${describe} declares no language, and nothing else in the file states one; give the locale Thoth records it in, which is never assumed to be English`,
  });

  context.findingKeys.push(finding.key);

  return { status: 'DECISION', findingKey: finding.key };
};

/** What a projected TextContent states beside its text that its one target cannot keep (rules 44, 51, 55, 151-152). */
const textLossesOf = (fact: OnixTextContentFact, slot: OnixCollateralTextSlot): string[] => {
  const targeted = fact.audiences.filter((audience) => audience !== UNRESTRICTED_AUDIENCE);
  const describedBy = [
    ...(fact.authors.length > 0 ? ['TextAuthor'] : []),
    ...(fact.sourceCorporate.length > 0 ? ['TextSourceCorporate'] : []),
    ...(fact.sourceDescriptions.length > 0 ? ['TextSourceDescription'] : []),
    ...(fact.textSources.length > 0 ? ['TextSource'] : []),
    ...(fact.sourceTitles.length > 0 ? ['SourceTitle'] : []),
    ...(fact.sourceLinks.length > 0 ? ['TextSourceLink'] : []),
  ];
  const languages = unique(fact.texts.flatMap(({ language }) => (language === null ? [] : [language])));

  return [
    ...(fact.audiences.includes(UNRESTRICTED_AUDIENCE) && targeted.length > 0
      ? [`its further audiences (List 154 ${targeted.join(', ')})`]
      : []),
    ...(isWorldOnly(fact.territory) ? [] : [`its territory (${fact.territory.join('; ')})`]),
    ...(describedBy.length > 0 ? [`its source (${describedBy.join(', ')})`] : []),
    ...(fact.reviewRating.length > 0 ? ['its review rating'] : []),
    ...(fact.dates.length > 0 ? [`its dates (List 155 ${unique(fact.dates.map(({ role }) => role)).join(', ')})`] : []),
    ...(fact.sequenceNumber === null ? [] : ['its sequence number']),
    ...(fact.usageTerms.length > 0 ? ['its usage and licence terms, which set no Thoth licence'] : []),
    ...(slot === 'GENERAL_NOTE'
      ? ["its role as a publisher's notice (List 153 13), which a general note does not keep"]
      : []),
    ...(!isAbstractSlot(slot) && languages.length > 0 ? [`its language (${languages.join(', ')})`] : []),
  ];
};

const reduceTextContent = (
  context: ProductContext,
  fact: OnixTextContentFact,
  componentKind: OnixContentItemKind | null,
  candidates: OnixCollateralTextCandidate[],
) => {
  const componentPath = fact.scope.kind === 'COMPONENT' ? fact.scope.componentPath : null;
  const scope = { productKey: context.productKey, groupKey: context.groupKey, componentPath };
  const at = [locationOf(fact)];
  const where =
    componentPath === null
      ? context.describe
      : `content item ${componentPath.replace(/^.*\[(\d+)\]$/, '$1')} of ${context.describe}`;
  const typeName = `TextContent of TextType ${fact.textType}`;
  const raise = (finding: FindingInput) => {
    const raised = context.findings.add(finding);

    context.findingKeys.push(raised.key);

    return raised;
  };

  if (fact.textType.length === 0) {
    raise({
      ...scope,
      code: 'COLLATERAL_SHAPE_UNEXPECTED',
      classification: 'PREFLIGHT_GAP',
      blocking: true,
      locations: at,
      discriminator: fact.path,
      detail: { element: 'TextContent', missing: 'TextType' },
      message: `A TextContent of ${where} states no TextType, which canonical validation should have refused; it is not read`,
    });

    return;
  }

  // Review quotes and endorsements are REL-01D's (#226): kept whole in the plan, and projected by nothing here.
  if (fact.role === 'REVIEW') return;

  if (componentKind === 'AV_ITEM' || componentKind === 'UNSUPPORTED') {
    raise({
      ...scope,
      code: 'COLLATERAL_COMPONENT_NOT_PLANNED',
      classification: 'TARGET_UNREPRESENTABLE',
      blocking: false,
      locations: at,
      discriminator: fact.path,
      detail: { element: 'TextContent', textType: fact.textType, componentKind },
      message: `The ${typeName} of ${where} belongs to a content item no Work is planned from, so it is not imported; it is never moved to the parent Work`,
    });

    return;
  }

  if (fact.audiences.includes(RESTRICTED_AUDIENCE)) {
    raise({
      ...scope,
      code: 'COLLATERAL_TEXT_RESTRICTED',
      classification: 'TARGET_UNREPRESENTABLE',
      blocking: false,
      locations: at,
      discriminator: fact.path,
      detail: { textType: fact.textType, audiences: fact.audiences, redacted: ['texts'] },
      message: `A ${typeName} of ${where} is restricted to distribution by agreement (ContentAudience 01), so it is never imported into a public field; its text is not repeated here`,
    });

    return;
  }

  const slot = slotOf(fact.role);
  const chapterToc = slot === 'TABLE_OF_CONTENTS' && componentKind === 'CHAPTER';

  if (slot === null || chapterToc) {
    const reason = chapterToc
      ? 'CHAPTER_TABLE_OF_CONTENTS'
      : (UNREPRESENTED_TEXT_REASONS[fact.textType] ?? 'NO_TARGET');

    raise({
      ...scope,
      code: 'COLLATERAL_TEXT_ROLE_UNREPRESENTED',
      classification: 'TARGET_UNREPRESENTABLE',
      blocking: false,
      locations: at,
      discriminator: fact.path,
      detail: { textType: fact.textType, reason, ...(fact.redacted ? { redacted: ['texts'] } : {}) },
      message: `The ${typeName} of ${where} is not imported: ${UNREPRESENTED_TEXT_EXPLANATIONS[reason]}`,
    });

    return;
  }

  const temporal = fact.dates.filter(({ role }) => TEMPORAL_CONTROL_ROLES.has(role));

  if (temporal.length > 0) {
    raise({
      ...scope,
      code: 'COLLATERAL_TEXT_TEMPORAL_CONTROL',
      classification: 'TARGET_UNREPRESENTABLE',
      blocking: false,
      locations: [...at, ...temporal.map(locationOf)],
      discriminator: fact.path,
      detail: { textType: fact.textType, roles: unique(temporal.map(({ role }) => role)) },
      message: `The ${typeName} of ${where} states when it may be used (List 155 ${unique(temporal.map(({ role }) => role)).join(', ')}), which no Thoth field enforces, so it is not imported as the ${SLOT_NAMES[slot]}`,
    });

    return;
  }

  const audience = fact.audiences.includes(UNRESTRICTED_AUDIENCE) ? 'UNRESTRICTED' : 'TARGETED';
  let projected = false;

  fact.texts.forEach((text, index) => {
    const describe = `${SLOT_NAMES[slot]} text ${index + 1} of the ${typeName} of ${where}`;
    const normalised = normaliseText(text, slot);

    if (normalised.kind === 'empty') {
      raise({
        ...scope,
        code: 'COLLATERAL_TEXT_EMPTY',
        classification: 'SUPPORTED_WITH_WARNING',
        blocking: false,
        locations: [locationOf(text)],
        discriminator: text.path,
        detail: { textType: fact.textType },
        message: `The ${describe} holds no text, so nothing is imported for it; no text is supplied in its place`,
      });

      return;
    }

    const candidateKey = `${fact.factKey}|${text.path}`;
    const binding = fingerprint([fact.binding, text.path]);

    if (normalised.kind === 'unrepresentable') {
      const finding = raise({
        ...scope,
        code: 'COLLATERAL_TEXT_UNREPRESENTABLE',
        classification: 'TARGET_UNREPRESENTABLE',
        blocking: true,
        locations: [locationOf(text)],
        discriminator: `${text.path}|${binding}`,
        detail: { textType: fact.textType, slot, reason: normalised.reason, tags: normalised.tags },
        resolution: { kind: 'ACKNOWLEDGE' },
        message: `The ${describe} cannot be imported as it stands: ${UNREPRESENTABLE_EXPLANATIONS[normalised.reason]}${normalised.tags.length > 0 ? ` (${normalised.tags.map((tag) => `<${tag}>`).join(', ')})` : ''}. Acknowledge that it is left out`,
      });

      candidates.push({
        ...locationOf(text),
        candidateKey,
        factKey: fact.factKey,
        productKey: context.productKey,
        groupKey: context.groupKey,
        componentPath,
        slot,
        textType: fact.textType,
        audience,
        audiences: fact.audiences,
        content: null,
        markupFormat: null,
        locale: { status: 'NOT_APPLICABLE' },
        unrepresentableFindingKey: finding.key,
      });

      return;
    }

    projected = true;
    candidates.push({
      ...locationOf(text),
      candidateKey,
      factKey: fact.factKey,
      productKey: context.productKey,
      groupKey: context.groupKey,
      componentPath,
      slot,
      textType: fact.textType,
      audience,
      audiences: fact.audiences,
      content: normalised.content,
      markupFormat: normalised.format,
      locale: isAbstractSlot(slot)
        ? localeOfText(context, text, componentPath, describe, binding)
        : { status: 'NOT_APPLICABLE' },
      unrepresentableFindingKey: null,
    });
  });

  const losses = projected ? textLossesOf(fact, slot) : [];

  if (losses.length > 0) {
    raise({
      ...scope,
      code: 'COLLATERAL_TEXT_DETAIL_NOT_IMPORTED',
      classification: 'SUPPORTED_WITH_WARNING',
      blocking: false,
      locations: at,
      discriminator: fact.path,
      detail: { textType: fact.textType, slot, losses },
      message: `Imported as the ${SLOT_NAMES[slot]}, the ${typeName} of ${where} keeps its text alone; Thoth has no field there for the rest, so none of it is imported: ${losses.join('; ')}`,
    });
  }
};

/* ------------------------------------------------------------------------------------------------ */
/* SupportingResource                                                                               */
/* ------------------------------------------------------------------------------------------------ */

/**
 * The AdditionalResource type explicit ONIX semantics give one resource version (rules 113-120, 143-145): audio, image and
 * video by their modes; text as an Article only for a feature article, otherwise a Document; multi-mode as a Website only
 * where it is linkable. An application, a non-linkable multi-mode resource, several modes or none give no type: never one
 * read from a link, a filename or an extension, and never Video for a trailer merely because it is one.
 */
const resourceTypeOf = (contentType: string, modes: readonly string[], form: string): ResourceType | null => {
  if (modes.length !== 1) return null;

  switch (modes[0]) {
    case AUDIO_MODE:
      return ResourceType.Audio;
    case IMAGE_MODE:
      return ResourceType.Image;
    case VIDEO_MODE:
      return ResourceType.Video;
    case TEXT_MODE:
      return contentType === FEATURE_ARTICLE ? ResourceType.Article : ResourceType.Document;
    case MULTI_MODE:
      return form === LINKABLE_FORM ? ResourceType.Website : null;
    default:
      return null;
  }
};

/** Whether a feature note's text is one a plain Thoth field can hold as it is: stated, without markup or elements. */
const usableNote = (note: OnixCollateralStatedText): string | null =>
  !note.holdsElements && note.text !== null && note.text.length > 0 && extractTagNames(note.text).length === 0
    ? note.text
    : null;

const REASON_TEXT: Readonly<Record<OnixResourceCandidateReason, string>> = {
  AUDIENCE_TARGETED: 'it is stated only for targeted audiences, never for an unrestricted one',
  DOWNLOADABLE_FILE:
    'it is a file its sender expects a recipient to download and host, and Thoth would only link to it where it is',
  EMBEDDABLE_APPLICATION: 'it is an application to embed, which Thoth would keep only as a link, losing what it embeds',
  TYPE_UNRESOLVED:
    'its resource mode states no AdditionalResource type, so it would be typed Other, losing what kind of resource it is',
};

type ResourceCandidateDraft = OnixAdditionalResourceCandidate & { readonly fingerprint: string };

/**
 * Every AdditionalResource candidate one Work resource states - one per link of every version, none first-wins (rules 73-75,
 * 110) - and every version or link no AdditionalResource can stand for, disclosed with why (rules 23, 89, 121). Nothing about
 * the link decides its type or its title.
 */
const resourceCandidatesOf = (
  context: ProductContext,
  fact: OnixSupportingResourceFact,
  componentPath: string | null,
  where: string,
): ResourceCandidateDraft[] => {
  const scope = { productKey: context.productKey, groupKey: context.groupKey, componentPath };
  const label = ONIX_LIST_158_LABELS[fact.contentType] ?? `List 158 ${fact.contentType}`;
  const credits = fact.features.filter(({ type }) => type === REQUIRED_CREDIT);
  const creditTexts = unique(credits.flatMap(({ notes }) => notes.map(usableNote)));
  const creditsUsable = creditTexts.length === 1 && creditTexts[0] !== null;
  const captions = fact.features.filter(({ type }) => type === CAPTION);
  const captionTexts = unique(captions.flatMap(({ notes }) => notes.map(usableNote)));
  const targeted = !fact.audiences.includes(UNRESTRICTED_AUDIENCE);
  const drafts: ResourceCandidateDraft[] = [];

  fact.versions.forEach((version, versionIndex) => {
    const describeVersion = `version ${versionIndex + 1} of the ${label} resource of ${where}`;
    const temporal = version.dates.filter(({ role }) => TEMPORAL_CONTROL_ROLES.has(role));
    const exclusions = [
      ...(temporal.length > 0 ? ['TEMPORAL_CONTROL'] : []),
      ...(FORM_NAMES[version.form] === undefined ? ['FORM_UNSUPPORTED'] : []),
      ...(credits.length > 0 && !creditsUsable ? ['CREDIT_UNREPRESENTABLE'] : []),
    ];
    const excluded = (reasons: readonly string[], links: readonly OnixCollateralStatedText[]) => {
      const why = reasons.map((reason) =>
        reason === 'TEMPORAL_CONTROL'
          ? `dates limit when it may be used (List 155 ${unique(temporal.map(({ role }) => role)).join(', ')}), which no AdditionalResource enforces`
          : reason === 'FORM_UNSUPPORTED'
            ? `it states no resource form a link can stand for (List 161 ${version.form || 'none'})`
            : reason === 'CREDIT_UNREPRESENTABLE'
              ? 'it requires a credit, and not exactly one plain credit text an AdditionalResource attribution could show'
              : 'its link is not one Thoth can store',
      );

      context.findingKeys.push(
        context.findings.add({
          ...scope,
          code: 'COLLATERAL_RESOURCE_EXCLUDED',
          classification: 'TARGET_UNREPRESENTABLE',
          blocking: false,
          locations: links.map(locationOf),
          discriminator: `${version.path}|${reasons.join(',')}`,
          detail: { contentType: fact.contentType, reasons, links: links.map(({ text }) => text ?? '') },
          message: `The ${describeVersion} at ${links.map(({ text }) => text ?? '').join(', ')} is not imported as an AdditionalResource: ${why.join('; ')}`,
        }).key,
      );
    };

    if (exclusions.length > 0) {
      excluded(exclusions, version.links);

      return;
    }

    const unstorable = version.links.filter(({ text }) => text === null || !TARGET_URL.test(text));

    if (unstorable.length > 0) excluded(['URL_UNSTORABLE'], unstorable);

    const resourceType = resourceTypeOf(fact.contentType, fact.modes, version.form);
    const reasons: OnixResourceCandidateReason[] = [
      ...(targeted ? (['AUDIENCE_TARGETED'] as const) : []),
      ...(version.form === DOWNLOADABLE_FORM ? (['DOWNLOADABLE_FILE'] as const) : []),
      ...(version.form === EMBEDDABLE_FORM ? (['EMBEDDABLE_APPLICATION'] as const) : []),
      ...(resourceType === null ? (['TYPE_UNRESOLVED'] as const) : []),
    ];

    /* The one date AdditionalResource.date may take: an exact publication or broadcast day nothing competes with (28-31). */
    const intrinsic = version.dates.filter(({ role }) => INTRINSIC_DATE_ROLES.has(role));
    const days = unique(intrinsic.map(({ day }) => day));
    const date =
      intrinsic.length > 0 && unique(intrinsic.map(({ role }) => role)).length === 1 && days.length === 1
        ? days[0]
        : null;
    const visual = resourceType === ResourceType.Image || resourceType === ResourceType.Video;
    const description = visual && captionTexts.length === 1 ? captionTexts[0] : null;

    const otherFeatures = unique(
      [...fact.features]
        .filter(({ type }) => type !== REQUIRED_CREDIT && type !== CAPTION)
        .map(({ type }) => FEATURE_NAMES[type] ?? `feature ${type} (List 160)`),
    );
    const otherDates = version.dates.filter((dateFact) => !(date !== null && INTRINSIC_DATE_ROLES.has(dateFact.role)));
    const losses = [
      `its role (List 158 ${fact.contentType}, ${label}), which the AdditionalResource keeps only as its title`,
      `its form (${FORM_NAMES[version.form]})`,
      ...(fact.audiences.filter((audience) => audience !== UNRESTRICTED_AUDIENCE).length > 0
        ? [`its audiences (List 154 ${fact.audiences.join(', ')})`]
        : []),
      ...(isWorldOnly(fact.territory) ? [] : [`its territory (${fact.territory.join('; ')})`]),
      ...(fact.modes.length > 1 ? [`its resource modes (List 159 ${fact.modes.join(', ')})`] : []),
      ...otherFeatures.map((name) => `its ${name}`),
      ...(captions.length > 0 && description === null ? ['its caption'] : []),
      ...(version.features.length > 0
        ? [`its file details (List 162 ${unique(version.features.map(({ type }) => type)).join(', ')})`]
        : []),
      ...(fact.versions.length > 1 || version.links.length > 1
        ? [`its grouping with the other versions and links of the resource (${fact.versions.length} versions)`]
        : []),
      ...(version.usageTerms.length > 0 ? ['its usage and licence terms, which set no Thoth licence'] : []),
      ...(otherDates.length > 0
        ? [
            `its dates (List 155 ${unique(otherDates.map(({ role }) => role)).join(', ')})${intrinsic.length > 0 && date === null ? ', none of which is exactly one publication or broadcast day the AdditionalResource date can take' : ''}`,
          ]
        : []),
      ...(fact.sequenceNumber === null ? [] : ['its sequence number']),
    ];

    version.links
      .filter((link) => !unstorable.includes(link))
      .forEach((link) => {
        const target: OnixAdditionalResourceTarget = {
          title: label,
          description,
          attribution: creditsUsable ? creditTexts[0] : null,
          resourceType,
          url: link.text as string,
          date,
        };
        const semantic = fingerprint([
          fact.contentType,
          [...fact.audiences].sort(),
          fact.modes,
          version.form,
          target.url,
          fact.features.map(({ type, value, notes }) => [
            type,
            value,
            notes.map(({ text, language }) => [text, language]),
          ]),
          version.features.map(({ type, value }) => [type, value]),
          version.dates.map(({ role, format, value }) => [role, format, value]),
        ]);

        drafts.push({
          candidateKey: `${componentPath === null ? context.groupKey : `${context.productKey}|${componentPath}`}|${semantic}`,
          fingerprint: semantic,
          groupKey: context.groupKey,
          componentPath,
          productKeys: [context.productKey],
          factKeys: [fact.factKey],
          contentType: fact.contentType,
          modes: fact.modes,
          form: version.form,
          audiences: fact.audiences,
          target,
          reasons,
          decisionFindingKey: null,
          losses,
          locations: [locationOf(link)],
        });
      });
  });

  return drafts;
};

/**
 * One candidate per semantic fingerprint (rules 75-76, 155, 158): statements of exactly the same resource - repeated, or in
 * grouped Products - are one AdditionalResource, with every statement kept as its provenance; any difference keeps them apart.
 * Each gets its decision, where it needs one, and the disclosure of what it cannot keep.
 */
const collapseResourceCandidates = (
  drafts: readonly ResourceCandidateDraft[],
  scope: { readonly productKey: string | null; readonly groupKey: string; readonly componentPath: string | null },
  findings: CollateralFindings,
  describe: string,
): OnixAdditionalResourceCandidate[] => {
  const byFingerprint = new Map<string, ResourceCandidateDraft>();

  drafts.forEach((draft) => {
    const existing = byFingerprint.get(draft.fingerprint);

    byFingerprint.set(
      draft.fingerprint,
      existing === undefined
        ? draft
        : {
            ...existing,
            productKeys: unique([...existing.productKeys, ...draft.productKeys]),
            factKeys: unique([...existing.factKeys, ...draft.factKeys]),
            losses: unique([...existing.losses, ...draft.losses]),
            locations: [...existing.locations, ...draft.locations],
          },
    );
  });

  return [...byFingerprint.values()].map(({ fingerprint: semantic, ...candidate }) => {
    const { target } = candidate;
    const label = `${target.title} at ${target.url}`;

    if (candidate.locations.length > 1) {
      findings.add({
        ...scope,
        code: 'COLLATERAL_RESOURCE_COLLAPSED',
        classification: 'SUPPORTED_NORMALIZED',
        blocking: false,
        locations: candidate.locations,
        discriminator: semantic,
        detail: { url: target.url, statements: candidate.locations.length },
        message: `The ${label} is stated ${candidate.locations.length} times exactly alike in ${describe}, so it is one AdditionalResource`,
      });
    }

    if (candidate.losses.length > 0) {
      findings.add({
        ...scope,
        code: 'COLLATERAL_RESOURCE_DETAIL_NOT_IMPORTED',
        classification: 'SUPPORTED_WITH_WARNING',
        blocking: false,
        locations: candidate.locations,
        discriminator: semantic,
        detail: { url: target.url, contentType: candidate.contentType, losses: candidate.losses },
        message: `As an AdditionalResource, the ${label} keeps its link${target.date === null ? '' : ', its date'}${target.attribution === null ? '' : ', its credit'}${target.description === null ? '' : ', its caption as its description'} and a title from its role; Thoth has no field there for the rest, so none of it is imported: ${candidate.losses.join('; ')}`,
      });
    }

    if (candidate.reasons.length === 0) return candidate;

    const type = target.resourceType ?? ResourceType.Other;
    const decision = findings.add({
      ...scope,
      code: 'COLLATERAL_RESOURCE_DECISION_REQUIRED',
      classification: 'TARGET_INPUT_REQUIRED',
      blocking: true,
      locations: candidate.locations,
      discriminator: semantic,
      detail: {
        url: target.url,
        contentType: candidate.contentType,
        reasons: candidate.reasons,
        resourceType: type,
        audiences: candidate.audiences,
        form: candidate.form,
      },
      resolution: {
        kind: 'CHOICE',
        options: [
          { key: ONIX_COLLATERAL_PROJECT, label: type },
          { key: ONIX_COLLATERAL_OMIT, label: ONIX_COLLATERAL_OMIT },
        ],
      },
      message: `The ${label} in ${describe} is an AdditionalResource only by your decision: ${candidate.reasons.map((reason) => REASON_TEXT[reason]).join('; ')}. Import it as a ${type} AdditionalResource linking to where it is - nothing is downloaded, copied or hosted - or leave it out`,
    });

    return { ...candidate, decisionFindingKey: decision.key };
  });
};

const reduceResource = (
  context: ProductContext,
  fact: OnixSupportingResourceFact,
  componentKind: OnixContentItemKind | null,
  workDrafts: ResourceCandidateDraft[],
  componentDrafts: Map<string, ResourceCandidateDraft[]>,
) => {
  const componentPath = fact.scope.kind === 'COMPONENT' ? fact.scope.componentPath : null;
  const scope = { productKey: context.productKey, groupKey: context.groupKey, componentPath };
  const where =
    componentPath === null
      ? context.describe
      : `content item ${componentPath.replace(/^.*\[(\d+)\]$/, '$1')} of ${context.describe}`;
  const label = ONIX_LIST_158_LABELS[fact.contentType] ?? `List 158 ${fact.contentType}`;
  const links = fact.versions.flatMap(({ links: versionLinks }) => versionLinks);
  const raise = (finding: FindingInput) => context.findingKeys.push(context.findings.add(finding).key);
  const at = [locationOf(fact)];

  if (fact.contentType.length === 0 || fact.versions.length === 0) {
    raise({
      ...scope,
      code: 'COLLATERAL_SHAPE_UNEXPECTED',
      classification: 'PREFLIGHT_GAP',
      blocking: true,
      locations: at,
      discriminator: fact.path,
      detail: {
        element: 'SupportingResource',
        missing: fact.contentType.length === 0 ? 'ResourceContentType' : 'ResourceVersion',
      },
      message: `A SupportingResource of ${where} states no ${fact.contentType.length === 0 ? 'ResourceContentType' : 'ResourceVersion'}, which canonical validation should have refused; it is not read`,
    });

    return;
  }

  // The front cover of a Product is the descriptive cover reducer's alone (thoth-app#219): nothing is decided about it here.
  if (fact.scope.kind === 'PRODUCT' && fact.role === 'FRONT_COVER') return;

  if (componentKind === 'AV_ITEM' || componentKind === 'UNSUPPORTED') {
    raise({
      ...scope,
      code: 'COLLATERAL_COMPONENT_NOT_PLANNED',
      classification: 'TARGET_UNREPRESENTABLE',
      blocking: false,
      locations: at,
      discriminator: fact.path,
      detail: { element: 'SupportingResource', contentType: fact.contentType, componentKind },
      message: `The ${label} resource of ${where} belongs to a content item no Work is planned from, so it is not imported; it is never moved to the parent Work`,
    });

    return;
  }

  if (fact.audiences.includes(RESTRICTED_AUDIENCE)) {
    raise({
      ...scope,
      code: 'COLLATERAL_RESOURCE_RESTRICTED',
      classification: 'TARGET_UNREPRESENTABLE',
      blocking: false,
      locations: at,
      discriminator: fact.path,
      detail: { contentType: fact.contentType, audiences: fact.audiences, redacted: ['links', 'features'] },
      message: `A ${label} resource of ${where} is restricted to distribution by agreement (ContentAudience 01), so it is never imported as a public AdditionalResource; neither its links nor its features are repeated here`,
    });

    return;
  }

  const unrepresented = (reason: string) =>
    raise({
      ...scope,
      code: 'COLLATERAL_RESOURCE_ROLE_UNREPRESENTED',
      classification: 'TARGET_UNREPRESENTABLE',
      blocking: false,
      locations: at,
      discriminator: fact.path,
      detail: {
        contentType: fact.contentType,
        reason,
        ...(fact.redacted ? { redacted: ['links', 'features'] } : { links: links.map(({ text }) => text ?? '') }),
      },
      message: `The ${label} resource of ${where}${fact.redacted ? '' : ` at ${links.map(({ text }) => text ?? '').join(', ')}`} is not imported: ${ROLE_EXPLANATIONS[reason]}`,
    });

  if (componentKind === 'CHAPTER') {
    unrepresented('CHAPTER');

    return;
  }

  switch (fact.role) {
    case 'FRONT_COVER':
      unrepresented('COMPONENT_COVER');

      return;
    case 'NOT_WORK_SCOPED':
    case 'REVIEW_COPY':
    case 'PRODUCT_SAFETY':
    case 'LICENCE':
      unrepresented(fact.role);

      return;
    case 'NOT_PROJECTED':
      unrepresented('NO_APPROVED_PROJECTION');

      return;
    case 'FULL_CONTENT':
      raise({
        ...scope,
        code: 'COLLATERAL_RESOURCE_FULL_CONTENT',
        classification: 'TARGET_INPUT_REQUIRED',
        blocking: true,
        locations: at,
        discriminator: `${fact.path}|${fact.binding}`,
        detail: { contentType: fact.contentType, links: links.map(({ text }) => text ?? '') },
        resolution: { kind: 'ACKNOWLEDGE' },
        message: `The full content of ${where} at ${links.map(({ text }) => text ?? '').join(', ')} is the product itself, not a Work resource: it never becomes an AdditionalResource or a Publication location by its link. Acknowledge that it is not imported`,
      });

      return;
    case 'WORK_RESOURCE':
      break;
  }

  const drafts = resourceCandidatesOf(context, fact, componentPath, where);

  if (componentPath === null) workDrafts.push(...drafts);
  else componentDrafts.set(componentPath, [...(componentDrafts.get(componentPath) ?? []), ...drafts]);
};

/* ------------------------------------------------------------------------------------------------ */
/* PromotionDetail                                                                                  */
/* ------------------------------------------------------------------------------------------------ */

const PARTICIPANT_ELEMENTS = ['Contributor', 'ContributorReference', 'ContributorStatement', 'NoContributor'] as const;
const VENUE_ELEMENTS = [
  'CountryCode',
  'RegionCode',
  'LocationName',
  'VenueName',
  'StreetAddress',
  'PostalCode',
  'VenueNote',
] as const;

/* ------------------------------------------------------------------------------------------------ */
/* The reduction                                                                                    */
/* ------------------------------------------------------------------------------------------------ */

const describeRecord = (index: number, recordReference: string | null) =>
  recordReference === null ? `product ${index}` : `product ${index} (${recordReference})`;

export const reduceOnixCollateral = (
  root: ExtendedONIXMessageRoot,
  sourcePlan: OnixSourcePlan,
  options: ReduceOnixCollateralOptions = {},
): OnixCollateralPlan => {
  const locate: Locate = (path) => ({ path, sourcePath: options.provenance?.sourcePathOf(path) ?? path });
  const findings = new CollateralFindings();
  const productValues = toOnixArray(root.ONIXMessage?.Product);
  const recordByKey = new Map(sourcePlan.records.map((record) => [record.recordKey, record]));
  const omissions = (options.recoveries ?? []).flatMap((marker) =>
    marker.recovery === 'OMIT_INVALID_COMPOSITE' ? [marker] : [],
  );
  const products: Record<string, OnixProductCollateral> = {};
  const workDraftsByGroup = new Map<string, ResourceCandidateDraft[]>();
  const describeByProduct = new Map<string, string>();

  [...sourcePlan.products]
    .map((node) => ({ node, record: recordByKey.get(node.representativeRecordKey) }))
    .filter(
      (entry): entry is { node: (typeof sourcePlan.products)[number]; record: NonNullable<typeof entry.record> } =>
        entry.record !== undefined,
    )
    .sort((a, b) => a.record.index - b.record.index)
    .forEach(({ node, record }) => {
      const recordOccurrence: Occurrence = { value: productValues[record.index - 1], path: record.path };
      const context: ProductContext = {
        productKey: node.productKey,
        groupKey: node.groupKey,
        describe: describeRecord(record.index, record.recordReference),
        locate,
        findings,
        findingKeys: [],
        descriptive: options.descriptive,
      };

      describeByProduct.set(node.productKey, context.describe);

      const componentKinds = new Map(node.contentItems.map(({ path, kind }) => [path, kind]));
      const textContents: OnixTextContentFact[] = [];
      const resources: OnixSupportingResourceFact[] = [];
      const events: OnixPromotionalEventFact[] = [];
      const read = (parent: Occurrence, scope: OnixCollateralScope) => {
        children(parent, 'TextContent').forEach((occurrence, index) =>
          textContents.push(textContentFactOf(context, occurrence, scope, index + 1)),
        );
        children(parent, 'SupportingResource').forEach((occurrence, index) =>
          resources.push(resourceFactOf(context, occurrence, scope, index + 1)),
        );
      };

      children(recordOccurrence, 'CollateralDetail').forEach((collateral) => read(collateral, { kind: 'PRODUCT' }));
      children(recordOccurrence, 'ContentDetail').forEach((detail) =>
        children(detail, 'ContentItem').forEach((item) =>
          read(item, {
            kind: 'COMPONENT',
            componentPath: item.path,
            componentKind: componentKinds.get(item.path) ?? 'UNSUPPORTED',
          }),
        ),
      );
      children(recordOccurrence, 'PromotionDetail').forEach((promotion) =>
        children(promotion, 'PromotionalEvent').forEach((event) => {
          const resourceKeysOf = (parent: Occurrence, occurrencePath: string | null) =>
            children(parent, 'SupportingResource').map((occurrence, index) => {
              const fact = resourceFactOf(
                context,
                occurrence,
                { kind: 'PROMOTIONAL_EVENT', eventPath: event.path, occurrencePath },
                index + 1,
              );

              resources.push(fact);

              return fact.factKey;
            });
          const paths = (parent: Occurrence, names: readonly string[]) =>
            names.flatMap((name) => children(parent, name).map(({ path }) => locate(path)));
          const occurrences = children(event, 'EventOccurrence').map(
            (occurrence): OnixPromotionalEventOccurrenceFact => ({
              ...locate(occurrence.path),
              status: nullIfEmpty(childText(occurrence, 'EventStatus')),
              dates: paths(occurrence, ['OccurrenceDate']),
              venue: paths(occurrence, VENUE_ELEMENTS),
              descriptions: paths(occurrence, ['EventDescription']),
              sponsors: paths(occurrence, ['EventSponsor']),
              websites: paths(occurrence, ['Website']),
              resourceFactKeys: resourceKeysOf(occurrence, occurrence.path),
            }),
          );

          events.push({
            ...locate(event.path),
            factKey: `${node.productKey}|${event.path}`,
            productKey: node.productKey,
            groupKey: node.groupKey,
            eventTypes: childTexts(event, 'EventType'),
            status: nullIfEmpty(childText(event, 'EventStatus')),
            audiences: childTexts(event, 'ContentAudience'),
            names: paths(event, ['EventName']),
            identifiers: paths(event, ['EventIdentifier']),
            participants: paths(event, PARTICIPANT_ELEMENTS),
            descriptions: paths(event, ['EventDescription']),
            occurrences,
            sponsors: paths(event, ['EventSponsor']),
            websites: paths(event, ['Website']),
            resourceFactKeys: resourceKeysOf(event, null),
          });
        }),
      );

      /* What each fact is to its target, in source order. */
      const textCandidates: OnixCollateralTextCandidate[] = [];
      const workDrafts: ResourceCandidateDraft[] = [];
      const componentDrafts = new Map<string, ResourceCandidateDraft[]>();
      const kindOf = (scope: OnixCollateralScope) => (scope.kind === 'COMPONENT' ? scope.componentKind : null);

      textContents.forEach((fact) => reduceTextContent(context, fact, kindOf(fact.scope), textCandidates));
      resources
        .filter(({ scope }) => scope.kind !== 'PROMOTIONAL_EVENT')
        .forEach((fact) => reduceResource(context, fact, kindOf(fact.scope), workDrafts, componentDrafts));

      // Promotional events: what Thoth cannot represent, said together, with every path kept (5541009506 rules 2-5, 14).
      if (events.length > 0) {
        const eventResources = resources.filter(({ scope }) => scope.kind === 'PROMOTIONAL_EVENT');

        context.findingKeys.push(
          findings.add({
            productKey: node.productKey,
            groupKey: node.groupKey,
            componentPath: null,
            code: 'COLLATERAL_PROMOTIONAL_EVENT_UNREPRESENTABLE',
            classification: 'TARGET_UNREPRESENTABLE',
            blocking: false,
            locations: [...events.map(locationOf), ...eventResources.map(locationOf)],
            discriminator: 'events',
            detail: {
              events: events.length,
              occurrences: events.reduce((total, { occurrences }) => total + occurrences.length, 0),
              participants: events.reduce((total, { participants }) => total + participants.length, 0),
              resources: eventResources.length,
            },
            message: `${context.describe} states ${events.length} promotional event${events.length === 1 ? '' : 's'}, which Thoth cannot represent: no event name, date, venue, description or website becomes a Work field, no event participant becomes a Work contributor, and none of ${eventResources.length === 1 ? 'its resource' : `its ${eventResources.length} resources`} becomes a Work resource`,
          }).key,
        );
      }

      const componentResourceCandidates = Object.fromEntries(
        [...componentDrafts].map(([path, drafts]) => [
          path,
          collapseResourceCandidates(
            drafts,
            { productKey: node.productKey, groupKey: node.groupKey, componentPath: path },
            findings,
            `content item ${path.replace(/^.*\[(\d+)\]$/, '$1')} of ${context.describe}`,
          ),
        ]),
      );

      workDraftsByGroup.set(node.groupKey, [...(workDraftsByGroup.get(node.groupKey) ?? []), ...workDrafts]);

      const recordPaths = new Set(
        node.recordKeys.flatMap((recordKey) => {
          const path = recordByKey.get(recordKey)?.path;

          return path === undefined ? [] : [path];
        }),
      );

      products[node.productKey] = {
        productKey: node.productKey,
        groupKey: node.groupKey,
        textContents,
        resources,
        events,
        omissions: omissions
          .filter(({ removed }) => [...recordPaths].some((path) => removed.startsWith(`${path}/`)))
          .map(
            (marker): OnixCollateralRecoveredOmission => ({
              ...locate(marker.removed),
              productKey: node.productKey,
              groupKey: node.groupKey,
              recovery: marker.recovery,
              taintSite: marker.taintSite,
            }),
          ),
        textCandidates,
        componentResourceCandidates,
        findingKeys: context.findingKeys,
      };
    });

  /* The Work resources of each group, reconciled across its Products (rules 153-158). */
  const workResourceCandidates = Object.fromEntries(
    sourcePlan.groups.map(({ groupKey, productKeys }) => [
      groupKey,
      collapseResourceCandidates(
        workDraftsByGroup.get(groupKey) ?? [],
        { productKey: null, groupKey, componentPath: null },
        findings,
        productKeys.length > 1
          ? `the Work of ${productKeys.length} grouped products`
          : (describeByProduct.get(productKeys[0]) ?? 'its product'),
      ),
    ]),
  );

  return { products, workResourceCandidates, findings: findings.all() };
};

/* ------------------------------------------------------------------------------------------------ */
/* Resolution                                                                                       */
/* ------------------------------------------------------------------------------------------------ */

type ChoiceMap = Readonly<Record<string, string>>;

export type ResolveOnixCollateralOptions = {
  readonly choices?: ChoiceMap;
  /** The locale of the scope's canonical title, where one is resolved: what one canonical abstract may follow (rule 43). */
  readonly canonicalTitleLocale: string | null;
  /** How the scope is named in a finding the answers raise. */
  readonly describe: string;
};

/** The collateral one Work, chapter or contained Work gets with the publisher's answers. */
export type OnixResolvedCollateral = {
  readonly abstracts: readonly OnixPlannedAbstract[];
  readonly tableOfContents: OnixPlannedCollateralText | null;
  readonly generalNote: OnixPlannedCollateralText | null;
  readonly resources: readonly OnixAdditionalResourceIntent[];
  /** Every finding that applies to the scope - the reduction's and those only the answers raised - answered or not. */
  readonly findingKeys: readonly string[];
  /** Blocking findings still unanswered, or answered with a value the plan cannot use, in a stable order. */
  readonly pendingFindingKeys: readonly string[];
  /** Findings only the answers raised: a one-value target several texts compete for, a canonical choice, a deferral. */
  readonly raised: readonly OnixCollateralFinding[];
};

/** A plan's findings by key, built once per plan: resolution runs again for every decision. */
const indexes = new WeakMap<OnixCollateralPlan, ReadonlyMap<string, OnixCollateralFinding>>();

const findingIndexOf = (plan: OnixCollateralPlan): ReadonlyMap<string, OnixCollateralFinding> => {
  const cached = indexes.get(plan);

  if (cached !== undefined) return cached;

  const index = new Map(plan.findings.map((finding) => [finding.key, finding]));

  indexes.set(plan, index);

  return index;
};

/** The answer to a finding, when it is one the finding offers; null when unanswered or answered with anything else. */
const answerOf = (finding: OnixCollateralFinding | undefined, choices: ChoiceMap): string | null => {
  if (finding === undefined) return null;

  const answer = choices[finding.key];

  return answer !== undefined && isOfferedOnixCollateralAnswer(finding, answer) ? answer : null;
};

type ScopeInput = {
  readonly groupKey: string;
  readonly productKey: string | null;
  readonly componentPath: string | null;
  readonly textCandidates: readonly OnixCollateralTextCandidate[];
  readonly resourceCandidates: readonly OnixAdditionalResourceCandidate[];
  readonly findingKeys: readonly string[];
};

const ABSTRACT_TYPES: Readonly<Record<'SHORT_ABSTRACT' | 'LONG_ABSTRACT', AbstractType>> = {
  SHORT_ABSTRACT: AbstractType.Short,
  LONG_ABSTRACT: AbstractType.Long,
};

type Located = { readonly candidate: OnixCollateralTextCandidate; readonly localeCode: string | null };

/**
 * What one scope's collateral comes to with the publisher's answers (rules 13-69, 109-146, 153-162): every one-value target
 * filled by the one text its candidates state - equal statements collapsed, an unrestricted text preferred to targeted ones,
 * distinct ones the publisher's choice, never the first - each abstract type's canonical flag decided, and an
 * AdditionalResource intent for every Work resource the source or the publisher projects, each waiting on #187.
 */
const resolveScope = (
  plan: OnixCollateralPlan,
  input: ScopeInput,
  options: ResolveOnixCollateralOptions,
): OnixResolvedCollateral => {
  const choices = options.choices ?? {};
  const byKey = findingIndexOf(plan);
  const findings = new CollateralFindings();
  const pending: string[] = [];
  const scope = { productKey: input.productKey, groupKey: input.groupKey, componentPath: input.componentPath };
  const scopeKey = [input.groupKey, input.productKey ?? '', input.componentPath ?? ''].join('|');
  const wait = (key: string) => {
    if (!pending.includes(key)) pending.push(key);
  };

  /* Every candidate text, with its locale where its target has one; one the target cannot hold waits on its acknowledgement. */
  const located: Located[] = [];
  const unlocatedSlots = new Set<OnixCollateralTextSlot>();

  input.textCandidates.forEach((candidate) => {
    if (candidate.unrepresentableFindingKey !== null) {
      if (answerOf(byKey.get(candidate.unrepresentableFindingKey), choices) === null) {
        wait(candidate.unrepresentableFindingKey);
      }

      return;
    }

    if (candidate.locale.status === 'NOT_APPLICABLE') {
      located.push({ candidate, localeCode: null });

      return;
    }

    if (candidate.locale.status === 'RESOLVED') {
      located.push({ candidate, localeCode: candidate.locale.localeCode });

      return;
    }

    const answer = answerOf(byKey.get(candidate.locale.findingKey), choices);

    if (answer === null) {
      wait(candidate.locale.findingKey);
      unlocatedSlots.add(candidate.slot);

      return;
    }

    located.push({ candidate, localeCode: answer });
  });

  /* One value per target: its slot, and for an abstract its locale (rules 18-20, 33-38, 50, 53-54, 157). */
  const buckets = new Map<string, Located[]>();

  located.forEach((entry) => {
    const bucket = `${entry.candidate.slot}|${entry.localeCode ?? ''}`;

    buckets.set(bucket, [...(buckets.get(bucket) ?? []), entry]);
  });

  type Filled = {
    readonly slot: OnixCollateralTextSlot;
    readonly localeCode: string | null;
    readonly content: string;
    readonly markupFormat: ImportedMarkupFormat;
    readonly from: readonly OnixCollateralTextCandidate[];
  };

  const filled: Filled[] = [];

  [...buckets.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .forEach(([bucket, entries]) => {
      const [slot] = bucket.split('|') as [OnixCollateralTextSlot];
      const { localeCode } = entries[0];
      const unrestricted = entries.filter(({ candidate }) => candidate.audience === 'UNRESTRICTED');
      const pool = (unrestricted.length > 0 ? unrestricted : entries).map(({ candidate }) => candidate);
      const targeted = entries
        .filter(({ candidate }) => candidate.audience === 'TARGETED')
        .map(({ candidate }) => candidate);
      const distinct = new Map<string, OnixCollateralTextCandidate[]>();
      const target = `${SLOT_NAMES[slot]}${localeCode === null ? '' : ` in ${localeCode}`}`;

      pool.forEach((candidate) => {
        const content = `C${fingerprint([candidate.content, candidate.markupFormat])}`;

        distinct.set(content, [...(distinct.get(content) ?? []), candidate]);
      });

      if (unrestricted.length > 0 && targeted.length > 0) {
        findings.add({
          ...scope,
          code: 'COLLATERAL_TEXT_TARGETED_NOT_IMPORTED',
          classification: 'TARGET_UNREPRESENTABLE',
          blocking: false,
          locations: targeted.map(locationOf),
          discriminator: `${bucket}|${fingerprint(targeted.map(({ candidateKey }) => candidateKey))}`,
          detail: { slot, localeCode: localeCode ?? '' },
          message: `The ${target} of ${options.describe} is taken from text stated for everyone, so ${targeted.length === 1 ? 'a variant' : `${targeted.length} variants`} stated only for targeted audiences ${targeted.length === 1 ? 'is' : 'are'} not imported`,
        });
      }

      const fill = (from: readonly OnixCollateralTextCandidate[]) =>
        filled.push({
          slot,
          localeCode,
          content: from[0].content as string,
          markupFormat: from[0].markupFormat as ImportedMarkupFormat,
          from,
        });

      if (distinct.size === 1 && unrestricted.length > 0) {
        const from = pool;
        const textTypes = unique(from.map(({ textType }) => textType));

        if (from.length > 1) {
          findings.add({
            ...scope,
            code: 'COLLATERAL_TEXT_COLLAPSED',
            classification: 'SUPPORTED_NORMALIZED',
            blocking: false,
            locations: from.map(locationOf),
            discriminator: `${bucket}|${fingerprint(from.map(({ candidateKey }) => candidateKey))}`,
            detail: { slot, localeCode: localeCode ?? '', textTypes },
            message: `${from.length} statements of the ${target} of ${options.describe} (TextType ${textTypes.join(', ')}) are the same text, so it is imported once`,
          });
        }

        if (slot === 'LONG_ABSTRACT' && !textTypes.includes(ABSTRACT_TEXT_TYPE)) {
          findings.add({
            ...scope,
            code: 'COLLATERAL_TEXT_DESCRIPTION_NORMALISED',
            classification: 'SUPPORTED_NORMALIZED',
            blocking: false,
            locations: from.map(locationOf),
            discriminator: `${bucket}|${fingerprint(from.map(({ candidateKey }) => candidateKey))}`,
            detail: { localeCode: localeCode ?? '' },
            message: `The description (TextType ${DESCRIPTION_TEXT_TYPE}) of ${options.describe} is imported as its long abstract in ${localeCode}, as no formal abstract (TextType ${ABSTRACT_TEXT_TYPE}) competes with it`,
          });
        }

        fill(from);

        return;
      }

      // Distinct texts for one value, or only targeted ones: the publisher's choice, or none (rules 19, 36-37, 50, 54).
      const code =
        slot === 'TABLE_OF_CONTENTS'
          ? 'COLLATERAL_TOC_CHOICE_REQUIRED'
          : slot === 'GENERAL_NOTE'
            ? 'COLLATERAL_GENERAL_NOTE_CHOICE_REQUIRED'
            : 'COLLATERAL_ABSTRACT_CHOICE_REQUIRED';
      const options_ = [...distinct.entries()].map(([key, from]) => ({
        key,
        label: `TextType ${unique(from.map(({ textType }) => textType)).join(', ')}: ${excerpt(from[0].content as string)}`,
      }));
      const finding = findings.add({
        ...scope,
        code,
        classification: 'TARGET_INPUT_REQUIRED',
        blocking: true,
        locations: pool.map(locationOf),
        discriminator: `${bucket}|${fingerprint([...distinct.entries()].map(([key, from]) => [key, from.map(({ candidateKey }) => candidateKey)]))}`,
        detail: {
          slot,
          localeCode: localeCode ?? '',
          audience: unrestricted.length > 0 ? 'UNRESTRICTED' : 'TARGETED_ONLY',
          textTypes: unique(pool.map(({ textType }) => textType)),
        },
        resolution: {
          kind: 'CHOICE',
          options: [...options_, { key: ONIX_COLLATERAL_OMIT, label: ONIX_COLLATERAL_OMIT }],
        },
        message:
          unrestricted.length > 0
            ? `${options.describe} states ${distinct.size} different texts for its ${target}, and Thoth holds one; choose the one to import, or import none`
            : `${options.describe} states its ${target} only for targeted audiences (ContentAudience ${unique(pool.flatMap(({ audiences }) => audiences)).join(', ')}${pool.some(({ audiences }) => audiences.includes(SEARCH_INDEX_AUDIENCE)) ? `; ${SEARCH_INDEX_AUDIENCE} is a search engine index, not text for display` : ''}), never for everyone; import it for everyone only by choosing it, or import none`,
      });
      const answer = answerOf(finding, choices);

      if (answer === null) {
        wait(finding.key);

        return;
      }

      if (answer !== ONIX_COLLATERAL_OMIT) fill(distinct.get(answer) as OnixCollateralTextCandidate[]);
    });

  /* Each abstract type's canonical flag: one abstract, the canonical title's one locale, or the publisher's (rules 41-43). */
  const abstracts: OnixPlannedAbstract[] = [];

  (['SHORT_ABSTRACT', 'LONG_ABSTRACT'] as const).forEach((slot) => {
    const rows = filled.filter((entry) => entry.slot === slot);

    if (rows.length === 0) return;

    let canonicalLocale: string | null = null;
    let canonicalBasis: OnixPlannedAbstract['canonicalBasis'] = null;

    if (rows.length === 1) {
      canonicalLocale = rows[0].localeCode;
      canonicalBasis = 'SINGLE';
    } else if (!unlocatedSlots.has(slot)) {
      const matching = rows.filter(({ localeCode }) => localeCode === options.canonicalTitleLocale);

      if (matching.length === 1) {
        canonicalLocale = matching[0].localeCode;
        canonicalBasis = 'TITLE_LOCALE';
      } else {
        const locales = rows.map(({ localeCode }) => localeCode as string);
        const finding = findings.add({
          ...scope,
          code: 'COLLATERAL_ABSTRACT_CANONICAL_REQUIRED',
          classification: 'TARGET_INPUT_REQUIRED',
          blocking: true,
          locations: rows.flatMap(({ from }) => from.map(locationOf)),
          discriminator: `${slot}|${fingerprint(rows.map(({ localeCode, content }) => [localeCode, content]))}`,
          detail: { slot, locales },
          resolution: { kind: 'CHOICE', options: locales.map((locale) => ({ key: locale, label: locale })) },
          message: `${options.describe} has ${SLOT_NAMES[slot]}s in ${rows.length} locales (${locales.join(', ')}), and nothing establishes which is canonical; choose it`,
        });
        const answer = answerOf(finding, choices);

        if (answer === null) wait(finding.key);
        else {
          canonicalLocale = answer;
          canonicalBasis = 'PUBLISHER_CHOICE';
        }
      }
    }

    rows.forEach(({ localeCode, content, markupFormat, from }) =>
      abstracts.push({
        type: ABSTRACT_TYPES[slot],
        localeCode: localeCode as string,
        content,
        markupFormat,
        canonical: canonicalBasis !== null && localeCode === canonicalLocale,
        canonicalBasis: canonicalBasis !== null && localeCode === canonicalLocale ? canonicalBasis : null,
        textTypes: unique(from.map(({ textType }) => textType)),
        candidateKeys: from.map(({ candidateKey }) => candidateKey),
        locations: from.map(locationOf),
      }),
    );
  });

  const plainTextOf = (slot: OnixCollateralTextSlot): OnixPlannedCollateralText | null => {
    const entry = filled.find((candidate) => candidate.slot === slot);

    return entry === undefined
      ? null
      : {
          content: entry.content,
          textTypes: unique(entry.from.map(({ textType }) => textType)),
          candidateKeys: entry.from.map(({ candidateKey }) => candidateKey),
          locations: entry.from.map(locationOf),
        };
  };

  /* AdditionalResources: every candidate the source or the publisher projects, each waiting on #187 (rules 169-172). */
  const resources: OnixAdditionalResourceIntent[] = [];

  input.resourceCandidates.forEach((candidate) => {
    let basis: OnixAdditionalResourceIntent['basis'] = 'AUTOMATIC';

    if (candidate.decisionFindingKey !== null) {
      const answer = answerOf(byKey.get(candidate.decisionFindingKey), choices);

      if (answer === null) {
        wait(candidate.decisionFindingKey);

        return;
      }

      if (answer === ONIX_COLLATERAL_OMIT) return;

      basis = 'PUBLISHER_DECISION';
    }

    const resourceType = candidate.target.resourceType ?? ResourceType.Other;
    const deferred = findings.add({
      ...scope,
      code: 'COLLATERAL_RESOURCE_EXECUTION_DEFERRED',
      classification: 'EXECUTION_DEFERRED',
      blocking: true,
      locations: candidate.locations,
      discriminator: candidate.candidateKey,
      detail: { url: candidate.target.url, resourceType, title: candidate.target.title },
      message: `The ${candidate.target.title} of ${options.describe} at ${candidate.target.url} is planned as a ${resourceType} AdditionalResource, which this import cannot create yet: nothing is dropped to let it run`,
    });

    wait(deferred.key);
    resources.push({
      intentKey: `${scopeKey}|${candidate.candidateKey}`,
      candidateKey: candidate.candidateKey,
      groupKey: input.groupKey,
      componentPath: input.componentPath,
      target: { ...candidate.target, resourceType },
      resourceOrdinal: resources.length + 1,
      basis,
      losses: candidate.losses,
      locations: candidate.locations,
      findingKey: deferred.key,
      action: 'EXECUTION_DEFERRED',
    });
  });

  const raised = findings.all();
  const reductionKeys = input.findingKeys.filter((key) => byKey.has(key));

  // Every other blocking finding of the scope waits on its own answer.
  reductionKeys.forEach((key) => {
    const finding = byKey.get(key) as OnixCollateralFinding;

    if (finding.blocking && answerOf(finding, choices) === null) wait(key);
  });

  return {
    abstracts,
    tableOfContents: plainTextOf('TABLE_OF_CONTENTS'),
    generalNote: plainTextOf('GENERAL_NOTE'),
    resources,
    findingKeys: unique([...reductionKeys, ...raised.map(({ key }) => key)]),
    pendingFindingKeys: pending,
    raised,
  };
};

/**
 * The collateral a new Work gets (thoth-app#225): every Product-level text and resource of every grouped Product, reconciled
 * for the one Work (rules 153-158), and every finding about them - with those about the representative Product's components
 * no Work is planned from, which are disclosed with the Work.
 */
export const resolveOnixCollateralWork = (
  plan: OnixCollateralPlan,
  groupKey: string,
  productKeys: readonly string[],
  options: ResolveOnixCollateralOptions,
): OnixResolvedCollateral => {
  const byKey = findingIndexOf(plan);
  const members = productKeys.flatMap((productKey) => plan.products[productKey] ?? []);
  const [representative] = members;
  const unplanned = new Set(
    (representative?.textContents ?? [])
      .map(({ scope }) => scope)
      .concat((representative?.resources ?? []).map(({ scope }) => scope))
      .flatMap((scope) =>
        scope.kind === 'COMPONENT' && (scope.componentKind === 'AV_ITEM' || scope.componentKind === 'UNSUPPORTED')
          ? [scope.componentPath]
          : [],
      ),
  );
  const findingKeys = [
    ...members.flatMap(({ productKey, findingKeys: keys }) =>
      keys.filter((key) => {
        const finding = byKey.get(key);

        return (
          finding !== undefined &&
          (finding.componentPath === null ||
            (productKey === representative?.productKey && unplanned.has(finding.componentPath)))
        );
      }),
    ),
    ...plan.findings
      .filter(
        (finding) => finding.productKey === null && finding.groupKey === groupKey && finding.componentPath === null,
      )
      .map(({ key }) => key),
  ];

  return resolveScope(
    plan,
    {
      groupKey,
      productKey: null,
      componentPath: null,
      textCandidates: members.flatMap(({ textCandidates }) =>
        textCandidates.filter(({ componentPath }) => componentPath === null),
      ),
      resourceCandidates: plan.workResourceCandidates[groupKey] ?? [],
      findingKeys: unique(findingKeys),
    },
    options,
  );
};

/**
 * The collateral a chapter or a contained Work gets from its own ContentItem (rule 161; 5541336717 rule 18): its own texts
 * and, for a contained Work, its own resources, never its parent's. A chapter holds no table of contents and no
 * AdditionalResource (rules 52, 162), which its reduction already disclosed.
 */
export const resolveOnixCollateralComponent = (
  plan: OnixCollateralPlan,
  productKey: string,
  componentPath: string,
  target: 'CHAPTER' | 'CONTAINED_WORK',
  options: ResolveOnixCollateralOptions,
): OnixResolvedCollateral => {
  const byKey = findingIndexOf(plan);
  const product = plan.products[productKey];

  return resolveScope(
    plan,
    {
      groupKey: product?.groupKey ?? '',
      productKey,
      componentPath,
      textCandidates: (product?.textCandidates ?? []).filter((candidate) => candidate.componentPath === componentPath),
      resourceCandidates:
        target === 'CONTAINED_WORK' ? (product?.componentResourceCandidates[componentPath] ?? []) : [],
      findingKeys: (product?.findingKeys ?? []).filter((key) => byKey.get(key)?.componentPath === componentPath),
    },
    options,
  );
};

/**
 * Everything one ContentItem states as collateral, without where it is stated: what grouped manifestations must agree on for
 * their components to be one (thoth-app#223 grouped comparison), so no manifestation's component collateral is planned while
 * another's is silently set aside.
 */
export const componentCollateralOf = (
  plan: OnixCollateralPlan | undefined,
  productKey: string,
  componentPath: string,
): unknown => {
  const product = plan?.products[productKey];

  if (product === undefined) return null;

  const within = ({ scope }: { readonly scope: OnixCollateralScope }) =>
    scope.kind === 'COMPONENT' && scope.componentPath === componentPath;

  // What the ContentItem states, never the order its composites happen to be written in.
  return {
    texts: product.textContents
      .filter(within)
      .map(({ binding }) => binding)
      .sort(),
    resources: product.resources
      .filter(within)
      .map(({ binding }) => binding)
      .sort(),
  };
};
