import type { OnixRegressionFixture } from '../types';
import orcidNormalizationRepeatedContributor from './orcid-normalization-repeated-contributor/expected';
import recoverableEmptyTextContent from './recoverable-empty-textcontent/expected';
import representativeOnix31TwoManifestations from './representative-onix31-two-manifestations/expected';
import sourceExternalAuthorityEidr from './source-external-authority-eidr/expected';
import sourceOnix30ShortEquivalence from './source-onix30-short-equivalence/expected';
import sourceOnix31ShortEquivalence from './source-onix31-short-equivalence/expected';
import sourceRuleNotEvaluableEidr from './source-rule-not-evaluable-eidr/expected';
import sourceSecurityDoctype from './source-security-doctype/expected';
import sourceUnsupportedFlavour from './source-unsupported-flavour/expected';
import sourceUnsupportedOnix21 from './source-unsupported-onix21/expected';
import uolpLanguageRoleSourceInvalid from './uolp-language-role-source-invalid/expected';

/** Every registered ONIX regression fixture. A fixture directory that is not listed here fails the harness self-test. */
export const ONIX_REGRESSION_FIXTURES: readonly OnixRegressionFixture[] = [
  representativeOnix31TwoManifestations,
  uolpLanguageRoleSourceInvalid,
  orcidNormalizationRepeatedContributor,
  recoverableEmptyTextContent,
  // The source-validation boundary (thoth-app#248): Short equivalence, SUPPORT and SECURITY stops, external authority.
  sourceOnix30ShortEquivalence,
  sourceOnix31ShortEquivalence,
  sourceUnsupportedOnix21,
  sourceUnsupportedFlavour,
  sourceSecurityDoctype,
  sourceRuleNotEvaluableEidr,
  sourceExternalAuthorityEidr,
];
