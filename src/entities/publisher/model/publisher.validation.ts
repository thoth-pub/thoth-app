import z from 'zod';

import { contactTypeValidation, optionalStringValidation } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';

const { PUBLISHER_CONTACT, PUBLISHER_REPORT, PUBLISHER_STATEMENT } = FORM_FIELDS;

export const publisherContactValidationSchema = z.object({
  [PUBLISHER_CONTACT.name]: contactTypeValidation,
});

export const publisherReportValidationSchema = z.object({
  [PUBLISHER_REPORT.name]: optionalStringValidation,
});

export const publisherStatementValidationSchema = z.object({
  [PUBLISHER_STATEMENT.name]: optionalStringValidation,
});
