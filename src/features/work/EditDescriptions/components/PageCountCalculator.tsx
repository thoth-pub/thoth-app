'use client';

import { useEffect } from 'react';
import { type Control, type FieldValues, type UseFormSetValue, useWatch } from 'react-hook-form';

import { FORM_FIELDS } from '@/src/shared/constants';
import { interpretPageRange } from '@/src/shared/utils';

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
    // The same interpretation the form validates the two fields with, so the count offered here is
    // only ever the count of a range the form would accept. Anything else — a half-entered range, a
    // pair of endpoints in different numbering schemes, a descending one — yields no count at all
    // rather than a number derived from part of the input.
    const { pageCount } = interpretPageRange(firstPage, lastPage);

    if (pageCount === null) return;

    setValue(WORK_PAGES_COUNT.name, pageCount);
  }, [firstPage, lastPage, setValue]);

  return null;
};
