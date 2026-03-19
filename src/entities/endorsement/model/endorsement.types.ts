import type { z } from 'zod';

import type { EndorsementFragmentFragment } from '@/gql/graphql';

import { endorsementAuthorInstitutionValidationSchema } from './endorsement.validation';

export type EndorsementDto = EndorsementFragmentFragment;

export type EndorsementId = string;

export type EndorsementEntity = {
  id: EndorsementId;
  workId: string;
  authorName: string;
  authorRole: string;
  authorInstitutionId: string;
  authorInstitutionName: string;
  authorInstitutionRor: string;
  url: string;
  text: string;
  orderNumber: number;
};

export type EndorsementAuthorInstitutionForm = z.infer<typeof endorsementAuthorInstitutionValidationSchema>;
