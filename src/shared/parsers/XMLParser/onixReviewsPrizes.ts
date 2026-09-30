import { AwardRole, type CountryCode, MarkupFormat } from '@/gql/graphql';

import type { ImportedMarkupFormat } from '../../types/markdown';
import {
  ONIX_PRIZE_PRODUCT_AWARD,
  ONIX_PRIZE_WORK_AWARD,
  ONIX_REVIEWS_PRIZES_ACKNOWLEDGED,
  ONIX_REVIEWS_PRIZES_NONE,
  ONIX_REVIEWS_PRIZES_OMIT,
  ONIX_REVIEWS_PRIZES_PROJECT,
  type OnixAwardIntent,
  type OnixBookReviewIntent,
  type OnixCitedContentFact,
  type OnixCollateralDateFact,
  type OnixCollateralPlan,
  type OnixCollateralScope,
  type OnixCollateralStatedText,
  type OnixContentItemKind,
  type OnixEndorsementAttributionBasis,
  type OnixEndorsementIntent,
  type OnixPlanFindingClassification,
  type OnixPlanFindingOption,
  type OnixPrizeCandidate,
  type OnixPrizeFact,
  type OnixPrizeIdentifierFact,
  type OnixPrizeNameOption,
  type OnixPrizeScope,
  type OnixProductReviewsPrizes,
  type OnixReviewCandidate,
  type OnixReviewCandidateKind,
  type OnixReviewsPrizesCandidates,
  type OnixReviewsPrizesChild,
  type OnixReviewsPrizesFinding,
  type OnixReviewsPrizesFindingCode,
  type OnixReviewsPrizesOrderBasis,
  type OnixReviewsPrizesOrdering,
  type OnixReviewsPrizesPlan,
  type OnixReviewsPrizesScope,
  type OnixReviewsPrizesText,
  type OnixSourceLocation,
  type OnixSourcePlan,
  type OnixTextContentFact,
} from '../../types/onixPlanning';
import { normaliseImportedAbstractHtml } from './importedAbstractHtml';
import { normaliseImportedPlainText } from './importedPlainText';
import type { ExtendedONIXMessageRoot, OnixText } from './interfaces';
import { getOnixText, readOnixDate, resolveOnixTextMarkup, toOnixArray } from './onix';
import type { ProvenanceResolver } from './validation/worker/provenance';

/**
 * The canonical review, endorsement, prize and CitedContent reduction of thoth-app#226 (APP-IMPORT-ONIX-REL-01D of #185),
 * under the approved decision ONIX-AUDIT-REVIEWS-PRIZES-01 (#179 proposal 5569333445, approval 5571407265), on top of the
 * approved collateral foundation (5568781349, thoth-app#225), REL-01A's component scope (#223) and REL-01B's Reference
 * contract (#224).
 *
 * `reduceOnixReviewsPrizes` runs after canonical source validation, the source plan, the component, RelatedMaterial and
 * collateral reductions. Review and endorsement TextContents (List 153 06-09) are never read again here: it consumes the
 * collateral reduction's own `OnixTextContentFact`s, exactly as REL-01C normalised them. It reads only what no merged reducer
 * owns - every P.15 CitedContent, every P.17 Prize and every Contributor's Prize - exactly as stated and in source order.
 * Nothing is fetched, searched or looked up: no link is followed, no reviewer, endorser or prize is matched by name, and no
 * previous edition or previous Work is discovered by title, contributor, Series, publisher, date or URL (rules 18, 93, 98).
 *
 * Source semantics stay apart (rules 19-36): a review quote (06) and a cited review (CitedContent 01) may each become a
 * BookReview, and one of each only by the publisher's explicit pairing; an endorsement (09) an Endorsement; a P.17 Prize an
 * Award only once the publisher classifies it as won by the Work; a Contributor's Prize, CitedContent 02-08, a previous
 * edition's review (07) and a previous Work's (08) nothing. CitedContent never becomes a Reference, which REL-01B alone plans
 * from RelatedProduct 34 (rule 29), and a SupportingResource 17 stays the collateral reduction's (rule 27).
 *
 * `resolveOnixReviewsPrizesWork` and `resolveOnixReviewsPrizesComponent` are pure: from the reduction and the publisher's
 * answers they decide every BookReview, Endorsement and Award intent a Work or contained Work holds - each with an explicit,
 * positive and unique orderNumber, and each waiting on #187, which creates it. A chapter holds none (rule 152).
 */

export type ReduceOnixReviewsPrizesOptions = {
  /** Maps canonical Reference paths back to the submitted source, for a Short-tag file. */
  readonly provenance?: ProvenanceResolver;
};

/* ------------------------------------------------------------------------------------------------ */
/* Pinned codelists (Issue 74)                                                                      */
/* ------------------------------------------------------------------------------------------------ */

/** List 154: the one audience a public target takes by itself, the one never shown, and a search index (5562227566 13-16). */
const UNRESTRICTED_AUDIENCE = '00';
const RESTRICTED_AUDIENCE = '01';
const SEARCH_INDEX_AUDIENCE = '09';
const SEARCH_INDEX_NOTE = `${SEARCH_INDEX_AUDIENCE} is a search engine index, not text for display`;

/** List 153: a review quote, a previous edition's, a previous Work's, and an endorsement (rules 19-22). */
const REVIEW_QUOTE = '06';
const PREVIOUS_EDITION_REVIEW = '07';
const PREVIOUS_WORK_REVIEW = '08';
const ENDORSEMENT = '09';

/** List 156: a third-party review, the one CitedContent type with a Thoth target (rule 23). */
const CITED_REVIEW = '01';

const CITED_CONTENT_TYPES: Readonly<Record<string, string>> = {
  '01': 'Review',
  '02': 'Bestseller list',
  '03': 'Media mention',
  '04': '‘One locality, one book’ program',
  '05': 'Curated list',
  '06': 'Commentary / discussion',
  '07': 'Interview',
  '08': 'Soundtrack',
};

/** List 155: publication date, the one role a review date is taken from (rules 51, 62). */
const PUBLICATION_DATE = '01';

/** List 155 roles that control when collateral may be used, which no Thoth field enforces (5562227566 rules 22-25). */
const TEMPORAL_CONTROL_ROLES: ReadonlySet<string> = new Set(['14', '15', '24', '27', '28']);

/** List 41, exactly as pinned, and the AwardRole each code means (rule 112): no default, no fallback (113). */
export const ONIX_PRIZE_AWARD_ROLES: Readonly<Record<string, AwardRole>> = {
  '01': AwardRole.Winner,
  '02': AwardRole.RunnerUp,
  '03': AwardRole.Commended,
  '04': AwardRole.ShortListed,
  '05': AwardRole.LongListed,
  '06': AwardRole.JointWinner,
  '07': AwardRole.Nominated,
};

/**
 * The explicit ISO 3166-1 crosswalk from every pinned List 91 country to the Thoth CountryCode it is (rule 116): nothing is
 * resolved by shape, case, name or similarity. The three pinned codes of states that no longer exist have no Thoth country
 * and are target-unrepresentable (rule 117).
 */
const PRIZE_COUNTRY_PAIRS =
  'AD AND AE ARE AF AFG AG ATG AI AIA AL ALB AM ARM AO AGO AQ ATA AR ARG AS ASM AT AUT AU AUS AW ABW AX ALA AZ AZE ' +
  'BA BIH BB BRB BD BGD BE BEL BF BFA BG BGR BH BHR BI BDI BJ BEN BL BLM BM BMU BN BRN BO BOL BQ BES BR BRA BS BHS ' +
  'BT BTN BV BVT BW BWA BY BLR BZ BLZ CA CAN CC CCK CD COD CF CAF CG COG CH CHE CI CIV CK COK CL CHL CM CMR CN CHN ' +
  'CO COL CR CRI CU CUB CV CPV CW CUW CX CXR CY CYP CZ CZE DE DEU DJ DJI DK DNK DM DMA DO DOM DZ DZA EC ECU EE EST ' +
  'EG EGY EH ESH ER ERI ES ESP ET ETH FI FIN FJ FJI FK FLK FM FSM FO FRO FR FRA GA GAB GB GBR GD GRD GE GEO GF GUF ' +
  'GG GGY GH GHA GI GIB GL GRL GM GMB GN GIN GP GLP GQ GNQ GR GRC GS SGS GT GTM GU GUM GW GNB GY GUY HK HKG HM HMD ' +
  'HN HND HR HRV HT HTI HU HUN ID IDN IE IRL IL ISR IM IMN IN IND IO IOT IQ IRQ IR IRN IS ISL IT ITA JE JEY JM JAM ' +
  'JO JOR JP JPN KE KEN KG KGZ KH KHM KI KIR KM COM KN KNA KP PRK KR KOR KW KWT KY CYM KZ KAZ LA LAO LB LBN LC LCA ' +
  'LI LIE LK LKA LR LBR LS LSO LT LTU LU LUX LV LVA LY LBY MA MAR MC MCO MD MDA ME MNE MF MAF MG MDG MH MHL MK MKD ' +
  'ML MLI MM MMR MN MNG MO MAC MP MNP MQ MTQ MR MRT MS MSR MT MLT MU MUS MV MDV MW MWI MX MEX MY MYS MZ MOZ NA NAM ' +
  'NC NCL NE NER NF NFK NG NGA NI NIC NL NLD NO NOR NP NPL NR NRU NU NIU NZ NZL OM OMN PA PAN PE PER PF PYF PG PNG ' +
  'PH PHL PK PAK PL POL PM SPM PN PCN PR PRI PS PSE PT PRT PW PLW PY PRY QA QAT RE REU RO ROU RS SRB RU RUS RW RWA ' +
  'SA SAU SB SLB SC SYC SD SDN SE SWE SG SGP SH SHN SI SVN SJ SJM SK SVK SL SLE SM SMR SN SEN SO SOM SR SUR SS SSD ' +
  'ST STP SV SLV SX SXM SY SYR SZ SWZ TC TCA TD TCD TF ATF TG TGO TH THA TJ TJK TK TKL TL TLS TM TKM TN TUN TO TON ' +
  'TR TUR TT TTO TV TUV TW TWN TZ TZA UA UKR UG UGA UM UMI US USA UY URY UZ UZB VA VAT VC VCT VE VEN VG VGB VI VIR ' +
  'VN VNM VU VUT WF WLF WS WSM YE YEM YT MYT ZA ZAF ZM ZMB ZW ZWE';

const PRIZE_COUNTRY_TOKENS = PRIZE_COUNTRY_PAIRS.split(' ');

/** Every pinned List 91 country Thoth has a CountryCode for, and that CountryCode. */
export const ONIX_PRIZE_COUNTRIES: ReadonlyMap<string, CountryCode> = new Map(
  PRIZE_COUNTRY_TOKENS.flatMap((token, index) =>
    index % 2 === 0 ? [[token, PRIZE_COUNTRY_TOKENS[index + 1] as CountryCode] as const] : [],
  ),
);

/** The pinned List 91 countries Thoth has no CountryCode for: Netherlands Antilles, Serbia and Montenegro, Yugoslavia. */
export const ONIX_PRIZE_COUNTRIES_UNSUPPORTED: ReadonlySet<string> = new Set(['AN', 'CS', 'YU']);

/** Thoth stores every child ordinal in a PostgreSQL `integer`. */
const MAX_ORDINAL = 2_147_483_647;

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

/**
 * Every Contributor anywhere in a Product - under DescriptiveDetail, a Collection, a ContentItem or a promotional event -
 * with its canonical path, in document order: where a contributor-level Prize can be stated (rule 4).
 */
const contributorsIn = (occurrence: Occurrence): Occurrence[] => {
  if (!isElement(occurrence.value)) return [];

  return Object.keys(occurrence.value)
    .filter((key) => key !== '#text' && !key.startsWith('@_'))
    .flatMap((key) =>
      children(occurrence, key).flatMap((child) =>
        key === 'Contributor' ? [child, ...contributorsIn(child)] : contributorsIn(child),
      ),
    );
};

const nullIfEmpty = (value: string): string | null => (value.length > 0 ? value : null);

const unique = <T>(values: readonly T[]): T[] => [...new Set(values)];

/** The audiences a statement names as the set they are (5562227566 rule 20): each code once, in code order. */
const audienceSetOf = (audiences: readonly string[]): string[] => unique(audiences).sort();

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

/** A display name as stated, its whitespace collapsed: never joined to another, reordered or punctuated (rules 40, 80). */
const displayName = (stated: OnixCollateralStatedText): string | null =>
  stated.text === null ? null : nullIfEmpty(stated.text.replace(/\s+/g, ' ').trim());

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

const TERRITORY_PARTS = ['CountriesIncluded', 'RegionsIncluded', 'CountriesExcluded', 'RegionsExcluded'] as const;

const territoryOf = (parent: Occurrence): string[] => {
  const [territory] = children(parent, 'Territory');

  return territory === undefined
    ? []
    : TERRITORY_PARTS.flatMap((part) =>
        childTexts(territory, part).map((value) => `${part} ${value.split(/\s+/).join(' ')}`),
      );
};

/** Whether a stated Territory is the whole world and nothing less (5543566392 rule 41). */
const isWorldOnly = (territory: readonly string[]): boolean =>
  territory.length === 0 || (territory.length === 1 && territory[0] === 'RegionsIncluded WORLD');

const locationOf = ({ path, sourcePath }: OnixSourceLocation): OnixSourceLocation => ({ path, sourcePath });

const describeRecord = (index: number, recordReference: string | null) =>
  recordReference === null ? `product ${index}` : `product ${index} (${recordReference})`;

/* ------------------------------------------------------------------------------------------------ */
/* Findings                                                                                         */
/* ------------------------------------------------------------------------------------------------ */

type FindingInput = {
  readonly code: OnixReviewsPrizesFindingCode;
  readonly classification: OnixPlanFindingClassification;
  readonly blocking: boolean;
  readonly productKey: string | null;
  readonly groupKey: string;
  readonly componentPath: string | null;
  readonly locations: readonly OnixSourceLocation[];
  readonly detail?: OnixReviewsPrizesFinding['detail'];
  readonly resolution?: OnixReviewsPrizesFinding['resolution'];
  readonly message: string;
  /** What tells this finding apart from another of the same code in the same scope: the facts it is about. */
  readonly discriminator: string;
};

class ReviewsPrizesFindings {
  private readonly byKey = new Map<string, OnixReviewsPrizesFinding>();

  add(input: FindingInput): OnixReviewsPrizesFinding {
    const key = [
      'REVIEWS_PRIZES',
      input.code,
      input.productKey ?? input.groupKey,
      input.componentPath ?? '',
      input.discriminator,
    ].join('|');
    const existing = this.byKey.get(key);

    if (existing !== undefined) return existing;

    const finding: OnixReviewsPrizesFinding = {
      family: 'REVIEWS_PRIZES',
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

  all(): OnixReviewsPrizesFinding[] {
    return [...this.byKey.values()];
  }
}

/**
 * Whether an answer is one a review, endorsement or prize finding offers (thoth-app#226): the acknowledgement for a loss or a
 * file order, or one of a choice's options. A finding no answer resolves offers none; every other answer is stale.
 */
export const isOfferedOnixReviewsPrizesAnswer = (
  finding: Pick<OnixReviewsPrizesFinding, 'resolution'>,
  answer: string,
): boolean => {
  switch (finding.resolution.kind) {
    case 'ACKNOWLEDGE':
      return answer === ONIX_REVIEWS_PRIZES_ACKNOWLEDGED;
    case 'CHOICE':
      return finding.resolution.options.some(({ key }) => key === answer);
    case 'NONE':
      return false;
  }
};

/* ------------------------------------------------------------------------------------------------ */
/* Facts this reduction owns: CitedContent and Prize                                                */
/* ------------------------------------------------------------------------------------------------ */

type ProductContext = {
  readonly productKey: string;
  readonly groupKey: string;
  /** The Product's representative record's place in the file: its source order among its Work group's Products. */
  readonly index: number;
  readonly describe: string;
  readonly locate: Locate;
  readonly findings: ReviewsPrizesFindings;
  readonly findingKeys: string[];
};

const citedContentFactOf = (
  context: ProductContext,
  occurrence: Occurrence,
  scope: OnixReviewsPrizesScope,
  position: number,
): OnixCitedContentFact => {
  const { locate } = context;
  const audiences = childTexts(occurrence, 'ContentAudience');
  const redacted = audiences.includes(RESTRICTED_AUDIENCE);
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
    citedContentType: childText(occurrence, 'CitedContentType'),
    audiences,
    territory: territoryOf(occurrence),
    sourceType: nullIfEmpty(childText(occurrence, 'SourceType')),
    listNames: texts('ListName'),
    sourceTitles: texts('SourceTitle'),
    reviewRating:
      rating === undefined
        ? []
        : [childText(rating, 'Rating'), childText(rating, 'RatingLimit'), ...childTexts(rating, 'RatingUnits')].filter(
            (part) => part.length > 0,
          ),
    positionOnList: nullIfEmpty(childText(occurrence, 'PositionOnList')),
    citationNotes: texts('CitationNote'),
    links: texts('ResourceLink'),
    dates: children(occurrence, 'ContentDate').map((date) => dateFactOf(date, locate)),
    redacted,
    binding: fingerprint(occurrence.value),
  };
};

const prizeFactOf = (
  context: ProductContext,
  occurrence: Occurrence,
  scope: OnixPrizeScope,
  position: number,
): OnixPrizeFact => {
  const { locate } = context;
  const texts = (name: string) => children(occurrence, name).map((text) => statedText(text, locate, false));

  return {
    ...locate(occurrence.path),
    factKey: `${context.productKey}|${occurrence.path}`,
    productKey: context.productKey,
    groupKey: context.groupKey,
    scope,
    position,
    sequenceNumber: nullIfEmpty(childText(occurrence, 'SequenceNumber')),
    identifiers: children(occurrence, 'PrizeIdentifier').map(
      (identifier): OnixPrizeIdentifierFact => ({
        ...locate(identifier.path),
        type: childText(identifier, 'PrizeIDType'),
        typeName: nullIfEmpty(childText(identifier, 'IDTypeName')),
        value: childText(identifier, 'IDValue'),
      }),
    ),
    names: texts('PrizeName'),
    year: nullIfEmpty(childText(occurrence, 'PrizeYear')),
    awardingBodies: texts('AwardingBody'),
    country: nullIfEmpty(childText(occurrence, 'PrizeCountry')),
    region: nullIfEmpty(childText(occurrence, 'PrizeRegion')),
    code: nullIfEmpty(childText(occurrence, 'PrizeCode')),
    statements: texts('PrizeStatement'),
    juries: texts('PrizeJury'),
    binding: fingerprint(occurrence.value),
  };
};

/* ------------------------------------------------------------------------------------------------ */
/* Texts                                                                                            */
/* ------------------------------------------------------------------------------------------------ */

type NormalisedText =
  | { readonly kind: 'content'; readonly content: string; readonly format: ImportedMarkupFormat }
  | { readonly kind: 'empty' }
  | { readonly kind: 'unrepresentable' };

/**
 * One text a markup field takes - a review's or endorsement's text, or a prize statement - through the approved markup policy
 * the collateral and descriptive texts follow (rules 37, 76, 123): HTML, JATS or plain text, each normalised as the API reads
 * it. Nothing is guessed from angle brackets, and nothing is invented.
 */
const normaliseMarkupText = (text: OnixCollateralStatedText): NormalisedText => {
  if (text.holdsElements) return { kind: 'unrepresentable' };

  const content = text.text ?? '';

  if (content.trim().length === 0) return { kind: 'empty' };

  const declared = text.textFormat ?? '';
  const resolution = resolveOnixTextMarkup(declared, content);

  if (resolution.kind === 'unclassifiable') return { kind: 'unrepresentable' };

  if (resolution.format === MarkupFormat.JatsXml) return { kind: 'content', content, format: resolution.format };

  const normalised =
    resolution.format === MarkupFormat.PlainText
      ? normaliseImportedPlainText(declared, content)
      : normaliseImportedAbstractHtml(content);

  if (normalised.kind === 'unrepresentable') return { kind: 'unrepresentable' };

  return normalised.kind === 'empty'
    ? { kind: 'empty' }
    : { kind: 'content', content: normalised.content, format: resolution.format };
};

/**
 * One text a plain field takes - a prize jury (rules 120-122): only a text that is plain as stated is safe; markup the field
 * cannot hold is never emitted as literal source, never stripped by guess, and is an explicit loss instead.
 */
const normalisePlainText = (text: OnixCollateralStatedText): NormalisedText => {
  if (text.holdsElements) return { kind: 'unrepresentable' };

  const content = (text.text ?? '').replace(/\r\n?/g, '\n').trim();

  if (content.length === 0) return { kind: 'empty' };

  const resolution = resolveOnixTextMarkup(text.textFormat ?? '', content);

  return resolution.kind === 'format' && resolution.format === MarkupFormat.PlainText
    ? { kind: 'content', content, format: MarkupFormat.PlainText }
    : { kind: 'unrepresentable' };
};

/** Every distinct normalised text of a set, in source order: equal ones collapse with every location kept. */
const distinctTexts = (
  stated: readonly OnixCollateralStatedText[],
  normalise: (text: OnixCollateralStatedText) => NormalisedText,
): { readonly texts: OnixReviewsPrizesText[]; readonly unusable: OnixCollateralStatedText[] } => {
  const byIdentity = new Map<string, OnixReviewsPrizesText>();
  const unusable: OnixCollateralStatedText[] = [];

  stated.forEach((text) => {
    const normalised = normalise(text);

    if (normalised.kind === 'unrepresentable') {
      unusable.push(text);

      return;
    }

    if (normalised.kind === 'empty') return;

    const identity = fingerprint([normalised.content, normalised.format, text.language]);
    const existing = byIdentity.get(identity);

    byIdentity.set(identity, {
      content: normalised.content,
      markupFormat: normalised.format,
      language: text.language,
      locations: [...(existing?.locations ?? []), locationOf(text)],
    });
  });

  return { texts: [...byIdentity.values()], unusable };
};

/* ------------------------------------------------------------------------------------------------ */
/* Review, endorsement and cited-review drafts                                                      */
/* ------------------------------------------------------------------------------------------------ */

/** One statement of a review, endorsement or cited review, before its Work group's statements of it are collapsed. */
type ReviewDraft = {
  readonly kind: OnixReviewCandidateKind;
  readonly productKey: string;
  readonly factKey: string;
  readonly sourceCode: string;
  readonly audiences: readonly string[];
  readonly texts: readonly OnixReviewsPrizesText[];
  /** Whether it states text none of which a target can hold: its candidate is omitted by acknowledgement. */
  readonly textUnrepresentable: boolean;
  readonly attributions: readonly string[];
  readonly attributionBasis: OnixEndorsementAttributionBasis | null;
  readonly links: readonly string[];
  readonly reviewDate: string | null;
  readonly sequenceNumber: string | null;
  readonly sourceOrder: readonly number[];
  readonly losses: readonly string[];
  readonly semantic: string;
  readonly location: OnixSourceLocation;
};

/** What a statement's audiences, territory, usage terms and text languages cost it on a target that keeps none of them. */
const scopeLosses = (
  audiences: readonly string[],
  territory: readonly string[],
  languages: readonly string[],
): string[] => {
  const targeted = audienceSetOf(audiences).filter((audience) => audience !== UNRESTRICTED_AUDIENCE);

  return [
    ...(audiences.includes(UNRESTRICTED_AUDIENCE) && targeted.length > 0
      ? [`its further audiences (List 154 ${targeted.join(', ')})`]
      : []),
    ...(isWorldOnly(territory) ? [] : [`its territory (${territory.join('; ')})`]),
    ...(languages.length > 0 ? [`its language (${unique(languages).join(', ')})`] : []),
  ];
};

/** The one complete publication day a statement gives a review date from, and what else about its dates is lost (51-53). */
const reviewDateOf = (
  dates: readonly OnixCollateralDateFact[],
  takesDate: boolean,
): { readonly reviewDate: string | null; readonly losses: string[] } => {
  const publicationDays = unique(
    dates.flatMap(({ role, day }) => (role === PUBLICATION_DATE && day !== null ? [day] : [])),
  );
  const reviewDate = takesDate && publicationDays.length === 1 ? publicationDays[0] : null;
  const lost = dates.filter(
    ({ role, day }) => !(reviewDate !== null && role === PUBLICATION_DATE && day === reviewDate),
  );

  return {
    reviewDate,
    losses:
      lost.length === 0
        ? []
        : [
            `its dates (List 155 ${unique(lost.map(({ role }) => role)).join(', ')})${
              takesDate && publicationDays.length > 1 ? ', whose several publication days compete for the one date' : ''
            }`,
          ],
  };
};

/** Every distinct link a statement gives, in source order: exact duplicates collapse, and none is ever fetched (48, 58). */
const distinctLinks = (links: readonly OnixCollateralStatedText[]): string[] =>
  unique(links.flatMap(({ text }) => (text === null || text.trim().length === 0 ? [] : [text.trim()])));

/** Everything a statement says about a text, as plain data: what its collapse is decided on, its place excluded. */
const statedSemantics = (texts: readonly OnixCollateralStatedText[]) =>
  texts.map(({ text, language, script, textFormat, holdsElements: elements }) => [
    text,
    language,
    script,
    textFormat,
    elements,
  ]);

/**
 * What one Product's review or endorsement TextContent - the REL-01C fact itself, never re-read (thoth-app#225) - comes to:
 * a draft, or the finding that says why there is none. `06` and `09` are drafts; `07` and `08` never target anything here.
 */
const reviewTextDraftOf = (
  context: ProductContext,
  fact: OnixTextContentFact,
  factScope: OnixReviewsPrizesScope,
  where: string,
  sourceOrder: readonly number[],
): ReviewDraft | null => {
  const at = [locationOf(fact)];
  const raise = (finding: Omit<FindingInput, 'productKey' | 'groupKey' | 'componentPath'>) =>
    context.findingKeys.push(context.findings.add({ ...scopeOf(context, factScope), ...finding }).key);

  if (fact.textType === PREVIOUS_EDITION_REVIEW) {
    raise({
      code: 'REVIEW_PREVIOUS_EDITION_UNRESOLVED',
      classification: 'TARGET_UNREPRESENTABLE',
      blocking: false,
      locations: at,
      discriminator: `${fact.path}|${fact.binding}`,
      detail: { textType: fact.textType, ...(fact.redacted ? { redacted: ['texts'] } : {}) },
      message: `The review quote of a previous edition (List 153 07) of ${where} is not imported: it never attaches to this Work, and no approved relation in this file establishes which Work that previous edition is - no Work is looked up by its title, ISBN or name`,
    });

    return null;
  }

  if (fact.textType === PREVIOUS_WORK_REVIEW) {
    raise({
      code: 'REVIEW_PREVIOUS_WORK_UNREPRESENTABLE',
      classification: 'TARGET_UNREPRESENTABLE',
      blocking: false,
      locations: at,
      discriminator: `${fact.path}|${fact.binding}`,
      detail: { textType: fact.textType, ...(fact.redacted ? { redacted: ['texts'] } : {}) },
      message: `The review quote of a previous Work (List 153 08) of ${where} is not imported: it never attaches to this Work, and it never identifies which Work it reviewed - none is matched by author, Series, title, publisher, date or link`,
    });

    return null;
  }

  // Only a review quote and an endorsement have a target; the collateral reduction routes nothing else here as a review.
  const kind: OnixReviewCandidateKind | null =
    fact.textType === ENDORSEMENT ? 'ENDORSEMENT' : fact.textType === REVIEW_QUOTE ? 'REVIEW_QUOTE' : null;

  if (kind === null) return null;

  const eligible = eligibilityOf(context, {
    kind,
    scope: factScope,
    audiences: fact.audiences,
    dates: fact.dates,
    sourceCode: fact.textType,
    redacted: fact.redacted,
    location: locationOf(fact),
    binding: fact.binding,
    what:
      kind === 'ENDORSEMENT'
        ? `The endorsement (List 153 09) of ${where}`
        : `The review quote (List 153 06) of ${where}`,
  });

  if (!eligible) return null;

  const { texts, unusable } = distinctTexts(fact.texts, normaliseMarkupText);

  if (texts.length === 0 && unusable.length === 0) {
    raise({
      code: 'REVIEW_TEXT_EMPTY',
      classification: 'SUPPORTED_WITH_WARNING',
      blocking: false,
      locations: at,
      discriminator: `${fact.path}|${fact.binding}`,
      detail: { textType: fact.textType },
      message: `The ${kind === 'ENDORSEMENT' ? 'endorsement' : 'review quote'} of ${where} holds no text, so nothing is imported for it; no text is supplied in its place`,
    });

    return null;
  }

  const authors = unique(fact.authors.flatMap((author) => displayName(author) ?? []));
  const corporates = unique(fact.sourceCorporate.flatMap((source) => displayName(source) ?? []));
  // An endorsement's one required attribution: its TextAuthors, or where it states none its corporate sources (rules 77-79).
  const attributions = kind === 'ENDORSEMENT' && authors.length === 0 ? corporates : authors;
  const attributionBasis: OnixEndorsementAttributionBasis | null =
    kind === 'ENDORSEMENT' ? (authors.length === 0 ? 'CORPORATE_SOURCE_DISPLAY' : 'TEXT_AUTHOR') : null;
  const described = [
    ...(kind === 'REVIEW_QUOTE' && authors.length > 1 ? ['TextAuthor'] : []),
    ...(fact.sourceCorporate.length > 0 && attributionBasis !== 'CORPORATE_SOURCE_DISPLAY'
      ? ['TextSourceCorporate']
      : []),
    ...(fact.sourceDescriptions.length > 0 ? ['TextSourceDescription'] : []),
    ...(fact.textSources.length > 0 ? ['TextSource'] : []),
    ...(fact.sourceTitles.length > 0 ? ['SourceTitle'] : []),
  ];
  const links = distinctLinks(fact.sourceLinks);
  const date = reviewDateOf(fact.dates, kind === 'REVIEW_QUOTE');
  const languages = fact.texts.flatMap(({ language }) => language ?? []);
  const losses = [
    ...(kind === 'REVIEW_QUOTE' ? ['its role as a review quote, which a BookReview does not keep (rule 38)'] : []),
    ...(described.length > 0 ? [`its source (${described.join(', ')})`] : []),
    ...(fact.reviewRating.length > 0 ? ['its review rating'] : []),
    ...date.losses,
    ...(fact.usageTerms.length > 0 ? ['its usage and licence terms'] : []),
    ...(texts.length > 0 && unusable.length > 0
      ? [
          `its text${unusable.length === 1 ? '' : 's'} at ${unusable.map(({ path }) => path).join(', ')}, which Thoth cannot hold`,
        ]
      : []),
    ...scopeLosses(fact.audiences, fact.territory, languages),
  ];
  const opaque =
    fact.textSources.length > 0 ||
    fact.usageTerms.length > 0 ||
    [...fact.texts, ...fact.authors, ...fact.sourceCorporate, ...fact.sourceDescriptions, ...fact.sourceTitles].some(
      ({ holdsElements: elements }) => elements,
    );

  return {
    kind,
    productKey: context.productKey,
    factKey: fact.factKey,
    sourceCode: fact.textType,
    audiences: fact.audiences,
    texts,
    textUnrepresentable: texts.length === 0,
    attributions,
    attributionBasis,
    links,
    reviewDate: date.reviewDate,
    sequenceNumber: fact.sequenceNumber,
    sourceOrder,
    losses,
    // What it is, whatever its place and sequence: the statements of a grouped Work that say exactly this are one (137-138).
    semantic: fingerprint([
      'TextContent',
      fact.textType,
      audienceSetOf(fact.audiences),
      fact.territory,
      statedSemantics(fact.texts),
      fact.reviewRating,
      statedSemantics(fact.authors),
      statedSemantics(fact.sourceCorporate),
      statedSemantics(fact.sourceDescriptions),
      statedSemantics(fact.sourceTitles),
      statedSemantics(fact.sourceLinks),
      fact.dates.map(({ role, format, value }) => [role, format, value]),
      // What the fact keeps only by its path cannot be compared: such a statement is one only with itself.
      opaque ? fact.binding : null,
    ]),
    location: locationOf(fact),
  };
};

type Eligibility = {
  readonly kind: OnixReviewCandidateKind | 'CITED_OTHER';
  readonly scope: OnixReviewsPrizesScope;
  readonly audiences: readonly string[];
  readonly dates: readonly OnixCollateralDateFact[];
  readonly sourceCode: string;
  readonly redacted: boolean;
  readonly location: OnixSourceLocation;
  readonly binding: string;
  readonly what: string;
};

/** A REL-01C TextContent's scope as this reduction reads it: its Product or its ContentItem, never a promotional event's. */
const reviewScopeOf = (scope: OnixCollateralScope): OnixReviewsPrizesScope | null =>
  scope.kind === 'PROMOTIONAL_EVENT' ? null : scope;

/** The finding scope of a fact: its Product, and its ContentItem where it is one's. */
const scopeOf = (context: ProductContext, scope: OnixReviewsPrizesScope) => ({
  productKey: context.productKey,
  groupKey: context.groupKey,
  componentPath: scope.kind === 'COMPONENT' ? scope.componentPath : null,
});

/**
 * Whether a review, endorsement or CitedContent statement may be planned at all, under the approved disclosure, scope and
 * temporal rules applied unchanged (rule 36): never restricted content (5562227566 rules 13-15), never a chapter's or a
 * ContentItem's no Work is planned from (rules 152-153, 161), and never text whose use a date controls (rules 22-25, 72-73).
 */
const eligibilityOf = (context: ProductContext, statement: Eligibility): boolean => {
  const scope = scopeOf(context, statement.scope);
  const discriminator = `${statement.location.path}|${statement.binding}`;
  const raise = (finding: Omit<FindingInput, 'productKey' | 'groupKey' | 'componentPath' | 'discriminator'>) =>
    context.findingKeys.push(context.findings.add({ ...scope, discriminator, ...finding }).key);
  const componentKind: OnixContentItemKind | null =
    statement.scope.kind === 'COMPONENT' ? statement.scope.componentKind : null;
  const detail = { sourceCode: statement.sourceCode, ...(statement.redacted ? { redacted: ['texts'] } : {}) };

  if (statement.audiences.includes(RESTRICTED_AUDIENCE)) {
    raise({
      code: 'REVIEW_RESTRICTED',
      classification: 'TARGET_UNREPRESENTABLE',
      blocking: false,
      locations: [statement.location],
      detail,
      message: `${statement.what} is restricted to distribution by agreement (ContentAudience 01), so it is never imported into a public field; its content is not repeated here`,
    });

    return false;
  }

  if (componentKind === 'AV_ITEM' || componentKind === 'UNSUPPORTED') {
    raise({
      code: 'REVIEW_COMPONENT_NOT_PLANNED',
      classification: 'TARGET_UNREPRESENTABLE',
      blocking: false,
      locations: [statement.location],
      detail: { ...detail, componentKind },
      message: `${statement.what} belongs to a content item no Work is planned from, so it is not imported; it is never moved to the parent Work`,
    });

    return false;
  }

  if (componentKind === 'CHAPTER') {
    raise({
      code: 'REVIEW_CHAPTER_UNREPRESENTABLE',
      classification: 'TARGET_UNREPRESENTABLE',
      blocking: false,
      locations: [statement.location],
      detail,
      message: `${statement.what} belongs to a chapter, and Thoth holds no review, endorsement or award on a BookChapter; it is not imported, and never moved to the parent Work`,
    });

    return false;
  }

  if (statement.kind === 'CITED_OTHER') {
    raise({
      code: 'CITED_CONTENT_UNREPRESENTABLE',
      classification: 'TARGET_UNREPRESENTABLE',
      blocking: false,
      locations: [statement.location],
      detail,
      message: `${statement.what} has no Thoth target: it never becomes an Award, a Reference, an Endorsement or an additional resource`,
    });

    return false;
  }

  const temporal = statement.dates.filter(({ role }) => TEMPORAL_CONTROL_ROLES.has(role));

  if (temporal.length > 0) {
    raise({
      code: 'REVIEW_TEMPORAL_CONTROL',
      classification: 'TARGET_UNREPRESENTABLE',
      blocking: false,
      locations: [statement.location, ...temporal.map(locationOf)],
      detail: { ...detail, roles: unique(temporal.map(({ role }) => role)) },
      message: `${statement.what} states when it may be used (List 155 ${unique(temporal.map(({ role }) => role)).join(', ')}), which no Thoth field enforces, so it is not imported`,
    });

    return false;
  }

  return true;
};

/** What one CitedContent comes to: a cited-review draft (type 01), or the finding that says why there is none. */
const citedDraftOf = (
  context: ProductContext,
  fact: OnixCitedContentFact,
  where: string,
  sourceOrder: readonly number[],
): ReviewDraft | null => {
  const typeLabel = CITED_CONTENT_TYPES[fact.citedContentType] ?? 'an unlisted type';
  const cited = fact.citedContentType === CITED_REVIEW;
  const eligible = eligibilityOf(context, {
    kind: cited ? 'CITED_REVIEW' : 'CITED_OTHER',
    scope: fact.scope,
    audiences: fact.audiences,
    dates: fact.dates,
    sourceCode: fact.citedContentType,
    redacted: fact.redacted,
    location: locationOf(fact),
    binding: fact.binding,
    what: `The cited content of ${where} (List 156 ${fact.citedContentType}, ${typeLabel})`,
  });

  if (!eligible) return null;

  const links = distinctLinks(fact.links);

  if (links.length === 0) {
    context.findingKeys.push(
      context.findings.add({
        ...scopeOf(context, fact.scope),
        code: 'CITED_REVIEW_NOTHING_REPRESENTABLE',
        classification: 'TARGET_UNREPRESENTABLE',
        blocking: false,
        locations: [locationOf(fact)],
        discriminator: `${fact.path}|${fact.binding}`,
        detail: { sourceCode: fact.citedContentType },
        message: `The cited review of ${where} states no link a BookReview can keep, so no BookReview is created from it: its citation note, source title and date alone never make one`,
      }).key,
    );

    return null;
  }

  const date = reviewDateOf(fact.dates, true);
  const described = [
    ...(fact.sourceTitles.length > 0 ? ['SourceTitle'] : []),
    ...(fact.sourceType === null ? [] : [`SourceType ${fact.sourceType}`]),
    ...(fact.citationNotes.length > 0 ? ['CitationNote'] : []),
    ...(fact.listNames.length > 0 ? ['ListName'] : []),
    ...(fact.positionOnList === null ? [] : ['PositionOnList']),
  ];

  return {
    kind: 'CITED_REVIEW',
    productKey: context.productKey,
    factKey: fact.factKey,
    sourceCode: fact.citedContentType,
    audiences: fact.audiences,
    texts: [],
    textUnrepresentable: false,
    attributions: [],
    attributionBasis: null,
    links,
    reviewDate: date.reviewDate,
    sequenceNumber: fact.sequenceNumber,
    sourceOrder,
    losses: [
      'its role as a cited third-party review, which a BookReview does not keep (rule 56)',
      ...(described.length > 0 ? [`its source and citation (${described.join(', ')})`] : []),
      ...(fact.reviewRating.length > 0 ? ['its review rating'] : []),
      ...date.losses,
      ...scopeLosses(fact.audiences, fact.territory, []),
    ],
    semantic: fingerprint([
      'CitedContent',
      fact.citedContentType,
      audienceSetOf(fact.audiences),
      fact.territory,
      fact.sourceType,
      statedSemantics(fact.listNames),
      statedSemantics(fact.sourceTitles),
      fact.reviewRating,
      fact.positionOnList,
      statedSemantics(fact.citationNotes),
      statedSemantics(fact.links),
      fact.dates.map(({ role, format, value }) => [role, format, value]),
      fact.citationNotes.some(({ holdsElements: elements }) => elements) ? fact.binding : null,
    ]),
    location: locationOf(fact),
  };
};

/* ------------------------------------------------------------------------------------------------ */
/* Prize drafts                                                                                     */
/* ------------------------------------------------------------------------------------------------ */

type PrizeDraft = {
  readonly productKey: string;
  readonly factKey: string;
  readonly names: readonly OnixPrizeNameOption[];
  readonly code: string | null;
  readonly role: AwardRole | null;
  readonly year: string | null;
  readonly country: CountryCode | null;
  readonly juries: readonly OnixReviewsPrizesText[];
  readonly statements: readonly OnixReviewsPrizesText[];
  readonly identifiers: readonly OnixPrizeIdentifierFact[];
  readonly sequenceNumber: string | null;
  readonly sourceOrder: readonly number[];
  readonly losses: readonly string[];
  /** Every fact that says which prize it is - its place and sequence excluded (rules 128, 142). */
  readonly identity: string;
  readonly identifierKeys: readonly string[];
  readonly location: OnixSourceLocation;
};

const identifierKeyOf = ({ type, typeName, value }: OnixPrizeIdentifierFact) => [type, typeName ?? '', value].join('|');

/** What one P.17 Prize comes to before its Work group's statements of it are reconciled (rules 107-131). */
const prizeDraftOf = (
  context: ProductContext,
  fact: OnixPrizeFact,
  sourceOrder: readonly number[],
): PrizeDraft | null => {
  const names = unique(
    fact.names.flatMap((name) => {
      const text = displayName(name);

      return text === null ? [] : [JSON.stringify([text, name.language])];
    }),
  ).map((serialised): OnixPrizeNameOption => {
    const [name, language] = JSON.parse(serialised) as [string, string | null];

    return { name, language };
  });
  const role = fact.code === null ? null : (ONIX_PRIZE_AWARD_ROLES[fact.code] ?? null);
  const shape = [
    ...(names.length === 0 ? ['PrizeName'] : []),
    ...(fact.code !== null && role === null ? [`PrizeCode ${fact.code}`] : []),
  ];

  if (shape.length > 0) {
    context.findingKeys.push(
      context.findings.add({
        productKey: context.productKey,
        groupKey: context.groupKey,
        componentPath: null,
        code: 'REVIEWS_PRIZES_SHAPE_UNEXPECTED',
        classification: 'PREFLIGHT_GAP',
        blocking: true,
        locations: [locationOf(fact)],
        discriminator: `${fact.path}|${fact.binding}`,
        detail: { element: 'Prize', unexpected: shape },
        message: `A Prize of ${context.describe} states ${names.length === 0 ? 'no PrizeName' : `a PrizeCode (${fact.code}) outside the pinned List 41`}, which canonical validation should have refused; it is not read`,
      }).key,
    );

    return null;
  }

  const country = fact.country === null ? null : (ONIX_PRIZE_COUNTRIES.get(fact.country) ?? null);
  const juries = distinctTexts(fact.juries, normalisePlainText);
  const statements = distinctTexts(fact.statements, normaliseMarkupText);
  const languages = unique(
    [...fact.names, ...fact.juries, ...fact.statements].flatMap(({ language }) => language ?? []),
  );
  const losses = [
    ...(fact.awardingBodies.length > 0
      ? ['its awarding body, which an Award never takes as its title, category or jury']
      : []),
    ...(fact.country !== null && country === null
      ? [`its country (List 91 ${fact.country}), which Thoth has no country for`]
      : []),
    ...(fact.region === null ? [] : [`its region (List 49 ${fact.region}), which never sets the Award's country`]),
    ...(fact.identifiers.length > 0 ? ['its identifiers, kept as source identity only'] : []),
    ...(juries.unusable.length > 0 ? ['a jury whose markup the Award jury, plain text, cannot hold'] : []),
    ...(statements.unusable.length > 0 ? ['a statement whose markup or structure the Award cannot hold'] : []),
    ...(languages.length > 0 ? [`the language of its texts (${languages.join(', ')})`] : []),
  ];
  const opaque = [...fact.names, ...fact.juries, ...fact.statements, ...fact.awardingBodies].some(
    ({ holdsElements: elements }) => elements,
  );

  return {
    productKey: context.productKey,
    factKey: fact.factKey,
    names,
    code: fact.code,
    role,
    year: fact.year,
    country,
    juries: juries.texts,
    statements: statements.texts,
    identifiers: fact.identifiers,
    sequenceNumber: fact.sequenceNumber,
    sourceOrder,
    losses,
    identity: fingerprint([
      statedSemantics(fact.names),
      fact.year,
      statedSemantics(fact.awardingBodies),
      fact.country,
      fact.region,
      fact.code,
      statedSemantics(fact.statements),
      statedSemantics(fact.juries),
      fact.identifiers.map(identifierKeyOf).sort(),
      opaque ? fact.binding : null,
    ]),
    identifierKeys: unique(fact.identifiers.map(identifierKeyOf)),
    location: locationOf(fact),
  };
};

/* ------------------------------------------------------------------------------------------------ */
/* Candidates                                                                                       */
/* ------------------------------------------------------------------------------------------------ */

type ScopeFindings = {
  readonly productKey: string | null;
  readonly groupKey: string;
  readonly componentPath: string | null;
  readonly findings: ReviewsPrizesFindings;
  readonly findingKeys: string[];
  readonly describe: string;
};

const KIND_NAMES: Readonly<Record<OnixReviewCandidateKind, string>> = {
  REVIEW_QUOTE: 'review quote',
  CITED_REVIEW: 'cited review',
  ENDORSEMENT: 'endorsement',
};

const compareOrder = (a: readonly number[], b: readonly number[]): number => {
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);

    if (difference !== 0) return difference;
  }

  return 0;
};

/**
 * One candidate per exactly equal statement in a scope (rules 136-146): repeated in one Product or across a Work group's
 * Products, collapsed with every statement kept as its provenance; any difference keeps them apart. Each gets the decisions
 * its target needs, and the disclosure of what it cannot keep.
 */
const collapseReviewDrafts = (drafts: readonly ReviewDraft[], scope: ScopeFindings): OnixReviewCandidate[] => {
  const bySemantic = new Map<string, ReviewDraft[]>();

  [...drafts]
    .sort((a, b) => compareOrder(a.sourceOrder, b.sourceOrder))
    .forEach((draft) => bySemantic.set(draft.semantic, [...(bySemantic.get(draft.semantic) ?? []), draft]));

  const scopeKey = scope.componentPath === null ? scope.groupKey : `${scope.productKey}|${scope.componentPath}`;
  const add = (finding: Omit<FindingInput, 'productKey' | 'groupKey' | 'componentPath'>) => {
    const added = scope.findings.add({
      ...finding,
      productKey: scope.productKey,
      groupKey: scope.groupKey,
      componentPath: scope.componentPath,
    });

    scope.findingKeys.push(added.key);

    return added;
  };

  return [...bySemantic.values()].map((statements) => {
    const [first] = statements;
    const locations = statements.map(({ location }) => location);
    const candidateKey = `${scopeKey}|${fingerprint([first.semantic, locations.map(({ path }) => path)])}`;
    const noun = KIND_NAMES[first.kind];
    const what = `the ${noun} of ${scope.describe}${first.texts.length > 0 ? ` ("${excerpt(first.texts[0].content)}")` : ''}`;
    const audiences = audienceSetOf(first.audiences);
    const targeted = !first.audiences.includes(UNRESTRICTED_AUDIENCE);

    if (statements.length > 1) {
      add({
        code: 'REVIEW_COLLAPSED',
        classification: 'SUPPORTED_NORMALIZED',
        blocking: false,
        locations,
        discriminator: candidateKey,
        detail: { kind: first.kind, statements: statements.length },
        message: `${statements.length} statements of ${what} say exactly the same, so it is planned once, with every statement kept`,
      });
    }

    // Targeted text is never broadened by itself (rule 19; 5562227566 rules 16-19): imported for everyone only by choice.
    const audienceFindingKey = targeted
      ? add({
          code: 'REVIEW_AUDIENCE_DECISION_REQUIRED',
          classification: 'TARGET_INPUT_REQUIRED',
          blocking: true,
          locations,
          discriminator: candidateKey,
          detail: { kind: first.kind, audiences },
          resolution: {
            kind: 'CHOICE',
            options: [
              { key: ONIX_REVIEWS_PRIZES_PROJECT, label: ONIX_REVIEWS_PRIZES_PROJECT },
              { key: ONIX_REVIEWS_PRIZES_OMIT, label: ONIX_REVIEWS_PRIZES_OMIT },
            ],
          },
          message: `${what} is stated only for targeted audiences (ContentAudience ${audiences.join(', ')}${audiences.includes(SEARCH_INDEX_AUDIENCE) ? `; ${SEARCH_INDEX_NOTE}` : ''}), never for everyone; import it for everyone only by choosing it, or import none`,
        }).key
      : null;

    let textFindingKey: string | null = null;

    if (first.textUnrepresentable) {
      textFindingKey = add({
        code: 'REVIEW_TEXT_UNREPRESENTABLE',
        classification: 'TARGET_UNREPRESENTABLE',
        blocking: true,
        locations,
        discriminator: candidateKey,
        detail: { kind: first.kind },
        resolution: { kind: 'ACKNOWLEDGE' },
        message: `The text of the ${noun} of ${scope.describe} holds markup or structure Thoth cannot represent without inventing or losing content, so the ${noun} cannot be imported; acknowledge that it is left out`,
      }).key;
    } else if (first.texts.length > 1) {
      textFindingKey = add({
        code: 'REVIEW_TEXT_CHOICE_REQUIRED',
        classification: 'TARGET_INPUT_REQUIRED',
        blocking: true,
        locations,
        discriminator: candidateKey,
        detail: { kind: first.kind, languages: first.texts.map(({ language }) => language ?? '') },
        resolution: {
          kind: 'CHOICE',
          options: [
            ...first.texts.map(
              (text): OnixPlanFindingOption => ({
                key: `T${fingerprint([text.content, text.markupFormat, text.language])}`,
                label: `${text.language === null ? '' : `${text.language}: `}${excerpt(text.content)}`,
              }),
            ),
            { key: ONIX_REVIEWS_PRIZES_OMIT, label: ONIX_REVIEWS_PRIZES_OMIT },
          ],
        },
        message: `The ${noun} of ${scope.describe} states ${first.texts.length} different texts, and Thoth holds one text with no language; choose the one to import, or import none`,
      }).key;
    }

    let attributionFindingKey: string | null = null;

    if (first.kind === 'ENDORSEMENT' && first.attributions.length === 0) {
      attributionFindingKey = add({
        code: 'ENDORSEMENT_ATTRIBUTION_MISSING',
        classification: 'TARGET_INPUT_REQUIRED',
        blocking: true,
        locations,
        discriminator: candidateKey,
        detail: { kind: first.kind },
        resolution: { kind: 'ACKNOWLEDGE' },
        message: `${what} names no TextAuthor and no TextSourceCorporate, and an Endorsement needs an author name; none is ever invented - acknowledge that it is left out`,
      }).key;
    } else if (first.kind === 'ENDORSEMENT' && first.attributions.length > 1) {
      attributionFindingKey = add({
        code: 'ENDORSEMENT_ATTRIBUTION_CHOICE_REQUIRED',
        classification: 'TARGET_INPUT_REQUIRED',
        blocking: true,
        locations,
        discriminator: candidateKey,
        detail: { kind: first.kind, basis: first.attributionBasis ?? '' },
        resolution: {
          kind: 'CHOICE',
          options: [
            ...first.attributions.map((name) => ({ key: `A${fingerprint(name)}`, label: name })),
            { key: ONIX_REVIEWS_PRIZES_OMIT, label: ONIX_REVIEWS_PRIZES_OMIT },
          ],
        },
        message: `${what} names ${first.attributions.length} ${first.attributionBasis === 'TEXT_AUTHOR' ? 'authors' : 'corporate sources'}, and an Endorsement holds one author name; they are never joined - choose the one it is attributed to, or import none`,
      }).key;
    } else if (first.kind === 'REVIEW_QUOTE' && first.attributions.length > 1) {
      add({
        code: 'REVIEW_AUTHOR_NOT_IMPORTED',
        classification: 'TARGET_UNREPRESENTABLE',
        blocking: false,
        locations,
        discriminator: candidateKey,
        detail: { kind: first.kind, authors: first.attributions.length },
        message: `${what} names ${first.attributions.length} authors, and a BookReview holds one author name; they are never joined, so it keeps none`,
      });
    }

    const linkFindingKey =
      first.links.length > 1
        ? add({
            code: 'REVIEW_LINK_CHOICE_REQUIRED',
            classification: 'TARGET_INPUT_REQUIRED',
            blocking: true,
            locations,
            discriminator: candidateKey,
            detail: { kind: first.kind, links: first.links.length },
            resolution: {
              kind: 'CHOICE',
              options: [
                ...first.links.map((link) => ({ key: `L${fingerprint(link)}`, label: link })),
                first.kind === 'CITED_REVIEW'
                  ? { key: ONIX_REVIEWS_PRIZES_OMIT, label: ONIX_REVIEWS_PRIZES_OMIT }
                  : { key: ONIX_REVIEWS_PRIZES_NONE, label: ONIX_REVIEWS_PRIZES_NONE },
              ],
            },
            message: `${what} states ${first.links.length} different links, and Thoth holds one; none is ever taken by source order - choose the one to keep, or ${first.kind === 'CITED_REVIEW' ? 'import none' : 'keep none'}`,
          }).key
        : null;

    const losses = unique(statements.flatMap(({ losses: lost }) => lost));

    if (losses.length > 0) {
      add({
        code: 'REVIEW_DETAIL_NOT_IMPORTED',
        classification: 'SUPPORTED_WITH_WARNING',
        blocking: false,
        locations,
        discriminator: candidateKey,
        detail: { kind: first.kind, losses },
        message: `${what} contains details ${first.kind === 'ENDORSEMENT' ? 'an Endorsement' : 'a BookReview'} cannot hold; if this item is imported, those details are not imported: ${losses.join('; ')}`,
      });
    }

    return {
      candidateKey,
      kind: first.kind,
      groupKey: scope.groupKey,
      componentPath: scope.componentPath,
      productKeys: unique(statements.map(({ productKey }) => productKey)),
      factKeys: statements.map(({ factKey }) => factKey),
      sourceCode: first.sourceCode,
      audience: targeted ? 'TARGETED' : 'UNRESTRICTED',
      audiences: first.audiences,
      texts: first.texts,
      attributions: first.attributions,
      attributionBasis: first.attributionBasis,
      links: first.links,
      reviewDate: first.reviewDate,
      sequenceNumbers: unique(statements.flatMap(({ sequenceNumber }) => sequenceNumber ?? [])),
      sourceOrder: first.sourceOrder,
      losses,
      audienceFindingKey,
      textFindingKey,
      attributionFindingKey,
      linkFindingKey,
      pairingFindingKey: null,
      locations,
    };
  });
};

/**
 * One candidate per P.17 Prize of a Work group (rules 126-128, 140-145): statements with exactly equal facts are one, however
 * many Products state them; statements sharing a PrizeIdentifier but stating anything different are a contradiction the
 * file must resolve. Nothing is merged by name or year alone.
 */
const collapsePrizeDrafts = (drafts: readonly PrizeDraft[], scope: ScopeFindings): OnixPrizeCandidate[] => {
  const byIdentity = new Map<string, PrizeDraft[]>();

  [...drafts]
    .sort((a, b) => compareOrder(a.sourceOrder, b.sourceOrder))
    .forEach((draft) => byIdentity.set(draft.identity, [...(byIdentity.get(draft.identity) ?? []), draft]));

  const groups = [...byIdentity.values()];
  const add = (finding: Omit<FindingInput, 'productKey' | 'groupKey' | 'componentPath'>) => {
    const added = scope.findings.add({ ...finding, productKey: null, groupKey: scope.groupKey, componentPath: null });

    scope.findingKeys.push(added.key);

    return added;
  };
  const candidateKeyOf = (statements: readonly PrizeDraft[]) =>
    `${scope.groupKey}|${fingerprint([statements[0].identity, statements.map(({ location }) => location.path)])}`;

  // Which collapsed prizes share a strong PrizeIdentifier while stating different facts (rule 128).
  const conflictOf = new Map<number, string>();

  groups.forEach((statements, index) => {
    const identifiers = new Set(statements[0].identifierKeys);
    const sharing = groups
      .map((other, otherIndex) => ({ other, otherIndex }))
      .filter(
        ({ other, otherIndex }) =>
          otherIndex !== index && other[0].identifierKeys.some((identifier) => identifiers.has(identifier)),
      );

    if (sharing.length === 0) return;

    const involved = [statements, ...sharing.map(({ other }) => other)].sort((a, b) =>
      compareOrder(a[0].sourceOrder, b[0].sourceOrder),
    );
    const finding = add({
      code: 'PRIZE_IDENTIFIER_CONFLICT',
      classification: 'SOURCE_CONFLICT',
      blocking: true,
      locations: involved.flatMap((group) => group.map(({ location }) => location)),
      discriminator: fingerprint(involved.map(candidateKeyOf).sort()),
      detail: {
        identifiers: [...identifiers].filter((identifier) =>
          sharing.some(({ other }) => other[0].identifierKeys.includes(identifier)),
        ),
      },
      message: `${involved.length} Prizes of ${scope.describe} share a PrizeIdentifier but state different facts, so none of them can be planned until the file says which prize it is; none is taken by source order`,
    });

    conflictOf.set(index, finding.key);
  });

  return groups.map((statements, index) => {
    const [first] = statements;
    const locations = statements.map(({ location }) => location);
    const candidateKey = candidateKeyOf(statements);
    const what = `the Prize "${first.names[0].name}" of ${scope.describe}`;

    if (statements.length > 1) {
      add({
        code: 'PRIZE_COLLAPSED',
        classification: 'SUPPORTED_NORMALIZED',
        blocking: false,
        locations,
        discriminator: candidateKey,
        detail: { statements: statements.length },
        message: `${statements.length} statements of ${what} say exactly the same, so it is planned once, with every statement kept`,
      });
    }

    const scopeFindingKey = add({
      code: 'PRIZE_SCOPE_REQUIRED',
      classification: 'TARGET_INPUT_REQUIRED',
      blocking: true,
      locations,
      discriminator: candidateKey,
      detail: { names: first.names.map(({ name }) => name) },
      resolution: {
        kind: 'CHOICE',
        options: [
          { key: ONIX_PRIZE_WORK_AWARD, label: ONIX_PRIZE_WORK_AWARD },
          { key: ONIX_PRIZE_PRODUCT_AWARD, label: ONIX_PRIZE_PRODUCT_AWARD },
        ],
      },
      message: `ONIX states ${what} for the Product, which may mean the Work it manifests or this manifestation alone; Thoth holds an Award only for a Work - say which it was won by. Nothing is assumed from its name, the product form or what such prizes usually are`,
    }).key;
    const choice = (
      code: 'PRIZE_NAME_CHOICE_REQUIRED' | 'PRIZE_JURY_CHOICE_REQUIRED' | 'PRIZE_STATEMENT_CHOICE_REQUIRED',
      options: readonly OnixPlanFindingOption[],
      last: typeof ONIX_REVIEWS_PRIZES_OMIT | typeof ONIX_REVIEWS_PRIZES_NONE,
      message: string,
    ) =>
      add({
        code,
        classification: 'TARGET_INPUT_REQUIRED',
        blocking: true,
        locations,
        discriminator: candidateKey,
        resolution: { kind: 'CHOICE', options: [...options, { key: last, label: last }] },
        message,
      }).key;
    const textOptions = (prefix: string, texts: readonly OnixReviewsPrizesText[]) =>
      texts.map((text) => ({
        key: `${prefix}${fingerprint([text.content, text.markupFormat, text.language])}`,
        label: `${text.language === null ? '' : `${text.language}: `}${excerpt(text.content)}`,
      }));
    const losses = unique(statements.flatMap(({ losses: lost }) => lost));

    if (losses.length > 0) {
      add({
        code: 'PRIZE_DETAIL_NOT_IMPORTED',
        classification: 'SUPPORTED_WITH_WARNING',
        blocking: false,
        locations,
        discriminator: candidateKey,
        detail: { losses },
        message: `Imported as a Work Award, ${what} keeps only what an Award holds; the rest is not imported: ${losses.join('; ')}`,
      });
    }

    return {
      candidateKey,
      groupKey: scope.groupKey,
      productKeys: unique(statements.map(({ productKey }) => productKey)),
      factKeys: statements.map(({ factKey }) => factKey),
      names: first.names,
      code: first.code,
      role: first.role,
      year: first.year,
      country: first.country,
      juries: first.juries,
      statements: first.statements,
      identifiers: first.identifiers,
      sequenceNumbers: unique(statements.flatMap(({ sequenceNumber }) => sequenceNumber ?? [])),
      sourceOrder: first.sourceOrder,
      losses,
      scopeFindingKey,
      nameFindingKey:
        first.names.length > 1
          ? choice(
              'PRIZE_NAME_CHOICE_REQUIRED',
              first.names.map(({ name, language }) => ({
                key: `N${fingerprint([name, language])}`,
                label: `${language === null ? '' : `${language}: `}${name}`,
              })),
              ONIX_REVIEWS_PRIZES_OMIT,
              `${what} states ${first.names.length} different names, and an Award holds one title with no language; none is taken by language or order - choose the title, or import no Award`,
            )
          : null,
      juryFindingKey:
        first.juries.length > 1
          ? choice(
              'PRIZE_JURY_CHOICE_REQUIRED',
              textOptions('J', first.juries),
              ONIX_REVIEWS_PRIZES_NONE,
              `${what} states ${first.juries.length} different juries, and an Award holds one; they are never joined - choose the one to keep, or keep none`,
            )
          : null,
      statementFindingKey:
        first.statements.length > 1
          ? choice(
              'PRIZE_STATEMENT_CHOICE_REQUIRED',
              textOptions('S', first.statements),
              ONIX_REVIEWS_PRIZES_NONE,
              `${what} states ${first.statements.length} different statements, and an Award holds one with no language; choose the one to keep, or keep none`,
            )
          : null,
      conflictFindingKey: conflictOf.get(index) ?? null,
      locations,
    };
  });
};

/** How a candidate's source construct numbers it: a SequenceNumber orders only among statements of one construct. */
const CONSTRUCTS: Readonly<Record<OnixReviewCandidateKind | 'PRIZE', string>> = {
  REVIEW_QUOTE: 'TextContent',
  ENDORSEMENT: 'TextContent',
  CITED_REVIEW: 'CitedContent',
  PRIZE: 'Prize',
};

/** A SequenceNumber Thoth can store as an ordinal: a whole number of 1 or more that fits a PostgreSQL `integer`. */
const ordinalOf = (sequenceNumber: string): number | null => {
  const value = /^\d+$/.test(sequenceNumber) ? Number(sequenceNumber) : Number.NaN;

  return Number.isSafeInteger(value) && value >= 1 && value <= MAX_ORDINAL ? value : null;
};

type Orderable = {
  readonly candidateKey: string;
  readonly construct: string;
  readonly sequenceNumbers: readonly string[];
  readonly sourceOrder: readonly number[];
  readonly locations: readonly OnixSourceLocation[];
};

const CHILD_NAMES: Readonly<Record<OnixReviewsPrizesChild, string>> = {
  BOOK_REVIEW: 'BookReviews',
  ENDORSEMENT: 'Endorsements',
  AWARD: 'Awards',
};

/**
 * How one scope's candidates of one child type are ordered (rules 132-135, 147-150): every candidate's one valid SequenceNumber,
 * unique among them and all of one construct; or, where none states one, their stable source order as an explicit target
 * display normalisation. Anything else - some numbered and some not, numbers repeated or contradicted across grouped
 * Products, or numbered statements of two constructs, whose sequences are unrelated - waits on the publisher's consent to the
 * file order. It is decided over every candidate, whatever the publisher decides about each, so its key never moves.
 */
const orderingOf = (
  child: OnixReviewsPrizesChild,
  members: readonly Orderable[],
  scope: ScopeFindings,
): OnixReviewsPrizesOrdering => {
  if (members.length === 0) return { status: 'EMPTY' };

  const ranked = [...members].sort((a, b) => compareOrder(a.sourceOrder, b.sourceOrder));
  const sourceOrdinals = Object.fromEntries(ranked.map(({ candidateKey }, index) => [candidateKey, index + 1]));
  const numbered = ranked.filter(({ sequenceNumbers }) => sequenceNumbers.length > 0);

  if (numbered.length === 0) {
    return { status: 'RESOLVED', basis: 'SOURCE_ORDER_TARGET_NORMALIZATION', ordinals: sourceOrdinals };
  }

  const numbers = ranked.flatMap(({ sequenceNumbers }) => sequenceNumbers);
  const ordinals = ranked.map(({ sequenceNumbers }) => unique(sequenceNumbers.map(ordinalOf)));
  const reason =
    unique(ranked.map(({ construct }) => construct)).length > 1
      ? 'MIXED_CONSTRUCTS'
      : numbered.length < ranked.length
        ? 'MIXED_NUMBERING'
        : ordinals.some((values) => values.includes(null))
          ? 'INVALID_NUMBERS'
          : ordinals.some((values) => values.length > 1)
            ? 'CONFLICTING_NUMBERS'
            : unique(ordinals.map(([value]) => value)).length < ranked.length
              ? 'DUPLICATE_NUMBERS'
              : null;

  if (reason === null) {
    return {
      status: 'RESOLVED',
      basis: 'SEQUENCE_NUMBER',
      ordinals: Object.fromEntries(
        ranked.map(({ candidateKey }, index) => [candidateKey, ordinals[index][0] as number]),
      ),
    };
  }

  const finding = scope.findings.add({
    productKey: scope.productKey,
    groupKey: scope.groupKey,
    componentPath: scope.componentPath,
    code: 'REVIEWS_PRIZES_ORDER_UNRESOLVED',
    classification:
      reason === 'MIXED_NUMBERING' || reason === 'MIXED_CONSTRUCTS' ? 'TARGET_INPUT_REQUIRED' : 'SOURCE_CONFLICT',
    blocking: true,
    locations: ranked.flatMap(({ locations }) => locations),
    discriminator: `${child}|${fingerprint(ranked.map(({ candidateKey, sequenceNumbers }) => [candidateKey, sequenceNumbers]))}`,
    detail: { child, reason, sequenceNumbers: numbers },
    resolution: { kind: 'ACKNOWLEDGE' },
    message: `The ${CHILD_NAMES[child]} of ${scope.describe} cannot be ordered from the file: ${ORDER_EXPLANATIONS[reason]}. No position is ever left to a default; acknowledge to order them as the file lists them`,
  });

  scope.findingKeys.push(finding.key);

  return { status: 'UNRESOLVED', reason, findingKey: finding.key, sourceOrdinals };
};

const ORDER_EXPLANATIONS: Readonly<
  Record<Extract<OnixReviewsPrizesOrdering, { status: 'UNRESOLVED' }>['reason'], string>
> = {
  MIXED_NUMBERING: 'some state a SequenceNumber and some do not',
  DUPLICATE_NUMBERS: 'several state the same SequenceNumber',
  CONFLICTING_NUMBERS: 'grouped products give one of them different SequenceNumbers',
  INVALID_NUMBERS: 'a SequenceNumber is not a whole number of 1 or more Thoth can store',
  MIXED_CONSTRUCTS: 'they come from TextContent and CitedContent, whose SequenceNumbers are unrelated',
};

/**
 * Every cited review's optional pairing with one review quote of its scope (rule 75): offered only where both are imported
 * for everyone and no field either would set contradicts the other's - one link at most between them, and one date. Never
 * applied unless chosen, and nothing starts chosen.
 */
const withPairings = (reviews: readonly OnixReviewCandidate[], scope: ScopeFindings): OnixReviewCandidate[] => {
  const quotes = reviews.filter(({ kind, audience }) => kind === 'REVIEW_QUOTE' && audience === 'UNRESTRICTED');

  return reviews.map((candidate) => {
    if (candidate.kind !== 'CITED_REVIEW' || candidate.audience !== 'UNRESTRICTED') return candidate;

    const compatible = quotes.filter(
      (quote) =>
        (quote.links.length === 0 ||
          candidate.links.length === 0 ||
          (quote.links.length === 1 && candidate.links.length === 1 && quote.links[0] === candidate.links[0])) &&
        (quote.reviewDate === null || candidate.reviewDate === null || quote.reviewDate === candidate.reviewDate),
    );

    if (compatible.length === 0) return candidate;

    const finding = scope.findings.add({
      productKey: scope.productKey,
      groupKey: scope.groupKey,
      componentPath: scope.componentPath,
      code: 'REVIEW_PAIRING_AVAILABLE',
      classification: 'SUPPORTED_NORMALIZED',
      blocking: false,
      locations: candidate.locations,
      discriminator: `${candidate.candidateKey}|${fingerprint(compatible.map(({ candidateKey }) => candidateKey))}`,
      detail: { links: candidate.links },
      resolution: {
        kind: 'CHOICE',
        options: compatible.map(({ candidateKey, texts }) => ({
          key: candidateKey,
          label: texts.length === 0 ? candidateKey : excerpt(texts[0].content),
        })),
      },
      message: `The cited review of ${scope.describe} at ${candidate.links.join(', ')} is never assumed to be the same review as a review quote; if it is, pair it with that quote and one BookReview is planned from both`,
    });

    scope.findingKeys.push(finding.key);

    return { ...candidate, pairingFindingKey: finding.key };
  });
};

/** The candidates of one scope, with their pairings and the order of each child type. */
const candidatesOf = (
  reviewDrafts: readonly ReviewDraft[],
  prizeDrafts: readonly PrizeDraft[],
  scope: ScopeFindings,
): OnixReviewsPrizesCandidates => {
  const collapsed = collapseReviewDrafts(reviewDrafts, scope);
  const reviews = withPairings(
    collapsed.filter(({ kind }) => kind !== 'ENDORSEMENT'),
    scope,
  );
  const endorsements = collapsed.filter(({ kind }) => kind === 'ENDORSEMENT');
  const prizes = collapsePrizeDrafts(prizeDrafts, scope);
  const orderable = (candidate: OnixReviewCandidate | OnixPrizeCandidate): Orderable => ({
    candidateKey: candidate.candidateKey,
    construct: CONSTRUCTS['kind' in candidate ? candidate.kind : 'PRIZE'],
    sequenceNumbers: candidate.sequenceNumbers,
    sourceOrder: candidate.sourceOrder,
    locations: candidate.locations,
  });

  return {
    reviews,
    endorsements,
    prizes,
    ordering: {
      BOOK_REVIEW: orderingOf('BOOK_REVIEW', reviews.map(orderable), scope),
      ENDORSEMENT: orderingOf('ENDORSEMENT', endorsements.map(orderable), scope),
      AWARD: orderingOf('AWARD', prizes.map(orderable), scope),
    },
  };
};

/* ------------------------------------------------------------------------------------------------ */
/* Reduction                                                                                        */
/* ------------------------------------------------------------------------------------------------ */

/** The rank of each construct in a CollateralDetail or ContentItem, as ONIX orders them: its stable source order. */
const TEXT_CONTENT_RANK = 0;
const CITED_CONTENT_RANK = 1;
const PRIZE_RANK = 2;

export const reduceOnixReviewsPrizes = (
  root: ExtendedONIXMessageRoot,
  sourcePlan: OnixSourcePlan,
  collateral: OnixCollateralPlan,
  options: ReduceOnixReviewsPrizesOptions = {},
): OnixReviewsPrizesPlan => {
  const locate: Locate = (path) => ({ path, sourcePath: options.provenance?.sourcePathOf(path) ?? path });
  const findings = new ReviewsPrizesFindings();
  const productValues = toOnixArray(root.ONIXMessage?.Product);
  const recordByKey = new Map(sourcePlan.records.map((record) => [record.recordKey, record]));
  const products: Record<string, OnixProductReviewsPrizes> = {};
  const reviewDraftsByGroup = new Map<string, ReviewDraft[]>();
  const prizeDraftsByGroup = new Map<string, PrizeDraft[]>();
  const componentCandidates: Record<string, OnixReviewsPrizesCandidates> = {};
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
        index: record.index,
        describe: describeRecord(record.index, record.recordReference),
        locate,
        findings,
        findingKeys: [],
      };
      const componentKinds = new Map(node.contentItems.map(({ path, kind }) => [path, kind]));
      const whereOf = (scope: OnixReviewsPrizesScope) =>
        scope.kind === 'COMPONENT'
          ? `content item ${scope.componentPath.replace(/^.*\[(\d+)\]$/, '$1')} of ${context.describe}`
          : context.describe;
      const orderOf = (scope: OnixReviewsPrizesScope, rank: number, position: number) => [
        record.index,
        scope.kind === 'COMPONENT' ? Number(scope.componentPath.replace(/^.*\[(\d+)\]$/, '$1')) : 0,
        rank,
        position,
      ];

      describeByProduct.set(node.productKey, context.describe);

      /* Review and endorsement TextContents: the collateral reduction's own facts, never re-read (thoth-app#225). */
      const reviewTexts = (collateral.products[node.productKey]?.textContents ?? []).filter(
        ({ role }) => role === 'REVIEW',
      );
      /* CitedContent and Prize, which no merged reducer reads: every one, where it is stated. */
      const citedContents: OnixCitedContentFact[] = [];
      const prizes: OnixPrizeFact[] = [];
      const contributorPrizes: OnixPrizeFact[] = [];

      children(recordOccurrence, 'CollateralDetail').forEach((detail) => {
        children(detail, 'CitedContent').forEach((occurrence, index) =>
          citedContents.push(citedContentFactOf(context, occurrence, { kind: 'PRODUCT' }, index + 1)),
        );
        children(detail, 'Prize').forEach((occurrence, index) =>
          prizes.push(prizeFactOf(context, occurrence, { kind: 'PRODUCT' }, index + 1)),
        );
      });
      children(recordOccurrence, 'ContentDetail').forEach((detail) =>
        children(detail, 'ContentItem').forEach((item) =>
          children(item, 'CitedContent').forEach((occurrence, index) =>
            citedContents.push(
              citedContentFactOf(
                context,
                occurrence,
                {
                  kind: 'COMPONENT',
                  componentPath: item.path,
                  componentKind: componentKinds.get(item.path) ?? 'UNSUPPORTED',
                },
                index + 1,
              ),
            ),
          ),
        ),
      );
      contributorsIn(recordOccurrence).forEach((contributor) =>
        children(contributor, 'Prize').forEach((occurrence, index) => {
          const componentPath =
            node.contentItems.find(({ path }) => contributor.path.startsWith(`${path}/`))?.path ?? null;

          contributorPrizes.push(
            prizeFactOf(
              context,
              occurrence,
              { kind: 'CONTRIBUTOR', contributorPath: contributor.path, componentPath },
              index + 1,
            ),
          );
        }),
      );

      /* What each fact is to its target. */
      const workReviewDrafts: ReviewDraft[] = [];
      const componentReviewDrafts = new Map<string, ReviewDraft[]>();
      const keep = (scope: OnixReviewsPrizesScope, draft: ReviewDraft | null) => {
        if (draft === null) return;

        if (scope.kind === 'PRODUCT') workReviewDrafts.push(draft);
        else
          componentReviewDrafts.set(scope.componentPath, [
            ...(componentReviewDrafts.get(scope.componentPath) ?? []),
            draft,
          ]);
      };

      reviewTexts.forEach((fact) => {
        const scope = reviewScopeOf(fact.scope);

        if (scope !== null) {
          keep(
            scope,
            reviewTextDraftOf(context, fact, scope, whereOf(scope), orderOf(scope, TEXT_CONTENT_RANK, fact.position)),
          );
        }
      });
      citedContents.forEach((fact) =>
        keep(
          fact.scope,
          citedDraftOf(context, fact, whereOf(fact.scope), orderOf(fact.scope, CITED_CONTENT_RANK, fact.position)),
        ),
      );

      const prizeDrafts = prizes.flatMap(
        (fact) => prizeDraftOf(context, fact, orderOf({ kind: 'PRODUCT' }, PRIZE_RANK, fact.position)) ?? [],
      );

      // A Contributor's Prize is a body-of-work award: never offered a Work scope, never a Work Award (rules 24, 26, 106).
      contributorPrizes.forEach((fact) =>
        context.findingKeys.push(
          findings.add({
            productKey: node.productKey,
            groupKey: node.groupKey,
            componentPath: fact.scope.kind === 'CONTRIBUTOR' ? fact.scope.componentPath : null,
            code: 'CONTRIBUTOR_PRIZE_UNREPRESENTABLE',
            classification: 'TARGET_UNREPRESENTABLE',
            blocking: false,
            locations: [locationOf(fact)],
            discriminator: `${fact.path}|${fact.binding}`,
            detail: { names: fact.names.flatMap((name) => displayName(name) ?? []) },
            message: `A Prize of a contributor of ${context.describe}${fact.names.length > 0 ? ` ("${displayName(fact.names[0]) ?? ''}")` : ''} was won by that contributor for a body of work: Thoth holds no contributor award, and it never becomes an Award of this Work`,
          }).key,
        ),
      );

      /* A contained Work's own candidates (rule 155): its ContentItem's, never the parent's. */
      [...componentReviewDrafts].forEach(([componentPath, drafts]) => {
        componentCandidates[`${node.productKey}|${componentPath}`] = candidatesOf(drafts, [], {
          productKey: node.productKey,
          groupKey: node.groupKey,
          componentPath,
          findings,
          findingKeys: context.findingKeys,
          describe: `content item ${componentPath.replace(/^.*\[(\d+)\]$/, '$1')} of ${context.describe}`,
        });
      });

      reviewDraftsByGroup.set(node.groupKey, [...(reviewDraftsByGroup.get(node.groupKey) ?? []), ...workReviewDrafts]);
      prizeDraftsByGroup.set(node.groupKey, [...(prizeDraftsByGroup.get(node.groupKey) ?? []), ...prizeDrafts]);

      products[node.productKey] = {
        productKey: node.productKey,
        groupKey: node.groupKey,
        textContentFactKeys: reviewTexts.map(({ factKey }) => factKey),
        citedContents,
        prizes,
        contributorPrizes,
        findingKeys: context.findingKeys,
      };
    });

  /* The Work candidates of each group, reconciled across its Products (rules 136-146). */
  const workCandidates = Object.fromEntries(
    sourcePlan.groups.map(({ groupKey, productKeys }) => [
      groupKey,
      candidatesOf(reviewDraftsByGroup.get(groupKey) ?? [], prizeDraftsByGroup.get(groupKey) ?? [], {
        productKey: null,
        groupKey,
        componentPath: null,
        findings,
        findingKeys: [],
        describe:
          productKeys.length > 1
            ? `the Work of ${productKeys.length} grouped products`
            : (describeByProduct.get(productKeys[0]) ?? 'its product'),
      }),
    ]),
  );

  return { products, workCandidates, componentCandidates, findings: findings.all() };
};

/* ------------------------------------------------------------------------------------------------ */
/* Resolution                                                                                       */
/* ------------------------------------------------------------------------------------------------ */

type ChoiceMap = Readonly<Record<string, string>>;

export type ResolveOnixReviewsPrizesOptions = {
  readonly choices?: ChoiceMap;
  /** How the scope is named in a finding the answers raise. */
  readonly describe: string;
};

/** The reviews, endorsements and awards one Work, chapter or contained Work gets with the publisher's answers. */
export type OnixResolvedReviewsPrizes = {
  readonly bookReviews: readonly OnixBookReviewIntent[];
  readonly endorsements: readonly OnixEndorsementIntent[];
  readonly awards: readonly OnixAwardIntent[];
  /** Every finding that applies to the scope - the reduction's and those only the answers raised - answered or not. */
  readonly findingKeys: readonly string[];
  /** The blocking findings of the scope still unanswered, or answered with a value the plan cannot use. */
  readonly pendingFindingKeys: readonly string[];
  /** Findings only the answers raised: a Product award, a pairing contradiction, every deferral. */
  readonly raised: readonly OnixReviewsPrizesFinding[];
};

/** A plan's findings by key, built once per plan: resolution runs again for every decision. */
const indexes = new WeakMap<OnixReviewsPrizesPlan, ReadonlyMap<string, OnixReviewsPrizesFinding>>();

const findingIndexOf = (plan: OnixReviewsPrizesPlan): ReadonlyMap<string, OnixReviewsPrizesFinding> => {
  const cached = indexes.get(plan);

  if (cached !== undefined) return cached;

  const index = new Map(plan.findings.map((finding) => [finding.key, finding]));

  indexes.set(plan, index);

  return index;
};

/** The answer to a finding, when it is one the finding offers; null when unanswered or answered with anything else. */
const answerOf = (finding: OnixReviewsPrizesFinding | undefined, choices: ChoiceMap): string | null => {
  if (finding === undefined) return null;

  const answer = choices[finding.key];

  return answer !== undefined && isOfferedOnixReviewsPrizesAnswer(finding, answer) ? answer : null;
};

type ReviewValues = {
  readonly text: OnixReviewsPrizesText | null;
  readonly attribution: string | null;
  readonly url: string | null;
};

type Settled<T> = { readonly status: 'INCLUDED'; readonly values: T } | { readonly status: 'OMITTED' | 'PENDING' };

const EMPTY_CANDIDATES: OnixReviewsPrizesCandidates = {
  reviews: [],
  endorsements: [],
  prizes: [],
  ordering: { BOOK_REVIEW: { status: 'EMPTY' }, ENDORSEMENT: { status: 'EMPTY' }, AWARD: { status: 'EMPTY' } },
};

type ScopeInput = {
  readonly groupKey: string;
  readonly productKey: string | null;
  readonly componentPath: string | null;
  readonly candidates: OnixReviewsPrizesCandidates;
  /** Every finding of the reduction that applies to the scope, in the order raised. */
  readonly findingKeys: readonly string[];
};

/**
 * What one scope's candidates come to with the publisher's answers (rules 37-150): each review, endorsement and Work award
 * the source or the publisher settles, in its explicit order, each waiting on #187. A decision answered with an omission
 * settles its candidate as nothing; one unanswered holds it. Nothing is ever taken by source order where a choice is due.
 */
const resolveScope = (
  plan: OnixReviewsPrizesPlan,
  input: ScopeInput,
  options: ResolveOnixReviewsPrizesOptions,
): OnixResolvedReviewsPrizes => {
  const choices = options.choices ?? {};
  const byKey = findingIndexOf(plan);
  const findings = new ReviewsPrizesFindings();
  const pending: string[] = [];
  const scope = { productKey: input.productKey, groupKey: input.groupKey, componentPath: input.componentPath };
  const scopeKey = [input.groupKey, input.productKey ?? '', input.componentPath ?? ''].join('|');
  const wait = (key: string) => {
    if (!pending.includes(key)) pending.push(key);
  };
  const { candidates } = input;
  /** Every decision a candidate names, answered or not: each settles it, omits it, or holds it. */
  const settle = <T>(
    keys: readonly (string | null)[],
    values: (answers: ReadonlyMap<string, string>) => T,
  ): Settled<T> => {
    const answers = new Map<string, string>();
    const unanswered: string[] = [];

    keys.forEach((key) => {
      if (key === null) return;

      const answer = answerOf(byKey.get(key), choices);

      if (answer === null) unanswered.push(key);
      else answers.set(key, answer);
    });

    // An omission settles the candidate, whatever else about it is still unanswered.
    if ([...answers.values()].some((answer) => answer === ONIX_REVIEWS_PRIZES_OMIT)) return { status: 'OMITTED' };

    // An acknowledged loss of its only text, or of any attribution, omits it too.
    if (
      [...answers].some(
        ([key, answer]) =>
          answer === ONIX_REVIEWS_PRIZES_ACKNOWLEDGED &&
          (byKey.get(key)?.code === 'REVIEW_TEXT_UNREPRESENTABLE' ||
            byKey.get(key)?.code === 'ENDORSEMENT_ATTRIBUTION_MISSING'),
      )
    ) {
      return { status: 'OMITTED' };
    }

    if (unanswered.length > 0) {
      unanswered.forEach(wait);

      return { status: 'PENDING' };
    }

    return { status: 'INCLUDED', values: values(answers) };
  };
  const answerFor = (findingKey: string | null, answers: ReadonlyMap<string, string>) =>
    findingKey === null ? null : (answers.get(findingKey) ?? null);
  const textKey = (prefix: string, text: OnixReviewsPrizesText) =>
    `${prefix}${fingerprint([text.content, text.markupFormat, text.language])}`;

  const reviewValues = (candidate: OnixReviewCandidate): Settled<ReviewValues> =>
    settle(
      [
        candidate.audienceFindingKey,
        candidate.textFindingKey,
        candidate.attributionFindingKey,
        candidate.linkFindingKey,
      ],
      (answers) => {
        const textAnswer = answerFor(candidate.textFindingKey, answers);
        const attributionAnswer = answerFor(candidate.attributionFindingKey, answers);
        const linkAnswer = answerFor(candidate.linkFindingKey, answers);

        return {
          text:
            candidate.textFindingKey === null
              ? (candidate.texts[0] ?? null)
              : (candidate.texts.find((text) => textKey('T', text) === textAnswer) ?? null),
          attribution:
            candidate.attributionFindingKey === null
              ? candidate.attributions.length === 1
                ? candidate.attributions[0]
                : null
              : (candidate.attributions.find((name) => `A${fingerprint(name)}` === attributionAnswer) ?? null),
          url:
            candidate.linkFindingKey === null
              ? (candidate.links[0] ?? null)
              : (candidate.links.find((link) => `L${fingerprint(link)}` === linkAnswer) ?? null),
        };
      },
    );

  /* Orders: each child type's, or the publisher's consent to the file order where the source cannot give one. */
  const orderOf = (child: OnixReviewsPrizesChild, planned: boolean) => {
    const ordering = candidates.ordering[child];

    if (ordering.status === 'EMPTY') return null;

    if (ordering.status === 'RESOLVED') return { ordinals: ordering.ordinals, basis: ordering.basis };

    // An unresolved order holds the scope only where a child of that type is actually planned.
    if (!planned) return null;

    if (answerOf(byKey.get(ordering.findingKey), choices) === ONIX_REVIEWS_PRIZES_ACKNOWLEDGED) {
      return { ordinals: ordering.sourceOrdinals, basis: 'PUBLISHER_FILE_ORDER' as OnixReviewsPrizesOrderBasis };
    }

    wait(ordering.findingKey);

    return null;
  };

  /* Reviews: each settled on its own, then the pairings the publisher chose between a quote and a cited review. */
  const settledReviews = new Map(
    candidates.reviews.map((candidate) => [candidate.candidateKey, reviewValues(candidate)]),
  );
  const pairedWith = new Map<string, string>();
  const chosenBy = new Map<string, string[]>();

  candidates.reviews.forEach((candidate) => {
    if (candidate.pairingFindingKey === null) return;

    const quoteKey = answerOf(byKey.get(candidate.pairingFindingKey), choices);

    if (quoteKey !== null) chosenBy.set(quoteKey, [...(chosenBy.get(quoteKey) ?? []), candidate.candidateKey]);
  });
  chosenBy.forEach((citedKeys, quoteKey) => {
    if (citedKeys.length > 1) {
      const conflict = findings.add({
        ...scope,
        code: 'REVIEW_PAIRING_CONFLICT',
        classification: 'TARGET_INPUT_REQUIRED',
        blocking: true,
        locations: candidates.reviews
          .filter(({ candidateKey }) => candidateKey === quoteKey || citedKeys.includes(candidateKey))
          .flatMap(({ locations }) => locations),
        discriminator: `${quoteKey}|${fingerprint([...citedKeys].sort())}`,
        detail: { quote: quoteKey, cited: citedKeys },
        message: `${citedKeys.length} cited reviews of ${options.describe} are paired with the same review quote, and a quote is one review; none of these pairings is applied until only one remains`,
      });

      wait(conflict.key);

      return;
    }

    const [citedKey] = citedKeys;
    const quote = settledReviews.get(quoteKey);
    const cited = settledReviews.get(citedKey);

    // A pairing applies only where both are imported; otherwise each stands, or falls, on its own.
    if (quote?.status === 'INCLUDED' && cited?.status === 'INCLUDED') pairedWith.set(citedKey, quoteKey);
  });

  const pairedQuotes = new Map([...pairedWith].map(([citedKey, quoteKey]) => [quoteKey, citedKey]));
  const plannedReviews = candidates.reviews.filter(
    ({ candidateKey }) => settledReviews.get(candidateKey)?.status === 'INCLUDED' && !pairedWith.has(candidateKey),
  );
  const reviewOrder = orderOf('BOOK_REVIEW', plannedReviews.length > 0);
  const bookReviews: OnixBookReviewIntent[] = [];

  if (reviewOrder !== null) {
    plannedReviews.forEach((candidate) => {
      const values = (settledReviews.get(candidate.candidateKey) as { values: ReviewValues }).values;
      const citedKey = pairedQuotes.get(candidate.candidateKey);
      const cited =
        citedKey === undefined ? undefined : candidates.reviews.find((review) => review.candidateKey === citedKey);
      const citedValues =
        citedKey === undefined ? null : (settledReviews.get(citedKey) as { values: ReviewValues }).values;
      const intentKey = `${scopeKey}|${candidate.candidateKey}`;
      const deferred = findings.add({
        ...scope,
        code: 'BOOK_REVIEW_EXECUTION_DEFERRED',
        classification: 'EXECUTION_DEFERRED',
        blocking: true,
        locations: [...candidate.locations, ...(cited?.locations ?? [])],
        discriminator: intentKey,
        detail: { source: cited === undefined ? candidate.kind : 'PAIRED' },
        message: `A BookReview of ${options.describe} is planned from its ${KIND_NAMES[candidate.kind]}${cited === undefined ? '' : ' and the cited review paired with it'}, which this import cannot create yet: nothing is dropped to let it run`,
      });

      wait(deferred.key);
      bookReviews.push({
        intentKey,
        groupKey: input.groupKey,
        componentPath: input.componentPath,
        source: cited === undefined ? (candidate.kind === 'CITED_REVIEW' ? 'CITED_REVIEW' : 'REVIEW_QUOTE') : 'PAIRED',
        candidateKeys: cited === undefined ? [candidate.candidateKey] : [candidate.candidateKey, cited.candidateKey],
        target: {
          authorName: values.attribution,
          url: values.url ?? citedValues?.url ?? null,
          reviewDate: candidate.reviewDate ?? cited?.reviewDate ?? null,
          text: values.text?.content ?? null,
          textMarkupFormat: values.text?.markupFormat ?? null,
        },
        orderNumber: reviewOrder.ordinals[candidate.candidateKey],
        orderBasis: reviewOrder.basis,
        losses: unique([...candidate.losses, ...(cited?.losses ?? [])]),
        locations: [...candidate.locations, ...(cited?.locations ?? [])],
        findingKey: deferred.key,
        action: 'EXECUTION_DEFERRED',
      });
    });
  }

  /* Endorsements: each with its one attribution, which an Endorsement requires (rules 77-81). */
  const settledEndorsements = candidates.endorsements.flatMap((candidate) => {
    const settled = reviewValues(candidate);

    return settled.status === 'INCLUDED' && settled.values.attribution !== null
      ? [{ candidate, values: settled.values, attribution: settled.values.attribution }]
      : [];
  });
  const endorsementOrder = orderOf('ENDORSEMENT', settledEndorsements.length > 0);
  const endorsements: OnixEndorsementIntent[] =
    endorsementOrder === null
      ? []
      : settledEndorsements.map(({ candidate, values, attribution }) => {
          const intentKey = `${scopeKey}|${candidate.candidateKey}`;
          const deferred = findings.add({
            ...scope,
            code: 'ENDORSEMENT_EXECUTION_DEFERRED',
            classification: 'EXECUTION_DEFERRED',
            blocking: true,
            locations: candidate.locations,
            discriminator: intentKey,
            message: `An Endorsement of ${options.describe} attributed to "${attribution}" is planned, which this import cannot create yet: nothing is dropped to let it run`,
          });

          wait(deferred.key);

          return {
            intentKey,
            groupKey: input.groupKey,
            componentPath: input.componentPath,
            candidateKey: candidate.candidateKey,
            target: {
              authorName: attribution,
              attributionBasis: candidate.attributionBasis ?? 'TEXT_AUTHOR',
              url: values.url,
              text: values.text?.content ?? null,
              textMarkupFormat: values.text?.markupFormat ?? null,
            },
            orderNumber: endorsementOrder.ordinals[candidate.candidateKey],
            orderBasis: endorsementOrder.basis,
            losses: candidate.losses,
            locations: candidate.locations,
            findingKey: deferred.key,
            action: 'EXECUTION_DEFERRED' as const,
          };
        });

  /* Awards: a P.17 Prize the publisher classified as won by the Work, and nothing else (rules 102-131). */
  const settledPrizes = candidates.prizes.flatMap((candidate) => {
    // Statements sharing an identifier but stating different prizes hold it until the file is corrected (rule 128).
    if (candidate.conflictFindingKey !== null) {
      wait(candidate.conflictFindingKey);

      return [];
    }

    const scopeAnswer = answerOf(byKey.get(candidate.scopeFindingKey), choices);

    if (scopeAnswer === null) {
      wait(candidate.scopeFindingKey);

      return [];
    }

    if (scopeAnswer === ONIX_PRIZE_PRODUCT_AWARD) {
      findings.add({
        ...scope,
        code: 'PRIZE_PRODUCT_AWARD_UNREPRESENTABLE',
        classification: 'TARGET_UNREPRESENTABLE',
        blocking: false,
        locations: candidate.locations,
        discriminator: candidate.candidateKey,
        detail: { names: candidate.names.map(({ name }) => name) },
        message: `The Prize "${candidate.names[0].name}" of ${options.describe} was won by a manifestation, as the publisher says, and Thoth holds an Award only for a Work: it is not imported, and never attached to the Work to keep its text`,
      });

      return [];
    }

    const settled = settle(
      [candidate.nameFindingKey, candidate.juryFindingKey, candidate.statementFindingKey],
      (answers) => {
        const nameAnswer = answerFor(candidate.nameFindingKey, answers);
        const juryAnswer = answerFor(candidate.juryFindingKey, answers);
        const statementAnswer = answerFor(candidate.statementFindingKey, answers);

        return {
          title:
            candidate.nameFindingKey === null
              ? candidate.names[0].name
              : (candidate.names.find(({ name, language }) => `N${fingerprint([name, language])}` === nameAnswer)
                  ?.name ?? null),
          jury:
            candidate.juryFindingKey === null
              ? (candidate.juries[0]?.content ?? null)
              : (candidate.juries.find((text) => textKey('J', text) === juryAnswer)?.content ?? null),
          statement:
            candidate.statementFindingKey === null
              ? (candidate.statements[0] ?? null)
              : (candidate.statements.find((text) => textKey('S', text) === statementAnswer) ?? null),
        };
      },
    );

    return settled.status === 'INCLUDED' && settled.values.title !== null
      ? [{ candidate, values: { ...settled.values, title: settled.values.title } }]
      : [];
  });
  const awardOrder = orderOf('AWARD', settledPrizes.length > 0);
  const awards: OnixAwardIntent[] =
    awardOrder === null
      ? []
      : settledPrizes.map(({ candidate, values }) => {
          const intentKey = `${scopeKey}|${candidate.candidateKey}`;
          const deferred = findings.add({
            ...scope,
            code: 'AWARD_EXECUTION_DEFERRED',
            classification: 'EXECUTION_DEFERRED',
            blocking: true,
            locations: candidate.locations,
            discriminator: intentKey,
            message: `An Award "${values.title}" of ${options.describe} is planned, which this import cannot create yet: nothing is dropped to let it run`,
          });

          wait(deferred.key);

          return {
            intentKey,
            groupKey: input.groupKey,
            candidateKey: candidate.candidateKey,
            target: {
              title: values.title,
              role: candidate.role,
              year: candidate.year,
              country: candidate.country,
              jury: values.jury,
              prizeStatement: values.statement?.content ?? null,
              prizeStatementMarkupFormat: values.statement?.markupFormat ?? null,
              category: null,
              url: null,
            },
            identifiers: candidate.identifiers,
            orderNumber: awardOrder.ordinals[candidate.candidateKey],
            orderBasis: awardOrder.basis,
            losses: candidate.losses,
            locations: candidate.locations,
            findingKey: deferred.key,
            action: 'EXECUTION_DEFERRED' as const,
          };
        });

  const raised = findings.all();
  const reductionKeys = input.findingKeys.filter((key) => byKey.has(key));
  const handled = new Set([
    ...[...candidates.reviews, ...candidates.endorsements].flatMap((candidate) => [
      candidate.audienceFindingKey,
      candidate.textFindingKey,
      candidate.attributionFindingKey,
      candidate.linkFindingKey,
      candidate.pairingFindingKey,
    ]),
    ...candidates.prizes.flatMap((candidate) => [
      candidate.scopeFindingKey,
      candidate.nameFindingKey,
      candidate.juryFindingKey,
      candidate.statementFindingKey,
      candidate.conflictFindingKey,
    ]),
    ...Object.values(candidates.ordering).flatMap((ordering) =>
      ordering.status === 'UNRESOLVED' ? [ordering.findingKey] : [],
    ),
  ]);

  // Every other blocking finding of the scope - a shape canonical validation should have refused - waits on its own answer.
  reductionKeys.forEach((key) => {
    const finding = byKey.get(key) as OnixReviewsPrizesFinding;

    if (!handled.has(key) && finding.blocking && answerOf(finding, choices) === null) wait(key);
  });

  return {
    bookReviews: [...bookReviews].sort((a, b) => a.orderNumber - b.orderNumber),
    endorsements: [...endorsements].sort((a, b) => a.orderNumber - b.orderNumber),
    awards: [...awards].sort((a, b) => a.orderNumber - b.orderNumber),
    findingKeys: unique([...reductionKeys, ...raised.map(({ key }) => key)]),
    pendingFindingKeys: pending,
    raised,
  };
};

/**
 * The reviews, endorsements and awards a new Work gets (thoth-app#226): every Product-level candidate of every grouped Product,
 * reconciled for the one Work (rules 136-150), and every finding about them - with those about the representative Product's
 * components no Work is planned from, and its chapters', which are disclosed with the Work and never moved to it.
 */
export const resolveOnixReviewsPrizesWork = (
  plan: OnixReviewsPrizesPlan,
  groupKey: string,
  productKeys: readonly string[],
  options: ResolveOnixReviewsPrizesOptions,
): OnixResolvedReviewsPrizes => {
  const byKey = findingIndexOf(plan);
  const members = productKeys.flatMap((productKey) => plan.products[productKey] ?? []);
  const [representative] = members;
  const findingKeys = [
    ...members.flatMap(({ productKey, findingKeys: keys }) =>
      keys.filter((key) => {
        const finding = byKey.get(key);

        return (
          finding !== undefined &&
          (finding.componentPath === null ||
            (productKey === representative?.productKey && finding.code === 'REVIEW_COMPONENT_NOT_PLANNED'))
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
      candidates: plan.workCandidates[groupKey] ?? EMPTY_CANDIDATES,
      findingKeys: unique(findingKeys),
    },
    options,
  );
};

/**
 * What a chapter or a contained Work gets from its own ContentItem (rules 151-157): a contained Work its own candidates, never
 * its parent's; a chapter none, since Thoth holds no review, endorsement or award on a BookChapter - only the disclosure of
 * each fact it states, at the chapter's own path.
 */
export const resolveOnixReviewsPrizesComponent = (
  plan: OnixReviewsPrizesPlan,
  productKey: string,
  componentPath: string,
  target: 'CHAPTER' | 'CONTAINED_WORK',
  options: ResolveOnixReviewsPrizesOptions,
): OnixResolvedReviewsPrizes => {
  const byKey = findingIndexOf(plan);
  const product = plan.products[productKey];

  return resolveScope(
    plan,
    {
      groupKey: product?.groupKey ?? '',
      productKey,
      componentPath,
      candidates:
        target === 'CONTAINED_WORK'
          ? (plan.componentCandidates[`${productKey}|${componentPath}`] ?? EMPTY_CANDIDATES)
          : EMPTY_CANDIDATES,
      findingKeys: (product?.findingKeys ?? []).filter((key) => byKey.get(key)?.componentPath === componentPath),
    },
    options,
  );
};
