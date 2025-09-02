import { InputLabel } from '@mui/material';

import { TextField } from '@/components';
import type { TextFieldComponentProps } from '@/components/forms/core/TextField/TextField';
import type { CreateWorkForm } from '@/interfaces';

import FormFieldWrapper from './FormFieldWrapper';

type CreateWorkFormFieldProps = {
  label: string;
} & Omit<TextFieldComponentProps<CreateWorkForm>, 'label'>;

const CreateWorkFormField = ({ label, name, ...restProps }: CreateWorkFormFieldProps) => {
  return (
    <FormFieldWrapper>
      <InputLabel className="min-w-[10rem]" htmlFor={name}>
        {label}
      </InputLabel>
      <TextField fullWidth id={name} name={name} {...restProps} />
    </FormFieldWrapper>
  );
};

export default CreateWorkFormField;
