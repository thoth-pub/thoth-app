'use client';

import { useMutation } from '@apollo/client/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

import type { WorkType as GQLWorkType } from '@/gql/graphql';
import type { ImprintEntity } from '@/src/entities/imprint';
import { httpLink, setAuthorizationHeader } from '@/src/shared';
import { FORM_FIELDS, NOTIFICATIONS, ROUTES, WorkStatus, WorkType } from '@/src/shared/constants';
import { useNotifications } from '@/src/shared/hooks';
import { convertEntityToSelectFieldOptions, convertFormFieldsToSelectFieldOptions } from '@/src/shared/utils';

import { CREATE_WORK } from '../../../model/work.mutations';
import type { CreateWorkForm as CreateWorkFormType } from '../../../model/work.types';
import { createWorkValidationSchema } from '../../../model/work.validation';

type UseCreateWorkFormProps = {
  imprints: ImprintEntity[];
  queryToken: string;
};

const { TITLE, LICENSE, IMPRINT_ID, WORK_TYPE } = FORM_FIELDS;
const { WORK_CREATION_SUCCESS, WORK_CREATION_FAILED } = NOTIFICATIONS;

const useCreateWorkForm = ({ imprints, queryToken }: UseCreateWorkFormProps) => {
  const router = useRouter();
  const { sendSuccessNotification, sendErrorNotification } = useNotifications();

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

  const [mutate, { client, loading }] = useMutation(CREATE_WORK, {
    onCompleted: (data) => {
      sendSuccessNotification(WORK_CREATION_SUCCESS);
      router.push(ROUTES.WORK_PAGE(data.createWork.workId));
    },
    onError: () => {
      sendErrorNotification(WORK_CREATION_FAILED);
    },
  });

  client.setLink(setAuthorizationHeader(queryToken).concat(httpLink));

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
