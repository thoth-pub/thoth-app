'use client';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

import { ROUTES } from '@/src/shared/constants';
import { Typography } from '@/src/shared/ui';

/**
 * Displays a user-friendly error page for failed logout attempts.
 *
 * This page is typically shown when a security check fails during the logout
 * process. The most common cause is a Cross-Site Request Forgery (CSRF)
 * protection failure, where a 'state' parameter from the identity provider
 * does not match the one stored securely in the user's session.
 */

function LogoutErrorContent() {
  const params = useSearchParams();
  const reason = params.get('reason') || 'An unknown error occurred.';

  return (
    <div className="m-auto flex w-full max-w-md flex-col items-center gap-6 text-center">
      <Typography variant="h2" className="text-center">
        Logout unsuccessful
      </Typography>
      <ErrorOutlineIcon color="error" />
      <Typography>{reason}</Typography>
      <div className="mt-4">
        <Link href={ROUTES.LOGIN}>
          <Typography>Go back</Typography>
        </Link>
      </div>
    </div>
  );
}

export default function LogoutErrorPage() {
  return (
    <Suspense>
      <LogoutErrorContent />
    </Suspense>
  );
}
