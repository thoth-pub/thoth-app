import type { Institution } from '@/gql/graphql';

export type InstitutionDto = Pick<
  Institution,
  'institutionId' | 'institutionName' | 'institutionDoi' | 'ror' | 'countryCode' | 'updatedAt'
>;

export type InstitutionEntity = {
  id: string;
  name: string;
  doi: string;
  ror: string;
  countryCode: string;
  updatedAt: string;
};
