import z from 'zod';

import { Direction } from '@/gql/graphql';

export const FILTER_OPTIONS = z.enum(Direction);
