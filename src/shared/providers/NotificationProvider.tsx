'use client';

import { Toaster } from 'sonner';

const NotificationProvider = () => {
  return (
    <Toaster
      toastOptions={{
        style: {
          color: 'var(--color-notification-text)',
          border: '1px solid var(--color-notification-border)',
        },
      }}
    />
  );
};

export default NotificationProvider;
