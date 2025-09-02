'use client';

import { useTransition } from 'react';
import { useForm } from 'react-hook-form';

import { signInAction } from '@/app/actions/signIn';
import { FORM_FIELDS } from '@/constants';

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
        <input type="email" {...register(EMAIL.name)} />
      </div>
      <div>
        <label>Password</label>
        <input type="password" {...register(PASSWORD.name)} />
      </div>
      <button type="submit" disabled={isPending}>
        {isPending ? 'Loading...' : 'Login'}
      </button>
    </form>
  );
};
