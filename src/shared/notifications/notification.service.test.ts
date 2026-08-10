import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

import { toast } from 'sonner';

import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new NotificationService();
  });

  it('sendSuccessNotification should call toast.success with message and style', () => {
    service.sendSuccessNotification('Success!');

    expect(toast.success).toHaveBeenCalledWith('Success!', {
      style: { background: 'var(--color-notification-background-success)' },
    });
  });

  it('sendErrorNotification should call toast.error with message and style', () => {
    service.sendErrorNotification('Error!');

    expect(toast.error).toHaveBeenCalledWith('Error!', {
      style: { background: 'var(--color-notification-background-error)' },
    });
  });

  it('sendProgressNotification should call toast.loading with message, id, and style', () => {
    service.sendProgressNotification('Loading...', 'progress-1');

    expect(toast.loading).toHaveBeenCalledWith('Loading...', {
      id: 'progress-1',
      style: {
        background: 'var(--color-notification-background-system)',
        color: 'var(--color-notification-text-system)',
      },
      duration: Infinity,
    });
  });

  it('sendWarningNotification should call toast.warning with message and style', () => {
    service.sendWarningNotification('Warning!');

    expect(toast.warning).toHaveBeenCalledWith('Warning!', {
      style: {
        background: 'var(--color-notification-background-system)',
        color: 'var(--color-notification-text-system)',
      },
    });
  });

  it('dismissNotification should call toast.dismiss with the given id', () => {
    service.dismissNotification('toast-1');

    expect(toast.dismiss).toHaveBeenCalledWith('toast-1');
  });

  it('should handle numeric ids for progress and dismiss', () => {
    service.sendProgressNotification('Working', 42);
    expect(toast.loading).toHaveBeenCalledWith('Working', expect.objectContaining({ id: 42 }));

    service.dismissNotification(42);
    expect(toast.dismiss).toHaveBeenCalledWith(42);
  });
});
