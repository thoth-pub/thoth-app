import z from 'zod';

import { SetFragmentFragment, WorkStatus, WorkType } from '@/gql/graphql';
import { TitleDto, TitleEntity } from '@/src/shared/types';

import type { WorkId } from '../../work/model/work.types';
import { setImprintValidationSchema, setTitleValidationSchema, setWorkValidationSchema } from './set.validation';

export type SetId = string;

export type SetDto = SetFragmentFragment;

export type SetWorkDto = {
  relations: {
    relationOrdinal: number;
    workRelationId: WorkId;
    relatedWorkId: WorkId;
    relatedWork: {
      titles: TitleDto[];
    };
  }[];
};

export type SetEntity = {
  id: SetId;
  titles: TitleEntity[];
  type: WorkType;
  updatedAt: string;
  imprintId: string;
  status: WorkStatus;
  edition: number;
  volumesCount: number;
  covers: string[];
};

export type SetWorkEntity = {
  id: string;
  workId: WorkId;
  ordinal: number;
  titles: TitleEntity[];
};

export type SetTitleFormType = z.infer<typeof setTitleValidationSchema>;
export type SetImprintFormType = z.infer<typeof setImprintValidationSchema>;
export type SetWorkFormType = z.infer<typeof setWorkValidationSchema>;
