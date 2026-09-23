import { parse } from '@5stones/onix';
import { describe, expect, it, vi } from 'vitest';

import {
  ONIX_RELATED_MATERIAL_ACKNOWLEDGED,
  ONIX_RELATION_OMIT,
  ONIX_RELATION_PROJECT,
  type OnixExistingReference,
  type OnixExistingWorkRelation,
  type OnixPlannedReference,
  type OnixRelatedMaterialWorkMatch,
  type OnixRelationEdge,
  type OnixRelationEndpoint,
  type OnixTargetEvidence,
} from '../../types/onixPlanning';
import { importIdentifierKey } from '../../utils/importPreflight/identifiers';
import type { ExtendedONIXMessageRoot } from './interfaces';
import { planOnixSource } from './onixPlanning';
import {
  compareOnixExistingReferences,
  isOfferedOnixRelatedMaterialAnswer,
  type OnixRelatedMaterialLookup,
  onixRelatedMaterialLookupIdentifiers,
  type OnixRelationGroupState,
  reduceOnixRelatedMaterial,
  resolveOnixProductReferences,
  resolveOnixRelatedMaterialTargets,
  resolveOnixRelations,
  resolveOnixWorkReferences,
} from './onixRelations';

/*
 * The canonical RelatedMaterial relation graph and Reference planning (thoth-app#224), under the approved RelatedMaterial
 * decision (#179 5541586341 / 5541683453) and #224 Specification Amendment 1 (5798149019). Every fixture is a real ONIX
 * message parsed as the importer parses one, planned by the real #182 planner, so Work identities are the grouped ones.
 */

const NAMESPACES = {
  '3.0': 'http://ns.editeur.org/onix/3.0/reference',
  '3.1': 'http://ns.editeur.org/onix/3.1/reference',
} as const;
const GENERIC_HEADER =
  '<Header><Sender><SenderName>Example Press</SenderName></Sender><SentDateTime>20260923T1200</SentDateTime></Header>';
const THOTH_HEADER =
  '<Header><Sender><SenderName>Thoth</SenderName><EmailAddress>distribution@thoth.pub</EmailAddress></Sender><SentDateTime>20260923T1200</SentDateTime></Header>';

const IMPRINT_ID = 'imprint-1';
const OTHER_IMPRINT_ID = 'imprint-of-another-publisher';

const ISBN_A = '9781800000018';
const ISBN_A2 = '9781800000025';
const ISBN_B = '9781800000032';
const ISBN_C = '9781800000049';
const ISBN_D = '9781800000056';
const ISBN_E = '9781800000063';
const ISBN_X = '9781800000070';

const pid = (type: string, value: string, name?: string) =>
  `<ProductIdentifier><ProductIDType>${type}</ProductIDType>${name ? `<IDTypeName>${name}</IDTypeName>` : ''}<IDValue>${value}</IDValue></ProductIdentifier>`;
const wid = (type: string, value: string, name?: string) =>
  `<WorkIdentifier><WorkIDType>${type}</WorkIDType>${name ? `<IDTypeName>${name}</IDTypeName>` : ''}<IDValue>${value}</IDValue></WorkIdentifier>`;
const relatedWork = (code: string, ...identifiers: string[]) =>
  `<RelatedWork><WorkRelationCode>${code}</WorkRelationCode>${identifiers.join('')}</RelatedWork>`;
const relatedProduct = (codes: string | string[], ...identifiers: string[]) =>
  `<RelatedProduct>${[codes]
    .flat()
    .map((code) => `<ProductRelationCode>${code}</ProductRelationCode>`)
    .join('')}${identifiers.join('')}</RelatedProduct>`;
/** The Work a Product manifests, by its DOI (RelatedWork 01), as #182 groups Products into Works. */
const manifests = (doi: string) => relatedWork('01', wid('06', doi));

type ProductSpec = {
  readonly ref: string;
  readonly isbn?: string;
  readonly identifiers?: readonly string[];
  readonly envelope?: string;
  readonly form?: string;
  readonly works?: readonly string[];
  readonly products?: readonly string[];
  readonly content?: string;
  readonly collateral?: string;
};

const product = ({
  ref,
  isbn,
  identifiers = [],
  envelope = '',
  form = 'BC',
  works = [],
  products = [],
  content = '',
  collateral = '',
}: ProductSpec) =>
  `<Product><RecordReference>${ref}</RecordReference><NotificationType>03</NotificationType>${envelope}` +
  `${isbn ? pid('15', isbn) : ''}${identifiers.join('')}` +
  `<DescriptiveDetail><ProductComposition>00</ProductComposition><ProductForm>${form}</ProductForm>` +
  '<TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>01</TitleElementLevel><TitleText>A Work</TitleText></TitleElement></TitleDetail>' +
  '</DescriptiveDetail>' +
  (collateral ? `<CollateralDetail>${collateral}</CollateralDetail>` : '') +
  (content ? `<ContentDetail>${content}</ContentDetail>` : '') +
  '<PublishingDetail><Imprint><ImprintName>Example Imprint</ImprintName></Imprint><PublishingStatus>02</PublishingStatus></PublishingDetail>' +
  (works.length + products.length > 0
    ? `<RelatedMaterial>${works.join('')}${products.join('')}</RelatedMaterial>`
    : '') +
  '</Product>';

const message = (products: readonly string[], header = GENERIC_HEADER, release: '3.0' | '3.1' = '3.0') =>
  parse(
    `<ONIXMessage release="${release}" xmlns="${NAMESPACES[release]}">${header}${products.join('')}</ONIXMessage>`,
  ) as ExtendedONIXMessageRoot;

type GroupOverride = Partial<Omit<OnixRelationGroupState, 'groupKey'>>;

type Scenario = {
  readonly header?: string;
  readonly release?: '3.0' | '3.1';
  /** What each group resolved to, by the record reference of any of its Products. */
  readonly groups?: Readonly<Record<string, GroupOverride>>;
  /** Existing Works an exact global lookup names, by `importIdentifierKey`. */
  readonly matches?: Readonly<Record<string, readonly OnixRelatedMaterialWorkMatch[]>>;
  /** The relations each existing Work holds. */
  readonly relations?: Readonly<Record<string, readonly OnixExistingWorkRelation[]>>;
  readonly references?: Readonly<Record<string, readonly OnixExistingReference[]>>;
  /** Whether Thoth was asked at all: without it, nothing outside the file is ever assumed. */
  readonly lookedUp?: boolean;
  readonly choices?: Readonly<Record<string, string>>;
};

const existing = (workId: string, imprintId = IMPRINT_ID, languageCodes: readonly string[] = []) => ({
  workId,
  imprintId,
  languageCodes,
});

const relate = async (products: readonly string[], scenario: Scenario = {}) => {
  const root = message(products, scenario.header, scenario.release);
  const sourcePlan = planOnixSource(root);
  const plan = reduceOnixRelatedMaterial(root, sourcePlan);
  const recordOf = (ref: string) => sourcePlan.records.find(({ recordReference }) => recordReference === ref);
  const productKeyOf = (ref: string) => recordOf(ref)?.productKey as string;
  const groupKeyOf = (ref: string) =>
    sourcePlan.products.find(({ productKey }) => productKey === productKeyOf(ref))?.groupKey as string;
  const overrides = new Map(
    Object.entries(scenario.groups ?? {}).map(([ref, override]) => [groupKeyOf(ref), override]),
  );
  const groups = new Map(
    sourcePlan.groups.map((group, index): [string, OnixRelationGroupState] => {
      const override = overrides.get(group.groupKey) ?? {};
      const [first] = sourcePlan.products
        .filter(({ groupKey }) => groupKey === group.groupKey)
        .sort(
          (a, b) =>
            (sourcePlan.records.find(({ productKey }) => productKey === a.productKey)?.index ?? 0) -
            (sourcePlan.records.find(({ productKey }) => productKey === b.productKey)?.index ?? 0),
        );

      return [
        group.groupKey,
        {
          groupKey: group.groupKey,
          target: 'NEW_WORK',
          existingWorkId: null,
          existingImprintId: null,
          plannedWorkId: `work-${index + 1}`,
          thothProfileActive: false,
          languageCodes: null,
          representativeProductKey: first?.productKey ?? null,
          ...override,
        },
      ];
    }),
  );
  const lookup = {
    findWorksGlobally: vi.fn(
      async (identifiers: Parameters<OnixRelatedMaterialLookup['findWorksGlobally']>[0]) =>
        new Map(
          identifiers.map((identifier) => [
            importIdentifierKey(identifier),
            scenario.matches?.[importIdentifierKey(identifier)] ?? [],
          ]),
        ),
    ),
    getWorkRelations: vi.fn(async (workId: string) => scenario.relations?.[workId] ?? []),
    getWorkReferences: vi.fn(async (workId: string) => scenario.references?.[workId] ?? []),
  } satisfies OnixRelatedMaterialLookup;
  const existingWorkIds = [...groups.values()].flatMap(({ existingWorkId }) =>
    existingWorkId === null ? [] : [existingWorkId],
  );
  const targets = {
    publisherId: 'publisher-1',
    identifiers: [],
    works: existingWorkIds.map((workId) => ({ workId })),
  } as unknown as OnixTargetEvidence;
  const evidence =
    scenario.lookedUp === false
      ? undefined
      : await resolveOnixRelatedMaterialTargets(plan, sourcePlan, targets, lookup);
  const resolveWith = (choices: Readonly<Record<string, string>> | undefined) =>
    resolveOnixRelations(plan, { sourcePlan, groups, evidence, imprintIds: new Set([IMPRINT_ID]), choices });
  const result = resolveWith(scenario.choices);
  const outcomeOf = (ref: string, code: string, construct?: 'RELATED_WORK' | 'RELATED_PRODUCT') =>
    result.outcomes.find(
      (outcome) =>
        outcome.productKey === productKeyOf(ref) &&
        outcome.code === code &&
        (construct === undefined || outcome.construct === construct),
    );
  const findingsOf = (code: string) => result.findings.filter((finding) => finding.code === code);

  return {
    root,
    sourcePlan,
    plan,
    groups,
    evidence,
    lookup,
    result,
    resolveWith,
    productKeyOf,
    groupKeyOf,
    outcomeOf,
    findingsOf,
  };
};

const endpointIdentity = (endpoint: OnixRelationEndpoint) =>
  endpoint.kind === 'EXISTING_WORK' ? `work:${endpoint.workId}` : `group:${endpoint.groupKey}`;
const identities = ({ relator, related }: Pick<OnixRelationEdge, 'relator' | 'related'>) => [
  endpointIdentity(relator),
  endpointIdentity(related),
];

describe('reduceOnixRelatedMaterial', () => {
  it('keeps RelatedWork and RelatedProduct apart, in source order, one declaration per ProductRelationCode', async () => {
    const { plan, productKeyOf } = await relate([
      product({
        ref: 'a',
        isbn: ISBN_A,
        works: [manifests('10.1234/a'), relatedWork('29', wid('06', '10.1234/original'))],
        products: [
          relatedProduct('06', pid('15', ISBN_A2)),
          relatedProduct(['34', '13'], pid('06', '10.1234/cited')),
          relatedProduct('35', pid('06', '10.1234/citing')),
        ],
      }),
    ]);

    expect(
      plan.declarations.map(({ construct, code, order, semantics, productKey }) => [
        construct,
        code,
        order,
        semantics.kind,
        productKey === productKeyOf('a'),
      ]),
    ).toEqual([
      ['RELATED_WORK', '01', 1, 'WORK_IDENTITY', true],
      ['RELATED_WORK', '29', 2, 'TRANSLATION', true],
      ['RELATED_PRODUCT', '06', 3, 'GROUPING_EVIDENCE', true],
      ['RELATED_PRODUCT', '34', 4, 'CITATION', true],
      ['RELATED_PRODUCT', '13', 5, 'UNREPRESENTABLE', true],
      ['RELATED_PRODUCT', '35', 6, 'CITED_BY', true],
    ]);
    // Each identifier is kept by its declared type, at its own path.
    expect(plan.declarations[1].identifiers).toEqual([
      expect.objectContaining({
        type: '06',
        value: '10.1234/original',
        path: '/ONIXMessage[1]/Product[1]/RelatedMaterial[1]/RelatedWork[2]/WorkIdentifier[1]',
      }),
    ]);
    // Only code 34 is a citation: a RelatedProduct stating 34 and 13 is one citation and one unrepresentable relation.
    expect(plan.citations[productKeyOf('a')].map(({ ordinal, doi }) => [ordinal, doi])).toEqual([
      [1, { kind: 'VALUE', value: 'https://doi.org/10.1234/cited', locations: [expect.any(Object)] }],
    ]);
  });

  it('never reads CitedContent as a citation: it is REL-01D’s, and never enters this reduction', async () => {
    const { plan, productKeyOf } = await relate([
      product({
        ref: 'a',
        isbn: ISBN_A,
        collateral:
          '<CitedContent><CitedContentType>01</CitedContentType><ContentAudience>00</ContentAudience><CitationNote>A review</CitationNote><ResourceLink>https://example.org/review</ResourceLink></CitedContent>',
      }),
    ]);

    expect(plan.citations[productKeyOf('a')]).toEqual([]);
    expect(plan.declarations).toEqual([]);
  });

  it('keeps a RelatedWork or RelatedProduct stated inside a ContentItem as a component-scoped fact of its own', async () => {
    const { plan } = await relate([
      product({
        ref: 'a',
        isbn: ISBN_A,
        content:
          '<ContentItem><LevelSequenceNumber>1</LevelSequenceNumber><TextItem><TextItemType>03</TextItemType></TextItem>' +
          '<TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>04</TitleElementLevel><TitleText>Chapter</TitleText></TitleElement></TitleDetail>' +
          `${relatedWork('29', wid('06', '10.1234/chapter-original'))}${relatedProduct('34', pid('06', '10.1234/chapter-cited'))}</ContentItem>`,
      }),
    ]);

    expect(plan.declarations).toEqual([]);
    expect(plan.componentFacts.map(({ construct, codes, componentPath }) => [construct, codes, componentPath])).toEqual(
      [
        ['RELATED_WORK', ['29'], '/ONIXMessage[1]/Product[1]/ContentDetail[1]/ContentItem[1]'],
        ['RELATED_PRODUCT', ['34'], '/ONIXMessage[1]/Product[1]/ContentDetail[1]/ContentItem[1]'],
      ],
    );
  });
});

describe('resolveOnixRelations', () => {
  describe('source semantics (5541586341 rules 7-20)', () => {
    it('never makes a WorkRelation of RelatedProduct 06, 34 or 35, even when their identifiers name another Work of the file', async () => {
      const { result, outcomeOf, findingsOf } = await relate([
        product({
          ref: 'a',
          isbn: ISBN_A,
          works: [manifests('10.1234/a')],
          products: [
            relatedProduct('06', pid('15', ISBN_B)),
            relatedProduct('34', pid('06', '10.1234/b')),
            relatedProduct('35', pid('06', '10.1234/b')),
          ],
        }),
        product({ ref: 'b', isbn: ISBN_B, identifiers: [pid('06', '10.1234/b')], works: [manifests('10.1234/b')] }),
      ]);

      expect(result.edges).toEqual([]);
      expect(outcomeOf('a', '06')?.outcome).toBe('GROUPING_EVIDENCE');
      expect(outcomeOf('a', '34')?.outcome).toBe('CITATION');
      expect(outcomeOf('a', '35')?.outcome).toBe('UNREPRESENTABLE');
      expect(findingsOf('RELATION_CITED_BY_UNREPRESENTABLE')).toEqual([
        expect.objectContaining({ classification: 'TARGET_UNREPRESENTABLE', blocking: false }),
      ]);
      expect(result.pendingFindingKeys).toEqual([]);
    });

    it('surfaces an alternative format the grouping could not read, beside another code in one RelatedProduct', async () => {
      const { result, outcomeOf, findingsOf } = await relate([
        product({ ref: 'a', isbn: ISBN_A, products: [relatedProduct(['06', '13'], pid('15', ISBN_B))] }),
        product({ ref: 'b', isbn: ISBN_B }),
      ]);

      expect(outcomeOf('a', '06')?.outcome).toBe('GAP');
      expect(findingsOf('RELATION_GROUPING_EVIDENCE_UNREAD')).toEqual([
        expect.objectContaining({ classification: 'PREFLIGHT_GAP', blocking: true, resolution: { kind: 'NONE' } }),
      ]);
      expect(result.pendingFindingKeys).toContain(findingsOf('RELATION_GROUPING_EVIDENCE_UNREAD')[0].key);
    });

    it.each([
      ['02', 'a generic derivation'],
      ['03', 'a generic inverse derivation'],
      ['04', 'another work of the same collection'],
      ['05', 'another work of the same contributor'],
      ['21', 'an abridgement'],
      ['28', 'a revision'],
      ['30', 'an adaptation'],
      ['41', 'the inverse of an abridgement'],
      ['48', 'the inverse of a revision'],
      ['50', 'the inverse of an adaptation'],
    ])('never coerces RelatedWork %s (%s) into a Thoth relation', async (code) => {
      const { result, outcomeOf, findingsOf, lookup } = await relate([
        product({
          ref: 'a',
          isbn: ISBN_A,
          works: [manifests('10.1234/a'), relatedWork(code, wid('06', '10.1234/b'))],
        }),
        product({ ref: 'b', isbn: ISBN_B, works: [manifests('10.1234/b')] }),
      ]);

      expect(result.edges).toEqual([]);
      expect(outcomeOf('a', code)?.outcome).toBe('UNREPRESENTABLE');
      expect(findingsOf('RELATION_UNREPRESENTABLE')).toEqual([
        expect.objectContaining({ blocking: false, detail: { construct: 'RELATED_WORK', code } }),
      ]);
      // Nothing is ever looked up for a relation that could never be created.
      expect(lookup.findWorksGlobally).not.toHaveBeenCalled();
    });

    it.each(['98', '99'])(
      'keeps RelatedWork %s, an LRM workaround, as a disclosed loss and no relation',
      async (code) => {
        const { result, outcomeOf, findingsOf } = await relate([
          product({ ref: 'a', isbn: ISBN_A, works: [relatedWork(code, wid('01', 'lrm-1', 'LRM'))] }),
        ]);

        expect(result.edges).toEqual([]);
        expect(outcomeOf('a', code)?.outcome).toBe('UNREPRESENTABLE');
        expect(findingsOf('RELATION_LRM_UNREPRESENTABLE')).toHaveLength(1);
        expect(result.pendingFindingKeys).toEqual([]);
      },
    );

    it('has no fallback: an unknown RelatedProduct code is an unrepresentable relation, never another type', async () => {
      const { result, outcomeOf } = await relate([
        product({ ref: 'a', isbn: ISBN_A, products: [relatedProduct('24', pid('15', ISBN_B))] }),
      ]);

      expect(result.edges).toEqual([]);
      expect(outcomeOf('a', '24')?.outcome).toBe('UNREPRESENTABLE');
    });
  });

  describe('translation (RelatedWork 29/49) and exact endpoints (rules 21-26)', () => {
    const a = (...works: string[]) => product({ ref: 'a', isbn: ISBN_A, works: [manifests('10.1234/a'), ...works] });
    const b = (...works: string[]) => product({ ref: 'b', isbn: ISBN_B, works: [manifests('10.1234/b'), ...works] });

    it('plans RelatedWork 49 to a Work of the same file as HAS_TRANSLATION, and 29 as IS_TRANSLATION_OF', async () => {
      const has = await relate([a(relatedWork('49', wid('06', '10.1234/b'))), b()]);
      const is = await relate([a(relatedWork('29', wid('06', 'https://doi.org/10.1234/b'))), b()]);

      [has, is].forEach(({ result, lookup }) => {
        expect(result.edges).toHaveLength(1);
        // The endpoint is the grouped Work of the same import: nothing is looked up for it.
        expect(lookup.findWorksGlobally).not.toHaveBeenCalled();
      });
      expect(has.result.edges[0]).toMatchObject({
        relator: { kind: 'PLANNED_WORK', groupKey: has.groupKeyOf('a'), plannedWorkId: 'work-1' },
        related: { kind: 'PLANNED_WORK', groupKey: has.groupKeyOf('b'), plannedWorkId: 'work-2' },
        relationType: 'HAS_TRANSLATION',
        basis: 'RELATED_WORK_TRANSLATION',
        state: 'PLANNED',
        ordinal: { status: 'ASSIGNED', ordinal: 1, basis: 'SOURCE_ORDER_WITHIN_TYPE', after: 0 },
      });
      expect(is.result.edges[0]).toMatchObject({ relationType: 'IS_TRANSLATION_OF', state: 'PLANNED' });
      // A planned edge waits on #187, which creates ordinary Work relations: it always blocks here.
      expect(has.findingsOf('RELATION_EXECUTION_DEFERRED')).toEqual([
        expect.objectContaining({ classification: 'EXECUTION_DEFERRED', blocking: true, resolution: { kind: 'NONE' } }),
      ]);
      expect(has.findingsOf('RELATION_ORDINAL_NORMALISED')).toEqual([
        expect.objectContaining({
          classification: 'SUPPORTED_NORMALIZED',
          blocking: false,
          detail: expect.objectContaining({ ordinal: 1, after: 0 }),
        }),
      ]);
      expect(has.result.pendingFindingKeys).toEqual(
        has.findingsOf('RELATION_EXECUTION_DEFERRED').map(({ key }) => key),
      );
      expect(has.outcomeOf('a', '49')).toMatchObject({
        outcome: 'PLANNED',
        relationType: 'HAS_TRANSLATION',
        endpoint: { kind: 'PLANNED_WORK', groupKey: has.groupKeyOf('b') },
      });
    });

    it('resolves an exact existing endpoint by its Work DOI, in the active publisher', async () => {
      const { result, lookup } = await relate([a(relatedWork('29', wid('06', '10.1234/original')))], {
        matches: { 'doi:https://doi.org/10.1234/original': [existing('w-original')] },
      });

      expect(lookup.findWorksGlobally).toHaveBeenCalledWith([
        { basis: 'doi', value: 'https://doi.org/10.1234/original' },
      ]);
      expect(result.edges).toEqual([
        expect.objectContaining({
          relator: expect.objectContaining({ kind: 'PLANNED_WORK' }),
          related: { kind: 'EXISTING_WORK', workId: 'w-original', groupKey: null, imprintId: IMPRINT_ID },
          relationType: 'IS_TRANSLATION_OF',
          state: 'PLANNED',
        }),
      ]);
    });

    it('resolves an existing endpoint through a Publication ISBN only where it names one Work', async () => {
      const { result } = await relate([a(relatedWork('29', wid('15', ISBN_X)))], {
        matches: { [`isbn:${ISBN_X}`]: [existing('w-by-isbn')] },
      });

      expect(result.edges[0]?.related).toEqual(expect.objectContaining({ kind: 'EXISTING_WORK', workId: 'w-by-isbn' }));
    });

    it('never fabricates an endpoint: zero matches is an unresolved relation the publisher may only acknowledge leaving out', async () => {
      const unresolved = await relate([a(relatedWork('29', wid('06', '10.1234/nowhere')))]);
      const [finding] = unresolved.findingsOf('RELATION_TARGET_UNRESOLVED');

      expect(unresolved.result.edges).toEqual([]);
      expect(finding).toMatchObject({
        classification: 'TARGET_INPUT_REQUIRED',
        blocking: true,
        resolution: { kind: 'ACKNOWLEDGE' },
        detail: { reason: 'NO_MATCH' },
      });
      expect(unresolved.outcomeOf('a', '29')?.outcome).toBe('UNRESOLVED');
      expect(unresolved.result.pendingFindingKeys).toEqual([finding.key]);

      const acknowledged = unresolved.resolveWith({ [finding.key]: ONIX_RELATED_MATERIAL_ACKNOWLEDGED });

      expect(acknowledged.outcomes.find(({ code }) => code === '29')?.outcome).toBe('OMITTED');
      expect(acknowledged.pendingFindingKeys).toEqual([]);
      expect(acknowledged.edges).toEqual([]);
      // Anything but the acknowledgement is no answer at all.
      expect(unresolved.resolveWith({ [finding.key]: 'YES' }).pendingFindingKeys).toEqual([finding.key]);
    });

    it('never resolves an endpoint by a title, a name or an identifier the file does not declare as strong', async () => {
      const { findingsOf, lookup } = await relate([
        a(relatedWork('29', wid('01', 'The Original Title', 'Title'))),
        product({ ref: 'b', isbn: ISBN_B, works: [manifests('10.1234/b')] }),
      ]);

      expect(findingsOf('RELATION_TARGET_UNRESOLVED')[0]?.detail).toEqual({
        construct: 'RELATED_WORK',
        code: '29',
        reason: 'NO_MATCH',
      });
      expect(lookup.findWorksGlobally).not.toHaveBeenCalled();
    });

    it('reads a value only by its declared type: a DOI-shaped proprietary identifier is not a DOI', async () => {
      const { findingsOf, lookup } = await relate([a(relatedWork('29', wid('01', '10.1234/original', 'Internal')))]);

      expect(findingsOf('RELATION_TARGET_UNRESOLVED')).toHaveLength(1);
      expect(lookup.findWorksGlobally).not.toHaveBeenCalled();
    });

    it('blocks an endpoint several exact identifiers name differently, choosing none', async () => {
      const inFile = await relate([
        a(relatedWork('29', wid('06', '10.1234/b'), wid('15', ISBN_C))),
        b(),
        product({ ref: 'c', isbn: ISBN_C, works: [manifests('10.1234/c')] }),
      ]);
      const inThoth = await relate([a(relatedWork('29', wid('06', '10.1234/x'), wid('15', ISBN_X)))], {
        matches: {
          'doi:https://doi.org/10.1234/x': [existing('w-1')],
          [`isbn:${ISBN_X}`]: [existing('w-2')],
        },
      });

      [inFile, inThoth].forEach(({ result, findingsOf, outcomeOf }) => {
        expect(result.edges).toEqual([]);
        expect(findingsOf('RELATION_TARGET_AMBIGUOUS')).toEqual([
          expect.objectContaining({ classification: 'SOURCE_CONFLICT', blocking: true, resolution: { kind: 'NONE' } }),
        ]);
        expect(outcomeOf('a', '29')?.outcome).toBe('AMBIGUOUS');
      });
      expect(inThoth.findingsOf('RELATION_TARGET_AMBIGUOUS')[0].detail.candidates).toEqual(['work:w-1', 'work:w-2']);
    });

    it('exposes an exact endpoint outside the active publisher as an authorization boundary, never as "not found"', async () => {
      const { result, findingsOf, outcomeOf, resolveWith } = await relate(
        [a(relatedWork('29', wid('06', '10.1234/elsewhere')))],
        { matches: { 'doi:https://doi.org/10.1234/elsewhere': [existing('w-elsewhere', OTHER_IMPRINT_ID)] } },
      );
      const [unauthorized] = findingsOf('RELATION_TARGET_UNAUTHORIZED');

      expect(findingsOf('RELATION_TARGET_UNRESOLVED')).toEqual([]);
      expect(unauthorized).toMatchObject({
        classification: 'TARGET_INPUT_REQUIRED',
        blocking: true,
        resolution: { kind: 'ACKNOWLEDGE' },
        detail: { relationType: 'IS_TRANSLATION_OF', workIds: ['w-elsewhere'], imprintIds: [OTHER_IMPRINT_ID] },
      });
      expect(result.edges).toEqual([expect.objectContaining({ state: 'BLOCKED' })]);
      expect(outcomeOf('a', '29')?.outcome).toBe('UNAUTHORIZED');
      expect(findingsOf('RELATION_EXECUTION_DEFERRED')).toEqual([]);

      const acknowledged = resolveWith({ [unauthorized.key]: ONIX_RELATED_MATERIAL_ACKNOWLEDGED });

      expect(acknowledged.edges).toEqual([expect.objectContaining({ state: 'OMITTED' })]);
      expect(acknowledged.pendingFindingKeys).toEqual([]);
    });

    it('never assumes anything about an endpoint Thoth was not asked about', async () => {
      const { result, findingsOf, outcomeOf } = await relate([a(relatedWork('29', wid('06', '10.1234/original')))], {
        lookedUp: false,
      });

      expect(result.edges).toEqual([]);
      expect(findingsOf('RELATION_TARGETS_NOT_READ')).toEqual([
        expect.objectContaining({
          classification: 'PREFLIGHT_GAP',
          blocking: true,
          detail: expect.objectContaining({ reason: 'ENDPOINT_NOT_LOOKED_UP' }),
        }),
      ]);
      expect(findingsOf('RELATION_TARGET_UNRESOLVED')).toEqual([]);
      expect(outcomeOf('a', '29')?.outcome).toBe('GAP');
    });
  });

  describe('graph reconciliation (rules 27-33)', () => {
    const a = (...works: string[]) => product({ ref: 'a', isbn: ISBN_A, works: [manifests('10.1234/a'), ...works] });
    const b = (...works: string[]) => product({ ref: 'b', isbn: ISBN_B, works: [manifests('10.1234/b'), ...works] });

    it('reconciles a relation and its inverse declaration into one semantic edge, created once', async () => {
      const { result, findingsOf, outcomeOf, groupKeyOf } = await relate([
        a(relatedWork('49', wid('06', '10.1234/b'))),
        b(relatedWork('29', wid('06', '10.1234/a'))),
      ]);

      expect(result.edges).toHaveLength(1);
      expect(identities(result.edges[0])).toEqual([`group:${groupKeyOf('a')}`, `group:${groupKeyOf('b')}`]);
      expect(result.edges[0]).toMatchObject({ relationType: 'HAS_TRANSLATION', state: 'PLANNED' });
      expect(result.edges[0].declarationKeys).toHaveLength(2);
      expect(findingsOf('RELATION_DECLARATIONS_RECONCILED')).toEqual([
        expect.objectContaining({ blocking: false, classification: 'SUPPORTED_NORMALIZED' }),
      ]);
      // Each declaration reads the relation from its own Work's side.
      expect(outcomeOf('a', '49')).toMatchObject({ outcome: 'PLANNED', relationType: 'HAS_TRANSLATION' });
      expect(outcomeOf('b', '29')).toMatchObject({ outcome: 'PLANNED', relationType: 'IS_TRANSLATION_OF' });
      expect(outcomeOf('a', '49')?.edgeKey).toBe(outcomeOf('b', '29')?.edgeKey);
      expect(findingsOf('RELATION_EXECUTION_DEFERRED')).toHaveLength(1);
    });

    it('takes the relator from the first declaration in the file, whichever side it is', async () => {
      const { result, groupKeyOf } = await relate([
        b(relatedWork('29', wid('06', '10.1234/a'))),
        a(relatedWork('49', wid('06', '10.1234/b'))),
      ]);

      expect(result.edges[0]).toMatchObject({
        relator: { groupKey: groupKeyOf('b') },
        related: { groupKey: groupKeyOf('a') },
        relationType: 'IS_TRANSLATION_OF',
      });
    });

    it('deduplicates the same relation stated by several Products of one Work, as Thoth’s exporter repeats it', async () => {
      const { result } = await relate([
        a(relatedWork('49', wid('06', '10.1234/b'))),
        product({
          ref: 'a-pdf',
          isbn: ISBN_A2,
          form: 'EB',
          works: [manifests('10.1234/a'), relatedWork('49', wid('06', '10.1234/b'))],
        }),
        b(),
      ]);

      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].declarationKeys).toHaveLength(2);
    });

    it('blocks contradictory inverse declarations, planning neither', async () => {
      const { result, findingsOf, outcomeOf } = await relate([
        a(relatedWork('49', wid('06', '10.1234/b'))),
        b(relatedWork('49', wid('06', '10.1234/a'))),
      ]);

      expect(result.edges).toEqual([]);
      expect(findingsOf('RELATION_INVERSE_CONTRADICTION')).toEqual([
        expect.objectContaining({
          classification: 'SOURCE_CONFLICT',
          blocking: true,
          resolution: { kind: 'NONE' },
          productKey: null,
          detail: expect.objectContaining({ relationTypes: ['HAS_TRANSLATION', 'IS_TRANSLATION_OF'] }),
        }),
      ]);
      expect([outcomeOf('a', '49')?.outcome, outcomeOf('b', '49')?.outcome]).toEqual(['CONFLICT', 'CONFLICT']);
    });

    it('blocks two different relations between one pair of Works: Thoth holds one', async () => {
      const { result, findingsOf } = await relate(
        [
          product({
            ref: 'a',
            isbn: ISBN_A,
            works: [manifests('10.1234/a'), relatedWork('49', wid('06', '10.1234/b'))],
            products: [relatedProduct('01', pid('15', ISBN_B))],
          }),
          b(),
        ],
        { choices: {} },
      );
      const [choice] = findingsOf('RELATION_PROJECTION_CHOICE_REQUIRED');
      const projected = (
        await relate(
          [
            product({
              ref: 'a',
              isbn: ISBN_A,
              works: [manifests('10.1234/a'), relatedWork('49', wid('06', '10.1234/b'))],
              products: [relatedProduct('01', pid('15', ISBN_B))],
            }),
            b(),
          ],
          { choices: { [choice.key]: ONIX_RELATION_PROJECT } },
        )
      ).result;

      expect(result.edges).toHaveLength(1);
      expect(projected.edges).toEqual([]);
      expect(projected.findings.filter(({ code }) => code === 'RELATION_PAIR_TYPE_CONFLICT')).toEqual([
        expect.objectContaining({
          classification: 'TARGET_UNREPRESENTABLE',
          blocking: true,
          detail: expect.objectContaining({ relationTypes: ['HAS_PART', 'HAS_TRANSLATION'] }),
        }),
      ]);
    });

    it('blocks a Work-level relation whose two ends grouping made one Work', async () => {
      const { result, findingsOf, outcomeOf } = await relate([a(relatedWork('49', wid('06', '10.1234/a')))]);

      expect(result.edges).toEqual([]);
      expect(findingsOf('RELATION_SELF_AFTER_GROUPING')).toEqual([
        expect.objectContaining({ classification: 'SOURCE_CONFLICT', blocking: true, resolution: { kind: 'NONE' } }),
      ]);
      expect(outcomeOf('a', '49')?.outcome).toBe('SELF');
    });

    it('blocks a relation to the existing Work its own group resolved to as a self-relation too', async () => {
      const { findingsOf } = await relate([a(relatedWork('29', wid('06', '10.1234/self')))], {
        groups: {
          a: { target: 'EXISTING_WORK', existingWorkId: 'w-a', existingImprintId: IMPRINT_ID, plannedWorkId: null },
        },
        matches: { 'doi:https://doi.org/10.1234/self': [existing('w-a')] },
      });

      expect(findingsOf('RELATION_SELF_AFTER_GROUPING')).toHaveLength(1);
    });

    it('treats an exact edge Thoth already holds as satisfied, creating nothing', async () => {
      const existingPair = {
        groups: {
          a: {
            target: 'EXISTING_WORK' as const,
            existingWorkId: 'w-a',
            existingImprintId: IMPRINT_ID,
            plannedWorkId: null,
          },
        },
        matches: { 'doi:https://doi.org/10.1234/b': [existing('w-b')] },
      };
      const satisfied = await relate([a(relatedWork('49', wid('06', '10.1234/b')))], {
        ...existingPair,
        relations: { 'w-a': [{ relatedWorkId: 'w-b', relationType: 'HAS_TRANSLATION', relationOrdinal: 3 }] },
      });

      expect(satisfied.result.edges).toEqual([
        expect.objectContaining({ state: 'SATISFIED', ordinal: { status: 'EXISTING', ordinal: 3 } }),
      ]);
      expect(satisfied.findingsOf('RELATION_EXISTING_SATISFIED')).toEqual([
        expect.objectContaining({ blocking: false }),
      ]);
      expect(satisfied.findingsOf('RELATION_EXECUTION_DEFERRED')).toEqual([]);
      expect(satisfied.result.pendingFindingKeys).toEqual([]);
      expect(satisfied.outcomeOf('a', '49')?.outcome).toBe('SATISFIED');
      expect(satisfied.lookup.getWorkRelations).toHaveBeenCalledWith('w-a');

      // Held the other way round by the related Work only: still the same edge, read through its inverse.
      const inverse = await relate([a(relatedWork('49', wid('06', '10.1234/b')))], {
        ...existingPair,
        groups: {
          a: { target: 'EXISTING_WORK', existingWorkId: 'w-a', existingImprintId: IMPRINT_ID, plannedWorkId: null },
        },
        relations: { 'w-a': [] },
      });

      expect(inverse.result.edges).toEqual([expect.objectContaining({ state: 'PLANNED' })]);
    });

    it('blocks an edge whose Work pair Thoth already relates differently, even as a chapter', async () => {
      const conflicting = await relate([a(relatedWork('49', wid('06', '10.1234/b')))], {
        groups: {
          a: { target: 'EXISTING_WORK', existingWorkId: 'w-a', existingImprintId: IMPRINT_ID, plannedWorkId: null },
        },
        matches: { 'doi:https://doi.org/10.1234/b': [existing('w-b')] },
        relations: { 'w-a': [{ relatedWorkId: 'w-b', relationType: 'IS_CHILD_OF', relationOrdinal: 1 }] },
      });

      expect(conflicting.result.edges).toEqual([expect.objectContaining({ state: 'BLOCKED' })]);
      expect(conflicting.findingsOf('RELATION_EXISTING_CONFLICT')).toEqual([
        expect.objectContaining({
          classification: 'SOURCE_CONFLICT',
          blocking: true,
          detail: expect.objectContaining({ relationType: 'HAS_TRANSLATION', existing: 'IS_CHILD_OF' }),
        }),
      ]);
      expect(conflicting.outcomeOf('a', '49')?.outcome).toBe('CONFLICT');
    });

    it('satisfies an edge between two existing Works whatever the publisher, since nothing is created', async () => {
      const { result, findingsOf } = await relate([a(relatedWork('49', wid('06', '10.1234/elsewhere')))], {
        groups: {
          a: { target: 'EXISTING_WORK', existingWorkId: 'w-a', existingImprintId: IMPRINT_ID, plannedWorkId: null },
        },
        matches: { 'doi:https://doi.org/10.1234/elsewhere': [existing('w-e', OTHER_IMPRINT_ID)] },
        relations: { 'w-a': [{ relatedWorkId: 'w-e', relationType: 'HAS_TRANSLATION', relationOrdinal: 1 }] },
      });

      expect(result.edges).toEqual([expect.objectContaining({ state: 'SATISFIED' })]);
      expect(findingsOf('RELATION_TARGET_UNAUTHORIZED')).toEqual([]);
    });

    it('numbers ordinary relations by their first appearance in the file, within each relator and type', async () => {
      const works = (...dois: string[]) => dois.map((doi) => relatedWork('49', wid('06', doi)));
      const { result } = await relate(
        [
          a(...works('10.1234/c', '10.1234/b'), relatedWork('29', wid('06', '10.1234/d'))),
          b(),
          product({ ref: 'c', isbn: ISBN_C, works: [manifests('10.1234/c')] }),
          product({ ref: 'd', isbn: ISBN_D, works: [manifests('10.1234/d')] }),
          product({
            ref: 'e',
            isbn: ISBN_E,
            works: [manifests('10.1234/e'), relatedWork('49', wid('06', '10.1234/x'))],
          }),
        ],
        {
          groups: {
            e: { target: 'EXISTING_WORK', existingWorkId: 'w-e', existingImprintId: IMPRINT_ID, plannedWorkId: null },
          },
          matches: { 'doi:https://doi.org/10.1234/x': [existing('w-x')] },
          relations: {
            'w-e': [
              { relatedWorkId: 'w-y', relationType: 'HAS_TRANSLATION', relationOrdinal: 3 },
              { relatedWorkId: 'w-z', relationType: 'HAS_PART', relationOrdinal: 7 },
            ],
          },
        },
      );

      expect(
        result.edges.map(({ relationType, ordinal, related }) => [
          relationType,
          ordinal.status === 'ASSIGNED' ? ordinal.ordinal : null,
          related.kind === 'EXISTING_WORK' ? related.workId : related.plannedWorkId,
        ]),
      ).toEqual([
        // c before b, as the file states them; the translation-of relation counts on its own.
        ['HAS_TRANSLATION', 1, 'work-3'],
        ['HAS_TRANSLATION', 2, 'work-2'],
        ['IS_TRANSLATION_OF', 1, 'work-4'],
        // An existing relator already holds three translations: a new one follows them.
        ['HAS_TRANSLATION', 4, 'w-x'],
      ]);
    });

    it('is deterministic: resolving the same file again gives the same edges, keys and findings', async () => {
      const products = [a(relatedWork('49', wid('06', '10.1234/b'))), b(relatedWork('29', wid('06', '10.1234/a')))];
      const first = await relate(products);
      const second = await relate(products);

      expect(second.result).toEqual(first.result);
    });
  });

  describe('Product-level relations (rules 16-19)', () => {
    const a = (...products: string[]) => product({ ref: 'a', isbn: ISBN_A, works: [manifests('10.1234/a')], products });
    const b = product({ ref: 'b', isbn: ISBN_B, works: [manifests('10.1234/b')] });

    it.each([
      ['01', 'HAS_PART'],
      ['02', 'IS_PART_OF'],
      ['03', 'REPLACES'],
      ['05', 'IS_REPLACED_BY'],
    ])(
      'never projects generic RelatedProduct %s by itself: the publisher decides whether it is %s',
      async (code, type) => {
        const pending = await relate([a(relatedProduct(code, pid('15', ISBN_B))), b]);
        const [choice] = pending.findingsOf('RELATION_PROJECTION_CHOICE_REQUIRED');

        expect(pending.result.edges).toEqual([]);
        expect(choice).toMatchObject({
          classification: 'TARGET_INPUT_REQUIRED',
          blocking: true,
          resolution: {
            kind: 'CHOICE',
            options: [
              { key: ONIX_RELATION_PROJECT, label: type },
              { key: ONIX_RELATION_OMIT, label: ONIX_RELATION_OMIT },
            ],
          },
          detail: expect.objectContaining({ relationType: type }),
        });
        expect(pending.outcomeOf('a', code, 'RELATED_PRODUCT')?.outcome).toBe('AWAITING_CHOICE');

        const projected = pending.resolveWith({ [choice.key]: ONIX_RELATION_PROJECT });

        expect(projected.edges).toEqual([
          expect.objectContaining({ relationType: type, basis: 'PUBLISHER_PROJECTION', state: 'PLANNED' }),
        ]);

        const omitted = pending.resolveWith({ [choice.key]: ONIX_RELATION_OMIT });

        expect(omitted.edges).toEqual([]);
        expect(
          omitted.outcomes.find((outcome) => outcome.code === code && outcome.construct === 'RELATED_PRODUCT')?.outcome,
        ).toBe('OMITTED');
        expect(omitted.pendingFindingKeys).toEqual([]);
        expect(isOfferedOnixRelatedMaterialAnswer(choice, 'HAS_PART')).toBe(false);
      },
    );

    it('does not read a generic Product DOI as the related Work’s DOI, and never looks one up in Thoth', async () => {
      const { findingsOf, lookup } = await relate([a(relatedProduct('02', pid('06', '10.1234/some-product')))]);

      expect(findingsOf('RELATION_TARGET_UNRESOLVED')).toHaveLength(1);
      expect(lookup.findWorksGlobally).not.toHaveBeenCalled();
    });

    it('never relates two Products of one Work: a same-Work Product relation is a loss to acknowledge', async () => {
      const { result, findingsOf, outcomeOf } = await relate([
        a(relatedProduct('05', pid('15', ISBN_A2))),
        product({ ref: 'a-new', isbn: ISBN_A2, form: 'EB', works: [manifests('10.1234/a')] }),
      ]);

      expect(result.edges).toEqual([]);
      expect(findingsOf('RELATION_SAME_WORK_UNREPRESENTABLE')).toEqual([
        expect.objectContaining({
          classification: 'TARGET_UNREPRESENTABLE',
          blocking: true,
          resolution: { kind: 'ACKNOWLEDGE' },
        }),
      ]);
      expect(outcomeOf('a', '05')?.outcome).toBe('SELF');
    });

    describe('other-language versions (RelatedProduct 11)', () => {
      it('adds nothing where the file states the translation, with its direction, between the same Works', async () => {
        const { result, outcomeOf, findingsOf } = await relate([
          product({
            ref: 'a',
            isbn: ISBN_A,
            works: [manifests('10.1234/a'), relatedWork('49', wid('06', '10.1234/b'))],
            products: [relatedProduct('11', pid('15', ISBN_B))],
          }),
          b,
        ]);

        expect(result.edges).toHaveLength(1);
        expect(outcomeOf('a', '11')?.outcome).toBe('REDUNDANT');
        expect(findingsOf('RELATION_OTHER_LANGUAGE_REDUNDANT')).toEqual([expect.objectContaining({ blocking: false })]);
      });

      it('lets the publisher direct it only where both Works’ languages back a direction', async () => {
        const backed = await relate([a(relatedProduct('11', pid('15', ISBN_B))), b], {
          groups: { a: { languageCodes: ['ENG'] }, b: { languageCodes: ['FRE'] } },
        });
        const [direction] = backed.findingsOf('RELATION_DIRECTION_REQUIRED');

        expect(direction).toMatchObject({
          resolution: {
            kind: 'CHOICE',
            options: [
              { key: 'HAS_TRANSLATION', label: 'HAS_TRANSLATION' },
              { key: 'IS_TRANSLATION_OF', label: 'IS_TRANSLATION_OF' },
              { key: ONIX_RELATION_OMIT, label: ONIX_RELATION_OMIT },
            ],
          },
          detail: expect.objectContaining({ languages: ['ENG'], relatedLanguages: ['FRE'] }),
        });
        expect(backed.result.edges).toEqual([]);
        expect(backed.resolveWith({ [direction.key]: 'IS_TRANSLATION_OF' }).edges).toEqual([
          expect.objectContaining({ relationType: 'IS_TRANSLATION_OF', basis: 'PUBLISHER_DIRECTION' }),
        ]);

        // With the same language on both sides, or none known, nothing backs a direction: only its omission is offered.
        for (const groups of [
          { a: { languageCodes: ['ENG'] }, b: { languageCodes: ['ENG'] } },
          { a: { languageCodes: [] }, b: { languageCodes: ['FRE'] } },
        ]) {
          const unbacked = await relate([a(relatedProduct('11', pid('15', ISBN_B))), b], { groups });

          expect(unbacked.findingsOf('RELATION_DIRECTION_REQUIRED')[0].resolution).toEqual({ kind: 'ACKNOWLEDGE' });
        }
      });
    });
  });

  describe('Thoth-origin round trip (5541586341 rules 18, 53, 60)', () => {
    const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
    /** One Publication exactly as Thoth's ONIX 3.x exporter writes it (thoth master 4fa7eaa9). */
    const exported = (
      publication: number,
      work: number,
      isbn: string,
      form: string,
      related: { readonly works?: readonly string[]; readonly products?: readonly string[] } = {},
    ) =>
      product({
        ref: `urn:uuid:${uuid(publication)}`,
        envelope: '<RecordSourceType>01</RecordSourceType>',
        identifiers: [
          pid('01', `urn:uuid:${uuid(publication)}`, 'thoth-publication-id'),
          pid('01', `urn:uuid:${uuid(work)}`, 'thoth-work-id'),
          pid('03', isbn),
          pid('06', `10.1234/work-${work}`),
        ],
        isbn,
        form,
        works: related.works,
        products: related.products,
      });
    const citation = (value: string) => pid('01', value, 'Unstructured citation');

    it.each(['3.0', '3.1'] as const)(
      'reconstructs every exported relation of an ONIX %s export, once, and invents none from alternative formats',
      async (release) => {
        const workOne = {
          works: [relatedWork('49', wid('06', '10.1234/work-2'))],
          products: [
            relatedProduct('01', pid('06', '10.1234/work-3')),
            relatedProduct('03', pid('06', '10.1234/work-4')),
            relatedProduct('34', pid('06', '10.1234/cited')),
            relatedProduct('34', citation('Hopkins, Lisa. 2019.')),
          ],
        };
        const { result, groups, groupKeyOf, outcomeOf, plan, productKeyOf } = await relate(
          [
            exported(11, 1, ISBN_A, 'BC', {
              ...workOne,
              products: [relatedProduct('06', pid('15', ISBN_A2), pid('03', ISBN_A2)), ...workOne.products],
            }),
            exported(12, 1, ISBN_A2, 'EB', {
              ...workOne,
              products: [relatedProduct('06', pid('15', ISBN_A), pid('03', ISBN_A)), ...workOne.products],
            }),
            exported(21, 2, ISBN_B, 'BC', { works: [relatedWork('29', wid('06', '10.1234/work-1'))] }),
            exported(31, 3, ISBN_C, 'BC', { products: [relatedProduct('02', pid('06', '10.1234/work-1'))] }),
            exported(41, 4, ISBN_D, 'BC', { products: [relatedProduct('05', pid('06', '10.1234/work-1'))] }),
          ],
          {
            header: THOTH_HEADER,
            release,
            // Verified or confirmed: the profile decodes Thoth's own shape (5545771626 rules 88-89, 94).
            groups: Object.fromEntries(
              [11, 21, 31, 41].map((publication) => [`urn:uuid:${uuid(publication)}`, { thothProfileActive: true }]),
            ),
          },
        );
        const group = (publication: number) => groupKeyOf(`urn:uuid:${uuid(publication)}`);

        // The two Publications of Work 1 are one Work: its relations are stated twice, and reconciled once each.
        expect(group(11)).toBe(group(12));
        expect(groups.size).toBe(4);
        expect(
          result.edges.map((edge) => [
            ...identities(edge),
            edge.relationType,
            edge.basis,
            edge.declarationKeys.length,
            edge.state,
            edge.ordinal.status === 'ASSIGNED' ? edge.ordinal.ordinal : null,
          ]),
        ).toEqual([
          [`group:${group(11)}`, `group:${group(21)}`, 'HAS_TRANSLATION', 'RELATED_WORK_TRANSLATION', 3, 'PLANNED', 1],
          [`group:${group(11)}`, `group:${group(31)}`, 'HAS_PART', 'THOTH_PROFILE_PRODUCT_RELATION', 3, 'PLANNED', 1],
          [`group:${group(11)}`, `group:${group(41)}`, 'REPLACES', 'THOTH_PROFILE_PRODUCT_RELATION', 3, 'PLANNED', 1],
        ]);
        // Translation both ways, has-part / is-part-of, replaces / is-replaced-by: each declaration reads its own side.
        expect(
          [
            [21, '29'],
            [31, '02'],
            [41, '05'],
          ].map(
            ([publication, code]) => outcomeOf(`urn:uuid:${uuid(publication as number)}`, code as string)?.relationType,
          ),
        ).toEqual(['IS_TRANSLATION_OF', 'IS_PART_OF', 'IS_REPLACED_BY']);
        // The alternative formats are grouping evidence only, and the citations References only.
        expect(result.outcomes.filter(({ code }) => code === '06').map(({ outcome }) => outcome)).toEqual([
          'GROUPING_EVIDENCE',
          'GROUPING_EVIDENCE',
        ]);
        expect(result.outcomes.filter(({ code }) => code === '34').map(({ outcome }) => outcome)).toEqual([
          'CITATION',
          'CITATION',
          'CITATION',
          'CITATION',
        ]);
        expect(
          resolveOnixProductReferences(plan, productKeyOf(`urn:uuid:${uuid(11)}`), group(11), {
            thothProfileActive: true,
            describe: 'product 1',
          }).references.references.map(({ referenceOrdinal, doi, unstructuredCitation }) => [
            referenceOrdinal,
            doi,
            unstructuredCitation,
          ]),
        ).toEqual([
          [1, 'https://doi.org/10.1234/cited', null],
          [2, null, 'Hopkins, Lisa. 2019.'],
        ]);
      },
    );

    it('reads the same export generically when the profile is not verified or confirmed: no Product relation becomes a Work relation by itself', async () => {
      const { result, findingsOf } = await relate(
        [
          exported(11, 1, ISBN_A, 'BC', { products: [relatedProduct('01', pid('06', '10.1234/work-3'))] }),
          exported(31, 3, ISBN_C, 'BC'),
        ],
        { header: THOTH_HEADER },
      );

      expect(result.edges).toEqual([]);
      // Generically a ProductIDType 06 is the related Product's DOI - here Thoth's repeated Work DOI - and matches it.
      expect(findingsOf('RELATION_PROJECTION_CHOICE_REQUIRED')).toHaveLength(1);
    });
  });

  it('asks for the omission of a relation stated inside a content item of a Work the import creates', async () => {
    const chapter =
      '<ContentItem><LevelSequenceNumber>1</LevelSequenceNumber><TextItem><TextItemType>03</TextItemType></TextItem>' +
      '<TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>04</TitleElementLevel><TitleText>Chapter</TitleText></TitleElement></TitleDetail>' +
      `${relatedWork('29', wid('06', '10.1234/chapter-original'))}</ContentItem>`;
    const created = await relate([product({ ref: 'a', isbn: ISBN_A, content: chapter })]);
    const [unsupported] = created.findingsOf('RELATION_COMPONENT_SCOPE_UNSUPPORTED');

    expect(unsupported).toMatchObject({
      classification: 'TARGET_UNREPRESENTABLE',
      blocking: true,
      resolution: { kind: 'ACKNOWLEDGE' },
      detail: expect.objectContaining({ codes: ['29'] }),
    });
    expect(created.result.outcomes).toEqual([expect.objectContaining({ outcome: 'NOT_REDUCED', code: '29' })]);
    expect(
      created
        .resolveWith({ [unsupported.key]: ONIX_RELATED_MATERIAL_ACKNOWLEDGED })
        .outcomes.map(({ outcome }) => outcome),
    ).toEqual(['OMITTED']);

    // A Work this import does not create plans no component: the fact stays disclosed, and holds nothing.
    const attached = await relate([product({ ref: 'a', isbn: ISBN_A, content: chapter })], {
      groups: { a: { target: 'EXISTING_WORK', existingWorkId: 'w-a', existingImprintId: IMPRINT_ID } },
    });

    expect(attached.findingsOf('RELATION_COMPONENT_SCOPE_UNSUPPORTED')).toEqual([]);
    expect(attached.result.outcomes).toEqual([expect.objectContaining({ outcome: 'NOT_REDUCED' })]);
  });

  it('looks up only the exact endpoint identifiers of relation-bearing declarations, once each', async () => {
    const root = message([
      product({
        ref: 'a',
        isbn: ISBN_A,
        works: [manifests('10.1234/a'), relatedWork('29', wid('06', '10.1234/x'), wid('02', '1800000073'))],
        products: [
          relatedProduct('34', pid('06', '10.1234/cited')),
          relatedProduct('13', pid('15', ISBN_D)),
          relatedProduct('02', pid('15', ISBN_E), pid('06', '10.1234/product-doi')),
        ],
      }),
    ]);
    const sourcePlan = planOnixSource(root);

    // The ISBN-10 is looked up as the ISBN-13 it is; the cited DOI, the unrepresentable relation and the Product DOI
    // - which Thoth never stores - are never looked up.
    expect(onixRelatedMaterialLookupIdentifiers(reduceOnixRelatedMaterial(root, sourcePlan), sourcePlan)).toEqual([
      { basis: 'doi', value: 'https://doi.org/10.1234/x' },
      { basis: 'isbn', value: ISBN_E },
      { basis: 'isbn', value: ISBN_X },
    ]);
  });

  it('never looks up an endpoint a Work of the file already answers: same-import identity comes first', async () => {
    const root = message([
      product({ ref: 'a', isbn: ISBN_A, works: [manifests('10.1234/a'), relatedWork('29', wid('15', ISBN_B))] }),
      product({ ref: 'b', isbn: ISBN_B, products: [relatedProduct('01', pid('02', '1800000014'))] }),
    ]);
    const sourcePlan = planOnixSource(root);

    expect(onixRelatedMaterialLookupIdentifiers(reduceOnixRelatedMaterial(root, sourcePlan), sourcePlan)).toEqual([]);
  });
});

describe('References (5541586341 rules 42-52)', () => {
  const cites = (...identifiers: string[]) => relatedProduct('34', ...identifiers);
  const citation = (value: string, name = 'Unstructured citation') => pid('01', value, name);
  const referencesOf = async (
    citations: readonly string[],
    { thothProfileActive = false, choices }: { thothProfileActive?: boolean; choices?: Record<string, string> } = {},
  ) => {
    const { plan, productKeyOf, groupKeyOf } = await relate([product({ ref: 'a', isbn: ISBN_A, products: citations })]);
    const resolve = (answers?: Record<string, string>) =>
      resolveOnixProductReferences(plan, productKeyOf('a'), groupKeyOf('a'), {
        thothProfileActive,
        choices: answers,
        describe: 'product 1',
      });
    const resolved = resolve(choices);

    return {
      ...resolved,
      resolve,
      facts: resolved.references.references.map(({ referenceOrdinal, doi, unstructuredCitation, isbn, issn }) => ({
        referenceOrdinal,
        doi,
        unstructuredCitation,
        isbn,
        issn,
      })),
      codes: resolved.findings.map(({ code, blocking }) => [code, blocking]),
    };
  };

  it('imports a valid declared DOI exactly as a DOI, in Thoth’s canonical form', async () => {
    const { facts, codes, references } = await referencesOf([cites(pid('06', 'http://dx.doi.org/10.1234/abcd'))]);

    expect(facts).toEqual([
      { referenceOrdinal: 1, doi: 'https://doi.org/10.1234/abcd', unstructuredCitation: null, isbn: null, issn: null },
    ]);
    expect(codes).toEqual([]);
    expect(references).toMatchObject({ asserted: true, pendingFindingKeys: [] });
  });

  it('keeps a DOI and Thoth’s own unstructured citation together under the verified profile, and the DOI alone elsewhere', async () => {
    const both = [cites(citation('Hopkins, Lisa. 2019.'), pid('06', '10.1234/abcd'))];
    const verified = await referencesOf(both, { thothProfileActive: true });
    const generic = await referencesOf(both);

    expect(verified.facts).toEqual([
      {
        referenceOrdinal: 1,
        doi: 'https://doi.org/10.1234/abcd',
        unstructuredCitation: 'Hopkins, Lisa. 2019.',
        isbn: null,
        issn: null,
      },
    ]);
    expect(verified.codes).toEqual([]);
    expect(generic.facts).toEqual([
      { referenceOrdinal: 1, doi: 'https://doi.org/10.1234/abcd', unstructuredCitation: null, isbn: null, issn: null },
    ]);
    expect(generic.findings).toEqual([
      expect.objectContaining({
        code: 'REFERENCE_IDENTIFIER_UNREPRESENTABLE',
        blocking: false,
        detail: expect.objectContaining({ reason: 'THOTH_CONVENTION_INACTIVE' }),
      }),
    ]);
  });

  it('tolerates case and surrounding whitespace in Thoth’s citation scheme name, and nothing else', async () => {
    const { facts, codes } = await referencesOf(
      [
        cites(citation('Hopkins, Lisa. 2019.', '  unstructured CITATION  ')),
        cites(citation('Other.', 'Unstructured citations')),
      ],
      { thothProfileActive: true },
    );

    expect(facts).toEqual([
      { referenceOrdinal: 1, doi: null, unstructuredCitation: 'Hopkins, Lisa. 2019.', isbn: null, issn: null },
    ]);
    expect(codes).toEqual([
      ['REFERENCE_IDENTIFIER_UNREPRESENTABLE', false],
      ['REFERENCE_UNREPRESENTABLE', true],
    ]);
  });

  it('imports a declared ISBN beside the DOI Thoth needs, and never an ISBN alone, which no Reference can hold', async () => {
    const withDoi = await referencesOf([cites(pid('15', ISBN_B), pid('06', '10.1234/abcd'))]);
    const alone = await referencesOf([cites(pid('15', ISBN_B))]);
    const [loss] = alone.findings;

    expect(withDoi.facts).toEqual([
      {
        referenceOrdinal: 1,
        doi: 'https://doi.org/10.1234/abcd',
        unstructuredCitation: null,
        isbn: ISBN_B,
        issn: null,
      },
    ]);
    expect(alone.facts).toEqual([]);
    expect(loss).toMatchObject({
      code: 'REFERENCE_UNREPRESENTABLE',
      classification: 'TARGET_UNREPRESENTABLE',
      blocking: true,
      resolution: { kind: 'ACKNOWLEDGE' },
      detail: { ordinal: 1, lost: [`ISBN ${ISBN_B}`] },
    });
    expect(alone.references.pendingFindingKeys).toEqual([loss.key]);
    expect(alone.resolve({ [loss.key]: ONIX_RELATED_MATERIAL_ACKNOWLEDGED }).references.pendingFindingKeys).toEqual([]);
  });

  it('reads an ISBN-10 as its ISBN-13 and a GTIN-13 as nothing: only a declared ISBN is one', async () => {
    const { facts, findings } = await referencesOf([
      cites(pid('02', '1800000014'), pid('06', '10.1234/abcd')),
      cites(pid('03', ISBN_C), pid('06', '10.1234/efgh')),
    ]);

    expect(facts.map(({ isbn }) => isbn)).toEqual([ISBN_A, null]);
    expect(findings.map(({ code, detail }) => [code, detail.type])).toEqual([
      ['REFERENCE_IDENTIFIER_NORMALISED', '02'],
      ['REFERENCE_IDENTIFIER_UNREPRESENTABLE', '03'],
    ]);
  });

  it('imports the ISSN an ISSN-13 states, and says what its variant and add-on digits lose', async () => {
    const { facts, findings } = await referencesOf([
      cites(pid('34', '9770317847001'), pid('06', '10.1234/one')),
      cites(pid('34', '977204936303312'), pid('06', '10.1234/two')),
      cites(pid('34', '9771050124008'), pid('06', '10.1234/three')),
    ]);

    expect(facts.map(({ issn }) => issn)).toEqual(['0317-8471', '2049-3630', '1050-124X']);
    expect(findings.map(({ code, detail }) => [code, detail.dropped ?? null])).toEqual([
      ['REFERENCE_IDENTIFIER_NORMALISED', null],
      ['REFERENCE_IDENTIFIER_NORMALISED', 'variant 03, add-on 12'],
      ['REFERENCE_IDENTIFIER_NORMALISED', null],
    ]);
  });

  it('never repairs an invalid declared identifier: it is a disclosed loss, and the rest of the citation survives', async () => {
    const { facts, findings } = await referencesOf(
      [
        cites(pid('06', 'not-a-doi'), citation('Hopkins, Lisa. 2019.')),
        cites(pid('15', '9781800000019'), pid('06', '10.1234/abcd')),
        cites(pid('34', '9770317847009'), pid('06', '10.1234/efgh')),
      ],
      { thothProfileActive: true },
    );

    expect(facts).toEqual([
      { referenceOrdinal: 1, doi: null, unstructuredCitation: 'Hopkins, Lisa. 2019.', isbn: null, issn: null },
      { referenceOrdinal: 2, doi: 'https://doi.org/10.1234/abcd', unstructuredCitation: null, isbn: null, issn: null },
      { referenceOrdinal: 3, doi: 'https://doi.org/10.1234/efgh', unstructuredCitation: null, isbn: null, issn: null },
    ]);
    expect(
      findings.map(({ code, blocking, classification, detail }) => [code, blocking, classification, detail.field]),
    ).toEqual([
      ['REFERENCE_IDENTIFIER_INVALID', false, 'SUPPORTED_WITH_WARNING', 'doi'],
      ['REFERENCE_IDENTIFIER_INVALID', false, 'SUPPORTED_WITH_WARNING', 'isbn'],
      ['REFERENCE_IDENTIFIER_INVALID', false, 'SUPPORTED_WITH_WARNING', 'issn'],
    ]);
  });

  it('reads a value only as the notation its type declares: an ISBN-10 under ISBN-13, or a book GTIN under ISSN-13, is invalid', async () => {
    const { facts, findings } = await referencesOf([
      cites(pid('15', '1800000014'), pid('06', '10.1234/abcd')),
      cites(pid('34', ISBN_A), pid('06', '10.1234/efgh')),
    ]);

    expect(facts.map(({ isbn, issn }) => [isbn, issn])).toEqual([
      [null, null],
      [null, null],
    ]);
    expect(findings.map(({ code, detail }) => [code, detail.field, detail.value])).toEqual([
      ['REFERENCE_IDENTIFIER_INVALID', 'isbn', '1800000014'],
      ['REFERENCE_IDENTIFIER_INVALID', 'issn', ISBN_A],
    ]);
  });

  it('loses a citation whose only DOI is invalid, rather than creating an empty Reference', async () => {
    const { facts, codes } = await referencesOf([cites(pid('06', 'PROD-1234'))]);

    expect(facts).toEqual([]);
    expect(codes).toEqual([
      ['REFERENCE_IDENTIFIER_INVALID', false],
      ['REFERENCE_UNREPRESENTABLE', true],
    ]);
  });

  it('never reads an arbitrary proprietary identifier as citation text, whatever it is called', async () => {
    const { facts, findings } = await referencesOf(
      [
        cites(citation('PROD-1234', 'Publisher product code')),
        cites(pid('01', 'opaque')),
        cites(citation('SKU-9', 'Distributor key'), pid('06', '10.1234/abcd')),
      ],
      { thothProfileActive: true },
    );

    expect(facts).toEqual([
      { referenceOrdinal: 3, doi: 'https://doi.org/10.1234/abcd', unstructuredCitation: null, isbn: null, issn: null },
    ]);
    expect(findings.map(({ code, detail }) => [code, detail.reason ?? detail.ordinal])).toEqual([
      ['REFERENCE_IDENTIFIER_UNREPRESENTABLE', 'NO_REFERENCE_FIELD'],
      ['REFERENCE_UNREPRESENTABLE', 1],
      ['REFERENCE_IDENTIFIER_UNREPRESENTABLE', 'NO_REFERENCE_FIELD'],
      ['REFERENCE_UNREPRESENTABLE', 2],
      ['REFERENCE_IDENTIFIER_UNREPRESENTABLE', 'NO_REFERENCE_FIELD'],
    ]);
  });

  it('refuses to choose between two values of one field in one citation, in either order', async () => {
    const outcomes = await Promise.all(
      [
        [pid('06', '10.1234/abcd'), pid('06', '10.5678/efgh')],
        [pid('06', '10.5678/efgh'), pid('06', '10.1234/abcd')],
      ].map((identifiers) => referencesOf([cites(...identifiers)])),
    );

    outcomes.forEach(({ facts, findings, references }) => {
      expect(facts).toEqual([]);
      expect(findings).toEqual([
        expect.objectContaining({
          code: 'REFERENCE_IDENTIFIER_CONFLICT',
          classification: 'SOURCE_CONFLICT',
          blocking: true,
          resolution: { kind: 'NONE' },
          detail: { fields: ['doi'], values: ['https://doi.org/10.1234/abcd', 'https://doi.org/10.5678/efgh'] },
        }),
      ]);
      expect(references.pendingFindingKeys).toHaveLength(1);
    });
    // One DOI written two ways is one DOI.
    expect(
      (await referencesOf([cites(pid('06', '10.1234/ABCD'), pid('06', 'https://doi.org/10.1234/abcd'))])).codes,
    ).toEqual([]);
  });

  it('imports an exact repeat once, at its first position, and surfaces repeats of one identity that disagree', async () => {
    const repeated = await referencesOf([
      cites(pid('06', '10.1234/abcd')),
      cites(pid('06', '10.1234/zzzz')),
      cites(pid('06', 'https://doi.org/10.1234/abcd')),
    ]);

    expect(repeated.facts.map(({ referenceOrdinal, doi }) => [referenceOrdinal, doi])).toEqual([
      [1, 'https://doi.org/10.1234/abcd'],
      [2, 'https://doi.org/10.1234/zzzz'],
    ]);
    expect(repeated.findings).toEqual([
      expect.objectContaining({
        code: 'REFERENCE_DUPLICATE_NORMALISED',
        blocking: false,
        detail: { ordinal: 3, repeats: 1 },
      }),
    ]);

    const conflicting = await referencesOf([
      cites(pid('06', '10.1234/abcd'), pid('15', ISBN_B)),
      cites(pid('06', '10.1234/abcd'), pid('15', ISBN_C)),
    ]);

    expect(conflicting.facts).toEqual([]);
    expect(conflicting.findings).toEqual([
      expect.objectContaining({
        code: 'REFERENCE_DUPLICATE_CONFLICT',
        blocking: true,
        detail: { ordinals: ['1', '2'] },
      }),
    ]);
  });

  it('keeps each citation at its exact source position, however many before it are left out', async () => {
    const { facts, references, findings, resolve } = await referencesOf([
      cites(pid('06', '10.1234/one')),
      cites(pid('01', 'opaque')),
      cites(pid('06', '10.1234/three')),
      relatedProduct('35', pid('06', '10.1234/citing-us')),
      cites(pid('06', '10.1234/four')),
    ]);
    const loss = findings.find(({ code }) => code === 'REFERENCE_UNREPRESENTABLE');

    expect(facts.map(({ referenceOrdinal, doi }) => [referenceOrdinal, doi])).toEqual([
      [1, 'https://doi.org/10.1234/one'],
      [3, 'https://doi.org/10.1234/three'],
      [4, 'https://doi.org/10.1234/four'],
    ]);
    // RelatedProduct 35 is not a citation: it takes no position among them.
    expect(references.references).toHaveLength(3);
    expect(references.pendingFindingKeys).toEqual([loss?.key]);
    expect(
      resolve({ [loss?.key as string]: ONIX_RELATED_MATERIAL_ACKNOWLEDGED }).references.pendingFindingKeys,
    ).toEqual([]);
  });

  it('asserts nothing for a Product stating no citation: absence is absent evidence', async () => {
    const { references } = await referencesOf([relatedProduct('35', pid('06', '10.1234/citing-us'))]);

    expect(references).toMatchObject({ asserted: false, references: [], pendingFindingKeys: [] });
  });

  describe('a new Work’s References (resolveOnixWorkReferences)', () => {
    const planned = (productKey: string, ...dois: string[]): OnixPlannedReference[] =>
      dois.map((doi, index) => ({
        citationKey: `${productKey}|${index}`,
        productKey,
        referenceOrdinal: index + 1,
        doi,
        unstructuredCitation: null,
        isbn: null,
        issn: null,
        locations: [],
      }));
    const member = (productKey: string, references: OnixPlannedReference[] | null, pending: string[] = []) => ({
      productKey,
      groupKey: 'group',
      asserted: references !== null,
      references: references ?? [],
      pendingFindingKeys: pending,
    });

    it('takes the one sequence the Products state, a silent Product being absent evidence', () => {
      expect(
        resolveOnixWorkReferences(
          'group',
          'NEW_WORK',
          [
            member('p1', null),
            member('p2', planned('p2', 'https://doi.org/10.1/a')),
            member('p3', planned('p3', 'https://doi.org/10.1/a')),
          ],
          'product 1',
        ).action,
      ).toEqual({
        groupKey: 'group',
        action: { kind: 'CREATE', productKey: 'p2', references: planned('p2', 'https://doi.org/10.1/a') },
      });
      expect(resolveOnixWorkReferences('group', 'NEW_WORK', [member('p1', null)], 'product 1').action.action).toEqual({
        kind: 'NONE',
      });
    });

    it('blocks Products of one Work that cite differently, or whose citations are unresolved, and never writes an existing Work’s', () => {
      const conflict = resolveOnixWorkReferences(
        'group',
        'NEW_WORK',
        [
          member('p1', planned('p1', 'https://doi.org/10.1/a', 'https://doi.org/10.1/b')),
          member('p2', planned('p2', 'https://doi.org/10.1/b', 'https://doi.org/10.1/a')),
        ],
        'product 1',
      );

      expect(conflict.action.action).toEqual({ kind: 'BLOCKED' });
      expect(conflict.findings).toEqual([
        expect.objectContaining({
          code: 'REFERENCE_GROUP_CONFLICT',
          classification: 'SOURCE_CONFLICT',
          blocking: true,
          productKey: null,
        }),
      ]);
      expect(
        resolveOnixWorkReferences('group', 'NEW_WORK', [member('p1', [], ['pending'])], 'product 1').action.action,
      ).toEqual({ kind: 'BLOCKED' });
      expect(
        resolveOnixWorkReferences(
          'group',
          'EXISTING_WORK',
          [member('p1', planned('p1', 'https://doi.org/10.1/a'))],
          'product 1',
        ).action.action,
      ).toEqual({ kind: 'EXISTING_WORK_NOT_UPDATED' });
    });
  });
});

describe('compareOnixExistingReferences (#224 Amendment 1)', () => {
  const source = (
    ordinal: number,
    facts: Partial<Pick<OnixPlannedReference, 'doi' | 'unstructuredCitation' | 'isbn' | 'issn'>>,
  ) => ({
    citationKey: `c-${ordinal}`,
    productKey: 'p',
    referenceOrdinal: ordinal,
    doi: null,
    unstructuredCitation: null,
    isbn: null,
    issn: null,
    locations: [],
    ...facts,
  });
  const target = (
    ordinal: number,
    facts: Partial<Omit<OnixExistingReference, 'referenceId' | 'referenceOrdinal'>>,
  ) => ({
    referenceId: `r-${ordinal}`,
    referenceOrdinal: ordinal,
    doi: null,
    unstructuredCitation: null,
    isbn: null,
    issn: null,
    ...facts,
  });
  const A = { doi: 'https://doi.org/10.1234/a' };
  const B = { doi: 'https://doi.org/10.1234/b' };
  const C = { doi: 'https://doi.org/10.1234/c' };

  it('is compatible where the ordered sequence, ordinals and represented facts are equal, however Thoth spells them', () => {
    expect(
      compareOnixExistingReferences(
        [
          source(1, A),
          source(2, { unstructuredCitation: 'Text.', isbn: ISBN_B }),
          source(3, { doi: C.doi, issn: '1050-124X' }),
        ],
        [
          target(3, { doi: 'https://doi.org/10.1234/C', issn: '1050-124x' }),
          target(1, { doi: 'https://DOI.org/10.1234/A'.replace('DOI', 'doi') }),
          target(2, { unstructuredCitation: 'Text. ', isbn: '978-1-80000-003-2' }),
        ],
      ),
    ).toEqual({ outcome: 'COMPATIBLE', reasons: [] });
  });

  it('ignores a target field this source never maps for that Reference: nothing it does not state can contradict it', () => {
    expect(
      compareOnixExistingReferences(
        [source(1, A)],
        // Thoth's exporter writes a Reference's DOI and drops its citation text and ISBN: the round trip is equal.
        [target(1, { ...A, unstructuredCitation: 'Full citation text.', isbn: ISBN_B })],
      ),
    ).toEqual({ outcome: 'COMPATIBLE', reasons: [] });
  });

  it('contradicts a source Reference the target lacks', () => {
    expect(compareOnixExistingReferences([source(1, A), source(2, B)], [target(1, A)])).toEqual({
      outcome: 'CONTRADICTED',
      reasons: ['CARDINALITY:2:1', 'SOURCE_ONLY:2'],
    });
  });

  it('contradicts a target-only Reference: the family asserted is the whole list', () => {
    expect(compareOnixExistingReferences([source(1, A)], [target(1, A), target(2, B)])).toEqual({
      outcome: 'CONTRADICTED',
      reasons: ['CARDINALITY:1:2', 'TARGET_ONLY:2'],
    });
  });

  it('contradicts a represented fact that differs', () => {
    expect(
      compareOnixExistingReferences([source(1, { ...A, isbn: ISBN_B })], [target(1, { ...A, isbn: ISBN_C })]),
    ).toEqual({
      outcome: 'CONTRADICTED',
      reasons: ['FIELDS:1:isbn'],
    });
    // A fact the source states that the target leaves empty differs too.
    expect(compareOnixExistingReferences([source(1, { ...A, issn: '0317-8471' })], [target(1, A)])).toEqual({
      outcome: 'CONTRADICTED',
      reasons: ['FIELDS:1:issn'],
    });
  });

  it('contradicts the same References in another order, or at other ordinals', () => {
    expect(compareOnixExistingReferences([source(1, A), source(2, B)], [target(1, B), target(2, A)])).toEqual({
      outcome: 'CONTRADICTED',
      reasons: ['ORDER:1', 'ORDER:2'],
    });
    expect(compareOnixExistingReferences([source(1, A), source(2, B)], [target(1, A), target(3, B)])).toEqual({
      outcome: 'CONTRADICTED',
      reasons: ['ORDINAL:2:3'],
    });
  });

  it('contradicts a different number of References', () => {
    expect(compareOnixExistingReferences([], [target(1, A)])).toEqual({
      outcome: 'CONTRADICTED',
      reasons: ['CARDINALITY:0:1', 'TARGET_ONLY:1'],
    });
    expect(
      compareOnixExistingReferences([source(1, A), source(2, B), source(3, C)], [target(1, A), target(2, B)]).reasons,
    ).toEqual(['CARDINALITY:3:2', 'SOURCE_ONLY:3']);
  });
});
