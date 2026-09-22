import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { parse } from '@5stones/onix';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PublicationType as TPublicationType } from '@/src/entities/publication/model/publication.types';

import { AccessibilityExceptions, AccessibilityStandards } from '../../constants/accessibility';
import { PublicationType } from '../../constants/publications';
import {
  ONIX_ACCESSIBILITY_ACKNOWLEDGED,
  ONIX_ACCESSIBILITY_KEEP_EXCEPTION,
  ONIX_ACCESSIBILITY_KEEP_STANDARDS,
  ONIX_ACCESSIBILITY_OMIT,
  type OnixAccessibilityFinding,
  type OnixPublicationAccessibilityState,
} from '../../types/onixPlanning';
import type { ExtendedONIXMessageRoot } from './interfaces';
import {
  accessibilityScopeOf,
  EMPTY_ONIX_ACCESSIBILITY,
  isOfferedOnixAccessibilityAnswer,
  isRepresentableOnixAccessibility,
  ONIX_LIST_196_KINDS,
  ONIX_MATERIAL_FEATURE_TYPES,
  reduceOnixAccessibility,
  resolveOnixPublicationAccessibility,
} from './onixAccessibility';
import { planOnixSource } from './onixPlanning';
import { reduceOnixRights } from './onixRights';

const REFERENCE_NS = 'http://ns.editeur.org/onix/3.0/reference';
const HEADER =
  '<Header><Sender><SenderName>Example Press</SenderName></Sender><SentDateTime>20260922</SentDateTime></Header>';

const {
  Wcag21Aa,
  Wcag21Aaa,
  Wcag22Aa,
  Wcag22Aaa,
  EpubA11Y10Aa,
  EpubA11Y10Aaa,
  EpubA11Y11Aa,
  EpubA11Y11Aaa,
  PdfUa1,
  PdfUa2,
} = AccessibilityStandards.enum;
const { MicroEnterprises, DisproportionateBurden, FundamentalAlteration } = AccessibilityExceptions.enum;
const { Azw3, Docx, Epub, FictionBook, Hardback, Html, Mobi, Mp3, Paperback, Pdf, Wav, Xml } = PublicationType.enum;
const ALL_TYPES: readonly TPublicationType[] = [
  Paperback,
  Hardback,
  Pdf,
  Epub,
  Html,
  Xml,
  Mobi,
  Azw3,
  Docx,
  FictionBook,
  Mp3,
  Wav,
];

/** The ProductForm and format-defining ProductFormDetail each PublicationType resolves from (#182). */
const FORMS: Readonly<Record<string, readonly string[]>> = {
  [Epub]: ['ED', 'E101'],
  [Pdf]: ['ED', 'E107'],
  [Html]: ['ED', 'E105'],
  [Docx]: ['ED', 'E104'],
  [Mobi]: ['ED', 'E127'],
  [Paperback]: ['BC'],
  [Hardback]: ['BB'],
  [Mp3]: ['AJ', 'A103'],
  [Wav]: ['AJ', 'A104'],
  /** A digital Product whose format the file leaves open: every digital text type is a candidate. */
  OPEN: ['ED'],
};

type Description = string | { readonly text: string; readonly language?: string };

const feature = (type: string, value?: string, descriptions: readonly Description[] = []) =>
  `<ProductFormFeature><ProductFormFeatureType>${type}</ProductFormFeatureType>${
    value === undefined ? '' : `<ProductFormFeatureValue>${value}</ProductFormFeatureValue>`
  }${descriptions
    .map((description) =>
      typeof description === 'string'
        ? `<ProductFormFeatureDescription>${description}</ProductFormFeatureDescription>`
        : `<ProductFormFeatureDescription${description.language ? ` language="${description.language}"` : ''}>${description.text}</ProductFormFeatureDescription>`,
    )
    .join('')}</ProductFormFeature>`;

/** Type-09 accessibility detail, one composite per List 196 code, in the order given. */
const a11y = (...codes: string[]) => codes.map((code) => feature('09', code)).join('');

type ProductSpec = {
  readonly ref: string;
  readonly as?: string;
  readonly features?: string;
  readonly composition?: string;
  /** Anything else DescriptiveDetail states after the features, such as usage constraints. */
  readonly extra?: string;
  readonly related?: string;
};

const product = ({ ref, as = Epub, features = '', composition = '00', extra = '', related = '' }: ProductSpec) => {
  const [form, ...details] = FORMS[as];

  return (
    `<Product><RecordReference>${ref}</RecordReference><NotificationType>03</NotificationType>` +
    `<DescriptiveDetail><ProductComposition>${composition}</ProductComposition><ProductForm>${form}</ProductForm>` +
    details.map((detail) => `<ProductFormDetail>${detail}</ProductFormDetail>`).join('') +
    features +
    extra +
    '<TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>01</TitleElementLevel><TitleText>A Work</TitleText></TitleElement></TitleDetail>' +
    '</DescriptiveDetail><PublishingDetail><PublishingStatus>02</PublishingStatus></PublishingDetail>' +
    `${related ? `<RelatedMaterial>${related}</RelatedMaterial>` : ''}</Product>`
  );
};

const message = (products: string[]) =>
  parse(
    `<ONIXMessage release="3.0" xmlns="${REFERENCE_NS}">${HEADER}${products.join('')}</ONIXMessage>`,
  ) as ExtendedONIXMessageRoot;

const reduce = (products: string[], { withRights = true }: { withRights?: boolean } = {}) => {
  const root = message(products);
  const sourcePlan = planOnixSource(root);
  const plan = reduceOnixAccessibility(
    root,
    sourcePlan,
    withRights ? { rights: reduceOnixRights(root, sourcePlan) } : {},
  );
  const byKey = new Map(plan.findings.map((finding) => [finding.key, finding]));
  const productKeyOf = (ref: string) =>
    sourcePlan.records.find(({ recordReference }) => recordReference === ref)?.productKey ?? '';
  const productOf = (ref: string) => plan.products[productKeyOf(ref)];
  const findingsOf = (ref: string, type: TPublicationType | null = null) =>
    plan.findings.filter(
      ({ productKey, publicationType }) =>
        productKey === productKeyOf(ref) && (publicationType === null || publicationType === type),
    );
  const decide = (ref: string, type: TPublicationType, choices?: Record<string, string>) =>
    resolveOnixPublicationAccessibility(plan, productKeyOf(ref), type, byKey, choices);
  const findingOf = (ref: string, code: OnixAccessibilityFinding['code'], type: TPublicationType | null = null) =>
    findingsOf(ref, type).find((finding) => finding.code === code);

  return { root, sourcePlan, plan, byKey, productKeyOf, productOf, findingsOf, findingOf, decide };
};

const codesOf = (findings: readonly OnixAccessibilityFinding[]) => findings.map(({ code }) => code);

const state = (partial: Partial<OnixPublicationAccessibilityState>): OnixPublicationAccessibilityState => ({
  ...EMPTY_ONIX_ACCESSIBILITY,
  ...partial,
});

const PATH = '/ONIXMessage[1]/Product[1]/DescriptiveDetail[1]/ProductFormFeature';

describe('the pinned vocabulary', () => {
  const codelists = readFileSync(
    resolve(process.cwd(), 'public/onix-validation/ONIX_BookProduct_CodeLists.xsd'),
    'utf8',
  );
  const enumerated = (list: string): string[] => {
    const start = codelists.indexOf(`<xs:simpleType name="List${list}">`);
    const end = codelists.indexOf('<xs:simpleType name=', start + 1);

    return [...codelists.slice(start, end).matchAll(/<xs:enumeration value="([^"]+)">/g)].map(([, value]) => value);
  };

  it('classifies exactly the List 196 codes canonical validation admits for type 09, no more and no fewer', () => {
    expect(Object.keys(ONIX_LIST_196_KINDS).sort()).toEqual(enumerated('196').sort());
  });

  it('names only List 79 types the pinned codelist holds as material, and keeps type 09 among them', () => {
    const list79 = enumerated('79');

    expect(list79).toContain('09');
    [...ONIX_MATERIAL_FEATURE_TYPES, '10', '15', '16'].forEach((type) => expect(list79).toContain(type));
    // Hazard, dangerous goods, access control and EUDR attestations are material; colours and fonts never are.
    ['12', '13', '14', '18', '21', '52', '53'].forEach((type) =>
      expect(ONIX_MATERIAL_FEATURE_TYPES.has(type)).toBe(true),
    );
    ['01', '03', '05', '26', '31', '66'].forEach((type) => expect(ONIX_MATERIAL_FEATURE_TYPES.has(type)).toBe(false));
  });
});

describe('the database contract (thoth#893 Architecture Amendment 3)', () => {
  it.each([
    // Print and audio hold no standard, additional standard or exception.
    [Paperback, state({ accessibilityStandard: Wcag21Aa }), false],
    [Hardback, state({ accessibilityException: MicroEnterprises }), false],
    [Mp3, state({ accessibilityStandard: Wcag22Aaa }), false],
    [Wav, state({ accessibilityException: FundamentalAlteration }), false],
    [Paperback, state({ accessibilityReportUrl: 'https://example.org/a11y' }), true],
    // The primary slot is WCAG only.
    [Pdf, state({ accessibilityStandard: PdfUa1 }), false],
    [Epub, state({ accessibilityStandard: EpubA11Y11Aa }), false],
    // An additional standard: the type's own family, and only beside a primary.
    [Pdf, state({ accessibilityStandard: Wcag21Aa, accessibilityAdditionalStandard: PdfUa2 }), true],
    [Pdf, state({ accessibilityStandard: Wcag21Aa, accessibilityAdditionalStandard: EpubA11Y10Aa }), false],
    [Epub, state({ accessibilityStandard: Wcag22Aa, accessibilityAdditionalStandard: EpubA11Y11Aaa }), true],
    [Epub, state({ accessibilityStandard: Wcag22Aa, accessibilityAdditionalStandard: PdfUa1 }), false],
    [Html, state({ accessibilityStandard: Wcag22Aa, accessibilityAdditionalStandard: EpubA11Y11Aa }), false],
    [Html, state({ accessibilityStandard: Wcag22Aa }), true],
    [Epub, state({ accessibilityAdditionalStandard: EpubA11Y11Aa }), false],
    // Standards and an exception are mutually exclusive.
    [Epub, state({ accessibilityStandard: Wcag21Aa, accessibilityException: MicroEnterprises }), false],
    [Pdf, state({ accessibilityAdditionalStandard: PdfUa1, accessibilityException: MicroEnterprises }), false],
    [Mobi, state({ accessibilityException: DisproportionateBurden }), true],
    [Docx, EMPTY_ONIX_ACCESSIBILITY, true],
  ])('holds %s with %o: %s', (type, candidate, expected) => {
    expect(isRepresentableOnixAccessibility(type, candidate)).toBe(expected);
  });

  it('scopes Publications as the constraints do', () => {
    expect(ALL_TYPES.map((type) => [type, accessibilityScopeOf(type)])).toEqual([
      [Paperback, 'PHYSICAL'],
      [Hardback, 'PHYSICAL'],
      [Pdf, 'DIGITAL'],
      [Epub, 'DIGITAL'],
      [Html, 'DIGITAL'],
      [Xml, 'DIGITAL'],
      [Mobi, 'DIGITAL'],
      [Azw3, 'DIGITAL'],
      [Docx, 'DIGITAL'],
      [FictionBook, 'DIGITAL'],
      [Mp3, 'AUDIO'],
      [Wav, 'AUDIO'],
    ]);
  });
});

describe('ProductFormFeature normalisation', () => {
  it('normalises a single and a repeated ProductFormFeature alike, except for how many there are', () => {
    const single = reduce([product({ ref: 'a', features: feature('07', 'X', ['Needs a reader']) })]);
    const repeated = reduce([
      product({ ref: 'a', features: feature('07', 'X', ['Needs a reader']) + feature('07', 'X', ['Needs a reader']) }),
    ]);
    const expected = (index: number) => ({
      path: `${PATH}[${index}]`,
      sourcePath: `${PATH}[${index}]`,
      type: '07',
      value: 'X',
      descriptions: [
        {
          path: `${PATH}[${index}]/ProductFormFeatureDescription[1]`,
          sourcePath: `${PATH}[${index}]/ProductFormFeatureDescription[1]`,
          text: 'Needs a reader',
          language: null,
          textScript: null,
          textFormat: null,
        },
      ],
      role: 'OTHER',
    });

    expect(single.productOf('a').features).toEqual([expected(1)]);
    expect(repeated.productOf('a').features).toEqual([expected(1), expected(2)]);
    // Each repeat stays its own fact, with its own finding.
    expect(codesOf(repeated.findingsOf('a'))).toEqual([
      'PRODUCT_FORM_FEATURE_NOT_REPRESENTED',
      'PRODUCT_FORM_FEATURE_NOT_REPRESENTED',
    ]);
    expect(repeated.findingsOf('a').map(({ locations }) => locations.map(({ path }) => path))).toEqual([
      [`${PATH}[1]`],
      [`${PATH}[2]`],
    ]);
  });

  it('keeps every feature in source order with its type, value, every description and its attributes', () => {
    const { productOf } = reduce([
      product({
        ref: 'a',
        features:
          feature('09', '00', [
            { text: 'Fully accessible', language: 'eng' },
            { text: 'Entièrement accessible', language: 'fre' },
          ]) +
          feature('01', 'BLU') +
          feature('09', '81'),
      }),
    ]);
    const { features } = productOf('a');

    expect(features.map(({ type, value, role }) => [type, value, role])).toEqual([
      ['09', '00', 'ACCESSIBILITY'],
      ['01', 'BLU', 'OTHER'],
      ['09', '81', 'ACCESSIBILITY'],
    ]);
    expect(
      features[0].descriptions.map(({ text, language, textScript, textFormat }) => [
        text,
        language,
        textScript,
        textFormat,
      ]),
    ).toEqual([
      ['Fully accessible', 'eng', null, null],
      ['Entièrement accessible', 'fre', null, null],
    ]);
  });

  it('maps every path back to the submitted source through the provenance it is given', () => {
    const root = message([product({ ref: 'a', features: a11y('81', '85') })]);
    const sourcePlan = planOnixSource(root);
    const plan = reduceOnixAccessibility(root, sourcePlan, {
      provenance: {
        sourcePathOf: (path) => path.replace('ProductFormFeature', 'productformfeature'),
        sourceTagOf: (path) => path.split('/').pop() ?? '',
      },
      rights: reduceOnixRights(root, sourcePlan),
    });
    const [productKey] = Object.keys(plan.products);

    expect(plan.products[productKey].features.map(({ sourcePath }) => sourcePath)).toEqual([
      `${PATH.replace('ProductFormFeature', 'productformfeature')}[1]`,
      `${PATH.replace('ProductFormFeature', 'productformfeature')}[2]`,
    ]);
    expect(plan.products[productKey].primaryStandards[0].locations.map(({ sourcePath }) => sourcePath)).toEqual([
      `${PATH.replace('ProductFormFeature', 'productformfeature')}[1]`,
      `${PATH.replace('ProductFormFeature', 'productformfeature')}[2]`,
    ]);
  });

  it('fabricates nothing for a Product with no ProductFormFeature', () => {
    const { productOf, findingsOf, decide } = reduce([product({ ref: 'a', as: Pdf })]);

    expect(productOf('a')).toMatchObject({
      features: [],
      primaryStandards: [],
      additionalStandards: [],
      exceptions: [],
      reportUrls: [],
    });
    expect(findingsOf('a', Pdf)).toEqual([]);
    expect(decide('a', Pdf)?.resolved).toEqual(EMPTY_ONIX_ACCESSIBILITY);
  });

  it('never fetches a URL a ProductFormFeature carries', () => {
    const fetchSpy = vi.fn();

    vi.stubGlobal('fetch', fetchSpy);
    const { decide } = reduce([
      product({
        ref: 'a',
        as: Pdf,
        features:
          a11y('81', '85') +
          feature('09', '96', ['https://example.org/a11y']) +
          feature('09', '94', ['https://scheme.example/a11y']) +
          feature('60', undefined, ['https://example.org/plot.geojson']),
      }),
    ]);

    expect(decide('a', Pdf)?.resolved?.accessibilityReportUrl).toBe('https://example.org/a11y');
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

describe('exact accessibility mappings', () => {
  it.each([
    [['81', '85'], Wcag21Aa],
    [['81', '86'], Wcag21Aaa],
    [['82', '85'], Wcag22Aa],
    [['82', '86'], Wcag22Aaa],
    // The same assertion whatever order the file states it in.
    [['86', '82'], Wcag22Aaa],
  ])('maps WCAG %j to %s, automatically and with its source facts', (codes, expected) => {
    const { decide, productOf } = reduce([product({ ref: 'a', as: Pdf, features: a11y(...codes) })]);
    const decision = decide('a', Pdf);

    expect(productOf('a').primaryStandards.map(({ value }) => value)).toEqual([expected]);
    expect(decision?.resolved).toEqual(state({ accessibilityStandard: expected }));
    expect(decision?.sources).toEqual([
      expect.objectContaining({
        field: 'accessibilityStandard',
        value: expected,
        basis: 'AUTOMATIC',
        findingKey: null,
        codes: [...codes].sort(),
      }),
    ]);
    expect(decision?.pendingChoices).toEqual([]);
  });

  it.each([
    [['80', '85'], '80'],
    [['81', '84'], '84'],
    [['81'], '81'],
    [['85'], '85'],
    [['80'], '80'],
    [['84'], '84'],
  ])('maps WCAG %j to nothing, and discloses %s as a fact Thoth does not record', (codes, disclosed) => {
    const { decide, productOf, findingsOf } = reduce([product({ ref: 'a', as: Pdf, features: a11y(...codes) })]);
    const facts = findingsOf('a').filter(({ code }) => code === 'ACCESSIBILITY_FACT_NOT_REPRESENTED');

    expect(productOf('a').primaryStandards).toEqual([]);
    expect(decide('a', Pdf)?.resolved).toEqual(EMPTY_ONIX_ACCESSIBILITY);
    expect(facts.map(({ detail }) => detail.value)).toContain(disclosed);
    expect(
      facts.every(({ blocking, classification }) => !blocking && classification === 'TARGET_UNREPRESENTABLE'),
    ).toBe(true);
  });

  it.each([
    [Epub, ['03'], EpubA11Y10Aa],
    [Epub, ['03', '86'], EpubA11Y10Aaa],
    [Epub, ['03', '85'], EpubA11Y10Aa],
    [Epub, ['04', '85'], EpubA11Y11Aa],
    [Epub, ['04', '86'], EpubA11Y11Aaa],
    [Pdf, ['05'], PdfUa1],
    [Pdf, ['06'], PdfUa2],
  ])(
    'maps the additional standard of a %s Publication from %j to %s beside its WCAG standard',
    (type, codes, expected) => {
      // A level shared with WCAG 2.2 (82) belongs to both assertions; where the codes state none, AA is stated for WCAG.
      const level = codes.some((code) => code === '85' || code === '86') ? [] : ['85'];
      const { decide } = reduce([product({ ref: 'a', as: type, features: a11y('82', ...codes, ...level) })]);
      const resolved = decide('a', type)?.resolved;

      expect(resolved?.accessibilityAdditionalStandard).toBe(expected);
      expect(resolved?.accessibilityStandard).not.toBeNull();
      expect(isRepresentableOnixAccessibility(type, resolved as OnixPublicationAccessibilityState)).toBe(true);
    },
  );

  it.each([
    // EPUB Accessibility 1.0 level A has no Thoth value, whatever WCAG conformance stands beside it.
    [['81', '85', '02'], state({ accessibilityStandard: Wcag21Aa }), ['02']],
    // EPUB Accessibility 1.1 with no level stated at all.
    [['04'], EMPTY_ONIX_ACCESSIBILITY, ['04']],
    // EPUB Accessibility 1.1 at level A, beside WCAG 2.1 at level A: neither has a Thoth value.
    [['81', '84', '04'], EMPTY_ONIX_ACCESSIBILITY, ['81', '84', '04']],
  ])('maps additional %j to nothing, never to a fabricated AA or AAA', (codes, expected, disclosed) => {
    const { decide, productOf, findingsOf } = reduce([product({ ref: 'a', as: Epub, features: a11y(...codes) })]);

    expect(productOf('a').additionalStandards).toEqual([]);
    expect(decide('a', Epub)?.resolved).toEqual(expected);
    expect(
      findingsOf('a')
        .filter(({ code }) => code === 'ACCESSIBILITY_FACT_NOT_REPRESENTED')
        .map(({ detail }) => detail.value),
    ).toEqual(disclosed);
  });

  it('reads a level stated once as qualifying both the WCAG version and EPUB Accessibility 1.1 (List 196 04 note)', () => {
    const { decide } = reduce([product({ ref: 'a', as: Epub, features: a11y('81', '85', '04') })]);

    expect(decide('a', Epub)?.resolved).toEqual(
      state({ accessibilityStandard: Wcag21Aa, accessibilityAdditionalStandard: EpubA11Y11Aa }),
    );
  });

  it.each([
    ['75', MicroEnterprises],
    ['76', DisproportionateBurden],
    ['77', FundamentalAlteration],
  ])('maps EAA exception %s to %s', (code, expected) => {
    const { decide } = reduce([product({ ref: 'a', as: Epub, features: a11y(code) })]);

    expect(decide('a', Epub)?.resolved).toEqual(state({ accessibilityException: expected }));
  });

  it("maps only the publisher's code-96 web page to the report URL, exactly as stated less surrounding space", () => {
    const { decide, productOf } = reduce([
      product({
        ref: 'a',
        as: Epub,
        features:
          feature('09', '94', ['https://scheme.example/a11y']) +
          feature('09', '95', ['https://intermediary.example/a11y']) +
          feature('09', '96', ['  https://example.org/accessibility?lang=en  ']) +
          feature('09', '97', ['https://tested.example/a11y']),
      }),
    ]);

    expect(productOf('a').reportUrls.map(({ value, codes }) => [value, codes])).toEqual([
      ['https://example.org/accessibility?lang=en', ['96']],
    ]);
    expect(decide('a', Epub)?.resolved).toEqual(
      state({ accessibilityReportUrl: 'https://example.org/accessibility?lang=en' }),
    );
  });

  it('takes no report URL from a code-96 description that is no web-page URL, and says so', () => {
    const { decide, findingsOf } = reduce([
      product({
        ref: 'a',
        as: Epub,
        features:
          feature('09', '96', ['See our website']) +
          feature('09', '96', ['javascript:alert(1)']) +
          feature('09', '96', ['mailto:access@example.org']) +
          feature('09', '96'),
      }),
    ]);

    expect(decide('a', Epub)?.resolved).toEqual(EMPTY_ONIX_ACCESSIBILITY);
    expect(
      findingsOf('a')
        .filter(({ code }) => code === 'ACCESSIBILITY_REPORT_URL_UNUSABLE')
        .map(({ detail, blocking }) => [detail.url, blocking]),
    ).toEqual([
      ['See our website', false],
      ['javascript:alert(1)', false],
      ['mailto:access@example.org', false],
      ['', false],
    ]);
  });
});

describe('type-09 facts Thoth does not record', () => {
  it.each([
    ['00', 'SUMMARY'],
    ['01', 'COMPLIANCE_SCHEME'],
    ['08', 'STATUS'],
    ['09', 'STATUS'],
    ['11', 'FEATURE'],
    ['36', 'FEATURE'],
    ['52', 'FEATURE'],
    ['88', 'CERTIFICATION'],
    ['89', 'CERTIFICATION'],
    ['90', 'CERTIFICATION'],
    ['91', 'CERTIFICATION'],
    ['92', 'CERTIFICATION'],
    ['93', 'CERTIFICATION'],
    ['94', 'DETAIL_URL'],
    ['95', 'DETAIL_URL'],
    ['97', 'DETAIL_URL'],
    ['98', 'CONTACT'],
    ['99', 'CONTACT'],
  ])('keeps List 196 %s (%s) as an explicit fact and finding, and projects nothing from it', (code, kind) => {
    const { decide, productOf, findingsOf } = reduce([
      product({ ref: 'a', as: Epub, features: feature('09', code, ['https://example.org/detail']) }),
    ]);

    expect(productOf('a').features).toEqual([expect.objectContaining({ type: '09', value: code })]);
    expect(findingsOf('a')).toEqual([
      expect.objectContaining({
        family: 'ACCESSIBILITY',
        code: 'ACCESSIBILITY_FACT_NOT_REPRESENTED',
        classification: 'TARGET_UNREPRESENTABLE',
        blocking: false,
        publicationType: null,
        detail: { value: code, kind, descriptions: 1 },
        locations: [{ path: `${PATH}[1]`, sourcePath: `${PATH}[1]` }],
      }),
    ]);
    expect(decide('a', Epub)?.resolved).toEqual(EMPTY_ONIX_ACCESSIBILITY);
  });

  it("never states a contact's details in its finding, which keeps them in the fact alone", () => {
    const { findingsOf, productOf } = reduce([
      product({ ref: 'a', as: Epub, features: feature('09', '99', ['access@example.org']) }),
    ]);

    expect(JSON.stringify(findingsOf('a'))).not.toContain('access@example.org');
    expect(productOf('a').features[0].descriptions[0].text).toBe('access@example.org');
  });

  it('keeps the description of a mapped code as a disclosed loss, and the exception description too', () => {
    const { findingsOf, decide } = reduce([
      product({
        ref: 'a',
        as: Epub,
        features: feature('09', '75', ['We employ fewer than ten people']),
      }),
    ]);

    expect(decide('a', Epub)?.resolved).toEqual(state({ accessibilityException: MicroEnterprises }));
    expect(findingsOf('a')).toEqual([
      expect.objectContaining({
        code: 'ACCESSIBILITY_DESCRIPTION_NOT_REPRESENTED',
        classification: 'SUPPORTED_WITH_WARNING',
        blocking: false,
        locations: [
          { path: `${PATH}[1]`, sourcePath: `${PATH}[1]` },
          {
            path: `${PATH}[1]/ProductFormFeatureDescription[1]`,
            sourcePath: `${PATH}[1]/ProductFormFeatureDescription[1]`,
          },
        ],
      }),
    ]);
  });

  it('reads code 10 beside the usage constraints and technical protection it is an exception to', () => {
    const extra =
      '<EpubTechnicalProtection>01</EpubTechnicalProtection>' +
      '<EpubUsageConstraint><EpubUsageType>05</EpubUsageType><EpubUsageStatus>03</EpubUsageStatus></EpubUsageConstraint>';
    const { findingsOf } = reduce([product({ ref: 'a', as: Epub, features: a11y('10'), extra })]);
    const [finding] = findingsOf('a');

    expect(finding).toMatchObject({
      code: 'ACCESSIBILITY_FACT_NOT_REPRESENTED',
      blocking: false,
      detail: { value: '10', kind: 'READING_SYSTEM_OPTIONS', usageConstraints: ['05:03'], technicalProtection: ['01'] },
    });
    expect(finding.message).toContain('EpubUsageType 05, status 03');
    expect(finding.message).toContain('implies nothing about DRM or text-to-speech');
    expect(finding.locations.map(({ path }) => path)).toHaveLength(3);
  });

  it('holds code 10 as a gap when there is no rights reduction to read its exceptions with', () => {
    const { findingsOf, decide } = reduce([product({ ref: 'a', as: Epub, features: a11y('10') })], {
      withRights: false,
    });

    expect(findingsOf('a')).toEqual([
      expect.objectContaining({
        code: 'ACCESSIBILITY_READING_OPTIONS_NOT_RECONCILED',
        classification: 'PREFLIGHT_GAP',
        blocking: true,
      }),
    ]);
    expect(decide('a', Epub)?.resolved).toBeNull();
  });

  it('reports a type-09 shape canonical validation refuses as a gap, never a guess', () => {
    const { findingsOf, decide } = reduce([
      product({ ref: 'a', as: Epub, features: feature('09') + feature('09', '83') + a11y('81', '85') }),
    ]);

    expect(
      findingsOf('a')
        .filter(({ code }) => code === 'ACCESSIBILITY_SHAPE_UNEXPECTED')
        .map(({ detail, classification, blocking }) => [detail.value, classification, blocking]),
    ).toEqual([
      ['', 'PREFLIGHT_GAP', true],
      ['83', 'PREFLIGHT_GAP', true],
    ]);
    expect(decide('a', Epub)?.resolved).toBeNull();
  });
});

describe('non-09 ProductFormFeatures', () => {
  it.each(['12', '13', '14', '18', '19', '20', '21', '25', '47', '50', '52', '53', '54', '56', '63'])(
    'holds material type %s until its loss is acknowledged, and never re-scopes it',
    (type) => {
      const { findingsOf, decide, productOf } = reduce([
        product({ ref: 'a', as: Epub, features: feature(type, '01', ['Warning text']) }),
      ]);
      const [finding] = findingsOf('a');

      expect(finding).toMatchObject({
        family: 'PRODUCT_FORM_FEATURE',
        code: 'PRODUCT_FORM_FEATURE_NOT_REPRESENTED',
        classification: 'TARGET_UNREPRESENTABLE',
        blocking: true,
        resolution: { kind: 'ACKNOWLEDGE' },
        detail: { type, value: '01', role: 'MATERIAL', descriptions: 1 },
      });
      expect(productOf('a')).toMatchObject({ primaryStandards: [], additionalStandards: [], exceptions: [] });
      expect(decide('a', Epub)?.resolved).toEqual(EMPTY_ONIX_ACCESSIBILITY);
    },
  );

  it.each(['01', '03', '04', '05', '06', '07', '22', '31', '41', '66'])(
    'discloses type %s without holding the import',
    (type) => {
      const { findingsOf } = reduce([product({ ref: 'a', as: Epub, features: feature(type, 'X') })]);

      expect(findingsOf('a')).toEqual([
        expect.objectContaining({
          family: 'PRODUCT_FORM_FEATURE',
          blocking: false,
          resolution: { kind: 'NONE' },
          detail: expect.objectContaining({ type, role: 'OTHER' }),
        }),
      ]);
    },
  );

  it.each(['10', '15', '16'])(
    'keeps format evidence type %s as evidence only: it never decides or changes the publication type',
    (type) => {
      const { findingsOf, sourcePlan } = reduce([product({ ref: 'a', as: Pdf, features: feature(type, '101A') })]);

      expect(sourcePlan.products[0].manifestation).toMatchObject({ kind: 'RESOLVED', type: Pdf });
      expect(findingsOf('a')).toEqual([
        expect.objectContaining({
          blocking: false,
          detail: expect.objectContaining({ type, role: 'FORMAT_EVIDENCE', manifestation: Pdf }),
        }),
      ]);
    },
  );
});

describe('several values for one field: never first, newest or highest', () => {
  it('asks which WCAG conformance to keep, or none, whatever order the file states them in', () => {
    const forward = reduce([product({ ref: 'a', as: Epub, features: a11y('81', '82', '85') })]);
    const reversed = reduce([product({ ref: 'a', as: Epub, features: a11y('85', '82', '81') })]);

    [forward, reversed].forEach(({ findingOf, decide }) => {
      const choice = findingOf('a', 'ACCESSIBILITY_PRIMARY_CHOICE_REQUIRED', Epub);

      expect(choice).toMatchObject({
        classification: 'TARGET_INPUT_REQUIRED',
        blocking: true,
        publicationType: Epub,
        resolution: {
          kind: 'CHOICE',
          options: [
            { key: Wcag21Aa, label: 'WCAG 2.1 AA (List 196 81 + 85)' },
            { key: Wcag22Aa, label: 'WCAG 2.2 AA (List 196 82 + 85)' },
            { key: ONIX_ACCESSIBILITY_OMIT, label: ONIX_ACCESSIBILITY_OMIT },
          ],
        },
      });
      // Unanswered, nothing is taken: not the first, not the newest.
      expect(decide('a', Epub)).toMatchObject({ resolved: null, pendingChoices: [choice?.key] });
    });
  });

  it('asks between AA and AAA of one version rather than taking the stronger level', () => {
    const { findingOf, decide } = reduce([product({ ref: 'a', as: Pdf, features: a11y('81', '85', '86') })]);
    const choice = findingOf('a', 'ACCESSIBILITY_PRIMARY_CHOICE_REQUIRED', Pdf) as OnixAccessibilityFinding;

    expect(choice.resolution).toMatchObject({
      options: [{ key: Wcag21Aa }, { key: Wcag21Aaa }, { key: ONIX_ACCESSIBILITY_OMIT }],
    });
    expect(decide('a', Pdf)?.resolved).toBeNull();
    expect(decide('a', Pdf, { [choice.key]: Wcag21Aa })?.resolved).toEqual(state({ accessibilityStandard: Wcag21Aa }));
    expect(decide('a', Pdf, { [choice.key]: Wcag21Aa })?.omitted).toEqual([
      expect.objectContaining({ value: Wcag21Aaa, reason: 'NOT_CHOSEN', findingKey: choice.key }),
    ]);
  });

  it.each([
    [Epub, ['81', '03', '85', '86'], [EpubA11Y10Aa, EpubA11Y10Aaa]],
    [Epub, ['81', '85', '04', '86'], [EpubA11Y11Aa, EpubA11Y11Aaa]],
    [Epub, ['81', '85', '03', '04'], [EpubA11Y10Aa, EpubA11Y11Aa]],
    [Pdf, ['82', '86', '05', '06'], [PdfUa1, PdfUa2]],
  ])('asks which additional standard a %s Publication keeps among %j', (type, codes, options) => {
    const { findingOf, decide } = reduce([product({ ref: 'a', as: type, features: a11y(...codes) })]);
    const choice = findingOf('a', 'ACCESSIBILITY_ADDITIONAL_CHOICE_REQUIRED', type) as OnixAccessibilityFinding;

    expect(choice.resolution).toEqual({
      kind: 'CHOICE',
      options: options.map((key) => expect.objectContaining({ key })),
    });
    expect(decide('a', type)?.pendingChoices).toContain(choice.key);
  });

  it('asks which EAA exception to keep', () => {
    const { findingOf, decide } = reduce([product({ ref: 'a', as: Epub, features: a11y('77', '75') })]);
    const choice = findingOf('a', 'ACCESSIBILITY_EXCEPTION_CHOICE_REQUIRED', Epub) as OnixAccessibilityFinding;

    expect(choice.resolution).toEqual({
      kind: 'CHOICE',
      options: [
        expect.objectContaining({ key: MicroEnterprises }),
        expect.objectContaining({ key: FundamentalAlteration }),
      ],
    });
    expect(decide('a', Epub)?.resolved).toBeNull();
    expect(decide('a', Epub, { [choice.key]: FundamentalAlteration })?.resolved).toEqual(
      state({ accessibilityException: FundamentalAlteration }),
    );
  });

  it('asks which of several report URLs to keep, and treats one URL stated twice as one', () => {
    const { findingOf, decide, productOf } = reduce([
      product({
        ref: 'a',
        as: Epub,
        features:
          feature('09', '96', [
            { text: 'https://example.org/en', language: 'eng' },
            { text: 'https://example.org/fr', language: 'fre' },
          ]) + feature('09', '96', ['https://example.org/en']),
      }),
    ]);
    const choice = findingOf('a', 'ACCESSIBILITY_REPORT_URL_CHOICE_REQUIRED', Epub) as OnixAccessibilityFinding;

    expect(productOf('a').reportUrls.map(({ value, locations }) => [value, locations.length])).toEqual([
      ['https://example.org/en', 2],
      ['https://example.org/fr', 1],
    ]);
    expect(choice.resolution).toEqual({
      kind: 'CHOICE',
      options: [
        { key: 'https://example.org/en', label: 'https://example.org/en' },
        { key: 'https://example.org/fr', label: 'https://example.org/fr' },
      ],
    });
    expect(decide('a', Epub, { [choice.key]: 'https://example.org/fr' })?.resolved).toEqual(
      state({ accessibilityReportUrl: 'https://example.org/fr' }),
    );
  });
});

describe('target-combination reconciliation', () => {
  it('never invents a WCAG standard for an additional one: the loss waits on its acknowledgement', () => {
    const { findingOf, decide } = reduce([product({ ref: 'a', as: Epub, features: a11y('04', '85') })]);
    const loss = findingOf('a', 'ACCESSIBILITY_ADDITIONAL_WITHOUT_PRIMARY', Epub) as OnixAccessibilityFinding;
    const decision = decide('a', Epub);

    expect(loss).toMatchObject({
      blocking: true,
      classification: 'TARGET_UNREPRESENTABLE',
      resolution: { kind: 'ACKNOWLEDGE' },
    });
    expect(decision?.resolved).toEqual(EMPTY_ONIX_ACCESSIBILITY);
    expect(decision?.acknowledgements).toEqual([loss.key]);
    expect(decision?.omitted).toEqual([
      expect.objectContaining({ value: EpubA11Y11Aa, reason: 'NO_PRIMARY_STANDARD', codes: ['04', '85'] }),
    ]);
  });

  it('asks whether the standards or the EAA exception are kept, and never plans both', () => {
    const { findingOf, decide } = reduce([product({ ref: 'a', as: Pdf, features: a11y('81', '85', '05', '76') })]);
    const choice = findingOf('a', 'ACCESSIBILITY_STANDARD_EXCEPTION_CHOICE_REQUIRED', Pdf) as OnixAccessibilityFinding;

    expect(choice.resolution).toEqual({
      kind: 'CHOICE',
      options: [
        { key: ONIX_ACCESSIBILITY_KEEP_STANDARDS, label: 'WCAG 2.1 AA (List 196 81 + 85); PDF/UA-1 (List 196 05)' },
        { key: ONIX_ACCESSIBILITY_KEEP_EXCEPTION, label: 'EAA exception: disproportionate burden (List 196 76)' },
      ],
    });
    expect(decide('a', Pdf)).toMatchObject({ resolved: null, pendingChoices: [choice.key] });

    const standards = decide('a', Pdf, { [choice.key]: ONIX_ACCESSIBILITY_KEEP_STANDARDS });
    const exception = decide('a', Pdf, { [choice.key]: ONIX_ACCESSIBILITY_KEEP_EXCEPTION });

    expect(standards?.resolved).toEqual(
      state({ accessibilityStandard: Wcag21Aa, accessibilityAdditionalStandard: PdfUa1 }),
    );
    expect(standards?.omitted).toEqual([
      expect.objectContaining({ value: DisproportionateBurden, reason: 'STANDARDS_CHOSEN', findingKey: choice.key }),
    ]);
    expect(exception?.resolved).toEqual(state({ accessibilityException: DisproportionateBurden }));
    expect(exception?.omitted.map(({ value, reason }) => [value, reason])).toEqual([
      [Wcag21Aa, 'EXCEPTION_CHOSEN'],
      [PdfUa1, 'EXCEPTION_CHOSEN'],
    ]);
  });

  it('lets an exception stand where no primary standard does, and loses the lone additional one knowingly', () => {
    const { decide, findingOf } = reduce([product({ ref: 'a', as: Pdf, features: a11y('05', '77') })]);

    expect(findingOf('a', 'ACCESSIBILITY_STANDARD_EXCEPTION_CHOICE_REQUIRED', Pdf)).toBeUndefined();
    expect(decide('a', Pdf)?.resolved).toEqual(state({ accessibilityException: FundamentalAlteration }));
    expect(decide('a', Pdf)?.acknowledgements).toEqual([
      findingOf('a', 'ACCESSIBILITY_ADDITIONAL_WITHOUT_PRIMARY', Pdf)?.key,
    ]);
  });

  it('keeps an additional standard the type cannot hold as evidence, and asks for its loss to be acknowledged', () => {
    const { findingOf, decide } = reduce([
      product({ ref: 'a', as: Epub, features: a11y('81', '85', '05') }),
      product({ ref: 'b', as: Html, features: a11y('81', '85', '03') }),
    ]);
    const epub = findingOf('a', 'ACCESSIBILITY_ADDITIONAL_INCOMPATIBLE', Epub) as OnixAccessibilityFinding;

    expect(epub).toMatchObject({ blocking: true, resolution: { kind: 'ACKNOWLEDGE' }, detail: { values: [PdfUa1] } });
    expect(decide('a', Epub)?.resolved).toEqual(state({ accessibilityStandard: Wcag21Aa }));
    expect(decide('a', Epub)?.omitted).toEqual([
      expect.objectContaining({ value: PdfUa1, reason: 'INCOMPATIBLE_ADDITIONAL' }),
    ]);
    expect(decide('b', Html)?.resolved).toEqual(state({ accessibilityStandard: Wcag21Aa }));
    expect(decide('b', Html)?.acknowledgements).toEqual([
      findingOf('b', 'ACCESSIBILITY_ADDITIONAL_INCOMPATIBLE', Html)?.key,
    ]);
  });

  it.each([['08'], ['09']])(
    'never lets a standard hide List 196 %s: it is kept only once the loss of the status is acknowledged',
    (status) => {
      const { findingOf, decide } = reduce([
        product({
          ref: 'a',
          as: Epub,
          features: feature('09', status, ['Some images lack descriptions']) + a11y('82', '85'),
        }),
      ]);
      const loss = findingOf('a', 'ACCESSIBILITY_STATUS_NOT_REPRESENTED', Epub) as OnixAccessibilityFinding;

      expect(loss).toMatchObject({ blocking: true, resolution: { kind: 'ACKNOWLEDGE' } });
      expect(decide('a', Epub)?.acknowledgements).toEqual([loss.key]);
      expect(decide('a', Epub)?.resolved).toEqual(state({ accessibilityStandard: Wcag22Aa }));
    },
  );

  it('asks for no status acknowledgement where no standard is kept', () => {
    const { findingOf, decide } = reduce([
      product({ ref: 'a', as: Epub, features: a11y('09', '75') }),
      product({ ref: 'b', as: Epub, features: a11y('08', '81', '82', '85') }),
    ]);
    const primary = findingOf('b', 'ACCESSIBILITY_PRIMARY_CHOICE_REQUIRED', Epub) as OnixAccessibilityFinding;

    expect(findingOf('a', 'ACCESSIBILITY_STATUS_NOT_REPRESENTED', Epub)).toBeUndefined();
    expect(decide('a', Epub)?.resolved).toEqual(state({ accessibilityException: MicroEnterprises }));
    expect(decide('b', Epub, { [primary.key]: ONIX_ACCESSIBILITY_OMIT })?.acknowledgements).toEqual([]);
  });

  it('sets no additional standard once the publisher sets no primary one', () => {
    const { findingOf, decide } = reduce([product({ ref: 'a', as: Epub, features: a11y('81', '82', '86', '04') })]);
    const primary = findingOf('a', 'ACCESSIBILITY_PRIMARY_CHOICE_REQUIRED', Epub) as OnixAccessibilityFinding;
    const decision = decide('a', Epub, { [primary.key]: ONIX_ACCESSIBILITY_OMIT });

    expect(decision?.resolved).toEqual(EMPTY_ONIX_ACCESSIBILITY);
    expect(decision?.omitted.map(({ value, reason }) => [value, reason])).toEqual([
      [Wcag21Aaa, 'PUBLISHER_OMISSION'],
      [Wcag22Aaa, 'PUBLISHER_OMISSION'],
      [EpubA11Y11Aaa, 'NO_PRIMARY_STANDARD'],
    ]);
  });

  it('never resolves a state the database refuses, for any combination, type and answer', () => {
    const pool = ['81', '82', '85', '86', '03', '04', '05', '06', '75', '76', '08'];
    const subsets = [...Array(1 << pool.length).keys()]
      .filter((mask) => mask % 7 === 0 || mask < 64)
      .map((mask) => pool.filter((_, index) => mask & (1 << index)));
    let resolvedCount = 0;

    subsets.forEach((codes) => {
      const { plan, productKeyOf, byKey } = reduce([product({ ref: 'a', as: 'OPEN', features: a11y(...codes) })]);
      const productKey = productKeyOf('a');

      Object.values(plan.products[productKey].publications).forEach((reduction) => {
        const type = reduction?.publicationType as TPublicationType;
        const choices = (reduction?.findingKeys ?? [])
          .map((key) => byKey.get(key) as OnixAccessibilityFinding)
          .filter(({ resolution }) => resolution.kind !== 'NONE');
        // Every combination of answers, including none.
        const answerSets: Record<string, string>[] = [{}];

        choices.forEach((finding) => {
          const answers =
            finding.resolution.kind === 'CHOICE'
              ? finding.resolution.options.map(({ key }) => key)
              : [ONIX_ACCESSIBILITY_ACKNOWLEDGED];

          answerSets.splice(
            0,
            answerSets.length,
            ...answerSets.flatMap((set) => [set, ...answers.map((answer) => ({ ...set, [finding.key]: answer }))]),
          );
        });

        answerSets.forEach((answers) => {
          const decision = resolveOnixPublicationAccessibility(plan, productKey, type, byKey, answers);
          const resolved = decision?.resolved;

          if (resolved === null || resolved === undefined) return;

          resolvedCount += 1;
          expect(isRepresentableOnixAccessibility(type, resolved)).toBe(true);
          // Nothing is ever set that no explicit code combination asserts.
          (['accessibilityStandard', 'accessibilityAdditionalStandard', 'accessibilityException'] as const).forEach(
            (field) => {
              if (resolved[field] !== null) {
                expect(
                  decision?.sources.some((source) => source.field === field && source.value === resolved[field]),
                ).toBe(true);
              }
            },
          );
        });
      });
    });

    expect(resolvedCount).toBeGreaterThan(500);
  });
});

describe('manifestations', () => {
  it.each([Paperback, Hardback])(
    'keeps the type-09 facts of a %s as evidence and projects nothing, the report URL included',
    (type) => {
      const { findingOf, findingsOf, decide, productOf } = reduce([
        product({
          ref: 'a',
          as: type,
          features: a11y('81', '85', '05', '76') + feature('09', '96', ['https://example.org/a']),
        }),
      ]);
      const notProjected = findingOf('a', 'ACCESSIBILITY_NOT_PROJECTED', type) as OnixAccessibilityFinding;
      const decision = decide('a', type);

      expect(productOf('a').features).toHaveLength(5);
      expect(notProjected).toMatchObject({
        blocking: false,
        classification: 'TARGET_UNREPRESENTABLE',
        detail: { scope: 'PHYSICAL' },
      });
      expect(decision?.resolved).toEqual(EMPTY_ONIX_ACCESSIBILITY);
      expect(decision?.omitted.map(({ value, reason }) => [value, reason])).toEqual([
        [Wcag21Aa, 'PHYSICAL_PUBLICATION'],
        [PdfUa1, 'PHYSICAL_PUBLICATION'],
        [DisproportionateBurden, 'PHYSICAL_PUBLICATION'],
        ['https://example.org/a', 'PHYSICAL_PUBLICATION'],
      ]);
      // No choice or acknowledgement is asked for what a print Publication never holds.
      expect(codesOf(findingsOf('a', type).filter(({ publicationType }) => publicationType === type))).toEqual([
        'ACCESSIBILITY_NOT_PROJECTED',
      ]);
      expect(decision?.acknowledgements).toEqual([]);
      expect(decision?.pendingChoices).toEqual([]);
    },
  );

  it.each([Mp3, Wav])('keeps the standards of a %s as evidence and projects none', (type) => {
    const { findingOf, decide } = reduce([product({ ref: 'a', as: type, features: a11y('81', '85', '75') })]);

    expect(findingOf('a', 'ACCESSIBILITY_NOT_PROJECTED', type)).toMatchObject({
      blocking: false,
      detail: { scope: 'AUDIO' },
    });
    expect(decide('a', type)?.resolved).toEqual(EMPTY_ONIX_ACCESSIBILITY);
  });

  it.each([Mp3, Wav])('fails closed on the report URL of a %s: a gap, neither imported nor dropped', (type) => {
    const { findingOf, decide } = reduce([
      product({ ref: 'a', as: type, features: feature('09', '96', ['https://example.org/audio-a11y']) }),
    ]);
    const gap = findingOf('a', 'ACCESSIBILITY_AUDIO_REPORT_URL_UNRESOLVED', type) as OnixAccessibilityFinding;
    const decision = decide('a', type);

    expect(gap).toMatchObject({ classification: 'PREFLIGHT_GAP', blocking: true, resolution: { kind: 'NONE' } });
    expect(decision?.resolved).toBeNull();
    expect(decision?.gaps).toEqual([gap.key]);
    expect(decision?.omitted).toEqual([]);
  });

  it('reduces a Product whose format the file leaves open for every type it could become, each on its own keys', () => {
    const { plan, productKeyOf, findingOf } = reduce([
      product({ ref: 'a', as: 'OPEN', features: a11y('81', '85', '03') }),
    ]);
    const reductions = plan.products[productKeyOf('a')].publications;

    expect(Object.keys(reductions)).toEqual([Pdf, Epub, Html, Xml, Mobi, Azw3, Docx, FictionBook]);
    expect(reductions[Epub]?.additionalStandards.map(({ value }) => value)).toEqual([EpubA11Y10Aa]);
    expect(reductions[Pdf]?.incompatibleAdditionalStandards.map(({ value }) => value)).toEqual([EpubA11Y10Aa]);
    expect(findingOf('a', 'ACCESSIBILITY_ADDITIONAL_INCOMPATIBLE', Pdf)?.key).not.toBe(
      findingOf('a', 'ACCESSIBILITY_ADDITIONAL_INCOMPATIBLE', Html)?.key,
    );
  });

  it('keeps the facts of a package no Publication can hold, and reduces it for no type', () => {
    const { productOf, findingsOf } = reduce([
      product({ ref: 'a', as: Epub, composition: '10', features: a11y('81', '85', '00') }),
    ]);

    expect(productOf('a').features).toHaveLength(3);
    expect(productOf('a').publications).toEqual({});
    expect(codesOf(findingsOf('a'))).toEqual(['ACCESSIBILITY_FACT_NOT_REPRESENTED']);
  });

  it("reduces each Product's accessibility alone, never unioned across its Work", () => {
    const work =
      '<RelatedWork><WorkRelationCode>01</WorkRelationCode><WorkIdentifier><WorkIDType>06</WorkIDType><IDValue>10.1234/work</IDValue></WorkIdentifier></RelatedWork>';
    const { sourcePlan, decide } = reduce([
      product({ ref: 'epub', as: Epub, features: a11y('81', '85', '04', '85'), related: work }),
      product({
        ref: 'pdf',
        as: Pdf,
        features: a11y('82', '86') + feature('09', '96', ['https://example.org/pdf']),
        related: work,
      }),
    ]);

    expect(sourcePlan.groups).toHaveLength(1);
    expect(decide('epub', Epub)?.resolved).toEqual(
      state({ accessibilityStandard: Wcag21Aa, accessibilityAdditionalStandard: EpubA11Y11Aa }),
    );
    expect(decide('pdf', Pdf)?.resolved).toEqual(
      state({ accessibilityStandard: Wcag22Aaa, accessibilityReportUrl: 'https://example.org/pdf' }),
    );
  });
});

describe('answers', () => {
  it('offers only a choice option, or the acknowledgement of a loss', () => {
    const choice = { resolution: { kind: 'CHOICE', options: [{ key: Wcag21Aa, label: '' }] } } as const;
    const acknowledgement = { resolution: { kind: 'ACKNOWLEDGE' } } as const;
    const none = { resolution: { kind: 'NONE' } } as const;

    expect(isOfferedOnixAccessibilityAnswer(choice, Wcag21Aa)).toBe(true);
    expect(isOfferedOnixAccessibilityAnswer(choice, Wcag22Aa)).toBe(false);
    expect(isOfferedOnixAccessibilityAnswer(choice, ONIX_ACCESSIBILITY_ACKNOWLEDGED)).toBe(false);
    expect(isOfferedOnixAccessibilityAnswer(acknowledgement, ONIX_ACCESSIBILITY_ACKNOWLEDGED)).toBe(true);
    expect(isOfferedOnixAccessibilityAnswer(acknowledgement, 'yes')).toBe(false);
    expect(isOfferedOnixAccessibilityAnswer(none, ONIX_ACCESSIBILITY_ACKNOWLEDGED)).toBe(false);
  });

  it('never applies an answer a choice does not offer', () => {
    const { findingOf, decide } = reduce([product({ ref: 'a', as: Epub, features: a11y('81', '82', '85') })]);
    const choice = findingOf('a', 'ACCESSIBILITY_PRIMARY_CHOICE_REQUIRED', Epub) as OnixAccessibilityFinding;
    const decision = decide('a', Epub, { [choice.key]: Wcag22Aaa });

    expect(decision).toMatchObject({ resolved: null, staleChoices: [choice.key], pendingChoices: [] });
  });

  it('binds every finding to the exact facts it is about, so a changed file asks again', () => {
    const before = reduce([
      product({ ref: 'a', as: Epub, features: feature('09', '96', ['https://a.example/1', 'https://a.example/2']) }),
    ]);
    const same = reduce([
      product({ ref: 'a', as: Epub, features: feature('09', '96', ['https://a.example/1', 'https://a.example/2']) }),
    ]);
    const changed = reduce([
      product({ ref: 'a', as: Epub, features: feature('09', '96', ['https://a.example/1', 'https://a.example/3']) }),
    ]);
    const keyOf = (reduced: ReturnType<typeof reduce>) =>
      reduced.findingOf('a', 'ACCESSIBILITY_REPORT_URL_CHOICE_REQUIRED', Epub)?.key as string;

    expect(keyOf(same)).toBe(keyOf(before));
    expect(keyOf(changed)).not.toBe(keyOf(before));
    // The earlier answer names a finding the changed file does not have: nothing takes it.
    expect(changed.decide('a', Epub, { [keyOf(before)]: 'https://a.example/1' })?.resolved).toBeNull();
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});
