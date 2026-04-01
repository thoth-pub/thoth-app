import type { WorkId } from '@/src/entities/work/model/work.types';

export type BaseEditSectionProps = {
  workId: WorkId;
};

export type BaseRecommendedSectionProps = BaseEditSectionProps & {
  recommended?: boolean;
};
