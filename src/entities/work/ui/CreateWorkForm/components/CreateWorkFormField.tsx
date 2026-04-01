import { Namespace } from '@/src/shared/i18n/model/i18n.types';
import { FormTextField, type FormTextFieldComponentProps } from '@/src/shared/ui';

import type { CreateWorkForm } from '../../../model/work.types';
import CreateWorkFormFieldWrapper from './CreateWorkFormFieldWrapper';

type CreateWorkFormFieldProps = {
  label?: string;
  namespace?: Namespace;
} & Omit<FormTextFieldComponentProps<CreateWorkForm>, 'label'>;

const CreateWorkFormField = ({ label, name, namespace, ...restProps }: CreateWorkFormFieldProps) => {
  return (
    <CreateWorkFormFieldWrapper label={label} name={name} namespace={namespace}>
      <FormTextField fullWidth id={name} name={name} namespace={namespace} {...restProps} />
    </CreateWorkFormFieldWrapper>
  );
};

export default CreateWorkFormField;
