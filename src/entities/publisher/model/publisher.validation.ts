import z from 'zod';

import { FORM_FIELDS } from '@/src/shared/constants';
import { contactTypeValidation, getRequiredStringValidation, optionalStringValidation } from '@/src/shared/utils';

const { PUBLISHER_CONTACT, PUBLISHER_REPORT, PUBLISHER_STATEMENT, PUBLISHER_NAME } = FORM_FIELDS;

export const publisherContactValidationSchema = z.object({
  [PUBLISHER_CONTACT.name]: contactTypeValidation,
});

export const publisherReportValidationSchema = z.object({
  [PUBLISHER_REPORT.name]: optionalStringValidation,
});

export const publisherStatementValidationSchema = z.object({
  [PUBLISHER_STATEMENT.name]: optionalStringValidation,
});

export const newPublisherValidationSchema = z.object({
  [PUBLISHER_NAME.name]: getRequiredStringValidation(),
});
