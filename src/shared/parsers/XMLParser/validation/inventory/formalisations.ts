import type { Element } from 'slimdom';

import type { OnixRelease } from '../types';
import type { InventoryBinding, NativeInventoryBinding, XPathInventoryBinding } from './bindings';

/**
 * Implementation-time formalisations of the 39 register-only residual rules of
 * the approved SPIKE-02 v4 inventory (status "PROVEN_RESIDUAL (three-tier
 * probe; XPath formalisation at implementation time)"). Each id, owner,
 * release scope and disposition is the approved inventory entry; each test
 * encodes only the stated requirement and is proven by the approved violating
 * fixture plus an ordinary-valid conforming variant.
 *
 * Where ONIX 3.1.3 carries an official assertion for the very same
 * requirement, the 3.0.8 residual mirrors that official test verbatim; an
 * element missing from an official family mirrors the family's test.
 */
const BOTH: readonly OnixRelease[] = ['3.0', '3.1'];
const R30: readonly OnixRelease[] = ['3.0'];
const R31: readonly OnixRelease[] = ['3.1'];

function residual(
  id: string,
  owner: string,
  releases: readonly OnixRelease[],
  xpath: string,
  basis: string,
  disposition: XPathInventoryBinding['disposition'] = 'NORMATIVE_INVALID',
): XPathInventoryBinding {
  return { id, kind: 'RESIDUAL_NORMATIVE_RULE', owner, releases, disposition, xpath, basis };
}

/** `Repeats of X must each have a (unique) language attribute` — the official family test. */
const languageOnRepeats = (element: string) =>
  `(count(${element}) le 1) or (count(${element}) eq count(${element}/@language))`;

const elementChildren = (element: Element) =>
  Array.from(element.childNodes).filter((c): c is Element => c.nodeType === 1);

/** First two member names of a JSON object, or `null` when the text is not a JSON object. */
export function firstJsonMemberNames(text: string): string[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (_error) {
    return null;
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  let i = 0;
  const ws = () => {
    while (i < text.length && /\s/.test(text[i])) i++;
  };
  const readString = () => {
    const start = i;
    i++;
    while (i < text.length && text[i] !== '"') i += text[i] === '\\' ? 2 : 1;
    i++;
    return JSON.parse(text.slice(start, i)) as string;
  };
  const skipValue = () => {
    ws();
    if (text[i] === '"') {
      readString();
      return;
    }
    if (text[i] === '{' || text[i] === '[') {
      let depth = 0;
      do {
        if (text[i] === '"') {
          readString();
          continue;
        }
        if (text[i] === '{' || text[i] === '[') depth++;
        else if (text[i] === '}' || text[i] === ']') depth--;
        i++;
      } while (depth > 0 && i < text.length);
      return;
    }
    while (i < text.length && !/[,}\]\s]/.test(text[i])) i++;
  };
  const names: string[] = [];
  ws();
  i++; // '{'
  while (names.length < 2) {
    ws();
    if (text[i] !== '"') break;
    names.push(readString());
    ws();
    i++; // ':'
    skipValue();
    ws();
    if (text[i] !== ',') break;
    i++;
  }
  return names;
}

const nativeRules: NativeInventoryBinding[] = [
  {
    id: 'R-MSG-XMLDECL',
    kind: 'RESIDUAL_NORMATIVE_RULE',
    owner: 'ONIXMessage',
    releases: BOTH,
    disposition: 'ADVISORY',
    dependency: 'CONTEXT',
    basis: 'X.1 Start of message: the message begins with an XML declaration line (read from the stage-2 prolog scan)',
    native: (_element, environment) => environment.xmlDeclaration,
  },
  {
    id: 'R-XHTML-EVENTATTR',
    kind: 'RESIDUAL_NORMATIVE_RULE',
    owner: '*',
    releases: BOTH,
    disposition: 'NORMATIVE_INVALID',
    dependency: 'CONTEXT',
    basis: 'X.14 Using XHTML: no XHTML-subset element may carry an event (on*) attribute',
    native: (element, environment) =>
      !environment.xhtmlElementNames.has(element.localName) ||
      !Array.from(element.attributes).some((a) => a.localName.startsWith('on')),
  },
  {
    id: 'R-XHTML-INTERLINEAR',
    kind: 'RESIDUAL_NORMATIVE_RULE',
    owner: '*',
    releases: BOTH,
    disposition: 'NORMATIVE_INVALID',
    dependency: 'SUBTREE',
    basis:
      'X.14 Using XHTML: an ONIX element whose content carries XHTML-subset markup must not also carry U+FFF9-U+FFFB',
    native: (element, environment) =>
      environment.xhtmlElementNames.has(element.localName) ||
      !elementChildren(element).some((c) => environment.xhtmlElementNames.has(c.localName)) ||
      !/[\uFFF9-\uFFFB]/.test(element.textContent ?? ''),
  },
  {
    id: 'R-JSONLD-CONTEXT-31',
    kind: 'RESIDUAL_NORMATIVE_RULE',
    owner: 'TextContent',
    releases: R31,
    disposition: 'NORMATIVE_INVALID',
    dependency: 'SUBTREE',
    basis:
      'P.14 TextType 24 (JSON-LD): every Text is a JSON object whose first two members are @context and @type (in either order)',
    native: (element) => {
      const children = elementChildren(element);
      const type = children.find((c) => c.localName === 'TextType');
      if ((type?.textContent ?? '').trim() !== '24') return true;
      return children
        .filter((c) => c.localName === 'Text')
        .every((text) => {
          const names = firstJsonMemberNames(text.textContent ?? '');
          return !!names && names.length === 2 && names.includes('@context') && names.includes('@type');
        });
    },
  },
];

const xpathRules: XPathInventoryBinding[] = [
  residual(
    'R-COLLSEQ-TYPENAME',
    'CollectionSequence',
    R30,
    "(CollectionSequenceType eq '01') eq exists(CollectionSequenceTypeName)",
    'mirrors the 3.1.3 official assertion _20171126_b_79',
  ),
  residual(
    'R-COLL-TITLELEVEL',
    'Collection',
    BOTH,
    "not(TitleDetail/TitleElement/TitleElementLevel = '01')",
    'a TitleElement inside Collection must not use TitleElementLevel 01',
  ),
  residual(
    'R-EDITION-STATEMENT',
    'DescriptiveDetail',
    BOTH,
    'not(exists(EditionStatement)) or exists(EditionType) or exists(EditionNumber)',
    'P.9.4: an EditionStatement is accompanied by an EditionType or an EditionNumber',
  ),
  residual(
    'R-LANG-REPEAT-AUDIENCEHEADINGTEXT',
    'Audience',
    BOTH,
    languageOnRepeats('AudienceHeadingText'),
    'P.13.4a; mirrors the official "(unique) language attribute" family test',
  ),
  residual(
    'R-LANG-REPEAT-TEXTSOURCEDESC',
    'TextContent',
    R30,
    languageOnRepeats('TextSourceDescription'),
    'mirrors the 3.1.3 official assertion _20171208_a_51',
  ),
  residual(
    'R-LANG-ALLORNONE-CITEDCONTENT-RESOURCELINK',
    'CitedContent',
    BOTH,
    '(count(ResourceLink) le 1) or not(exists(ResourceLink/@language)) or (count(ResourceLink) eq count(ResourceLink/@language))',
    'P.15.8: where repeated ResourceLink use the language attribute, every repeat carries it',
  ),
  residual(
    'R-EVENTOCC-STARTDATE',
    'EventOccurrence',
    BOTH,
    "exists(OccurrenceDate[OccurrenceDateRole = '01'])",
    'P.27 event occurrence date: every EventOccurrence has a start date (OccurrenceDateRole 01)',
  ),
  residual(
    'R-FUNDING-ROLE',
    'Publisher',
    BOTH,
    "not(exists(Funding)) or PublishingRole = ('14', '15', '16')",
    'P.19 funding: only with a funder PublishingRole (List 45 codes 14, 15, 16)',
  ),
  residual(
    'R-LANG-REPEAT-CITYOFPUB',
    'PublishingDetail',
    R30,
    languageOnRepeats('CityOfPublication'),
    'mirrors the 3.1.3 official assertion _20171208_a_49',
  ),
  residual(
    'R-LANG-REPEAT-RESFILEFEATUREDESC',
    'ResourceFileFeature',
    R30,
    languageOnRepeats('ResourceFileFeatureDescription'),
    'mirrors the 3.1.3 official assertion _20171208_a_50',
  ),
  ...['CoverResource', 'BodyResource', 'InsertResource'].flatMap((owner) => [
    residual(
      'R-LANG-REPEAT-RESFILEDESC',
      owner,
      BOTH,
      languageOnRepeats('ResourceFileDescription'),
      'P.28.24 / P.28.47; mirrors the official "(unique) language attribute" family test',
    ),
    residual(
      'R-LANG-REPEAT-RESFILECONTENTDESC',
      owner,
      BOTH,
      languageOnRepeats('ResourceFileContentDescription'),
      'P.28; mirrors the official "(unique) language attribute" family test',
    ),
  ]),
  residual(
    'R-LANG-REPEAT-SPECFEATUREDESC',
    'SpecificationFeature',
    R30,
    languageOnRepeats('SpecificationFeatureDescription'),
    'mirrors the 3.1.3 official assertion _20240205_b_13',
  ),
  ...['BodyManifest', 'CoverManifest', 'InsertManifest'].map((owner) =>
    residual(
      'R-LANG-REPEAT-SPECDESC',
      owner,
      R30,
      languageOnRepeats('SpecificationDescription'),
      'mirrors the 3.1.3 official assertion _20240205_b_1',
    ),
  ),
  residual(
    'R-INSERTPOINT-FORMAT',
    'InsertPoint',
    BOTH,
    "(not(InsertPointType = ('ALP', 'APP')) or matches(InsertPointValue, '^[0-9]+$')) and " +
      "(not(InsertPointType = 'ATC') or matches(InsertPointValue, '^[0-9]{3}[0-5][0-9][0-5][0-9]([0-9]{2})?$'))",
    'List 255: ALP/APP value is an integer page number; ATC value is HHHMMSS or HHHMMSScc (AHL is free text)',
  ),
  residual(
    'R-LANG-REPEAT-SUPPLEMENT-PRODUCTFORMDESC',
    'SupplementManifest',
    BOTH,
    languageOnRepeats('ProductFormDescription'),
    'mirrors the official "(unique) language attribute" family test',
  ),
  residual(
    'R-RETURNS-TYPENAME',
    'ReturnsConditions',
    BOTH,
    "(ReturnsCodeType eq '00') eq exists(ReturnsCodeTypeName)",
    'mirrors the official proprietary-type-name family (List 53 code 00)',
  ),
  residual(
    'R-NEWSUPPLIER-AVAIL',
    'SupplyDetail',
    BOTH,
    "not(exists(NewSupplier)) or ProductAvailability = '43'",
    'NewSupplier only with ProductAvailability 43 (List 65)',
  ),
  residual(
    'R-STOCK-REPEAT-LOCATION',
    'SupplyDetail',
    BOTH,
    '(count(Stock) le 1) or (every $s in Stock satisfies (exists($s/LocationIdentifier) or exists($s/LocationName)))',
    'repeated Stock each carries a LocationIdentifier or LocationName',
  ),
  residual(
    'R-STOCKQTY-TYPENAME',
    'StockQuantityCoded',
    BOTH,
    "(StockQuantityCodeType eq '01') eq exists(StockQuantityCodeTypeName)",
    'mirrors the official proprietary-type-name family (List 70 code 01)',
  ),
  residual(
    'R-ONORDER-SUM',
    'Stock',
    BOTH,
    'not(exists(OnOrder) and exists(OnOrderDetail/OnOrder)) or xs:integer(OnOrder) ge sum(for $o in OnOrderDetail/OnOrder return xs:integer($o))',
    'Stock/OnOrder is at least the sum of OnOrderDetail/OnOrder when both are present',
  ),
  residual(
    'R-PRICEID-UNIQUE-PRODUCT',
    'Product',
    BOTH,
    'every $a in ProductSupply/SupplyDetail/Price/PriceIdentifier satisfies not(exists(' +
      'ProductSupply/SupplyDetail/Price/PriceIdentifier[not(. is $a)][string(PriceIDType) eq string($a/PriceIDType)]' +
      '[string(IDTypeName) eq string($a/IDTypeName)][string(IDValue) eq string($a/IDValue)]))',
    'a PriceIdentifier (type, name, value) is unique across all Price composites of one Product',
  ),
  residual(
    'R-PRICECODE-TYPENAME',
    'PriceCoded',
    R30,
    "(PriceCodeType eq '01') eq exists(PriceCodeTypeName)",
    'mirrors the 3.1.3 official assertion _20171126_b_80',
  ),
  residual(
    'R-UNIQ-CONTRIBREF-ROLE-30',
    'ContributorReference',
    R30,
    'count(ContributorRole) eq count(distinct-values(for $r in ContributorRole return string($r)))',
    'ContributorRole values are unique within one ContributorReference (the 3.1 ordinary xs:unique)',
  ),
  residual(
    'R-SUBJECTDESC-NONEMPTY-31',
    'SubjectDescription',
    R31,
    "matches(., '\\S') and (not(matches(@textformat, '^(02|03)$')) or " +
      "matches(replace(., '(<|&lt;)/?[A-Za-z][^(>|&gt;)]*(>|&gt;)', ''), '\\S'))",
    'mirrors the official non-empty family _20180517_b_1 / _20180517_b_2',
  ),
  residual(
    'R-PRODUCTSUPPLY-NONEMPTY-31',
    'ProductSupply',
    R31,
    'exists(*)',
    'ProductSupply is never entirely empty (a block update may carry only MarketReference)',
  ),
  residual(
    'R-MSG-NO-SCHEMALOCATION-31',
    'ONIXMessage',
    R31,
    "not(exists(descendant-or-self::*/@*[namespace-uri() eq 'http://www.w3.org/2001/XMLSchema-instance']" +
      "[local-name() = ('schemaLocation', 'noNamespaceSchemaLocation')]))",
    'xsi:schemaLocation / xsi:noNamespaceSchemaLocation must be removed before exchange',
    'ADVISORY',
  ),
  residual(
    'R-SUBJECTDESC-TEXTFORMAT-31',
    'SubjectDescription',
    R31,
    "(@textformat eq '05') or not(exists(child::*))",
    'mirrors the official XHTML textformat family _20171208_g_*',
  ),
  residual(
    'R-LANG-REPEAT-TEXTSOURCELINK-31',
    'TextContent',
    R31,
    languageOnRepeats('TextSourceLink'),
    'mirrors the official "(unique) language attribute" family test',
  ),
  residual(
    'R-P6-ONE-COLLECTION-TITLE-31',
    'DescriptiveDetail',
    R31,
    "every $t in TitleDetail satisfies count($t/TitleElement[TitleElementLevel = '02']) le 1",
    'at most one collection-level TitleElement in a Group P.6 TitleDetail',
    'ADVISORY',
  ),
  // The two cross-Collection rules are evaluated at their inventory owner, never at
  // DescriptiveDetail: a finding names the responsible Collection or CollectionIdentifier,
  // and an unrelated sibling Collection's ordinary defect is not among its dependencies.
  // Group P.6 (the parent DescriptiveDetail's TitleDetail) is reached through the parent axis.
  residual(
    'R-COLL-TITLELESS-P6-31',
    'Collection',
    R31,
    "exists(TitleDetail) or (CollectionType = '10' and exists(../TitleDetail/TitleElement[TitleElementLevel = '02']))",
    'a Collection without TitleDetail is a publisher collection titled at collection level in Group P.6',
  ),
  residual(
    'R-COLLELEMENTLEVEL-MATCH-31',
    'CollectionIdentifier',
    R31,
    'every $l in CollectionElementLevel satisfies ' +
      '(if (exists(../TitleDetail)) then $l = ../TitleDetail/TitleElement/TitleElementLevel ' +
      'else $l = ../../TitleDetail/TitleElement/TitleElementLevel)',
    'CollectionElementLevel matches a TitleElementLevel of its Collection, or of Group P.6 when titleless',
  ),
  residual(
    'R-COLLELEMENTLEVEL-CODES-31',
    'CollectionIdentifier',
    R31,
    "not(CollectionElementLevel = ('01', '04'))",
    'CollectionElementLevel never uses List 149 codes 01 or 04',
  ),
  residual(
    'R-PUBNAMEINV-NOTFORSALE-31',
    'SalesRights',
    R31,
    "not(exists(PublisherNameInverted)) or SalesRightsType = ('03', '04', '05', '06')",
    'PublisherNameInverted in SalesRights only with a not-for-sale SalesRightsType (List 46 codes 03-06)',
  ),
  residual(
    'R-CL-158-53-31',
    'SupportingResource',
    R31,
    "not(ResourceContentType = '53')",
    'List 158 code 53 is only for use in ONIX 3.0',
  ),
];

export const RESIDUAL_FORMALISATIONS: readonly InventoryBinding[] = [...nativeRules, ...xpathRules];
