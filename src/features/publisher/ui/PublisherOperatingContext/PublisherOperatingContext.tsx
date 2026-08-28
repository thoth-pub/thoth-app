'use client';

import { useEffect, useEffectEvent, useRef } from 'react';

import useTypedTranslation from '@/src/shared/hooks/useTypedTranslation';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import { Button, Typography } from '@/src/shared/ui';

import usePublisherOperatingContext from './usePublisherOperatingContext';

// APP-ADM-01 (ADR-0010): the superuser's publisher-workspace treatment.
//
// An ordinary publisher user keeps the active-publisher selector. A superuser
// instead gets this: a persistent, visible statement of which publisher they
// deliberately entered, and one obvious way back to Admin. There is no publisher
// picker here, because a superuser never drifts into a publisher - they enter
// one explicitly from the Admin publisher directory.
//
// This is also where refresh restoration is mounted. On a reload the XState
// context is empty, so the hook re-reads the staff-specific key: either the
// stored publisher is still in authoritative `me.publisherContexts` and the
// context is restored, or it is gone and the hook clears it and returns to
// Admin. It never falls back to a different publisher.
const PublisherOperatingContext = () => {
  const { isStaffOperator, staffPublisher, restoreStaffContext, returnToAdmin } = usePublisherOperatingContext();
  const { t } = useTypedTranslation({ namespace: NAMESPACES.enum.navigation });

  const hasAttemptedRestore = useRef(false);

  const restoreOnce = useEffectEvent(() => {
    if (!isStaffOperator || hasAttemptedRestore.current) return;

    hasAttemptedRestore.current = true;
    void restoreStaffContext();
  });

  useEffect(() => {
    restoreOnce();
  }, [isStaffOperator]);

  // Ordinary publisher users are untouched by this component.
  if (!isStaffOperator) return null;

  return (
    <div className="flex flex-col gap-2 rounded-(--border-nav-radius) border border-(--color-nav-border) px-4 py-2">
      <Typography color="primary" component="span" variant="body2" className="font-semibold">
        {t('staffPublisherContext')}
      </Typography>

      {staffPublisher && (
        <Typography color="primary" component="span" className="truncate">
          {staffPublisher.name}
        </Typography>
      )}

      <Button size="small" onClick={() => void returnToAdmin()}>
        {t('returnToAdmin')}
      </Button>
    </div>
  );
};

export default PublisherOperatingContext;
