import type { Control, FieldValues, Path, PathValue } from 'react-hook-form';

import { FORM_FIELDS, InputType } from '@/constants';

export type FormFieldName = (typeof FORM_FIELDS)[keyof typeof FORM_FIELDS]['name'];

export type InputType = (typeof InputType)[keyof typeof InputType];

export type FormFieldOption = {
  value: string;
  label: string;
};

export type BaseFieldProps<T extends FieldValues> = {
  name: FormFieldName;
  control: Control<T>;
  defaultValue?: PathValue<T, Path<T>>;
};
