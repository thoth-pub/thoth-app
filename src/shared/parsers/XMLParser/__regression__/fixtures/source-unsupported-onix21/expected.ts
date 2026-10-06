import { defineOnixRegressionFixture } from '../../fixtureSources';

/**
 * An ONIX 2.1 Reference message, declaring the ONIX 2.1 DTD as such messages do. ONIX 2.1 is outside the supported
 * release boundary, and the release is resolved before the prolog is scanned: the source is refused as unsupported
 * at stage 1, so its DOCTYPE never reaches the stage-2 security scan, and nothing is said about its validity.
 */

export default defineOnixRegressionFixture({
  id: 'source-unsupported-onix21',
  status: 'CONTRACT',
  purpose:
    'Proves the supported-release boundary (thoth-app#179 5619067357 section 1, thoth#895 5619057916): an ONIX 2.1 ' +
    'source is stopped at stage 1 by P-SUPPORT-RELEASE-FLAVOUR as a SUPPORT outcome (UNSUPPORTED_SOURCE, ' +
    'UNSUPPORTED_ONIX_RELEASE) before the stage-2 prolog scan - never SOURCE_INVALID, never a SECURITY refusal of ' +
    'its DTD - and nothing reaches target planning.',
  source: {
    origin: 'SYNTHETIC',
    provenance:
      'Written for thoth-app#248 in the shape of an ONIX 2.1 Reference message (release 2.1 root, no namespace, the ' +
      'ONIX 2.1 DTD declared by its EDItEUR system identifier, which is never resolved); no publisher byte is reused. ' +
      'The ISBN carries a valid check digit.',
    sha256: '515e2f81edc4d2ab526c49ea0cfb790a60f9bf1ef997b3d31dc60b9487fbf996',
  },
  defects: [],
  asOf: '2026-10-02T12:00:00.000Z',
  imprints: [{ label: 'Regression Press', value: '11111111-1111-4111-8111-111111111111' }],
  gate: {
    verdict: 'SOURCE_UNSUPPORTED',
    // Nothing is resolved: the root is no supported release and flavour.
    release: null,
    flavour: null,
    stop: { stage: 1, kind: 'unsupported' },
    findings: [
      // The one stage-1 SUPPORT stop, with the lexical root summary it was decided on. No SECURITY_DTD follows.
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
        detail: { reason: 'UNSUPPORTED_ONIX_RELEASE', rootName: 'ONIXMessage', namespaceURI: null, release: '2.1' },
      },
    ],
    recoveries: [],
    // A stopped gate produces no normalised source.
    provenance: null,
  },
  scenarios: [],
  // A SUPPORT stop is not a programme outcome: in particular, never SOURCE_INVALID.
  refusedOutcomes: {},
});
