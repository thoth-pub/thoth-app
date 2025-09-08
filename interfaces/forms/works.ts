import z from 'zod';

import {
  basicWorkDetailsValidationSchema,
  createWorkValidationSchema,
  editWorkValidationSchema,
} from '@/utils/validations/works';

export type CreateWorkForm = z.infer<typeof createWorkValidationSchema>;

export type EditWorkForm = z.infer<typeof editWorkValidationSchema>;

export type BasicWorkDetailsForm = z.infer<typeof basicWorkDetailsValidationSchema>;
