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
        'grid min-h-[2.75rem] w-full grid-cols-[11.25rem_1fr] items-start duration-300',
        className,
      )}
    >
      {children}
    </div>
  );
};

export default ContentWrapper;
