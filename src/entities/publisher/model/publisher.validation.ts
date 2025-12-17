import z from 'zod';

import { contactTypeValidation } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';

const { PUBLISHER_CONTACT } = FORM_FIELDS;

export const publisherContactValidationSchema = z.object({
  [PUBLISHER_CONTACT.name]: contactTypeValidation,
});
