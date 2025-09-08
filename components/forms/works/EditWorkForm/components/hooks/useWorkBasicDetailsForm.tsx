'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { FORM_FIELDS } from '@/constants';
import type { BasicWorkDetailsForm } from '@/interfaces';
import { basicWorkDetailsValidationSchema } from '@/utils';

const { WORK_TITLE } = FORM_FIELDS;

export const useWorkBasicDetailsForm = () => {
  const formStateRef = useRef<BasicWorkDetailsForm>({ workTitle: '' });

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<BasicWorkDetailsForm>({
    resolver: zodResolver(basicWorkDetailsValidationSchema),
  });

  const title = useWatch({ control, name: WORK_TITLE.name });

  const updateFormState = (newData: BasicWorkDetailsForm) => {
    formStateRef.current = { ...formStateRef.current, ...newData };
  };

  useEffect(() => {
    if (title && !errors[WORK_TITLE.name]) {
      updateFormState({ workTitle: title });
    }
  }, [title, errors]);

  const onSubmit = handleSubmit((data: BasicWorkDetailsForm) => {
    console.log(data);
  });

  return { control, formState: formStateRef.current, submit: onSubmit };
};
