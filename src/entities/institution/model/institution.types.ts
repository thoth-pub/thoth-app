import z from 'zod';

import type { Institution } from '@/gql/graphql';

import { institutionValidationSchema } from './institution.validation';

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

export type InstitutionFormType = z.infer<typeof institutionValidationSchema>;
