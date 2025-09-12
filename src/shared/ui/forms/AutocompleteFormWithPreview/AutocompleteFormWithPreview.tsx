'use client';

import { FieldValues } from 'react-hook-form';

import type { FormFieldOption } from '@/src/shared/interfaces';

import AutocompleteField, { type AutocompleteFieldProps } from '../AutocompleteField/AutocompleteField';
import FormWithPreview, { type FormWithPreviewProps } from '../FormWithPreview/FormWithPreview';

type AutocompleteFormWithPreviewProps<T extends FieldValues> = { defaultValue?: FormFieldOption } & Omit<
  FormWithPreviewProps<T>,
  'preview' | 'children' | 'isDisabled' | 'defaultValues'
> &
  Omit<AutocompleteFieldProps<T>, 'control' | 'onSubmit' | 'defaultValue'>;

const AutocompleteFormWithPreview = <T extends FieldValues>(props: AutocompleteFormWithPreviewProps<T>) => {
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
      {({ control }) => <AutocompleteField control={control} name={name} options={options} {...restProps} />}
    </FormWithPreview>
  );
};

export default AutocompleteFormWithPreview;
