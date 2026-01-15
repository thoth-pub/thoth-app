import z from 'zod';

import { SetFragmentFragment, WorkStatus, WorkType } from '@/gql/graphql';
import { TitleEntity } from '@/src/shared';

import { setImprintValidationSchema, setTitleValidationSchema } from './set.validation';

export type SetId = string;

export type SetDto = SetFragmentFragment;

export type SetEntity = {
  id: SetId;
  titles: TitleEntity[];
  type: WorkType;
  updatedAt: string;
  imprintId: string;
  status: WorkStatus;
  edition: number;
};

export type SetTitleFormType = z.infer<typeof setTitleValidationSchema>;
export type SetImprintFormType = z.infer<typeof setImprintValidationSchema>;
