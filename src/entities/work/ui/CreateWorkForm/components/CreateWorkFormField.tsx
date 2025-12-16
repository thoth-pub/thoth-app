import { FormTextField, type FormTextFieldComponentProps } from '@/src/shared/ui';

import type { CreateWorkForm } from '../../../model/work.types';
import CreateWorkFormFieldWrapper from './CreateWorkFormFieldWrapper';

type CreateWorkFormFieldProps = {
  label?: string;
} & Omit<FormTextFieldComponentProps<CreateWorkForm>, 'label'>;

const CreateWorkFormField = ({ label, name, ...restProps }: CreateWorkFormFieldProps) => {
  return (
    <CreateWorkFormFieldWrapper label={label} name={name}>
      <FormTextField fullWidth id={name} name={name} {...restProps} />
    </CreateWorkFormFieldWrapper>
  );
};

export default CreateWorkFormField;
