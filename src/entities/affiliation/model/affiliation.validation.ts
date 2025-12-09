import z from 'zod';

import { FORM_FIELDS } from '@/src/shared/constants/formFields';

const { AFFILIATIONS, AFFILIATION, POSITION } = FORM_FIELDS;

import { getRequiredStringValidation, optionalStringValidation } from '@/src/shared/utils';

const affiliationValidationSchema = z.object({
  value: getRequiredStringValidation(),
  label: getRequiredStringValidation(),
});

const positionValidationSchema = optionalStringValidation;

export const affiliationsValidationSchema = z.object({
  [AFFILIATIONS.name]: z.array(
    z.object({
      id: getRequiredStringValidation(),
      affiliationId: getRequiredStringValidation(),
      [AFFILIATION.name]: affiliationValidationSchema,
      [POSITION.name]: positionValidationSchema,
    }),
  ),
});
