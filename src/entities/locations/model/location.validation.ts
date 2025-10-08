import z from 'zod';

import { getRequiredStringValidation, locationPlatformValidation, optionalUrlValidation } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';

const { LOCATIONS, PLATFORM, FULL_TEXT_URL, LANDING_PAGE } = FORM_FIELDS;

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
      [FULL_TEXT_URL.name]: urlValidationSchema,
      [LANDING_PAGE.name]: landingPageValidationSchema,
    }),
  ),
});
