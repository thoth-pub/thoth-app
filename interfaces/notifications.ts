import { NOTIFICATIONS } from '@/constants';

export type NotificationMessage = (typeof NOTIFICATIONS)[keyof typeof NOTIFICATIONS];
