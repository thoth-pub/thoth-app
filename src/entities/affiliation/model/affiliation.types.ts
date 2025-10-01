import z from 'zod';

import type { AffiliationFragmentFragment } from '@/gql/graphql';

import { ContributionId } from '../../contributor/model/contributor.types';
import { affiliationsValidationSchema } from './affiliation.validation';

export type AffiliationsForm = z.infer<typeof affiliationsValidationSchema>;

export type AffiliationDto = AffiliationFragmentFragment;

export type AffiliationEntity = {
  id: string;
  contributionId: ContributionId;
  institutionId: string;
  institutionName: string;
  rorId: string;
  position: string;
  orderNumber: number;
};
