'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { useUser } from '@/src/entities/user';
import { ROUTES } from '@/src/shared/constants';
import useTypedTranslation from '@/src/shared/hooks/useTypedTranslation';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import { ContentSection, Skeleton, Typography } from '@/src/shared/ui';

type AdminAccessGateProps = {
  children: ReactNode;
};

// APP-ADM-01 (ADR-0010): the Admin namespace access gate.
//
// ADR-0010 reserves `/admin/*` for the global superuser Admin console, and
// requires a non-superuser reaching it to receive a truthful access-denied
// state rather than a silent redirect. This component is that state.
//
// Three deliberate properties:
//
//   1. It withholds `children` entirely until identity is authoritative, so no
//      Admin navigation or content flashes, and - because an unrendered React
//      subtree never runs - no staff-only data hook inside it is mounted or
//      executed for an unauthorized or not-yet-known viewer.
//   2. A pending or failed `me` query is never collapsed into an ordinary
//      `isSuperuser: false`. Pending shows a neutral placeholder; a failed
//      identity query shows a truthful unavailable state. Neither claims that
//      permission was denied, because neither established that.
//   3. The denial copy names no role, no staff concept and no SUPERUSER flag.
//      It states only what the viewer can act on.
//
// This is presentation/access UX, not an authorization policy: role truth comes
// from the backend-owned `me` query, and the Thoth API remains the actual
// authorization boundary for everything Admin reaches.
const AdminAccessGate = ({ children }: AdminAccessGateProps) => {
  const { user, isAuthoritative, error } = useUser();
  const { t } = useTypedTranslation({ namespace: NAMESPACES.enum.navigation });

  // Fail closed: identity could not be established, so nothing is asserted
  // about permission and no Admin content is rendered.
  if (error) {
    return (
      <ContentSection>
        <Typography>{t('identityUnavailable')}</Typography>
      </ContentSection>
    );
  }

  // Identity not yet authoritative: no Admin content, and no denial either.
  if (!isAuthoritative) {
    return (
      <ContentSection>
        <Skeleton variant="rounded" height={96} />
      </ContentSection>
    );
  }

  if (!user.isSuperuser) {
    return (
      <ContentSection>
        <div className="flex flex-col items-start gap-3">
          <Typography variant="h2">{t('accessDenied')}</Typography>
          <Typography>{t('accessDeniedDescription')}</Typography>
          <Link href={ROUTES.DASHBOARD}>{t('goToDashboard')}</Link>
        </div>
      </ContentSection>
    );
  }

  return <>{children}</>;
};

export default AdminAccessGate;
