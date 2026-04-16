import z from 'zod';

import { FORM_FIELDS } from '@/src/shared/constants';
import {
  currencyCodeValidation,
  doiValidation,
  getRequiredStringValidation,
  languageValidation,
  optionalStringValidation,
  optionalUrlValidation,
} from '@/src/shared/utils/validations';

const { IMPRINT, IMPRINT_URL, CROSSMARK_DOI, DEFAULT_PLACE, DEFAULT_CURRENCY, DEFAULT_LOCALE, S3_BUCKET, CDN_DOMAIN, CLOUDFRONT_DIST_ID } = FORM_FIELDS;

export const imprintValidationSchema = z.object({
  [IMPRINT.name]: getRequiredStringValidation(),
  [IMPRINT_URL.name]: optionalUrlValidation,
  [CROSSMARK_DOI.name]: doiValidation,
  [DEFAULT_PLACE.name]: optionalStringValidation,
  [DEFAULT_CURRENCY.name]: z.object({ value: currencyCodeValidation, label: getRequiredStringValidation() }),
  [DEFAULT_LOCALE.name]: z.object({ value: languageValidation, label: getRequiredStringValidation() }),
});

export const imprintAdminValidationSchema = imprintValidationSchema.extend({
  [S3_BUCKET.name]: optionalStringValidation,
  [CDN_DOMAIN.name]: optionalStringValidation,
  [CLOUDFRONT_DIST_ID.name]: optionalStringValidation,
});
