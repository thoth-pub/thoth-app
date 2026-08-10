'use client';

import { createContext, type ReactNode, use, useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { NOTIFICATIONS } from '@/src/shared/constants';
import type { Id } from '@/src/shared/interfaces';
import { Button, Paper, Typography } from '@/src/shared/ui';

import { FormStateMachineContext } from './forms.provider';
import { useRequestFormAttention } from './hooks/useFormStateMachine';

type ActiveFormTarget = {
  formId: Id;
  element: HTMLFormElement;
  label?: string;
};

type ActiveFormNavigationContextValue = {
  goToActiveForm: (expectedFormId?: Id | null) => void;
  registerActiveForm: (target: ActiveFormTarget) => () => void;
};

const noop = () => {};

const ActiveFormNavigationContext = createContext<ActiveFormNavigationContextValue>({
  goToActiveForm: noop,
  registerActiveForm: () => noop,
});

const ActiveFormIndicator = ({ label, onGoToEdit }: { label?: string; onGoToEdit: () => void }) => {
  const { t } = useTranslation('notifications');

  return (
    <Paper
      component="aside"
      role="status"
      elevation={2}
      className="fixed bottom-4 left-1/2 z-[1200] flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 rounded-full border border-(--color-hover-border) bg-(--color-form-background) px-4 py-2 text-(--color-typography)"
    >
      <Typography component="span" className="min-w-0 truncate text-inherit">
        {label ? t(NOTIFICATIONS.ACTIVE_FORM_EDITING_LABEL, { label }) : t(NOTIFICATIONS.ACTIVE_FORM_EDITING)}
      </Typography>
      <Button variant="text" className="min-h-11 shrink-0 normal-case" onClick={() => onGoToEdit()}>
        {t(NOTIFICATIONS.ACTIVE_FORM_GO_TO_EDIT)}
      </Button>
    </Paper>
  );
};

export const ActiveFormNavigationProvider = ({ children }: { children: ReactNode }) => {
  const activeFormId = FormStateMachineContext.useSelector((state) => state.context.activeForm);
  const actorRef = FormStateMachineContext.useActorRef();
  const requestAttention = useRequestFormAttention();
  const [target, setTarget] = useState<ActiveFormTarget | null>(null);
  const targetRef = useRef<ActiveFormTarget | null>(null);

  const registerActiveForm = useCallback((nextTarget: ActiveFormTarget) => {
    targetRef.current = nextTarget;
    setTarget(nextTarget);

    return () => {
      if (targetRef.current !== nextTarget) return;

      targetRef.current = null;
      setTarget(null);
    };
  }, []);

  const goToActiveForm = useCallback(
    (expectedFormId?: Id | null) => {
      const currentActiveFormId = actorRef.getSnapshot().context.activeForm;
      const currentTarget = targetRef.current;

      if (expectedFormId !== undefined && expectedFormId !== currentActiveFormId) return;

      if (!currentActiveFormId || !currentTarget || currentTarget.formId !== currentActiveFormId) {
        return;
      }

      if (!currentTarget.element.isConnected) return;

      const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

      currentTarget.element.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' });
      requestAttention();
    },
    [actorRef, requestAttention],
  );

  const value = useMemo(() => ({ goToActiveForm, registerActiveForm }), [goToActiveForm, registerActiveForm]);
  const activeLabel = target && target.formId === activeFormId ? target.label?.trim() || undefined : undefined;

  return (
    <ActiveFormNavigationContext value={value}>
      {children}
      {activeFormId && <ActiveFormIndicator label={activeLabel} onGoToEdit={goToActiveForm} />}
    </ActiveFormNavigationContext>
  );
};

export const useActiveFormNavigation = () => use(ActiveFormNavigationContext);

export const useActiveFormNavigationTarget = (formId: Id, label?: string) => {
  const { registerActiveForm } = useActiveFormNavigation();
  const unregisterRef = useRef<(() => void) | null>(null);

  return useCallback(
    (element: HTMLFormElement | null) => {
      unregisterRef.current?.();
      unregisterRef.current = element ? registerActiveForm({ formId, element, label }) : null;
    },
    [formId, label, registerActiveForm],
  );
};
