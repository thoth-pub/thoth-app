import { SetFragmentFragment, WorkType } from '@/gql/graphql';
import { TitleEntity } from '@/src/shared';

export type SetId = string;

export type SetDto = SetFragmentFragment;

export type SetEntity = { id: SetId; titles: TitleEntity[]; type: WorkType; updatedAt: string };
