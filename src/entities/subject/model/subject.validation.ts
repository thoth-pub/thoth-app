import z from 'zod';

import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { getRequiredStringValidation, subjectTypeValidation } from '@/src/shared/utils';

const { SUBJECTS, SUBJECT_TYPE, SUBJECT_CODE } = FORM_FIELDS;

export const subjectsValidationSchema = z.object({
  [SUBJECTS.name]: z.array(
    z.object({
      subjectId: getRequiredStringValidation(),
      [SUBJECT_TYPE.name]: subjectTypeValidation,
      [SUBJECT_CODE.name]: getRequiredStringValidation(),
    }),
  ),
});
