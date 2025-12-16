'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';

import { appConfig, FormFieldOption, getDefaultTitle, getDefaultWork } from '@/src/shared';
import { ROUTES, WorkStatuses, WorkTypes } from '@/src/shared/constants';
import { FORM_FIELDS, languageOptionsAlt } from '@/src/shared/constants/formFields';

import useCreateWork from '../../api/hooks/useCreateWork';
import type { CreateWorkForm as CreateWorkFormType, WorkType } from '../../model/work.types';
import { createWorkValidationSchema } from '../../model/work.validation';

type UseCreateWorkFormProps = {
  imprintOptions: FormFieldOption[];
  workTypeOptions: FormFieldOption[];
  licenseOptions: FormFieldOption[];
};

const { TITLE, TITLE_LANGUAGE, LICENSE, IMPRINT, WORK_TYPE } = FORM_FIELDS;

const useCreateWorkForm = ({ imprintOptions, workTypeOptions, licenseOptions }: UseCreateWorkFormProps) => {
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
  } = useForm<CreateWorkFormType>({
    resolver: zodResolver(createWorkValidationSchema),
    mode: 'onChange',
    defaultValues: {
      [TITLE.name]: TITLE.defaultValue,
      [TITLE_LANGUAGE.name]: languageOptionsAlt.length > 0 ? languageOptionsAlt[0].value : TITLE_LANGUAGE.defaultValue,
      [WORK_TYPE.name]: workTypeOptions.length > 0 ? workTypeOptions[0].value : WORK_TYPE.defaultValue,
      [IMPRINT.name]: imprintOptions.length > 0 ? imprintOptions[0].value : IMPRINT.defaultValue,
      [LICENSE.name]: licenseOptions.length > 0 ? licenseOptions[0] : undefined,
    },
    reValidateMode: 'onSubmit',
  });

  const { createWork, loading } = useCreateWork({
    onCompleted: (data) => {
      router.push(ROUTES.WORK_PAGE(data.id));
    },
  });

  const isSubmitDisabled = loading || !isValid;
  const isImprintVisible = imprintOptions.length !== 1;

  const submit = handleSubmit((data) => {
    const { workType, imprintId, license, titleLanguage, title } = data;

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
      license: license.value,
      edition: 1,
      titles: [titleEntity],
    });

    createWork(defaultWork);
  });

  return { control, isImprintVisible, isSubmitDisabled, availableNewWorkOptions, isLoading: loading, submit };
};

export default useCreateWorkForm;
