import z from 'zod';

import { LocationPlatform as GQLLocationPlatform } from '@/gql/graphql';

export const LocationPlatforms = z.enum(GQLLocationPlatform);
