'use client';

import { FieldValues } from 'react-hook-form';

import FormWithPreview, { type FormWithPreviewProps } from '../FormWithPreview/FormWithPreview';
import TextField, { type TextFieldComponentProps } from '../TextField/TextField';

type TextFormWithPreviewProps = Omit<
  FormWithPreviewProps<FieldValues>,
  'preview' | 'children' | 'isDisabled' | 'defaultValues'
> &
  Omit<TextFieldComponentProps<FieldValues>, 'control'>;

const TextFormWithPreview = (props: TextFormWithPreviewProps) => {
  const { validationSchema, label, name, id, ...restProps } = props;

  return (
    <FormWithPreview validationSchema={validationSchema} label={label} name={name} id={id}>
      {({ control }) => <TextField control={control} name={name} fullWidth {...restProps} />}
    </FormWithPreview>
  );
};

export default TextFormWithPreview;
