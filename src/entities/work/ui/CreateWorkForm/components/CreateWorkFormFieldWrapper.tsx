import type { ReactNode } from 'react';

import { InputLabel } from '@/src/shared/ui';

import FormFieldWrapper from './FormFieldWrapper';

type CreateWorkFormFieldWrapperProps = {
  label: string;
  name: string;
  children: Readonly<ReactNode>;
};

const CreateWorkFormFieldWrapper = ({ label, name, children }: CreateWorkFormFieldWrapperProps) => {
  return (
    <FormFieldWrapper>
      <InputLabel className="min-w-[10rem]" htmlFor={name}>
        {label}
      </InputLabel>
      {children}
    </FormFieldWrapper>
  );
};

export default CreateWorkFormFieldWrapper;
