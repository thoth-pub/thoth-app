import { defineOnixRegressionFixture } from '../../fixtureSources';

/**
 * One ONIX 3.1 Product whose copyright statement names two rightsholders by EIDR Party ID (CopyrightOwnerIDType 29):
 * `10.5237/1A2B-3C4D` in the ONIX-stated structure, and `10.5237/1A2B-3C4D5` with nine hexadecimal digits.
 *
 * The official 3.1.3 strict assertion for this composite, _20171221_j_28, carries a malformed regular expression
 * (`[0-9A-fa-F]`): it raises on every CopyrightOwnerIdentifier, whatever its type, so it can never pass or fail one.
 * Each raise is an explicit, visible RULE_NOT_EVALUABLE finding that does not count - never an implicit pass. The
 * ONIX-stated core of the code-29 rule is enforced instead by the approved K-EIDR-PARTY-ID kernel, which accepts the
 * first identifier and rejects the second as source-invalid.
 */

const COPYRIGHT_OWNER_IDENTIFIER = (owner: number) =>
  `/ONIXMessage[1]/Product[1]/PublishingDetail[1]/CopyrightStatement[1]/CopyrightOwner[${owner}]/CopyrightOwnerIdentifier[1]`;

const notEvaluable = (owner: number) =>
  ({
    id: '_20171221_j_28',
    tier: 'STRICT',
    scope: 'VALIDITY',
    class: 'RULE_NOT_EVALUABLE',
    blocking: false,
    projection: 'NOT_EVALUABLE',
    recoverability: 'NOT_RECOVERABLE',
    counts: false,
    path: COPYRIGHT_OWNER_IDENTIFIER(owner),
  }) as const;

export default defineOnixRegressionFixture({
  id: 'source-rule-not-evaluable-eidr',
  status: 'CONTRACT',
  purpose:
    'Proves RULE_NOT_EVALUABLE and its approved kernel (thoth-app#179 5619067357 sections 4 and 6, thoth#895 ' +
    '5619057916): the 3.1.3 assertion _20171221_j_28 raises (MALFORMED_REGEX) and is reported once per ' +
    'CopyrightOwnerIdentifier as a visible, non-counting RULE_NOT_EVALUABLE finding - never a pass - while the ' +
    'ONIX-stated EIDR Party ID structure is enforced by K-EIDR-PARTY-ID: the conforming identifier passes and the ' +
    'nine-digit one alone is a blocking SOURCE_INVALID finding.',
  source: {
    origin: 'SYNTHETIC',
    provenance:
      'Written for thoth-app#248; no publisher byte is reused. Both EIDR Party IDs are invented strings under the ' +
      'prefix ONIX states for them (10.5237); no EIDR registry was consulted. The ISBN carries a valid check digit.',
    sha256: '460a5ef0d3c51f3847a46a960bc3a472ad2baddba61dcfec5ea01a1e1711f318',
  },
  defects: [],
  asOf: '2026-10-02T12:00:00.000Z',
  imprints: [{ label: 'Regression Press', value: '11111111-1111-4111-8111-111111111111' }],
  gate: {
    verdict: 'SOURCE_INVALID',
    release: '3.1',
    flavour: 'reference',
    findings: [
      // Stage 6: the official assertion cannot be evaluated for either identifier, so it says nothing about either.
      notEvaluable(1),
      notEvaluable(2),
      // Stage 8: the kernel holds the ONIX-stated structure (10.5237/, eight hexadecimal digits, one interior hyphen,
      // 17 characters) and rejects only the nine-digit identifier.
      {
        id: 'K-EIDR-PARTY-ID',
        tier: 'INVENTORY',
        scope: 'VALIDITY',
        class: 'NORMATIVE_INVALID',
        blocking: true,
        projection: 'AUTHORITATIVE',
        recoverability: 'NOT_RECOVERABLE',
        counts: true,
        path: COPYRIGHT_OWNER_IDENTIFIER(2),
      },
    ],
    recoveries: [],
    // The gate ran every tier over the uploaded Reference source, unchanged.
    provenance: { kind: 'IDENTITY', flavour: 'reference' },
  },
  scenarios: [],
  // The kernel's finding is the only one that counts.
  refusedOutcomes: { SOURCE_INVALID: 1 },
});
