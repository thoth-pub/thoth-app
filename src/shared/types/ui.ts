import type { WorkId } from '@/src/entities/work/model/work.types';
import type { QueryToken } from '@/src/shared';

export type BaseRecommendedSectionProps = {
  workId: WorkId;
  queryToken: QueryToken;
  recommended?: boolean;
};
