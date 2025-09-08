import { InputLabel, TextField, type TextFieldComponentProps } from '@/src/shared/ui';

import type { CreateWorkForm } from '../../../model/work.types';
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
