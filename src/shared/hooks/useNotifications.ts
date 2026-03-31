'use client';

import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { NotificationMessage } from '@/src/shared/interfaces';

import { useServices } from '../context';

export const useNotification = () => {
  const { notificationService } = useServices();
  const { t } = useTranslation('notifications');

  const [{ sendSuccessNotification, sendErrorNotification }] = useState(notificationService);

  const sendTranslatedSuccessNotification = useCallback(
    (message: NotificationMessage) => {
      sendSuccessNotification(t(message));
    },
    [sendSuccessNotification, t],
  );

  const sendTranslatedErrorNotification = useCallback(
    (message: NotificationMessage) => {
      sendErrorNotification(t(message));
    },
    [sendErrorNotification, t],
  );

  return {
    sendSuccessNotification: sendTranslatedSuccessNotification,
    sendErrorNotification: sendTranslatedErrorNotification,
  };
};

export default useNotification;
