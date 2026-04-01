import z from 'zod';

import { FILTER_DIRECTION_OPTIONS } from '../constants/filter';

export type Direction = z.infer<typeof FILTER_DIRECTION_OPTIONS>;
