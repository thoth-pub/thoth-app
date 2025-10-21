import { Paper } from '@mui/material';
import { ReactNode } from 'react';

import { mergeStyles } from '@/src/shared';

import Typography from '../../core/Typography/Typography';

type ContentSectionProps = Partial<{
  title: string;
  children: Readonly<ReactNode>;
  className: string;
  headerContent: Readonly<ReactNode>;
}>;

const ContentSection = ({ children, title, headerContent, className }: ContentSectionProps) => {
  return (
    <Paper
      elevation={3}
      component="section"
      className={mergeStyles('rounded-2xl bg-[var(--color-background-alt)] p-4 lg:p-7', className)}
    >
      {title && (
        <div className="mb-9 flex items-center justify-between pl-2 lg:pl-4">
          <Typography variant="h2">{title}</Typography>
          {headerContent}
        </div>
      )}
      <div className="flex flex-col gap-5">{children}</div>
    </Paper>
  );
};

export default ContentSection;
