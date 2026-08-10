import { toast } from 'sonner';

import type { NotificationMessage } from '@/src/shared/interfaces';

type NotificationAction = {
  label: string;
  onClick: () => void;
};

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
  sendWarningNotification(message: NotificationMessage | string, action?: NotificationAction) {
    toast.warning(message, {
      ...(action ? { action } : {}),
      style: {
        background: 'var(--color-notification-background-system)',
        color: 'var(--color-notification-text-system)',
      },
    });
  }
  sendProgressNotification(message: NotificationMessage | string, id: string | number) {
    toast.loading(message, {
      id,
      style: {
        background: 'var(--color-notification-background-system)',
        color: 'var(--color-notification-text-system)',
      },
      duration: Infinity,
    });
  }
  dismissNotification(id: string | number) {
    toast.dismiss(id);
  }
}
