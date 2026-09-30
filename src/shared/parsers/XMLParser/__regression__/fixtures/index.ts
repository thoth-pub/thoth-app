import type { OnixRegressionFixture } from '../types';
import orcidNormalizationRepeatedContributor from './orcid-normalization-repeated-contributor/expected';
import recoverableEmptyTextContent from './recoverable-empty-textcontent/expected';
import representativeOnix31TwoManifestations from './representative-onix31-two-manifestations/expected';
import uolpLanguageRoleSourceInvalid from './uolp-language-role-source-invalid/expected';

/** Every registered ONIX regression fixture. A fixture directory that is not listed here fails the harness self-test. */
export const ONIX_REGRESSION_FIXTURES: readonly OnixRegressionFixture[] = [
  representativeOnix31TwoManifestations,
  uolpLanguageRoleSourceInvalid,
  orcidNormalizationRepeatedContributor,
  recoverableEmptyTextContent,
];
