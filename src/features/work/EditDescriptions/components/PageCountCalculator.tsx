'use client';

import { useEffect } from 'react';
import { type Control, type FieldValues, type UseFormSetValue, useWatch } from 'react-hook-form';

import { FORM_FIELDS } from '@/src/shared/constants';
import { isArabicNumeral } from '@/src/shared/utils';

const { WORK_FIRST_PAGE, WORK_LAST_PAGE, WORK_PAGES_COUNT } = FORM_FIELDS;

export const PageCountAutoCalculator = ({
  control,
  setValue,
}: {
  control: Control<FieldValues>;
  setValue: UseFormSetValue<FieldValues>;
}) => {
  const firstPage = useWatch({ control, name: WORK_FIRST_PAGE.name }) as string;
  const lastPage = useWatch({ control, name: WORK_LAST_PAGE.name }) as string;

  useEffect(() => {
    if (!isArabicNumeral(firstPage) && !isArabicNumeral(lastPage)) return;

    const count = Number(lastPage) - Number(firstPage) + 1;

    if (count <= 0) return;

    setValue(WORK_PAGES_COUNT.name, count);
  }, [firstPage, lastPage, setValue]);

  return null;
};
