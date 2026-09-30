import { PublicationType } from '@/src/shared/constants/publications';
import { WorkTypes } from '@/src/shared/constants/work';

import { defineOnixRegressionFixture } from '../../fixtureSources';
import type { OnixPlanFindingEntry, OnixProductEntry, OnixRecordEntry } from '../../types';

const { Paperback } = PublicationType.enum;
const { Monograph } = WorkTypes.enum;

/**
 * One Product whose CollateralDetail holds a TextContent with a TextType and a ContentAudience but no Text - invalid
 * against the pinned schema - followed by a valid TextContent. The empty composite stays a truthful source finding,
 * the approved ordinary recovery omits it and only it, and the valid sibling is planned as the Work's description.
 */

const PAPERBACK = 'product:gtin13:9781800000063';
const WORK = `work:${PAPERBACK}`;

/** The empty TextContent: the first of the two. */
const EMPTY_TEXT_CONTENT = '/ONIXMessage[1]/Product[1]/CollateralDetail[1]/TextContent[1]';

const RECORDS: OnixRecordEntry[] = [
  {
    index: 1,
    recordReference: 'regression-press.9781800000063',
    disposition: 'COMPLETE',
    productKey: PAPERBACK,
    action: 'PLANNED',
  },
];

const products = (executable: boolean): OnixProductEntry[] => [
  {
    productKey: PAPERBACK,
    groupKey: WORK,
    isbn: '9781800000063',
    // ProductForm BC is exactly a Thoth paperback.
    manifestation: { kind: 'RESOLVED', type: Paperback, classification: 'SUPPORTED_LOSSLESS', notes: [] },
    publicationType: Paperback,
    action: 'CREATE_PUBLICATION',
    executable,
  },
];

/** Only the surviving TextType 03 composite is planned; the omitted one raises nothing further. */
const FINDINGS: OnixPlanFindingEntry[] = [
  // The TextType 03 description becomes the Work's long abstract, as no TextType 30 competes with it.
  {
    family: 'COLLATERAL',
    code: 'COLLATERAL_TEXT_DESCRIPTION_NORMALISED',
    classification: 'SUPPORTED_NORMALIZED',
    blocking: false,
    resolution: 'NONE',
    answer: 'NOT_APPLICABLE',
    productKey: null,
    groupKey: WORK,
  },
];

const EDITION = { status: 'RESOLVED', edition: 1, basis: 'DEFAULT_FIRST_EDITION' } as const;

export default defineOnixRegressionFixture({
  id: 'recoverable-empty-textcontent',
  status: 'CONTRACT',
  purpose:
    'Proves the recoverable empty-TextContent policy (thoth-app#179 5572802864 section 4, thoth#923): a TextContent ' +
    'without Text keeps its authoritative ordinary-schema finding, is recovered as OMIT_INVALID_COMPOSITE without ' +
    'counting, and is the only composite the normalised source loses; its valid later sibling survives and the ' +
    'Product plans as it would without the empty composite.',
  source: {
    origin: 'SYNTHETIC',
    provenance:
      'Written for thoth-app#239 to the defect shape of the empty TextContent composites of the Mohr Siebeck evidence ' +
      'file (thoth-app#179); no publisher byte is reused. The ISBN carries a valid check digit.',
    sha256: '47df6293fe26bb16fee43ad34a78de3823f398e50d9a374a6478d8a45b4ced26',
  },
  defects: [],
  asOf: '2026-09-30T12:00:00.000Z',
  imprints: [{ label: 'Regression Press', value: '11111111-1111-4111-8111-111111111111' }],
  gate: {
    verdict: 'PERMITTED',
    release: '3.0',
    flavour: 'reference',
    findings: [
      // The mandatory Text is missing: still a SOURCE_INVALID fact, reported where it is, and recoverable only because
      // omitting this optional composite changes nothing else the Product states.
      {
        id: 'ORDINARY_XSD_INVALID',
        tier: 'CANONICAL_ORDINARY',
        scope: 'VALIDITY',
        class: 'SOURCE_INVALID',
        blocking: true,
        projection: 'AUTHORITATIVE',
        recoverability: 'OMIT_INVALID_COMPOSITE',
        counts: false,
        path: EMPTY_TEXT_CONTENT,
      },
    ],
    recoveries: [{ recovery: 'OMIT_INVALID_COMPOSITE', path: EMPTY_TEXT_CONTENT }],
  },
  normalized: {
    '/onix:ONIXMessage/@release': ['3.0'],
    '/onix:ONIXMessage/onix:Product/onix:RecordReference': ['regression-press.9781800000063'],
    // The empty TextType 02 composite is gone; the TextType 03 composite after it is all that remains, text intact.
    '/onix:ONIXMessage/onix:Product/onix:CollateralDetail/onix:TextContent/onix:TextType': ['03'],
    '/onix:ONIXMessage/onix:Product/onix:CollateralDetail/onix:TextContent/onix:Text': [
      '<p>The description that survives the omission of its empty sibling.</p>',
    ],
  },
  scenarios: [
    {
      name: 'as uploaded, before any publisher decision',
      target: 'EMPTY_PUBLISHER',
      planning: {
        executable: false,
        records: RECORDS,
        products: products(false),
        workGroups: [
          {
            groupKey: WORK,
            productKeys: [PAPERBACK],
            target: 'NEW_WORK',
            workType: { status: 'UNRESOLVED' },
            edition: EDITION,
            workDoi: { kind: 'NONE' },
            executable: false,
          },
        ],
        // ONIX does not state a Thoth WorkType; the recovered source asks for nothing else.
        blockers: [
          {
            code: 'WORK_TYPE_INPUT_REQUIRED',
            classification: 'TARGET_INPUT_REQUIRED',
            recordKey: null,
            productKey: null,
            groupKey: WORK,
          },
        ],
        findings: FINDINGS,
        works: [],
        chapters: [],
      },
      outcomes: {
        SUPPORTED_LOSSLESS: 1,
        SUPPORTED_NORMALIZED: 1,
        TARGET_INPUT_REQUIRED: 1,
      },
    },
    {
      name: 'publisher takes MONOGRAPH as the file WorkType',
      target: 'EMPTY_PUBLISHER',
      inputs: { fileWorkType: Monograph },
      planning: {
        executable: true,
        records: RECORDS,
        products: products(true),
        workGroups: [
          {
            groupKey: WORK,
            productKeys: [PAPERBACK],
            target: 'NEW_WORK',
            workType: { status: 'RESOLVED', type: Monograph, provenance: 'USER_FILE_DEFAULT' },
            edition: EDITION,
            workDoi: { kind: 'NONE' },
            executable: true,
          },
        ],
        blockers: [],
        findings: FINDINGS,
        works: [
          {
            type: 'MONOGRAPH',
            status: 'ACTIVE',
            doi: '',
            edition: 1,
            publicationDate: '2026-03-01',
            pageCount: 0,
            titles: [
              {
                canonical: true,
                localeCode: 'EN',
                fullTitle: 'Empty Collateral',
                title: 'Empty Collateral',
                subtitle: '',
              },
            ],
            publications: [{ type: 'PAPERBACK', isbn: '9781800000063' }],
            contributions: [],
            languages: [{ code: 'ENG', relation: 'ORIGINAL' }],
            subjects: [],
          },
        ],
        chapters: [],
      },
      outcomes: {
        SUPPORTED_LOSSLESS: 1,
        SUPPORTED_NORMALIZED: 1,
      },
    },
  ],
});
