import type { ReactNode } from 'react';

const FormFieldWrapper = ({ children }: { children: ReactNode }) => {
  return <div className="flex gap-2">{children}</div>;
};

export default FormFieldWrapper;
