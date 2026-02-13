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
        'grid min-h-11 w-full grid-cols-1 items-start gap-y-2 duration-300',
        className,
      )}
    >
      {children}
    </div>
  );
};

export default ContentWrapper;
