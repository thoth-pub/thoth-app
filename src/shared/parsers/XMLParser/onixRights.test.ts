import { parse } from '@5stones/onix';
import { describe, expect, it, vi } from 'vitest';

import type { OnixRightsFinding, OnixRightsPlan, OnixSourcePlan } from '../../types/onixPlanning';
import type { ExtendedONIXMessageRoot } from './interfaces';
import { planOnixSource } from './onixPlanning';
import {
  licenceIdentityOf,
  ONIX_SUPPORTED_LICENCES,
  reduceOnixRights,
  type ReduceOnixRightsOptions,
} from './onixRights';

/**
 * The canonical Product-rights reducer of thoth-app#211 (Stage A of #184), under ONIX-AUDIT-LICENCE-USAGE-01
 * (#179 proposal 5568901904, approval 5569159747), driven as the uploader drives it: a real ONIX document parsed by
 * `@5stones/onix`, planned by #182, then reduced. Every fixture is minimal and synthetic.
 */

const NAMESPACES = {
  '3.0': 'http://ns.editeur.org/onix/3.0/reference',
  '3.1': 'http://ns.editeur.org/onix/3.1/reference',
} as const;

const ISBN_A = '9781800000018';
const ISBN_B = '9781800000025';
const ISBN_C = '9781800000032';
const ISBN_D = '9781800000049';

const FORMS = {
  HARDBACK: '<ProductComposition>00</ProductComposition><ProductForm>BB</ProductForm>',
  PAPERBACK: '<ProductComposition>00</ProductComposition><ProductForm>BC</ProductForm>',
  EPUB: '<ProductComposition>00</ProductComposition><ProductForm>EA</ProductForm><ProductFormDetail>E101</ProductFormDetail>',
  PDF: '<ProductComposition>00</ProductComposition><ProductForm>EA</ProductForm><ProductFormDetail>E107</ProductFormDetail>',
  AUDIO:
    '<ProductComposition>00</ProductComposition><ProductForm>AJ</ProductForm><ProductFormDetail>A103</ProductFormDetail>',
  CD_ROM: '<ProductComposition>00</ProductComposition><ProductForm>DB</ProductForm>',
  UNDEFINED: '<ProductComposition>00</ProductComposition><ProductForm>00</ProductForm>',
  PACKAGE: '<ProductComposition>10</ProductComposition><ProductForm>SA</ProductForm>',
} as const;

const TITLE =
  '<TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>01</TitleElementLevel><TitleText>A Work</TitleText></TitleElement></TitleDetail>';

type ProductSpec = {
  readonly ref?: string;
  readonly isbn?: string;
  readonly form?: string;
  /** Product rights, in the DescriptiveDetail after the form. */
  readonly rights?: string;
  readonly content?: string;
  readonly collateral?: string;
  readonly supply?: string;
  /** Whether the Product manifests the one Work every other grouped Product manifests. */
  readonly grouped?: boolean;
};

const productXml = ({
  ref = 'r1',
  isbn = ISBN_A,
  form = FORMS.EPUB,
  rights = '',
  content = '',
  collateral = '',
  supply = '',
  grouped = false,
}: ProductSpec = {}) =>
  `<Product><RecordReference>${ref}</RecordReference><NotificationType>03</NotificationType>` +
  `<ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>${isbn}</IDValue></ProductIdentifier>` +
  `<DescriptiveDetail>${form}${rights}${TITLE}</DescriptiveDetail>` +
  (collateral ? `<CollateralDetail>${collateral}</CollateralDetail>` : '') +
  (content ? `<ContentDetail>${content}</ContentDetail>` : '') +
  '<PublishingDetail><PublishingStatus>02</PublishingStatus></PublishingDetail>' +
  (grouped
    ? '<RelatedMaterial><RelatedWork><WorkRelationCode>01</WorkRelationCode><WorkIdentifier><WorkIDType>06</WorkIDType><IDValue>10.14296/work</IDValue></WorkIdentifier></RelatedWork></RelatedMaterial>'
    : '') +
  (supply ? `<ProductSupply><SupplyDetail>${supply}</SupplyDetail></ProductSupply>` : '') +
  '</Product>';

const protection = (...codes: string[]) =>
  codes.map((code) => `<EpubTechnicalProtection>${code}</EpubTechnicalProtection>`).join('');

const usage = (type: string, status: string, ...limits: (readonly [string, string])[]) =>
  `<EpubUsageConstraint><EpubUsageType>${type}</EpubUsageType><EpubUsageStatus>${status}</EpubUsageStatus>` +
  limits
    .map(
      ([quantity, unit]) =>
        `<EpubUsageLimit><Quantity>${quantity}</Quantity><EpubUsageUnit>${unit}</EpubUsageUnit></EpubUsageLimit>`,
    )
    .join('') +
  '</EpubUsageConstraint>';

const expression = (type: string, link: string, typeName = '') =>
  `<EpubLicenseExpression><EpubLicenseExpressionType>${type}</EpubLicenseExpressionType>` +
  (typeName ? `<EpubLicenseExpressionTypeName>${typeName}</EpubLicenseExpressionTypeName>` : '') +
  `<EpubLicenseExpressionLink>${link}</EpubLicenseExpressionLink></EpubLicenseExpression>`;

type LicenceSpec = {
  readonly names?: readonly string[];
  readonly expressions?: readonly string[];
  readonly dates?: readonly (readonly [string, string])[];
};

const licence = ({ names = ['A licence'], expressions = [], dates = [] }: LicenceSpec = {}) =>
  '<EpubLicense>' +
  names.map((name) => `<EpubLicenseName>${name}</EpubLicenseName>`).join('') +
  expressions.join('') +
  dates
    .map(
      ([role, date]) =>
        `<EpubLicenseDate><EpubLicenseDateRole>${role}</EpubLicenseDateRole><Date dateformat="00">${date}</Date></EpubLicenseDate>`,
    )
    .join('') +
  '</EpubLicense>';

const CC_BY_NC_ND_LEGALCODE = 'https://creativecommons.org/licenses/by-nc-nd/4.0/legalcode';

type Reduced = {
  readonly root: ExtendedONIXMessageRoot;
  readonly sourcePlan: OnixSourcePlan;
  readonly rights: OnixRightsPlan;
};

const reduce = (
  products: string[],
  { release = '3.0', options = {} }: { release?: '3.0' | '3.1'; options?: ReduceOnixRightsOptions } = {},
): Reduced => {
  const root = parse(
    `<ONIXMessage release="${release}" xmlns="${NAMESPACES[release]}">` +
      '<Header><Sender><SenderName>Example Press</SenderName></Sender><SentDateTime>20260916T1200</SentDateTime></Header>' +
      `${products.join('')}</ONIXMessage>`,
  ) as ExtendedONIXMessageRoot;
  const sourcePlan = planOnixSource(root);

  return { root, sourcePlan, rights: reduceOnixRights(root, sourcePlan, options) };
};

/** The one Product of a single-Product fixture. */
const onlyProduct = ({ sourcePlan, rights }: Reduced) => {
  expect(sourcePlan.products).toHaveLength(1);

  return rights.products[sourcePlan.products[0].productKey];
};

const findingsOf = ({ rights }: Reduced, code?: OnixRightsFinding['code']) =>
  rights.findings.filter((finding) => code === undefined || finding.code === code);

const codesOf = (reduced: Reduced) =>
  findingsOf(reduced).map(({ code, classification, blocking }) => [code, classification, blocking]);

const DESCRIPTIVE_1 = '/ONIXMessage[1]/Product[1]/DescriptiveDetail[1]';

const CANONICAL = {
  CC_BY_4_0: 'https://creativecommons.org/licenses/by/4.0/',
  CC_BY_SA_4_0: 'https://creativecommons.org/licenses/by-sa/4.0/',
  CC_BY_ND_4_0: 'https://creativecommons.org/licenses/by-nd/4.0/',
  CC_BY_NC_4_0: 'https://creativecommons.org/licenses/by-nc/4.0/',
  CC_BY_NC_SA_4_0: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
  CC_BY_NC_ND_4_0: 'https://creativecommons.org/licenses/by-nc-nd/4.0/',
  CC0_1_0: 'https://creativecommons.org/publicdomain/zero/1.0/',
  PDM_1_0: 'https://creativecommons.org/publicdomain/mark/1.0/',
} as const;

describe('the supported target licence registry (rule 16)', () => {
  it('holds exactly the eight approved identities, each with the canonical URL Thoth stores', () => {
    expect(ONIX_SUPPORTED_LICENCES.map(({ identity, url }) => [identity, url])).toEqual(Object.entries(CANONICAL));
  });

  it.each(Object.entries(CANONICAL))('names %s by its exact canonical URL', (identity, url) => {
    expect(licenceIdentityOf(url)).toBe(identity);
  });

  it('is not the legacy licence option list: an older Creative Commons version or a port names nothing', () => {
    expect(licenceIdentityOf('https://creativecommons.org/licenses/by/3.0/')).toBeNull();
    expect(licenceIdentityOf('https://creativecommons.org/licenses/by-nc-nd/2.5/')).toBeNull();
    expect(licenceIdentityOf('https://creativecommons.org/licenses/by/3.0/de/')).toBeNull();
    expect(licenceIdentityOf('')).toBeNull();
  });
});

describe('explicit representation aliases (rules 26-28)', () => {
  it.each([
    ['legalcode', 'https://creativecommons.org/licenses/by-nc-nd/4.0/legalcode', 'CC_BY_NC_ND_4_0'],
    ['deed', 'https://creativecommons.org/licenses/by/4.0/deed', 'CC_BY_4_0'],
    ['a language legalcode', 'https://creativecommons.org/licenses/by-sa/4.0/legalcode.en', 'CC_BY_SA_4_0'],
    ['a language deed', 'https://creativecommons.org/licenses/by-nd/4.0/deed.fr', 'CC_BY_ND_4_0'],
    ['a script and region deed', 'https://creativecommons.org/licenses/by-nc/4.0/deed.zh-Hant-TW', 'CC_BY_NC_4_0'],
    ['a region legalcode', 'https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode.pt-BR', 'CC_BY_NC_SA_4_0'],
  ])('reads %s of a Creative Commons 4.0 licence as that licence', (_case, link, identity) => {
    expect(licenceIdentityOf(link)).toBe(identity);
  });

  it('reads surrounding whitespace the way an XML anyURI value collapses it, and nothing else about the spelling', () => {
    expect(licenceIdentityOf('  https://creativecommons.org/licenses/by/4.0/legalcode\n')).toBe('CC_BY_4_0');
    expect(licenceIdentityOf('https://creativecommons.org/licenses/by /4.0/')).toBeNull();
  });

  it('gives CC0 and the Public Domain Mark no alias: only their canonical URL is verified', () => {
    expect(licenceIdentityOf('https://creativecommons.org/publicdomain/zero/1.0/legalcode')).toBeNull();
    expect(licenceIdentityOf('https://creativecommons.org/publicdomain/zero/1.0/legalcode.en')).toBeNull();
    expect(licenceIdentityOf('https://creativecommons.org/publicdomain/mark/1.0/deed.en')).toBeNull();
  });

  it.each([
    ['another scheme', 'http://creativecommons.org/licenses/by/4.0/'],
    ['another host', 'https://www.creativecommons.org/licenses/by/4.0/'],
    ['a lookalike domain', 'https://creativecommons.org.example.com/licenses/by/4.0/'],
    ['the URL inside another URL', 'https://example.com/https://creativecommons.org/licenses/by/4.0/'],
    ['the URL as a query value', 'https://example.com/?licence=https://creativecommons.org/licenses/by/4.0/'],
    ['a capitalised spelling', 'HTTPS://CREATIVECOMMONS.ORG/licenses/by/4.0/'],
    ['a missing trailing slash', 'https://creativecommons.org/licenses/by/4.0'],
    ['a deceptive continuation', 'https://creativecommons.org/licenses/by/4.0/not-a-license-page'],
    ['a longer token', 'https://creativecommons.org/licenses/by/4.0/legalcodes'],
    ['a further path segment', 'https://creativecommons.org/licenses/by/4.0/legalcode/extra'],
    ['a query', 'https://creativecommons.org/licenses/by/4.0/?ref=onix'],
    ['a fragment', 'https://creativecommons.org/licenses/by/4.0/#legalcode'],
    ['a punctuation-only language', 'https://creativecommons.org/licenses/by/4.0/legalcode.---'],
    ['arbitrary text as a language', 'https://creativecommons.org/licenses/by/4.0/legalcode.not-a-license-page'],
    ['an unknown licence family', 'https://creativecommons.org/licenses/by-nc-nd-sa/4.0/'],
    ['a bare representation', 'legalcode.en'],
    ['an unknown licence', 'https://example.com/licenses/unknown'],
  ])('names nothing for %s', (_case, link) => {
    expect(licenceIdentityOf(link)).toBeNull();
  });
});

describe('Product technical protection (rules 45-55)', () => {
  it('reads an absent EpubTechnicalProtection as unknown, never as code 00, and raises nothing about it', () => {
    const reduced = reduce([productXml()]);

    expect(onlyProduct(reduced)).toMatchObject({ technicalProtection: [], technicalProtectionState: 'UNKNOWN' });
    expect(findingsOf(reduced)).toEqual([]);
  });

  it('reads an explicit 00 as the stated absence of protection, and raises nothing about it', () => {
    const reduced = reduce([productXml({ rights: protection('00') })]);

    expect(onlyProduct(reduced)).toMatchObject({
      technicalProtection: [
        {
          code: '00',
          path: `${DESCRIPTIVE_1}/EpubTechnicalProtection[1]`,
          sourcePath: `${DESCRIPTIVE_1}/EpubTechnicalProtection[1]`,
        },
      ],
      technicalProtectionState: 'NONE',
    });
    expect(findingsOf(reduced)).toEqual([]);
  });

  it('keeps every non-zero protection, uncollapsed, and blocks: Thoth cannot say a Publication carries DRM', () => {
    const reduced = reduce([productXml({ rights: protection('01', '03', '06') })]);

    expect(onlyProduct(reduced)).toMatchObject({ technicalProtectionState: 'PROTECTED' });
    expect(onlyProduct(reduced).technicalProtection.map(({ code }) => code)).toEqual(['01', '03', '06']);
    expect(codesOf(reduced)).toEqual([['RIGHTS_TECHNICAL_PROTECTION_UNREPRESENTABLE', 'TARGET_UNREPRESENTABLE', true]]);
    expect(findingsOf(reduced)[0]).toMatchObject({
      detail: { codes: ['01', '03', '06'] },
      locations: [1, 2, 3].map((position) => ({
        path: `${DESCRIPTIVE_1}/EpubTechnicalProtection[${position}]`,
        sourcePath: `${DESCRIPTIVE_1}/EpubTechnicalProtection[${position}]`,
      })),
    });
  });

  it('blocks 00 stated beside a protection as a contradiction, whichever comes first', () => {
    const noneFirst = reduce([productXml({ rights: protection('00', '03') })]);
    const noneLast = reduce([productXml({ rights: protection('06', '00') })]);

    [noneFirst, noneLast].forEach((reduced) => {
      expect(onlyProduct(reduced).technicalProtectionState).toBe('CONTRADICTORY');
      expect(codesOf(reduced)).toEqual([['RIGHTS_TECHNICAL_PROTECTION_CONTRADICTION', 'SOURCE_CONFLICT', true]]);
    });
  });
});

describe('Product usage constraints (rules 56-82)', () => {
  it('keeps every constraint and limit in source order, with its type, status, quantity, unit and location', () => {
    const reduced = reduce([
      productXml({ rights: usage('02', '02', ['10', '04'], ['5', '05']) + usage('11', '03') + usage('00', '01') }),
    ]);

    expect(onlyProduct(reduced).usageConstraints).toEqual([
      {
        type: '02',
        status: '02',
        path: `${DESCRIPTIVE_1}/EpubUsageConstraint[1]`,
        sourcePath: `${DESCRIPTIVE_1}/EpubUsageConstraint[1]`,
        limits: [
          {
            quantity: '10',
            unit: '04',
            path: `${DESCRIPTIVE_1}/EpubUsageConstraint[1]/EpubUsageLimit[1]`,
            sourcePath: `${DESCRIPTIVE_1}/EpubUsageConstraint[1]/EpubUsageLimit[1]`,
          },
          {
            quantity: '5',
            unit: '05',
            path: `${DESCRIPTIVE_1}/EpubUsageConstraint[1]/EpubUsageLimit[2]`,
            sourcePath: `${DESCRIPTIVE_1}/EpubUsageConstraint[1]/EpubUsageLimit[2]`,
          },
        ],
      },
      {
        type: '11',
        status: '03',
        path: `${DESCRIPTIVE_1}/EpubUsageConstraint[2]`,
        sourcePath: `${DESCRIPTIVE_1}/EpubUsageConstraint[2]`,
        limits: [],
      },
      {
        type: '00',
        status: '01',
        path: `${DESCRIPTIVE_1}/EpubUsageConstraint[3]`,
        sourcePath: `${DESCRIPTIVE_1}/EpubUsageConstraint[3]`,
        limits: [],
      },
    ]);
  });

  it.each([
    ['print limited to pages', usage('02', '02', ['10', '04'])],
    ['copy and paste prohibited', usage('03', '03')],
    ['sharing permitted unlimited', usage('04', '01')],
    ['text to speech prohibited', usage('05', '03')],
    ['lending permitted', usage('06', '01')],
    ['a time-limited licence', usage('07', '02', ['30', '09'])],
    ['a multi-user licence', usage('09', '02', ['3', '07'])],
    ['text and data mining reserved', usage('11', '03')],
    ['AI text and data mining prohibited', usage('13', '03')],
    ['library loan permitted', usage('16', '01')],
  ])('blocks %s rather than letting a material constraint disappear', (_case, constraint) => {
    const reduced = reduce([productXml({ rights: constraint })]);

    expect(codesOf(reduced)).toEqual([['RIGHTS_USAGE_CONSTRAINT_UNREPRESENTABLE', 'TARGET_UNREPRESENTABLE', true]]);
  });

  it('keeps "no constraints" as a fact with no finding, and never as evidence of an open licence', () => {
    const reduced = reduce([productXml({ rights: usage('00', '01') })]);

    expect(findingsOf(reduced)).toEqual([]);
    expect(onlyProduct(reduced).licence).toEqual({ kind: 'SILENT' });
  });

  it('discloses a coherent preview constraint as not represented without blocking', () => {
    const reduced = reduce([productXml({ rights: usage('01', '02', ['10', '05']) + usage('10', '03') })]);

    expect(codesOf(reduced)).toEqual([
      ['RIGHTS_USAGE_CONSTRAINT_NOT_REPRESENTED', 'TARGET_UNREPRESENTABLE', false],
      ['RIGHTS_USAGE_CONSTRAINT_NOT_REPRESENTED', 'TARGET_UNREPRESENTABLE', false],
    ]);
  });

  it.each([
    ['a limit permitted "subject to limit" without one', usage('01', '02')],
    ['an unlimited permission carrying a limit', usage('01', '01', ['1', '01'])],
    ['"no constraints" prohibited', usage('00', '03')],
    ['"no constraints" carrying a limit', usage('00', '01', ['1', '01'])],
  ])('blocks %s instead of reading it into something coherent', (_case, constraint) => {
    const reduced = reduce([productXml({ rights: constraint })]);

    expect(codesOf(reduced)).toEqual([['RIGHTS_USAGE_CONSTRAINT_UNREPRESENTABLE', 'TARGET_UNREPRESENTABLE', true]]);
  });

  it('blocks repeats of one usage type that disagree, never taking the first', () => {
    const reduced = reduce([productXml({ rights: usage('01', '01') + usage('01', '03') })]);

    expect(codesOf(reduced)).toContainEqual(['RIGHTS_USAGE_CONSTRAINT_CONFLICT', 'SOURCE_CONFLICT', true]);
    expect(findingsOf(reduced, 'RIGHTS_USAGE_CONSTRAINT_CONFLICT')[0].detail).toEqual({
      type: '01',
      statuses: ['01', '03'],
    });
  });
});

describe('Product licences (rules 22-44)', () => {
  it('reads nothing into an absent EpubLicense: no licence is expressed, which is not All Rights Reserved', () => {
    const reduced = reduce([productXml()]);

    expect(onlyProduct(reduced)).toMatchObject({ licences: [], licence: { kind: 'SILENT' }, dated: false });
  });

  it('keeps every name, expression and its type and link together, and resolves the intrinsic licence by link', () => {
    const reduced = reduce([
      productXml({
        rights: licence({
          names: ['Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International License'],
          expressions: [expression('01', CC_BY_NC_ND_LEGALCODE)],
        }),
      }),
    ]);

    expect(onlyProduct(reduced)).toEqual(
      expect.objectContaining({
        licences: [
          {
            path: `${DESCRIPTIVE_1}/EpubLicense[1]`,
            sourcePath: `${DESCRIPTIVE_1}/EpubLicense[1]`,
            names: [
              {
                name: 'Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International License',
                language: null,
                path: `${DESCRIPTIVE_1}/EpubLicense[1]/EpubLicenseName[1]`,
                sourcePath: `${DESCRIPTIVE_1}/EpubLicense[1]/EpubLicenseName[1]`,
              },
            ],
            expressions: [
              {
                type: '01',
                typeName: null,
                link: CC_BY_NC_ND_LEGALCODE,
                role: 'INTRINSIC',
                identity: 'CC_BY_NC_ND_4_0',
                path: `${DESCRIPTIVE_1}/EpubLicense[1]/EpubLicenseExpression[1]`,
                sourcePath: `${DESCRIPTIVE_1}/EpubLicense[1]/EpubLicenseExpression[1]`,
              },
            ],
            dates: [],
          },
        ],
        licence: {
          kind: 'SUPPORTED',
          identity: 'CC_BY_NC_ND_4_0',
          url: 'https://creativecommons.org/licenses/by-nc-nd/4.0/',
        },
        dated: false,
      }),
    );
    expect(findingsOf(reduced)).toEqual([]);
  });

  it('corroborates intrinsic expressions that name one licence, whatever representation each uses', () => {
    const reduced = reduce([
      productXml({
        rights: licence({
          expressions: [
            expression('02', 'https://creativecommons.org/licenses/by/4.0/'),
            expression('01', 'https://creativecommons.org/licenses/by/4.0/deed.en'),
          ],
        }),
      }),
    ]);

    expect(onlyProduct(reduced).licence).toEqual({
      kind: 'SUPPORTED',
      identity: 'CC_BY_4_0',
      url: 'https://creativecommons.org/licenses/by/4.0/',
    });
    expect(findingsOf(reduced)).toEqual([]);
  });

  it('blocks intrinsic expressions that name different licences, in either order, never taking the first', () => {
    const [byFirst, ncFirst] = [
      [
        expression('02', 'https://creativecommons.org/licenses/by/4.0/'),
        expression('01', 'https://creativecommons.org/licenses/by-nc/4.0/'),
      ],
      [
        expression('01', 'https://creativecommons.org/licenses/by-nc/4.0/'),
        expression('02', 'https://creativecommons.org/licenses/by/4.0/'),
      ],
    ].map((expressions) => reduce([productXml({ rights: licence({ expressions }) })]));

    [byFirst, ncFirst].forEach((reduced) => {
      expect(onlyProduct(reduced).licence).toEqual({ kind: 'CONFLICT', identities: ['CC_BY_4_0', 'CC_BY_NC_4_0'] });
      expect(codesOf(reduced)).toEqual([['RIGHTS_LICENCE_EXPRESSION_CONFLICT', 'SOURCE_CONFLICT', true]]);
    });
  });

  it('never identifies a licence by its name, alone or beside a link naming another licence', () => {
    const nameOnly = reduce([productXml({ rights: licence({ names: ['CC BY 4.0'] }) })]);
    const misleading = reduce([
      productXml({
        rights: licence({
          names: ['Creative Commons Attribution 4.0 (CC BY)'],
          expressions: [expression('01', 'https://creativecommons.org/licenses/by-nc/4.0/')],
        }),
      }),
    ]);

    expect(onlyProduct(nameOnly).licence).toEqual({ kind: 'UNSUPPORTED' });
    expect(codesOf(nameOnly)).toEqual([['RIGHTS_LICENCE_UNIDENTIFIED', 'TARGET_UNREPRESENTABLE', true]]);
    expect(onlyProduct(misleading).licence).toMatchObject({ kind: 'SUPPORTED', identity: 'CC_BY_NC_4_0' });
  });

  it('keeps a valid proprietary licence as a source fact Thoth cannot hold: blocking, never source-invalid', () => {
    const eula = 'https://publisher.example/ebook-licence-agreement.html';
    const reduced = reduce([
      productXml({ rights: licence({ names: ['Standard e-book EULA'], expressions: [expression('01', eula)] }) }),
    ]);

    expect(onlyProduct(reduced).licence).toEqual({ kind: 'UNSUPPORTED' });
    expect(onlyProduct(reduced).licences[0].expressions[0]).toMatchObject({
      role: 'INTRINSIC',
      link: eula,
      identity: null,
    });
    expect(codesOf(reduced)).toEqual([['RIGHTS_LICENCE_UNSUPPORTED', 'TARGET_UNREPRESENTABLE', true]]);
    expect(findingsOf(reduced)[0].detail).toEqual({ type: '01', link: eula });
    expect(findingsOf(reduced).map(({ classification }) => classification)).not.toContain('SOURCE_INVALID');
  });

  it('keeps additional licences and policies apart, never promotes one, and fetches nothing', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const additional = [
      expression('03', 'https://creativecommons.org/licenses/by/4.0/'),
      expression('04', 'https://creativecommons.org/licenses/by-sa/4.0/'),
      expression('21', 'https://publisher.example/odrl/additional.json'),
    ];
    const policies = [
      expression('10', 'https://publisher.example/onix-pl/licence.xml'),
      expression('20', 'https://publisher.example/odrl/policy.json', 'ODRL 2.2'),
    ];
    const beside = reduce([
      productXml({
        rights: licence({
          expressions: [
            expression('01', 'https://creativecommons.org/licenses/by-nc/4.0/'),
            ...additional,
            ...policies,
          ],
        }),
      }),
    ]);
    const alone = reduce([productXml({ rights: licence({ expressions: [...additional, ...policies] }) })]);

    expect(onlyProduct(beside).licence).toMatchObject({ kind: 'SUPPORTED', identity: 'CC_BY_NC_4_0' });
    expect(
      onlyProduct(beside).licences[0].expressions.map(({ type, role, identity }) => [type, role, identity]),
    ).toEqual([
      ['01', 'INTRINSIC', 'CC_BY_NC_4_0'],
      ['03', 'ADDITIONAL', null],
      ['04', 'ADDITIONAL', null],
      ['21', 'ADDITIONAL', null],
      ['10', 'POLICY', null],
      ['20', 'POLICY', null],
    ]);
    expect(onlyProduct(beside).licences[0].expressions[5].typeName).toBe('ODRL 2.2');
    expect(codesOf(beside)).toEqual([
      ['RIGHTS_ADDITIONAL_LICENCE_NOT_REPRESENTED', 'TARGET_UNREPRESENTABLE', false],
      ['RIGHTS_ADDITIONAL_LICENCE_NOT_REPRESENTED', 'TARGET_UNREPRESENTABLE', false],
      ['RIGHTS_ADDITIONAL_LICENCE_NOT_REPRESENTED', 'TARGET_UNREPRESENTABLE', false],
      ['RIGHTS_POLICY_NOT_REPRESENTED', 'TARGET_UNREPRESENTABLE', false],
      ['RIGHTS_POLICY_NOT_REPRESENTED', 'TARGET_UNREPRESENTABLE', false],
    ]);
    // With no intrinsic expression, the licence it describes is not identified by any of them.
    expect(onlyProduct(alone).licence).toEqual({ kind: 'UNSUPPORTED' });
    expect(codesOf(alone)).toContainEqual(['RIGHTS_LICENCE_UNIDENTIFIED', 'TARGET_UNREPRESENTABLE', true]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fails closed on an expression type List 218 does not define, reading nothing from its link', () => {
    const reduced = reduce([
      productXml({
        rights: licence({ expressions: [expression('99', 'https://creativecommons.org/licenses/by/4.0/')] }),
      }),
    ]);

    expect(onlyProduct(reduced).licence).toEqual({ kind: 'UNSUPPORTED' });
    expect(onlyProduct(reduced).licences[0].expressions[0]).toMatchObject({ role: 'UNRECOGNISED', identity: null });
    expect(codesOf(reduced)).toEqual([
      ['RIGHTS_LICENCE_UNIDENTIFIED', 'TARGET_UNREPRESENTABLE', true],
      ['RIGHTS_LICENCE_EXPRESSION_UNRECOGNISED', 'PREFLIGHT_GAP', true],
    ]);
  });

  it('keeps every licence date with its role and format, and blocks a permanent licence it would make undated', () => {
    const reduced = reduce(
      [
        productXml({
          rights: licence({
            expressions: [expression('01', 'https://creativecommons.org/licenses/by/4.0/')],
            dates: [
              ['14', '20260101'],
              ['15', '20301231'],
            ],
          }),
        }),
      ],
      { release: '3.1' },
    );

    expect(onlyProduct(reduced)).toMatchObject({ dated: true, licence: { kind: 'SUPPORTED', identity: 'CC_BY_4_0' } });
    expect(onlyProduct(reduced).licences[0].dates).toEqual([
      {
        role: '14',
        date: '20260101',
        dateFormat: '00',
        path: `${DESCRIPTIVE_1}/EpubLicense[1]/EpubLicenseDate[1]`,
        sourcePath: `${DESCRIPTIVE_1}/EpubLicense[1]/EpubLicenseDate[1]`,
      },
      {
        role: '15',
        date: '20301231',
        dateFormat: '00',
        path: `${DESCRIPTIVE_1}/EpubLicense[1]/EpubLicenseDate[2]`,
        sourcePath: `${DESCRIPTIVE_1}/EpubLicense[1]/EpubLicenseDate[2]`,
      },
    ]);
    expect(codesOf(reduced)).toEqual([['RIGHTS_LICENCE_DATED', 'TARGET_INPUT_REQUIRED', true]]);
  });

  it('names the submitted spelling of every fact through the provenance it is given', () => {
    const reduced = reduce([productXml({ rights: protection('03') })], {
      options: {
        provenance: { sourcePathOf: (path: string) => path.replace('/ONIXMessage[1]', '/ONIXmessage[1]') } as never,
      },
    });

    expect(onlyProduct(reduced).technicalProtection[0].sourcePath).toBe(
      '/ONIXmessage[1]/Product[1]/DescriptiveDetail[1]/EpubTechnicalProtection[1]',
    );
    expect(findingsOf(reduced)[0].locations[0].sourcePath).toBe(
      '/ONIXmessage[1]/Product[1]/DescriptiveDetail[1]/EpubTechnicalProtection[1]',
    );
  });
});

describe('rights this stage does not reduce (#211 Stage-A boundary)', () => {
  const PRODUCT_1 = '/ONIXMessage[1]/Product[1]';
  const chapter = (rights: string) =>
    `<ContentItem><LevelSequenceNumber>1</LevelSequenceNumber><TextItem><TextItemType>03</TextItemType></TextItem>${rights}</ContentItem>`;
  const text = (rights: string) =>
    `<TextContent><TextType>02</TextType><ContentAudience>00</ContentAudience><Text>About</Text>${rights}</TextContent>`;
  const resource = (rights: string) =>
    '<SupportingResource><ResourceContentType>01</ResourceContentType><ContentAudience>00</ContentAudience><ResourceMode>03</ResourceMode>' +
    `<ResourceVersion><ResourceForm>02</ResourceForm><ResourceLink>https://publisher.example/cover.jpg</ResourceLink>${rights}</ResourceVersion></SupportingResource>`;
  const price = (rights: string) =>
    '<Supplier><SupplierRole>01</SupplierRole><SupplierName>A Supplier</SupplierName></Supplier><ProductAvailability>20</ProductAvailability>' +
    `<Price><PriceType>02</PriceType>${rights}<PriceAmount>10.00</PriceAmount><CurrencyCode>GBP</CurrencyCode></Price>`;
  const cc = licence({ expressions: [expression('02', 'https://creativecommons.org/licenses/by/4.0/')] });

  it.each([
    [
      'a ContentItem licence',
      { content: chapter(cc) },
      `${PRODUCT_1}/ContentDetail[1]/ContentItem[1]/EpubLicense[1]`,
      'CONTENT_ITEM',
      'EpubLicense',
    ],
    [
      'a ContentItem usage constraint',
      { content: chapter(usage('05', '03')) },
      `${PRODUCT_1}/ContentDetail[1]/ContentItem[1]/EpubUsageConstraint[1]`,
      'CONTENT_ITEM',
      'EpubUsageConstraint',
    ],
    [
      'a supporting text licence',
      { collateral: text(licence()) },
      `${PRODUCT_1}/CollateralDetail[1]/TextContent[1]/EpubLicense[1]`,
      'TEXT_CONTENT',
      'EpubLicense',
    ],
    [
      'a supporting resource constraint',
      { collateral: resource(usage('04', '03')) },
      `${PRODUCT_1}/CollateralDetail[1]/SupportingResource[1]/ResourceVersion[1]/EpubUsageConstraint[1]`,
      'RESOURCE_VERSION',
      'EpubUsageConstraint',
    ],
    [
      "a licence on a ContentItem's own supporting text",
      { content: chapter(text(cc)) },
      `${PRODUCT_1}/ContentDetail[1]/ContentItem[1]/TextContent[1]/EpubLicense[1]`,
      'TEXT_CONTENT',
      'EpubLicense',
    ],
    [
      "a constraint on a ContentItem's own supporting resource",
      { content: chapter(resource(usage('11', '03'))) },
      `${PRODUCT_1}/ContentDetail[1]/ContentItem[1]/SupportingResource[1]/ResourceVersion[1]/EpubUsageConstraint[1]`,
      'RESOURCE_VERSION',
      'EpubUsageConstraint',
    ],
    [
      "a price's technical protection",
      { supply: price(protection('03')) },
      `${PRODUCT_1}/ProductSupply[1]/SupplyDetail[1]/Price[1]/EpubTechnicalProtection[1]`,
      'PRICE',
      'EpubTechnicalProtection',
    ],
    [
      "a price's licence",
      { supply: price(cc) },
      `${PRODUCT_1}/ProductSupply[1]/SupplyDetail[1]/Price[1]/EpubLicense[1]`,
      'PRICE',
      'EpubLicense',
    ],
  ])(
    'keeps %s where it is stated and blocks, never floating it to the Product or the Work',
    (_case, spec, path, scope, element) => {
      const reduced = reduce([productXml(spec)], { release: '3.1' });

      expect(onlyProduct(reduced)).toMatchObject({
        licences: [],
        technicalProtection: [],
        usageConstraints: [],
        licence: { kind: 'SILENT' },
        deferredScopes: [{ path, sourcePath: path }],
      });
      expect(codesOf(reduced)).toEqual([['RIGHTS_SCOPE_DEFERRED', 'PREFLIGHT_GAP', true]]);
      expect(findingsOf(reduced)[0].detail).toEqual({ scope, element });
      expect(reduced.rights.groups[reduced.sourcePlan.groups[0].groupKey].licence).toEqual({ kind: 'UNSET' });
    },
  );
});

describe('the grouped Work licence (rules 83-92)', () => {
  const ccLicence = (link: string, name = 'A Creative Commons licence') =>
    licence({ names: [name], expressions: [expression('01', link)] });

  const grouped = (specs: ProductSpec[]) =>
    reduce(
      specs.map((spec, index) =>
        productXml({ ref: `r${index + 1}`, isbn: [ISBN_A, ISBN_B, ISBN_C, ISBN_D][index], grouped: true, ...spec }),
      ),
    );

  const groupOf = (reduced: Reduced) => {
    expect(reduced.sourcePlan.groups).toHaveLength(1);

    return reduced.rights.groups[reduced.sourcePlan.groups[0].groupKey];
  };

  const keyOf = (reduced: Reduced, ref: string) =>
    reduced.sourcePlan.records.find(({ recordReference }) => recordReference === ref)?.productKey as string;

  it('takes the licence the University of London Press shape states: physical manifestations neutral, digital ones agreeing', () => {
    const digitalRights =
      protection('00') +
      ccLicence(
        CC_BY_NC_ND_LEGALCODE,
        'Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International License',
      );
    const reduced = grouped([
      { form: FORMS.HARDBACK },
      { form: FORMS.PAPERBACK },
      { form: FORMS.EPUB, rights: digitalRights },
      { form: FORMS.PDF, rights: digitalRights },
    ]);

    expect(groupOf(reduced).licence).toEqual({
      kind: 'SET_SUPPORTED_LICENSE',
      identity: 'CC_BY_NC_ND_4_0',
      url: 'https://creativecommons.org/licenses/by-nc-nd/4.0/',
      productKeys: [keyOf(reduced, 'r3'), keyOf(reduced, 'r4')].sort(),
      locations: [3, 4].map((product) => {
        const path = `/ONIXMessage[1]/Product[${product}]/DescriptiveDetail[1]/EpubLicense[1]/EpubLicenseExpression[1]`;

        return { path, sourcePath: path };
      }),
    });
    expect(findingsOf(reduced)).toEqual([]);
    expect(['r1', 'r2', 'r3', 'r4'].map((ref) => reduced.rights.products[keyOf(reduced, ref)].carrier)).toEqual([
      'PHYSICAL',
      'PHYSICAL',
      'DIGITAL',
      'DIGITAL',
    ]);
    expect(reduced.rights.products[keyOf(reduced, 'r3')].technicalProtectionState).toBe('NONE');
  });

  it('lets one eligible digital licence stand for the Work beside licence-silent physical manifestations', () => {
    const reduced = grouped([
      { form: FORMS.HARDBACK },
      { form: FORMS.EPUB, rights: ccLicence('https://creativecommons.org/licenses/by/4.0/') },
    ]);

    expect(groupOf(reduced).licence).toMatchObject({ kind: 'SET_SUPPORTED_LICENSE', identity: 'CC_BY_4_0' });
  });

  it('reads digital manifestations naming one licence in different representations as one licence', () => {
    const reduced = grouped([
      { form: FORMS.EPUB, rights: ccLicence('https://creativecommons.org/licenses/by-sa/4.0/') },
      { form: FORMS.PDF, rights: ccLicence('https://creativecommons.org/licenses/by-sa/4.0/deed.de') },
    ]);

    expect(groupOf(reduced).licence).toMatchObject({
      kind: 'SET_SUPPORTED_LICENSE',
      identity: 'CC_BY_SA_4_0',
      url: 'https://creativecommons.org/licenses/by-sa/4.0/',
    });
  });

  it('blocks digital manifestations naming different licences, whichever the file states first', () => {
    const by = { form: FORMS.EPUB, rights: ccLicence('https://creativecommons.org/licenses/by/4.0/') };
    const byNc = { form: FORMS.PDF, rights: ccLicence('https://creativecommons.org/licenses/by-nc/4.0/') };
    const [byFirst, byNcFirst] = [grouped([by, byNc]), grouped([byNc, by])];

    [byFirst, byNcFirst].forEach((reduced) => {
      const conflict = findingsOf(reduced, 'RIGHTS_LICENCE_GROUP_CONFLICT');

      expect(conflict).toHaveLength(1);
      expect(conflict[0]).toMatchObject({
        classification: 'TARGET_UNREPRESENTABLE',
        blocking: true,
        productKey: null,
        detail: { identities: ['CC_BY_4_0', 'CC_BY_NC_4_0'] },
      });
      expect(groupOf(reduced).licence).toEqual({ kind: 'BLOCKED', findingKeys: [conflict[0].key] });
    });
    expect(findingsOf(byFirst, 'RIGHTS_LICENCE_GROUP_CONFLICT')[0].key).toBe(
      findingsOf(byNcFirst, 'RIGHTS_LICENCE_GROUP_CONFLICT')[0].key,
    );
  });

  it.each([
    ['a licence-silent digital manifestation', FORMS.PDF],
    ['licence-silent downloadable audio', FORMS.AUDIO],
    ['a licence-silent digital carrier', FORMS.CD_ROM],
    ['a licence-silent package', FORMS.PACKAGE],
    ['a licence-silent undefined form', FORMS.UNDEFINED],
  ])('never lets a digital licence stand for %s: the Work licence is ambiguous', (_case, silentForm) => {
    const reduced = grouped([
      { form: FORMS.EPUB, rights: ccLicence('https://creativecommons.org/licenses/by/4.0/') },
      { form: silentForm },
    ]);
    const ambiguous = findingsOf(reduced, 'RIGHTS_LICENCE_GROUP_AMBIGUOUS');

    expect(ambiguous).toHaveLength(1);
    expect(ambiguous[0]).toMatchObject({
      classification: 'TARGET_INPUT_REQUIRED',
      blocking: true,
      detail: { identities: ['CC_BY_4_0'], silentProductKeys: [keyOf(reduced, 'r2')] },
    });
    expect(groupOf(reduced).licence).toEqual({ kind: 'BLOCKED', findingKeys: [ambiguous[0].key] });
  });

  it('takes a physical manifestation into the Work licence only when it states a licence itself', () => {
    const cc = (link: string) => ccLicence(`https://creativecommons.org/licenses/${link}/4.0/`);
    const agreeing = grouped([
      { form: FORMS.HARDBACK, rights: cc('by') },
      { form: FORMS.EPUB, rights: cc('by') },
    ]);
    const printOnly = grouped([{ form: FORMS.HARDBACK, rights: cc('by') }, { form: FORMS.PAPERBACK }]);
    const disagreeing = grouped([
      { form: FORMS.HARDBACK, rights: cc('by-nc') },
      { form: FORMS.EPUB, rights: cc('by') },
    ]);
    const unprotectedPrint = grouped([
      { form: FORMS.HARDBACK, rights: protection('00') },
      { form: FORMS.EPUB, rights: cc('by') },
    ]);

    expect(groupOf(agreeing).licence).toMatchObject({
      kind: 'SET_SUPPORTED_LICENSE',
      identity: 'CC_BY_4_0',
      productKeys: [keyOf(agreeing, 'r1'), keyOf(agreeing, 'r2')].sort(),
    });
    expect(groupOf(printOnly).licence).toMatchObject({ kind: 'SET_SUPPORTED_LICENSE', identity: 'CC_BY_4_0' });
    expect(groupOf(disagreeing).licence.kind).toBe('BLOCKED');
    expect(findingsOf(disagreeing, 'RIGHTS_LICENCE_GROUP_CONFLICT')).toHaveLength(1);
    expect(groupOf(unprotectedPrint).licence).toMatchObject({ kind: 'SET_SUPPORTED_LICENSE', identity: 'CC_BY_4_0' });
  });

  it('sets no licence where no manifestation gives one, and infers neither All Rights Reserved nor Open Access', () => {
    const silent = grouped([
      { form: FORMS.HARDBACK },
      { form: FORMS.EPUB },
      { form: FORMS.PDF, rights: usage('00', '01') },
    ]);

    expect(groupOf(silent).licence).toEqual({ kind: 'UNSET' });
    expect(findingsOf(silent)).toEqual([]);
  });

  it('blocks where a manifestation states a licence Thoth cannot identify, rather than setting none in its place', () => {
    const reduced = grouped([
      { form: FORMS.HARDBACK },
      { form: FORMS.EPUB, rights: ccLicence('https://publisher.example/eula') },
    ]);

    expect(groupOf(reduced).licence).toEqual({
      kind: 'BLOCKED',
      findingKeys: findingsOf(reduced, 'RIGHTS_LICENCE_UNSUPPORTED').map(({ key }) => key),
    });
  });

  it('blocks a licence that has dates, and one beside a limited or prohibited material constraint (rule 76)', () => {
    const cc = licence({ expressions: [expression('02', 'https://creativecommons.org/licenses/by/4.0/')] });
    const dated = reduce(
      [
        productXml({
          grouped: true,
          rights: licence({
            expressions: [expression('02', 'https://creativecommons.org/licenses/by/4.0/')],
            dates: [['15', '20301231']],
          }),
        }),
      ],
      { release: '3.1' },
    );
    const restricted = grouped([{ form: FORMS.EPUB, rights: usage('11', '03') + cc }]);

    expect(groupOf(dated).licence).toEqual({
      kind: 'BLOCKED',
      findingKeys: findingsOf(dated, 'RIGHTS_LICENCE_DATED').map(({ key }) => key),
    });
    expect(groupOf(restricted).licence).toEqual({
      kind: 'BLOCKED',
      findingKeys: findingsOf(restricted, 'RIGHTS_USAGE_CONSTRAINT_UNREPRESENTABLE').map(({ key }) => key),
    });
  });

  it('still sets the licence beside technical protection or a preview constraint, whose own findings stand apart', () => {
    const cc = licence({ expressions: [expression('02', 'https://creativecommons.org/licenses/by/4.0/')] });
    const protectedEpub = grouped([{ form: FORMS.EPUB, rights: protection('03') + usage('02', '01') + cc }]);
    const preview = grouped([{ form: FORMS.EPUB, rights: usage('01', '02', ['10', '05']) + cc }]);

    // DRM alone does not keep a licence from being the Work's (rule 79); it blocks the plan by its own finding.
    expect(groupOf(protectedEpub).licence).toMatchObject({ kind: 'SET_SUPPORTED_LICENSE', identity: 'CC_BY_4_0' });
    expect(codesOf(protectedEpub)).toEqual([
      ['RIGHTS_TECHNICAL_PROTECTION_UNREPRESENTABLE', 'TARGET_UNREPRESENTABLE', true],
      ['RIGHTS_USAGE_CONSTRAINT_UNREPRESENTABLE', 'TARGET_UNREPRESENTABLE', true],
    ]);
    expect(groupOf(preview).licence).toMatchObject({ kind: 'SET_SUPPORTED_LICENSE', identity: 'CC_BY_4_0' });
  });

  it('reduces the same file to the same plan, whatever order its manifestations come in', () => {
    const specs: ProductSpec[] = [
      { form: FORMS.HARDBACK, isbn: ISBN_A, ref: 'hb' },
      { form: FORMS.EPUB, isbn: ISBN_B, ref: 'epub', rights: protection('00') + ccLicence(CC_BY_NC_ND_LEGALCODE) },
      { form: FORMS.PDF, isbn: ISBN_C, ref: 'pdf' },
    ];
    const forwards = reduce(specs.map((spec) => productXml({ grouped: true, ...spec })));
    const backwards = reduce([...specs].reverse().map((spec) => productXml({ grouped: true, ...spec })));

    expect(groupOf(forwards).licence).toEqual(groupOf(backwards).licence);
    expect(
      findingsOf(forwards)
        .map(({ key, code }) => [key, code])
        .sort(),
    ).toEqual(
      findingsOf(backwards)
        .map(({ key, code }) => [key, code])
        .sort(),
    );
  });
});
