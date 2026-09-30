import { defineOnixRegressionFixture } from '../../fixtureSources';

/**
 * One Product whose DescriptiveDetail declares the same language key - LanguageCode eng, with no CountryCode or
 * ScriptCode - as the language of its text (LanguageRole 01) and as the original language of a translation (02),
 * which List 22 defines as a language the Product does not contain. The two statements contradict each other, so the
 * source is invalid: it is refused at the source gate, and nothing reaches target planning to be asked about or chosen.
 */

export default defineOnixRegressionFixture({
  id: 'uolp-language-role-source-invalid',
  status: 'CONTRACT',
  purpose:
    'Proves ONIX-AUDIT-LANGUAGE-02 (thoth-app#179 5619071828): the same (LanguageCode, CountryCode, ScriptCode) key ' +
    'under LanguageRole 01 and 02 is a blocking SOURCE_INVALID contradiction, reported by the authoritative strict ' +
    'rule _20171218_f_2 at the source gate before any target planning - never a target input or an unrepresentable ' +
    'target choice.',
  source: {
    origin: 'SYNTHETIC',
    provenance:
      'Written for thoth-app#239 to the defect shape of the UoLP multilingual language-role incident (thoth-app#180, ' +
      '#188) as reclassified by #179; no publisher byte is reused. The ISBN carries a valid check digit.',
    sha256: 'b6da20f9985b330eb6b67fecfb50f89f6ff87a67a4287909b7d9c2b17bddef75',
  },
  defects: [],
  asOf: '2026-09-30T12:00:00.000Z',
  imprints: [{ label: 'Regression Press', value: '11111111-1111-4111-8111-111111111111' }],
  gate: {
    verdict: 'SOURCE_INVALID',
    release: '3.0',
    flavour: 'reference',
    findings: [
      // The original language of a translation must differ from the language of the text: NORMATIVE_INVALID for the
      // supported 3.0.8 and 3.1.3 baselines, reported on the DescriptiveDetail that holds both Language composites.
      {
        id: '_20171218_f_2',
        tier: 'STRICT',
        scope: 'VALIDITY',
        class: 'NORMATIVE_INVALID',
        blocking: true,
        projection: 'AUTHORITATIVE',
        recoverability: 'NOT_RECOVERABLE',
        counts: true,
        path: '/ONIXMessage[1]/Product[1]/DescriptiveDetail[1]',
      },
    ],
    recoveries: [],
  },
  scenarios: [],
  // The refusal is the only outcome: no TARGET_INPUT_REQUIRED or TARGET_UNREPRESENTABLE is ever raised for it.
  refusedOutcomes: { SOURCE_INVALID: 1 },
});
