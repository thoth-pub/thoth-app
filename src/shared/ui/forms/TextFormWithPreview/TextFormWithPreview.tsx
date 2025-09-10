'use client';

import { FieldValues } from 'react-hook-form';

import FormWithPreview, { type FormWithPreviewProps } from '../FormWithPreview/FormWithPreview';
import TextField, { type TextFieldComponentProps } from '../TextField/TextField';

type TextFormWithPreviewProps<T extends FieldValues> = Omit<
  FormWithPreviewProps<T>,
  'preview' | 'children' | 'isDisabled' | 'defaultValues'
> &
  Omit<TextFieldComponentProps<T>, 'control' | 'onSubmit'>;

const TextFormWithPreview = <T extends FieldValues>(props: TextFormWithPreviewProps<T>) => {
  const { validationSchema, label, name, id, options, defaultValue, onSubmit, ...restProps } = props;

  return (
    <FormWithPreview
      validationSchema={validationSchema}
      label={label}
      name={name}
      id={id}
      options={options}
      defaultValues={{ [name]: defaultValue }}
      onSubmit={onSubmit}
    >
      {({ control }) => <TextField control={control} name={name} fullWidth options={options} {...restProps} />}
    </FormWithPreview>
  );
};

export default TextFormWithPreview;
