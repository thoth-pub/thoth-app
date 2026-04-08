'use client';

import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { NotificationMessage } from '@/src/shared/interfaces';

import { useServices } from '../context';

export const useNotification = () => {
  const { notificationService } = useServices();
  const { t } = useTranslation('notifications');

  const [{ sendSuccessNotification, sendErrorNotification, sendProgressNotification, dismissNotification }] =
    useState(notificationService);

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

  const sendTranslatedProgressNotification = useCallback(
    (message: NotificationMessage, id: string | number, options?: Record<string, unknown>) => {
      sendProgressNotification(t(message, options), id);
    },
    [sendProgressNotification, t],
  );

  return {
    sendSuccessNotification: sendTranslatedSuccessNotification,
    sendErrorNotification: sendTranslatedErrorNotification,
    sendProgressNotification: sendTranslatedProgressNotification,
    dismissNotification,
  };
};

export default useNotification;
