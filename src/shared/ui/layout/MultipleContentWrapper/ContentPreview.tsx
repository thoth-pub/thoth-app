import type { ReactNode } from 'react';

import { mergeStyles } from '@/src/shared/utils';

type ContentWrapperProps = {
  children: Readonly<ReactNode>;
  className?: string;
};

const ContentWrapper = ({ children, className }: ContentWrapperProps) => {
  return (
    <div
      className={mergeStyles(
        'grid min-h-[2.75rem] w-full grid-cols-1 items-start gap-y-2 duration-300 lg:grid-cols-[11.25rem_1fr]',
        className,
      )}
    >
      {children}
    </div>
  );
};

export default ContentWrapper;
