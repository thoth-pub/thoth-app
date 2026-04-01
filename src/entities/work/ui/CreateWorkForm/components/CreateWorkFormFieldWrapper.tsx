import type { ReactNode } from 'react';

import { Namespace, NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import { InputLabel, TranslatedContent } from '@/src/shared/ui';

import FormFieldWrapper from './FormFieldWrapper';

type CreateWorkFormFieldWrapperProps = {
  label?: string;
  name: string;
  namespace?: Namespace;
  children: Readonly<ReactNode>;
};

const CreateWorkFormFieldWrapper = ({
  label,
  name,
  namespace = NAMESPACES.enum.forms,
  children,
}: CreateWorkFormFieldWrapperProps) => {
  return (
    <FormFieldWrapper>
      {label && (
        <InputLabel className="min-w-[8.4rem] lg:min-w-45" htmlFor={name}>
          <TranslatedContent content={label} namespace={namespace} />
        </InputLabel>
      )}
      {children}
    </FormFieldWrapper>
  );
};

export default CreateWorkFormFieldWrapper;
