import z from 'zod';

import { FORM_FIELDS } from '@/src/shared/constants';
import { getRequiredStringValidation, optionalStringValidation, subjectTypeValidation } from '@/src/shared/utils';

const { SUBJECTS, SUBJECT_TYPE, SUBJECT_CODE, SUBJECT_CODE_ALT } = FORM_FIELDS;

export const subjectValidationSchema = z.object({
  [SUBJECT_CODE.name]: z.object({
    value: getRequiredStringValidation(),
    label: getRequiredStringValidation(),
  }),
});

export const subjectAltValidationSchema = z.object({
  [SUBJECT_CODE_ALT.name]: optionalStringValidation,
});

export const subjectsValidationSchema = z.object({
  [SUBJECTS.name]: z.array(
    z.object({
      subjectId: getRequiredStringValidation(),
      [SUBJECT_TYPE.name]: subjectTypeValidation,
      [SUBJECT_CODE.name]: z.optional(
        z.object({
          value: getRequiredStringValidation(),
          label: getRequiredStringValidation(),
        }),
      ),
      [SUBJECT_CODE_ALT.name]: optionalStringValidation,
    }),
  ),
});

export const addSubjectValidationSchema = z.object({
  [SUBJECT_TYPE.name]: subjectTypeValidation,
  [SUBJECT_CODE.name]: getRequiredStringValidation(),
});

export const addSubjectAutocompleteValidationSchema = z.object({
  [SUBJECT_TYPE.name]: subjectTypeValidation,
  [SUBJECT_CODE.name]: z.object({
    value: getRequiredStringValidation(),
    label: getRequiredStringValidation(),
  }),
});
