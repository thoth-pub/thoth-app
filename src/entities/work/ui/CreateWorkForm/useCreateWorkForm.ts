'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';

import { appConfig } from '@/src/shared/config';
import { FORM_FIELDS, ROUTES, WorkStatuses, WorkTypes } from '@/src/shared/constants';
import { useDefaultLocaleOption, useDefaultPlace } from '@/src/shared/hooks';
import { FormFieldOption } from '@/src/shared/interfaces';
import { getDefaultTitle, getDefaultWork } from '@/src/shared/utils';

import useCreateWork from '../../api/hooks/useCreateWork';
import type { CreateWorkForm as CreateWorkFormType, WorkType } from '../../model/work.types';
import { createWorkValidationSchema } from '../../model/work.validation';

type UseCreateWorkFormProps = {
  imprintOptions: FormFieldOption[];
  workTypeOptions: FormFieldOption[];
  defaultImprint: string;
};

const { TITLE, TITLE_LANGUAGE, IMPRINT, WORK_TYPE } = FORM_FIELDS;

const useCreateWorkForm = ({ imprintOptions, workTypeOptions, defaultImprint }: UseCreateWorkFormProps) => {
  const router = useRouter();

  const availableNewWorkOptions = useMemo(() => {
    return workTypeOptions.filter(
      (workType) => workType.value !== WorkTypes.enum.BookChapter && workType.value !== WorkTypes.enum.BookSet,
    );
  }, [workTypeOptions]);

  const {
    control,
    handleSubmit,
    formState: { isValid },
    setValue,
    watch,
  } = useForm<CreateWorkFormType>({
    resolver: zodResolver(createWorkValidationSchema),
    mode: 'onChange',
    defaultValues: {
      [TITLE.name]: TITLE.defaultValue,
      [TITLE_LANGUAGE.name]: TITLE_LANGUAGE.defaultValue,
      [WORK_TYPE.name]: workTypeOptions.length > 0 ? workTypeOptions[0].value : WORK_TYPE.defaultValue,
      [IMPRINT.name]: defaultImprint,
    },
    reValidateMode: 'onSubmit',
  });

  const { createWork, loading } = useCreateWork({
    onCompleted: (data) => {
      router.push(ROUTES.WORK_PAGE(data.id));
    },
  });

  const selectedImprint = watch(IMPRINT.name);

  const localeOption = useDefaultLocaleOption(selectedImprint);
  const imprintPlace = useDefaultPlace(selectedImprint);

  useEffect(() => {
    setValue(IMPRINT.name, defaultImprint, { shouldDirty: true });
  }, [defaultImprint, setValue]);

  useEffect(() => {
    setValue(TITLE_LANGUAGE.name, localeOption.value, { shouldDirty: true });
  }, [localeOption.value, selectedImprint, setValue]);

  const isSubmitDisabled = loading || !isValid;
  const isImprintVisible = imprintOptions.length !== 1;

  const submit = handleSubmit((data) => {
    const { workType, imprintId, titleLanguage, title } = data;

    const titleEntity = getDefaultTitle({
      title: title,
      localeCode: titleLanguage,
      canonical: true,
      id: appConfig.defaultId,
      fullTitle: title,
      subtitle: '',
    });

    const defaultWork = getDefaultWork({
      status: WorkStatuses.enum.Forthcoming,
      type: workType as WorkType,
      imprintId,
      edition: 1,
      titles: [titleEntity],
      place: imprintPlace,
    });

    createWork(defaultWork);
  });

  return { control, isImprintVisible, isSubmitDisabled, availableNewWorkOptions, isLoading: loading, submit };
};

export default useCreateWorkForm;
