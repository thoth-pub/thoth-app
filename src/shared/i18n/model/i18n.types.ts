import { z } from 'zod';

import { LOCALES } from '@/src/shared/constants';

export type Locale = z.infer<typeof LOCALES>;

export const RESOURCES = z.enum(['Basic details']);
