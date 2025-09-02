'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

import { FORM_FIELDS, ROUTES, WorkType } from '@/constants';
import type { CreateWorkForm as CreateWorkFormType, ImprintEntity } from '@/interfaces';
import {
  convertEntityToSelectFieldOptions,
  convertFormFieldsToSelectFieldOptions,
  createWorkValidationSchema,
} from '@/utils';

type UseCreateWorkFormProps = {
  imprints: ImprintEntity[];
};

const { TITLE, LICENSE, IMPRINT, WORK_TYPE } = FORM_FIELDS;

const useCreateWorkForm = ({ imprints }: UseCreateWorkFormProps) => {
  const workTypesOptions = convertFormFieldsToSelectFieldOptions(WorkType.options);
  const imprintOptions = convertEntityToSelectFieldOptions(imprints, 'name');

  const isImprintVisible = imprints.length !== 1;

  const {
    control,
    handleSubmit,
    formState: { isValid },
  } = useForm<CreateWorkFormType>({
    resolver: zodResolver(createWorkValidationSchema),
    mode: 'onChange',
    defaultValues: {
      [TITLE.name]: TITLE.defaultValue,
      [WORK_TYPE.name]: workTypesOptions.length > 0 ? workTypesOptions[0].value : WORK_TYPE.defaultValue,
      [IMPRINT.name]: imprintOptions.length > 0 ? imprintOptions[0].value : IMPRINT.defaultValue,
      [LICENSE.name]: LICENSE.defaultValue,
    },
    reValidateMode: 'onSubmit',
  });
  const router = useRouter();

  const submit = handleSubmit((data) => {
    console.log(data);
    router.push(ROUTES.WORK_PAGE('1'));
  });

  return { control, workTypesOptions, imprintOptions, isImprintVisible, isValid, submit };
};

export default useCreateWorkForm;
