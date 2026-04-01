import { WORK_COPY_VARIANTS } from '../constants';

export type WorkCopyVariant = (typeof WORK_COPY_VARIANTS)[keyof typeof WORK_COPY_VARIANTS];
