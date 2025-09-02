import z from 'zod';

import { createWorkValidationSchema } from '@/utils/validations/works';

export type CreateWorkForm = z.infer<typeof createWorkValidationSchema>;
