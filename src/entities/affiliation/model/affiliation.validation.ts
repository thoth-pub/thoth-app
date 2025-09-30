import z from 'zod';

import { FORM_FIELDS } from '@/src/shared/constants/formFields';

const { AFFILIATIONS, AFFILIATION, POSITION } = FORM_FIELDS;

import { getRequiredStringValidation } from '@/src/shared/utils';

const affiliationValidationSchema = z.object({
  value: getRequiredStringValidation(),
  label: getRequiredStringValidation(),
});

const positionValidationSchema = getRequiredStringValidation();

export const affiliationsValidationSchema = z.object({
  [AFFILIATIONS.name]: z.array(
    z.object({
      id: getRequiredStringValidation(),
      [AFFILIATION.name]: affiliationValidationSchema,
      [POSITION.name]: positionValidationSchema,
    }),
  ),
});
