import type { ReactNode } from 'react';

import { Typography } from '@/src/shared/ui';

type PageHeaderProps = {
  title: string;
  children: Readonly<ReactNode>;
};

const PageHeader = ({ title, children }: PageHeaderProps) => {
  return (
    <div className="flex h-[2.8rem] justify-between">
      <Typography variant="h1" component="h1">
        {title}
      </Typography>
      {children}
    </div>
  );
};

export default PageHeader;
