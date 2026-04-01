import z from 'zod';

import { FORM_FIELDS } from '@/src/shared/constants';
import {
  getRequiredStringValidation,
  optionalStringValidation,
  optionalUrlValidation,
  positiveIntValidation,
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
  WORK_SERIES,
  ISSUE_ORDINAL,
} = FORM_FIELDS;

export const seriesTypeValidationSchema = z.object({
  [SERIES_TYPE.name]: seriesTypeValidation,
});

export const seriesNameValidation = z.object({
  [SERIES_NAME.name]: getRequiredStringValidation(),
});

export const seriesIssnValidation = z.object({
  [SERIES_ISSN_PRINT.name]: optionalStringValidation,
  [SERIES_ISSN_DIGITAL.name]: optionalStringValidation,
});

export const seriesUrlValidation = z.object({
  [SERIES_URL.name]: optionalUrlValidation,
});

export const seriesDescriptionValidation = z.object({
  [SERIES_DESCRIPTION.name]: optionalStringValidation,
});

export const seriesImprintValidation = z.object({
  [SERIES_IMPRINT.name]: getRequiredStringValidation(),
});

const workSeriesValidationSchema = z.object({
  value: getRequiredStringValidation(),
  label: getRequiredStringValidation(),
});

export const issueValidationSchema = z.object({
  [WORK_SERIES.name]: workSeriesValidationSchema,
  [ISSUE_ORDINAL.name]: positiveIntValidation,
});
