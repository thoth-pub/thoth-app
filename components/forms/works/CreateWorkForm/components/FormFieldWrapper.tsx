import type { ReactNode } from 'react';

const FormFieldWrapper = ({ children }: { children: ReactNode }) => {
  return <div className="flex flex-col gap-2 md:flex-row">{children}</div>;
};

export default FormFieldWrapper;
