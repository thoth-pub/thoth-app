// @vitest-environment node
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

import { createOrdinaryValidator, type OrdinaryValidator } from '../ordinary';
import { ONIX_VALIDATION_RESOURCES } from '../resources';
import { evaluateSourceGate } from '../sourceGate';
import type { OnixRelease } from '../types';
import { buildXdm } from '../xdm';
import { RESIDUAL_FORMALISATIONS } from './formalisations';
import {
  deriveXhtmlElementNames,
  evaluateInventory,
  type InventoryBinding,
  inventoryBindings,
  type InventoryEnvironment,
  KERNEL_BINDINGS,
  SOURCE_RULE_INVENTORY,
  STAGE_1_2_RULES,
} from './inventory';

const VALIDATION = join(__dirname, '..');
const FIXTURES = join(VALIDATION, '__fixtures__', 'spike02');
const PUBLIC_DIR = join(process.cwd(), 'public', 'onix-validation');
const fixture = (path: string) => readFileSync(join(FIXTURES, path), 'utf8');
const toRelease = (r: '3.0.8' | '3.1.3'): OnixRelease => (r === '3.0.8' ? '3.0' : '3.1');

const ENV: InventoryEnvironment = {
  xmlDeclaration: true,
  xhtmlElementNames: deriveXhtmlElementNames(readFileSync(join(PUBLIC_DIR, 'ONIX_XHTML_Subset.xsd'), 'utf8')),
};

function run(text: string, bindings?: readonly InventoryBinding[], env: InventoryEnvironment = ENV) {
  const gate = evaluateSourceGate(text);
  if (gate.kind !== 'CONTINUE') throw new Error(`fixture stopped: ${gate.stopText}`);
  const { document } = buildXdm(text);
  return {
    release: gate.source.release,
    findings: evaluateInventory(document, gate.source.release, env, bindings),
  };
}

describe('binding stage-8 source-rule inventory (SPIKE-02 v4)', () => {
  it('has the approved 89 entries and composition', () => {
    const count = (predicate: (e: (typeof SOURCE_RULE_INVENTORY)[number]) => boolean) =>
      SOURCE_RULE_INVENTORY.filter(predicate).length;
    expect(SOURCE_RULE_INVENTORY).toHaveLength(89);
    expect(new Set(SOURCE_RULE_INVENTORY.map((e) => e.id)).size).toBe(89);
    expect(count((e) => e.kind === 'RESIDUAL_NORMATIVE_RULE' && e.disposition === 'NORMATIVE_INVALID')).toBe(53);
    expect(count((e) => e.kind === 'RESIDUAL_NORMATIVE_RULE' && e.disposition === 'ADVISORY')).toBe(7);
    expect(count((e) => e.kind === 'NORMATIVE_KERNEL_RULE' && e.disposition === 'NORMATIVE_INVALID')).toBe(25);
    expect(count((e) => e.kind === 'NORMATIVE_KERNEL_RULE' && e.disposition === 'ADVISORY')).toBe(2);
    expect(count((e) => e.kind === 'SECURITY_OR_SUPPORT_POLICY')).toBe(2);
    const applies = (release: '3.0.8' | '3.1.3', kind: string) =>
      count((e) => e.kind === kind && e.releases.includes(release));
    expect([applies('3.0.8', 'RESIDUAL_NORMATIVE_RULE'), applies('3.0.8', 'NORMATIVE_KERNEL_RULE')]).toEqual([47, 26]);
    expect([applies('3.1.3', 'RESIDUAL_NORMATIVE_RULE'), applies('3.1.3', 'NORMATIVE_KERNEL_RULE')]).toEqual([52, 27]);
  });

  it('ships the v4 kernel bindings byte for byte (kernel_rules.json pinned by #190)', () => {
    const bytes = readFileSync(join(VALIDATION, 'data', 'kernelBindings.json'));
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(
      'f6798cd2ff7f72ae4edb9be53c3a2e1ed5c10e762aa113a08c6d96a691fab3a9',
    );
    expect(KERNEL_BINDINGS).toHaveLength(98);
  });

  it('executes every inventory entry through exactly one route', () => {
    const v4 = new Set(KERNEL_BINDINGS.map((b) => b.id));
    const formalised = new Set(RESIDUAL_FORMALISATIONS.map((b) => b.id));
    const stages = new Set(STAGE_1_2_RULES);
    expect([...v4].filter((id) => formalised.has(id) || stages.has(id))).toEqual([]);
    expect([...formalised].filter((id) => stages.has(id))).toEqual([]);
    expect([...v4, ...formalised, ...stages].sort()).toEqual(SOURCE_RULE_INVENTORY.map((e) => e.id).sort());
    expect([v4.size, formalised.size, stages.size]).toEqual([47, 39, 3]);
  });

  it('keeps every binding consistent with its inventory entry', () => {
    const entries = new Map(SOURCE_RULE_INVENTORY.map((e) => [e.id, e]));
    for (const binding of [...KERNEL_BINDINGS, ...RESIDUAL_FORMALISATIONS]) {
      const entry = entries.get(binding.id)!;
      expect(binding.disposition, binding.id).toBe(entry.disposition);
      for (const release of binding.releases) {
        expect(entry.releases.map(toRelease), binding.id).toContain(release);
      }
    }
    for (const binding of RESIDUAL_FORMALISATIONS) {
      expect([...binding.releases].sort(), binding.id).toEqual(entries.get(binding.id)!.releases.map(toRelease).sort());
    }
  });

  it('never applies a binding outside its releases', () => {
    for (const release of ['3.0', '3.1'] as const) {
      expect(inventoryBindings(release).filter((b) => !b.releases.includes(release))).toEqual([]);
    }
    expect(inventoryBindings('3.0').some((b) => b.id === 'R-LANG-REPEAT-CITYOFPUB')).toBe(true);
    expect(inventoryBindings('3.1').some((b) => b.id === 'R-LANG-REPEAT-CITYOFPUB')).toBe(false);
  });

  it('derives the 68 XHTML-subset element names from the pinned module', () => {
    expect(ENV.xhtmlElementNames.size).toBe(68);
    expect(ENV.xhtmlElementNames.has('a')).toBe(true);
    expect(ENV.xhtmlElementNames.has('Text')).toBe(false);
  });
});

describe.each(['kernel', 'skernel', 'codelist', 'dynerr', 'eidr'])('frozen v4 kernel verdicts: %s', (family) => {
  it.each(['30', '31'])('%s', (suffix) => {
    const set = `${family}${suffix}`;
    const expected: Record<string, string[]> = JSON.parse(fixture(`expected/kernel_${set}.json`));
    const v4Ids = new Set(KERNEL_BINDINGS.map((b) => b.id));
    const mismatches: string[] = [];
    for (const [name, fails] of Object.entries(expected)) {
      const text = fixture(`${set}/${name}`);
      const onixRelease = toRelease(schemaReleaseOf(text));
      const { findings } = run(
        text,
        KERNEL_BINDINGS.filter((b) => b.releases.includes(onixRelease)),
      );
      const errors = findings.filter((f) => f.error);
      const fired = [...new Set(findings.filter((f) => v4Ids.has(f.id)).map((f) => f.id))].sort();
      if (errors.length || JSON.stringify(fired) !== JSON.stringify(fails)) {
        mismatches.push(
          `${name} [${onixRelease}]: ${JSON.stringify(fired)} vs ${JSON.stringify(fails)} errors=${errors.length}`,
        );
      }
    }
    expect(mismatches).toEqual([]);
  });
});

function schemaReleaseOf(text: string): '3.0.8' | '3.1.3' {
  const gate = evaluateSourceGate(text);
  if (gate.kind !== 'CONTINUE') throw new Error('stopped');
  return gate.source.schemaRelease;
}

// ---------------------------------------------------------------------------
// Formalised register-only residual rules: the approved violating fixture fires, an
// ordinary-valid conforming variant does not.
// ---------------------------------------------------------------------------
type Edit = [from: string, to: string];
const lang = (value: string, code: string): Edit[] => [[`>${value}<`, ` language="${code}">${value}<`]];
const RESIDUAL_CASES: [id: string, path: string, conforming: Edit[]][] = [
  ['R-XHTML-EVENTATTR', 'residual30/S30-0070_xhtml_event_attribute.xml', [[' onfocus="alert(1)"', '']]],
  [
    'R-XHTML-INTERLINEAR',
    'residual30/S30-0077_interlinear_with_xhtml.xml',
    [['&#xFFF9;漢字&#xFFFA;かんじ&#xFFFB;', '漢字かんじ']],
  ],
  [
    'R-COLLSEQ-TYPENAME',
    'residual30/S30-0256_collseq_proprietary_no_name.xml',
    [
      [
        '<CollectionSequenceType>01</CollectionSequenceType>',
        '<CollectionSequenceType>01</CollectionSequenceType><CollectionSequenceTypeName>House</CollectionSequenceTypeName>',
      ],
    ],
  ],
  [
    'R-COLL-TITLELEVEL',
    'residual30/S30-0266_collection_title_level_01.xml',
    [
      [
        '<TitleElementLevel>01</TitleElementLevel><TitleText>Great Series',
        '<TitleElementLevel>02</TitleElementLevel><TitleText>Great Series',
      ],
    ],
  ],
  [
    'R-EDITION-STATEMENT',
    'residual30/S30-0484_editionstatement_alone.xml',
    [['<EditionStatement>', '<EditionNumber>2</EditionNumber><EditionStatement>']],
  ],
  [
    'R-LANG-REPEAT-AUDIENCEHEADINGTEXT',
    'residual30/S30-0568_audienceheadingtext_repeat_no_lang.xml',
    [...lang('General', 'eng'), ...lang('Allgemein', 'ger')],
  ],
  [
    'R-LANG-REPEAT-TEXTSOURCEDESC',
    'residual30/S30-0611_textsourcedescription_repeat_no_lang.xml',
    [...lang('Critic', 'eng'), ...lang('Kritiker', 'ger')],
  ],
  [
    'R-LANG-ALLORNONE-CITEDCONTENT-RESOURCELINK',
    'residual30/S30-0645_citedcontent_resourcelink_partial_lang.xml',
    [['<ResourceLink>https://example.org/fr', '<ResourceLink language="fre">https://example.org/fr']],
  ],
  [
    'R-EVENTOCC-STARTDATE',
    'residual30/S30-0738_eventoccurrence_no_start_date.xml',
    [['<OccurrenceDateRole>02<', '<OccurrenceDateRole>01<']],
  ],
  [
    'R-FUNDING-ROLE',
    'residual30/S30-0842_funding_with_publisher_role_01.xml',
    [
      [
        '<PublishingRole>01</PublishingRole><PublisherName>SPIKE</PublisherName><Funding>',
        '<PublishingRole>16</PublishingRole><PublisherName>SPIKE</PublisherName><Funding>',
      ],
    ],
  ],
  [
    'R-LANG-REPEAT-CITYOFPUB',
    'residual30/S30-0857_cityofpublication_repeat_no_lang.xml',
    [...lang('Bruxelles', 'fre'), ...lang('Brussel', 'dut')],
  ],
  [
    'R-LANG-REPEAT-RESFILEFEATUREDESC',
    'residual30/S30-1001_resourcefilefeaturedescription_repeat_no_lang.xml',
    [...lang('Foil', 'eng'), ...lang('Folie', 'ger')],
  ],
  [
    'R-LANG-REPEAT-RESFILEDESC',
    'residual30/S30-1003_cover_resourcefiledescription_repeat_no_lang.xml',
    [...lang('96kHz', 'eng'), ...lang('96 kHz', 'fre')],
  ],
  [
    'R-LANG-REPEAT-RESFILEDESC',
    'residual30/S30-1048_body_resourcefiledescription_repeat_no_lang.xml',
    [...lang('Text block', 'eng'), ...lang('Bloc de texte', 'fre')],
  ],
  [
    'R-LANG-REPEAT-RESFILECONTENTDESC',
    'residual30/S30-1005_cover_resourcefilecontentdescription_repeat_no_lang.xml',
    [...lang('CMYK', 'eng'), ...lang('CMJN', 'fre')],
  ],
  [
    'R-LANG-REPEAT-SPECFEATUREDESC',
    'residual30/S30-1027_specificationfeaturedescription_repeat_no_lang.xml',
    [...lang('Matt lamination', 'eng'), ...lang('Laminage mat', 'fre')],
  ],
  [
    'R-LANG-REPEAT-SPECDESC',
    'residual30/S30-1029_specificationdescription_repeat_no_lang.xml',
    [...lang('Perfect bound', 'eng'), ...lang('Dos carre colle', 'fre')],
  ],
  ['R-INSERTPOINT-FORMAT', 'residual30/S30-1064_insertpointvalue_not_integer.xml', [['forty-nine', '49']]],
  [
    'R-LANG-REPEAT-SUPPLEMENT-PRODUCTFORMDESC',
    'residual30/S30-1078_supplement_productformdescription_repeat_no_lang.xml',
    [...lang('Booklet', 'eng'), ...lang('Livret', 'fre')],
  ],
  [
    'R-RETURNS-TYPENAME',
    'residual30/S30-1219_returns_proprietary_no_typename.xml',
    [
      [
        '<ReturnsCodeType>00</ReturnsCodeType>',
        '<ReturnsCodeType>00</ReturnsCodeType><ReturnsCodeTypeName>House</ReturnsCodeTypeName>',
      ],
    ],
  ],
  [
    'R-NEWSUPPLIER-AVAIL',
    'residual30/S30-1231_newsupplier_with_availability_21.xml',
    [
      [
        '<ProductAvailability>21</ProductAvailability><NewSupplier>',
        '<ProductAvailability>43</ProductAvailability><NewSupplier>',
      ],
    ],
  ],
  [
    'R-STOCK-REPEAT-LOCATION',
    'residual30/S30-1243_stock_repeats_no_location.xml',
    [
      [
        '<Stock><OnHand>10</OnHand></Stock><Stock><OnHand>5</OnHand></Stock>',
        '<Stock><LocationName>A</LocationName><OnHand>10</OnHand></Stock><Stock><LocationName>B</LocationName><OnHand>5</OnHand></Stock>',
      ],
    ],
  ],
  [
    'R-STOCKQTY-TYPENAME',
    'residual30/S30-1254_stockquantity_proprietary_no_typename.xml',
    [
      [
        '<StockQuantityCodeType>01</StockQuantityCodeType>',
        '<StockQuantityCodeType>01</StockQuantityCodeType><StockQuantityCodeTypeName>House</StockQuantityCodeTypeName>',
      ],
    ],
  ],
  [
    'R-ONORDER-SUM',
    'residual30/S30-1268_onorder_less_than_detail.xml',
    [['<OnOrder>5</OnOrder>', '<OnOrder>8</OnOrder>']],
  ],
  [
    'R-PRICEID-UNIQUE-PRODUCT',
    'residual30/S30-1287_priceidentifier_duplicate_across_prices.xml',
    [['<IDValue>P1</IDValue></PriceIdentifier><PriceType>02', '<IDValue>P2</IDValue></PriceIdentifier><PriceType>02']],
  ],
  [
    'R-PRICECODE-TYPENAME',
    'residual30/S30-1346_pricecode_proprietary_no_typename.xml',
    [
      [
        '<PriceCodeType>01</PriceCodeType>',
        '<PriceCodeType>01</PriceCodeType><PriceCodeTypeName>House</PriceCodeTypeName>',
      ],
    ],
  ],
  [
    'R-UNIQ-CONTRIBREF-ROLE-30',
    'residual30x/RUNIQ-CONTRIBREF_duplicate_contributorrole.xml',
    [
      [
        '<ContributorRole>A01</ContributorRole><ContributorRole>A01</ContributorRole>',
        '<ContributorRole>A01</ContributorRole><ContributorRole>B01</ContributorRole>',
      ],
    ],
  ],
  [
    'R-SUBJECTDESC-NONEMPTY-31',
    'residual31/S31-0036_subjectdescription_empty.xml',
    [['<SubjectDescription/>', '<SubjectDescription>Subject</SubjectDescription>']],
  ],
  [
    'R-PRODUCTSUPPLY-NONEMPTY-31',
    'residual31/S31-0041_productsupply_empty.xml',
    [['<ProductSupply/>', '<ProductSupply><MarketReference>M1</MarketReference></ProductSupply>']],
  ],
  [
    'R-MSG-NO-SCHEMALOCATION-31',
    'residual31/S31-0067_xsi_schemalocation_present.xml',
    [
      [
        ' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://ns.editeur.org/onix/3.1/reference ONIX_BookProduct_3.1_reference.xsd"',
        '',
      ],
    ],
  ],
  [
    'R-SUBJECTDESC-TEXTFORMAT-31',
    'residual31/S31-0093_subjectdescription_xhtml_no_textformat.xml',
    [['<SubjectDescription>', '<SubjectDescription textformat="05">']],
  ],
  [
    'R-LANG-REPEAT-TEXTSOURCELINK-31',
    'residual31/S31-0101_textsourcelink_repeat_no_lang.xml',
    [
      ['<TextSourceLink>https://example.com/review/1', '<TextSourceLink language="eng">https://example.com/review/1'],
      ['<TextSourceLink>https://example.com/review/2', '<TextSourceLink language="ger">https://example.com/review/2'],
    ],
  ],
  [
    'R-JSONLD-CONTEXT-31',
    'residual31/S31-0117_jsonld_without_context_type.xml',
    [['{"name":"Example Book"}', '{"@context":"https://schema.org","@type":"Book","name":"Example Book"}']],
  ],
  [
    'R-P6-ONE-COLLECTION-TITLE-31',
    'residual31/S31-0289_two_collection_level_titles_in_p6.xml',
    [
      [
        '<TitleElementLevel>02</TitleElementLevel><TitleText>Series B',
        '<TitleElementLevel>03</TitleElementLevel><TitleText>Series B',
      ],
    ],
  ],
  [
    'R-COLL-TITLELESS-P6-31',
    'residual31/S31-0291_titleless_collection_no_p6_collection_title.xml',
    [
      [
        '<TitleElement><TitleElementLevel>01</TitleElementLevel><TitleText>Residual S31-0291',
        '<TitleElement><TitleElementLevel>02</TitleElementLevel><TitleText>Great Series</TitleText></TitleElement><TitleElement><TitleElementLevel>01</TitleElementLevel><TitleText>Residual S31-0291',
      ],
    ],
  ],
  [
    'R-COLLELEMENTLEVEL-MATCH-31',
    'residual31/S31-0297_collectionelementlevel_no_matching_title.xml',
    [['<CollectionElementLevel>03</CollectionElementLevel>', '<CollectionElementLevel>02</CollectionElementLevel>']],
  ],
  [
    'R-COLLELEMENTLEVEL-CODES-31',
    'residual31/S31-0298_collectionelementlevel_code_01.xml',
    [['<CollectionElementLevel>01</CollectionElementLevel>', '<CollectionElementLevel>02</CollectionElementLevel>']],
  ],
  [
    'R-PUBNAMEINV-NOTFORSALE-31',
    'residual31/S31-1058_publishernameinverted_in_for_sale_rights.xml',
    [['<SalesRightsType>01</SalesRightsType>', '<SalesRightsType>03</SalesRightsType>']],
  ],
  [
    'R-CL-158-53-31',
    'residual31x/C-List158-53_resourcecontenttype_53_in_31.xml',
    [['<ResourceContentType>53</ResourceContentType>', '<ResourceContentType>01</ResourceContentType>']],
  ],
];

const validators: Partial<Record<OnixRelease, OrdinaryValidator>> = {};
beforeAll(async () => {
  const resources = new Map(
    ONIX_VALIDATION_RESOURCES.map((r) => [r.fileName, new Uint8Array(readFileSync(join(PUBLIC_DIR, r.fileName)))]),
  );
  for (const r of ['3.0', '3.1'] as const) {
    validators[r] = await createOrdinaryValidator(resources, `ONIX_BookProduct_${r}_reference.xsd`);
  }
});
const ordinaryDiagnostics = (text: string, r: OnixRelease) =>
  validators[r]!.validate(new TextEncoder().encode(text)).diagnostics.map((d) => d.message);
const apply = (text: string, edits: Edit[]) =>
  edits.reduce((t, [from, to]) => {
    if (!t.includes(from)) throw new Error(`edit anchor not found: ${from}`);
    return t.replace(from, to);
  }, text);

describe('formalised register-only residual rules', () => {
  it('covers every formalised rule with an approved violating fixture', () => {
    const covered = new Set(RESIDUAL_CASES.map(([id]) => id));
    expect(RESIDUAL_FORMALISATIONS.map((b) => b.id).filter((id) => id !== 'R-MSG-XMLDECL' && !covered.has(id))).toEqual(
      [],
    );
  });

  it.each(RESIDUAL_CASES)('%s: %s fires; the conforming variant does not', (id, path, edits) => {
    const violating = fixture(path);
    const conforming = apply(violating, edits);
    const r = run(violating).release;
    expect(ordinaryDiagnostics(violating, r), 'violating fixture is ordinary-valid').toEqual([]);
    expect(ordinaryDiagnostics(conforming, r), 'conforming variant is ordinary-valid').toEqual([]);
    const hits = run(violating).findings.filter((f) => f.id === id);
    expect(hits.length, 'violating fixture fires').toBeGreaterThan(0);
    expect(hits.filter((f) => f.error)).toEqual([]);
    expect(run(conforming).findings.filter((f) => f.id === id)).toEqual([]);
  });

  it('R-MSG-XMLDECL is advisory and follows the prolog scan', () => {
    const text = fixture('residual30/S30-0018_no_xml_declaration.xml');
    const gate = evaluateSourceGate(text);
    expect(gate.kind === 'CONTINUE' && gate.scan.xmlDecl).toBe(false);
    const findings = run(text, undefined, { ...ENV, xmlDeclaration: false }).findings.filter(
      (f) => f.id === 'R-MSG-XMLDECL',
    );
    expect(findings.map((f) => [f.path, f.disposition])).toEqual([['/ONIXMessage[1]', 'ADVISORY']]);
    expect(run(text).findings.filter((f) => f.id === 'R-MSG-XMLDECL')).toEqual([]);
  });

  it('R-XHTML-INTERLINEAR admits annotation delimiters in plain text', () => {
    const plain = fixture('residual30/S30-0077_interlinear_with_xhtml.xml').replace(
      '<Text textformat="05"><p>&#xFFF9;漢字&#xFFFA;かんじ&#xFFFB;</p></Text>',
      '<Text>&#xFFF9;漢字&#xFFFA;かんじ&#xFFFB;</Text>',
    );
    expect(run(plain).findings.filter((f) => f.id === 'R-XHTML-INTERLINEAR')).toEqual([]);
  });

  it('R-LANG-ALLORNONE admits repeats that carry no language at all', () => {
    const none = fixture('residual30/S30-0645_citedcontent_resourcelink_partial_lang.xml').replace(
      ' language="eng"',
      '',
    );
    expect(run(none).findings.filter((f) => f.id === 'R-LANG-ALLORNONE-CITEDCONTENT-RESOURCELINK')).toEqual([]);
  });

  it.each([
    ['ALP', '49', false],
    ['APP', '0012', false],
    ['ALP', '12a', true],
    ['ATC', '0012030', false],
    ['ATC', '001203050', false],
    ['ATC', '0016000', true],
    ['ATC', '12030', true],
    ['AHL', 'chapter-3', false],
  ])('R-INSERTPOINT-FORMAT: %s %s violates=%s', (type, value, violates) => {
    const text = fixture('residual30/S30-1064_insertpointvalue_not_integer.xml').replace(
      '<InsertPointType>ALP</InsertPointType><InsertPointValue>forty-nine</InsertPointValue>',
      `<InsertPointType>${type}</InsertPointType><InsertPointValue>${value}</InsertPointValue>`,
    );
    expect(run(text).findings.filter((f) => f.id === 'R-INSERTPOINT-FORMAT').length > 0).toBe(violates);
  });

  it.each([
    ['{"@type":"Book","@context":"https://schema.org"}', false],
    ['  {"@context":{"@vocab":"https://schema.org/"},"@type":"Book"}', false],
    ['{"@context":"https://schema.org","name":"x","@type":"Book"}', true],
    ['{"@context":', true],
    ['["@context","@type"]', true],
  ])('R-JSONLD-CONTEXT-31: %s violates=%s', (json, violates) => {
    const text = fixture('residual31/S31-0117_jsonld_without_context_type.xml').replace(
      '{"name":"Example Book"}',
      json,
    );
    expect(run(text).findings.filter((f) => f.id === 'R-JSONLD-CONTEXT-31').length > 0).toBe(violates);
  });
});

describe('block-update guards (NotificationType 04 records without the referent block)', () => {
  it.each([
    ['BU-CREF_admit_block7_only.xml', 'R-KERNEL-CONTRIBREF-MATCH', false],
    ['BU-CREF_fire_block1_present_unmatched.xml', 'R-KERNEL-CONTRIBREF-MATCH', true],
    ['BU-MANIFF_admit_block8_only.xml', 'R-KERNEL-MANIFEST-ID-IFF-PARTS', false],
    ['BU-MANIFF_fire_block1_present_no_parts.xml', 'R-KERNEL-MANIFEST-ID-IFF-PARTS', true],
    ['BU-MANMATCH_admit_block8_only.xml', 'R-MANIFEST-ID-MATCHPART', false],
    ['BU-MANMATCH_fire_block1_present.xml', 'R-MANIFEST-ID-MATCHPART', true],
    ['BU-MANSAME_admit_block8_only.xml', 'R-MANIFEST-ID-SAMEPART', false],
    ['BU-SUPPDIST_admit_equals_part_block8_only.xml', 'R-SUPPLEMENT-ID-DISTINCT', false],
    ['BU-SUPPDIST_fire_equals_product_p2_block8_only.xml', 'R-SUPPLEMENT-ID-DISTINCT', true],
    ['BU-TAXMATCH_admit_block6_only.xml', 'R-TAX-ID-MATCHPART', false],
    ['BU-TAXMATCH_fire_block1_present.xml', 'R-TAX-ID-MATCHPART', true],
  ])('%s -> %s fires=%s', (name, id, fires) => {
    for (const set of ['skernel30', 'skernel31']) {
      expect(
        run(fixture(`${set}/${name}`)).findings.some((f) => f.id === id),
        set,
      ).toBe(fires);
    }
  });
});

describe('external-authority boundary and EIDR', () => {
  const entry = (id: string) => SOURCE_RULE_INVENTORY.find((e) => e.id === id)!;

  it('keeps external checks that are not adopted visible but non-blocking', () => {
    expect([entry('K-SIRET-CHECK').authority_class, entry('K-SIRET-CHECK').disposition]).toEqual([
      'EXTERNAL_ADOPTION_REQUIRED',
      'ADVISORY',
    ]);
    expect([entry('R-KERNEL-LEXILE-SHAPE').authority_class, entry('R-KERNEL-LEXILE-SHAPE').disposition]).toEqual([
      'EXTERNAL_ADOPTION_REQUIRED',
      'ADVISORY',
    ]);
    // The approved v4 firing fixtures (a 14-digit SIRET failing Luhn; a non-Lexile value).
    const siret = run(fixture('kernel30/K-SIRET_pos_bad_check.xml')).findings;
    expect(siret.filter((f) => f.id === 'K-SIRET-CHECK').map((f) => f.disposition)).toEqual(['ADVISORY']);
    const lexile = run(fixture('skernel30/S-LEXILE_pos_not_lexile.xml')).findings;
    expect(lexile.filter((f) => f.id === 'R-KERNEL-LEXILE-SHAPE').map((f) => f.disposition)).toEqual(['ADVISORY']);
    // The La Poste exception and a Luhn-valid SIRET pass the check.
    for (const name of ['S-SIRET-SHAPE_neg_14_digits_laposte.xml', 'S-SIRET-SHAPE_neg_14_digits_luhn.xml']) {
      expect(
        run(fixture(`skernel30/${name}`)).findings.some((f) => f.id === 'K-SIRET-CHECK'),
        name,
      ).toBe(false);
    }
  });

  it('blocks only on the narrowly adopted EIDR Content-ID check-character alphabet', () => {
    expect([entry('K-EIDR-CONTENT-ID').authority_class, entry('K-EIDR-CONTENT-ID').disposition]).toEqual([
      'EXTERNAL_ADOPTED',
      'NORMATIVE_INVALID',
    ]);
  });

  it('binds K-EIDR-PARTY-ID (ONIX-stated) to every List-44 identifier owner', () => {
    expect([entry('K-EIDR-PARTY-ID').authority_class, entry('K-EIDR-PARTY-ID').disposition]).toEqual([
      'ONIX_STATED',
      'NORMATIVE_INVALID',
    ]);
    const owners = (r: OnixRelease) =>
      KERNEL_BINDINGS.filter((b) => b.id === 'K-EIDR-PARTY-ID' && b.releases.includes(r)).map((b) => b.owner);
    expect([owners('3.0').length, owners('3.1').length]).toEqual([11, 11]);
    expect(owners('3.0')).toContain('ConferenceSponsorIdentifier');
    expect(owners('3.1')).toContain('AffiliationIdentifier');
  });

  it.each([
    ['eidr30', 'K-EIDRP_neg_CopyrightOwnerIdentifier_hyphen_layout_1_7.xml'],
    ['eidr31', 'K-EIDRP_neg_CopyrightOwnerIdentifier_hyphen_layout_1_7_official_rejects.xml'],
  ])('%s: enforces the ONIX-stated Party ID structure only', (set, boundary) => {
    const fires = (name: string) => run(fixture(`${set}/${name}`)).findings.some((f) => f.id === 'K-EIDR-PARTY-ID');
    expect(fires('K-EIDRP_pos_CopyrightOwnerIdentifier_no_hyphen.xml')).toBe(true);
    expect(fires('K-EIDRP_neg_CopyrightOwnerIdentifier_onix_example.xml')).toBe(false);
    // The 1-7 hyphen layout meets the ONIX-stated structure; the EIDR-owned 4-4 layout is not adopted.
    expect(fires(boundary)).toBe(false);
    expect(fires('K-EIDRP_neg_CopyrightOwnerIdentifier_type01_control.xml')).toBe(false);
  });
});

describe('evaluation failure', () => {
  it('turns a raising Thoth rule into an explicit not-evaluable finding, never a pass', () => {
    const raising: InventoryBinding = {
      id: 'T-FAIL-RAISES',
      kind: 'NORMATIVE_KERNEL_RULE',
      owner: 'Product',
      releases: ['3.0', '3.1'],
      disposition: 'NORMATIVE_INVALID',
      xpath: 'error()',
    };
    const { findings } = run(fixture('dtd_suite30/N3_plain.xml'), [raising]);
    expect(findings).toHaveLength(1);
    expect(findings[0].error).toMatch(/FOER0000/);
  });
});
