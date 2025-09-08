import z from 'zod';

import { WorkStatus as GQLWorkStatus, WorkType as GQLWorkType } from '@/gql/graphql';

export const WorkType = z.enum(GQLWorkType);

export const WorkStatus = z.enum(GQLWorkStatus);
