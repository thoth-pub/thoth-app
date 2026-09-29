import type { OnixRegressionFixture } from '../types';
import representativeOnix31TwoManifestations from './representative-onix31-two-manifestations/expected';

/** Every registered ONIX regression fixture. A fixture directory that is not listed here fails the harness self-test. */
export const ONIX_REGRESSION_FIXTURES: readonly OnixRegressionFixture[] = [representativeOnix31TwoManifestations];
