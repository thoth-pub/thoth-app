import { ERRORS } from '@/constants';

export type ErrorMessage = (typeof ERRORS)[keyof typeof ERRORS];
