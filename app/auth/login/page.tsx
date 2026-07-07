'use client';

import { CircularProgress } from '@mui/material';
import { useSearchParams } from 'next/navigation';
import { BuiltInProviderType } from 'next-auth/providers/index';
import { ClientSafeProvider, getCsrfToken, getProviders, LiteralUnion } from 'next-auth/react';
import { Suspense, useEffect, useEffectEvent, useRef, useState } from 'react';

import { AuthWrapper } from '@/src/entities/auth';
import { useNotifications } from '@/src/shared/hooks';
import { getMessage } from '@/src/shared/lib/auth/message';

function SignInContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const callbackUrl = searchParams.get('callbackUrl');
  const { sendErrorNotification } = useNotifications();

  const [providers, setProviders] = useState<Record<LiteralUnion<BuiltInProviderType>, ClientSafeProvider> | null>(
    null,
  );
  const [csrfToken, setCsrfToken] = useState<string>('');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const provider = providers?.zitadel;

  useEffect(() => {
    const fetchProviders = async () => {
      const [providersData, tokenData] = await Promise.all([getProviders(), getCsrfToken()]);
      setProviders(providersData);
      setCsrfToken(tokenData || '');
    };

    void fetchProviders();
  }, []);

  // Notify only when the error code changes; sendErrorNotification's identity follows
  // the translation function, and re-firing on it would re-toast a stale error.
  const notifySignInError = useEffectEvent(() => {
    sendErrorNotification(getMessage(error, 'signin-error').message);
  });

  useEffect(() => {
    if (!error) return;

    notifySignInError();
  }, [error]);

  useEffect(() => {
    if (!provider || !buttonRef.current) return;

    buttonRef.current.click();
  }, [provider]);

  if (!providers) {
    return (
      <AuthWrapper>
        <CircularProgress />
      </AuthWrapper>
    );
  }

  return (
    <div className="sr-only">
      {provider && (
        <div>
          <form action={provider.signinUrl} method="POST">
            <input type="hidden" name="csrfToken" value={csrfToken} />
            <input type="hidden" name="callbackUrl" value={callbackUrl ?? undefined} />
            <button type="submit" ref={buttonRef}>
              Sign in
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default function CustomSignInPage() {
  return (
    <Suspense
      fallback={
        <AuthWrapper>
          <CircularProgress />
        </AuthWrapper>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
