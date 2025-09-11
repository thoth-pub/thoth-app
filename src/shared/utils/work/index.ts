import type { WorkType } from '@/src/entities/work/model/work.types';
import { WorkTypes } from '@/src/shared/constants/work';

export const isBookChapter = (workType: WorkType) => workType === WorkTypes.enum.BookChapter;
