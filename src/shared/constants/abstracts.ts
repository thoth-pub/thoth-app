import z from 'zod';

import { AbstractType as GQLAbstractType } from '@/gql/graphql';

export const AbstractTypes = z.enum(GQLAbstractType);
