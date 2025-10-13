import z from 'zod';

import { FILTER_OPTIONS } from '../constants/filter';

export type Direction = z.infer<typeof FILTER_OPTIONS>;
