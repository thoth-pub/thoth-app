'use client';

import { useState } from 'react';

import { NotificationService } from '../notifications/notification.service';

const notificationService = new NotificationService();

export const useNotification = () => {
  const [{ sendSuccessNotification, sendErrorNotification }] = useState(notificationService);

  return {
    sendSuccessNotification,
    sendErrorNotification,
  };
};

export default useNotification;
