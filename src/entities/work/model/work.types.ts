import z from 'zod';

import type { WorkFragmentFragment } from '@/gql/graphql';
import { WorkStatuses, WorkTypes } from '@/src/shared/constants/work';

import {
  copyrightHolderValidationSchema,
  coverUrlValidationSchema,
  createWorkValidationSchema,
  editionValidationSchema,
  imprintValidationSchema,
  landingPageValidationSchema,
  licenseValidationSchema,
  publicationDateValidationSchema,
  titleValidationSchema,
  workStatusValidationSchema,
  workTitlesValidationSchema,
  workTypeValidationSchema,
} from '../model/work.validation';

export type WorkDto = WorkFragmentFragment;

export type WorkId = string;

export type WorkType = z.infer<typeof WorkTypes>;

export type WorkStatus = z.infer<typeof WorkStatuses>;

export type WorkEntity = {
  id: string;
  title: string;
  fullTitle: string;
  type: WorkType;
  updatedAt: string;
  contributorsNames: string[];
  doi: string;
  publisherName: string;
  imprintId: string;
  status: WorkStatus;
  edition?: number | null;
  license?: string | null;
  copyrightHolder?: string | null;
  landingPage?: string | null;
  coverUrl?: string | null;
  publicationDate: string | null;
};

export type CreateWorkForm = z.infer<typeof createWorkValidationSchema>;

export type WorkStatusForm = z.infer<typeof workStatusValidationSchema>;

export type TitleForm = z.infer<typeof titleValidationSchema>;

export type PublicationDateForm = z.infer<typeof publicationDateValidationSchema>;

export type WorkTitlesForm = z.infer<typeof workTitlesValidationSchema>;

export type WorkTypeForm = z.infer<typeof workTypeValidationSchema>;

export type EditionForm = z.infer<typeof editionValidationSchema>;

export type ImprintForm = z.infer<typeof imprintValidationSchema>;

export type LicenseForm = z.infer<typeof licenseValidationSchema>;

export type CopyrightHolderForm = z.infer<typeof copyrightHolderValidationSchema>;

export type LandingPageForm = z.infer<typeof landingPageValidationSchema>;

export type CoverUrlForm = z.infer<typeof coverUrlValidationSchema>;
