import { defineOnixRegressionFixture } from '../../fixtureSources';

/**
 * An ONIX 3.0 Reference message whose prolog carries a DOCTYPE: an external DTD and an internal subset declaring an
 * external entity that the message references. Release and flavour resolve (stage 1), then the bounded stage-2 prolog
 * scan meets the DOCTYPE and stops: nothing is parsed, no entity or DTD is resolved, and no later tier runs. ONIX 3.0.8
 * states no rule about a DOCTYPE, so the refusal is SECURITY alone (3.1.3 would add R-MSG-NO-DOCTYPE-31; the harness
 * self-test proves that on an in-memory 3.1 derivative of this source).
 */

export default defineOnixRegressionFixture({
  id: 'source-security-doctype',
  status: 'CONTRACT',
  purpose:
    'Proves the stage-2 security contract (thoth-app#179 5619067357 section 3, thoth#895 5619057916): any DTD ' +
    'construct is SECURITY_DTD (P-SECURITY-DTD, PROCESSING_STOP, scope SECURITY) and the gate stops after stage 2, ' +
    'before any parse, entity or DTD resolution, later validation tier or target planning; for ONIX 3.0.8 it is not ' +
    'a source-validity verdict.',
  source: {
    origin: 'SYNTHETIC',
    provenance:
      'Written for thoth-app#248: an ONIX 3.0 Reference message with a DOCTYPE in the external-entity shape (external ' +
      'DTD, internal subset declaring a SYSTEM entity, the entity referenced in SenderName). Both system identifiers ' +
      'use the reserved .invalid domain. Without the DOCTYPE, and with the sender name written out, the message is ' +
      'permitted with no finding (harness self-test). No publisher byte is reused; the ISBN carries a valid check digit.',
    sha256: '138910c1e9b3bad8e69f0f3c76359a437d8899cfe260a3892d92b1999000d27a',
  },
  defects: [],
  asOf: '2026-10-02T12:00:00.000Z',
  imprints: [{ label: 'Regression Press', value: '11111111-1111-4111-8111-111111111111' }],
  gate: {
    verdict: 'SOURCE_REFUSED_SECURITY',
    // Stage 1 resolved the root before stage 2 stopped.
    release: '3.0',
    flavour: 'reference',
    stop: { stage: 2, kind: 'dtd' },
    findings: [
      // The DOCTYPE as the scan read it, lexically: its name, a SYSTEM external identifier and an internal subset.
      {
        id: 'SECURITY_DTD',
        tier: 'PROLOG',
        scope: 'SECURITY',
        class: 'PROCESSING_STOP',
        blocking: true,
        projection: 'AUTHORITATIVE',
        recoverability: 'NOT_RECOVERABLE',
        counts: true,
        path: null,
        detail: { name: 'ONIXMessage', externalId: 'SYSTEM', internalSubset: true, malformed: false },
      },
    ],
    recoveries: [],
    provenance: null,
  },
  scenarios: [],
  // A SECURITY stop is not a programme outcome, and ONIX 3.0.8 adds no validity finding for it.
  refusedOutcomes: {},
});
