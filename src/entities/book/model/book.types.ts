import type { WorkFragmentFragment } from '@/gql/graphql';

import type { WorkContribution } from '../../contribution/model/contribution.types';
import type { LanguageEntity } from '../../language/model/language.types';
import { PublicationEntity } from '../../publication/model/publication.types';
import type { WorkIssue, WorkStatus, WorkType } from '../../work/model/work.types';

export type BookDto = WorkFragmentFragment;

export type BookId = string;

export type BookEntity = {
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
  issues: WorkIssue[];
};
