import { PublicationType } from '@/src/shared/constants/publications';

import { defineOnixRegressionFixture } from '../../fixtureSources';
import type { OnixRecordEntry } from '../../types';

const { Paperback } = PublicationType.enum;

/**
 * Two EIDR identifiers whose official 3.1.3 assertions encode rules ONIX does not state, and which therefore never
 * decide source validity:
 * - the sender's EIDR Party ID (SenderIDType 29) `10.5237/A1B2C-3D4` has the ONIX-stated structure (the prefix, eight
 *   hexadecimal digits, one interior hyphen) but not EIDR's own 4-4 layout, which the official _20171126_b_71 asserts.
 *   That layout is an external authority Thoth has not adopted: the finding is EXTERNAL_ADOPTION_REQUIRED, visible and
 *   non-blocking, and the ONIX-stated kernel K-EIDR-PARTY-ID accepts the value.
 * - the audiovisual item's EIDR Content ID (AVItemIDType 31) `10.5240/1A2B-3C4D-5E6F-7A8B-9C0D-K` ends in a check
 *   character outside the hexadecimal digits. Thoth adopted EIDR ID Format v1.51 for exactly that alphabet
 *   ([0-9A-Z]), so the K-EIDR-CONTENT-ID kernel accepts it. The official _20171126_c_6 tests the Party ID constant
 *   instead (WRONG_CONSTANT) and stays an ADVISORY finding.
 * Nothing counts, so the gate permits planning. The audiovisual item is then an acknowledged target loss, as for any
 * audiovisual item: that is target representability, not source validity.
 */

const PAPERBACK = 'product:gtin13:9781800000117';
const WORK = `work:${PAPERBACK}`;

const RECORDS: OnixRecordEntry[] = [
  {
    index: 1,
    recordReference: 'regression-press.9781800000117',
    disposition: 'COMPLETE',
    productKey: PAPERBACK,
    action: 'PLANNED',
  },
];

export default defineOnixRegressionFixture({
  id: 'source-external-authority-eidr',
  status: 'CONTRACT',
  purpose:
    'Proves the external-authority boundary (thoth-app#179 5619067357 sections 4-6, thoth#895 5619057916): an ' +
    'EIDR-owned rule Thoth has not adopted (the Party ID 4-4 layout of _20171126_b_71) is a visible, non-blocking ' +
    'EXTERNAL_ADOPTION_REQUIRED finding; the one approved adoption (the EIDR Content-ID check-character alphabet) ' +
    'lets K-EIDR-CONTENT-ID accept a non-hexadecimal check character; the ONIX-stated K-EIDR-PARTY-ID accepts the ' +
    'conforming Party ID; and the gate permits target planning.',
  source: {
    origin: 'SYNTHETIC',
    provenance:
      'Written for thoth-app#248; no publisher byte is reused. Both EIDR identifiers are invented strings under the ' +
      'prefixes ONIX states for them (10.5237 Party, 10.5240 Content); no EIDR registry was consulted. The ISBN ' +
      'carries a valid check digit.',
    sha256: '0c72deb400e5542d3342aad013e771f1a2ded3fe384511035ece1a692db3a83f',
  },
  defects: [],
  asOf: '2026-10-02T12:00:00.000Z',
  imprints: [{ label: 'Regression Press', value: '11111111-1111-4111-8111-111111111111' }],
  gate: {
    verdict: 'PERMITTED',
    release: '3.1',
    flavour: 'reference',
    findings: [
      // Document order: the Header's sender, then the Product's audiovisual item. Neither K-EIDR kernel reports.
      {
        id: '_20171126_b_71',
        tier: 'STRICT',
        scope: 'VALIDITY',
        class: 'EXTERNAL_ADOPTION_REQUIRED',
        blocking: false,
        projection: 'AUTHORITATIVE',
        recoverability: 'NOT_RECOVERABLE',
        counts: false,
        path: '/ONIXMessage[1]/Header[1]/Sender[1]/SenderIdentifier[1]',
      },
      {
        id: '_20171126_c_6',
        tier: 'STRICT',
        scope: 'VALIDITY',
        class: 'ADVISORY',
        blocking: false,
        projection: 'AUTHORITATIVE',
        recoverability: 'NOT_RECOVERABLE',
        counts: false,
        path: '/ONIXMessage[1]/Product[1]/ContentDetail[1]/ContentItem[1]/AVItem[1]/AVItemIdentifier[1]',
      },
    ],
    recoveries: [],
    provenance: { kind: 'IDENTITY', flavour: 'reference' },
  },
  normalized: {
    '/onix:ONIXMessage/@release': ['3.1'],
    // Both identifiers reach the target side exactly as supplied: nothing about them was recovered or rewritten.
    '/onix:ONIXMessage/onix:Header/onix:Sender/onix:SenderIdentifier/onix:IDValue': ['10.5237/A1B2C-3D4'],
    '/onix:ONIXMessage/onix:Product/onix:ContentDetail/onix:ContentItem/onix:AVItem/onix:AVItemIdentifier/onix:IDValue':
      ['10.5240/1A2B-3C4D-5E6F-7A8B-9C0D-K'],
  },
  scenarios: [
    {
      name: 'as uploaded, before any publisher decision',
      target: 'EMPTY_PUBLISHER',
      planning: {
        executable: false,
        records: RECORDS,
        products: [
          {
            productKey: PAPERBACK,
            groupKey: WORK,
            isbn: '9781800000117',
            // ProductForm BC is exactly a Thoth paperback.
            manifestation: { kind: 'RESOLVED', type: Paperback, classification: 'SUPPORTED_LOSSLESS', notes: [] },
            publicationType: Paperback,
            action: 'CREATE_PUBLICATION',
            executable: false,
          },
        ],
        workGroups: [
          {
            groupKey: WORK,
            productKeys: [PAPERBACK],
            target: 'NEW_WORK',
            workType: { status: 'UNRESOLVED' },
            edition: { status: 'RESOLVED', edition: 1, basis: 'DEFAULT_FIRST_EDITION' },
            workDoi: { kind: 'NONE' },
            executable: false,
          },
        ],
        blockers: [
          // ONIX does not state a Thoth WorkType; the file never guesses one.
          {
            code: 'WORK_TYPE_INPUT_REQUIRED',
            classification: 'TARGET_INPUT_REQUIRED',
            recordKey: null,
            productKey: null,
            groupKey: WORK,
          },
          // The unacknowledged loss of the audiovisual item below holds its record until the publisher acknowledges it.
          {
            code: 'COMPONENT_ACKNOWLEDGEMENT_REQUIRED',
            classification: 'TARGET_UNREPRESENTABLE',
            recordKey: 'record:1',
            productKey: PAPERBACK,
            groupKey: WORK,
          },
        ],
        findings: [
          // An audiovisual item is never a written chapter and Thoth cannot record it: the publisher must acknowledge
          // its omission. Its identifiers - the adopted EIDR Content ID among them - play no part in that.
          {
            family: 'COMPONENT',
            code: 'COMPONENT_AV_ITEM_UNREPRESENTABLE',
            classification: 'TARGET_UNREPRESENTABLE',
            blocking: true,
            resolution: 'ACKNOWLEDGE',
            answer: 'UNANSWERED',
            productKey: PAPERBACK,
            groupKey: WORK,
          },
        ],
        works: [],
        chapters: [],
      },
      // No source outcome: the external-authority findings count toward nothing. The audiovisual loss is counted as
      // its finding and as the blocker that waits on its acknowledgement.
      outcomes: {
        SUPPORTED_LOSSLESS: 1,
        TARGET_INPUT_REQUIRED: 1,
        TARGET_UNREPRESENTABLE: 2,
      },
    },
  ],
});
