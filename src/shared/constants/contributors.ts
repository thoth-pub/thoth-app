import z from 'zod';

import { ContributionType as GQLContributionType } from '@/gql/graphql';

export const ContributorTypes = z.enum(GQLContributionType);
