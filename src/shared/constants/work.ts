import z from 'zod';

import { WorkStatus as GQLWorkStatus, WorkType as GQLWorkType } from '@/gql/graphql';

export const WorkTypes = z.enum(GQLWorkType);

export const WorkStatuses = z.enum(GQLWorkStatus);
