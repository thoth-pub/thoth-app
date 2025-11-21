import z from 'zod';

import type { Contribution, ContributionType, WorkFragmentFragment } from '@/gql/graphql';
import { WorkStatuses, WorkTypes } from '@/src/shared/constants/work';

import type { AffiliationEntity } from '../../affiliation';
import type { ContributorId } from '../../contributor/model/contributor.types';
import type { FundingEntity } from '../../funding/model/funding.types';
import type { LanguageEntity } from '../../language/model/language.types';
import { PublicationEntity } from '../../publication/model/publication.types';
import { ReferenceEntity } from '../../reference/model/reference.types';
import type { SubjectEntity } from '../../subject/model/subject.types';
import {
  coverUrlValidationSchema,
  createWorkValidationSchema,
  doiAndCoversValidationSchema,
  editionValidationSchema,
  imprintValidationSchema,
  licenseAndCopyrightHolderValidationSchema,
  mediaValidationSchema,
  pagesCountValidationSchema,
  publicationDateValidationSchema,
  titleValidationSchema,
  workTitlesValidationSchema,
  workTypeValidationSchema,
} from '../model/work.validation';

export type WorkDto = WorkFragmentFragment;

export type WorkContributionDto = Partial<Contribution>;

export type WorkId = string;

export type WorkType = z.infer<typeof WorkTypes>;

export type WorkStatus = z.infer<typeof WorkStatuses>;

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

export type WorkIssue = {
  id: string;
  ordinal: number;
  seriesId: string;
  seriesName: string;
};

export type WorkEntity = {
  id: string;
  title: string;
  subtitle: string;
  fullTitle: string;
  bibliographyNote: string;
  type: WorkType;
  updatedAt: string;
  contributorsNames: string[];
  doi: string;
  lccn: string;
  oclc: string;
  publisherName: string;
  imprintId: string;
  status: WorkStatus;
  edition?: number | null;
  license?: string | null;
  copyrightHolder?: string | null;
  landingPage?: string | null;
  coverUrl?: string | null;
  publicationDate: string | null;
  withdrawnDate: string | null;
  reference?: string | null;
  contributions: WorkContribution[];
  imageCount: number;
  tableCount: number;
  audioCount: number;
  videoCount: number;
  pageCount: number;
  frontmatterCount: number;
  backmatterCount: number;
  languages: LanguageEntity[];
  publications: PublicationEntity[];
  fundings: FundingEntity[];
  references: ReferenceEntity[];
  subjects: SubjectEntity[];
  issues: WorkIssue[];
  firstPage: string;
  lastPage: string;
};

export type CreateWorkForm = z.infer<typeof createWorkValidationSchema>;

export type TitleForm = z.infer<typeof titleValidationSchema>;

export type PublicationDateForm = z.infer<typeof publicationDateValidationSchema>;

export type WorkTitlesForm = z.infer<typeof workTitlesValidationSchema>;

export type WorkTypeForm = z.infer<typeof workTypeValidationSchema>;

export type EditionForm = z.infer<typeof editionValidationSchema>;

export type ImprintForm = z.infer<typeof imprintValidationSchema>;

export type LicenseAndCopyrightHolderForm = z.infer<typeof licenseAndCopyrightHolderValidationSchema>;

export type DoiAndCoversForm = z.infer<typeof doiAndCoversValidationSchema>;

export type MediaForm = z.infer<typeof mediaValidationSchema>;

export type PagesCountForm = z.infer<typeof pagesCountValidationSchema>;

export type CoverUrlForm = z.infer<typeof coverUrlValidationSchema>;
