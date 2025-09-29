import z from 'zod';

import {
  contributorBiographyValidationSchema,
  contributorTypeValidationSchema,
  namesFormValidationSchema,
} from './contribution.validation';

export type ContributionNamesForm = z.infer<typeof namesFormValidationSchema>;

export type ContributionTypeForm = z.infer<typeof contributorTypeValidationSchema>;

export type ContributionBiographyForm = z.infer<typeof contributorBiographyValidationSchema>;
