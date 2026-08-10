'use client';

import { useEffect, useRef } from 'react';

import { NOTIFICATIONS } from '@/src/shared/constants';
import useNotification from '@/src/shared/hooks/useNotifications';

import { useActiveFormNavigation } from './ActiveFormNavigation';
import { FormStateMachineContext } from './forms.provider';

const FormBlockedFeedback = () => {
  const activeFormId = FormStateMachineContext.useSelector((state) => state.context.activeForm);
  const blockedEditRequest = FormStateMachineContext.useSelector((state) => state.context.blockedEditRequest);
  const previousBlockedEditRequest = useRef(blockedEditRequest);
  const { goToActiveForm } = useActiveFormNavigation();
  const { sendWarningNotification } = useNotification();

  useEffect(() => {
    if (blockedEditRequest > previousBlockedEditRequest.current) {
      sendWarningNotification(NOTIFICATIONS.ACTIVE_FORM_BLOCKED, undefined, {
        label: NOTIFICATIONS.ACTIVE_FORM_GO_TO_OPEN_EDIT,
        onClick: () => goToActiveForm(activeFormId),
      });
    }

    previousBlockedEditRequest.current = blockedEditRequest;
  }, [activeFormId, blockedEditRequest, goToActiveForm, sendWarningNotification]);

  return null;
};

export default FormBlockedFeedback;
