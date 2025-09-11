'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

import type { CreateWorkMutation } from '@/gql/graphql';
import { FormFieldOption } from '@/src/shared';
import { NOTIFICATIONS, ROUTES, WorkStatuses } from '@/src/shared/constants';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';
import { isBookChapter } from '@/src/shared/utils';

import { CREATE_WORK } from '../../model/work.mutations';
import type { CreateWorkForm as CreateWorkFormType, WorkType } from '../../model/work.types';
import { createWorkValidationSchema } from '../../model/work.validation';

type UseCreateWorkFormProps = {
  imprintOptions: FormFieldOption[];
  workTypeOptions: FormFieldOption[];
  queryToken: string;
};

const { TITLE, LICENSE, IMPRINT, WORK_TYPE } = FORM_FIELDS;
const { WORK_CREATION_SUCCESS, WORK_CREATION_FAILED } = NOTIFICATIONS;

const useCreateWorkForm = ({ queryToken, imprintOptions, workTypeOptions }: UseCreateWorkFormProps) => {
  const router = useRouter();
  const { sendSuccessNotification, sendErrorNotification } = useNotifications();

  const {
    control,
    handleSubmit,
    formState: { isValid },
  } = useForm<CreateWorkFormType>({
    resolver: zodResolver(createWorkValidationSchema),
    mode: 'onChange',
    defaultValues: {
      [TITLE.name]: TITLE.defaultValue,
      [WORK_TYPE.name]: workTypeOptions.length > 0 ? workTypeOptions[0].value : WORK_TYPE.defaultValue,
      [IMPRINT.name]: imprintOptions.length > 0 ? imprintOptions[0].value : IMPRINT.defaultValue,
      [LICENSE.name]: LICENSE.defaultValue,
    },
    reValidateMode: 'onSubmit',
  });

  const [mutate, { loading }] = useMutationWithAuth<CreateWorkMutation>({
    queryToken,
    mutation: CREATE_WORK,
    options: {
      onCompleted: (data) => {
        sendSuccessNotification(WORK_CREATION_SUCCESS);
        router.push(ROUTES.WORK_PAGE(data.createWork.workId));
      },
      onError: () => {
        sendErrorNotification(WORK_CREATION_FAILED);
      },
    },
  });

  const isSubmitDisabled = loading || !isValid;
  const isImprintVisible = imprintOptions.length !== 1;

  const submit = handleSubmit((data) => {
    const { title, workType, imprintId, license } = data;

    mutate({
      variables: {
        data: {
          title,
          fullTitle: title,
          workStatus: WorkStatuses.enum.Forthcoming,
          workType: workType as WorkType,
          imprintId,
          license,
          edition: isBookChapter(workType as WorkType) ? null : 1,
        },
      },
    });
  });

  return { control, isImprintVisible, isSubmitDisabled, isLoading: loading, submit };
};

export default useCreateWorkForm;
