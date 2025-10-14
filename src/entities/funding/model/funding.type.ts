import z from 'zod';

import type { FundingFragmentFragment } from '@/gql/graphql';

import {
  grantNumberValidationSchema,
  jurisdictionValidationSchema,
  programValidationSchema,
  projectNameValidationSchema,
  projectShortNameValidationSchema,
} from './funding.validation';

export type FundingDto = FundingFragmentFragment;

export type FundingId = string;

export type FundingEntity = {
  id: FundingId;
  grantNumber: string;
  institutionId: string;
  jurisdiction: string;
  program: string;
  projectName: string;
  projectShortname: string;
  institutionName: string;
  institutionRor: string;
};

export type FundingProjectNameFormType = z.infer<typeof projectNameValidationSchema>;

export type FundingProjectShortNameFormType = z.infer<typeof projectShortNameValidationSchema>;

export type FundingJurisdictionFormType = z.infer<typeof jurisdictionValidationSchema>;

export type FundingProgramFormType = z.infer<typeof programValidationSchema>;

export type FundingGrantNumberFormType = z.infer<typeof grantNumberValidationSchema>;
