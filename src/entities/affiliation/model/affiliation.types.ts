import z from 'zod';

import { affiliationsValidationSchema } from './affiliation.validation';

export type AffiliationsForm = z.infer<typeof affiliationsValidationSchema>;
