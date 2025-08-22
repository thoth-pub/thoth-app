'use client';

import { useForm } from 'react-hook-form';

import { FORM_FIELDS } from '@/constants';
import { useTransition } from 'react';
import { signInAction } from '@/app/actions/signIn';

const { EMAIL, PASSWORD } = FORM_FIELDS;

type FormData = {
  email: string;
  password: string;
};

export const AuthForm = () => {
  const [isPending, startTransition] = useTransition();
  const { register, handleSubmit } = useForm<FormData>();

  const onSubmit = handleSubmit(async (data: FormData) => {
    startTransition(() => {
      signInAction(data);
    });
  });

  return (
    <form onSubmit={onSubmit} className="m-auto flex flex-col gap-4">
      <div>
        <label>Email</label>
        <input type="email" {...register(EMAIL)} />
      </div>
      <div>
        <label>Password</label>
        <input type="password" {...register(PASSWORD)} />
      </div>
      <button type="submit" disabled={isPending}>
        {isPending ? 'Loading...' : 'Login'}
      </button>
    </form>
  );
};
