'use client';

import { useEffect, useRef } from 'react';

import { NOTIFICATIONS } from '@/src/shared/constants';
import useNotification from '@/src/shared/hooks/useNotifications';

import { FormStateMachineContext } from './forms.provider';

const FormBlockedFeedback = () => {
  const attentionRequest = FormStateMachineContext.useSelector((state) => state.context.attentionRequest);
  const previousAttentionRequest = useRef(attentionRequest);
  const { sendWarningNotification } = useNotification();

  useEffect(() => {
    if (attentionRequest > previousAttentionRequest.current) {
      sendWarningNotification(NOTIFICATIONS.ACTIVE_FORM_BLOCKED);
    }

    previousAttentionRequest.current = attentionRequest;
  }, [attentionRequest, sendWarningNotification]);

  return null;
};

export default FormBlockedFeedback;
