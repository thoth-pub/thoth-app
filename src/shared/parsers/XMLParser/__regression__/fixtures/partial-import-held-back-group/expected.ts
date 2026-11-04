import { defineOnixRegressionFixture } from '../../fixtureSources';

/**
 * A distributor-shaped feed of 24 Products, each its own Work, two of which carry a blocking source finding: Product 1 a
 * short description longer than 350 characters (`_20171221_e_1`), Product 4 an EditionStatement with neither an
 * EditionType nor an EditionNumber (`R-EDITION-STATEMENT`). Nothing else in the file is invalid.
 *
 * Canonical source validation is unchanged by thoth-app#282, so the gate's verdict for the whole file is SOURCE_INVALID,
 * with exactly those two counting findings, each inside one Product - and this fixture states exactly that. What the
 * uploader then does with such a source - hold back the two Work groups the findings lie in and plan the other 22 - is
 * proven over these same bytes through the pipeline's partial path (`runOnixPartialSourceGate`, `runOnixPlanning`) in
 * `harness.test.ts` ("product-scoped blocking (thoth-app#282)"), together with the same bytes with an empty Product,
 * which holds the whole file. A refused fixture states no scenario (the declaration rules of `assertions.ts`), so the
 * planned ledger is asserted there rather than here; the re-upload of the corrected feed is proven in
 * `onixSourceBridge.test.ts` ("partial import of a 24-Product feed").
 */

export default defineOnixRegressionFixture({
  id: 'partial-import-held-back-group',
  status: 'CONTRACT',
  purpose:
    'Proves that the two counting findings of a 24-Product feed each lie inside exactly one Product (thoth-app#282 contract ' +
    'items 1-2): the source gate refuses the whole file as SOURCE_INVALID, unchanged, and every counting finding is ' +
    'attributable to Product 1 or Product 4, so partial import can hold back exactly their Work groups.',
  source: {
    origin: 'SYNTHETIC',
    provenance:
      'Written for thoth-app#282 to the defect shape of a 24-Product distributor ONIX 3.1 feed; no publisher byte is ' +
      'reused. Every name and identifier is invented; every ISBN carries a valid check digit.',
    sha256: 'ab26bf380275be3c46cfe9d9155704ec5c09a7dc302870bd0899b146fe7e4294',
  },
  defects: [],
  asOf: '2026-11-04T12:00:00.000Z',
  imprints: [{ label: 'Regression Press', value: '11111111-1111-4111-8111-111111111111' }],
  gate: {
    verdict: 'SOURCE_INVALID',
    release: '3.1',
    flavour: 'reference',
    findings: [
      // A short description (TextType 02) may be at most 350 characters: Product 1's is 526.
      {
        id: '_20171221_e_1',
        tier: 'STRICT',
        scope: 'VALIDITY',
        class: 'NORMATIVE_INVALID',
        blocking: true,
        projection: 'AUTHORITATIVE',
        recoverability: 'NOT_RECOVERABLE',
        counts: true,
        path: '/ONIXMessage[1]/Product[1]/CollateralDetail[1]/TextContent[1]',
      },
      // P.9.4: an EditionStatement is accompanied by an EditionType or an EditionNumber; Product 4's has neither.
      {
        id: 'R-EDITION-STATEMENT',
        tier: 'INVENTORY',
        scope: 'VALIDITY',
        class: 'NORMATIVE_INVALID',
        blocking: true,
        projection: 'AUTHORITATIVE',
        recoverability: 'NOT_RECOVERABLE',
        counts: true,
        path: '/ONIXMessage[1]/Product[4]/DescriptiveDetail[1]',
      },
    ],
    recoveries: [],
    provenance: { kind: 'IDENTITY', flavour: 'reference' },
  },
  scenarios: [],
  // The gate refuses the source once, as SOURCE_INVALID, however many of its findings count.
  refusedOutcomes: { SOURCE_INVALID: 1 },
});
