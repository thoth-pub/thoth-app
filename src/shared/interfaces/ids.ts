import { IDs } from '../constants';

export type Id = (typeof IDs)[keyof typeof IDs];
