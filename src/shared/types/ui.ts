import type { WorkId } from '@/src/entities/work/model/work.types';
import type { QueryToken } from '@/src/shared';

export type BaseEditSectionProps = {
  workId: WorkId;
  queryToken: QueryToken;
};

export type BaseRecommendedSectionProps = BaseEditSectionProps & {
  recommended?: boolean;
};
