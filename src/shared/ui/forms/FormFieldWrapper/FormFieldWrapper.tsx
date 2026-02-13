import type { ReactNode } from 'react';

import { mergeStyles } from '@/src/shared/utils';

const FormFieldWrapper = ({ children, className }: { children: Readonly<ReactNode>; className?: string }) => {
  return (
    <div className={mergeStyles('grid min-h-11 w-full grid-cols-1 items-start gap-y-2', className)}>{children}</div>
  );
};

export default FormFieldWrapper;
