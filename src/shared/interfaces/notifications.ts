import { NOTIFICATIONS } from '@/src/shared/constants';

export type NotificationMessage = (typeof NOTIFICATIONS)[keyof typeof NOTIFICATIONS];
