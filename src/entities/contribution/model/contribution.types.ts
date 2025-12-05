import z from 'zod';

import { ContributionType } from '@/gql/graphql';

import { AffiliationEntity } from '../../affiliation/model/affiliation.types';
import { ContributorId } from '../../contributor/model/contributor.types';
import {
  contributorBiographyValidationSchema,
  contributorTypeValidationSchema,
  namesFormValidationSchema,
} from './contribution.validation';

export type ContributionNamesForm = z.infer<typeof namesFormValidationSchema>;

export type ContributionTypeForm = z.infer<typeof contributorTypeValidationSchema>;

export type ContributionBiographyForm = z.infer<typeof contributorBiographyValidationSchema>;

export type WorkContribution = {
  fullName: string;
  lastName: string;
  firstName: string;
  id: string;
  contributorId: ContributorId;
  type: ContributionType;
  isMain: boolean;
  orderNumber: number;
  biography: string;
  orcidId: string;
  website: string;
  affiliations: AffiliationEntity[];
};
