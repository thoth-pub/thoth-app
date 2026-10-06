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
import targetAccessibilityFeatures from './target-accessibility-features/expected';
import targetCollateralResources from './target-collateral-resources/expected';
import targetComponentsHierarchy from './target-components-hierarchy/expected';
import targetForthcomingNoFulltext from './target-forthcoming-no-fulltext/expected';
import targetLicenceUsageProtection from './target-licence-usage-protection/expected';
import targetProductFormVariants from './target-product-form-variants/expected';
import targetRelatedMaterial from './target-related-material/expected';
import targetReviewsPrizesCitedContent from './target-reviews-prizes-cited-content/expected';
import targetSeriesIssue from './target-series-issue/expected';
import targetSubjectMatrix from './target-subject-matrix/expected';
import targetSupplyPricesLocations from './target-supply-prices-locations/expected';
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
  // The empty-target planning matrix (thoth-app#249): each family's target ledger, derived from its approved contract.
  targetProductFormVariants,
  targetForthcomingNoFulltext,
  targetSupplyPricesLocations,
  targetSubjectMatrix,
  targetSeriesIssue,
  targetComponentsHierarchy,
  targetRelatedMaterial,
  targetCollateralResources,
  targetLicenceUsageProtection,
  targetAccessibilityFeatures,
  targetReviewsPrizesCitedContent,
];
