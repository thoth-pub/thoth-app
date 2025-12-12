import { WorkContribution } from '@/src/entities/contribution/model/contribution.types';
import { WorkEntity, WorkId } from '@/src/entities/work/model/work.types';

export type ContributorSelection = {
  lastContribution: string;
  selected: boolean;
} & WorkContribution;

export type ContributorsForSelection = Record<WorkId, Record<string, ContributorSelection[]>>;

export type SeriesForUpdateItem = WorkEntity & {
  orderNumber: number;
};

export type SeriesForUpdateItems = Record<string, SeriesForUpdateItem[]>;
