'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { type FieldValues, type Path, useForm } from 'react-hook-form';
import { ZodType } from 'zod';

import type { BaseFieldProps } from '@/src/shared/interfaces';
import { convertDateToFormattedDate, isValidDate } from '@/src/shared/utils';

export type UseFormWithPreviewProps<T extends FieldValues> = {
  validationSchema: ZodType<unknown, FieldValues>;
  defaultValues?: FieldValues;
} & Pick<BaseFieldProps<T>, 'name'>;

export const useFormWithPreview = <T extends FieldValues>(props: UseFormWithPreviewProps<T>) => {
  const { validationSchema, name, defaultValues } = props;

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
    if (isValidDate(`${formFieldValue}`)) return convertDateToFormattedDate(formFieldValue);

    if (typeof formFieldValue === 'string') return formFieldValue;

    return JSON.stringify(formFieldValue);
  }, [formFieldValue]);

  return {
    control,
    serializedValue,
    isValid: isValueFilledAndValid,
    isInEditState,
    fieldValue: formFieldValue,
    switchEditState,
  };
};
