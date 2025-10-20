import { toast } from 'sonner';

import type { NotificationMessage } from '@/src/shared/interfaces';

export class NotificationService {
  sendSuccessNotification(message: NotificationMessage) {
    toast.success(message, {
      style: {
        background: 'var(--color-notification-background-success)',
      },
    });
  }
  sendErrorNotification(message: NotificationMessage | string) {
    toast.error(message, {
      style: {
        background: 'var(--color-notification-background-error)',
      },
    });
  }
}
