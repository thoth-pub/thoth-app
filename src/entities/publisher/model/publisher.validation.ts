import z from 'zod';

import { FORM_FIELDS } from '@/src/shared/constants';
import {
  contactTypeValidation,
  getRequiredStringValidation,
  optionalStringValidation,
  optionalUrlValidation,
} from '@/src/shared/utils';

const { PUBLISHER_CONTACT, PUBLISHER_REPORT, PUBLISHER_STATEMENT, PUBLISHER_NAME, PUBLISHER_SHORTNAME, PUBLISHER_URL } =
  FORM_FIELDS;

export const publisherContactValidationSchema = z.object({
  [PUBLISHER_CONTACT.name]: contactTypeValidation,
});

export const publisherReportValidationSchema = z.object({
  [PUBLISHER_REPORT.name]: optionalStringValidation,
});

export const publisherStatementValidationSchema = z.object({
  [PUBLISHER_STATEMENT.name]: optionalStringValidation,
});

export const publisherNameValidationSchema = z.object({
  [PUBLISHER_NAME.name]: getRequiredStringValidation(),
});

export const publisherShortnameValidationSchema = z.object({
  [PUBLISHER_SHORTNAME.name]: optionalStringValidation,
});

export const publisherUrlValidationSchema = z.object({
  [PUBLISHER_URL.name]: optionalUrlValidation,
});

export const newPublisherValidationSchema = z.object({
  [PUBLISHER_NAME.name]: getRequiredStringValidation(),
});
