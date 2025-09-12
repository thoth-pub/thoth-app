'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { Dayjs } from 'dayjs';
import { useMemo, useState } from 'react';
import { type FieldValues, type Path, useForm } from 'react-hook-form';
import { type ZodType } from 'zod';

import type { BaseFieldProps, FormFieldOption } from '@/src/shared/interfaces';
import { convertDateToFormattedDate, isDayJsInstance } from '@/src/shared/utils';

export type UseFormWithPreviewProps<T extends FieldValues> = {
  validationSchema: ZodType<unknown, FieldValues>;
  defaultValues?: FieldValues;
  options?: FormFieldOption[];
  onSubmit?: (data: T) => void;
} & Pick<BaseFieldProps<T>, 'name'>;

export const useFormWithPreview = <T extends FieldValues>(props: UseFormWithPreviewProps<T>) => {
  const { validationSchema, name, defaultValues, options = [], onSubmit } = props;

  const {
    control,
    formState: { isValid },
    getValues,
    handleSubmit,
  } = useForm({
    resolver: zodResolver(validationSchema),
    mode: 'onChange',
    defaultValues,
  });
  const [isInEditState, setIsInEditState] = useState(false);

  const switchEditState = () => {
    setIsInEditState(!isInEditState);
  };

  const submit = handleSubmit((data) => {
    if (!isValid || !onSubmit) return;

    onSubmit(data as T);
    switchEditState();
  });

  const formFieldValue: FormFieldOption | string | Dayjs = getValues(name as Path<T>) ?? '';
  const isValueFilledAndValid = !!formFieldValue && isValid;

  const serializedValue = useMemo(() => {
    const selectedOption = options.find((option) => option.value === formFieldValue);

    if (selectedOption) return selectedOption.label;

    if (isDayJsInstance(formFieldValue)) return convertDateToFormattedDate(formFieldValue);

    if (typeof formFieldValue === 'string') return formFieldValue;
    
    if (
      typeof formFieldValue === 'object' &&
      formFieldValue !== null &&
      'value' in formFieldValue &&
      'label' in formFieldValue
    )
      return (formFieldValue as FormFieldOption).label;

    return JSON.stringify(formFieldValue);
  }, [formFieldValue, options]);

  return {
    control,
    serializedValue,
    isValid: isValueFilledAndValid,
    isInEditState,
    fieldValue: formFieldValue,
    switchEditState,
    submit,
  };
};
