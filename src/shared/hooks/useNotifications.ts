'use client';

import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { NotificationMessage } from '@/src/shared/interfaces';

import { useServices } from '../context';

type TranslatedNotificationAction = {
  label: NotificationMessage;
  onClick: () => void;
};

export const useNotification = () => {
  const { notificationService } = useServices();
  const { t } = useTranslation('notifications');

  const [
    {
      sendSuccessNotification,
      sendErrorNotification,
      sendWarningNotification,
      sendProgressNotification,
      dismissNotification,
    },
  ] = useState(notificationService);

  const sendTranslatedSuccessNotification = useCallback(
    (message: NotificationMessage, options?: Record<string, unknown>) => {
      sendSuccessNotification(t(message, options));
    },
    [sendSuccessNotification, t],
  );

  const sendTranslatedErrorNotification = useCallback(
    (message: NotificationMessage, options?: Record<string, unknown>) => {
      sendErrorNotification(t(message, options));
    },
    [sendErrorNotification, t],
  );

  const sendTranslatedWarningNotification = useCallback(
    (message: NotificationMessage, options?: Record<string, unknown>, action?: TranslatedNotificationAction) => {
      sendWarningNotification(t(message, options), action ? { ...action, label: t(action.label) } : undefined);
    },
    [sendWarningNotification, t],
  );

  const sendTranslatedProgressNotification = useCallback(
    (message: NotificationMessage, id: string | number, options?: Record<string, unknown>) => {
      sendProgressNotification(t(message, options), id);
    },
    [sendProgressNotification, t],
  );

  return {
    sendSuccessNotification: sendTranslatedSuccessNotification,
    sendErrorNotification: sendTranslatedErrorNotification,
    sendWarningNotification: sendTranslatedWarningNotification,
    sendProgressNotification: sendTranslatedProgressNotification,
    dismissNotification,
  };
};

export default useNotification;
