import type { ReactNode } from 'react';

import { mergeStyles } from '@/src/shared/utils';

const FormFieldWrapper = ({ children, className }: { children: Readonly<ReactNode>; className?: string }) => {
  return (
    <div className={mergeStyles('grid min-h-[2.75rem] w-full grid-cols-[11.25rem_1fr] items-start', className)}>
      {children}
    </div>
  );
};

export default FormFieldWrapper;
