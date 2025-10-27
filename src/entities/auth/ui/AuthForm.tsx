'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Image from 'next/image';
import { useTransition } from 'react';
import { useForm } from 'react-hook-form';

import { signInAction } from '@/app/actions/signIn';
import { NOTIFICATIONS } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { useNotifications } from '@/src/shared/hooks';
import { Button, FormTextField, InputLabel } from '@/src/shared/ui';

import { authValidationSchema } from '../model/auth.validation';

const { AUTH_FAILED } = NOTIFICATIONS;

const { EMAIL, PASSWORD } = FORM_FIELDS;

const itemStyle = 'flex flex-col gap-2';

type FormData = {
  email: string;
  password: string;
};

const AuthForm = () => {
  const [isPending, startTransition] = useTransition();
  const { control, handleSubmit } = useForm<FormData>({ resolver: zodResolver(authValidationSchema) });
  const { sendErrorNotification } = useNotifications();

  const onSubmit = handleSubmit(async (data: FormData) => {
    startTransition(() => {
      signInAction(data).catch((error) => {
        if (error && error?.message !== 'NEXT_REDIRECT') {
          sendErrorNotification(AUTH_FAILED);
        }
      });
    });
  });

  return (
    <div className="m-auto flex min-w-[250px] flex-col items-center justify-center gap-4 rounded-2xl p-4 lg:min-w-[320px]">
      <Image
        src="/logo.png"
        alt="Thoth Open Metadata logo"
        className="block min-h-[97px] min-w-[170px] shrink-0"
        width={170}
        height={97}
        priority
      />
      <form onSubmit={onSubmit} className="m-auto flex w-full flex-col gap-4">
        <div className={itemStyle}>
          <InputLabel id={EMAIL.name}>Email</InputLabel>
          <FormTextField
            fullWidth
            control={control}
            name={EMAIL.name}
            id={EMAIL.name}
            type={EMAIL.type}
            placeholder={EMAIL.placeholder}
          />
        </div>
        <div className={itemStyle}>
          <InputLabel id={PASSWORD.name}>Password</InputLabel>
          <FormTextField
            fullWidth
            control={control}
            name={PASSWORD.name}
            id={PASSWORD.name}
            type={PASSWORD.type}
            placeholder={PASSWORD.placeholder}
          />
        </div>
        <Button type="submit" variant="contained" disabled={isPending}>
          {isPending ? 'Loading...' : 'Login'}
        </Button>
      </form>
    </div>
  );
};

export default AuthForm;
