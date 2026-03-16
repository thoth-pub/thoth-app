import z from 'zod';

import { AwardRole as GQLAwardRole } from '@/gql/graphql';

export const AwardRoles = z.enum(GQLAwardRole);
