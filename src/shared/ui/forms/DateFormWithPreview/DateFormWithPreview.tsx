'use client';

import type { PickerValue } from '@mui/x-date-pickers/internals';
import dayjs from 'dayjs';
import { FieldValues } from 'react-hook-form';

import DateField, { type DateFieldProps } from '../DateField/DateField';
import FormWithPreview, { type FormWithPreviewProps } from '../FormWithPreview/FormWithPreview';

export type DateFormWithPreviewProps<T extends FieldValues> = { defaultValue?: PickerValue; minDate?: string } & Omit<
  FormWithPreviewProps<T>,
  'preview' | 'children' | 'isDisabled' | 'defaultValues'
> &
  Omit<DateFieldProps<T>, 'control' | 'minDate'>;

const DateFormWithPreview = <T extends FieldValues>(props: DateFormWithPreviewProps<T>) => {
  const { validationSchema, label, name, id, defaultValue, onSubmit, minDate, ...rest } = props;

  const minDateValue = minDate ? dayjs(minDate) : undefined;

  return (
    <FormWithPreview validationSchema={validationSchema} label={label} name={name} id={id} onSubmit={onSubmit}>
      {({ control }) => (
        <DateField
          className="w-full"
          control={control}
          name={name}
          defaultValue={defaultValue}
          minDate={minDateValue}
          {...rest}
        />
      )}
    </FormWithPreview>
  );
};

export default DateFormWithPreview;
