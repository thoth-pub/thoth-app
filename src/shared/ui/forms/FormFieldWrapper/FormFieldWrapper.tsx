import type { ReactNode } from 'react';

const FormFieldWrapper = ({ children }: { children: Readonly<ReactNode> }) => {
  return <div className="grid min-h-[2.75rem] w-full grid-cols-[11.25rem_1fr] items-start">{children}</div>;
};

export default FormFieldWrapper;
