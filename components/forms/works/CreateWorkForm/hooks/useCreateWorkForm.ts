'use client';

import { useMutation } from '@apollo/client/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

import { CREATE_WORK } from '@/app/queries';
import { FORM_FIELDS, ROUTES, WorkStatus, WorkType } from '@/constants';
import type { WorkType as GQLWorkType } from '@/gql/graphql';
import type { CreateWorkForm as CreateWorkFormType, ImprintEntity } from '@/interfaces';
import {
  convertEntityToSelectFieldOptions,
  convertFormFieldsToSelectFieldOptions,
  createWorkValidationSchema,
} from '@/utils';

type UseCreateWorkFormProps = {
  imprints: ImprintEntity[];
};

const { TITLE, LICENSE, IMPRINT_ID, WORK_TYPE } = FORM_FIELDS;

const useCreateWorkForm = ({ imprints }: UseCreateWorkFormProps) => {
  const router = useRouter();

  const workTypesOptions = convertFormFieldsToSelectFieldOptions(WorkType.options);
  const imprintOptions = convertEntityToSelectFieldOptions(imprints, 'name');
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
      [IMPRINT_ID.name]: imprintOptions.length > 0 ? imprintOptions[0].value : IMPRINT_ID.defaultValue,
      [LICENSE.name]: LICENSE.defaultValue,
    },
    reValidateMode: 'onSubmit',
  });

  const [mutate, { loading }] = useMutation(CREATE_WORK, {
    onCompleted: (data) => {
      console.log('123 success', data);
      router.push(ROUTES.WORK_PAGE(data.createWork.workId));
    },
    onError: (error) => {
      console.log('123 error', error);
      console.error(error);
    },
  });

  const isSubmitDisabled = loading || !isValid;
  const isImprintVisible = imprints.length !== 1;

  const submit = handleSubmit((data) => {
    const { title, workType, imprintId, license } = data;

    mutate({
      variables: {
        data: {
          title,
          fullTitle: title,
          workStatus: WorkStatus.enum.Forthcoming,
          workType: workType as GQLWorkType,
          imprintId,
          license,
        },
      },
    });
  });

  return { control, workTypesOptions, imprintOptions, isImprintVisible, isSubmitDisabled, isLoading: loading, submit };
};

export default useCreateWorkForm;
