import { toast } from 'sonner';

import type { NotificationMessage } from '@/interfaces';

export class NotificationService {
  sendSuccessNotification(message: NotificationMessage) {
    toast.success(message, {
      style: {
        background: 'var(--color-notification-background-success)',
      },
    });
  }
  sendErrorNotification(message: NotificationMessage) {
    toast.error(message, {
      style: {
        background: 'var(--color-notification-background-error)',
      },
    });
  }
}
