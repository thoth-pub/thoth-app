import z from 'zod';

import { AwardFragmentFragment } from '@/gql/graphql';
import { AwardRoles as GQLAwardRoles } from '@/src/shared/constants';

export type AwardDto = AwardFragmentFragment;

export type AwardId = string;

export type AwardRole = z.infer<typeof GQLAwardRoles>;

export type AwardEntity = {
  id: AwardId;
  workId: string;
  title: string;
  url: string;
  category: string;
  statement: string;
  role: AwardRole | null;
  orderNumber: number;
};
