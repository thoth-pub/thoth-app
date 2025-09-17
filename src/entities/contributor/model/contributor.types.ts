import z from 'zod';

import type { Contributor } from '@/gql/graphql';
import { ContributorTypes } from '@/src/shared/constants';

export type ContributorDto = Pick<Contributor, 'contributorId' | 'fullName' | 'orcid' | 'updatedAt' | 'lastName'>;

export type ContributorEntity = {
  id: string;
  name: string;
  orcid: string;
  updatedAt: string;
  lastName: string;
  fullName: string;
};

export type ContributorId = string;

export type ContributionType = z.infer<typeof ContributorTypes>;
