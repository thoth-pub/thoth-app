import z from 'zod';

import type { ReferenceFragmentFragment } from '@/gql/graphql';

import { referenceValidationSchema } from './reference.validation';

export type ReferenceDto = ReferenceFragmentFragment;

export type ReferenceId = string;

export type ReferenceEntity = {
  id: ReferenceId;
  doi: string;
  journalTitle: string;
  articleTitle: string;
  seriesTitle: string;
  volumeTitle: string;
  url: string;
  orderNumber: number;
  unstructuredCitation: string;
};

export type ReferenceUrlForm = z.infer<typeof referenceValidationSchema>;
