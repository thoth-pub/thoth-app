import { PublicationType } from '@/src/shared/constants/publications';
import { WorkTypes } from '@/src/shared/constants/work';

import { defineOnixRegressionFixture } from '../../fixtureSources';
import type { OnixPlanFindingEntry, OnixProductEntry, OnixRecordEntry } from '../../types';

const { Paperback, Pdf } = PublicationType.enum;
const { Monograph } = WorkTypes.enum;

/**
 * One Work in two manifestations - a paperback and a PDF - whose author is stated in both with the same ORCID
 * (NameIDType 21): bare in the paperback, and in the scheme-less resolver spelling `orcid.org/0000-0002-1825-0097` in
 * the PDF. The resolver spelling is not a valid ONIX ORCID, and the canonical ledger says so; the approved ORCID
 * compatibility recovery then gives the target side the bare ORCID, and both manifestations plan one contributor with
 * Thoth's hyphenated ORCID. The author also declares an ORCID-shaped value under NameIDType 01 (proprietary), which is
 * never read as an ORCID.
 */

const PAPERBACK = 'product:gtin13:9781800000049';
const PDF = 'product:gtin13:9781800000056';
const WORK = `work:${PAPERBACK}`;

/** The one NameIdentifier whose IDValue is the resolver spelling: the PDF author's second identifier. */
const RESOLVER_SPELLING = '/ONIXMessage[1]/Product[2]/DescriptiveDetail[1]/Contributor[1]/NameIdentifier[2]';

const RECORDS: OnixRecordEntry[] = [
  {
    index: 1,
    recordReference: 'regression-press.9781800000049',
    disposition: 'COMPLETE',
    productKey: PAPERBACK,
    action: 'PLANNED',
  },
  {
    index: 2,
    recordReference: 'regression-press.9781800000056',
    disposition: 'COMPLETE',
    productKey: PDF,
    action: 'PLANNED',
  },
];

const products = (executable: boolean): OnixProductEntry[] => [
  {
    productKey: PAPERBACK,
    groupKey: WORK,
    isbn: '9781800000049',
    // ProductForm BC is exactly a Thoth paperback.
    manifestation: { kind: 'RESOLVED', type: Paperback, classification: 'SUPPORTED_LOSSLESS', notes: [] },
    publicationType: Paperback,
    action: 'CREATE_PUBLICATION',
    executable,
  },
  {
    productKey: PDF,
    groupKey: WORK,
    isbn: '9781800000056',
    // EB + E107 is a PDF; the digital delivery mode EB itself has nowhere to go in Thoth.
    manifestation: {
      kind: 'RESOLVED',
      type: Pdf,
      classification: 'SUPPORTED_NORMALIZED',
      notes: [{ code: 'DELIVERY_MODE_NOT_REPRESENTED', detail: 'EB' }],
    },
    publicationType: Pdf,
    action: 'CREATE_PUBLICATION',
    executable,
  },
];

const finding = (
  code: string,
  classification: OnixPlanFindingEntry['classification'],
  productKey: string,
): OnixPlanFindingEntry => ({
  family: 'DESCRIPTIVE',
  code,
  classification,
  blocking: false,
  resolution: 'NONE',
  answer: 'NOT_APPLICABLE',
  productKey,
  groupKey: WORK,
});

/**
 * Nothing here waits on the publisher, and nothing is an ORCID finding: no CONTRIBUTOR_ORCID_INVALID, no
 * CONTRIBUTOR_ORCID_CONFLICT, and no CONTRIBUTOR_GROUP_CONFLICT between the two manifestations' authors.
 */
const FINDINGS: OnixPlanFindingEntry[] = [
  // The NameIDType 01 identifier is a contributor identifier other than ORCID, which has no Thoth field.
  finding('CONTRIBUTOR_IDENTIFIER_UNREPRESENTABLE', 'TARGET_UNREPRESENTABLE', PAPERBACK),
  // ONIX states no main contribution, so every contribution is imported as main.
  finding('CONTRIBUTOR_MAIN_NORMALISED', 'SUPPORTED_NORMALIZED', PAPERBACK),
  finding('CONTRIBUTOR_IDENTIFIER_UNREPRESENTABLE', 'TARGET_UNREPRESENTABLE', PDF),
  finding('CONTRIBUTOR_MAIN_NORMALISED', 'SUPPORTED_NORMALIZED', PDF),
];

const EDITION = { status: 'RESOLVED', edition: 1, basis: 'DEFAULT_FIRST_EDITION' } as const;
const WORK_DOI = { kind: 'DOI', doi: 'https://doi.org/10.5555/regression.0002', basis: 'WORK_IDENTIFIER' } as const;

export default defineOnixRegressionFixture({
  id: 'orcid-normalization-repeated-contributor',
  status: 'CONTRACT',
  purpose:
    'Proves the ORCID compatibility contract (thoth-app#179 5572802864 section 3, thoth#923 ' +
    'BULK-IMPORT-ONIX-ORCID-RECOVERY-01, thoth-app#240) across repeated manifestations: a scheme-less resolver ' +
    'spelling of a declared NameIDType 21 keeps its authoritative _20171126_b_32 finding, is recovered as ' +
    'NORMALIZE_ORCID_LEXICAL_FORM without counting, reaches the target side as the bare ORCID, and plans - with the ' +
    'bare spelling of the other manifestation - one contributor with the hyphenated Thoth ORCID and no ORCID conflict; ' +
    'an ORCID-shaped value under NameIDType 01 is never an ORCID.',
  source: {
    origin: 'SYNTHETIC',
    provenance:
      'Written for thoth-app#239; no publisher byte is reused. The ISBNs carry valid check digits and the Work DOI uses ' +
      'the 10.5555 test prefix. The ORCID 0000-0002-1825-0097 is the fictitious ORCID test identity the representative ' +
      'fixture also uses. The NameIDType 01 value 0000-0002-1694-233X is a hyphenated ORCID-shaped value whose bare ' +
      'form satisfies every pinned ORCID rule (lexical form, range, check character), so reading it as an ORCID would ' +
      'name a second identity.',
    sha256: '15a892c24902992357f6032bead87a39d8b312a8c8e3891c67802e9d6a2cc031',
  },
  defects: [],
  asOf: '2026-09-30T12:00:00.000Z',
  imprints: [{ label: 'Regression Press', value: '11111111-1111-4111-8111-111111111111' }],
  gate: {
    verdict: 'PERMITTED',
    release: '3.0',
    flavour: 'reference',
    findings: [
      // The resolver spelling is truthfully not a valid ONIX ORCID (the IDValue must be 16 characters); the finding
      // stays in the ledger as the standard gives it, and only its recoverability - and so its counting - changes.
      // Neither the bare ORCID nor the NameIDType 01 value raises any finding.
      {
        id: '_20171126_b_32',
        tier: 'STRICT',
        scope: 'VALIDITY',
        class: 'NORMATIVE_INVALID',
        blocking: true,
        projection: 'AUTHORITATIVE',
        recoverability: 'NORMALIZE_ORCID_LEXICAL_FORM',
        counts: false,
        path: RESOLVER_SPELLING,
      },
    ],
    // One ORCID recovery, for the one declared NameIDType 21 resolver spelling; none for the NameIDType 01 value.
    recoveries: [{ recovery: 'NORMALIZE_ORCID_LEXICAL_FORM', path: RESOLVER_SPELLING }],
  },
  normalized: {
    '/onix:ONIXMessage/@release': ['3.0'],
    '/onix:ONIXMessage/onix:Product/onix:RecordReference': [
      'regression-press.9781800000049',
      'regression-press.9781800000056',
    ],
    // Every identifier each author declares survives, with its declared scheme, in source order.
    '/onix:ONIXMessage/onix:Product/onix:DescriptiveDetail/onix:Contributor/onix:NameIdentifier/onix:NameIDType': [
      '01',
      '21',
      '01',
      '21',
    ],
    // Both manifestations now carry the bare 16-character ORCID the recovery wrote for the resolver spelling.
    '/onix:ONIXMessage/onix:Product/onix:DescriptiveDetail/onix:Contributor/onix:NameIdentifier[onix:NameIDType = "21"]/onix:IDValue':
      ['0000000218250097', '0000000218250097'],
    // The ORCID-shaped NameIDType 01 value is left exactly as supplied.
    '/onix:ONIXMessage/onix:Product/onix:DescriptiveDetail/onix:Contributor/onix:NameIdentifier[onix:NameIDType = "01"]/onix:IDValue':
      ['0000-0002-1694-233X', '0000-0002-1694-233X'],
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
            productKeys: [PAPERBACK, PDF],
            target: 'NEW_WORK',
            workType: { status: 'UNRESOLVED' },
            edition: EDITION,
            workDoi: WORK_DOI,
            executable: false,
          },
        ],
        // ONIX does not state a Thoth WorkType; it is the only decision the file leaves to the publisher.
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
        SUPPORTED_NORMALIZED: 3,
        TARGET_UNREPRESENTABLE: 2,
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
            productKeys: [PAPERBACK, PDF],
            target: 'NEW_WORK',
            workType: { status: 'RESOLVED', type: Monograph, provenance: 'USER_FILE_DEFAULT' },
            edition: EDITION,
            workDoi: WORK_DOI,
            executable: true,
          },
        ],
        blockers: [],
        findings: FINDINGS,
        works: [
          {
            type: 'MONOGRAPH',
            status: 'ACTIVE',
            doi: 'https://doi.org/10.5555/regression.0002',
            edition: 1,
            publicationDate: '2026-03-01',
            pageCount: 0,
            titles: [
              {
                canonical: true,
                localeCode: 'EN',
                fullTitle: 'Contributor Identity',
                title: 'Contributor Identity',
                subtitle: '',
              },
            ],
            publications: [
              { type: 'PAPERBACK', isbn: '9781800000049' },
              { type: 'PDF', isbn: '9781800000056' },
            ],
            // One contributor for both manifestations, with the ORCID in Thoth's hyphenated form - never the
            // NameIDType 01 value.
            contributions: [
              {
                fullName: 'Ada Lovelace',
                type: 'AUTHOR',
                isMain: true,
                orderNumber: 1,
                orcidId: '0000-0002-1825-0097',
              },
            ],
            languages: [{ code: 'ENG', relation: 'ORIGINAL' }],
            subjects: [],
          },
        ],
        chapters: [],
      },
      outcomes: {
        SUPPORTED_LOSSLESS: 1,
        SUPPORTED_NORMALIZED: 3,
        TARGET_UNREPRESENTABLE: 2,
      },
    },
  ],
});
