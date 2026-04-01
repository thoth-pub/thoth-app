import z from 'zod';

import { ResourceType as GQLResourceType } from '@/gql/graphql';

export const ResourceType = z.enum(GQLResourceType);
