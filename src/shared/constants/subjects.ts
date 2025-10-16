import z from 'zod';

import { SubjectType as GQLSubjectType } from '@/gql/graphql';

export const SubjectTypes = z.enum(GQLSubjectType);
