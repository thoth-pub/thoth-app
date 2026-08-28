'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useEffectEvent, useRef } from 'react';

import { useUser } from '@/src/entities/user';
import usePublisherOperatingContext from '@/src/features/publisher/ui/PublisherOperatingContext/usePublisherOperatingContext';
import { ROUTES } from '@/src/shared/constants';
import useTypedTranslation from '@/src/shared/hooks/useTypedTranslation';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import { ContentSection, Skeleton, Typography } from '@/src/shared/ui';

// APP-ADM-01 (ADR-0010): the authenticated role-resolution landing.
//
// Successful authentication returns through `/` so that exactly one boundary
// decides where an authenticated user belongs, using the authoritative
// backend-owned `me` identity rather than any identity-provider claim parsed
// here. There is no second role policy in this repository.
//
// Superusers enter Admin with no publisher operating context: the staff context
// is cleared first, so a context left over from an earlier session can never be
// carried into a new one. Ordinary publisher users go to their workspace, where
// their existing active-publisher persistence and fallback semantics apply
// unchanged.
//
// Until identity is authoritative nothing is routed and nothing role-specific
// is rendered - a pending or failed `me` query is a distinct state, never the
// default `isSuperuser: false`.
const AuthenticatedLanding = () => {
  const { user, isAuthoritative, error } = useUser();
  const router = useRouter();
  const { clearStaffContext } = usePublisherOperatingContext();
  const { t } = useTypedTranslation({ namespace: NAMESPACES.enum.navigation });

  // The landing is a one-shot lifecycle boundary, not a continuous redirect.
  const hasResolvedLanding = useRef(false);

  const resolveLanding = useEffectEvent(() => {
    if (hasResolvedLanding.current) return;
    if (error || !isAuthoritative) return;

    hasResolvedLanding.current = true;

    void (async () => {
      // Every new authenticated root landing starts without staff context.
      await clearStaffContext();

      router.replace(user.isSuperuser ? ROUTES.ADMIN : ROUTES.DASHBOARD);
    })();
  });

  useEffect(() => {
    resolveLanding();
  }, [isAuthoritative, error, user.isSuperuser]);

  if (error) {
    return (
      <ContentSection>
        <Typography>{t('identityUnavailable')}</Typography>
      </ContentSection>
    );
  }

  // Neither Admin nor publisher-workspace content is rendered here: this route
  // only resolves where the user belongs.
  return (
    <ContentSection>
      <Skeleton variant="rounded" height={96} />
    </ContentSection>
  );
};

export default AuthenticatedLanding;
