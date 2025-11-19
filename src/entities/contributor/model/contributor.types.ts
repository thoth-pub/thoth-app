import z from 'zod';

import type { Contributor } from '@/gql/graphql';
import { ContributorTypes } from '@/src/shared/constants';

export type ContributorDto = Pick<
  Contributor,
  'contributorId' | 'fullName' | 'orcid' | 'updatedAt' | 'lastName' | 'website' | 'firstName'
>;

export type ContributionId = string;

export type ContributorId = string;

export type ContributorName = string;

export type ContributorEntity = {
  id: ContributorId;
  name: ContributorName;
  orcid: string;
  updatedAt: string;
  lastName: string;
  fullName: string;
  firstName: string;
  website: string;
};

export type ContributionType = z.infer<typeof ContributorTypes>;
