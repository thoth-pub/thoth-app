import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { WorkStatus } from '@/src/shared/constants';
import { convertFormFieldsToSelectFieldOptions } from '@/src/shared/utils';

import type { EditWorkForm } from '../../../model/work.types';
import { editWorkValidationSchema } from '../../../model/work.validation';

export const useFormHeader = () => {
  const [isPublicationDateVisible, setIsPublicationDateVisible] = useState(false);
  const { control, handleSubmit } = useForm<EditWorkForm>({
    resolver: zodResolver(editWorkValidationSchema),
  });

  const workStatusOptions = convertFormFieldsToSelectFieldOptions(WorkStatus.options);

  const addPublicationDate = () => {
    setIsPublicationDateVisible((prev) => !prev);
  };

  const submit = handleSubmit((data) => {
    console.log(data);
  });

  return {
    isPublicationDateVisible,
    control,
    workStatusOptions,
    addPublicationDate,
    submit,
  };
};
