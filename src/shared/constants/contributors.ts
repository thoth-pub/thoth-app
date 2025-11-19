import z from 'zod';

import { ContributionType as GQLContributionType } from '@/gql/graphql';
import { ContributorEntity } from '@/src/entities/contributor/model/contributor.types';
import { appConfig } from '../config';

export const ContributorTypes = z.enum(GQLContributionType);

export const getDefaultContributor = (data?: Partial<ContributorEntity>): ContributorEntity => {
  return {
    id: appConfig.defaultId,
    name: '',
    orcid: '',
    updatedAt: '',
    lastName: '',
    fullName: '',
    firstName: '',
    website: '',
    ...data,
  };
};
