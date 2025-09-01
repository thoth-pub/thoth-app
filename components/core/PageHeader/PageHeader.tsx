import Link from 'next/link';
import { ReactNode } from 'react';

import { Button, Typography } from '@/components';

type PageHeaderProps = {
  title: string;
  link: string;
  buttonText: string;
  startIcon?: ReactNode;
};

const PageHeader = ({ title, link, startIcon, buttonText }: PageHeaderProps) => {
  return (
    <div className="flex h-[2.8rem] justify-between">
      <Typography variant="h1" component="h1">
        {title}
      </Typography>
      <Button startIcon={startIcon} component={Link} href={link} variant="contained">
        {buttonText}
      </Button>
    </div>
  );
};

export default PageHeader;
