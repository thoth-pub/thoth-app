import z from 'zod';

import type { WorkFragmentFragment } from '@/gql/graphql';
import { WorkType } from '@/src/shared/constants/work';

import {
  createWorkValidationSchema,
  editWorkValidationSchema,
  publicationDateValidationSchema,
  titleValidationSchema,
  workTypeValidationSchema,
} from '../model/work.validation';

export type WorkDto = WorkFragmentFragment;

export type WorkId = string;

export type WorkType = z.infer<typeof WorkType>;

export type WorkEntity = {
  id: string;
  title: string;
  type: WorkType;
  updatedAt: string;
  contributorsNames: string[];
  doi: string;
  publisherName: string;
};

export type CreateWorkForm = z.infer<typeof createWorkValidationSchema>;

export type EditWorkForm = z.infer<typeof editWorkValidationSchema>;

export type TitleForm = z.infer<typeof titleValidationSchema>;

export type WorkTypeForm = z.infer<typeof workTypeValidationSchema>;

export type PublicationDateForm = z.infer<typeof publicationDateValidationSchema>;
