import z from 'zod';

import { Biography, ContributionType } from '@/gql/graphql';
import type { ImportedMarkupFormat, LocaleCodeType } from '@/src/shared/types';

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
  /**
   * The markup format the content arrived in, when this biography came from a bulk import whose
   * source declared one. Creation intent only: `BiographyDtoMapper` never maps it, so it cannot
   * reach a GraphQL data DTO, and entities read back from the API never carry it. Absent for
   * everything created in the editor, which keeps the existing content-sniffing behaviour.
   */
  sourceMarkupFormat?: ImportedMarkupFormat;
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
