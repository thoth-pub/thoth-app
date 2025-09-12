import type { Control, FieldValues, Path, PathValue } from 'react-hook-form';

import { FORM_FIELDS, InputTypes } from '@/src/shared/constants/formFields';

export type FormFieldName = (typeof FORM_FIELDS)[keyof typeof FORM_FIELDS]['name'];

export type InputType = (typeof InputTypes)[keyof typeof InputTypes];

export type FormFieldLabel = (typeof FORM_FIELDS)[keyof typeof FORM_FIELDS]['label'];

export type FormFieldOption = {
  value: string;
  label: string;
};

export type BaseFieldProps<T extends FieldValues> = {
  name: FormFieldName | string;
  control: Control<T>;
  defaultValue?: PathValue<T, Path<T>>;
};
