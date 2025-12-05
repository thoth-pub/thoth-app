'use client';

import { useState } from 'react';
import { useServices } from '../context';

export const useNotification = () => {
  const { notificationService } = useServices();

  const [{ sendSuccessNotification, sendErrorNotification }] = useState(notificationService);

  return {
    sendSuccessNotification,
    sendErrorNotification,
  };
};

export default useNotification;
