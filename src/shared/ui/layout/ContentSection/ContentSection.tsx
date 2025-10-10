import { Paper } from '@mui/material';
import { ReactNode } from 'react';

import Typography from '../../core/Typography/Typography';

type ContentSectionProps = {
  title: string;
  children?: Readonly<ReactNode>;
  headerContent?: Readonly<ReactNode>;
};

const ContentSection = ({ children, title, headerContent }: ContentSectionProps) => {
  return (
    <Paper elevation={3} component="section" className="rounded-2xl bg-[var(--color-background-alt)] px-4 py-8">
      <div className="mb-9 flex items-center justify-between pl-4">
        <Typography variant="h2">{title}</Typography>
        {headerContent}
      </div>
      <div className="flex flex-col gap-5">{children}</div>
    </Paper>
  );
};

export default ContentSection;
