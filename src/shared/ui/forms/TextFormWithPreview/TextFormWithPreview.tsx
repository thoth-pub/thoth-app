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
  const { validationSchema, label, name, id, options, defaultValue, ...restProps } = props;

  return (
    <FormWithPreview
      validationSchema={validationSchema}
      label={label}
      name={name}
      id={id}
      options={options}
      defaultValues={{ [name]: defaultValue }}
    >
      {({ control }) => <TextField control={control} name={name} fullWidth options={options} {...restProps} />}
    </FormWithPreview>
  );
};

export default TextFormWithPreview;
