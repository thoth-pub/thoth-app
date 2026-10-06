import { defineOnixRegressionFixture } from '../../fixtureSources';

/**
 * An ONIX 2.1 Short-tag message: the Short flavour's `ONIXmessage` root, with neither an ONIX 3 namespace nor a
 * release attribute. The supported boundary is ONIX 3.0.8 and 3.1.3 in the Reference and Short flavours, and a Short
 * flavour is resolved only from an ONIX 3 Short namespace, so this root is the Short flavour of an unsupported
 * release. It is refused as unsupported, not as invalid: a missing release is RELEASE_UNDECLARED only under an ONIX 3
 * namespace, and an undeclared namespace is NAMESPACE_UNDECLARED only when a 3.x release is declared.
 */

export default defineOnixRegressionFixture({
  id: 'source-unsupported-flavour',
  status: 'CONTRACT',
  purpose:
    'Proves the supported-flavour boundary (thoth-app#179 5619067357 section 1, thoth#895 5619057916): a Short-tag ' +
    'ONIXmessage root outside every ONIX 3 Short namespace is stopped at stage 1 by P-SUPPORT-RELEASE-FLAVOUR as a ' +
    'SUPPORT outcome (UNSUPPORTED_SOURCE, UNSUPPORTED_ONIX_RELEASE) - never resolved as an ONIX 3 Short source, never ' +
    'SOURCE_INVALID - and nothing reaches target planning.',
  source: {
    origin: 'SYNTHETIC',
    provenance:
      'Written for thoth-app#248 in the shape of an ONIX 2.1 Short-tag message (ONIXmessage root, no namespace, no ' +
      'release attribute, no DOCTYPE, ONIX 2.1 Short tags); no publisher byte is reused. The ISBN carries a valid ' +
      'check digit.',
    sha256: '09a57d3319e6755937b8436cef80f044071b0a80f0a9662f30a762059c5e8877',
  },
  defects: [],
  asOf: '2026-10-02T12:00:00.000Z',
  imprints: [{ label: 'Regression Press', value: '11111111-1111-4111-8111-111111111111' }],
  gate: {
    verdict: 'SOURCE_UNSUPPORTED',
    release: null,
    flavour: null,
    stop: { stage: 1, kind: 'unsupported' },
    findings: [
      // Decided on the root alone: the Short root name, no namespace and no release attribute.
      {
        id: 'UNSUPPORTED_SOURCE',
        tier: 'RELEASE_FLAVOUR',
        scope: 'SUPPORT',
        class: 'PROCESSING_STOP',
        blocking: true,
        projection: 'AUTHORITATIVE',
        recoverability: 'NOT_RECOVERABLE',
        counts: true,
        path: null,
        detail: { reason: 'UNSUPPORTED_ONIX_RELEASE', rootName: 'ONIXmessage', namespaceURI: null, release: null },
      },
    ],
    recoveries: [],
    provenance: null,
  },
  scenarios: [],
  // A SUPPORT stop is not a programme outcome: in particular, never SOURCE_INVALID.
  refusedOutcomes: {},
});
