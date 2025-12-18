import z from 'zod';

import { Biography, ContributionType } from '@/gql/graphql';
import { LocaleCodeType } from '@/src/shared';

import { AffiliationEntity } from '../../affiliation/model/affiliation.types';
import { ContributorId } from '../../contributor/model/contributor.types';
import {
  contributorBiographyValidationSchema,
  contributorTypeValidationSchema,
  namesFormValidationSchema,
} from './contribution.validation';

export type BiographyDto = Pick<Biography, 'biographyId' | 'canonical' | 'content' | 'localeCode' | 'contributionId'>;

export type ContributionNamesForm = z.infer<typeof namesFormValidationSchema>;

export type ContributionTypeForm = z.infer<typeof contributorTypeValidationSchema>;

export type ContributionBiographyForm = z.infer<typeof contributorBiographyValidationSchema>;

export type BiographyEntity = {
  id: string;
  canonical: boolean;
  content: string;
  localeCode: LocaleCodeType;
  contributionId: string;
};

export type WorkContribution = {
  fullName: string;
  lastName: string;
  firstName: string;
  id: string;
  contributorId: ContributorId;
  type: ContributionType;
  isMain: boolean;
  orderNumber: number;
  biographies: BiographyEntity[];
  orcidId: string;
  website: string;
  affiliations: AffiliationEntity[];
};
