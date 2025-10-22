import z from 'zod';

import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import {
  getRequiredStringValidation,
  optionalStringValidation,
  optionalUrlValidation,
  seriesTypeValidation,
} from '@/src/shared/utils/validations';

const {
  SERIES_TYPE,
  SERIES_NAME,
  SERIES_ISSN_PRINT,
  SERIES_ISSN_DIGITAL,
  SERIES_IMPRINT,
  SERIES_URL,
  SERIES_DESCRIPTION,
} = FORM_FIELDS;

export const seriesValidationSchema = z.object({
  [SERIES_TYPE.name]: seriesTypeValidation,
  [SERIES_NAME.name]: getRequiredStringValidation(),
  [SERIES_ISSN_PRINT.name]: optionalStringValidation,
  [SERIES_ISSN_DIGITAL.name]: optionalStringValidation,
  [SERIES_URL.name]: optionalUrlValidation,
  [SERIES_DESCRIPTION.name]: optionalStringValidation,
  [SERIES_IMPRINT.name]: getRequiredStringValidation(),
});
