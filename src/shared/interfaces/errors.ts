import { ERRORS } from '@/src/shared/constants';

export type ErrorMessage = (typeof ERRORS)[keyof typeof ERRORS];
