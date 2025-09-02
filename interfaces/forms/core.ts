import { FORM_FIELDS, InputType } from '@/constants';

export type FormFieldName = (typeof FORM_FIELDS)[keyof typeof FORM_FIELDS]['name'];

export type InputType = (typeof InputType)[keyof typeof InputType];

export type FormFieldOption = {
  value: string;
  label: string;
};
