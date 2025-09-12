import { TextField, type TextFieldComponentProps } from '@/src/shared/ui';

import type { CreateWorkForm } from '../../../model/work.types';
import CreateWorkFormFieldWrapper from './CreateWorkFormFieldWrapper';

type CreateWorkFormFieldProps = {
  label: string;
} & Omit<TextFieldComponentProps<CreateWorkForm>, 'label'>;

const CreateWorkFormField = ({ label, name, ...restProps }: CreateWorkFormFieldProps) => {
  return (
    <CreateWorkFormFieldWrapper label={label} name={name}>
      <TextField fullWidth id={name} name={name} {...restProps} />
    </CreateWorkFormFieldWrapper>
  );
};

export default CreateWorkFormField;
