import { AutocompleteField, type AutocompleteFieldProps } from '@/src/shared/ui';

import type { CreateWorkForm } from '../../../model/work.types';
import CreateWorkFormFieldWrapper from './CreateWorkFormFieldWrapper';

type CreateWorkFormFieldProps = {
  label: string;
} & Omit<AutocompleteFieldProps<CreateWorkForm>, 'label'>;

const CreateWorkFormField = ({ label, name, options, ...restProps }: CreateWorkFormFieldProps) => {
  return (
    <CreateWorkFormFieldWrapper label={label} name={name}>
      <AutocompleteField name={name} options={options} id={name} {...restProps} />
    </CreateWorkFormFieldWrapper>
  );
};

export default CreateWorkFormField;
