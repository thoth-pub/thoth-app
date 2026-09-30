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
  /**
   * The cited book's ISBN and the cited series' ISSN, as the API holds them. Optional: every form that edits a Reference
   * predates them, and one that leaves them out sends neither, exactly as before. An ONIX import sets them only where the
   * cited product's declared identifier type is one (thoth-app#224).
   */
  isbn?: string;
  issn?: string;
};

export type ReferenceUrlForm = z.infer<typeof referenceValidationSchema>;
