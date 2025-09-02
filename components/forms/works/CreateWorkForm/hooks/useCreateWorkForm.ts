'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { WorkType } from '@/constants';
import type { CreateWorkForm as CreateWorkFormType } from '@/interfaces';
import { convertFormFieldsToOptions, createWorkValidationSchema } from '@/utils';

const useCreateWorkForm = () => {
  const { control, handleSubmit } = useForm<CreateWorkFormType>({
    resolver: zodResolver(createWorkValidationSchema),
    reValidateMode: 'onSubmit',
  });

  const workTypes = convertFormFieldsToOptions(WorkType.options);

  const submit = handleSubmit((data) => {
    console.log(data);
  });

  return { control, workTypes, submit };
};

export default useCreateWorkForm;
