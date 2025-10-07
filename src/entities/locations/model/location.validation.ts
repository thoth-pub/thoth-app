import z from 'zod';

import {
  booleanValidation,
  getRequiredStringValidation,
  locationPlatformValidation,
  optionalUrlValidation,
} from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';

const { LOCATIONS, PLATFORM, CANONICAL, URL, LANDING_PAGE } = FORM_FIELDS;

const locationValidationSchema = z.object({
  value: locationPlatformValidation,
  label: getRequiredStringValidation(),
});

const urlValidationSchema = optionalUrlValidation;

const landingPageValidationSchema = optionalUrlValidation;

export const locationsValidationSchema = z.object({
  [LOCATIONS.name]: z.array(
    z.object({
      platformId: getRequiredStringValidation(),
      [PLATFORM.name]: locationValidationSchema,
      [CANONICAL.name]: booleanValidation,
      [URL.name]: urlValidationSchema,
      [LANDING_PAGE.name]: landingPageValidationSchema,
    }),
  ),
});
