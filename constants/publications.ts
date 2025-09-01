import z from 'zod';

import { PublicationType as GQLPublicationType } from '@/gql/graphql';

export const PublicationType = z.enum(GQLPublicationType);
