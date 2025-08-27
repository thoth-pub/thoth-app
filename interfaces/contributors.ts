import type { Contributor } from '@/gql/graphql';

export type ContributorDto = Pick<Contributor, 'contributorId' | 'fullName' | 'orcid' | 'updatedAt'>;

export type ContributorEntity = {
  id: string;
  name: string;
  orcid: string;
  updatedAt: string;
};
