'use client';

import type { PickerValue } from '@mui/x-date-pickers/internals';
import { FieldValues } from 'react-hook-form';

import DateField from '../DateField/DateField';
import FormWithPreview, { type FormWithPreviewProps } from '../FormWithPreview/FormWithPreview';

type DateFormWithPreviewProps = { defaultValue?: PickerValue } & Omit<
  FormWithPreviewProps<FieldValues>,
  'preview' | 'children' | 'isDisabled' | 'defaultValues'
>;

const DateFormWithPreview = (props: DateFormWithPreviewProps) => {
  const { validationSchema, label, name, id, defaultValue } = props;

  return (
    <FormWithPreview validationSchema={validationSchema} label={label} name={name} id={id}>
      {({ control }) => <DateField className="w-full" control={control} name={name} defaultValue={defaultValue} />}
    </FormWithPreview>
  );
};

export default DateFormWithPreview;
