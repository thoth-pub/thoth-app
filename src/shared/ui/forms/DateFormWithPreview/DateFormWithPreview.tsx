'use client';

import type { PickerValue } from '@mui/x-date-pickers/internals';
import { FieldValues } from 'react-hook-form';

import DateField from '../DateField/DateField';
import FormWithPreview, { type FormWithPreviewProps } from '../FormWithPreview/FormWithPreview';

type DateFormWithPreviewProps<T extends FieldValues> = { defaultValue?: PickerValue } & Omit<
  FormWithPreviewProps<T>,
  'preview' | 'children' | 'isDisabled' | 'defaultValues'
>;

const DateFormWithPreview = <T extends FieldValues>(props: DateFormWithPreviewProps<T>) => {
  const { validationSchema, label, name, id, defaultValue, onSubmit } = props;

  return (
    <FormWithPreview validationSchema={validationSchema} label={label} name={name} id={id} onSubmit={onSubmit}>
      {({ control }) => <DateField className="w-full" control={control} name={name} defaultValue={defaultValue} />}
    </FormWithPreview>
  );
};

export default DateFormWithPreview;
