import type { ReactNode } from 'react';

import { Typography } from '@/src/shared/ui';

import ContentSection from '../ContentSection/ContentSection';

type PageHeaderProps = {
  title: string;
  children: Readonly<ReactNode>;
};

const PageHeader = ({ title, children }: PageHeaderProps) => {
  return (
    <ContentSection>
      <div className="flex justify-between">
        <Typography variant="h1" component="h1">
          {title}
        </Typography>
        {children}
      </div>
    </ContentSection>
  );
};

export default PageHeader;
