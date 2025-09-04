import z from 'zod';

import { createWorkValidationSchema, editWorkValidationSchema } from '@/utils/validations/works';

export type CreateWorkForm = z.infer<typeof createWorkValidationSchema>;

export type EditWorkForm = z.infer<typeof editWorkValidationSchema>;
