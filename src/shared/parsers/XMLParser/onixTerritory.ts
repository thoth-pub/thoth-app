import type { OnixTerritoryFact } from '../../types/onixPlanning';

/**
 * The common ONIX Territory evaluator of thoth-app#217 (Stage C of #184), under ONIX-AUDIT-SALES-RIGHTS-CONTACT-01
 * (#179 proposal 5543566392, approval 5543611447, rules 1-11).
 *
 * A Territory is the same XML shape wherever ONIX uses it - under SalesRights, a ProductSupply Market, a Price or a
 * supporting resource - and means something different in each place. This module evaluates only the geography: which
 * of the pinned countries and regions a Territory covers, and whether one covers or overlaps another. Every territory
 * keeps the context it was stated in, exact tokens as stated, and territories of different contexts are never united
 * (rule 2); comparing two contexts is the one approved cross-block check, and the caller decides what it means.
 *
 * It validates nothing: an unknown token is unresolved, not invalid (the canonical validator owns validity), and a
 * relation involving one is not established rather than guessed (rules 4, 11). It never resolves a token by shape,
 * case or similarity (rule 5): the vocabulary is exactly the List 91 countries and List 49 regions the pinned
 * codelists ship. A supranational region such as `ECZ`, whose membership the pinned list documents only in prose, is
 * unresolved here; it is valid only in a Price territory, which this stage never compares.
 */

export type OnixTerritoryContext = 'SALES_RIGHTS' | 'MARKET' | 'PRICE' | 'COLLATERAL';

/** The declared tokens of a Territory, exactly as stated and in source order (rule 3). */
export type OnixTerritoryTokens = {
  readonly countriesIncluded: readonly string[];
  readonly regionsIncluded: readonly string[];
  readonly countriesExcluded: readonly string[];
  readonly regionsExcluded: readonly string[];
};

export type OnixEvaluatedTerritory = {
  readonly context: OnixTerritoryContext;
  readonly tokens: OnixTerritoryTokens;
  /** Whether `WORLD` is among the included regions: the whole pinned world, before exclusions. */
  readonly world: boolean;
  /** Every token the pinned vocabulary does not resolve, in source order, once each. */
  readonly unresolved: readonly string[];
};

/**
 * A coverage of the world in one context: the union of some territories, or the complement of one. Evaluated only
 * when related to another coverage, over the exact partition the two coverages' tokens define.
 */
export type OnixTerritoryCoverage = {
  readonly context: OnixTerritoryContext;
  readonly members: readonly OnixEvaluatedTerritory[];
  /** Whether the coverage is the rest of the world after its members. */
  readonly complement: boolean;
  readonly unresolved: readonly string[];
  /** Whether it covers no country or region at all: no member and not a complement, or the complement of WORLD. */
  readonly empty: boolean;
};

export type OnixTerritoryRelation =
  | {
      readonly kind: 'ESTABLISHED';
      /** Whether the first coverage covers every country and region of the second. */
      readonly contains: boolean;
      /** Whether some country or region is in both. */
      readonly intersects: boolean;
    }
  /** A token of either coverage is not in the pinned vocabulary, so no relation is claimed (rule 11). */
  | { readonly kind: 'NOT_ESTABLISHED'; readonly unresolved: readonly string[] };

/* ------------------------------------------------------------------------------------------------ */
/* The pinned vocabulary                                                                            */
/* ------------------------------------------------------------------------------------------------ */

const PINNED_COUNTRY_CODES =
  'AD AE AF AG AI AL AM AN AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ ' +
  'CA CC CD CF CG CH CI CK CL CM CN CO CR CS CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO ' +
  'FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM ' +
  'JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ ' +
  'MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE ' +
  'RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT ' +
  'TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT YU ZA ZM ZW';

const PINNED_REGION_CODES =
  'AU-CT AU-NS AU-NT AU-QL AU-SA AU-TS AU-VI AU-WA BE-BRU BE-VLG BE-WAL CA-AB CA-BC CA-MB CA-NB CA-NL CA-NS CA-NT ' +
  'CA-NU CA-ON CA-PE CA-QC CA-SK CA-YT CN-BJ CN-TJ CN-HE CN-SX CN-NM CN-LN CN-JL CN-HL CN-SH CN-JS CN-ZJ CN-AH CN-FJ ' +
  'CN-JX CN-SD CN-HA CN-HB CN-HN CN-GD CN-GX CN-HI CN-CQ CN-SC CN-GZ CN-YN CN-XZ CN-SN CN-GS CN-QH CN-NX CN-XJ CN-TW ' +
  'CN-HK CN-MO CN-11 CN-12 CN-13 CN-14 CN-15 CN-21 CN-22 CN-23 CN-31 CN-32 CN-33 CN-34 CN-35 CN-36 CN-37 CN-41 CN-42 ' +
  'CN-43 CN-44 CN-45 CN-46 CN-50 CN-51 CN-52 CN-53 CN-54 CN-61 CN-62 CN-63 CN-64 CN-65 CN-71 CN-91 CN-92 ES-CN FR-H ' +
  'GB-AIR GB-APS GB-CHA GB-ENG GB-EWS GB-IOM GB-NIR GB-SCT GB-WLS IE-AIR IT-AG IT-AL IT-AN IT-AO IT-AR IT-AP IT-AT ' +
  'IT-AV IT-BA IT-BT IT-BL IT-BN IT-BG IT-BI IT-BO IT-BZ IT-BS IT-BR IT-CA IT-CL IT-CB IT-CI IT-CE IT-CT IT-CZ IT-CH ' +
  'IT-CO IT-CS IT-CR IT-KR IT-CN IT-EN IT-FM IT-FE IT-FI IT-FG IT-FC IT-FR IT-GE IT-GO IT-GR IT-IM IT-IS IT-SP IT-AQ ' +
  'IT-LT IT-LE IT-LC IT-LI IT-LO IT-LU IT-MC IT-MN IT-MS IT-MT IT-VS IT-ME IT-MI IT-MO IT-MB IT-NA IT-NO IT-NU IT-OG ' +
  'IT-OT IT-OR IT-PD IT-PA IT-PR IT-PV IT-PG IT-PU IT-PE IT-PC IT-PI IT-PT IT-PN IT-PZ IT-PO IT-RG IT-RA IT-RC IT-RE ' +
  'IT-RI IT-RN IT-RM IT-RO IT-SA IT-SS IT-SV IT-SI IT-SR IT-SO IT-TA IT-TE IT-TR IT-TO IT-TP IT-TN IT-TV IT-TS IT-UD ' +
  'IT-VA IT-VE IT-VB IT-VC IT-VR IT-VV IT-VI IT-VT RS-KM RS-VO RU-AD RU-AL RU-BA RU-BU RU-CE RU-CU RU-DA RU-IN RU-KB ' +
  'RU-KL RU-KC RU-KR RU-KK RU-KO RU-ME RU-MO RU-SA RU-SE RU-TA RU-TY RU-UD RU-ALT RU-KAM RU-KHA RU-KDA RU-KYA RU-PER ' +
  'RU-PRI RU-STA RU-ZAB RU-AMU RU-ARK RU-AST RU-BEL RU-BRY RU-CHE RU-IRK RU-IVA RU-KGD RU-KLU RU-KEM RU-KIR RU-KOS ' +
  'RU-KGN RU-KRS RU-LEN RU-LIP RU-MAG RU-MOS RU-MUR RU-NIZ RU-NGR RU-NVS RU-OMS RU-ORE RU-ORL RU-PNZ RU-PSK RU-ROS ' +
  'RU-RYA RU-SAK RU-SAM RU-SAR RU-SMO RU-SVE RU-TAM RU-TOM RU-TUL RU-TVE RU-TYU RU-ULY RU-VLA RU-VGG RU-VLG RU-VOR ' +
  'RU-YAR RU-MOW RU-SPE RU-YEV RU-CHU RU-KHM RU-NEN RU-YAN US-AK US-AL US-AR US-AZ US-CA US-CO US-CT US-DC US-DE ' +
  'US-FL US-GA US-HI US-IA US-ID US-IL US-IN US-KS US-KY US-LA US-MA US-MD US-ME US-MI US-MN US-MO US-MS US-MT US-NC ' +
  'US-ND US-NE US-NH US-NJ US-NM US-NV US-NY US-OH US-OK US-OR US-PA US-RI US-SC US-SD US-TN US-TX US-UT US-VA US-VT ' +
  'US-WA US-WI US-WV US-WY';

/**
 * ONIX List 91, exactly as the pinned `ONIX_BookProduct_CodeLists.xsd` enumerates it (Issue 74 under the approved
 * codelist pin of thoth-app#189). The world, for `WORLD`, is exactly these countries.
 */
export const ONIX_PINNED_COUNTRIES: ReadonlySet<string> = new Set(PINNED_COUNTRY_CODES.split(' '));

/**
 * ONIX List 49 as pinned, less `WORLD` and the supranational `ECZ`: every region is a part of the one country its code
 * names, which the pinned list bases on ISO 3166-2. Each is mapped to that country.
 */
export const ONIX_PINNED_REGIONS: ReadonlyMap<string, string> = new Map(
  PINNED_REGION_CODES.split(' ').map((region) => [region, region.slice(0, 2)]),
);

const WORLD = 'WORLD';

/* ------------------------------------------------------------------------------------------------ */
/* Evaluation                                                                                       */
/* ------------------------------------------------------------------------------------------------ */

const tokensOf = (text: string | null): string[] => (text ?? '').split(/\s+/).filter((token) => token.length > 0);

/** The declared tokens of a Territory, split on whitespace only, exactly as stated (rules 3, 5). */
export const readTerritoryTokens = (
  fact: Pick<OnixTerritoryFact, 'countriesIncluded' | 'regionsIncluded' | 'countriesExcluded' | 'regionsExcluded'>,
): OnixTerritoryTokens => ({
  countriesIncluded: tokensOf(fact.countriesIncluded),
  regionsIncluded: tokensOf(fact.regionsIncluded),
  countriesExcluded: tokensOf(fact.countriesExcluded),
  regionsExcluded: tokensOf(fact.regionsExcluded),
});

const unique = (values: readonly string[]): string[] => [...new Set(values)];

/** A Territory evaluated in the context it is stated in. */
export const evaluateTerritory = (
  fact: Pick<OnixTerritoryFact, 'countriesIncluded' | 'regionsIncluded' | 'countriesExcluded' | 'regionsExcluded'>,
  context: OnixTerritoryContext,
): OnixEvaluatedTerritory => {
  const tokens = readTerritoryTokens(fact);
  const unresolved = unique([
    ...[...tokens.countriesIncluded, ...tokens.countriesExcluded].filter((code) => !ONIX_PINNED_COUNTRIES.has(code)),
    ...tokens.regionsIncluded.filter((code) => code !== WORLD && !ONIX_PINNED_REGIONS.has(code)),
    ...tokens.regionsExcluded.filter((code) => !ONIX_PINNED_REGIONS.has(code)),
  ]);

  return { context, tokens, world: tokens.regionsIncluded.includes(WORLD), unresolved };
};

/** The union of territories stated in one context; territories of different contexts are never united (rule 2). */
export const unionOf = (members: readonly OnixEvaluatedTerritory[]): OnixTerritoryCoverage => {
  const contexts = unique(members.map(({ context }) => context));

  if (contexts.length > 1) {
    throw new TypeError(`territories of different contexts are never united: ${contexts.join(', ')}`);
  }

  return withEmptiness({
    context: (contexts[0] ?? 'SALES_RIGHTS') as OnixTerritoryContext,
    members,
    complement: false,
    unresolved: unique(members.flatMap(({ unresolved }) => unresolved)),
    empty: false,
  });
};

/** The rest of the world after a coverage, in the same context. */
export const complementOf = (coverage: OnixTerritoryCoverage): OnixTerritoryCoverage =>
  withEmptiness({ ...coverage, complement: !coverage.complement });

/**
 * One point of the world: a whole country less the regions named in the comparison (`part` null), or one named region.
 * The partition is exact for the tokens compared: no other region can tell the coverages apart.
 */
type Atom = { readonly country: string; readonly part: string | null };

const covers = ({ tokens, world }: OnixEvaluatedTerritory, { country, part }: Atom): boolean => {
  const included =
    world || tokens.countriesIncluded.includes(country) || (part !== null && tokens.regionsIncluded.includes(part));
  const excluded =
    tokens.countriesExcluded.includes(country) || (part !== null && tokens.regionsExcluded.includes(part));

  return included && !excluded;
};

const inCoverage = (coverage: OnixTerritoryCoverage, atom: Atom): boolean => {
  const member = coverage.members.some((territory) => covers(territory, atom));

  return coverage.complement ? !member : member;
};

/** Every point the two coverages' tokens can tell apart, over the whole pinned world. */
const atomsOf = (a: OnixTerritoryCoverage, b: OnixTerritoryCoverage): Atom[] => {
  const regions = unique(
    [...a.members, ...b.members].flatMap(({ tokens }) => [...tokens.regionsIncluded, ...tokens.regionsExcluded]),
  ).filter((region) => ONIX_PINNED_REGIONS.has(region));
  const regionsByCountry = new Map<string, string[]>();

  regions.forEach((region) => {
    const country = ONIX_PINNED_REGIONS.get(region) as string;

    regionsByCountry.set(country, [...(regionsByCountry.get(country) ?? []), region]);
  });

  return [...ONIX_PINNED_COUNTRIES].flatMap((country) => [
    { country, part: null },
    ...(regionsByCountry.get(country) ?? []).map((part) => ({ country, part })),
  ]);
};

/** A coverage with whether it covers no point of the pinned world at all, decided exactly over its own partition. */
const withEmptiness = (coverage: OnixTerritoryCoverage): OnixTerritoryCoverage => ({
  ...coverage,
  empty: atomsOf(coverage, coverage).every((atom) => !inCoverage(coverage, atom)),
});

/**
 * How one coverage relates to another: whether the first covers every point of the second, and whether any point is
 * in both. Exact over the pinned world, whatever contexts the two were stated in, and established only when every
 * token of both resolves (rule 11).
 */
export const territoryRelation = (a: OnixTerritoryCoverage, b: OnixTerritoryCoverage): OnixTerritoryRelation => {
  const unresolved = unique([...a.unresolved, ...b.unresolved]);

  if (unresolved.length > 0) return { kind: 'NOT_ESTABLISHED', unresolved };

  let contains = true;
  let intersects = false;

  for (const atom of atomsOf(a, b)) {
    const inA = inCoverage(a, atom);
    const inB = inCoverage(b, atom);

    if (inB && !inA) contains = false;
    if (inA && inB) intersects = true;
    if (!contains && intersects) break;
  }

  return { kind: 'ESTABLISHED', contains, intersects };
};
