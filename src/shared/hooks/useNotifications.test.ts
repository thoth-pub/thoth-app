import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSendSuccess = vi.fn();
const mockSendError = vi.fn();
const mockSendWarning = vi.fn();
const mockSendProgress = vi.fn();
const mockDismiss = vi.fn();

vi.mock('@/src/shared/context', () => ({
  useServices: () => ({
    notificationService: {
      sendSuccessNotification: mockSendSuccess,
      sendErrorNotification: mockSendError,
      sendWarningNotification: mockSendWarning,
      sendProgressNotification: mockSendProgress,
      dismissNotification: mockDismiss,
    },
  }),
}));

const mockT = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: mockT }),
}));

import useNotification from './useNotifications';

describe('useNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return all notification methods', () => {
    const { result } = renderHook(() => useNotification());

    expect(result.current.sendSuccessNotification).toBeDefined();
    expect(result.current.sendErrorNotification).toBeDefined();
    expect(result.current.sendWarningNotification).toBeDefined();
    expect(result.current.sendProgressNotification).toBeDefined();
    expect(result.current.dismissNotification).toBeDefined();
  });

  it('sendSuccessNotification should translate and call notificationService', () => {
    mockT.mockReturnValue('Translated success');
    const { result } = renderHook(() => useNotification());

    result.current.sendSuccessNotification('success.key', { name: 'Test' });

    expect(mockT).toHaveBeenCalledWith('success.key', { name: 'Test' });
    expect(mockSendSuccess).toHaveBeenCalledWith('Translated success');
  });

  it('sendErrorNotification should translate and call notificationService', () => {
    mockT.mockReturnValue('Translated error');
    const { result } = renderHook(() => useNotification());

    result.current.sendErrorNotification('error.key');

    expect(mockT).toHaveBeenCalledWith('error.key', undefined);
    expect(mockSendError).toHaveBeenCalledWith('Translated error');
  });

  it('sendProgressNotification should translate and call notificationService with id', () => {
    mockT.mockReturnValue('Translated progress');
    const { result } = renderHook(() => useNotification());

    result.current.sendProgressNotification('progress.key', 'task-1', { count: 3 });

    expect(mockT).toHaveBeenCalledWith('progress.key', { count: 3 });
    expect(mockSendProgress).toHaveBeenCalledWith('Translated progress', 'task-1');
  });

  it('sendWarningNotification should translate and call notificationService', () => {
    mockT.mockReturnValue('Translated warning');
    const { result } = renderHook(() => useNotification());

    result.current.sendWarningNotification('warning.key');

    expect(mockT).toHaveBeenCalledWith('warning.key', undefined);
    expect(mockSendWarning).toHaveBeenCalledWith('Translated warning', undefined);
  });

  it('sendWarningNotification should translate its action label', () => {
    const onClick = vi.fn();
    mockT.mockImplementation((key: string) => `translated:${key}`);
    const { result } = renderHook(() => useNotification());

    result.current.sendWarningNotification('warning.key', undefined, { label: 'action.key', onClick });

    expect(mockSendWarning).toHaveBeenCalledWith('translated:warning.key', {
      label: 'translated:action.key',
      onClick,
    });
  });

  it('dismissNotification should call notificationService dismiss', () => {
    const { result } = renderHook(() => useNotification());

    result.current.dismissNotification('task-1');

    expect(mockDismiss).toHaveBeenCalledWith('task-1');
  });
});
