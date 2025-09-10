'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { type FieldValues, type Path, useForm } from 'react-hook-form';
import { ZodType } from 'zod';

import type { BaseFieldProps, FormFieldOption } from '@/src/shared/interfaces';
import { convertDateToFormattedDate, isDayJsInstance } from '@/src/shared/utils';

export type UseFormWithPreviewProps<T extends FieldValues> = {
  validationSchema: ZodType<unknown, FieldValues>;
  defaultValues?: FieldValues;
  options?: FormFieldOption[];
} & Pick<BaseFieldProps<T>, 'name'>;

export const useFormWithPreview = <T extends FieldValues>(props: UseFormWithPreviewProps<T>) => {
  const { validationSchema, name, defaultValues, options = [] } = props;

  const {
    control,
    getValues,
    formState: { isValid },
  } = useForm({
    resolver: zodResolver(validationSchema),
    mode: 'onChange',
    defaultValues,
  });
  const [isInEditState, setIsInEditState] = useState(false);

  const switchEditState = () => {
    setIsInEditState(!isInEditState);
  };

  const formFieldValue = getValues(name as Path<T>) ?? '';
  const isValueFilledAndValid = !!formFieldValue && isValid;

  const serializedValue = useMemo(() => {
    console.log(options);
    const selectedOption = options.find((option) => option.value === formFieldValue);

    if (selectedOption) return selectedOption.label;

    if (isDayJsInstance(formFieldValue)) return convertDateToFormattedDate(formFieldValue);

    if (typeof formFieldValue === 'string') return formFieldValue;

    return JSON.stringify(formFieldValue);
  }, [formFieldValue, options]);

  return {
    control,
    serializedValue,
    isValid: isValueFilledAndValid,
    isInEditState,
    fieldValue: formFieldValue,
    switchEditState,
  };
};
